/* Offline English/Chinese strings. Changing language never resets an active session. */
(() => {
  'use strict';
  const E = window.ElectricRain;
  const messages = {
    en: {
      appTitle:'Electric Rain — Notepad', resultWindow:'Electric Rain — Result', cdWindow:'CD Player — finding your rain',
      meta:'ER / A SOUND AND WATER STUDY', established:'EST. 2026', file:'File', edit:'Edit', view:'View', help:'Help',
      folio:'FIELD NOTES / No. 001', subtitle:'a little sound, a passing rain.', invitation:'Blow or Speak',
      waiting:'WAITING FOR A SOUND TO BECOME A SONG', demoWaiting:'A SIMULATED RAIN SESSION',
      simulation:'SIMULATION', hardware:'HARDWARE', offline:'HARDWARE · OFFLINE', connected:'ARDUINO CONNECTED',
      connect:'Connect', disconnect:'Disconnect', connecting:'Connecting…', Disconnected:'Disconnected', Connected:'Connected',
      nowPlaying:'NOW PLAYING', awaiting:'Awaiting track', score:'SCORE', combo:'COMBO', finalScore:'FINAL SCORE', bestCombo:'BEST COMBO', track:'TRACK',
      maxScore:'MAX SCORE', scoreProgress:'PROGRESS TO FULL SCORE', pointsRemaining:'POINTS TO GO',
      visitBest:'VISIT BEST',
      ended:'YOUR RAIN HAS ENDED.', return:'Return', returnHint:'RETURNING TO THE RAIN IN A MOMENT', enableAudio:'Enable sound',
      reading:'READING DISC . . .', found:'TRACK FOUND', seeking:'SEEKING . . .', ready:'READY', captured:'CAPTURED SOUND / SELECT TRACK',
      discLabel:'ELECTRIC RAIN', recording:'PERSONAL RECORDING · 01', eightNotes:'8 NOTES · ONE PASSING MOMENT',
      listen:'LISTEN. REACH. LET IT RAIN.', installation:'AN INTERACTIVE PIANO INSTALLATION', demoData:'DEMO DATA',
      WAITING:'WAITING', SONG_SELECT:'SONG SELECT', PLAYING:'PLAYING', RESULT:'RESULT',
      developer:'Developer', console:'Test console', useSimulation:'Use simulation', useHardware:'Use hardware',
      demo:'Run full demo', preview:'Preview selection', hit:'Hit', early:'Early', miss:'Miss', end:'End', reset:'Reset', sound:'Sound',
      audio:'Audio', audioReady:'ready', audioLocked:'locked', startCommand:'Start command', startDisabled:'disabled · firmware controls start',
      shortcut:'Ctrl + Shift + D · toggle test console', closeConsole:'Close developer console', demoTrack:'Demo track',
      dismissError:'Dismiss error', rain:'Animated pixel rain and water ripples', language:'Switch to Chinese',
      errorSerial:'Web Serial is unavailable here. Use Chrome/Edge, or double-click Start Hardware.cmd and open its local address.',
      errorSecurity:'Serial access was blocked. Open in Chrome/Edge; if needed, double-click Start Hardware.cmd.',
      errorCancelled:'No serial device selected. Click Connect and choose your Arduino port.',
    },
    zh: {
      appTitle:'Electric Rain — 雨夜记事本', resultWindow:'Electric Rain — 演奏结算', cdWindow:'CD 播放器 — 寻找你的雨声',
      meta:'ER / 声音与雨水的记录', established:'创作于 2026', file:'文件', edit:'编辑', view:'查看', help:'帮助',
      folio:'雨夜手记 / 第 001 页', subtitle:'一点声音，一场经过的雨。', invitation:'吹气或说话',
      waiting:'等待声音，成为一首歌', demoWaiting:'这是一场模拟的雨',
      simulation:'模拟模式', hardware:'硬件模式', offline:'硬件模式 · 未连接', connected:'ARDUINO 已连接',
      connect:'连接设备', disconnect:'断开连接', connecting:'连接中…', Disconnected:'未连接', Connected:'已连接',
      nowPlaying:'正在演奏', awaiting:'等待曲目', score:'分数', combo:'连击', finalScore:'最终分数', bestCombo:'最高连击', track:'演奏曲目',
      maxScore:'满分', scoreProgress:'距离满分', pointsRemaining:'还差分数',
      visitBest:'本次访问最高分',
      ended:'你的这场雨，已经结束。', return:'返回', returnHint:'稍后自动回到等待页面', enableAudio:'启用声音',
      reading:'正在读取唱片…', found:'已找到曲目', seeking:'正在寻找…', ready:'准备就绪', captured:'声音已捕捉 / 正在定位曲目',
      discLabel:'电子雨季', recording:'私人录音 · 01', eightNotes:'八个音符 · 一瞬雨声',
      listen:'倾听。伸手。让雨落下。', installation:'声音与雨水的交互钢琴装置', demoData:'模拟数据',
      WAITING:'等待声音', SONG_SELECT:'唱片选歌', PLAYING:'演奏中', RESULT:'演奏结算',
      developer:'开发测试', console:'测试控制台', useSimulation:'使用模拟模式', useHardware:'使用硬件模式',
      demo:'运行完整模拟', preview:'预览唱片选歌', hit:'命中', early:'提前', miss:'漏音', end:'结束', reset:'重置', sound:'声音强度',
      audio:'音频', audioReady:'已启用', audioLocked:'未启用', startCommand:'开始命令', startDisabled:'未启用 · 由固件自行开始',
      shortcut:'Ctrl + Shift + D · 展开/收起测试控制台', closeConsole:'关闭测试控制台', demoTrack:'模拟曲目',
      dismissError:'关闭提示', rain:'动态像素雨与水面涟漪', language:'切换至英文',
      errorSerial:'此环境无法使用串口。请用 Chrome/Edge，或双击 Start Hardware.cmd 后打开其本地地址。',
      errorSecurity:'浏览器阻止了串口访问。请使用 Chrome/Edge；必要时双击 Start Hardware.cmd。',
      errorCancelled:'尚未选择串口设备。请点击“连接设备”，选择 Arduino 对应端口。',
    }
  };
  let lang = 'zh';
  try { const stored = localStorage.getItem('electric-rain-language'); if (stored === 'en' || stored === 'zh') lang = stored; } catch {}
  const I = {
    get language() { return lang; },
    t(key) { return messages[lang][key] ?? key; },
    song(id) { return id ? (lang === 'zh' ? ['茉莉花','铃儿响叮当','洋娃娃和小熊跳舞'] : E.songs)[id - 1] : I.t('awaiting'); },
    set(language) { if (!messages[language]) return; lang = language; try { localStorage.setItem('electric-rain-language', lang); } catch {} },
    error(message) {
      if (message.startsWith('Web Serial is unavailable')) return I.t('errorSerial');
      if (message.startsWith('Serial access was blocked')) return I.t('errorSecurity');
      if (/No port selected|No device selected|NotFoundError/.test(message)) return I.t('errorCancelled');
      return message;
    },
    apply() {
      document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
      document.title = I.t('appTitle');
      document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = I.t(node.dataset.i18n); });
      document.querySelectorAll('[data-i18n-aria]').forEach(node => { node.setAttribute('aria-label', I.t(node.dataset.i18nAria)); });
      document.querySelectorAll('[data-track-name]').forEach(node => { node.textContent = `0${node.dataset.trackName} · ${I.song(Number(node.dataset.trackName))}`; });
      document.querySelectorAll('#demo-song option').forEach(option => { option.textContent = I.song(Number(option.value)); });
      const toggle = document.getElementById('language-toggle');
      toggle.textContent = lang === 'zh' ? 'English' : '中文'; toggle.setAttribute('aria-label', I.t('language'));
    },
    // Raw serial strings and protocol enum names deliberately remain untranslated.
  };
  E.i18n = I;
})();
