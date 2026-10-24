// optional.mjs - loads the packages that are installed on demand, outside the build: Playwright (resume PDF, social image) and sharp (portrait, smaller PNG).
// Install on demand:  npm i --no-save playwright sharp   (the social image works without sharp, only larger). PF_PLAYWRIGHT=<folder that has node_modules> also works.
import path from 'node:path';
import { createRequire } from 'node:module';

/** require() a package from the current folder (or PF_PLAYWRIGHT), then from this repo */
export function loadPackage(name) {
  const from = createRequire(path.join(process.env.PF_PLAYWRIGHT || process.cwd(), 'noop.js'));
  try { return from(name); } catch { return createRequire(import.meta.url)(name); }
}

/** run fn(page) in one headless Chromium page and always close the browser */
export async function withPage(fn, pageOptions = {}) {
  const { chromium } = loadPackage('playwright');
  const browser = await chromium.launch({ args: ['--disable-gpu', '--disable-dev-shm-usage'] });
  try { return await fn(await browser.newPage(pageOptions)); } finally { await browser.close(); }
}
