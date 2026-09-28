/* Build: assemble the source into a deployable site in dist/.
 *
 * The playable page is one HTML file, but the CSS and JS are written out as
 * separate files rather than inlined. That is what lets the site run under a
 * Content-Security-Policy with no 'unsafe-inline' (see deploy/_headers).
 * three.js is copied out of node_modules so nothing is fetched from a CDN at
 * runtime: fewer third parties, no SRI to keep in step, and it still works
 * offline.
 */
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'src', OUT = 'dist';
const parts = readdirSync(SRC).filter(f => /^\d\d-.*\.js$/.test(f)).sort();
if (!parts.length) throw new Error('no source files found in src/');

mkdirSync(join(OUT, 'vendor'), { recursive: true });

let shell = readFileSync(join(SRC, 'shell.html'), 'utf8');

// 1. lift the stylesheet out of the shell
const styleAt = shell.indexOf('<style>');
const styleEnd = shell.indexOf('</style>');
if (styleAt < 0 || styleEnd < 0) throw new Error('no <style> block in shell.html');
const css = shell.slice(styleAt + 7, styleEnd);
shell = shell.slice(0, styleAt) + '<link rel="stylesheet" href="styles.css">' + shell.slice(styleEnd + 8);
writeFileSync(join(OUT, 'styles.css'), css.trim() + '\n');

// 2. concatenate the game source
const js = parts.map(f => readFileSync(join(SRC, f), 'utf8')).join('\n');
writeFileSync(join(OUT, 'game.js'), js);

// 3. point the shell at local copies of three.js and at the built game
const vendor = [
  ['three/build/three.min.js', 'three.min.js'],
  ['three/examples/js/loaders/GLTFLoader.js', 'GLTFLoader.js'],
  ['three/examples/js/loaders/DRACOLoader.js', 'DRACOLoader.js']
];
let vendored = true;
for (const [from, to] of vendor) {
  const path = join('node_modules', from);
  if (!existsSync(path)) { vendored = false; break; }
  cpSync(path, join(OUT, 'vendor', to));
}
const dracoFrom = join('node_modules', 'three/examples/js/libs/draco');
if (existsSync(dracoFrom)) cpSync(dracoFrom, join(OUT, 'vendor', 'draco'), { recursive: true });
else vendored = false;

if (vendored) {
  shell = shell
    .replace(/<script src="https:\/\/cdnjs[^"]*three\.min\.js"><\/script>/, '<script src="vendor/three.min.js"></script>')
    .replace(/<script src="https:\/\/cdn\.jsdelivr[^"]*GLTFLoader\.js"><\/script>/, '<script src="vendor/GLTFLoader.js"></script>')
    .replace(/<script src="https:\/\/cdn\.jsdelivr[^"]*DRACOLoader\.js"><\/script>/, '<script src="vendor/DRACOLoader.js"></script>');
} else {
  console.warn('! three.js not found in node_modules — the build will load it from a CDN.');
  console.warn('  Run "npm install" first to vendor it and allow a stricter security policy.');
}
shell = shell.replace('<script>\n</script>', '<script src="game.js" defer></script>');
writeFileSync(join(OUT, 'index.html'), shell);

// 4. copy the models and anything else public
if (existsSync('public')) cpSync('public', OUT, { recursive: true });

const models = existsSync(join(OUT, 'models')) ? readdirSync(join(OUT, 'models')).filter(f => f.endsWith('.glb')) : [];
console.log(`built dist/ — ${parts.length} source files, ${models.length} models, three.js ${vendored ? 'vendored' : 'from CDN'}`);
if (!models.length) console.warn('! no .glb models in public/models — cars will fall back to the built-in bodywork.');
