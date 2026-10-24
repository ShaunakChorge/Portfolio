// Generates src/generated/hero.html (HOME hero: neon portrait + compact typed shaunak.py window + 3 modest stats)
// from content/content.json (hero, profile, stats) and the project selection (the "projects" stat). Run by build.mjs, or alone:  node tools/hero/gen.mjs
import fs from 'node:fs';
import path from 'node:path';
import { GENERATED, readContent, statValues, esc, escText, icon } from '../lib.mjs';
import { findBanned } from '../rules.mjs';
import { loadSelection } from '../selection.mjs';

const C = readContent();
const OUT = GENERATED;

/* ------------------------------------------------------------------ python tokenizer (just enough for the snippet) */
const KW = new Set(['for', 'in', 'if', 'else', 'elif', 'import', 'from', 'as', 'def', 'return', 'class', 'while', 'with', 'and', 'or', 'not', 'is', 'lambda', 'try', 'except', 'finally', 'pass', 'break', 'continue', 'yield', 'None', 'True', 'False']);
const BUILTIN = new Set(['print', 'isinstance', 'len', 'range', 'list', 'dict', 'str', 'int', 'float', 'open', 'sorted', 'enumerate', 'zip', 'map', 'set', 'tuple']);

function tokenize(src) {
  const toks = [];
  const push = (c, t) => {
    if (!t) return;
    const last = toks[toks.length - 1];
    if (last && last.c === c) last.t += t; else toks.push({ c, t });
  };
  const prevSig = () => { for (let k = toks.length - 1; k >= 0; k--) if (toks[k].c !== '') return toks[k]; return null; };
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    const ch = src[i];
    let m;
    if ((m = /^\s+/.exec(rest))) { push('', m[0]); i += m[0].length; continue; }
    if (ch === '#') { push('cm', rest); break; }
    if ((m = /^([fFrRbBuU]{0,2})(["'])/.exec(rest))) {
      const prefix = m[1], q = m[2], isF = /f/i.test(prefix);
      let k = i + m[0].length, depth = 0, end = -1;
      for (; k < src.length; k++) {
        const c = src[k];
        if (c === '\\') { k++; continue; }
        if (isF) {
          if (c === '{') { if (src[k + 1] === '{') { k++; continue; } depth++; continue; }
          if (c === '}') { if (depth > 0) { depth--; continue; } if (src[k + 1] === '}') { k++; continue; } }
        }
        if (c === q && depth === 0) { end = k; break; }
      }
      if (end < 0) end = src.length - 1;
      const body = src.slice(i + m[0].length, end);
      if (isF) {
        push('st', prefix + q);
        let j = 0, lit = '';
        while (j < body.length) {
          const c = body[j];
          if (c === '{' && body[j + 1] === '{') { lit += '{{'; j += 2; continue; }
          if (c === '{') {
            push('st', lit); lit = '';
            let d = 1, e = j + 1, quote = null;
            for (; e < body.length; e++) {
              const cc = body[e];
              if (quote) { if (cc === quote) quote = null; continue; }
              if (cc === '"' || cc === "'") { quote = cc; continue; }
              if (cc === '{' || cc === '(' || cc === '[') d++;
              else if (cc === '}' || cc === ')' || cc === ']') { d--; if (d === 0) break; }
            }
            const inner = body.slice(j + 1, e);
            // split a top-level format spec  {expr:spec}
            let colon = -1, dd = 0, qq = null;
            for (let z = 0; z < inner.length; z++) {
              const cz = inner[z];
              if (qq) { if (cz === qq) qq = null; continue; }
              if (cz === '"' || cz === "'") { qq = cz; continue; }
              if ('([{'.includes(cz)) dd++; else if (')]}'.includes(cz)) dd--;
              else if (cz === ':' && dd === 0) { colon = z; break; }
            }
            push('fb', '{');
            const expr = colon >= 0 ? inner.slice(0, colon) : inner;
            for (const t of tokenize(expr)) push(t.c, t.t);
            if (colon >= 0) push('sp', inner.slice(colon));
            push('fb', '}');
            j = e + 1;
            continue;
          }
          lit += c; j++;
        }
        push('st', lit);
        push('st', q);
      } else {
        const full = src.slice(i, end + 1);
        const after = src.slice(end + 1).trimStart();
        const ps = prevSig();
        const isKey = after.startsWith(':') && (!ps || ps.t.endsWith('{') || ps.t.endsWith(','));
        push(isKey ? 'key' : 'st', full);
      }
      i = end + 1;
      continue;
    }
    if ((m = /^\d+(?:\.\d+)?/.exec(rest))) { push('num', m[0]); i += m[0].length; continue; }
    if ((m = /^[A-Za-z_]\w*/.exec(rest))) {
      const w = m[0];
      const next = src[i + w.length];
      const ps = prevSig();
      let c = 'v';
      if (KW.has(w)) c = 'kw';
      else if (BUILTIN.has(w) || next === '(') c = 'fn';
      else if (ps && ps.t.endsWith('.') && next === '(') c = 'fn';
      push(c, w);
      i += w.length;
      continue;
    }
    if ((m = /^[^\w\s"'#]+/.exec(rest))) { push('p', m[0]); i += m[0].length; continue; }
    push('', ch); i++;
  }
  return toks;
}
const toksToHtml = toks => toks.map(t => (t.c ? `<span class="tk-${t.c}">${escText(t.t)}</span>` : escText(t.t))).join('');


/* ------------------------------------------------------------------ HERO */
const H = C.hero, P = C.profile;
const roles = H.roles;
if (!H.freelance_line) { console.error('hero.freelance_line missing'); process.exit(1); }

/* Typed window: the lines come from content.json (hero.code_snippet_lines), valid Python with 4-space indents.
   Each line is typed as written; indentation becomes a padding in ch units so wrapped text never loses it. */
const codeLines = H.code_snippet_lines;
if (!Array.isArray(codeLines) || !codeLines.length || codeLines.some(l => typeof l !== 'string' || l.includes('\t'))) { console.error('hero.code_snippet_lines must be an array of strings without tabs'); process.exit(1); }
if (!/^Mumbai/.test(P.location)) { console.error('profile.location must be Mumbai'); process.exit(1); }
const codeHtml = codeLines.map((raw, idx) => {
  const ind = (/^ */.exec(raw) || [''])[0].length;
  const body = raw.slice(ind);
  const style = ind ? ` style="--ind:${ind}"` : '';
  return `                <li class="hero__line"${style}><span class="hero__ln" aria-hidden="true">${idx + 1}</span><span class="hero__src">${toksToHtml(tokenize(body))}</span></li>`;
}).join('\n');
const codePlain = codeLines.join('\n');

/* stats: modest, honest. projects = size of the active selection (projects.config.json, computed, never typed) */
const STAT_UI = { roles: { icon: 'briefcase', tone: 'magenta' }, podiums: { icon: 'trophy', tone: 'purple' }, projects: { icon: 'layers', tone: 'blue' } };
const values = statValues(C, loadSelection(C));
const stats = C.stats.map(s => ({ ...s, value: values[s.id] }));
if (stats.length !== 3) { console.error('exactly 3 stats expected'); process.exit(1); }
const statsHtml = stats.map(s => {
  const u = STAT_UI[s.id] || { icon: 'star', tone: 'cyan' };
  return `        <li class="stat hero__stat" data-tone="${u.tone}">
          ${icon(u.icon)}
          <div class="hero__statbody">
            <span class="stat__num" data-count="${s.value}">${s.value}</span>
            <span class="stat__label">${esc(s.label)}</span>
          </div>
        </li>`;
}).join('\n');

const H1_SUFFIX = C.pages.home.h1_sr_suffix;                      // ", AI Engineer taking select freelance AI and backend projects"
/* the photos start after the first paint (hero.js swaps data-src / data-srcset in): they never compete with the CSS and fonts that paint the text */
const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const SIZES = '(min-width: 1280px) 21rem, (min-width: 1024px) 19rem, (min-width: 640px) 17rem, 13rem';
const portrait = `<figure class="np" data-neon-portrait data-reveal="scale">
            <div class="np__stage">
              <div class="np__back" aria-hidden="true">
                <span class="np__grid"></span>
                <span class="np__ring np__ring--a"></span>
                <span class="np__ring np__ring--b"></span>
                <span class="np__light"></span>
              </div>
              <div class="np__tilt">
                <div class="np__float">
                  <div class="np__fig">
                    <picture class="np__pic" data-late>
                      <source type="image/avif" data-srcset="{{base}}assets/img/portrait/portrait-480.avif 480w, {{base}}assets/img/portrait/portrait-800.avif 800w" sizes="${SIZES}">
                      <source type="image/webp" data-srcset="{{base}}assets/img/portrait/portrait-480.webp 480w, {{base}}assets/img/portrait/portrait-800.webp 800w" sizes="${SIZES}">
                      <img class="np__img" src="${PIXEL}" data-src="{{base}}assets/img/portrait/portrait-800.webp" width="800" height="1067" decoding="async" alt="Illustrated portrait of Shaunak Chorge, a freelance AI engineer in Mumbai, smiling and wearing glasses and a dark jacket with arms crossed">
                    </picture>
                    <noscript><img class="np__img np__img--ns" src="{{base}}assets/img/portrait/portrait-800.webp" width="800" height="1067" alt="Illustrated portrait of Shaunak Chorge, a freelance AI engineer in Mumbai, smiling and wearing glasses and a dark jacket with arms crossed"></noscript>
                    <picture class="np__rim" aria-hidden="true" data-late>
                      <source type="image/avif" data-srcset="{{base}}assets/img/portrait/rim-480.avif 480w, {{base}}assets/img/portrait/rim-800.avif 800w" sizes="${SIZES}">
                      <source type="image/webp" data-srcset="{{base}}assets/img/portrait/rim-480.webp 480w, {{base}}assets/img/portrait/rim-800.webp 800w" sizes="${SIZES}">
                      <img src="${PIXEL}" data-src="{{base}}assets/img/portrait/rim-800.webp" width="800" height="1067" decoding="async" alt="">
                    </picture>
                    <span class="np__scan"></span>
                  </div>
                </div>
              </div>
              <div class="np__dust" aria-hidden="true">
                <i style="--x:12%;--s:3px;--d:9s;--t:0s;--c:var(--cyan,0 255 255)"></i>
                <i style="--x:24%;--s:2px;--d:11s;--t:-3s;--c:var(--magenta,255 0 110)"></i>
                <i style="--x:36%;--s:4px;--d:13s;--t:-6s;--c:var(--purple,181 83 242)"></i>
                <i style="--x:48%;--s:2px;--d:10s;--t:-1s;--c:var(--cyan,0 255 255)"></i>
                <i style="--x:60%;--s:3px;--d:12s;--t:-8s;--c:var(--magenta,255 0 110)"></i>
                <i style="--x:72%;--s:2px;--d:9.5s;--t:-4s;--c:var(--cyan,0 255 255)"></i>
                <i style="--x:84%;--s:4px;--d:14s;--t:-10s;--c:var(--purple,181 83 242)"></i>
                <i style="--x:92%;--s:2px;--d:11.5s;--t:-2s;--c:var(--cyan,0 255 255)"></i>
                <i style="--x:18%;--s:2px;--d:12.5s;--t:-7s;--c:var(--purple,181 83 242)"></i>
                <i style="--x:66%;--s:3px;--d:10.5s;--t:-5s;--c:var(--magenta,255 0 110)"></i>
              </div>
              <div class="np__hud" aria-hidden="true">
                <span class="np__corner np__corner--tl"></span>
                <span class="np__corner np__corner--tr"></span>
                <span class="np__corner np__corner--bl"></span>
                <span class="np__corner np__corner--br"></span>
              </div>
              <span class="np__tag"><span class="np__dot" aria-hidden="true"></span>Mumbai, India &middot; IST</span>
            </div>
          </figure>`;

const hero = `<section id="home" class="hero" data-rail="01·intro" aria-labelledby="hero-title" data-roles="${esc(roles.join('|'))}">
  <div class="hero__bg" aria-hidden="true">
    <div class="bg-grid bg-grid--fade" data-parallax="0.3"></div>
    <div class="bg-rails"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <div class="bg-blobs"><i></i><i></i><i></i></div>
    <div class="bg-veil"></div>
    <p class="hero__hud"><span>${P.coords.lat.toFixed(4)}&deg;N</span><span>${P.coords.lon.toFixed(4)}&deg;E</span><span>MUMBAI</span></p>
  </div>

  <div class="container hero__wrap">
    <div class="hero__grid">

      <div class="hero__photo">
          ${portrait}
      </div>

      <div class="hero__copy">
        <p class="badge hero__status" data-hero-in="rise" style="--d:0">
          <span class="hero__status-main"><span class="badge__dot" aria-hidden="true"></span><span class="hero__status-txt">${esc(P.status_badge.text.replace('@', 'at'))}</span></span>
          <span class="sr-only">, </span>
          <span class="hero__loc">${icon('map-pin', 'icon--sm')}${esc(P.location)}</span>
        </p>

        <h1 id="hero-title" class="hero__title" data-hero-in="rise" style="--d:70"><span class="hero__name hero__name--1 glow-cyan">${esc(H.headline_first)}</span> <span class="hero__name hero__name--2 glow-magenta">${esc(H.headline_second)}</span><span class="sr-only">${esc(H1_SUFFIX)}</span></h1>

        <p class="hero__roles" data-hero-in style="--d:220">
          <span class="sr-only">Roles: ${esc(roles.join(', '))}.</span>
          <span class="hero__roles-vis" aria-hidden="true"><span class="hero__chev">&gt;</span><span class="hero__role" data-hero-role>${esc(roles[0])}</span><span class="hero__caret hero__caret--role"></span></span>
        </p>

        <p class="hero__lede" data-hero-in style="--d:320">${esc(H.lede)}</p>

        <div class="hero__cta" data-hero-in style="--d:420">
          <a class="btn btn--solid btn--glow" href="{{base}}${esc(H.cta_primary.href)}#hire" data-magnetic>${esc(H.cta_primary.label)} ${icon('arrow-right')}</a>
          <a class="btn btn--purple" href="{{base}}${esc(H.cta_secondary.href)}" data-magnetic>${esc(H.cta_secondary.label)} ${icon('arrow-right')}</a>
          <p class="hero__free"><span class="hero__free-dot" aria-hidden="true"></span>${esc(H.freelance_line)}</p>
        </div>
      </div>

      <div class="hero__stage">
        <figure class="hero__code" data-hero-in="right" style="--d:380" aria-labelledby="hero-code-cap">
          <figcaption id="hero-code-cap" class="sr-only">${esc(H.code_snippet_file)}, a short Python sketch of how a project runs from idea to working product.</figcaption>
          <div class="sr-only">
            <pre><code>${escText(codePlain)}</code></pre>
          </div>

          <div class="hero__window">
            <div class="hero__bar">
              <span class="hero__dots" aria-hidden="true"><i></i><i></i><i></i></span>
              <span class="hero__tab" aria-hidden="true">${icon('file-code', 'icon--sm')}${esc(H.code_snippet_file)}</span>
              <button class="hero__ctrl" type="button" data-hero-ctrl data-state="skip" aria-label="Skip the typing animation" hidden>
                <span class="hero__ctrl-skip">Skip ${icon('arrow-right', 'icon--sm icon--still')}</span><span class="hero__ctrl-replay">${icon('play', 'icon--sm icon--still')} Replay</span>
              </button>
            </div>
            <div class="hero__editor" aria-hidden="true">
              <div class="bg-scan hero__scan"></div>
              <ol class="hero__lines">
${codeHtml}
              </ol>
            </div>
          </div>
        </figure>
      </div>

    </div>

    <ul class="stats hero__stats" data-hero-in style="--d:560" aria-label="At a glance">
${statsHtml}
    </ul>
  </div>
</section>
`;

/* guard rails: banned words (tools/rules.mjs) */
const hit = findBanned(hero, { languages: true, learning: true });
if (hit) { console.error('FORBIDDEN text in hero:', hit); process.exit(1); }

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'hero.html'), hero);
console.log(`hero.html ${hero.length}B | code lines: ${codeLines.length} | stats: ${stats.map(s => s.value).join('/')}`);
