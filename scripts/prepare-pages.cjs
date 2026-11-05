/* Package only files referenced by the standalone HTML, never firmware or logs. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.resolve(root, '_site');
if (path.dirname(output) !== root) throw new Error('Invalid staging path');
if (fs.existsSync(output)) {
  if (!fs.existsSync(path.join(output, '.electric-rain-generated'))) throw new Error('_site already exists and is not a generated artifact');
  fs.rmSync(output, {recursive:true,force:true});
}
fs.mkdirSync(output);
fs.writeFileSync(path.join(output, '.electric-rain-generated'), 'Generated static Pages artifact\n');
const pending = ['index.html'], copied = new Set();
while (pending.length) {
  const name = pending.shift();
  if (copied.has(name)) continue;
  const source = path.resolve(root,name);
  if (!source.startsWith(root + path.sep) || !fs.statSync(source).isFile()) throw new Error('Invalid static asset: '+name);
  const target = path.join(output,name);
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);
  copied.add(name);
  if (path.extname(source) === '.html') {
    const html = fs.readFileSync(source,'utf8');
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
      const ref = match[1];
      if (/^(?:[a-z]+:|\/\/|#)/i.test(ref)) continue;
      const local = ref.split(/[?#]/)[0];
      if (local) pending.push(path.normalize(path.join(path.dirname(name),local)));
    }
  }
}
fs.writeFileSync(path.join(output,'.nojekyll'),'');
console.log('Prepared static GitHub Pages files in '+output);
