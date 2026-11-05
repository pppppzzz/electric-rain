// Provisional field aliases belong here; change only after inspecting the final firmware.
export const serialConfig = {
  baudRate: 115200,
  startCommand: null as string | null, // e.g. '{"command":"start"}\n', ONLY with firmware support
  fields: { event:'event', song:'song', actual:'actual', phase:'phase', score:'score', combo:'combo', bestCombo:'bestCombo', sound:'sound' },
  soundFullScale: 100,
  maxLineLength: 8192,
};
