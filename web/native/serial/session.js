/* Native browser source. No imports, build step or React required. */
(() => {
'use strict';
const E = window.ElectricRain ||= {};

const initial = { phase: 'WAITING', song: null, score: 0, combo: 0, bestCombo: 0, sound: 0, ended: false, run: 0 };
function reduceEvent(s, e) {
    if (e.type === 'sound')
        return { ...s, sound: e.sound ?? 0 };
    if (e.type === 'song') {
        if (!e.song)
            return s;
        if (s.song === e.song && s.phase !== 'WAITING' && !s.ended && !e.newRound)
            return s;
        return { ...initial, phase: 'SONG_SELECT', song: e.song, run: s.run + 1 };
    }
    if (s.ended)
        return s;
    let next = { ...s };
    if (e.song)
        next.song = e.song;
    if (e.type === 'state' || e.type === 'status') {
        if (e.phase === 'WAITING')
            return s.phase === 'WAITING' ? s : { ...initial, run: s.run + 1 };
        if (e.phase === 'SONG_SELECT' && s.phase === 'WAITING')
            next = { ...next, phase: 'SONG_SELECT', run: s.run + 1 };
        if (e.phase === 'PLAYING')
            next.phase = 'PLAYING';
    }
    // Triggers recover from a dropped STATE without buffering or delaying the note.
    if (e.type === 'trigger' && (s.phase === 'SONG_SELECT' || s.phase === 'WAITING'))
        next.phase = 'PLAYING';
    if (e.type === 'end') {
        if (s.phase === 'WAITING')
            return s;
        next.phase = 'RESULT';
        next.ended = true;
    }
    if (next.phase !== 'WAITING') {
        if (e.score !== undefined)
            next.score = Math.max(0, e.score);
        if (e.combo !== undefined)
            next.combo = Math.max(0, e.combo);
        if (e.bestCombo !== undefined)
            next.bestCombo = Math.max(0, e.bestCombo);
        else if (e.combo !== undefined)
            next.bestCombo = Math.max(next.bestCombo, next.combo);
    }
    return next;
}

Object.assign(E, {initial, reduceEvent});
})();
