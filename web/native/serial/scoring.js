/* Score arithmetic follows received verdicts; no chart, timing or pitch judgment. */
(() => {
  'use strict';
  const E = window.ElectricRain;
  E.scoreRules = Object.freeze({initial:0, minimum:0, hit:3, early:-1, wrong:-1, miss:-1});
  E.scoreVerdict = (state, type) => {
    const rule = E.scoreRules;
    const score = Math.max(rule.minimum, (state.score ?? rule.initial) + (rule[type] ?? 0));
    const combo = type === 'hit' ? (state.combo ?? 0) + 1 : 0;
    return {score, combo, bestCombo:Math.max(state.bestCombo ?? 0, combo)};
  };
})();
