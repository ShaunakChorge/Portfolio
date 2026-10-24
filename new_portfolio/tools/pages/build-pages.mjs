// build-pages.mjs - multi-page generator. Emits (into SITE = new_portfolio/):
//   projects/ projects/<slug>/ services/ services/<slug>/ about/ faq/ contact/ resume/  (folder/index.html clean URLs)
//   llms.txt llms-full.txt (site folder) and sitemap.xml + robots.txt (ONE copy: at the repo root; in the site folder only when the site is used standalone)
// Same chrome as the home page: renderPage() from ../build.mjs (shell.html tokens). Data: content/content.json + new_portfolio/projects.config.json.
//   node build-pages.mjs            source css/js links (always current)
//   node build-pages.mjs --min      links assets/dist/* and (re)builds it, like `node build.mjs --min`
//   node build-pages.mjs --check    build in memory, run the checks, write nothing
import fs from 'node:fs';
import path from 'node:path';
import { renderPage, SITE } from '../../build.mjs';
import { cfg, abs, selectionSource, selection, services, caseStudies, moreProjects, showProjects, words } from './data.mjs';
import * as pServices from './p-services.mjs';
import * as pProjects from './p-projects.mjs';
import * as pAbout from './p-about.mjs';
import * as pFaq from './p-faq.mjs';
import * as pContact from './p-contact.mjs';
import * as pResume from './p-resume.mjs';
import { sitemap, robots, llmsTxt, llmsFull, noYears, REPO_ROOT, IN_REPO, SITEMAP_URL } from './seo.mjs';

const args = new Set(process.argv.slice(2));
const MIN = args.has('--min');
const CHECK = args.has('--check');
const MANIFEST = path.join(SITE, '.built-pages.json');   // pages written by the last run, so pages dropped from the selection get removed

const records = [
  ...pServices.build(), ...pProjects.build(), ...pAbout.build(), ...pFaq.build(), ...pContact.build(), ...pResume.build(),
];

/* ---------- render ---------- */
let problems = 0;
const warn = (page, msg) => { problems++; console.error(`  ! ${page || '(site)'}: ${msg}`); };
const BANNED = /\bPune\b|LangGraph|\b[Ee]xploring\b|prasannapatil|prasanna4149|Plain HTML|No frameworks|industry-level|Enterprise AI systems|\b(?:English|Hindi|Marathi|German|French)\b/;

for (const r of records) {
  const out = renderPage({ cfg, path: r.path, current: r.current, title: r.title, description: r.description, og_type: r.og_type, jsonld: r.jsonld, content: r.content, min: MIN });
  r.html = out.html;
  r.url = abs(cfg, r.path);
  if (out.missing) warn(r.path, 'renderPage reported missing partials/tokens');
  if (r.title.length > 60) warn(r.path, `title ${r.title.length} > 60`);
  if (r.description.length > 155) warn(r.path, `description ${r.description.length} > 155`);
  const h1s = (out.html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) warn(r.path, `${h1s} h1 elements`);
  const bad = out.html.match(BANNED);
  if (bad) warn(r.path, `banned string "${bad[0]}"`);
  // visible text must not carry a year on project pages / hubs (D3)
  if (/^projects\//.test(r.path)) {
    const txt = out.html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>|<footer[\s\S]*?<\/footer>/g, '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ');
    const y = txt.match(/\b(?:19|20)\d\d\b/);
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

/* ---------- seo files ---------- */
const paths = records.map(r => r.path);
const llmsRecs = records.map(r => ({ path: r.path, ...r.llms, url: r.url }));
const sm = sitemap(paths);
const seoDir = IN_REPO ? REPO_ROOT : SITE;   // sitemap.xml + robots.txt: one copy, at the repo root when the site lives inside the repo
const files = {
  [path.join(seoDir, 'sitemap.xml')]: sm,
  [path.join(seoDir, 'robots.txt')]: robots(SITEMAP_URL),
  [path.join(SITE, 'llms.txt')]: llmsTxt(llmsRecs),
  [path.join(SITE, 'llms-full.txt')]: llmsFull(llmsRecs),
};
for (const [f, txt] of Object.entries(files)) {
  if (/llms/.test(f)) {
    if (/\b(?:19|20)\d\d\b/.test(txt.replace(/\(graduated May 2026\)/g, ''))) warn(path.basename(f), 'contains a year');
    if (BANNED.test(txt)) warn(path.basename(f), `banned string "${txt.match(BANNED)[0]}"`);
  }
}

/* ---------- write ---------- */
if (!CHECK) {
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
console.log(`${CHECK ? 'checked' : 'wrote'} ${records.length} pages (${kb.toFixed(0)} KB) + sitemap/robots/llms | selection: ${selectionSource} (${selection.show.length} selected, ${caseStudies.length} case studies, ${moreProjects.length} more) | ${MIN ? 'min assets' : 'source assets'} | ${problems} problem(s)`);
process.exit(problems ? 1 : 0);
