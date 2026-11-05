/* Interactive Piano v3.2: accumulate received verdicts, never guess pitch or timing. */
(() => {
  'use strict';
  const E = window.ElectricRain;
  E.TextV32 = class TextV32 {
    constructor(emit, log) { this.emit = emit; this.log = log; this.reset(); }
    reset() { this.phase = 'UNKNOWN'; this.song = null; this.judged = new Set(); this.detected = false; this.warnedMidRound = false; this.resetScore(); }
    resetScore() { this.tally = {score:0, combo:0, bestCombo:0}; this.pressId = 0; this.yellowPressId = -1; }
    verdict(type, extra = {}) {
      this.tally = E.scoreVerdict(this.tally, type);
      this.emit({type, ...extra, ...this.tally, scoreSource:'verdicts'});
    }
    detectedText() {
      if (!this.detected) { this.detected = true; this.log('Interactive Piano v3.2 text protocol detected'); }
    }
    beginPlay() {
      if (this.phase === 'SELECTED') {
        this.phase = 'PLAYING';
        this.log('PLAYING observed from selected-round telemetry; exact start time is unavailable');
        this.emit({type:'state', phase:'PLAYING', song:this.song});
      }
      if (this.phase === 'UNKNOWN' && !this.warnedMidRound) {
        this.warnedMidRound = true;
        this.log('Mid-round data received without a selection. Press the UNO RESET once, then select a song.');
      }
      return this.phase === 'PLAYING';
    }
    line(line) {
      let match;
      if (line.startsWith('Interactive Piano v3.2 MODERATE')) { this.reset(); this.detectedText(); return true; }
      if (line === 'Keep quiet for 2 seconds: calibrating microphone.') {
        this.detectedText(); this.phase = 'WAITING'; this.song = null; this.judged.clear(); this.resetScore();
        this.log('Microphone calibrating: keep quiet for 2 seconds');
        this.emit({type:'state', phase:'WAITING'}); this.emit({type:'sound', sound:0}); return true;
      }
      if (line === 'Blow now: soft / medium / strong.') {
        this.detectedText(); this.phase = 'WAITING'; this.log('Ready for blow selection (firmware range 550–700)'); return true;
      }
      if ((match = /^Blow strength=(\d+)$/.exec(line))) {
        this.detectedText();
        this.emit({type:'sound', sound:Math.min(100, Number(match[1]) * 100 / E.serialConfig.textSoundFullScale)}); return true;
      }
      if (/^(Noise floor|Captured peak)=\d+$/.test(line)) { this.detectedText(); return true; }
      if (/^(Below \d+|Above \d+): no song selected\./.test(line)) {
        this.detectedText(); this.phase = 'WAITING'; this.song = null;
        this.log(line); this.emit({type:'state', phase:'WAITING'}); return true;
      }
      if ((match = /^Selected: (Mo Li Hua|Jasmine Flower|Jingle Bells|Doll and Bear Dance)$/.exec(line))) {
        this.detectedText();
        this.song = {'Mo Li Hua':1,'Jasmine Flower':1,'Jingle Bells':2,'Doll and Bear Dance':3}[match[1]];
        this.phase = 'SELECTED'; this.judged.clear(); this.warnedMidRound = false; this.resetScore();
        this.emit({type:'song', song:this.song, newRound:true}); return true;
      }
      if (line === 'Microphone locked. Play when blocks reach the bottom. r = restart.') {
        this.detectedText(); this.log('Firmware starts automatically after its countdown; no start command sent'); return true;
      }
      if (line.startsWith('LED TEST:') || line.startsWith('MATRIX commands sent') || line.startsWith('BLANK commands sent')) {
        this.detectedText(); this.phase = 'DIAGNOSTIC'; this.song = null; this.judged.clear(); this.resetScore();
        this.log('Hardware diagnostic mode: piano triggers suppressed');
        this.emit({type:'state', phase:'WAITING'}); return true;
      }
      if (/^Sonar(?: raw mm=\d+ |: NO ECHO\.)/.test(line)) { this.detectedText(); this.beginPlay(); return true; }
      if ((match = /^PRESS mm=(\d+) key=([1-8])$/.exec(line))) {
        this.detectedText();
        if (this.beginPlay()) { this.pressId++; this.emit({type:'trigger', actual:Number(match[2])}); }
        return true;
      }
      if ((match = /^(GREEN HIT|RED MISS) event=(\d+)$/.exec(line))) {
        this.detectedText();
        if (this.beginPlay() && !this.judged.has(match[2])) {
          this.judged.add(match[2]);
          this.verdict(match[1] === 'GREEN HIT' ? 'hit' : 'miss', {noteIndex:Number(match[2])});
        }
        return true;
      }
      if (line === 'YELLOW EARLY/WRONG event=-1') {
        this.detectedText();
        // The firmware combines early/wrong. Never present this as a definitive EARLY.
        if (this.beginPlay() && this.yellowPressId !== this.pressId) {
          this.yellowPressId = this.pressId; this.verdict('wrong');
        }
        return true;
      }
      if (line === 'Song finished. Quiet pause, then recalibrate and blow again.') {
        this.detectedText();
        if (this.phase === 'PLAYING' || this.phase === 'SELECTED') {
          this.phase = 'ENDED'; this.emit({type:'end', ...this.tally, scoreSource:'verdicts'});
        }
        return true;
      }
      return false;
    }
  };
})();
