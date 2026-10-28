// Generates src/generated/hero.html (HOME hero: name, role line, one sentence, two buttons, the freelance line and the typed shaunak.py window)
// from content/content.json (hero, profile). Run by build.mjs, or alone:  node tools/hero/gen.mjs
import fs from 'node:fs';
import path from 'node:path';
import { GENERATED, readContent, esc, escText, icon } from '../lib.mjs';
import { findBanned } from '../rules.mjs';

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

const H1_SUFFIX = C.pages.home.h1_sr_suffix;                      // ", AI Engineer taking select freelance AI and backend projects"
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

      <div class="hero__copy">
        <h1 id="hero-title" class="hero__title" data-hero-in="rise" style="--d:0"><span class="hero__name hero__name--1 glow-cyan">${esc(H.headline_first)}</span> <span class="hero__name hero__name--2 glow-magenta">${esc(H.headline_second)}</span><span class="sr-only">${esc(H1_SUFFIX)}</span></h1>

        <p class="hero__roles" data-hero-in style="--d:220">
          <span class="sr-only">Roles: ${esc(roles.join(', '))}.</span>
          <span class="hero__roles-vis" aria-hidden="true"><span class="hero__chev">&gt;</span><span class="hero__role" data-hero-role>${esc(roles[0])}</span><span class="hero__caret hero__caret--role"></span></span>
        </p>

        <p class="hero__lede" data-hero-in style="--d:320">${esc(H.lede)}</p>

        <div class="hero__cta" data-hero-in style="--d:420">
          <a class="btn btn--solid btn--glow" href="{{base}}${esc(H.cta_secondary.href)}" data-magnetic>${esc(H.cta_secondary.label)} ${icon('arrow-right')}</a>
          <a class="btn btn--purple" href="{{base}}${esc(H.cta_primary.href)}#hire" data-magnetic>${esc(H.cta_primary.label)} ${icon('arrow-right')}</a>
          <a class="btn btn--ghost" href="{{base}}resume/" data-magnetic>View resume ${icon('file-text')}</a>
          <p class="hero__free"><span class="hero__free-dot" aria-hidden="true"></span>${esc(H.freelance_line)}</p>
        </div>
      </div>

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
</section>
`;

/* guard rails: banned words (tools/rules.mjs) */
const hit = findBanned(hero, { languages: true, learning: true });
if (hit) { console.error('FORBIDDEN text in hero:', hit); process.exit(1); }

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'hero.html'), hero);
console.log(`hero.html ${hero.length}B | code lines: ${codeLines.length}`);
