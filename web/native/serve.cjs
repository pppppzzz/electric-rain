/* Optional loopback-only server. Built-in Node modules; no npm or installation step. */
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const {spawn} = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const nativeRoot = path.join(root, 'web', 'native');
const mime = {'.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8'};
const server = http.createServer(async (request, response) => {
  if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405); return response.end(); }
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    if (pathname === '/favicon.ico') { response.writeHead(204); return response.end(); }
    const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    const real = await fs.realpath(target);
    const allowed = real === path.join(root, 'index.html') || real.startsWith(nativeRoot + path.sep);
    if (!allowed || !mime[path.extname(real)]) { response.writeHead(404); return response.end('Not found'); }
    const data = await fs.readFile(real);
    response.writeHead(200, {'Content-Type':mime[path.extname(real)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch { response.writeHead(404); response.end('Not found'); }
});
let port = 5173;
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && port < 5183) { port++; server.listen(port, '127.0.0.1'); }
  else { console.error('Server could not start:', error.message); process.exitCode = 1; }
});
server.on('listening', () => {
  const url = `http://127.0.0.1:${server.address().port}/`;
  console.log(`\nLocal: ${url}\nKeep this window open. Ctrl+C stops the server.\n`);
  // --no-open is for automated checks. The double-click launcher opens the default browser.
  if (process.platform === 'win32' && !process.argv.includes('--no-open')) {
    const child = spawn('rundll32.exe', ['url.dll,FileProtocolHandler',url], {detached:true,stdio:'ignore',windowsHide:true});
    child.on('error', () => console.log('Open the Local address above in Chrome or Edge.'));
    child.unref();
  }
});
server.listen(port, '127.0.0.1');
for (const signal of ['SIGINT','SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
