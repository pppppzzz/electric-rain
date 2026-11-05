/* Direct-file entry: classic scripts deliberately avoid file:// module CORS and fetch. */
(() => {
  'use strict';
  const E = window.ElectricRain;
  const I = E.i18n, t = key => I.t(key);
  const $ = id => document.getElementById(id);
  const piano = new E.Piano();
  const visitRecords = new E.VisitRecords();
  let status = 'Disconnected', busy = false, visual = [], reset = 0, eventId = 0;
  let generation = 0, demoTimers = [], selectionTimer = null, scanTimer = null, resultTimer = null;
  let panelOpen = new URLSearchParams(location.search).get('dev') === '1';
  let developerEnabled = panelOpen, logs = [], errorMessage = '';
  const format = (value, length = 4) => value == null ? '— — —' : (value < 0 ? '-' : '') + String(Math.abs(value)).padStart(length, '0');
  const trackName = state => I.song(state.song);
  const controller = new E.Controller({
    trigger(actual) { if (!piano.play(actual)) renderAudio(); },
    visual(event) { visual.push({id: ++eventId, ...event}); visual = visual.slice(-256); },
    change(state, previous, event) {
      if (state.phase === 'RESULT' && !previous.ended) visitRecords.record(controller.mode, state);
      const newRun = state.run !== previous.run;
      if (newRun) { piano.clear(); visual = []; reset++; }
      if (newRun || state.phase !== previous.phase) transition(state, previous);
      render();
      if (!['sound','status','reset'].includes(event.type)) log(`${controller.mode} · ${event.type}${event.actual ? ' · ' + E.pitches[event.actual - 1] : ''}`);
    }
  });
  const serial = new E.SerialTransport(event => controller.receive(event, 'HARDWARE'), message => {
    status = message;
    if (message === 'Disconnected') busy = false;
    render();
  }, log);
  const rain = new E.Rain($('rain'), () => ({...controller.state, combo: controller.state.combo ?? 0, events: visual, reset}));

  function log(message) {
    logs.unshift(new Date().toLocaleTimeString() + ' ' + message);
    logs = logs.slice(0, 30);
    $('logs').textContent = logs.join('\n');
  }
  function error(message) {
    errorMessage = message;
    $('error-message').textContent = I.error(message);
    $('error').hidden = !message;
    if (message) log(message);
  }
  function clearDemo() { generation++; demoTimers.forEach(clearTimeout); demoTimers = []; }
  function clearPhaseTimers() {
    clearTimeout(selectionTimer); clearInterval(scanTimer); clearTimeout(resultTimer);
    selectionTimer = scanTimer = resultTimer = null;
  }
  function home() { clearDemo(); controller.home(); }
  function transition(state, previous) {
    clearPhaseTimers();
    if (state.phase === 'SONG_SELECT') {
      // Recreate only the disc to restart its acceleration, leaving the canvas untouched.
      const disc = document.querySelector('.disc');
      disc.replaceWith(disc.cloneNode(true));
      $('selection').classList.remove('settled');
      const started = performance.now(), run = state.run;
      const scan = () => {
        const elapsed = performance.now() - started;
        const chosen = elapsed > 2350 ? controller.state.song : Math.floor(elapsed / 120) % 3 + 1;
        document.querySelectorAll('[data-track]').forEach(row => {
          const selected = Number(row.dataset.track) === chosen;
          row.classList.toggle('selected', selected);
          row.querySelector('.track-box').textContent = selected ? '▪' : '';
        });
        const found = elapsed > 2350 && controller.state.song != null;
        $('disc-caption').textContent = found ? t('found') : t('reading');
        $('cd-readout').textContent = found ? `${t('ready')} · 0${controller.state.song}` : t('seeking');
        // Hardware may still be awaiting a real PLAYING acknowledgment after 3.6 s.
        $('selection').classList.toggle('settled', elapsed > 3350 && controller.mode === 'SIMULATION');
      };
      scan(); scanTimer = setInterval(scan, 90);
      selectionTimer = setTimeout(() => {
        if (controller.state.run !== run || controller.state.phase !== 'SONG_SELECT') return;
        if (controller.mode === 'SIMULATION') controller.receive({type:'state', phase:'PLAYING'}, 'SIMULATION');
        else serial.requestStart().catch(reason => error(String(reason)));
      }, 3600);
    }
    if (state.phase === 'RESULT') {
      resultTimer = setTimeout(home, 10000);
      // Focus after render so the hidden dialog never steals focus.
      queueMicrotask(() => { if (controller.state.phase === 'RESULT') $('return').focus(); });
    }
    if (previous.phase === 'RESULT' && state.phase === 'WAITING') $('connect').focus();
  }
  function renderAudio() {
    $('enable-audio').hidden = piano.ready || !(serial.connected || controller.mode === 'SIMULATION');
    $('developer-status').textContent = `${t(controller.mode === 'SIMULATION' ? 'simulation' : 'hardware')} · ${t(status)} · ${t('audio')} ${t(piano.ready ? 'audioReady' : 'audioLocked')}`;
  }
  function render() {
    I.apply();
    const s = controller.state, sim = controller.mode === 'SIMULATION';
    const visitBest = visitRecords.best(controller.mode);
    for (const id of ['cover-visit-best','playing-visit-best','result-visit-best']) $(id).textContent = format(visitBest.score);
    $('visit-best-track').textContent = visitBest.song ? I.song(visitBest.song) : '—';
    $('stage').className = 'stage window phase-' + s.phase.toLowerCase();
    $('stage').dataset.phase = s.phase;
    $('window-title').textContent = s.phase === 'PLAYING' ? trackName(s) : t('appTitle');
    $('cover').hidden = !['WAITING', 'SONG_SELECT'].includes(s.phase);
    $('playing').hidden = s.phase !== 'PLAYING';
    $('selection').hidden = s.phase !== 'SONG_SELECT';
    $('result').hidden = s.phase !== 'RESULT';
    $('cursor').classList.toggle('frozen', s.phase !== 'WAITING');
    $('waiting-caption').textContent = t(sim ? 'demoWaiting' : 'waiting');
    $('mode-label').textContent = t(sim ? 'simulation' : serial.connected ? 'connected' : 'offline');
    $('connect').disabled = busy;
    $('connect').textContent = t(busy ? 'connecting' : serial.connected ? 'disconnect' : 'connect');
    $('playing-number').textContent = t('nowPlaying') + ' / ' + (s.song ? '0' + s.song : '—');
    $('playing-track').textContent = $('result-track').textContent = trackName(s);
    $('score').textContent = $('final-score').textContent = format(s.score);
    const progress = E.scoreProgress(s.song, s.score);
    $('maximum-score').textContent = progress ? String(progress.maximum) : '—';
    $('result-progress').hidden = !progress;
    if (progress) {
      $('progress-values').textContent = `${s.score} / ${progress.maximum} · ${progress.percent.toFixed(1)}%`;
      $('progress-remaining').textContent = String(progress.remaining);
      $('score-progress').max = progress.maximum;
      $('score-progress').value = Math.min(progress.maximum, Math.max(0, s.score));
      $('score-progress').setAttribute('aria-valuetext', `${s.score} / ${progress.maximum} (${progress.percent.toFixed(1)}%)`);
    }
    $('combo').textContent = s.combo == null ? '— —' : 'x' + format(s.combo, 2);
    $('best-combo').textContent = s.bestCombo == null ? '— —' : 'x' + format(s.bestCombo, 2);
    $('phase-label').textContent = t(s.phase);
    $('connection-label').textContent = sim ? t('demoData') : t(status);
    $('simulation-mode').disabled = serial.connected || busy;
    $('hardware-mode').disabled = busy;
    document.querySelectorAll('[data-sim]').forEach(control => { control.disabled = !sim; });
    $('sound-input').value = String(Math.max(0, Math.min(100, s.sound)));
    $('developer-toggle').hidden = !developerEnabled;
    $('developer-panel').hidden = !panelOpen;
    $('start-command-status').textContent = t('startCommand') + ': ' + (E.serialConfig.startCommand ?? t('startDisabled'));
    $('error-message').textContent = I.error(errorMessage);
    renderAudio();
  }
  async function unlock() {
    try { await piano.unlock(); renderAudio(); return true; }
    catch (reason) { error(String(reason)); return false; }
  }
  async function connect() {
    if (busy) return;
    busy = true; error('');
    try {
      if (serial.connected) { await serial.disconnect(); home(); }
      else {
        clearDemo(); controller.setMode('HARDWARE');
        // Request the device directly in the click activation, alongside audio resume.
        const audio = unlock();
        await serial.connect(); await audio;
      }
    } catch (reason) { error(reason instanceof Error ? reason.message : String(reason)); }
    finally { busy = false; render(); }
  }
  async function simulation() {
    if (busy || serial.connected) return;
    if (!await unlock()) return;
    clearDemo(); controller.setMode('SIMULATION'); error('');
  }
  function previewSelection() {
    if (controller.mode !== 'SIMULATION') return;
    home(); controller.receive({type:'song', song:Number($('demo-song').value)}, 'SIMULATION');
  }
  function demo() {
    if (controller.mode !== 'SIMULATION') return;
    home(); const gen = generation, song = Number($('demo-song').value);
    const at = (delay, action) => demoTimers.push(setTimeout(() => { if (gen === generation) action(); }, delay));
    const send = event => controller.receive(event, 'SIMULATION');
    for (let i = 0; i < 12; i++) at(i * 75, () => send({type:'sound', sound:i * 8}));
    at(1000, () => send({type:'song', song}));
    const notes = [3,3,5,1,8,4,2,6,7,5,3,1];
    // Simulate verdicts; the same +3/-1/-1 rule applies, independent of note pitch.
    notes.forEach((actual, i) => at(5000 + i * 750, () => {
      if (i === 5) return send({type:'miss'});
      send({type:'trigger', actual});
      at(25, () => send({type:i === 3 ? 'early' : 'hit'}));
    }));
    at(15000, () => send({type:'end'}));
  }
  $('connect').addEventListener('click', connect);
  $('language-toggle').addEventListener('click', () => { I.set(I.language === 'zh' ? 'en' : 'zh'); render(); });
  $('enable-audio').addEventListener('click', unlock);
  $('dismiss-error').addEventListener('click', () => error(''));
  $('return').addEventListener('click', home);
  $('reset').addEventListener('click', home);
  $('simulation-mode').addEventListener('click', simulation);
  $('hardware-mode').addEventListener('click', () => { if (!busy) { clearDemo(); controller.setMode('HARDWARE'); error(''); } });
  $('demo').addEventListener('click', demo);
  $('select-track').addEventListener('click', previewSelection);
  document.querySelectorAll('[data-note]').forEach(button => button.addEventListener('click', () => controller.receive({type:'trigger', actual:Number(button.dataset.note)}, 'SIMULATION')));
  document.querySelectorAll('[data-event]').forEach(button => button.addEventListener('click', () => controller.receive({type:button.dataset.event}, 'SIMULATION')));
  $('sound-input').addEventListener('input', event => controller.receive({type:'sound', sound:Number(event.target.value)}, 'SIMULATION'));
  $('developer-toggle').addEventListener('click', () => { panelOpen = !panelOpen; render(); });
  $('close-developer').addEventListener('click', () => { panelOpen = false; render(); });
  document.addEventListener('keydown', event => {
    if (event.ctrlKey && event.shiftKey && event.code === 'KeyD') {
      event.preventDefault(); developerEnabled = true; panelOpen = !panelOpen; render();
    }
    if (event.key === 'Escape' && panelOpen) { panelOpen = false; render(); }
  });
  piano.onStateChange = renderAudio;
  window.addEventListener('pagehide', () => { clearDemo(); clearPhaseTimers(); piano.clear(); rain.stop(); void serial.disconnect(); });
  render();
})();
