// data.mjs - loads content.json + the project selection (tools/selection.mjs) and normalises them into the model the page modules render.
// No page module reads the JSON directly: everything display-facing comes through here.
import { readContent, statValues } from '../lib.mjs';
import { loadConfig, abs } from '../../build.mjs';
import { loadSelection } from '../selection.mjs';
import { loadKeywords } from './keywords.mjs';

export { abs };
export const cfg = loadConfig();
export const content = readContent();

/* ---------- constants shared by every page ---------- */
export const EMAIL = cfg.email;                     // from content.profile.email
export const GITHUB = content.profile.links.github;
export const LINKEDIN = content.profile.links.linkedin;
export const INSTAGRAM = content.profile.links.instagram;
export const FREELANCE_LINE = content.profile.freelance.line_short;     // "Taking select freelance AI and backend projects"
export const CTA_TEXT = content.cta.text;                                // the one "send a short brief" sentence used by every hire band
export const DEGREE = content.about.whoami.education.degree;            // Bachelor of Technology in Artificial Intelligence and Data Science (graduated May 2026)
export const LASTMOD = process.env.PF_LASTMOD || (content.meta && content.meta.generated) || new Date().toISOString().slice(0, 10);   // sitemap <lastmod>: content.meta.generated (deterministic builds)
export const RESUME_PDF = content.profile.links.resume_pdf_relative;     // assets/Shaunak-Chorge-Resume.pdf
export const ENTITY = cfg.person.description;   // the one entity sentence (about lead, llms.txt, Person.description): content.seo.entity, put there by loadConfig

/* ---------- services ---------- */
// content slug -> published slug: content.services[].page_slug (the footer list is generated from the same field, see build.mjs footerParts)
export const SERVICE_SLUG = Object.fromEntries(content.services.map(s => [s.slug, s.page_slug || s.slug]));
export const services = content.services.map(s => ({
  ...s,
  key: s.slug,
  slug: SERVICE_SLUG[s.slug],
  path: `services/${SERVICE_SLUG[s.slug]}/`,
  name: s.nav_label,
}));   // tone and icon come straight from content.services[]
export const serviceByKey = Object.fromEntries(services.map(s => [s.key, s]));

/* ---------- projects ---------- */
export const selection = loadSelection(content);   // projects.config.json: the one place that says which projects show
const showSet = new Set(selection.show);
const caseSet = new Set(selection.casestudy);
const PERSON_NAME = /^[A-Z][A-Za-z.'-]+( [A-Z][A-Za-z.'-]+){1,2}$/;
const projectById = Object.fromEntries(content.projects.map(p => [p.id, p]));

function repoState(p) {
  const first = String(p.status || '').split('|')[0].trim();
  if (p.repo) return { kind: 'public', text: 'Public repository', href: p.repo };
  if (/^Private enterprise/i.test(first)) return { kind: 'private', text: 'Private enterprise repository' };
  if (/^Private repo/i.test(first)) return { kind: 'private', text: 'Private repository, available on request' };
  if (/^Assignment|^Course case study/i.test(first)) return { kind: 'none', text: first === 'Assignment' ? 'Notebook assignment' : 'Course notebook' };
  return { kind: 'none', text: '' };
}

const claptekIds = new Set((content.experience.find(e => /Claptek/.test(e.org)) || {}).project_ids || []);

function model(id) {
  const p = projectById[id];
  const statusParts = String(p.status || '').split('|').map(s => s.trim()).filter(Boolean);
  const svcKeys = (p.service_tags || []).filter(k => serviceByKey[k]);
  return {
    ...p,
    hasCase: caseSet.has(p.id),
    path: `projects/${p.slug}/`,
    context: statusParts[1] || '',
    repoInfo: repoState(p),
    coBuilders: (p.collaborators || []).filter(n => PERSON_NAME.test(n)),
    svc: svcKeys.map(k => serviceByKey[k]),
    primarySvc: serviceByKey[svcKeys[0]] || services[0],
    atClaptek: claptekIds.has(p.id),
    inShow: showSet.has(p.id),
    tone: p.tone || 'cyan',
  };
}
export const caseStudies = selection.casestudy.map(model);
export const showProjects = selection.show.map(model);
export const showOnly = showProjects.filter(p => !p.hasCase);            // cards without a case study page
export const moreProjects = selection.more.map(model);
export const projectModel = Object.fromEntries([...showProjects, ...moreProjects].map(p => [p.id, p]));
export const resumeProjects = selection.resumeFeatured.map(id => projectModel[id]);   // the featured case studies of the resume page and the PDF

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
export const faqAll = content.faq_all.filter(g => !g.page);                         // the /faq/ page groups
/** the FAQ items a group of faq_all hands to another page ('home', 'contact'): { id, q, a } in order */
export const faqFor = page => content.faq_all.filter(g => g.page === page).flatMap(g => g.items);
export const profile = content.profile;
export const aboutPage = content.about;
export const pagesMeta = content.pages;
const statNumbers = statValues(content, selection);
export const stats = content.stats.map(s => ({ id: s.id, label: s.label, value: statNumbers[s.id] }));

/* ---------- text helpers ---------- */
export const words = s => String(s).trim().split(/\s+/).filter(Boolean).length;
export function clip(s, n) {                      // cut at a word boundary, never mid-word, end without trailing punctuation clutter
  s = String(s).replace(/\s+/g, ' ').trim();
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[\s,;:.\-]+$/, '') + '…';
}

/* ---------- keywords: the approved map (content/keywords.json) ---------- */
export const keywords = loadKeywords();
/** approved link texts for a page: anchors('services/computer-vision/') -> { footer, related, hire, other: [] } */
export const anchors = pagePath => (keywords.pages[pagePath] || {}).anchors || {};
