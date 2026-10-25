// Build script for the whole site. ONE file, two uses:
//
//   node build.mjs           the production build (what you deploy; same as --min). Needs esbuild (npm i); it stops before touching anything if esbuild is missing.
//                            1. generators  tools/hero, tools/home, tools/fx (partials + script data from content/content.json)
//                            2. assemble    index.html (the HOME page) from src/shell.html + src/generated/home.content.html + the partials
//                            3. pages       tools/pages/build-pages.mjs: services/, projects/, about/, faq/, contact/, resume/ + sitemap.xml, robots.txt, llms.txt, llms-full.txt
//                            4. guard       scans the output for forbidden strings, checks every link and anchor, enforces the keyword map (content/keywords.json, tools/pages/keywords.mjs), prints a summary
//   node build.mjs --dev     the same, but every page links the readable assets/css + assets/js files (no esbuild, no hash). The pages are the deployed files,
//                            so run the default build again before you commit.
//   node build.mjs --skip-gen            skip step 1 (partials already generated)
//   node build.mjs --only=hero,home-faq --out=preview-x.html     assemble ONE preview file with only those partials (development; delete it afterwards)
//   npm test                 builds a copy in a temp folder and checks it (tools/test.mjs); changes nothing in the repo
//
//   module   import { renderPage, loadConfig, ... } from './build.mjs'   -> the page generators render every other page with the SAME shell
//
// SITE is the folder that holds this file (override with PF_SITE). Paths live in tools/lib.mjs, the banned words in tools/rules.mjs, the project selection in tools/selection.mjs.
//
// Shell = src/shell.html (head, header, drawer, <main>{{content}}</main>, footer partial, sprite, scripts).
//   <!-- @css -->            -> <link> for assets/css/base.css + assets/css/sections/*.css (or the minified bundle)
//   <!-- @js -->             -> <script defer> for assets/js/core.js + sections/*.js (or the minified files)
//   <!-- @section:NAME -->   -> contents of src/generated/NAME.html (or src/NAME.html for the hand-written footer) (also expanded inside the {{content}} you pass)
//   {{base}} {{home}} {{title}} {{description}} {{canonical}} {{og_image}} {{og_type}} {{jsonld}} {{content}} {{current}} {{aria:NAME}} {{site_url}} {{footer_*}}
// Home page = src/generated/home.content.html (the section markers) + src/generated/home.page.json (title / description / JSON-LD), both written by tools/home/gen.mjs.
// Hand-written source in src/: shell.html, footer.html, site.config.json. Everything in src/generated/ is rebuilt on every run.
// Site-wide facts live in src/site.config.json and content/content.json; the ONE base-URL value is content.seo.site_url (change it, rebuild, done).
//
// Why one CSS bundle but one script PER FILE: a single 200 KB script is one long main-thread task (Lighthouse TBT gets worse), while
// separate deferred scripts are parsed/compiled in small slices; for CSS the opposite holds (fewer requests, no render-blocking chain).
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { SITE, SRC, GENERATED, CONTENT_FILE, read, readContent, esc, icon } from './tools/lib.mjs';
import { loadSelection } from './tools/selection.mjs';
import { NEVER_RE, LANGUAGE_SENTINEL, pageProblems } from './tools/rules.mjs';
import { loadKeywords, keywordProblems } from './tools/pages/keywords.mjs';

const list = (dir, ext) => fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith(ext)).sort() : [];
const stem = f => f.replace(/\.[^.]+$/, '');
const rel = (...p) => path.relative(SITE, path.join(...p)).split(path.sep).join('/');

/* ---------- site config (the ONE place the base URL lives: content.seo.site_url) ---------- */
let configCache = null;
export function loadConfig() {
  if (configCache) return configCache;
  const cfg = JSON.parse(read(path.join(SRC, 'site.config.json')));
  const content = readContent();
  const seo = content.seo || {};
  // ONE flag moves the whole site to the root of /Portfolio/: seo.deploy_root = true (or PF_DEPLOY_ROOT=1, which the GitHub Actions workflow sets) makes
  // seo.site_root_url the base URL instead of seo.site_url, and sitemap.xml / robots.txt are written inside new_portfolio/ (README: "Serve the site at the root")
  cfg.deployRoot = seo.deploy_root === true || process.env.PF_DEPLOY_ROOT === '1';
  const url = cfg.deployRoot ? seo.site_root_url : seo.site_url;
  if (!url) throw new Error(cfg.deployRoot ? 'content/content.json has no seo.site_root_url (needed when deploy_root is on)' : 'content/content.json has no seo.site_url (the one base-URL value)');
  cfg.url =String(url).replace(/\/*$/, '/');   // always one trailing slash
  // the ONE entity sentence (content.seo.entity) is the Person description everywhere: home JSON-LD, /about/ JSON-LD, llms.txt
  const entity = content.seo && content.seo.entity;
  if (!entity) throw new Error('content/content.json has no seo.entity (the one entity sentence)');
  cfg.person = { ...cfg.person, description: entity };
  // contact facts come from content.profile only (footer, JSON-LD, contact page and the scripts all read them from here)
  const { email, links } = content.profile;
  cfg.email = email;
  cfg.sameAs = [links.github, links.linkedin, links.instagram];
  return (configCache = cfg);
}
export const abs = (cfg, p = '') => cfg.url + String(p).replace(/^\.?\//, '');

/* ---------- json-ld helpers ---------- */
const ldScript = obj => `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2).replace(/</g, '\\u003c')}\n</script>`;
export function breadcrumb(cfg, items) {   // items: [{ name, path }] from Home down to the page
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(cfg, it.path || '') })),
  };
}
export function personNode(cfg) {
  const p = cfg.person;
  return {
    '@type': 'Person', '@id': abs(cfg, '#person'), name: cfg.name, url: cfg.url, image: abs(cfg, cfg.portrait_image || cfg.og_image),
    jobTitle: p.jobTitle, description: p.description, email: 'mailto:' + cfg.email,
    worksFor: { '@type': 'Organization', name: p.employer },
    address: { '@type': 'PostalAddress', addressLocality: p.city, addressCountry: p.countryCode },
    alumniOf: { '@type': 'CollegeOrUniversity', name: p.alumniOf },
    knowsAbout: p.knowsAbout, sameAs: cfg.sameAs,
  };
}
export function websiteNode(cfg) {
  return { '@type': 'WebSite', '@id': abs(cfg, '#website'), url: cfg.url, name: cfg.name, description: cfg.tagline, publisher: { '@id': abs(cfg, '#person') } };
}

/* ---------- esbuild (the default build needs it; --dev does not) ---------- */
let esbuild = null;
function loadEsbuild() {
  if (esbuild) return esbuild;
  const candidates = [
    () => createRequire(path.join(SITE, 'package.json'))('esbuild'),
    () => createRequire(import.meta.url)('esbuild'),
  ];
  for (const c of candidates) { try { return (esbuild = c()); } catch { /* try next */ } }
  console.error('esbuild not found: run  npm i  (only the minified build needs it), or build with  node build.mjs --dev');
  process.exit(3);
}
/* a relative url(...) in a CSS file must keep pointing at the same file once the CSS lives in another folder */
function rebaseUrls(css, fromDir, toDir) {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, u) => {
    if (/^(data:|https?:|\/\/|\/|#)/i.test(u)) return m;
    const r = path.relative(toDir, path.resolve(fromDir, u)).split(path.sep).join('/');
    return `url(${q}${r}${q})`;
  });
}

/* ---------- asset tags (hrefs carry {{base}}; computed once per process, so the in-process page build reuses the home build's minified files) ----------
   Page-aware bundles: the home page loads everything except pages.css (the inner-pages styles, prefix pg-) and the portrait unless its markup is there. Every other page ("inner") skips the
   home-only hero + home styles and scripts, and loads visuals (the generative project art, 81 KB of script), the project collage script and the contact styles + form
   script (contact.css, contact-form.js) only when its own markup has them. The neon portrait (portrait.css, portrait.js) loads on any page whose markup has it (the About page). The floating "Let's talk" button is in footer.css and contact.js on every page.
   The minified build writes one CSS bundle per variant (site.min.css for home, site.inner[-portrait].min.css for every other page) and one minified script per file. */
const hash8 = s => createHash('sha1').update(s).digest('hex').slice(0, 8);
const assetCache = new Map();
const jsMinCache = new Map();
function assetTags({ min = false, only = null, inner = false, flags = {} } = {}) {
  const variant = (inner ? 'inner' : 'home') + (flags.visuals ? '-visuals' : '') + (flags.portrait ? '-portrait' : '') + (flags.contact ? '-contact' : '') + (flags.collage ? '-collage' : '');   // cache key: also decides which scripts load
  const cssVariant = [inner && 'inner', flags.portrait && 'portrait'].filter(Boolean).join('-');   // stylesheet name: the visuals, collage and contact styles are always in it
  const key = (min ? 'min' : 'src') + '|' + (only ? [...only].sort().join(',') : variant);
  if (assetCache.has(key)) return assetCache.get(key);
  const wanted = (f, isCss) => {
    const s = stem(f);
    if (only) return only.has(s);
    if (s === 'portrait') return !!flags.portrait;           // the neon portrait (About page): only where the markup has it
    if (!inner) return !(isCss && s === 'pages') && s !== 'contact-form';   // the home page has no pg- markup (it skips pages.css) and no form (the form is on /contact/)
    if (s === 'hero' || s === 'home' || s === 'marquee') return false;   // the home page only (the tech stack ribbon is marquee)
    if (s === 'visuals') return isCss || !!flags.visuals;       // visuals.css rides in the one shared inner stylesheet (a visitor keeps one cached file across pages); its script loads only where the markup is
    if (s === 'collage') return isCss || !!flags.collage;       // collage.css (the project tiles, home and /projects/) is in the shared inner stylesheet too; a script, if there is one, loads only where the markup is
    if (isCss ? s === 'contact' : s === 'contact-form') return isCss || !!flags.contact;   // contact.css (channel rows, CTA band, form) is in the shared inner stylesheet too; contact-form.js: /contact/ only; contact.js (copy buttons, floating button) is everywhere
    return true;
  };
  const cssFiles = [path.join(SITE, 'assets/css/base.css')], jsFiles = [path.join(SITE, 'assets/js/core.js')];
  for (const f of list(path.join(SITE, 'assets/css/sections'), '.css').filter(f => wanted(f, true))) cssFiles.push(path.join(SITE, 'assets/css/sections', f));
  for (const f of list(path.join(SITE, 'assets/js/sections'), '.js').filter(f => wanted(f, false))) jsFiles.push(path.join(SITE, 'assets/js/sections', f));
  let css, js, info = '';
  if (!min) {
    css = cssFiles.map(f => `<link rel="stylesheet" href="{{base}}${rel(f)}">`);
    js = jsFiles.map(f => `<script defer src="{{base}}${rel(f)}"></script>`);
  } else {
    const { transformSync } = loadEsbuild();
    const dist = path.join(SITE, 'assets/dist');
    fs.mkdirSync(path.join(dist, 'js'), { recursive: true });
    // CSS: concatenate in link order (base.css = @layer pf first, section CSS un-layered after it), rebase url(), minify once per bundle
    const cssAll = cssFiles.map(f => rebaseUrls(read(f), path.dirname(f), dist)).join('\n');
    const cssOut = transformSync(cssAll, { loader: 'css', minify: true, target: 'chrome100', legalComments: 'none' });
    if (cssOut.warnings && cssOut.warnings.length) console.warn('css warnings:', cssOut.warnings.map(w => w.text).slice(0, 5));
    const cssName = `site${cssVariant ? '.' + cssVariant : ''}.min.css`;
    fs.writeFileSync(path.join(dist, cssName), cssOut.code);
    // ?v=<content hash>: a changed file gets a new address, so a visitor can never mix new HTML with an old cached file (GitHub Pages cannot send long cache headers)
    css = [`<link rel="stylesheet" href="{{base}}assets/dist/${cssName}?v=${hash8(cssOut.code)}">`];
    // JS: each file minified on its own (never one big script), same load order, all deferred; one minified file is shared by every page that lists it
    js = [];
    let jsBytes = 0, jsRaw = 0;
    for (const f of jsFiles) {
      const name = stem(path.basename(f));
      const src = read(f);
      if (!jsMinCache.has(f)) {
        const out = transformSync(src, { loader: 'js', minify: true, target: 'es2018', legalComments: 'none' });
        fs.writeFileSync(path.join(dist, 'js', name + '.min.js'), out.code);
        jsMinCache.set(f, { len: out.code.length, v: hash8(out.code) });
      }
      js.push(`<script defer src="{{base}}assets/dist/js/${name}.min.js?v=${jsMinCache.get(f).v}"></script>`);
      jsBytes += jsMinCache.get(f).len; jsRaw += src.length;
    }
    info = ` | min ${variant}: css ${(cssAll.length / 1024).toFixed(0)}->${(cssOut.code.length / 1024).toFixed(0)} KB, js ${(jsRaw / 1024).toFixed(0)}->${(jsBytes / 1024).toFixed(0)} KB`;
  }
  const r = { css, js, info };
  assetCache.set(key, r);
  return r;
}

/* ---------- footer lists (generated from content, so the footer can never link a page that does not exist) ---------- */
let footerCache = null;
function footerData() {
  if (footerCache) return footerCache;
  const c = readContent(), sel = loadSelection(c), cfg = loadConfig(), kw = loadKeywords();
  const byId = Object.fromEntries(c.projects.map(p => [p.id, p]));
  const social = [['GitHub', c.profile.links.github, 'github'], ['LinkedIn', c.profile.links.linkedin, 'linkedin'], ['Instagram', c.profile.links.instagram, 'instagram']];
  return (footerCache = {
    // link texts come from the approved anchors in content/keywords.json (the footer variant), with the plain name as the fallback
    services: c.services.map(s => ({ slug: s.page_slug || s.slug, label: ((kw.pages[`services/${s.page_slug || s.slug}/`] || {}).anchors || {}).footer || s.nav_label })),
    work: sel.footerWork.map(id => ({ slug: byId[id].slug, label: ((kw.pages[`projects/${byId[id].slug}/`] || {}).anchors || {}).footer || byId[id].title })),
    social: [...social.map(([label, href, ic]) => `<li><a class="icon-btn" href="${esc(href)}" target="_blank" rel="noopener noreferrer" aria-label="${label} (opens in a new tab)">${icon(ic)}</a></li>`),
      `<li><a class="icon-btn" href="mailto:${esc(cfg.email)}" aria-label="Email ${esc(cfg.name.split(' ')[0])}">${icon('mail')}</a></li>`],
    note: esc(((c.site && c.site.footer && c.site.footer.note) || '').replace(/\.$/, '')),
  });
}
function footerParts(base) {
  const f = footerData(), NL = '\n', ind = '            ';
  return {
    services: f.services.map(s => `<li><a href="${base}services/${s.slug}/">${esc(s.label)}</a></li>`).join(NL + ind),
    work: f.work.map(p => `<li><a href="${base}projects/${p.slug}/">${esc(p.label)}</a></li>`).concat(`<li><a href="${base}projects/">All projects</a></li>`).join(NL + ind),
    social: f.social.join(NL + ind.slice(2)),
    note: f.note,
  };
}

/* the heading font draws "AI" like "Al": inside h1-h6 every standalone AI gets class "ai" (slab-serif font, see base.css). Text nodes only, never tags, scripts or svg. */
function markAI(html) {
  let depth = 0, skip = 0;
  return html.split(/(<[^>]+>)/).map(part => {
    if (part[0] === '<') {
      const m = /^<(\/?)([a-zA-Z][a-zA-Z0-9]*)/.exec(part);
      if (m) {
        const closing = m[1] === '/', tag = m[2].toLowerCase();
        if (/^h[1-6]$/.test(tag)) depth = Math.max(0, depth + (closing ? -1 : 1));
        else if (/^(script|style|svg|title|textarea)$/.test(tag)) skip = Math.max(0, skip + (closing ? -1 : 1));
      }
      return part;
    }
    return depth && !skip ? part.replace(/\bAI\b/g, '<span class="ai">AI</span>') : part;
  }).join('');
}

/* the inline icon sprite holds every symbol; each page keeps only the ones its markup uses plus the ones a script can insert later
   (a script mentions an icon name as a quoted word or as #i-name). Saves about 3 KB per page and 60 or more DOM nodes. */
let runtimeJs = null;
function runtimeScripts() {
  if (runtimeJs !== null) return runtimeJs;
  runtimeJs = '';
  const walkJs = d => { for (const e of fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'dist') walkJs(p); } else if (e.name.endsWith('.js')) runtimeJs += read(p) + '\n'; } };
  walkJs(path.join(SITE, 'assets/js'));
  return runtimeJs;
}
function pruneSprite(html) {
  const js = runtimeScripts();
  const m = html.match(/<svg class="sprite"[\s\S]*?<\/svg>/);
  if (!m) return html;
  const body = html.replace(m[0], '');
  const used = new Set([...body.matchAll(/#i-([a-z0-9-]+)/g)].map(x => x[1]));
  const sprite = m[0].replace(/[ \t]*<symbol id="i-([a-z0-9-]+)"[\s\S]*?<\/symbol>\r?\n?/g, (all, n) => (used.has(n) || js.includes("'" + n + "'") || js.includes('"' + n + '"') || js.includes('#i-' + n)) ? all : '');
  return html.replace(m[0], () => sprite);
}

/* ---------- the shared page renderer ---------- */
/**
 * renderPage({ path, title, description, og_type?, jsonld?, content, current, min?, only?, cfg? }) -> { html, missing, info }
 *   path         page path relative to the site root ('' home, 'projects/', 'projects/observable-ai-backend/'); {{base}} is '../' once per folder, canonical = url + path
 *   jsonld       an object, an array of objects, or ready-made <script> markup; objects are emitted as <script type="application/ld+json">
 *   content      the inner HTML of <main id="main">; may contain <!-- @section:name --> markers and {{base}}
 *   current      nav key: projects | services | about | resume | faq | contact (home and anything else light no nav item)
 */
export function renderPage(o = {}) {
  const cfg = o.cfg || loadConfig();
  const pagePath = String(o.path || '');
  const base = '../'.repeat(pagePath.split('/').filter(Boolean).length);
  const home = base || './';
  const only = o.only ? new Set(o.only) : null;
  // the home page (path '') gets every script and style; any other page skips the home-only ones and loads visuals / portrait only when it uses them
  const flags = { visuals: /data-visual=/.test(o.content || ''), portrait: /class="np[ "_]/.test(o.content || ''), collage: /class="collage[ "]/.test(o.content || ''), contact: /contact__/.test(o.content || '') };
  const assets = assetTags({ min: !!o.min, only, inner: pagePath !== '', flags });
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

  const ld = !o.jsonld ? '' : typeof o.jsonld === 'string' ? o.jsonld : [].concat(o.jsonld).map(ldScript).join('\n');
  const fp = footerParts(base);
  const vals = {
    base, home, current, site_url: cfg.url,
    title: esc(o.title || cfg.name), description: esc(o.description || cfg.tagline),
    canonical: abs(cfg, pagePath), og_image: abs(cfg, cfg.og_image), og_type: o.og_type || 'website',
    jsonld: ld, footer_services: fp.services, footer_work: fp.work, footer_social: fp.social, footer_note: fp.note,
  };
  html = html.replace(/\{\{aria:([a-z-]+)\}\}/g, (_, k) => (k === current ? ' aria-current="page"' : ''));
  html = html.replace(/\{\{(base|home|current|site_url|title|description|canonical|og_image|og_type|jsonld|footer_services|footer_work|footer_social|footer_note)\}\}/g, (_, k) => vals[k]);
  html = pruneSprite(markAI(html));
  const left = html.match(/\{\{[^}]+\}\}/g);
  if (left) { console.error('UNRESOLVED TOKENS:', [...new Set(left)].join(' ')); missing++; }
  return { html, missing, info: assets.info };
}

/* ---------- the HOME page ---------- */
function homePage(cfg) {
  const meta = JSON.parse(read(path.join(GENERATED, 'home.page.json')));   // title, description, jsonld (tools/home/gen.mjs)
  const content = read(path.join(GENERATED, 'home.content.html')).replace(/\s+$/, '');
  return { path: '', current: 'home', title: meta.title, description: meta.description, jsonld: meta.jsonld, content, cfg };
}

/* ---------- guard ---------- */
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

/** forbidden strings (tools/rules.mjs) in every text file; in every built page and llms file also no tallies, shortcut hints or closed <details>;
 *  the spoken languages exactly once (home page); no readable-asset links unless --dev */
export function guard({ dev = false } = {}) {
  const problems = [];
  const files = walk(SITE);
  let marathi = 0, htmlPages = 0;
  for (const f of files) {
    const r = path.relative(SITE, f).split(path.sep).join('/');
    const txt = read(f);
    const bad = NEVER_RE.exec(txt);
    if (bad) problems.push(`"${bad[0]}" in ${r}`);
    const isPage = r === 'index.html' || (/\/index\.html$/.test(r) && !r.startsWith('src/') && !r.startsWith('assets/'));
    if (isPage) {
      htmlPages++;
      if (!dev && /(?:href|src)="[^"]*assets\/(?:css|js)\//.test(txt)) problems.push(`${r} links the readable assets/css or assets/js files (run the default build, not --dev, before you deploy)`);
    }
    if (isPage || /^llms(-full)?\.txt$/.test(r)) problems.push(...pageProblems(r, txt));
    const n = txt.split(LANGUAGE_SENTINEL).length - 1;
    if (n) {
      if (isPage) marathi += n; else if (r !== 'src/generated/home-about.html' && r !== 'content/content.json') problems.push(`"${LANGUAGE_SENTINEL}" in ${r}`);
    }
  }
  if (marathi !== 1) problems.push(`"${LANGUAGE_SENTINEL}" occurs ${marathi}x across ${htmlPages} built pages (want exactly 1, in index.html)`);
  return { problems, scanned: files.length, pages: htmlPages };
}

/** every relative href/src must resolve to a file, and every #fragment (also behind a ?query, like contact/?topic=x#hire) to an id on the target page */
export function checkLinks(pages) {
  const problems = [];
  let n = 0;
  const cache = new Map();
  const html = f => { if (!cache.has(f)) cache.set(f, fs.existsSync(f) ? read(f) : null); return cache.get(f); };
  const resolve = (fromFile, u) => { let f = path.join(path.dirname(fromFile), u); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); return f; };
  for (const r of pages) {
    const file = path.join(SITE, r);
    const h = html(file);
    for (const m of h.matchAll(/(?:href|src)="([^"#?]+)(?:\?[^"#]*)?(#[^"]*)?"/g)) {
      if (/^(https?:|mailto:|tel:|data:|javascript:|\/\/)/.test(m[1])) continue;
      n++;
      if (!fs.existsSync(resolve(file, m[1]))) problems.push(`${r}: broken link ${m[1]}`);
    }
    for (const m of h.matchAll(/href="([^"#?]*)(?:\?[^"#]*)?#([^"]+)"/g)) {
      const target = m[1] ? resolve(file, m[1]) : file;
      const t = html(target);
      if (t && !t.includes(`id="${m[2]}"`)) problems.push(`${r}: no anchor #${m[2]} in ${m[1] || r}`);
    }
  }
  return { problems: [...new Set(problems)], links: n };
}

/* ---------- pipeline (CLI) ---------- */
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

async function pipeline(args) {
  const t0 = Date.now();
  const dev = !!args.dev;
  const min = !dev;
  console.log(`build ${min ? '(minified assets)' : '--dev (readable assets: do not deploy these pages)'} in ${SITE.replace(/\\/g, '/')}`);
  if (!fs.existsSync(CONTENT_FILE)) { console.error('missing content/content.json'); process.exit(2); }
  if (min) {
    loadEsbuild();   // fail BEFORE anything is deleted
    fs.rmSync(path.join(SITE, 'assets/dist'), { recursive: true, force: true });   // every bundle is rewritten below, so no stale file survives
  }

  if (!args['skip-gen']) {
    console.log('1/4 generators');
    runTool('hero partial         tools/hero/gen.mjs', 'hero/gen.mjs');
    runTool('home partials        tools/home/gen.mjs', 'home/gen.mjs');
    runTool('script data (fx.js)  tools/fx/gen.mjs', 'fx/gen.mjs');
  } else console.log('1/4 generators skipped (--skip-gen)');

  console.log('2/4 assemble index.html');
  const cfg = loadConfig();
  const home = renderPage({ ...homePage(cfg), min });
  fs.writeFileSync(path.join(SITE, 'index.html'), home.html);
  console.log(`  ok index.html ${(home.html.length / 1024).toFixed(1)} KB | missing partials/tokens: ${home.missing}${home.info}`);
  if (home.missing) process.exit(1);

  console.log('3/4 pages, sitemap.xml, llms.txt, robots.txt');
  const { buildPages } = await import('./tools/pages/build-pages.mjs');   // in this process, so the minified files of step 2 are reused
  const built = buildPages({ min });
  console.log(`  ok pages + seo files    tools/pages/build-pages.mjs - ${built.summary}`);
  if (built.problems) process.exit(1);

  console.log('4/4 guard');
  const g = guard({ dev });
  const manifest = built.paths;
  const count = re => manifest.filter(p => re.test(p)).length;
  const lk = checkLinks(['index.html', ...manifest.map(p => p + 'index.html')]);
  g.problems.push(...lk.problems, ...keywordProblems({ paths: manifest }));
  if (g.problems.length) {
    console.error(`  x guard found ${g.problems.length} problem(s):\n${g.problems.map(p => '      ' + p).join('\n')}`);
  } else console.log(`  ok ${g.scanned} text files scanned, ${g.pages} built pages: no forbidden strings, languages shown once, ${lk.links} internal links and anchors resolve, keyword map holds (content/keywords.json)`);

  const sel = loadSelection();
  console.log('\nsummary');
  console.log(`  base URL        ${cfg.url}   (content/content.json -> ${cfg.deployRoot ? "seo.site_root_url, deploy_root is ON" : "seo.site_url"})`);
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
  if (args.only) {   // development preview: one page with only the listed partials (readable assets unless --min)
    const only = String(args.only).split(',').map(s => s.trim()).filter(Boolean);
    const outName = args.out ? String(args.out) : '';
    if (!outName || outName === 'index.html') { console.error('--only needs --out=preview-<name>.html (it never overwrites index.html)'); process.exit(2); }
    const { html, missing, info } = renderPage({ ...homePage(loadConfig()), only, min: !!args.min });
    fs.writeFileSync(path.join(SITE, outName), html);
    console.log(`${outName} written: ${(html.length / 1024).toFixed(1)} KB | missing partials/tokens: ${missing}${info}`);
    process.exit(0);
  }
  pipeline(args).catch(e => { console.error(e); process.exit(1); });   // not awaited at the top level: the page modules import this file back
}
