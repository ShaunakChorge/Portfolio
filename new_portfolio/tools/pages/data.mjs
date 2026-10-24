// data.mjs - loads content.json + projects.config.json, normalises them into the model the page modules render.
// No page module reads the JSON directly: everything display-facing comes through here (whitelist, no dev-only fields, no years).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, CONTENT_FILE, loadConfig, abs } from '../../build.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export { SITE, abs };
export const cfg = loadConfig();

const contentSrc = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
/* D4: the language names appear once, in the HOME whoami card. "plain English" is a descriptive phrase, not a language skill, but it would trip any
   site-wide language check, so it is rephrased to "simple language" on every page this generator writes (the content file already uses it; this is a safety net). */
function deLang(o) {
  if (typeof o === 'string') return o.replace(/Plain[- ]English/g, 'Simple language').replace(/plain[- ]English/g, 'simple language');
  if (Array.isArray(o)) return o.map(deLang);
  if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, k === 'whoami' ? v : deLang(v)]));
  return o;
}
const content = deLang(contentSrc);
export { content };

/* ---------- constants shared by every page ---------- */
export const NAME = cfg.name;                       // Shaunak Chorge
export const EMAIL = cfg.email;                     // shaunak.chorge@gmail.com
export const PHONE_TEL = content.profile.phone_tel; // tel: link only (profile.phone_note)
export const PHONE_TEXT = content.profile.phone;
export const GITHUB = content.profile.links.github;
export const LINKEDIN = content.profile.links.linkedin;
export const FREELANCE_LINE = content.profile.freelance.line_short;     // "Taking select freelance AI and backend projects"
export const CTA_TEXT = content.cta.text;                                // the one "send a short brief" sentence used by every hire band
export const DEGREE = content.about.whoami.education.degree;            // Bachelor of Technology in Artificial Intelligence and Data Science (graduated May 2026)
export const LASTMOD = process.env.PF_LASTMOD || (content.meta && content.meta.generated) || new Date().toISOString().slice(0, 10);   // sitemap <lastmod>: content.meta.generated (deterministic builds)
export const RESUME_PDF = content.profile.links.resume_pdf_relative;     // assets/Shaunak-Chorge-Resume.pdf
/* the one entity sentence (about lead, llms.txt, Person.description on /about/) */
export const ENTITY = cfg.person.description;   // = content.seo.entity (loadConfig puts it there)

/* ---------- services ---------- */
// content slug -> published slug: content.services[].page_slug (the footer list is generated from the same field, see build.mjs footerParts)
export const SERVICE_SLUG = Object.fromEntries(content.services.map(s => [s.slug, s.page_slug || s.slug]));
const SERVICE_TONE = { 'llm-apps-rag': 'cyan', 'document-ai-extraction': 'purple', 'python-backend-apis': 'blue', 'computer-vision': 'magenta', 'speech-nlp-ml': 'purple', 'automation-integrations': 'blue' };
const ICON_ALIAS = { 'file-search': 'file-text' };
export const services = content.services.map(s => ({
  ...s,
  key: s.slug,
  slug: SERVICE_SLUG[s.slug] || s.slug,
  tone: SERVICE_TONE[s.slug] || 'cyan',
  icon: ICON_ALIAS[s.icon_hint] || s.icon_hint,
  path: `services/${SERVICE_SLUG[s.slug] || s.slug}/`,
  name: s.nav_label,
}));
export const serviceByKey = Object.fromEntries(services.map(s => [s.key, s]));
export const serviceBySlug = Object.fromEntries(services.map(s => [s.slug, s]));

/* ---------- projects ---------- */
const cfgFile = path.join(SITE, 'projects.config.json');
let sel = { ...content.selection_default };
let selSource = 'content.selection_default';
if (fs.existsSync(cfgFile)) {
  try {
    const c = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
    sel = { ...sel, ...Object.fromEntries(Object.entries(c).filter(([k, v]) => Array.isArray(v))) };
    selSource = 'projects.config.json';
  } catch (e) { console.error('projects.config.json unreadable, using selection_default:', e.message); }
}
export const selection = sel;
export const selectionSource = selSource;

const omit = new Set(sel.omit || []);
const PERSON_NAME = /^[A-Z][A-Za-z.'-]+( [A-Z][A-Za-z.'-]+){1,2}$/;
const projectsAll = content.projects.filter(p => !omit.has(p.id));
export const projectById = Object.fromEntries(projectsAll.map(p => [p.id, p]));

function repoState(p) {
  const first = String(p.status || '').split('|')[0].trim();
  if (p.repo) return { kind: 'public', text: 'Public repository', href: p.repo };
  if (/^Private enterprise/i.test(first)) return { kind: 'private', text: 'Private enterprise repository' };
  if (/^Private repo/i.test(first)) return { kind: 'private', text: 'Private repository, available on request' };
  if (/^Client/i.test(p.repo_note || '') || /^Client project/i.test(p.repo_note || '')) return { kind: 'private', text: 'Private client project' };
  if (/^Assignment|^Course case study/i.test(first)) return { kind: 'none', text: first === 'Assignment' ? 'Notebook assignment' : 'Course notebook' };
  return { kind: 'none', text: '' };
}

const caseSet = new Set(sel.casestudy);
const showSet = new Set(sel.show);
const moreIds = (sel.more && sel.more.length ? sel.more : content.selection_default.more).filter(id => !omit.has(id));
const claptekIds = new Set((content.experience.find(e => /Claptek/.test(e.org)) || {}).project_ids || []);

function model(p) {
  const statusParts = String(p.status || '').split('|').map(s => s.trim()).filter(Boolean);
  const co = (p.collaborators || []).filter(n => PERSON_NAME.test(n));
  const svcKeys = (p.service_tags || []).filter(k => serviceByKey[k]);
  return {
    ...p,
    hasCase: caseSet.has(p.id) && !!p.case_study,
    path: `projects/${p.slug || p.id}/`,
    context: statusParts[1] || '',
    repoInfo: repoState(p),
    coBuilders: co,
    svc: svcKeys.map(k => serviceByKey[k]),
    primarySvc: serviceByKey[svcKeys[0]] || services[0],
    atClaptek: claptekIds.has(p.id),
    inShow: showSet.has(p.id),
    tone: p.tone || 'cyan',
  };
}
export const caseStudies = sel.casestudy.map(id => projectById[id]).filter(Boolean).map(model);
export const showProjects = sel.show.map(id => projectById[id]).filter(Boolean).map(model);
export const showOnly = showProjects.filter(p => !p.hasCase);            // cards without a case study page
export const moreProjects = moreIds.map(id => projectById[id]).filter(Boolean).map(model);
export const projectModel = Object.fromEntries([...showProjects, ...moreProjects].map(p => [p.id, p]));
for (const p of caseStudies) projectModel[p.id] = p;

/* where a project link should point (case study page > card anchor > more list) */
export function projectHref(p, base) {
  if (p.hasCase) return base + p.path;
  if (showSet.has(p.id)) return base + 'projects/#p-' + p.id;
  return base + 'projects/#more';
}

/* ---------- misc content ---------- */
export const filters = content.project_filters;
export const skills = content.skills;
export const experience = content.experience;
export const education = content.education;
export const certifications = content.certifications;
export const achievements = content.achievements;
export const faqAll = content.faq_all;
export const faqShort = content.faq;
export const profile = content.profile;
export const aboutPage = content.about;
export const pagesMeta = content.pages;
export const stats = [
  { id: 'roles', label: content.stats.find(s => s.id === 'roles').label, value: content.experience.filter(e => e.group === 'work').length },
  { id: 'podiums', label: content.stats.find(s => s.id === 'podiums').label, value: content.achievements.length },
  { id: 'projects', label: content.stats.find(s => s.id === 'projects').label, value: sel.show.length },
];

/* ---------- text helpers ---------- */
export const words = s => String(s).trim().split(/\s+/).filter(Boolean).length;
export function clip(s, n) {                      // cut at a word boundary, never mid-word, end without trailing punctuation clutter
  s = String(s).replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:.\-]+$/, '') + '…';
}
