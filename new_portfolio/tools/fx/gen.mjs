// Round 3: builds the compact DATA const for fx.js from content/content.json and injects it between
// /*@@DATA*/ and /*@@END*/ markers in SITE/assets/js/sections/fx.js.   node tools/<name>/gen.mjs
// Directives applied here: D1 (no other person's links; collaborators are plain-text names), D2 (Mumbai, AI Engineer at Claptek Pvt Ltd),
// D3 (no project year anywhere in the data), D4 (no spoken-language list), D5 (no "systems shipped" stat), D6 (two stack tiers, no "exploring"),
// D9/D11 (every palette / terminal target is a real page of the site).
import fs from 'node:fs';
import { SITE, CONTENT_FILE } from '../paths.mjs';
const c = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
const p = c.profile;
const sel = c.selection_default;

const fix = (t) => String(t || '').replace(/\bR2\b/g, 'R²').replace(/plain-English/g, 'plain-language');   // R-squared as on the page; D4 keeps the word English out of every script (it is a phrase, not a language list)
const person = (names) => (names || []).filter(n => /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(n)).join(' & ');   // plain-text credit only (D1)
const byId = Object.fromEntries(c.projects.map(x => [x.id, x]));
const order = [...sel.show, ...sel.more];
const proj = (id) => {
  const x = byId[id];
  if (!x) throw new Error('project missing: ' + id);
  return {
    id: x.id, slug: x.slug, t: x.title, tone: x.tone, g: x.category_group, cs: sel.casestudy.includes(x.id) ? 1 : 0, early: sel.more.includes(x.id) ? 1 : 0,
    cat: x.category || '', b: fix(x.card_blurb), d: fix(x.description_short), st: (x.stack || []).slice(0, 6),
    status: String(x.status || '').replace(/ \| /g, ' · '), repo: x.repo || '', w: person(x.collaborators)
  };
};
const whoami = c.about.whoami;
const PAGE_KEYS = ['home', 'projects', 'services', 'about', 'faq', 'contact', 'resume'];
const data = {
  name: p.name, short: p.shortName, role: p.title, roles: p.roles, headline: p.headline, tagline: p.tagline,
  loc: p.location, email: p.email, status: p.status_badge.text.replace('@', 'at'), avail: p.availability,
  gh: p.links.github, li: p.links.linkedin, ig: p.links.instagram, resume: p.links.resume_pdf_relative,
  short_bio: p.summary_short, bio: p.summary_long.split(/\n+/),
  freelance: p.freelance.line_short,
  degree: whoami.education.degree, school: whoami.education.institution,
  hero: { stack: c.skills.core.slice(0, 4) },
  stats: c.stats.map(s => ({ l: s.label, v: s.id === 'projects' ? sel.show.length : s.value })),
  skills: { core: c.skills.core, also: c.skills.also, labels: c.skills.tier_labels },
  pages: PAGE_KEYS.map(k => ({ path: c.pages[k].path, label: c.pages[k].nav_label, hint: c.pages[k].h1, kw: k })),
  services: c.services.map(s => ({ slug: s.slug, label: s.nav_label, blurb: s.blurb })),
  projects: order.map(proj),
  exp: c.experience.map(e => ({
    o: e.org, r: e.role, p: e.period, g: e.group,
    b: e.group === 'work' ? e.bullets.slice(0, 2) : []
  })),
  certs: c.certifications.map(x => ({ n: x.name, i: x.issuer })),     // no years (D3)
  awards: c.achievements.map(a => ({ t: a.title }))                   // no years
};
let json = JSON.stringify(data);
// guard rails
const BAD = /Pune|LangGraph|exploring|"learning"|English|Hindi|Marathi|German|French|prasannapatil|prasanna4149|systems shipped|"y":|"year"/i;
const bad = BAD.exec(json);
if (bad) { console.error('FORBIDDEN token in fx DATA:', bad[0]); process.exit(1); }
const BS = String.fromCharCode(92);
json = json.replace(/[-￿]/g, ch => BS + 'u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));
const file = `${SITE}/assets/js/sections/fx.js`;
let js = fs.readFileSync(file, 'utf8');
const re = /\/\*@@DATA\*\/[\s\S]*?\/\*@@END\*\//;
if (!re.test(js)) { console.error('markers not found in fx.js'); process.exit(1); }
js = js.replace(re, () => '/*@@DATA*/' + json + '/*@@END*/');
fs.writeFileSync(file, js);
console.log('DATA injected from content.json -', (json.length / 1024).toFixed(1), 'KB,', data.projects.length, 'projects,', data.pages.length, 'pages,', data.services.length, 'services');
