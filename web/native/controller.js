/* Route normalized events. Only this boundary admits data into a session. */
(() => {
  'use strict';
  const E = window.ElectricRain;
  E.Controller = class Controller {
    constructor(effects = {}) {
      this.effects = effects;
      this.mode = 'HARDWARE';
      this.state = {...E.initial};
    }
    home() {
      const previous = this.state;
      this.state = {...E.initial, run: previous.run + 1};
      this.effects.change?.(this.state, previous, {type: 'reset'});
    }
    setMode(mode) {
      if (!['SIMULATION', 'HARDWARE'].includes(mode)) throw new Error('Invalid mode');
      this.mode = mode;
      this.home();
    }
    receive(event, source) {
      if (source !== this.mode) return false;
      const previous = this.state;
      if (source === 'SIMULATION' && !previous.ended && ['hit','early','wrong','miss'].includes(event.type) && event.score === undefined) {
        event = {...event, ...E.scoreVerdict(previous, event.type)};
      }
      if (!previous.ended) {
        // Every actual TRIGGER sounds, irrespective of later HIT/MISS or target pitch.
        if (event.type === 'trigger' && Number.isInteger(event.actual) && event.actual >= 1 && event.actual <= 8) {
          this.effects.trigger?.(event.actual);
        }
        if (['trigger','hit','early','wrong','miss'].includes(event.type)) this.effects.visual?.(event);
      }
      this.state = E.reduceEvent(previous, event);
      this.effects.change?.(this.state, previous, event);
      return true;
    }
  };
})();
