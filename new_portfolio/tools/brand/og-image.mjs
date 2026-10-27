// og-image.mjs - draws assets/img/og-image.png (1200 x 630), the social share card used by og:image and twitter:image.
//   node tools/brand/og-image.mjs        (needs Playwright with Chromium: npm i --no-save playwright sharp, see tools/optional.mjs)
// The card is a design, not a page of the site: its words (name, role, employer, the four services, city) are typed in the HTML below and are NOT read from
// content/content.json. After you change any of them in the content file, edit the card text here and run this script again.
// Text rules (same as the site): "and" instead of "&", plain words, no unexplained short forms.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { SITE } from '../lib.mjs';
import { loadPackage, withPage } from '../optional.mjs';

const fonts = f => pathToFileURL(path.join(SITE, 'assets/fonts', f)).href;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: "Orbitron"; src: url("${fonts('orbitron-var-latin.woff2')}") format("woff2"); font-weight: 400 900; }
@font-face { font-family: "Space Grotesk"; src: url("${fonts('space-grotesk-var-latin.woff2')}") format("woff2"); font-weight: 300 700; }
@font-face { font-family: "Space Mono"; src: url("${fonts('space-mono-400-latin.woff2')}") format("woff2"); font-weight: 400; }
@font-face { font-family: "Space Mono"; src: url("${fonts('space-mono-700-latin.woff2')}") format("woff2"); font-weight: 700; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1200px; height: 630px; background: #05060d; overflow: hidden; }
.card { position: relative; width: 1200px; height: 630px; overflow: hidden; color: #fff;
  background:
    radial-gradient(60% 80% at 82% 45%, rgba(181,83,242,.34), transparent 70%),
    radial-gradient(40% 50% at 8% 100%, rgba(0,255,255,.10), transparent 70%),
    #05060d; }
.grid { position: absolute; inset: 0; opacity: .5;
  background-image: linear-gradient(rgba(0,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,.07) 1px, transparent 1px);
  background-size: 48px 48px; -webkit-mask-image: linear-gradient(180deg, transparent, #000 25%, #000 80%, transparent); }
.ring { position: absolute; right: 52px; top: 92px; width: 446px; height: 446px; border-radius: 50%; border: 2px solid rgba(0,255,255,.18); box-shadow: 0 0 60px rgba(181,83,242,.25) inset; }
.mark { position: absolute; right: 40px; top: 100px; width: 430px; height: 430px; filter: drop-shadow(0 0 34px rgba(181,83,242,.65)); }
.dot { position: absolute; border-radius: 50%; }
.loc { position: absolute; left: 78px; top: 50px; font: 700 20px/1 "Space Mono", monospace; letter-spacing: .22em; color: #00ffff; text-transform: uppercase; }
.loc i { font-style: normal; color: #ff006e; margin-right: 12px; }
.name { position: absolute; left: 76px; top: 108px; font: 900 94px/1.06 "Orbitron", sans-serif; letter-spacing: .01em; text-shadow: 0 0 28px rgba(255,255,255,.28); }
.name span { display: block; background: linear-gradient(90deg, #00ffff 0%, #b553f2 55%, #ff006e 100%); -webkit-background-clip: text; background-clip: text; color: transparent; text-shadow: none; }
.role { position: absolute; left: 78px; top: 342px; font: 700 31px/1.3 "Space Mono", monospace; color: #fff; }
.role b { color: #00ffff; font-weight: 700; }
.what { position: absolute; left: 78px; top: 432px; font: 700 22px/1.4 "Space Mono", monospace; color: #e7e9f5; }
.what i { font-style: normal; color: #ff006e; padding: 0 6px; }
.foot { position: absolute; left: 78px; right: 78px; bottom: 36px; display: flex; justify-content: space-between; font: 400 21px/1 "Space Mono", monospace; color: #b8bdd2; }
.foot em { font-style: normal; color: #ff006e; font-weight: 700; }
</style></head><body><div class="card">
<div class="grid"></div><div class="ring"></div>
<svg class="mark" viewBox="0 0 64 64" fill="none"><defs><linearGradient id="g" x1="6" y1="2" x2="58" y2="62" gradientUnits="userSpaceOnUse"><stop stop-color="#00FFFF"/><stop offset=".52" stop-color="#B553F2"/><stop offset="1" stop-color="#FF006E"/></linearGradient></defs><path d="M44.76 1L3 7.32L3 15.5L39.02 38.91L3 61.49L3 63L9.03 63L61 43L61 36.5L27.4 14.66L61 2.07L61 1Z" fill="url(#g)"/></svg>
<div class="dot" style="right:34px;top:128px;width:16px;height:16px;background:#ff006e;box-shadow:0 0 20px #ff006e"></div>
<div class="dot" style="left:700px;top:300px;width:14px;height:14px;background:#00ffff;box-shadow:0 0 18px #00ffff"></div>
<div class="dot" style="right:78px;top:515px;width:14px;height:14px;background:#b553f2;box-shadow:0 0 18px #b553f2"></div>
<p class="loc"><i>//</i>Mumbai, India</p>
<h1 class="name">SHAUNAK<span>CHORGE</span></h1>
<p class="role"><b>AI Engineer</b> building AI solutions</p>
<p class="what">AI applications<i>&middot;</i>RAG chatbots<i>&middot;</i>Computer vision<i>&middot;</i>Backend APIs</p>
<p class="foot"><span>AI Engineer at Claptek Pvt Ltd, Mumbai</span><span>Open to <em>select</em> AI and backend projects</span></p>
</div></body></html>`;

const tmp = path.join(SITE, 'tools/brand/og-image.tmp.html');
fs.writeFileSync(tmp, html);
try {
  await withPage(async page => {
    await page.goto(pathToFileURL(tmp).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const out = path.join(SITE, 'assets/img/og-image.png');
    await page.screenshot({ path: out, type: 'png' });
    // optional: shrink the PNG with a palette (needs the 'sharp' package; skipped when it is not installed)
    try {
      const sharp = loadPackage('sharp');
      fs.writeFileSync(out, await sharp(out).png({ palette: true, quality: 82, colours: 160, effort: 10, dither: 1 }).toBuffer());
    } catch { /* keep the full-colour PNG */ }
    console.log('wrote', out, (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
  }, { viewport: { width: 1200, height: 630 } });
} finally { fs.rmSync(tmp, { force: true }); }
