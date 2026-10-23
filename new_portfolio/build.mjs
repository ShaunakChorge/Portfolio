// (portable copy: lives in the repo root next to src/, paths are relative to this file)
// Assembles <SITE>/index.html from src/shell.html + src/<section>.html partials, and auto-links section CSS/JS.
//   node build.mjs                                   -> writes SITE/index.html (readable sources linked: assets/css/*.css, assets/js/**/*.js)
//   node build.mjs --min                             -> same page, but links ONE minified stylesheet (assets/dist/site.min.css) and one
//                                                       minified script per source file (assets/dist/js/<name>.min.js). Needs esbuild
//                                                       (npm i -D esbuild). The readable sources stay in the repo.
//   node build.mjs --only=hero,marquee --out=preview-hero.html
//        -> writes SITE/preview-hero.html with ONLY those partials and only css/js files whose basename is listed
//           (base.css / core.js / main.js are always linked). Use this for isolated development.
// Markers inside src/shell.html:
//   <!-- @css -->              -> <link> for assets/css/base.css, then assets/css/sections/*.css (alphabetical)
//   <!-- @js -->               -> <script defer> for assets/js/core.js, assets/js/sections/*.js (alphabetical), assets/js/main.js
//   <!-- @section:NAME -->     -> contents of src/NAME.html (missing partial = visible warning comment + non-zero exit in full mode)
//
// Why one CSS bundle but one script PER FILE: a single 200 KB script is one long main-thread task (Lighthouse TBT gets worse), while
// separate deferred scripts are parsed/compiled in small slices; for CSS the opposite holds (fewer requests, no render-blocking chain).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = HERE; // repo root = the folder this script lives in (src/ sits next to it)
const SRC = path.join(HERE, 'src');
const args = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const only = args.only ? new Set(String(args.only).split(',').map(s => s.trim()).filter(Boolean)) : null;
const min = !!args.min;
const outName = args.out ? String(args.out) : 'index.html';
if (only && outName === 'index.html') { console.error('refusing to write index.html in --only mode; pass --out=preview-<name>.html'); process.exit(2); }

const read = p => fs.readFileSync(p, 'utf8');
const list = (dir, ext) => fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith(ext)).sort() : [];
const base = f => f.replace(/\.[^.]+$/, '');
const wanted = f => !only || only.has(base(f));

/* ---------- esbuild (only needed for --min) ---------- */
function loadEsbuild() {
  const candidates = [
    () => createRequire(path.join(SITE, 'package.json'))('esbuild'),
    () => createRequire(import.meta.url)('esbuild'),
  ];
  for (const c of candidates) { try { return c(); } catch { /* try next */ } }
  console.error('esbuild not found: run  npm i -D esbuild  (only the --min build needs it)');
  process.exit(3);
}

/* a relative url(...) in a CSS file must keep pointing at the same file once the CSS lives in another folder */
function rebaseUrls(css, fromDir, toDir) {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => {
    if (/^(data:|https?:|\/\/|\/|#)/i.test(u)) return m;
    const abs = path.resolve(fromDir, u);
    let rel = path.relative(toDir, abs).split(path.sep).join('/');
    return `url(${q}${rel}${q})`;
  });
}

let missing = 0;
let html = read(path.join(SRC, 'shell.html'));

const cssFiles = [];   // absolute paths, link order
if (fs.existsSync(path.join(SITE, 'assets/css/base.css'))) cssFiles.push(path.join(SITE, 'assets/css/base.css'));
for (const f of list(path.join(SITE, 'assets/css/sections'), '.css').filter(wanted)) cssFiles.push(path.join(SITE, 'assets/css/sections', f));
const jsFiles = [];    // absolute paths, load order
if (fs.existsSync(path.join(SITE, 'assets/js/core.js'))) jsFiles.push(path.join(SITE, 'assets/js/core.js'));
for (const f of list(path.join(SITE, 'assets/js/sections'), '.js').filter(wanted)) jsFiles.push(path.join(SITE, 'assets/js/sections', f));
if (fs.existsSync(path.join(SITE, 'assets/js/main.js'))) jsFiles.push(path.join(SITE, 'assets/js/main.js'));
const rel = p => path.relative(SITE, p).split(path.sep).join('/');

let cssTags, jsTags, minInfo = '';
if (!min) {
  cssTags = cssFiles.map(f => `<link rel="stylesheet" href="${rel(f)}">`);
  jsTags = jsFiles.map(f => `<script defer src="${rel(f)}"></script>`);
} else {
  const { transformSync } = loadEsbuild();
  const dist = path.join(SITE, 'assets/dist');
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(path.join(dist, 'js'), { recursive: true });
  // CSS: concatenate in link order (base.css = @layer pf first, section CSS un-layered after it), rebase url(), minify once
  const cssAll = cssFiles.map(f => rebaseUrls(read(f), path.dirname(f), dist)).join('\n');
  const cssOut = transformSync(cssAll, { loader: 'css', minify: true, target: 'chrome100', legalComments: 'none' });
  if (cssOut.warnings && cssOut.warnings.length) console.warn('css warnings:', cssOut.warnings.map(w => w.text).slice(0, 5));
  fs.writeFileSync(path.join(dist, 'site.min.css'), cssOut.code);
  cssTags = ['<link rel="stylesheet" href="assets/dist/site.min.css">'];
  // JS: each file minified on its own (never one big script), same load order, all deferred
  jsTags = [];
  let jsBytes = 0, jsRaw = 0;
  for (const f of jsFiles) {
    const name = base(path.basename(f));
    const src = read(f);
    const out = transformSync(src, { loader: 'js', minify: true, target: 'es2018', legalComments: 'none' });
    fs.writeFileSync(path.join(dist, 'js', name + '.min.js'), out.code);
    jsTags.push(`<script defer src="assets/dist/js/${name}.min.js"></script>`);
    jsBytes += out.code.length; jsRaw += src.length;
  }
  minInfo = ` | min: css ${(cssAll.length / 1024).toFixed(0)}->${(cssOut.code.length / 1024).toFixed(0)} KB, js ${(jsRaw / 1024).toFixed(0)}->${(jsBytes / 1024).toFixed(0)} KB`;
}

html = html.replace(/^([ \t]*)<!-- @css -->/m, (_, ind) => cssTags.map(t => ind + t).join('\n'));
html = html.replace(/^([ \t]*)<!-- @js -->/m, (_, ind) => jsTags.map(t => ind + t).join('\n'));
html = html.replace(/^([ \t]*)<!-- @section:([a-z0-9-]+) -->/gm, (_, ind, name) => {
  if (only && !only.has(name)) return '';
  const p = path.join(SRC, name + '.html');
  if (!fs.existsSync(p)) { missing++; console.error(`MISSING partial: src/${name}.html`); return `${ind}<!-- MISSING SECTION ${name} -->`; }
  const body = read(p).replace(/\s+$/, '');
  return body.split('\n').map(l => (l.trim() ? ind + l : l)).join('\n');
});

fs.writeFileSync(path.join(SITE, outName), html);
console.log(`${outName} written: ${(html.length / 1024).toFixed(1)} KB | css:${cssTags.length} js:${jsTags.length} | missing partials: ${missing}${minInfo}`);
process.exit(missing && !only ? 1 : 0);
