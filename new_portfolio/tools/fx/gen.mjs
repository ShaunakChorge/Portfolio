// Builds the compact DATA const for assets/js/sections/fx.js (command palette + terminal) from content/content.json and the project selection,
// and injects it between the /*@@DATA*/ and /*@@END*/ markers of the script. Only the fields fx.js reads are passed.
// Run by build.mjs, or alone:  node tools/fx/gen.mjs
// Rules: collaborators are plain-text names (no links), Mumbai only, no project years, no spoken-language list, two stack tiers, every palette / terminal target is a real page.
import fs from 'node:fs';
import { SITE, readContent } from '../lib.mjs';
import { findBanned } from '../rules.mjs';
import { loadSelection } from '../selection.mjs';
import { whatsappHref } from '../connect.mjs';

const c = readContent();
const p = c.profile;
const sel = loadSelection(c);

const person = (names) => (names || []).filter(n => /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(n)).join(' & ');   // plain-text credit only
const byId = Object.fromEntries(c.projects.map(x => [x.id, x]));
const proj = (id) => {
  const x = byId[id];
  return {
    id: x.id, slug: x.slug, t: x.title, tone: x.tone, g: x.category_group, cs: sel.casestudy.includes(x.id) ? 1 : 0,
    cat: x.category || '', b: x.card_blurb, d: x.description_short, st: (x.stack || []).slice(0, 6),
    status: String(x.status || '').replace(/ \| /g, ' · '), repo: x.repo || '', w: person(x.collaborators)
  };
};
const whoami = c.about.whoami;
const PAGE_KEYS = ['home', 'projects', 'services', 'about', 'faq', 'contact', 'resume'];
const data = {
  name: p.name, role: p.title, tagline: p.tagline,
  loc: p.location, email: p.email, status: p.status_badge.text.replace('@', 'at'), avail: p.availability,
  gh: p.links.github, li: p.links.linkedin, ig: p.links.instagram, resume: p.links.resume_pdf_relative,
  wa: whatsappHref(), vcard: c.connect.vcard,   // the "Book a call", WhatsApp and contact card actions of the command palette
  bio: p.summary_long.split(/\n+/),
  freelance: p.freelance.line_short,
  degree: `${whoami.education.degree}, ${whoami.education.year}`, school: whoami.education.institution,
  hero: { stack: c.skills.core.slice(0, 4) },
  skills: { core: c.skills.core, also: c.skills.also, labels: c.skills.tier_labels },
  pages: PAGE_KEYS.map(k => ({ path: c.pages[k].path, label: c.pages[k].nav_label, hint: c.pages[k].h1, kw: k })),
  services: c.services.map(s => ({ slug: s.slug, label: s.nav_label, blurb: s.blurb })),
  projects: [...sel.show, ...sel.personal].map(proj),
  exp: c.experience.map(e => ({
    o: e.org, r: e.role, p: e.period, g: e.group,
    b: e.group === 'work' ? e.bullets.slice(0, 2) : []
  })),
  certs: c.certifications.map(x => ({ n: x.name, i: x.issuer })),     // no years
  awards: c.achievements.map(a => ({ t: a.title }))                   // no years
};
let json = JSON.stringify(data);
// guard rails
const bad = findBanned(json, { languages: true }) || (/"y":|"year"/.exec(json) || [])[0];
if (bad) { console.error('FORBIDDEN token in fx DATA:', bad); process.exit(1); }
const BS = String.fromCharCode(92);
json = json.replace(/[^\x00-\x7f]/g, ch => BS + 'u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));   // keep the injected script plain ASCII
const file = `${SITE}/assets/js/sections/fx.js`;
let js = fs.readFileSync(file, 'utf8');
const re = /\/\*@@DATA\*\/[\s\S]*?\/\*@@END\*\//;
if (!re.test(js)) { console.error('markers not found in fx.js'); process.exit(1); }
js = js.replace(re, () => '/*@@DATA*/' + json + '/*@@END*/');
fs.writeFileSync(file, js);
console.log('DATA injected from content.json -', (json.length / 1024).toFixed(1), 'KB,', data.projects.length, 'projects,', data.pages.length, 'pages,', data.services.length, 'services');
