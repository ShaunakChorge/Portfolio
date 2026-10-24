// lib.mjs - the ONE place for paths and the tiny HTML helpers every generator shares.
// SITE is the folder that holds build.mjs (the new_portfolio folder). PF_SITE overrides it (used by `npm test`, which builds a copy).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE = process.env.PF_SITE ? path.resolve(process.env.PF_SITE) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SRC = path.join(SITE, 'src');
export const GENERATED = path.join(SRC, 'generated');   // partials + home page data written by tools/hero and tools/home (git-ignored, rebuilt every run)
export const CONTENT_FILE = path.join(SITE, 'content', 'content.json');

export const read = p => fs.readFileSync(p, 'utf8');
export const readContent = () => JSON.parse(read(CONTENT_FILE));

/** escape text for an HTML text node (quotes stay as they are: code samples keep their quote marks) */
export const escText = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** escape for an HTML attribute value or any text (also the quote mark) */
export const esc = s => escText(s).replace(/"/g, '&quot;');
/** one icon from the inline sprite (shell.html); the build keeps only the symbols a page uses */
export const icon = (name, cls = '') => `<svg class="icon${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;

/** the three numbers of the stats strip (home hero, /about/): computed, never typed. `selection` comes from tools/selection.mjs */
export const statValues = (content, selection) => ({
  roles: content.experience.filter(e => e.group === 'work').length,
  podiums: content.achievements.length,
  projects: selection.show.length,
});
