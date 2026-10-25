// selection.mjs - which projects show, which have a case study, how the project collage is laid out. ONE source: projects.config.json.
// Every generator (home, fx data, footer, project pages, resume, sitemap, llms) reads this module; nothing else reads the file.
//
//   show             the selected projects in priority order: rank 1 is the first id. They fill the collage on the home page and on /projects/
//   tile_size        "wide" (2 columns x 1 row) or "big" (2x2) for the ids that are larger than one cell; every other selected project is "small" (1x1)
//   desktop_grid     the 4-column desktop collage as rows of ranks. A rank repeats across the cells its tile covers; rank show.length + 1 is the
//                    "All projects" link tile. Must be a full rectangle with no gaps (checked below). Tablet and phone layouts follow the rank order.
//   casestudy        the selected ones that also get their own page (each needs a `case_study` block in content.json)
//   personal         "Personal builds": small projects shown as open rows on /projects/ only (a project listed in `show` is never repeated there)
//   footer_work      case studies linked in the footer "Work" column (up to 4)
//   resume_featured  case studies on the resume page and in the PDF (up to 4)
//
// Ordering rule for the two featured lists: the ids you list come first, in your order. An id that is not a case study (any more) is skipped with a
// warning. If fewer than the maximum remain, the first case studies of `casestudy` fill the rest, so a new selection never leaves a gap or a dead link.
// The origin tag of a tile (Client, Academic or Personal) is the optional `origin` field of the project in content.json.
import fs from 'node:fs';
import path from 'node:path';
import { SITE, readContent } from './lib.mjs';

const CONFIG_FILE = path.join(SITE, 'projects.config.json');
const FEATURED_MAX = { footer_work: 4, resume_featured: 4 };
const KEYS = ['show', 'tile_size', 'desktop_grid', 'casestudy', 'personal', ...Object.keys(FEATURED_MAX)];
const SIZES = { small: [1, 1], wide: [2, 1], big: [2, 2] };   // columns x rows
const ORIGINS = ['Client', 'Academic', 'Personal'];
const GRID_COLUMNS = 4;

export function loadSelection(content = readContent()) {
  if (!fs.existsSync(CONFIG_FILE)) throw new Error('projects.config.json is missing (it lists which projects show)');
  const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  const fail = msg => { throw new Error(`projects.config.json: ${msg}`); };
  const byId = new Map(content.projects.map(p => [p.id, p]));
  const list = name => {
    const ids = cfg[name] ?? [];
    if (!Array.isArray(ids)) fail(`"${name}" must be a list of project ids`);
    for (const id of ids) if (!byId.has(id)) fail(`unknown project id "${id}" in "${name}"`);
    if (new Set(ids).size !== ids.length) fail(`"${name}" lists an id twice`);
    return ids;
  };
  const extra = Object.keys(cfg).filter(k => !KEYS.includes(k));
  if (extra.length) fail(`unknown key(s) ${extra.join(', ')}`);

  const show = list('show'), casestudy = list('casestudy'), personal = list('personal');
  for (const id of casestudy) {
    if (!show.includes(id)) fail(`case study "${id}" must also be in "show"`);
    if (!byId.get(id).case_study) fail(`"${id}" has no case_study block in content.json`);
  }
  for (const id of personal) if (show.includes(id)) fail(`"${id}" is in both "show" and "personal"`);
  for (const p of content.projects) if (p.origin && !ORIGINS.includes(p.origin)) fail(`"${p.id}" has origin "${p.origin}" (use ${ORIGINS.join(', ')} or leave it out)`);

  /* collage: a size per selected project, and a desktop grid whose cells match those sizes exactly */
  const sizeOf = cfg.tile_size ?? {};
  for (const [id, size] of Object.entries(sizeOf)) {
    if (!show.includes(id)) fail(`tile_size lists "${id}", which is not in "show"`);
    if (!['wide', 'big'].includes(size)) fail(`tile_size "${id}" must be "wide" or "big" (small is the default)`);
  }
  const tiles = show.map((id, i) => ({ id, rank: i + 1, size: sizeOf[id] ?? 'small' }));
  const linkRank = show.length + 1;
  const grid = cfg.desktop_grid;
  if (!Array.isArray(grid) || !grid.length) fail('"desktop_grid" must be a list of rows');
  const cells = new Map();   // rank -> [[row, col], ...]
  grid.forEach((row, r) => {
    if (!Array.isArray(row) || row.length !== GRID_COLUMNS) fail(`desktop_grid row ${r + 1} must have ${GRID_COLUMNS} cells`);
    row.forEach((rank, c) => {
      if (!Number.isInteger(rank) || rank < 1 || rank > linkRank) fail(`desktop_grid row ${r + 1} has "${rank}" (use ranks 1 to ${linkRank}; ${linkRank} is the All projects tile)`);
      cells.set(rank, [...(cells.get(rank) ?? []), [r, c]]);
    });
  });
  for (const t of [...tiles, { rank: linkRank, size: 'small', id: 'the All projects tile' }]) {
    const at = cells.get(t.rank) ?? [];
    const [w, h] = SIZES[t.size];
    const rows = at.map(x => x[0]), cols = at.map(x => x[1]);
    const box = at.length ? (Math.max(...rows) - Math.min(...rows) + 1) * (Math.max(...cols) - Math.min(...cols) + 1) : 0;
    const wide = at.length ? Math.max(...cols) - Math.min(...cols) + 1 : 0;
    if (at.length !== w * h || box !== at.length || wide !== w) fail(`desktop_grid: rank ${t.rank} (${t.id}, ${t.size}) must fill one ${w} x ${h} block, found ${at.length} cell(s)`);
  }

  const featured = name => {
    const wanted = list(name);
    const skipped = wanted.filter(id => !casestudy.includes(id));
    if (skipped.length) console.warn(`projects.config.json: "${name}" skips ${skipped.join(', ')} (not a case study)`);
    return [...new Set([...wanted.filter(id => casestudy.includes(id)), ...casestudy])].slice(0, FEATURED_MAX[name]);
  };
  return {
    show, casestudy, personal,
    collage: { tiles, linkRank, grid, areas: grid.map(row => row.map(rank => 'p' + rank).join(' ')) },
    footerWork: featured('footer_work'), resumeFeatured: featured('resume_featured'), config: cfg,
  };
}
