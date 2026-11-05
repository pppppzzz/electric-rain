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
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match=>match[1]).filter(value=>!value.startsWith('data:'));
for (const name of ['index.html', ...assets]) {
  const source = path.resolve(root,name);
  if (!source.startsWith(root + path.sep) || !fs.statSync(source).isFile()) throw new Error('Invalid static asset: '+name);
  const target = path.join(output,name);
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(source,target);
}
fs.writeFileSync(path.join(output,'.nojekyll'),'');
console.log('Prepared static GitHub Pages files in '+output);
