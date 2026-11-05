/* Native browser source. No imports, build step or React required. */
(() => {
'use strict';
const E = window.ElectricRain ||= {};
const {serialConfig, LineDecoder} = E;
class SerialTransport {
    status;
    port = null;
    reader = null;
    task = null;
    decoder;
    closing = false;
    constructor(emit, status, log) {
        this.status = status;
        this.decoder = new LineDecoder(emit, log);
    }
    get connected() { return !!this.port; }
    async connect() {
        if (this.port)
            return;
        const api = navigator.serial;
        if (!api || globalThis.isSecureContext === false)
            throw new Error('Web Serial is unavailable here. Use Chrome/Edge, or double-click Start Hardware.cmd and open its local address.');
        let port;
        try { port = await api.requestPort(); }
        catch (reason) {
            if (reason.name === 'SecurityError') throw new Error('Serial access was blocked. Open in Chrome/Edge; if needed, double-click Start Hardware.cmd.');
            throw reason;
        }
        await port.open({ baudRate: serialConfig.baudRate });
        this.port = port;
        this.closing = false;
        this.decoder.reset();
        this.status('Connected');
        this.task = this.read(port);
    }
    async read(port) {
        const decoder = new TextDecoder();
        try {
            if (!port.readable)
                throw new Error('Serial input unavailable');
            this.reader = port.readable.getReader();
            while (!this.closing) {
                const { value, done } = await this.reader.read();
                if (done)
                    break;
                if (value)
                    this.decoder.push(decoder.decode(value, { stream: true }));
            }
        }
        catch (e) {
            if (!this.closing)
                this.status(`Disconnected: ${String(e)}`);
        }
        finally {
            this.reader?.releaseLock();
            this.reader = null;
            try {
                await port.close();
            }
            catch { /* device removed */ }
            this.port = null;
            this.decoder.reset();
            this.status('Disconnected');
        }
    }
    async disconnect() { this.closing = true; try {
        await this.reader?.cancel();
    }
    catch { } await this.task; }
    async requestStart() {
        if (!serialConfig.startCommand || !this.port?.writable)
            return;
        const writer = this.port.writable.getWriter();
        try {
            await writer.write(new TextEncoder().encode(serialConfig.startCommand));
        }
        finally {
            writer.releaseLock();
        }
    }
}

Object.assign(E, {SerialTransport});
})();
