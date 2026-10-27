// seo.mjs - sitemap.xml, robots.txt, llms.txt, llms-full.txt. Every URL comes from abs(cfg, path): the ONE base-URL value is content.seo.site_url.
import fs from 'node:fs';
import path from 'node:path';
import { SITE } from '../lib.mjs';
import { cfg, abs, ENTITY, DEGREE, EMAIL, GITHUB, LINKEDIN, INSTAGRAM, LASTMOD, services, caseStudies, pagesMeta } from './data.mjs';

/** Inside the git repo the sitemap.xml and robots.txt live ONCE, at the repo root (next to the redirect index.html); standalone they sit in the site folder. */
export const REPO_ROOT = path.resolve(SITE, '..');
/** With seo.deploy_root (the site is served as the root of /Portfolio/ by the GitHub Actions workflow) the artifact is the new_portfolio folder itself, so both files go inside it. */
export const IN_REPO = !cfg.deployRoot && fs.existsSync(path.join(REPO_ROOT, 'index.html'));
export const SITEMAP_URL = IN_REPO ? cfg.url.replace(/new_portfolio\/$/, '') + 'sitemap.xml' : abs(cfg, 'sitemap.xml');

const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** llms files carry no years: drop "(2026)" and "(May 2026)" style dates and bare 19xx/20xx tokens (with the comma before them) */
const noYears = s => String(s)
  .replace(/\s*\(\s*(?:[A-Za-z]{3,9}\s+)?(?:19|20)\d\d\s*\)/g, '')
  .replace(/,?\s*\b(?:19|20)\d\d\b/g, '');
const oneLine = s => noYears(String(s)).replace(/\s+/g, ' ').trim();

export function sitemap(paths) {
  const urls = ['', ...paths].map(p => `  <url>\n    <loc>${xml(abs(cfg, p))}</loc>\n    <lastmod>${LASTMOD}</lastmod>\n  </url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

/** robots.txt: allow everything; one compact group names the AI and answer-engine crawlers as explicitly allowed (a group may list several User-agent lines); sitemap line */
export function robots(sitemapUrl) {
  const bots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot'];
  return `User-agent: *\nAllow: /\n\n# AI and answer-engine crawlers are welcome\n${bots.map(b => `User-agent: ${b}`).join('\n')}\nAllow: /\n\nSitemap: ${sitemapUrl}\n`;
}

export function llmsTxt(records) {
  const by = path => records.find(r => r.path === path);
  const line = r => `- [${r.heading}](${r.url}): ${oneLine(r.desc)}`;
  const svc = services.map(s => by(s.path)).filter(Boolean);
  const cs = caseStudies.map(p => by(p.path)).filter(Boolean);
  const misc = ['about/', 'resume/', 'faq/', 'contact/'].map(by).filter(Boolean);
  const hub = [by('services/'), by('projects/')].filter(Boolean);
  return `# ${cfg.name} - AI Engineer at ${cfg.person.employer} (Mumbai, India)

> ${oneLine(ENTITY)}

Facts: role AI Engineer; employer ${cfg.person.employer}; location Mumbai, Maharashtra, India (IST, UTC+5:30); education ${DEGREE}, ${cfg.person.alumniOf}; open to select AI and backend projects.
Contact: ${abs(cfg, 'contact/')} - ${EMAIL}
Profiles: ${GITHUB} - ${LINKEDIN} - ${INSTAGRAM}

## Services
${[by('services/') && line({ ...by('services/'), heading: 'All services' }), ...svc.map(line)].filter(Boolean).join('\n')}

## Case studies
${[by('projects/') && line({ ...by('projects/'), heading: 'All projects' }), ...cs.map(line)].filter(Boolean).join('\n')}

## About and contact
- [Home](${cfg.url}): ${oneLine(pagesMeta.home.description)}
${misc.map(line).join('\n')}

## Optional
- [Full text of these pages](${abs(cfg, 'llms-full.txt')}): plain-text version of every page: services, case studies, about, FAQ, contact and resume
- [Sitemap](${SITEMAP_URL}): every page
`;
}

export function llmsFull(records) {
  const order = [...caseStudies.map(p => p.path), 'projects/', 'about/', 'resume/', ...services.map(s => s.path), 'services/', 'faq/', 'contact/'];
  const sorted = [...records].sort((a, b) => order.indexOf(a.path) - order.indexOf(b.path));
  const body = sorted.map(r => `# ${r.heading}\nURL: ${r.url}\n${oneLine(r.desc)}\n\n${r.text.map(oneLine).filter(Boolean).join('\n\n')}`).join('\n\n---\n\n');
  return `# ${cfg.name} - full text\n\n> ${oneLine(ENTITY)}\n\nNote: summary lines are written about Shaunak in the third person. Answers marked "A:" are in his own voice (first person).\n\nContact: ${abs(cfg, 'contact/')} - ${EMAIL}\n\n---\n\n${body}\n`;
}
