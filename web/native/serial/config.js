/* Native browser source. No imports, build step or React required. */
(() => {
'use strict';
const E = window.ElectricRain ||= {};

// Provisional field aliases belong here; change only after inspecting the final firmware.
const serialConfig = {
    protocol: 'auto', // auto: provisional JSON + colleague's Interactive Piano v3.2 text
    baudRate: 115200,
    startCommand: null, // e.g. '{"command":"start"}\n', ONLY with firmware support
    fields: { event: 'event', song: 'song', actual: 'actual', phase: 'phase', score: 'score', combo: 'combo', bestCombo: 'bestCombo', sound: 'sound' },
    soundFullScale: 100,
    textSoundFullScale: 1023, // raw 10-bit ADC peak-to-peak, not dB
    maxLineLength: 8192,
};

Object.assign(E, {serialConfig});
})();
