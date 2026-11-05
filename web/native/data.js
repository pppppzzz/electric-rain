/* Native browser source. No imports, build step or React required. */
(() => {
'use strict';
const E = window.ElectricRain ||= {};

const songs = ['Jasmine Flower', 'Jingle Bells', 'Doll and Bear Dance'];
const pitches = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
// Count only digits 1..8 in the colleague's Songs.h; spaces are silent beats.
const songNoteCounts = Object.freeze([40, 44, 70]);
const scoreProgress = (songId, score) => {
    const count = songNoteCounts[songId - 1];
    if (!count) return null;
    const maximum = count * E.scoreRules.hit;
    const current = Number.isFinite(score) ? Math.max(0, score) : 0;
    return {maximum, percent:Math.min(100, current / maximum * 100), remaining:Math.max(0, maximum - current)};
};

Object.assign(E, {songs, pitches, songNoteCounts, scoreProgress});
})();
