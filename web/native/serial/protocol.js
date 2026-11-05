/* Native browser source. No imports, build step or React required. */
(() => {
'use strict';
const E = window.ElectricRain ||= {};
const {serialConfig} = E;
const numeric = (v) => typeof v === 'number' && Number.isFinite(v) ? v : undefined;
function normalize(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return null;
    const r = raw, f = serialConfig.fields;
    if (typeof r[f.event] !== 'string')
        return null;
    const type = r[f.event].toLowerCase();
    if (!['sound', 'song', 'state', 'status', 'trigger', 'hit', 'early', 'miss', 'wrong', 'end'].includes(type))
        return null;
    const e = { type };
    const phases = { WAITING: 'WAITING', LISTENING: 'WAITING', SELECTED: 'SONG_SELECT', SONG_SELECT: 'SONG_SELECT', PLAYING: 'PLAYING', RESULT: 'RESULT' };
    // FINISHING is not an END: preserve the last scene until actual end arrives.
    if (typeof r[f.phase] === 'string')
        e.phase = phases[r[f.phase].toUpperCase()];
    const song = numeric(r[f.song]);
    if (song && Number.isInteger(song) && song >= 1 && song <= 3)
        e.song = song;
    const actual = numeric(r[f.actual]);
    if (actual && Number.isInteger(actual) && actual >= 1 && actual <= 8)
        e.actual = actual;
    for (const key of ['score', 'combo', 'bestCombo'])
        e[key] = numeric(r[f[key]]);
    e.sound = numeric(r.relative) ?? numeric(r[f.sound]);
    if (type === 'trigger' && !e.actual || type === 'song' && !e.song || type === 'sound' && e.sound === undefined)
        return null;
    return e;
}
class LineDecoder {
    buffer = '';
    dropping = false;
    seen = new Set();
    emit;
    log;
    constructor(emit, log) { this.emit = emit; this.log = log; this.text = new E.TextV32(emit, log); }
    reset() { this.buffer = ''; this.dropping = false; this.seen.clear(); this.text.reset(); }
    push(chunk) {
        for (const part of chunk.split(/(?<=\n)/)) {
            if (!this.dropping)
                this.buffer += part;
            if (this.buffer.length > serialConfig.maxLineLength) {
                this.buffer = '';
                this.dropping = true;
                this.log('Oversized serial line ignored');
            }
            if (!part.endsWith('\n'))
                continue;
            if (this.dropping) {
                this.dropping = false;
                continue;
            }
            const line = this.buffer.trim();
            this.buffer = '';
            if (!line)
                continue;
            if (!line.startsWith('{') && !line.startsWith('[')) {
                if (serialConfig.protocol === 'json' || !this.text.line(line)) this.log('Unrecognized serial text ignored: ' + line.slice(0, 160));
                continue;
            }
            try {
                const raw = JSON.parse(line), e = normalize(raw);
                if (!e) {
                    this.log('Unsupported or invalid event ignored');
                    continue;
                }
                // Firmware id is a chart-note index (often -1), NOT a unique event id.
                // Dedupe only explicit eventId/seq or timestamp + complete packet, never pitch.
                const token = raw.eventId !== undefined ? `${e.type}:id:${raw.eventId}` : raw.seq !== undefined ? `${e.type}:seq:${raw.seq}` : raw.t !== undefined ? line : null;
                if (token && this.seen.has(token))
                    continue;
                if (token) {
                    this.seen.add(token);
                    if (this.seen.size > 512)
                        this.seen.delete(this.seen.values().next().value);
                }
                this.emit(e);
            }
            catch {
                this.log('Malformed JSON ignored');
            }
        }
    }
}

Object.assign(E, {normalize, LineDecoder});
})();
