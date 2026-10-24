// Build script for the whole site. ONE file, two uses:
//
//   node build.mjs --min     full production build (what you deploy):
//                            1. generators  tools/fx, tools/hero, tools/home (partials + script data from content/content.json), tools/selector (writes tools/project-selector.html)
//                            2. assemble    index.html (the HOME page) from src/shell.html + src/generated/home.content.html + the partials
//                            3. pages       tools/pages/build-pages.mjs: services/, projects/, about/, faq/, contact/, resume/ + sitemap.xml, robots.txt, llms.txt, llms-full.txt
//                            4. guard       scans the output for forbidden strings and prints a summary
//   node build.mjs           the same, but the page links the readable assets/css + assets/js files (no esbuild needed)
//   node build.mjs --skip-gen            skip step 1 (partials already generated)
//   node build.mjs --only=hero,home-faq --out=preview-x.html     assemble ONE preview file with only those partials (development; delete it afterwards)
//
//   module   import { renderPage, loadConfig, ... } from './build.mjs'   -> the page generators render every other page with the SAME shell
//
// SITE is the folder that holds this file (override with PF_SITE). esbuild is needed only for --min:  npm i
//
// Shell = src/shell.html (head, header, drawer, <main>{{content}}</main>, footer partial, sprite, scripts).
//   <!-- @css -->            -> <link> for assets/css/base.css + assets/css/sections/*.css (or the one minified bundle with --min)
//   <!-- @js -->             -> <script defer> for assets/js/core.js + sections/*.js + main.js (or the minified files)
//   <!-- @section:NAME -->   -> contents of src/generated/NAME.html (or src/NAME.html for the hand-written footer) (also expanded inside the {{content}} you pass)
//   {{base}} {{home}} {{title}} {{description}} {{canonical}} {{og_image}} {{og_type}} {{jsonld}} {{extra_head}} {{content}} {{current}} {{aria:NAME}} {{site_url}}
// Home page = src/generated/home.content.html (the section markers) + src/generated/home.page.json (title / description / extra head), both written by tools/home/gen.mjs.
// Hand-written source in src/: shell.html, footer.html, site.config.json. Everything in src/generated/ is rebuilt on every run.
// Site-wide facts live in src/site.config.json; the ONE base-URL value is content/content.json -> seo.site_url (change it, rebuild, done).
//
// Why one CSS bundle but one script PER FILE: a single 200 KB script is one long main-thread task (Lighthouse TBT gets worse), while
// separate deferred scripts are parsed/compiled in small slices; for CSS the opposite holds (fewer requests, no render-blocking chain).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SITE = process.env.PF_SITE ? path.resolve(process.env.PF_SITE) : HERE;
export const SRC = path.join(SITE, 'src');
export const GENERATED = path.join(SRC, 'generated');   // partials + home page data written by tools/hero and tools/home (git-ignored, rebuilt every run)
export const CONTENT_FILE = path.join(SITE, 'content', 'content.json');
const read = p => fs.readFileSync(p, 'utf8');
const list = (dir, ext) => fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith(ext)).sort() : [];
const stem = f => f.replace(/\.[^.]+$/, '');

/* ---------- site config (the ONE place the base URL lives: content.seo.site_url) ---------- */
export function loadConfig() {
  const cfg = JSON.parse(read(path.join(SRC, 'site.config.json')));
  const content = JSON.parse(read(CONTENT_FILE));
  const url = content.seo && content.seo.site_url;
  if (!url) throw new Error('content/content.json has no seo.site_url (the one base-URL value)');
  cfg.url = String(url).replace(/\/*$/, '/');   // always one trailing slash
  // the ONE entity sentence (content.seo.entity) is the Person description everywhere: home JSON-LD, /about/ JSON-LD, llms.txt
  const entity = content.seo && content.seo.entity;
  if (!entity) throw new Error('content/content.json has no seo.entity (the one entity sentence)');
  cfg.person = { ...cfg.person, description: entity };
  return cfg;
}
export const abs = (cfg, p = '') => cfg.url + String(p).replace(/^\.?\//, '');

/* ---------- html escaping + json-ld helpers ---------- */
export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const ldScript = obj => `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2).replace(/</g, '\\u003c')}\n</script>`;
export function breadcrumb(cfg, items) {   // items: [{ name, path }] from Home down to the page
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(cfg, it.path || '') })),
  };
}
export function personNode(cfg) {
  const p = cfg.person;
  return {
    '@type': 'Person', '@id': abs(cfg, '#person'), name: cfg.name, url: cfg.url, image: abs(cfg, cfg.og_image),
    jobTitle: p.jobTitle, description: p.description, email: 'mailto:' + cfg.email,
    worksFor: { '@type': 'Organization', name: p.employer },
    address: { '@type': 'PostalAddress', addressLocality: p.city, addressCountry: p.countryCode },
    alumniOf: { '@type': 'CollegeOrUniversity', name: p.alumniOf },
    knowsAbout: p.knowsAbout, sameAs: cfg.sameAs,
  };
}
export function websiteNode(cfg) {
  return { '@type': 'WebSite', '@id': abs(cfg, '#website'), url: cfg.url, name: cfg.name, description: cfg.tagline, inLanguage: 'en', publisher: { '@id': abs(cfg, '#person') } };
}

/* ---------- esbuild (only needed for --min) ---------- */
function loadEsbuild() {
  const candidates = [
    () => createRequire(path.join(SITE, 'package.json'))('esbuild'),
    () => createRequire(import.meta.url)('esbuild'),
  ];
  for (const c of candidates) { try { return c(); } catch { /* try next */ } }
  console.error('esbuild not found: run  npm i  (only the --min build needs it)');
  process.exit(3);
}
/* a relative url(...) in a CSS file must keep pointing at the same file once the CSS lives in another folder */
function rebaseUrls(css, fromDir, toDir) {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => {
    if (/^(data:|https?:|\/\/|\/|#)/i.test(u)) return m;
    const rel = path.relative(toDir, path.resolve(fromDir, u)).split(path.sep).join('/');
    return `url(${q}${rel}${q})`;
  });
}

/* ---------- asset tags (hrefs carry {{base}}; computed once per process) ---------- */
const assetCache = new Map();
export function assetTags({ min = false, only = null } = {}) {
  const key = (min ? 'min' : 'src') + '|' + (only ? [...only].sort().join(',') : '*');
  if (assetCache.has(key)) return assetCache.get(key);
  const wanted = f => !only || only.has(stem(f));
  const rel = p => path.relative(SITE, p).split(path.sep).join('/');
  const cssFiles = [], jsFiles = [];
  if (fs.existsSync(path.join(SITE, 'assets/css/base.css'))) cssFiles.push(path.join(SITE, 'assets/css/base.css'));
  for (const f of list(path.join(SITE, 'assets/css/sections'), '.css').filter(wanted)) cssFiles.push(path.join(SITE, 'assets/css/sections', f));
  if (fs.existsSync(path.join(SITE, 'assets/js/core.js'))) jsFiles.push(path.join(SITE, 'assets/js/core.js'));
  for (const f of list(path.join(SITE, 'assets/js/sections'), '.js').filter(wanted)) jsFiles.push(path.join(SITE, 'assets/js/sections', f));
  if (fs.existsSync(path.join(SITE, 'assets/js/main.js'))) jsFiles.push(path.join(SITE, 'assets/js/main.js'));
  let css, js, info = '';
  if (!min) {
    css = cssFiles.map(f => `<link rel="stylesheet" href="{{base}}${rel(f)}">`);
    js = jsFiles.map(f => `<script defer src="{{base}}${rel(f)}"></script>`);
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
    css = ['<link rel="stylesheet" href="{{base}}assets/dist/site.min.css">'];
    // JS: each file minified on its own (never one big script), same load order, all deferred
    js = [];
    let jsBytes = 0, jsRaw = 0;
    for (const f of jsFiles) {
      const name = stem(path.basename(f));
      const src = read(f);
      const out = transformSync(src, { loader: 'js', minify: true, target: 'es2018', legalComments: 'none' });
      fs.writeFileSync(path.join(dist, 'js', name + '.min.js'), out.code);
      js.push(`<script defer src="{{base}}assets/dist/js/${name}.min.js"></script>`);
      jsBytes += out.code.length; jsRaw += src.length;
    }
    info = ` | min: css ${(cssAll.length / 1024).toFixed(0)}->${(cssOut.code.length / 1024).toFixed(0)} KB, js ${(jsRaw / 1024).toFixed(0)}->${(jsBytes / 1024).toFixed(0)} KB`;
  }
  const r = { css, js, info };
  assetCache.set(key, r);
  return r;
}

/* ---------- footer lists (generated from content, so the footer can never link a page that does not exist) ---------- */
export function footerParts(base) {
  const c = JSON.parse(read(CONTENT_FILE));
  const ind = '            ', NL = String.fromCharCode(10);
  const services = c.services.map(s => `<li><a href="${base}services/${s.page_slug || s.slug}/">${esc(s.nav_label)}</a></li>`).join(NL + ind);
  const byId = Object.fromEntries(c.projects.map(p => [p.id, p]));
  const cases = new Set(c.selection_default.casestudy);
  const work = c.selection_default.footer_work.map(id => {
    const p = byId[id];
    if (!p || !cases.has(id)) throw new Error('content.selection_default.footer_work must list case-study project ids: ' + id);
    return `<li><a href="${base}projects/${p.slug}/">${esc(p.title)}</a></li>`;
  }).concat(`<li><a href="${base}projects/">All projects</a></li>`).join(NL + ind);
  const note = (c.site && c.site.footer && c.site.footer.note) || '';
  return { services, work, note: esc(note.replace(/\.$/, '')) };
}

/* ---------- the shared page renderer ---------- */
/**
 * renderPage({ depth|base, path, title, description, canonical?, og_image?, og_type?, jsonld?, extra_head?, content, current, min?, only? }) -> { html, missing }
 *   depth        0 = site root (home), 1 = /projects/, 2 = /projects/<slug>/ ...  ({{base}} = '../' x depth)
 *   path         page path relative to the site root ('' home, 'projects/', 'projects/observable-ai-backend/'); canonical = url + path unless given
 *   jsonld       an object, an array of objects, or ready-made <script> markup; objects are emitted as <script type="application/ld+json">
 *   content      the inner HTML of <main id="main">; may contain <!-- @section:name --> markers and {{base}}
 *   current      nav key: home | projects | services | about | faq | contact (anything else lights no nav item)
 */
export function renderPage(o = {}) {
  const cfg = o.cfg || loadConfig();
  const depth = o.depth ?? (o.base != null ? (String(o.base).match(/\.\.\//g) || []).length : String(o.path || '').split('/').filter(Boolean).length);
  const base = o.base != null ? o.base : '../'.repeat(depth);
  const home = base || './';
  const only = o.only ? new Set(o.only) : null;
  const assets = assetTags({ min: !!o.min, only });
  const current = o.current || '';
  let missing = 0;
  let html = read(path.join(SRC, 'shell.html'));

  html = html.replace(/^([ \t]*)<!-- @css -->/m, (_, ind) => assets.css.map(t => ind + t).join('\n'));
  html = html.replace(/^([ \t]*)<!-- @js -->/m, (_, ind) => assets.js.map(t => ind + t).join('\n'));
  html = html.replace(/^\{\{content\}\}$/m, () => o.content || '');
  // partial markers (shell footer + the ones inside content)
  html = html.replace(/^([ \t]*)<!-- @section:([a-z0-9-]+) -->/gm, (_, ind, name) => {
    if (only && !only.has(name)) return '';
    const p = [path.join(GENERATED, name + '.html'), path.join(SRC, name + '.html')].find(f => fs.existsSync(f));
    if (!p) { missing++; console.error(`MISSING partial: src/generated/${name}.html or src/${name}.html`); return `${ind}<!-- MISSING SECTION ${name} -->`; }
    const body = read(p).replace(/\s+$/, '');
    return body.split('\n').map(l => (l.trim() ? ind + l : l)).join('\n');
  });

  let ld = '';
  if (o.jsonld) ld = typeof o.jsonld === 'string' ? o.jsonld : [].concat(o.jsonld).map(ldScript).join('\n');
  const canonical = o.canonical || abs(cfg, o.path || '');
  const vals = {
    base, home, current, site_url: cfg.url,
    title: esc(o.title || cfg.name), description: esc(o.description || cfg.tagline),
    canonical, og_image: o.og_image || abs(cfg, cfg.og_image), og_type: o.og_type || 'website',
    jsonld: ld, extra_head: o.extra_head || '',
  };
  const fp = footerParts(base);
  vals.footer_services = fp.services; vals.footer_work = fp.work; vals.footer_note = fp.note;
  html = html.replace(/\{\{aria:([a-z-]+)\}\}/g, (_, k) => (k === current ? ' aria-current="page"' : ''));
  html = html.replace(/\{\{(base|home|current|site_url|title|description|canonical|og_image|og_type|jsonld|extra_head|footer_services|footer_work|footer_note)\}\}/g, (_, k) => vals[k]);
  const left = html.match(/\{\{[^}]+\}\}/g);
  if (left) { console.error('UNRESOLVED TOKENS:', [...new Set(left)].join(' ')); missing++; }
  return { html, missing, info: assets.info };
}

/* ---------- the HOME page ---------- */
function homePage(cfg) {
  const metaFile = path.join(GENERATED, 'home.page.json');
  const m = fs.existsSync(metaFile) ? JSON.parse(read(metaFile)) : {};
  const contentFile = path.join(GENERATED, 'home.content.html');
  const content = fs.existsSync(contentFile) ? read(contentFile).replace(/\s+$/, '') : '';
  const jsonld = m.jsonld || { '@context': 'https://schema.org', '@graph': [
    websiteNode(cfg),
    { '@type': 'ProfilePage', '@id': abs(cfg, '#profilepage'), url: cfg.url, name: m.title || cfg.name, mainEntity: { '@id': abs(cfg, '#person') }, isPartOf: { '@id': abs(cfg, '#website') } },
    personNode(cfg),
    breadcrumb(cfg, [{ name: 'Home', path: '' }]),
  ] };
  return { depth: 0, path: '', current: 'home', title: m.title, description: m.description, og_image: m.og_image, jsonld, extra_head: m.extra_head || '', content, cfg };
}

/* ---------- pipeline (CLI) ---------- */
// Strings that must never appear anywhere in the shipped files (html / js / json / md / xml / txt, excluding node_modules).
const FORBIDDEN = ['Pune', '9.62', 'CGPA', 'prasannapatil', 'prasanna4149/', 'LangGraph', 'Plain HTML', 'No frameworks', 'Exploring', 'display_year'];
const LANGUAGE_WORD = 'Marathi';   // the spoken-language list appears ONCE: in the home page whoami card
const GUARD_EXT = new Set(['.html', '.js', '.json', '.md', '.xml', '.txt']);
const GUARD_SKIP = new Set(['node_modules', '.git']);

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (GUARD_SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (GUARD_EXT.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

function guard() {
  const problems = [];
  const files = walk(SITE);
  let marathi = 0, marathiPages = 0, htmlPages = 0;
  const pageFiles = [];
  for (const f of files) {
    const rel = path.relative(SITE, f).split(path.sep).join('/');
    const txt = read(f);
    for (const w of FORBIDDEN) if (txt.includes(w)) problems.push(`"${w}" in ${rel}`);
    const isPage = rel === 'index.html' || (/\/index\.html$/.test(rel) && !rel.startsWith('src/') && !rel.startsWith('assets/'));
    if (isPage) { pageFiles.push(rel); htmlPages++; }
    const n = txt.split(LANGUAGE_WORD).length - 1;
    if (n) {
      if (isPage) { marathi += n; marathiPages++; } else if (rel !== 'src/generated/home-about.html' && rel !== 'content/content.json') problems.push(`"${LANGUAGE_WORD}" in ${rel}`);
    }
  }
  if (marathi !== 1) problems.push(`"${LANGUAGE_WORD}" occurs ${marathi}x across ${htmlPages} built pages (want exactly 1, in index.html)`);
  return { problems, scanned: files.length, pages: htmlPages };
}

/** every relative href/src must resolve to a file, and every #fragment to an id on the target page */
function checkLinks(pages) {
  const problems = [];
  let n = 0;
  const cache = new Map();
  const html = f => { if (!cache.has(f)) cache.set(f, fs.existsSync(f) ? read(f) : null); return cache.get(f); };
  const resolve = (fromFile, u) => { let f = path.join(path.dirname(fromFile), u); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); return f; };
  for (const rel of pages) {
    const file = path.join(SITE, rel);
    const h = html(file);
    for (const m of h.matchAll(/(?:href|src)="([^"#?]+)(?:\?[^"#]*)?(#[^"]*)?"/g)) {
      if (/^(https?:|mailto:|tel:|data:|javascript:|\/\/)/.test(m[1])) continue;
      n++;
      if (!fs.existsSync(resolve(file, m[1]))) problems.push(`${rel}: broken link ${m[1]}`);
    }
    for (const m of h.matchAll(/href="([^"#?]*)#([^"]+)"/g)) {
      const target = m[1] ? resolve(file, m[1]) : file;
      const t = html(target);
      if (t && !t.includes(`id="${m[2]}"`)) problems.push(`${rel}: no anchor #${m[2]} in ${m[1] || rel}`);
    }
  }
  return { problems: [...new Set(problems)], links: n };
}

function runTool(label, script, extra = []) {
  const file = path.join(SITE, 'tools', script);
  const r = spawnSync(process.execPath, [file, ...extra], { cwd: SITE, encoding: 'utf8', env: { ...process.env, PF_SITE: SITE } });
  const out = ((r.stdout || '') + (r.stderr || '')).trim();
  if (r.status !== 0) {
    console.error(`  x ${label} FAILED (exit ${r.status})\n${out.split('\n').map(l => '      ' + l).join('\n')}`);
    process.exit(r.status || 1);
  }
  const last = out.split('\n').filter(Boolean).slice(-1)[0] || '';
  console.log(`  ok ${label}${last ? ' - ' + last.replace(SITE.replace(/\\/g, '/'), '.') : ''}`);
  return out;
}

function pipeline(args) {
  const t0 = Date.now();
  const min = !!args.min;
  console.log(`build ${min ? '--min (minified assets)' : '(readable assets)'} in ${SITE.replace(/\\/g, '/')}`);
  if (!fs.existsSync(CONTENT_FILE)) { console.error('missing content/content.json'); process.exit(2); }

  if (!args['skip-gen']) {
    console.log('1/4 generators');
    runTool('hero partial         tools/hero/gen.mjs', 'hero/gen.mjs');
    runTool('home partials        tools/home/gen.mjs', 'home/gen.mjs');
    runTool('script data (fx.js)  tools/fx/gen.mjs', 'fx/gen.mjs');
    runTool('project selector     tools/selector/gen.mjs', 'selector/gen.mjs');
  } else console.log('1/4 generators skipped (--skip-gen)');

  console.log('2/4 assemble index.html');
  const cfg = loadConfig();
  const home = renderPage({ ...homePage(cfg), min });
  fs.writeFileSync(path.join(SITE, 'index.html'), home.html);
  console.log(`  ok index.html ${(home.html.length / 1024).toFixed(1)} KB | missing partials/tokens: ${home.missing}${home.info}`);
  if (home.missing) process.exit(1);

  console.log('3/4 pages, sitemap.xml, llms.txt, robots.txt');
  runTool('pages + seo files    tools/pages/build-pages.mjs', 'pages/build-pages.mjs', min ? ['--min'] : []);

  console.log('4/4 guard');
  const g = guard();
  const manifest = JSON.parse(read(path.join(SITE, '.built-pages.json')));
  const count = re => manifest.filter(p => re.test(p)).length;
  const sel = JSON.parse(read(path.join(SITE, 'projects.config.json')));
  const base = cfg.url;
  const lk = checkLinks(['index.html', ...manifest.map(p => p + 'index.html')]);
  g.problems.push(...lk.problems);
  if (g.problems.length) {
    console.error(`  x guard found ${g.problems.length} problem(s):\n${g.problems.map(p => '      ' + p).join('\n')}`);
  } else console.log(`  ok ${g.scanned} text files scanned, ${g.pages} built pages: no forbidden strings, languages shown once, ${lk.links} internal links and anchors resolve`);

  console.log('\nsummary');
  console.log(`  base URL        ${base}   (content/content.json -> seo.site_url)`);
  console.log(`  pages           ${manifest.length + 1} (home + ${manifest.length})`);
  console.log(`  services        ${count(/^services\/[^/]+\/$/)} service pages + hub`);
  console.log(`  case studies    ${count(/^projects\/[^/]+\/$/)} (projects.config.json: ${sel.casestudy.length} case studies, ${sel.show.length} selected)`);
  console.log(`  sitemap URLs    ${manifest.length + 1}`);
  console.log(`  took            ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  process.exit(g.problems.length ? 1 : 0);
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const args = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
  if (args.only) {   // development preview: one page with only the listed partials
    const only = String(args.only).split(',').map(s => s.trim()).filter(Boolean);
    const outName = args.out ? String(args.out) : '';
    if (!outName || outName === 'index.html') { console.error('--only needs --out=preview-<name>.html (it never overwrites index.html)'); process.exit(2); }
    const { html, missing, info } = renderPage({ ...homePage(loadConfig()), only, min: !!args.min });
    fs.writeFileSync(path.join(SITE, outName), html);
    console.log(`${outName} written: ${(html.length / 1024).toFixed(1)} KB | missing partials/tokens: ${missing}${info}`);
    process.exit(0);
  }
  pipeline(args);
}
