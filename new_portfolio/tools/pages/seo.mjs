// seo.mjs - sitemap.xml, robots.txt, llms.txt, llms-full.txt. Every URL comes from abs(cfg, path): the ONE base-URL value in src/site.config.json.
import fs from 'node:fs';
import path from 'node:path';
import { SITE } from '../paths.mjs';
import { cfg, abs, ENTITY, DEGREE, EMAIL, GITHUB, LINKEDIN, LASTMOD, services, caseStudies, pagesMeta, content } from './data.mjs';

/** Inside the git repo the sitemap.xml and robots.txt live ONCE, at the repo root (next to the redirect index.html); standalone they sit in the site folder. */
export const REPO_ROOT = path.resolve(SITE, '..');
export const IN_REPO = fs.existsSync(path.join(REPO_ROOT, 'index.html'));
export const SITEMAP_URL = IN_REPO ? cfg.url.replace(/new_portfolio\/$/, '') + 'sitemap.xml' : abs(cfg, 'sitemap.xml');

const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** llms files carry no years (D3/D4 housekeeping): drop "(May 2026)" style dates and bare 19xx/20xx tokens */
export const noYears = s => String(s)
  .replace(/\(graduated May 2026\)/g, '@@DEG@@')            // the one dated phrase that stays everywhere: the degree line
  .replace(/\s*\(\s*(?:[A-Za-z]{3,9}\s+)?(?:19|20)\d\d\s*\)/g, '')
  .replace(/\s*\b(?:19|20)\d\d\b/g, '')
  .replace(/@@DEG@@/g, '(graduated May 2026)');
const oneLine = s => noYears(String(s)).replace(/\s+/g, ' ').trim();

export function sitemap(paths) {
  const urls = ['', ...paths].map(p => `  <url>\n    <loc>${xml(abs(cfg, p))}</loc>\n    <lastmod>${LASTMOD}</lastmod>\n  </url>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

/** robots.txt: allow everything, explicit groups for the common AI / answer-engine crawlers, sitemap line */
export function robots(sitemapUrl) {
  const bots = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot'];
  return `User-agent: *\nAllow: /\n\n${bots.map(b => `User-agent: ${b}\nAllow: /\n`).join('\n')}\nSitemap: ${sitemapUrl}\n`;
}

export function llmsTxt(records) {
  const by = path => records.find(r => r.path === path);
  const line = r => `- [${r.heading}](${r.url}): ${oneLine(r.desc)}`;
  const svc = services.map(s => by(s.path)).filter(Boolean);
  const cs = caseStudies.map(p => by(p.path)).filter(Boolean);
  const misc = ['about/', 'resume/', 'faq/', 'contact/'].map(by).filter(Boolean);
  const hub = [by('services/'), by('projects/')].filter(Boolean);
  return `# ${cfg.name} - AI Engineer at ${cfg.person.employer} (Mumbai, India)

> ${ENTITY}

Facts: role AI Engineer; employer ${cfg.person.employer}; location Mumbai, Maharashtra, India (IST, UTC+5:30); education ${DEGREE}, ${cfg.person.alumniOf}; works remotely; takes select freelance AI and backend projects.
Contact: ${abs(cfg, 'contact/')} - ${EMAIL}
Profiles: ${GITHUB} - ${LINKEDIN}

## Hire (freelance services)
${[by('services/') && line({ ...by('services/'), heading: 'All services' }), ...svc.map(line)].filter(Boolean).join('\n')}

## Case studies
${[by('projects/') && line({ ...by('projects/'), heading: 'All projects' }), ...cs.map(line)].filter(Boolean).join('\n')}

## About and contact
- [Home](${cfg.url}): ${oneLine(pagesMeta.home.description)}
${misc.map(line).join('\n')}

## Optional
- [Full text of these pages](${abs(cfg, 'llms-full.txt')}): plain-text version of the services, case studies, about page and FAQ
- [Sitemap](${SITEMAP_URL}): every page
`;
}

export function llmsFull(records) {
  const order = [...services.map(s => s.path), 'services/', ...caseStudies.map(p => p.path), 'projects/', 'about/', 'faq/', 'contact/', 'resume/'];
  const sorted = [...records].sort((a, b) => order.indexOf(a.path) - order.indexOf(b.path));
  const body = sorted.map(r => `# ${r.heading}\nURL: ${r.url}\n${oneLine(r.desc)}\n\n${r.text.map(oneLine).filter(Boolean).join('\n\n')}`).join('\n\n---\n\n');
  return `# ${cfg.name} - full text\n\n> ${ENTITY}\n\nContact: ${abs(cfg, 'contact/')} - ${EMAIL}\n\n---\n\n${body}\n`;
}
