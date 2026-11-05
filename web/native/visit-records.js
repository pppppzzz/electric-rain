/* Per-tab, per-visit records. Completed real rounds and demos remain separate. */
(() => {
  'use strict';
  const E = window.ElectricRain;
  E.VisitRecords = class VisitRecords {
    constructor(storage) {
      this.key = 'electric-rain-visit-best-v1';
      this.values = {HARDWARE:{score:0,song:null},SIMULATION:{score:0,song:null}};
      try { this.storage = storage === undefined ? sessionStorage : storage; } catch { this.storage = null; }
      try {
        const data = JSON.parse(this.storage?.getItem(this.key) || 'null');
        for (const mode of ['HARDWARE','SIMULATION']) {
          const value = data?.[mode];
          if (value && Number.isFinite(value.score) && value.score >= 0 && Number.isInteger(value.song) && value.song >= 1 && value.song <= 3) {
            this.values[mode] = {score:value.score,song:value.song};
          }
        }
      } catch { /* Local-file storage may be disabled; memory still works. */ }
    }
    best(mode) { return {...(this.values[mode] || {score:0,song:null})}; }
    record(mode, state) {
      if (!this.values[mode] || state.phase !== 'RESULT' || !state.ended || !Number.isFinite(state.score) || state.score < 0 || !Number.isInteger(state.song) || state.song < 1 || state.song > 3) return false;
      const previous = this.values[mode];
      if (previous.song !== null && state.score <= previous.score) return false;
      this.values[mode] = {score:state.score,song:state.song};
      try { this.storage?.setItem(this.key, JSON.stringify(this.values)); } catch {}
      return true;
    }
  };
})();
