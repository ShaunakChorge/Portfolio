// selection.mjs - which projects show, which have a case study, which are featured where. ONE source: projects.config.json.
// Every generator (hero stat, home, fx data, footer, project pages, resume, sitemap, llms) reads this module; nothing else reads the file.
//
//   show             selected projects: a card on /projects/, counted in the home stat
//   casestudy        the selected ones that also get their own page (each needs a `case_study` block in content.json)
//   more             the compact "More projects" list (a project listed in `show` is never repeated there)
//   home_featured    case studies on the home page, in this order (up to 6)
//   footer_work      case studies linked in the footer "Work" column (up to 4)
//   resume_featured  case studies on the resume page and in the PDF (up to 4)
//
// Ordering rule for the three featured lists: the ids you list come first, in your order. An id that is not a case study (any more) is skipped with a
// warning. If fewer than the maximum remain, the first case studies of `casestudy` fill the rest, so a new selection never leaves a gap or a dead link.
import fs from 'node:fs';
import path from 'node:path';
import { SITE, readContent } from './lib.mjs';

const CONFIG_FILE = path.join(SITE, 'projects.config.json');
const FEATURED_MAX = { home_featured: 6, footer_work: 4, resume_featured: 4 };

export function loadSelection(content = readContent()) {
  if (!fs.existsSync(CONFIG_FILE)) throw new Error('projects.config.json is missing (it lists which projects show)');
  const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  const byId = new Map(content.projects.map(p => [p.id, p]));
  const list = name => {
    const ids = cfg[name] ?? [];
    if (!Array.isArray(ids)) throw new Error(`projects.config.json: "${name}" must be a list of project ids`);
    for (const id of ids) if (!byId.has(id)) throw new Error(`projects.config.json: unknown project id "${id}" in "${name}"`);
    if (new Set(ids).size !== ids.length) throw new Error(`projects.config.json: "${name}" lists an id twice`);
    return ids;
  };
  const show = list('show'), casestudy = list('casestudy');
  for (const id of casestudy) {
    if (!show.includes(id)) throw new Error(`projects.config.json: case study "${id}" must also be in "show"`);
    if (!byId.get(id).case_study) throw new Error(`projects.config.json: "${id}" has no case_study block in content.json`);
  }
  const more = list('more').filter(id => !show.includes(id));
  const featured = name => {
    const wanted = list(name);
    const skipped = wanted.filter(id => !casestudy.includes(id));
    if (skipped.length) console.warn(`projects.config.json: "${name}" skips ${skipped.join(', ')} (not a case study)`);
    return [...new Set([...wanted.filter(id => casestudy.includes(id)), ...casestudy])].slice(0, FEATURED_MAX[name]);
  };
  const extra = Object.keys(cfg).filter(k => !(k in FEATURED_MAX) && !['show', 'casestudy', 'more'].includes(k));
  if (extra.length) throw new Error(`projects.config.json: unknown key(s) ${extra.join(', ')}`);
  return { show, casestudy, more, homeFeatured: featured('home_featured'), footerWork: featured('footer_work'), resumeFeatured: featured('resume_featured'), config: cfg };
}
