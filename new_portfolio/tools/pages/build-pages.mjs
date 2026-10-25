// build-pages.mjs - multi-page generator. Emits (into SITE = new_portfolio/):
//   projects/ projects/<slug>/ services/ services/<slug>/ about/ faq/ contact/ resume/  (folder/index.html clean URLs)
//   llms.txt llms-full.txt (site folder) and sitemap.xml + robots.txt (ONE copy: at the repo root; in the site folder only when the site is used standalone)
// Same chrome as the home page: renderPage() from ../../build.mjs (shell.html tokens). Data: content/content.json + projects.config.json (see data.mjs).
// build.mjs calls buildPages() in its own process (one esbuild pass for the whole site). Standalone use:
//   node tools/pages/build-pages.mjs            minified assets, like `node build.mjs`
//   node tools/pages/build-pages.mjs --dev      links the readable assets/css and assets/js files
//   node tools/pages/build-pages.mjs --check    build in memory with readable assets, run the checks, write nothing
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderPage } from '../../build.mjs';
import { SITE, esc } from '../lib.mjs';
import { findBanned, YEAR_RE } from '../rules.mjs';
import { cfg, abs, selection, caseStudies, words } from './data.mjs';
import * as pServices from './p-services.mjs';
import * as pProjects from './p-projects.mjs';
import * as pAbout from './p-about.mjs';
import * as pFaq from './p-faq.mjs';
import * as pContact from './p-contact.mjs';
import * as pResume from './p-resume.mjs';
import { sitemap, robots, llmsTxt, llmsFull, REPO_ROOT, IN_REPO, SITEMAP_URL } from './seo.mjs';
import { vcard, VCARD_PATH } from './vcard.mjs';

const MANIFEST = path.join(SITE, '.built-pages.json');   // pages written by the last run, so pages dropped from the selection get removed

export function buildPages({ min = true, check = false } = {}) {
  const records = [
    ...pServices.build(), ...pProjects.build(), ...pAbout.build(), ...pFaq.build(), ...pContact.build(), ...pResume.build(),
  ];

  /* ---------- render ---------- */
  let problems = 0;
  const warn = (page, msg) => { problems++; console.error(`  ! ${page || '(site)'}: ${msg}`); };

  for (const r of records) {
    const out = renderPage({ cfg, path: r.path, current: r.current, title: r.title, description: r.description, og_type: r.og_type, jsonld: r.jsonld, content: r.content, min });
    r.html = out.html;
    r.url = abs(cfg, r.path);
    if (out.missing) warn(r.path, 'renderPage reported missing partials/tokens');
    if (r.title.length > 60) warn(r.path, `page title (og:title) ${r.title.length} > 60`);
    if (!out.html.includes(`<title>${esc(cfg.tab_title)}</title>`)) warn(r.path, 'the <title> is not the constant seo.tab_title');
    if (r.description.length > 155) warn(r.path, `description ${r.description.length} > 155`);
    const h1s = (out.html.match(/<h1[\s>]/g) || []).length;
    if (h1s !== 1) warn(r.path, `${h1s} h1 elements`);
    const bad = findBanned(out.html, { languages: r.path !== 'about/' });   // the spoken languages appear on the About page only
    if (bad) warn(r.path, `banned string "${bad}"`);
    // visible text must not carry a year on project pages / hubs
    if (/^projects\//.test(r.path)) {
      const txt = out.html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>|<footer[\s\S]*?<\/footer>/g, '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
      const y = txt.match(YEAR_RE);
      if (y) warn(r.path, `year "${y[0]}" in visible text`);
      if (/"(?:datePublished|dateModified|copyrightYear)"/.test(out.html)) warn(r.path, 'date field in JSON-LD');
    }
    const answer = out.html.match(/<p class="pg-answer" data-answer>([\s\S]*?)<\/p>/);
    if (answer && /^(services|faq)\//.test(r.path)) {
      const n = words(answer[1].replace(/<[^>]+>/g, ''));
      if (n < 40 || n > 60) warn(r.path, `direct answer is ${n} words (want 40-60)`);
    }
  }
  const seen = new Map();
  for (const r of records) for (const [k, v] of [['title', r.title], ['description', r.description]]) {
    const key = k + '|' + v; if (seen.has(key)) warn(r.path, `duplicate ${k} with ${seen.get(key)}`); else seen.set(key, r.path);
  }

  /* ---------- the browser-tab title: one constant string (content.seo.tab_title) on every page, the repo-root redirect and 404 pages included ---------- */
  if (cfg.tab_title.length > 60) warn('(site)', `seo.tab_title is ${cfg.tab_title.length} characters (max 60)`);
  for (const f of ['index.html', '404.html']) {   // a file that is not there is skipped; the root 404.html is also what .github/scripts/stage-site.mjs publishes in deploy-root mode
    const file = path.join(REPO_ROOT, f);
    if (!fs.existsSync(file)) continue;
    const m = fs.readFileSync(file, 'utf8').match(/<title>([\s\S]*?)<\/title>/);
    if (!m || m[1] !== esc(cfg.tab_title)) warn(f, `the <title> of the repo-root ${f} is ${m ? `"${m[1]}"` : 'missing'} but must be "${esc(cfg.tab_title)}" (content.json seo.tab_title)`);
  }

  /* ---------- seo files ---------- */
  const paths = records.map(r => r.path);
  const llmsRecs = records.map(r => ({ path: r.path, ...r.llms, url: r.url }));
  const seoDir = IN_REPO ? REPO_ROOT : SITE;   // sitemap.xml + robots.txt: one copy, at the repo root when the site lives inside the repo
  const files = {
    [path.join(seoDir, 'sitemap.xml')]: sitemap(paths),
    [path.join(seoDir, 'robots.txt')]: robots(SITEMAP_URL),
    [path.join(SITE, 'llms.txt')]: llmsTxt(llmsRecs),
    [path.join(SITE, 'llms-full.txt')]: llmsFull(llmsRecs),
    [path.join(SITE, VCARD_PATH)]: vcard(),   // the contact card the "Save my contact" link on /contact/ downloads
  };
  for (const [f, txt] of Object.entries(files)) {
    if (/llms/.test(f)) {
      if (YEAR_RE.test(txt)) warn(path.basename(f), 'contains a year');
      const bad = findBanned(txt, { languages: true });
      if (bad) warn(path.basename(f), `banned string "${bad}"`);
    }
  }

  /* ---------- write ---------- */
  if (!check) {
    for (const r of records) {
      const dir = path.join(SITE, r.path);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'index.html'), r.html);
    }
    for (const [f, txt] of Object.entries(files)) fs.writeFileSync(f, txt);
    // remove pages that an earlier run emitted but the current selection no longer has
    let prev = [];
    try { prev = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch { /* first run */ }
    for (const p of prev.filter(p => !paths.includes(p))) {
      const f = path.join(SITE, p, 'index.html');
      if (fs.existsSync(f)) { fs.rmSync(f); try { fs.rmdirSync(path.dirname(f)); } catch { /* not empty */ } console.log('  removed stale page', p); }
    }
    fs.writeFileSync(MANIFEST, JSON.stringify(paths, null, 1));
  }

  const kb = records.reduce((n, r) => n + r.html.length, 0) / 1024;
  const summary = `${check ? 'checked' : 'wrote'} ${records.length} pages (${kb.toFixed(0)} KB) + sitemap/robots/llms | selection: projects.config.json (${selection.show.length} selected, ${caseStudies.length} case studies, ${selection.personal.length} personal) | ${min ? 'min assets' : 'readable assets'} | ${problems} problem(s)`;
  return { paths, problems, summary };
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const args = new Set(process.argv.slice(2));
  const check = args.has('--check');
  const r = buildPages({ min: !check && !args.has('--dev'), check });   // --check writes nothing, so it never writes assets/dist either
  console.log(r.summary);
  process.exit(r.problems ? 1 : 0);
}
