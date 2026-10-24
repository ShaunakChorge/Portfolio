// Paths shared by the generators (the repo is self-contained: everything is relative to the new_portfolio folder).
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITE = process.env.PF_SITE ? path.resolve(process.env.PF_SITE) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const SRC_DIR = path.join(SITE, 'src');
export const GEN_DIR = path.join(SRC_DIR, 'generated');   // written by the generators on every build (git-ignored)
export const CONTENT_FILE = path.join(SITE, 'content', 'content.json');
