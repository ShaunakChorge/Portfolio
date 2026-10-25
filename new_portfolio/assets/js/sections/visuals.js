/* =====================================================================
   NEURAL NEON - sections/visuals.js  (VISUALS)
   Generative project visuals:  <div class="pv" data-visual="TYPE" data-variant="project-id" data-tone="cyan">
   One shared scheduler, DPR-aware canvases, IntersectionObserver start/stop, tab-hidden pause,
   hover/focus intensify, reduced-motion static frame, 30 fps (full rate only while hovered / focused), at most 2 visuals animating at once
   (the others are parked on their last frame), lower DPR on mobile/coarse, a visible 'Illustration' strip on every generated visual.
   Types: waveform scan-grid chat network bars terminal code qr game monogram screenshot generic.
   Variants are picked from data-variant (the project id, or content.projects[].visual_variant) by simple patterns:
   chat -> honeypot | telegram/astra | rag/healthcare; scan-grid -> deepfake | cv-fund/yolo | cctv; bars -> box | house | insurance;
   terminal -> quiz | zapvi/scrap | text-to-sql | neutral; code -> translate | ams | neutral; network -> observable-ai-backend;
   screenshot -> an <img> child is framed, otherwise a canvas mock (spam | atm | generic app); monogram -> data-initials or the
   first letters of the first two variant words.
   Every type may declare accepts(variant). A variant a type does not recognise is drawn with the neutral 'generic' visual, so a
   project never shows another project's content (no translator on an unrelated card, no insurance chart on an API project).
   Public API (read-only, for QA scripts): Portfolio.visuals = { types, list(), activeCount(), visibleCount() }.  Every .pv element is in the page HTML, so they are mounted once at start.
   ===================================================================== */
(function () {
  'use strict';

  var win = window, doc = document;
  var P = win.Portfolio || null;
  var PI = Math.PI, TAU = Math.PI * 2;

  /* ---------- math ---------- */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function easeOut(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function easeBack(t) { t = clamp(t, 0, 1); var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  function fract(x) { return x - Math.floor(x); }
  function mod(a, n) { return ((a % n) + n) % n; }
  function pulse(t, f) { return .5 + .5 * Math.sin(t * f * TAU); }

  /* ---------- deterministic randomness ---------- */
  function hashStr(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) {
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hashN(i) { i = Math.imul(i ^ 61, 1) ^ (i >>> 16); i = (i + (i << 3)) | 0; i ^= i >>> 4; i = Math.imul(i, 0x27d4eb2d); i ^= i >>> 15; return (i >>> 0) / 4294967296; }
  function vnoise(x) { var i = Math.floor(x), f = x - i; f = f * f * (3 - 2 * f); return hashN(i) * (1 - f) + hashN(i + 1) * f; }

  /* ---------- colour ---------- */
  var PAL = {
    cyan: [0, 255, 255], magenta: [255, 0, 110], purple: [181, 83, 242], blue: [0, 128, 255],
    green: [52, 255, 140], red: [255, 90, 100], amber: [255, 176, 64], white: [232, 241, 255], ink: [200, 211, 224]
  };
  var PARTNER = { cyan: 'magenta', magenta: 'cyan', purple: 'cyan', blue: 'cyan', green: 'purple' };
  function rgba(c, a) { a = a < 0 ? 0 : (a > 1 ? 1 : a); return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (Math.round(a * 1000) / 1000) + ')'; }
  function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function bright(c, t) { return mixc(c, PAL.white, t); }

  /* ---------- fonts / text ---------- */
  var MONO = '"Space Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
  var DISP = '"Orbitron", "Space Grotesk", system-ui, sans-serif';
  var BODY = '"Space Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif';
  var HAS_LS = false;
  try { HAS_LS = 'letterSpacing' in doc.createElement('canvas').getContext('2d'); } catch (e) { HAS_LS = false; }
  /* canvas state writes are memoised per context (c.__f / c.__ls): re-assigning ctx.font every text call re-parses the font string.
     The memo is cleared at the start of every paint, after a canvas resize and after ctx.restore() (see Visual.prototype.alloc / mount). */
  function font(c, size, weight, fam) { var f = (weight || 400) + ' ' + (Math.round(size * 10) / 10) + 'px ' + (fam || MONO); if (c.__f !== f) { c.font = f; c.__f = f; } }
  function track(c, px) { if (HAS_LS && c.__ls !== px) { c.letterSpacing = px + 'px'; c.__ls = px; } }
  /* static labels (never faded): one near-opaque light grey so thin 9-10px mono glyphs still reach >= 4.5:1 after anti-aliasing */
  var LBL = 'rgba(205,215,228,.94)';
  function txt(c, s, x, y, col, align, base) { var a = align || 'left', b = base || 'middle'; c.fillStyle = col; if (c.textAlign !== a) c.textAlign = a; if (c.textBaseline !== b) c.textBaseline = b; c.fillText(s, x, y); }
  /* a font size that scales with the visual but never gets unreadable (decorative text, >= 10px) */
  function fsz(v, base) { return clamp(base * v.s, 10, base * 1.75); }
  function fitText(c, opts, maxW) {           /* the first option that fits maxW (the last one when none does); set font and tracking first */
    for (var i = 0; i < opts.length - 1; i++) if (c.measureText(opts[i]).width <= maxW) return opts[i];
    return opts[opts.length - 1];
  }
  function wrap(c, text, maxW) {
    var words = String(text).split(' '), lines = [], cur = '';
    for (var i = 0; i < words.length; i++) {
      var test = cur ? cur + ' ' + words[i] : words[i];
      if (cur && c.measureText(test).width > maxW) { lines.push(cur); cur = words[i]; } else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  function typed(str, t, t0, cps) { return str.slice(0, clamp(Math.floor((t - t0) * cps), 0, str.length)); }

  /* ---------- canvas helpers ---------- */
  function rrp(c, x, y, w, h, r) {            /* rounded-rect sub-path (no beginPath) */
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r);
    c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
    c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r);
    c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath();
  }
  function fillRR(c, x, y, w, h, r, fill) { c.beginPath(); rrp(c, x, y, w, h, r); c.fillStyle = fill; c.fill(); }
  function strokeRR(c, x, y, w, h, r, stroke, lw) { c.beginPath(); rrp(c, x, y, w, h, r); c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
  function line(c, x1, y1, x2, y2) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); }
  function neon(c, col, width, a) {           /* stroke the current path twice: wide faint halo + crisp core */
    c.lineJoin = 'round'; c.lineCap = 'round';
    c.lineWidth = width * 3.4; c.strokeStyle = rgba(col, a * .16); c.stroke();
    c.lineWidth = width; c.strokeStyle = rgba(col, a); c.stroke();
  }
  /* corner brackets of a rect */
  function brackets(c, x, y, w, h, len, col, lw) {
    c.beginPath();
    c.moveTo(x, y + len); c.lineTo(x, y); c.lineTo(x + len, y);
    c.moveTo(x + w - len, y); c.lineTo(x + w, y); c.lineTo(x + w, y + len);
    c.moveTo(x + w, y + h - len); c.lineTo(x + w, y + h); c.lineTo(x + w - len, y + h);
    c.moveTo(x + len, y + h); c.lineTo(x, y + h); c.lineTo(x, y + h - len);
    c.strokeStyle = col; c.lineWidth = lw || 1.4; c.lineCap = 'square'; c.stroke();
  }

  /* soft glow sprites (one radial gradient per colour, drawn scaled) */
  var spriteCache = {};
  function sprite(col) {
    var k = (col[0] | 0) + ',' + (col[1] | 0) + ',' + (col[2] | 0);
    if (spriteCache[k]) return spriteCache[k];
    var cv = doc.createElement('canvas'); cv.width = cv.height = 64;
    var g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, rgba(col, 1)); gr.addColorStop(.22, rgba(col, .5)); gr.addColorStop(.55, rgba(col, .14)); gr.addColorStop(1, rgba(col, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (spriteCache[k] = cv);
  }
  function glow(c, x, y, r, col, a) { c.globalAlpha = clamp(a, 0, 1); c.drawImage(sprite(col), x - r, y - r, r * 2, r * 2); c.globalAlpha = 1; }

  /* small UI atoms shared by several types */
  function pill(c, x, y, w, h, col, a, fillA) { fillRR(c, x, y, w, h, h / 2, rgba(col, fillA == null ? .14 : fillA)); strokeRR(c, x + .5, y + .5, w - 1, h - 1, h / 2, rgba(col, a == null ? .7 : a), 1); }
  function winBar(v, c, x, y, w, bh, title) {  /* traffic-light bar */
    var s = v.s, r = Math.max(2, 2.4 * s), cy = y + bh / 2;
    var cols = [[255, 95, 109], [255, 189, 68], [52, 255, 140]];
    for (var i = 0; i < 3; i++) { c.beginPath(); c.arc(x + 8 * s + i * (r * 2 + 3.5 * s), cy, r, 0, TAU); c.fillStyle = rgba(cols[i], .55); c.fill(); }
    if (title) { font(c, fsz(v, 8.5), 400); txt(c, title, x + 8 * s + 3 * (r * 2 + 3.5 * s) + 4 * s, cy + .5, LBL, 'left'); }
    c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(x, y + bh - .5, w, 1);
  }

  /* ---------- type registry ---------- */
  var TYPES = {};
  function reg(name, def) { TYPES[name] = def; }
  /* which data-variant values each project-specific type can draw truthfully; anything else falls back to the generic visual */
  var ACCEPTS = {
    waveform: /speech|emotion|voice|audio/,
    'scan-grid': /cctv|crowd|camera|deepfake|df|cv-fund|yolo/,
    chat: /honeypot|telegram|astra|rag|-rag-|healthcare|policy/,
    network: /observab|trace|otel|jaeger/,
    bars: /box|house|insurance|medical/,
    qr: /qr|qr-/,
    game: /tetris|game/
  };

  /* =====================================================================
     WAVEFORM - speech emotion: mirrored voice bars that reshape per emotion,
     a scanning playhead, big emotion readout and a 7-class chip row.
     ===================================================================== */
  var EMO = [
    { n: 'HAPPY',    k: 'HAP', c: [52, 255, 140],  amp: .80, f: .46, sp: 2.2, jag: .12, shape: 0 },
    { n: 'SAD',      k: 'SAD', c: [78, 164, 255],  amp: .58, f: .15, sp: .55, jag: .03, shape: 1 },
    { n: 'ANGRY',    k: 'ANG', c: [255, 38, 104],  amp: .98, f: .62, sp: 3.3, jag: .44, shape: 0 },
    { n: 'SURPRISE', k: 'SUR', c: [0, 255, 255],   amp: .82, f: .30, sp: 1.7, jag: .10, shape: 2 },
    { n: 'FEAR',     k: 'FEA', c: [190, 100, 255], amp: .54, f: .86, sp: 4.2, jag: .30, shape: 0 },
    { n: 'DISGUST',  k: 'DIS', c: [255, 176, 64],  amp: .52, f: .30, sp: 1.2, jag: .12, shape: 3 },
    { n: 'NEUTRAL',  k: 'NEU', c: [196, 214, 238], amp: .48, f: .21, sp: .9,  jag: .05, shape: 0 }
  ];
  var EMO_SEG = 2.8;
  var EMO_CUM = (function () { var a = [0], s = 0; for (var i = 0; i < EMO.length; i++) { s += EMO[i].sp * EMO_SEG; a.push(s); } return a; })();

  function emoShape(kind, x) {
    if (kind === 1) return 1.25 - .85 * x;                                   /* sad: droops to the right */
    if (kind === 2) return .28 + 1.15 * Math.exp(-Math.pow((x - .5) * 4.6, 2)); /* surprise: one burst */
    if (kind === 3) return 1.2 - .7 * x + .25 * Math.sin(x * 19);            /* disgust: uneven */
    return 1;
  }

  reg('waveform', {
    still: EMO_SEG * .88,
    layout: function (v) {
      var s = v.s, w = v.w, h = v.h, L = v.L = {};
      L.pad = 12 * s;
      L.pitch = clamp(6.4 * s, 5, 11) * (v.lite ? 1.35 : 1);
      L.n = Math.max(14, Math.floor((w - L.pad * 2) / L.pitch));
      L.pitch = (w - L.pad * 2) / L.n;
      L.bw = Math.max(2, L.pitch * .56);
      L.cy = h * .515;
      L.half = h * .255;
      L.fsL = fsz(v, 9); L.fsBig = clamp(15 * s, 13, 24);
      L.chipH = clamp(14 * s, 14, 20);
      L.chipY = h - L.chipH - 8 * s;
    },
    draw: function (v, c, t) {
      var w = v.w, h = v.h, s = v.s, L = v.L, n = L.n;
      var seg = Math.floor(t / EMO_SEG), local = t - seg * EMO_SEG, p = local / EMO_SEG;
      var ci = mod(seg, EMO.length), cur = EMO[ci], prev = EMO[mod(seg - 1, EMO.length)];
      var m = sstep(0, .34, p);
      var amp = lerp(prev.amp, cur.amp, m) * (1 + .2 * v.hot);
      var f = lerp(prev.f, cur.f, m), jag = lerp(prev.jag, cur.jag, m);
      var col = mixc(prev.c, cur.c, m);
      var ph = Math.floor(seg / EMO.length) * EMO_CUM[EMO.length] + EMO_CUM[ci] + cur.sp * local;
      var sweep = clamp(p / .66, 0, 1), done = p >= .68;
      var cy = L.cy, half = L.half, x0 = L.pad;

      /* faint centre line + tick marks */
      c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(x0, cy - .5, w - L.pad * 2, 1);

      /* bars */
      var cut = sweep * n;
      var heights = v.st.hh || (v.st.hh = []);
      for (var i = 0; i < n; i++) {
        var x = i / (n - 1);
        var a = Math.sin(i * f + ph) * .5 + Math.sin(i * f * 2.3 - ph * 1.31 + 1.7) * .3 + Math.sin(i * f * .45 + ph * .6) * .2;
        var env = .5 + .5 * Math.sin(x * PI * 2.3 + ph * .3);
        var val = Math.abs(a) * (.34 + .66 * env) + jag * (vnoise(i * .9 + ph * 2.6) - .32);
        val *= lerp(emoShape(prev.shape, x), emoShape(cur.shape, x), m);
        heights[i] = Math.max(1.4 * s, Math.min(1, Math.max(0, val)) * amp * half * 1.5 + 1.6 * s);
        if (heights[i] > half * 1.05) heights[i] = half * 1.05;
      }
      var gr = c.createLinearGradient(0, cy - half, 0, cy + half);
      var hi = bright(col, .55);
      gr.addColorStop(0, rgba(col, .5)); gr.addColorStop(.36, rgba(col, 1)); gr.addColorStop(.5, rgba(hi, 1)); gr.addColorStop(.64, rgba(col, 1)); gr.addColorStop(1, rgba(col, .5));
      /* pending bars (dim), analysed bars (gradient), halo */
      c.beginPath();
      for (i = Math.floor(cut); i < n; i++) rrp(c, x0 + i * L.pitch + (L.pitch - L.bw) / 2, cy - heights[i], L.bw, heights[i] * 2, L.bw / 2);
      c.fillStyle = rgba(col, .24); c.fill();
      if (!v.lite) {
        c.beginPath();
        for (i = 0; i < Math.floor(cut) + 1 && i < n; i++) rrp(c, x0 + i * L.pitch + (L.pitch - L.bw) / 2 - 1.5, cy - heights[i] - 1.5, L.bw + 3, heights[i] * 2 + 3, (L.bw + 3) / 2);
        c.fillStyle = rgba(col, .1); c.fill();
      }
      c.beginPath();
      for (i = 0; i < Math.floor(cut) + 1 && i < n; i++) rrp(c, x0 + i * L.pitch + (L.pitch - L.bw) / 2, cy - heights[i], L.bw, heights[i] * 2, L.bw / 2);
      c.fillStyle = gr; c.fill();

      /* playhead */
      if (!done) {
        var px = x0 + sweep * (w - L.pad * 2);
        c.globalCompositeOperation = 'lighter';
        glow(c, px, cy, half * 1.1, col, .3);
        c.globalCompositeOperation = 'source-over';
        line(c, px, cy - half - 8 * s, px, cy + half + 8 * s);
        c.strokeStyle = rgba(bright(col, .7), .95); c.lineWidth = 1.2; c.stroke();
      }

      /* readout */
      font(c, L.fsL, 700); track(c, 1.2);
      txt(c, 'EMOTION', L.pad, 14 * s + 2, LBL, 'left');
      track(c, 0);
      var label, lc;
      if (done) { label = cur.n; lc = col; }
      else { label = 'LISTENING' + '...'.slice(0, 1 + Math.floor(t * 3) % 3); lc = [196, 214, 238]; }
      font(c, L.fsBig, 800, DISP);
      c.save();
      if (done) { c.shadowColor = rgba(lc, .85); c.shadowBlur = 10 * s; }
      var flick = done && p < .76 ? (Math.floor(t * 30) % 2 ? .55 : 1) : 1;
      txt(c, label, L.pad, 14 * s + 2 + L.fsBig * .95, rgba(done ? bright(lc, .15) : lc, (done ? 1 : .7) * flick), 'left');
      c.restore();

      /* mic / rec tag */
      var rx = w - L.pad;
      font(c, L.fsL, 700); track(c, 1.2);
      txt(c, 'MIC', rx, 14 * s + 2, LBL, 'right');
      track(c, 0);
      var mw = c.measureText('MIC').width + 3 * 1.2;
      c.beginPath(); c.arc(rx - mw - 7 * s, 14 * s + 2, 2.6 * s, 0, TAU);
      c.fillStyle = rgba(PAL.red, .55 + .45 * pulse(t, .9)); c.fill();

      /* class chips */
      var gap = 3 * s, cw = (w - L.pad * 2 - gap * (EMO.length - 1)) / EMO.length;
      font(c, clamp(8.5 * s, 8.5, 14), 700); track(c, .6);
      for (i = 0; i < EMO.length; i++) {
        var on = done && i === ci, e = EMO[i], cx = L.pad + i * (cw + gap);
        fillRR(c, cx, L.chipY, cw, L.chipH, 3, on ? rgba(e.c, .2) : 'rgba(255,255,255,.03)');
        strokeRR(c, cx + .5, L.chipY + .5, cw - 1, L.chipH - 1, 3, on ? rgba(e.c, .95) : 'rgba(255,255,255,.14)', 1);
        txt(c, e.k, cx + cw / 2, L.chipY + L.chipH / 2 + .5, on ? rgba(bright(e.c, .25), 1) : 'rgba(163,173,194,.72)', 'center');
        if (on) { c.globalCompositeOperation = 'lighter'; glow(c, cx + cw / 2, L.chipY + L.chipH / 2, cw * .8, e.c, .28); c.globalCompositeOperation = 'source-over'; }
      }
      track(c, 0);
    }
  });

  /* =====================================================================
     SCAN-GRID - computer vision.  Three variants (by data-variant):
       cctv     (default)  heat-cell camera feed, detection boxes, crowd counter vs limit, LIVE tag, class sample flash
       yolo     (cv-fundamentals / yolo)  gray -> blur -> detect pipeline over a cell scene + every-5th-frame strip
       df       (deepfake)  frame strip with face glyphs, scan beam, REAL / FAKE verdicts + confidence plot
     ===================================================================== */
  var SG_WHITE = [222, 230, 242];

  function sgLayout(v, top, bot, target) {
    var s = v.s, L = v.L;
    L.pad = 10 * s;
    L.fx = L.pad; L.fy = top; L.fw = v.w - L.pad * 2; L.fh = v.h - top - bot;
    var cols = clamp(Math.round(L.fw / (target * s)), 18, 46);
    if (v.lite) cols = Math.max(16, Math.round(cols * .72));
    L.cols = cols; L.cs = L.fw / cols;
    L.rows = Math.max(6, Math.floor(L.fh / L.cs));
    L.gy = L.fy + (L.fh - L.rows * L.cs) / 2;
    L.heat = new Float32Array(cols * L.rows);
  }
  function addBlob(L, cx, cy, a, b, val) {
    var i0 = Math.max(0, Math.floor(cx - a - 1)), i1 = Math.min(L.cols - 1, Math.ceil(cx + a + 1));
    var j0 = Math.max(0, Math.floor(cy - b - 1)), j1 = Math.min(L.rows - 1, Math.ceil(cy + b + 1));
    for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++) {
      var dx = (i + .5 - cx) / a, dy = (j + .5 - cy) / b, d = Math.sqrt(dx * dx + dy * dy);
      var hv = clamp(1.4 - d, 0, 1) * val, k = j * L.cols + i;
      if (hv > L.heat[k]) L.heat[k] = hv;
    }
  }
  function addRect(L, x, y, rw, rh, body, edge) {
    var i0 = Math.max(0, Math.floor(x)), i1 = Math.min(L.cols - 1, Math.ceil(x + rw) - 1);
    var j0 = Math.max(0, Math.floor(y)), j1 = Math.min(L.rows - 1, Math.ceil(y + rh) - 1);
    for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++) {
      var e = (i === i0 || i === i1) ? edge : body;
      var k = j * L.cols + i; if (e > L.heat[k]) L.heat[k] = e;
    }
  }
  /* cells: base dots then 4 heat buckets (tone), or grayscale / blurred raster for the pipeline demo */
  function drawCells(c, L, col, mode, boost) {
    var cols = L.cols, rows = L.rows, cs = L.cs, g = Math.max(.5, cs * .09), sz = cs - g * 2, heat = L.heat, i, j, k, hv;
    var x0 = L.fx, y0 = L.gy;
    if (mode === 'blur') {
      c.beginPath();
      for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) c.rect(x0 + i * cs + g, y0 + j * cs + g, sz, sz);
      c.fillStyle = 'rgba(255,255,255,.045)'; c.fill();
      c.globalCompositeOperation = 'lighter';
      for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) { hv = heat[j * cols + i]; if (hv > .12) glow(c, x0 + (i + .5) * cs, y0 + (j + .5) * cs, cs * 1.7, col, hv * .34); }
      c.globalCompositeOperation = 'source-over';
      return;
    }
    c.beginPath();
    for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) if (heat[j * cols + i] <= .12) c.rect(x0 + i * cs + g, y0 + j * cs + g, sz, sz);
    c.fillStyle = 'rgba(255,255,255,.065)'; c.fill();
    var th = [.12, .4, .7, .92], al = [.24, .55, .85, 1], top = bright(col, mode === 'gray' ? 0 : .55);
    for (var b = 0; b < 4; b++) {
      c.beginPath();
      for (j = 0; j < rows; j++) for (i = 0; i < cols; i++) {
        hv = heat[j * cols + i];
        if (hv > th[b] && (b === 3 || hv <= th[b + 1])) c.rect(x0 + i * cs + g, y0 + j * cs + g, sz, sz);
      }
      c.fillStyle = rgba(b === 3 ? top : col, Math.min(1, al[b] * (boost || 1))); c.fill();
    }
  }
  function liveTag(v, c, xr, y, t) {
    var s = v.s; font(c, fsz(v, 9), 700); track(c, 1.2);
    var tw = c.measureText('LIVE').width;
    txt(c, 'LIVE', xr, y, 'rgba(232,241,255,.92)', 'right'); track(c, 0);
    c.beginPath(); c.arc(xr - tw - 6 * s, y, 2.7 * s, 0, TAU);
    c.fillStyle = rgba(PAL.red, .5 + .5 * pulse(t, .8)); c.fill();
    c.globalCompositeOperation = 'lighter'; glow(c, xr - tw - 6 * s, y, 8 * s, PAL.red, .35 * pulse(t, .8)); c.globalCompositeOperation = 'source-over';
  }
  /* deepfake: the app analyses an UPLOADED clip, so no red REC dot and no 'LIVE' */
  function clipTag(v, c, xr, y) {
    var s = v.s; font(c, fsz(v, 9), 700); track(c, 1.2);
    var lab = 'CLIP.MP4', tw = c.measureText(lab).width;
    txt(c, lab, xr, y, LBL, 'right'); track(c, 0);
    var ix = xr - tw - 12 * s, ih = 7 * s;
    strokeRR(c, ix - 4 * s, y - ih / 2, 8 * s, ih, 1.5, rgba(bright(v.tone, .3), .95), 1.1);
    c.beginPath(); c.moveTo(ix - 1 * s, y - 1.8 * s); c.lineTo(ix + 2 * s, y); c.lineTo(ix - 1 * s, y + 1.8 * s); c.closePath(); c.fillStyle = rgba(bright(v.tone, .3), .95); c.fill();
  }
  function tcode(t, base) { var sec = base + Math.floor(t), mm = Math.floor(sec / 60) % 60, ss = sec % 60; return '00:' + (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss; }

  /* ---------- CCTV ---------- */
  function cctvInit(v) {
    var r = rng(hashStr('cctv' + v.variant)), pp = [];
    for (var k = 0; k < 8; k++) {
      var lane = .4 + r() * .45;
      pp.push({ dir: r() < .5 ? 1 : -1, dur: 6.5 + r() * 4, gap: 4.5 + r() * 6.5, off: r() * 30, lane: lane, sc: .7 + .55 * lane, bob: r() * 6 });
    }
    v.st.people = pp; v.st.alive = [];
  }
  function cctvScene(v, t) {
    var L = v.L, pp = v.st.people, al = v.st.alive, count = 0, cols = L.cols;
    al.length = 0; L.heat.fill(0);
    for (var k = 0; k < pp.length; k++) {
      var p = pp[k], per = p.dur + p.gap, local = mod(t + p.off, per);
      if (local >= p.dur) continue;
      var u = local / p.dur, x = p.dir > 0 ? lerp(-2, cols + 2, u) : lerp(cols + 2, -2, u);
      var y = p.lane * L.rows + Math.sin(t * 2.6 + p.bob) * .12;
      var sw = Math.sin(t * 5 + p.bob) * .35 * p.sc;                 /* leg swing */
      addBlob(L, x, y - .7 * p.sc, 1.05 * p.sc, 1.25 * p.sc, 1);      /* torso */
      addBlob(L, x - .45 * p.sc + sw, y + 1.45 * p.sc, .45 * p.sc, 1.0 * p.sc, .8);
      addBlob(L, x + .45 * p.sc - sw, y + 1.45 * p.sc, .45 * p.sc, 1.0 * p.sc, .8);
      addBlob(L, x, y - 2.25 * p.sc, .62 * p.sc, .62 * p.sc, 1);      /* head */
      var inside = x > .8 && x < cols - .8;
      if (inside) { count++; al.push({ x: x, y: y, sc: p.sc, k: k, dir: p.dir }); }
    }
    return count;
  }
  var CCTV_LIMIT = 5;
  function cctvStill(v) {
    if (!v.st.people) cctvInit(v);
    var best = 8, bt = 8, tries = [];
    for (var t = 6; t < 90; t += .5) { var cnt = cctvScene(v, t); if (cnt > CCTV_LIMIT && Math.floor(t / 3) % 5 !== 3 && fract(t / 3) > .2) { bt = t; break; } if (cnt > best) { best = cnt; bt = t; } }
    return bt;
  }
  function cctvDraw(v, c, t) {
    var L = v.L, s = v.s, w = v.w, h = v.h, tone = v.tone, hot = v.hot;
    var count = cctvScene(v, t), over = count > CCTV_LIMIT; v.st.count = count;
    var flash = over ? .5 + .5 * Math.sin(t * 9) : 0;
    var col = over ? mixc(tone, PAL.amber, .55 + .25 * flash) : tone;
    drawCells(c, L, col, 'tone', 1 + .18 * hot);

    /* scan line */
    var sy = L.fy + fract(t / 4.2) * L.fh;
    c.globalCompositeOperation = 'lighter'; glow(c, w / 2, sy, L.fw * .5, tone, .07);
    c.globalCompositeOperation = 'source-over';
    line(c, L.fx, sy, L.fx + L.fw, sy); c.strokeStyle = rgba(bright(tone, .5), .32); c.lineWidth = 1; c.stroke();

    /* detection boxes. Brackets stay between the header row and the footer row (so none crosses the CLASS chip).
       Two passes: first every box is laid out and its bracket drawn, then the P01 labels are placed last, on top. A label may only use a spot
       that is clear of every other person's box (bracket lines and body cells), of the other labels and of the header and footer rows.
       The spots tried are above the box, one step higher, below it and one step lower; a label that finds no free spot is skipped, so no text overlaps. */
    var al = v.st.alive, fp = fsz(v, 8.5), lh = fp + 3, i, placed = [], boxes = [];
    var hty = 13 * s + 1, fty = h - 11 * s;
    var headBot = hty + Math.max(8, clamp(14 * s, 12, 20) * .5) + 2, boxTop = headBot + lh + 1, boxBot = fty - 10;
    function hit(a, b, m) { return a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m; }
    font(c, fp, 700);
    for (i = 0; i < al.length; i++) {
      var a = al[i];
      var bx = L.fx + a.x * L.cs, by = L.gy + a.y * L.cs;
      var bw = (1.7 * a.sc + 1.5) * L.cs, bh = Math.min((4.2 * a.sc + 1.2) * L.cs, Math.max(boxBot - boxTop, 12));
      var lag = a.dir * .12 * L.cs;
      var x = bx - bw / 2 - lag, y = clamp(by - bh / 2, boxTop, Math.max(boxTop, boxBot - bh));
      var bc = over && i % 2 === 0 ? PAL.amber : bright(tone, .12);
      boxes.push({ x: x, y: y, w: bw, h: bh, bc: bc, k: a.k });
      brackets(c, x, y, bw, bh, Math.min(bw, bh) * .3, rgba(bc, .95), 1.4);
    }
    for (i = 0; i < boxes.length; i++) {
      var bo = boxes[i], id = 'P' + (bo.k + 1 < 10 ? '0' : '') + (bo.k + 1), lw = c.measureText(id).width + 6, lx = clamp(bo.x, 2, w - lw - 2);
      var tries = [bo.y - lh - 1, bo.y - 2 * lh - 2, bo.y + bo.h + 1, bo.y + bo.h + lh + 2];
      for (var q = 0; q < tries.length; q++) {
        var rc = { x: lx, y: tries[q], w: lw, h: lh };
        if (rc.y < headBot || rc.y + rc.h > fty - 9) continue;
        var free = true;
        for (var m = 0; m < boxes.length && free; m++) if (m !== i && hit(rc, boxes[m], 3)) free = false;
        for (m = 0; m < placed.length && free; m++) if (hit(rc, placed[m], 3)) free = false;
        if (!free) continue;
        placed.push(rc);
        fillRR(c, rc.x, rc.y, rc.w, rc.h, 2, rgba(bo.bc, .96));
        txt(c, id, rc.x + 3, rc.y + lh / 2 - .5, 'rgba(4,6,12,.95)', 'left');
        break;
      }
    }

    /* header: crowd counter vs limit */
    var ty = 13 * s + 1;
    font(c, fsz(v, 8.5), 700); track(c, 1.2);
    txt(c, 'CROWD', L.pad, ty, LBL, 'left'); track(c, 0);
    var cw = c.measureText('CROWD').width + 5 * 1.2;
    font(c, clamp(14 * s, 12, 20), 800, DISP);
    c.save(); c.shadowColor = rgba(over ? PAL.amber : tone, .8); c.shadowBlur = 8 * s;
    txt(c, (count < 10 ? '0' : '') + count, L.pad + cw + 6 * s, ty + 1, over ? rgba(PAL.amber, 1) : '#fff', 'left'); c.restore();
    var nx = L.pad + cw + 6 * s + c.measureText('00').width + 7 * s;
    for (i = 0; i < 8; i++) {
      var on = i < count, over1 = i >= CCTV_LIMIT, px = nx + i * 5.2 * s;
      c.fillStyle = on ? rgba(over1 ? PAL.amber : tone, .95) : 'rgba(255,255,255,.14)';
      c.fillRect(px, ty - 4 * s, 3.4 * s, 8 * s);
    }
    if (over) {
      font(c, fsz(v, 8.5), 700); track(c, 1);
      var aw = c.measureText('ALERT').width + 10;
      var ax = w / 2 - aw / 2 + 18 * s; if (ax < nx + 8 * 5.2 * s + 4) ax = nx + 8 * 5.2 * s + 6;
      if (ax + aw < w - 60 * s) { fillRR(c, ax, ty - 7, aw, 14, 3, rgba(PAL.amber, .2 + .15 * flash)); strokeRR(c, ax + .5, ty - 6.5, aw - 1, 13, 3, rgba(PAL.amber, .9), 1); txt(c, 'ALERT', ax + aw / 2 + .5, ty + .5, rgba(PAL.amber, 1), 'center'); }
      track(c, 0);
    }
    liveTag(v, c, w - L.pad, ty, t);

    /* footer */
    var fy = h - 11 * s;
    font(c, fsz(v, 8.5), 400);
    txt(c, 'CAM 02  REC ' + tcode(t, 12 * 60 + 48), L.pad, fy, 'rgba(163,173,194,.82)', 'left');
    var si = Math.floor(t / 3), sf = fract(t / 3), crime = si % 5 === 3, lab = crime ? 'VANDALISM' : 'NORMAL', lc = crime ? PAL.amber : PAL.green;
    font(c, fsz(v, 8.5), 700); track(c, .8);
    var lw2 = c.measureText(lab).width + 12, kx = w - L.pad - lw2;
    fillRR(c, kx, fy - 7, lw2, 14, 3, rgba(lc, .14)); strokeRR(c, kx + .5, fy - 6.5, lw2 - 1, 13, 3, rgba(lc, .7), 1);
    txt(c, lab, kx + lw2 / 2 + .4, fy + .5, rgba(bright(lc, .2), 1), 'center'); track(c, 0);
    font(c, fsz(v, 8.5), 400);
    txt(c, 'CLASS', kx - 6, fy + .5, LBL, 'right');
    if (sf < .16) { var fa = 1 - sf / .16; strokeRR(c, L.fx - 2, L.fy - 2, L.fw + 4, L.fh + 4, 3, rgba(crime ? PAL.amber : bright(tone, .4), .8 * fa), 1.5); }
    if (over) strokeRR(c, L.fx - 2, L.fy - 2, L.fw + 4, L.fh + 4, 3, rgba(PAL.amber, .18 + .3 * flash), 1.5);
  }

  /* ---------- YOLO pipeline ---------- */
  var YOLO_STAGE = 3.6, YOLO_NAMES = ['GRAY', 'BLUR', 'DETECT'];
  function yoloInit(v) {
    var r = rng(hashStr('yolo' + v.variant)), O = [];
    function add(kind, n, lane, w, h, dir, sp) { for (var i = 0; i < n; i++) O.push({ kind: kind, lane: lane, w: w * (.9 + r() * .2), h: h, dir: dir, sp: sp * (.8 + r() * .4), ph: (i + r() * .6) / n }); }
    add('car', 3, .56, 5, 2.4, 1, .085);
    add('truck', 1, .56, 8.5, 3.1, 1, .07);
    add('car', 3, .74, 5, 2.4, -1, .1);
    add('person', 4, .9, 1.4, 3.5, 1, .03);
    v.st.objs = O; v.st.vis = [];
    var B = [], x = 0; while (x < 60) { var bw = 2 + Math.floor(r() * 4); B.push({ x: x, w: bw, h: 2 + Math.floor(r() * 4), win: r() }); x += bw + (r() < .4 ? 1 : 0); }
    v.st.blds = B;
  }
  function yoloScene(v, t) {
    var L = v.L, O = v.st.objs, vis = v.st.vis, cols = L.cols, rows = L.rows, i, j, k;
    vis.length = 0; L.heat.fill(0);
    var B = v.st.blds, horizon = Math.round(rows * .3);
    for (k = 0; k < B.length; k++) {
      var b = B[k], bh = Math.min(b.h, horizon - 1);
      addRect(L, b.x, horizon - bh, b.w, bh, .15, .17);
      if (b.w > 2) { var wi = Math.floor(b.x + 1), wj = horizon - bh + 1; if (wj < horizon && wi < cols && hashN(Math.floor(t * .4) + k * 13) < .55) { var kk = wj * cols + wi; if (kk >= 0 && kk < L.heat.length) L.heat[kk] = Math.max(L.heat[kk], .5); } }
    }
    var roadTop = Math.round(rows * .46);
    for (j = roadTop; j < rows; j++) { if (j === roadTop || j === Math.round(rows * .65) || j === rows - 1) for (i = 0; i < cols; i++) if ((i + Math.floor(t * 3)) % 4 < 2 && j !== rows - 1) L.heat[j * cols + i] = Math.max(L.heat[j * cols + i], .14); }
    for (k = 0; k < O.length; k++) {
      var o = O[k], u = fract(o.ph + o.dir * o.sp * t);
      var x = o.dir > 0 ? lerp(-o.w, cols + 1, u) : lerp(cols + 1, -o.w, u);
      var y = o.lane * rows - o.h / 2;
      if (o.kind === 'person') { var cx = x + o.w / 2, cy = y + o.h / 2 + Math.abs(Math.sin(t * 6 + k)) * .12; addBlob(L, cx, cy, .6, 1.5, 1); addBlob(L, cx, cy - 1.55, .5, .5, 1); }
      else { addRect(L, x, y, o.w, o.h, .62, 1); addRect(L, x + 1, y - .6, o.w - 2, .8, .45, .45); }
      if (x > -.5 && x + o.w < cols + .5) vis.push({ o: o, x: x, y: y });
    }
  }
  function yoloDraw(v, c, t) {
    var L = v.L, s = v.s, w = v.w, h = v.h, tone = v.tone;
    var stage = Math.floor(t / YOLO_STAGE) % 3, u = fract(t / YOLO_STAGE) , wipe = u < .2 ? u / .2 : 1;
    var prevStage = mod(stage - 1, 3);
    yoloScene(v, t);
    function raster(st, clip0, clip1) {
      c.save(); c.beginPath(); c.rect(clip0, 0, clip1 - clip0, h); c.clip();
      if (st === 0) drawCells(c, L, SG_WHITE, 'gray', .9);
      else if (st === 1) drawCells(c, L, SG_WHITE, 'blur');
      else drawCells(c, L, tone, 'tone', 1 + .15 * v.hot);
      c.restore();
    }
    var wx = L.fx + wipe * L.fw;
    if (wipe < 1) { raster(stage, 0, wx); raster(prevStage, wx, w); c.globalCompositeOperation = 'lighter'; glow(c, wx, L.fy + L.fh / 2, L.fh * .55, bright(tone, .3), .35); c.globalCompositeOperation = 'source-over'; line(c, wx, L.fy, wx, L.fy + L.fh); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.2; c.stroke(); }
    else raster(stage, 0, w);

    /* detections (stage 2, fade in) */
    var da = stage === 2 ? sstep(.2, .45, u) : (stage === 0 && wipe < 1 ? 1 - sstep(0, .5, wipe) : 0);
    if (da > .01) {
      var fp = fsz(v, 8.5), vis = v.st.vis, cs = L.cs;
      font(c, fp, 700);
      for (var i = 0; i < vis.length; i++) {
        var q = vis[i], o = q.o, bc = o.kind === 'person' ? PAL.cyan : (o.kind === 'truck' ? PAL.purple : tone);
        var bx = L.fx + (q.x - .4) * cs, by = L.gy + (q.y - (o.kind === 'person' ? .2 : .9)) * cs, bw = (o.w + .8) * cs, bh = (o.h + (o.kind === 'person' ? .5 : 1.4)) * cs;
        c.globalAlpha = da;
        brackets(c, bx, by, bw, bh, Math.min(bw, bh) * .3, rgba(bright(bc, .15), 1), 1.3);
        var lw = c.measureText(o.kind).width + 6;
        fillRR(c, bx, by - fp - 3, lw, fp + 3, 2, rgba(bc, .92));
        txt(c, o.kind, bx + 3, by - fp / 2 - 1.5, 'rgba(4,6,12,.95)', 'left');
        c.globalAlpha = 1;
      }
    }

    /* pipeline chips */
    var ty = 13 * s + 1, cx = L.pad; font(c, fsz(v, 8.5), 700); track(c, .8);
    for (var k = 0; k < 3; k++) {
      var nm = YOLO_NAMES[k], tw = c.measureText(nm).width + 10, on = k === stage;
      var cc = k === 2 ? tone : SG_WHITE;
      fillRR(c, cx, ty - 7, tw, 14, 3, on ? rgba(cc, .2) : 'rgba(255,255,255,.03)');
      strokeRR(c, cx + .5, ty - 6.5, tw - 1, 13, 3, on ? rgba(cc, .95) : 'rgba(255,255,255,.14)', 1);
      txt(c, nm, cx + tw / 2 + .4, ty + .5, on ? rgba(bright(cc, .2), 1) : LBL, 'center');
      cx += tw;
      if (k < 2) { txt(c, '>', cx + 4 * s, ty + .5, 'rgba(163,173,194,.5)', 'center'); cx += 8 * s; }
    }
    track(c, 0);
    font(c, fsz(v, 8.5), 400);
    var frameNo = 5 * Math.floor(t * 1.5) + 5;
    txt(c, 'FRAME ' + ('0000' + frameNo).slice(-4), w - L.pad, ty + .5, LBL, 'right');

    /* filmstrip: every 5th frame is sampled */
    var n = 20, sx = L.pad, sw = (w - L.pad * 2) * .62, fy = h - 13 * s, fh = 8 * s, gap = 2, fw = (sw - gap * (n - 1)) / n;
    var ph = Math.floor(t * 8) % n;
    for (i = 0; i < n; i++) {
      var sm = i % 5 === 0, act = i === ph;
      fillRR(c, sx + i * (fw + gap), fy - fh / 2, fw, fh, 1.5, sm ? rgba(tone, act ? .85 : .4) : (act ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.1)'));
      if (sm) strokeRR(c, sx + i * (fw + gap) + .5, fy - fh / 2 + .5, fw - 1, fh - 1, 1.5, rgba(tone, .9), 1);
    }
    font(c, fsz(v, 8.5), 400);
    txt(c, 'EVERY 5TH FRAME', w - L.pad, fy + .5, LBL, 'right');
  }

  /* ---------- DEEPFAKE ---------- */
  var DF_CYC = 8.4, DF_SCAN = 5.4;
  function dfFace(c, cx, cy, fw, fh, col, a) {
    var rx = fw * .2, ry = fw * .26;
    c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, TAU); c.strokeStyle = rgba(col, a); c.lineWidth = 1.2; c.stroke();
    c.fillStyle = rgba(col, a * .09); c.fill();
    c.beginPath(); c.moveTo(cx - fw * .42, cy + fh * .5 + 2); c.bezierCurveTo(cx - fw * .4, cy + ry * 1.25, cx - rx * 1.2, cy + ry * 1.05, cx - rx * .35, cy + ry * .98);
    c.moveTo(cx + fw * .42, cy + fh * .5 + 2); c.bezierCurveTo(cx + fw * .4, cy + ry * 1.25, cx + rx * 1.2, cy + ry * 1.05, cx + rx * .35, cy + ry * .98);
    c.strokeStyle = rgba(col, a * .75); c.stroke();
    c.fillStyle = rgba(col, a); c.beginPath(); c.arc(cx - rx * .42, cy - ry * .1, 1.5, 0, TAU); c.arc(cx + rx * .42, cy - ry * .1, 1.5, 0, TAU); c.fill();
    c.beginPath(); c.moveTo(cx, cy - ry * .05); c.lineTo(cx - rx * .1, cy + ry * .22); c.lineTo(cx + rx * .1, cy + ry * .22);
    c.moveTo(cx - rx * .3, cy + ry * .5); c.quadraticCurveTo(cx, cy + ry * .66, cx + rx * .3, cy + ry * .5); c.strokeStyle = rgba(col, a * .8); c.lineWidth = 1; c.stroke();
  }
  function dfMesh(c, cx, cy, fw, col, t, a) {
    var rx = fw * .2, ry = fw * .26, pts = [], i, ang;
    for (i = 0; i < 9; i++) { ang = PI * (.15 + i * .088) ; pts.push([cx + Math.cos(ang) * rx * 1.04, cy + Math.sin(ang) * ry * 1.04]); }
    pts.push([cx - rx * .42, cy - ry * .1], [cx + rx * .42, cy - ry * .1], [cx, cy + ry * .2], [cx - rx * .3, cy + ry * .5], [cx, cy + ry * .6], [cx + rx * .3, cy + ry * .5], [cx, cy - ry * .8]);
    c.beginPath();
    for (i = 0; i < pts.length; i++) for (var j = i + 1; j < pts.length; j++) { var dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1]; if (dx * dx + dy * dy < (rx * 1.05) * (rx * 1.05)) { c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[j][0], pts[j][1]); } }
    c.strokeStyle = rgba(col, a * .55); c.lineWidth = .8; c.stroke();
    c.fillStyle = rgba(bright(col, .4), a);
    c.beginPath(); for (i = 0; i < pts.length; i++) { c.moveTo(pts[i][0] + 1.4, pts[i][1]); c.arc(pts[i][0], pts[i][1], 1.4, 0, TAU); } c.fill();
  }
  function dfDraw(v, c, t) {
    var L = v.L, s = v.s, w = v.w, h = v.h, tone = v.tone, hot = v.hot;
    var ci = Math.floor(t / DF_CYC), local = t - ci * DF_CYC, bu = clamp(local / DF_SCAN, 0, 1), n = L.n;
    var mostlyFake = ci % 2 === 0, M = 28, FAKE = PAL.magenta, REAL = PAL.green;
    var vals = v.st.vals || (v.st.vals = []);
    for (var j = 0; j < M; j++) vals[j] = clamp((mostlyFake ? .68 : .3) + (vnoise(j * .45 + ci * 17.3 + hashStr(v.variant) % 50) - .5) * .62, .06, .94);
    var fx = L.pad, fy = L.frameY, fw = (w - L.pad * 2 - L.gap * (n - 1)) / n, fh = L.frameH;
    var fakeCount = 0, doneCount = 0;
    var fp = fsz(v, 8.5);
    for (var i = 0; i < n; i++) {
      var x = fx + i * (fw + L.gap), p = clamp(bu * n - i, 0, 1), done = p >= 1, scanning = p > 0 && p < 1;
      var val = vals[Math.round((i + .5) / n * (M - 1))], fake = val > .5;
      if (done) { doneCount++; if (fake) fakeCount++; }
      var edge = done ? (fake ? FAKE : REAL) : (scanning ? bright(tone, .35) : SG_WHITE);
      fillRR(c, x, fy, fw, fh, 4, 'rgba(8,10,18,.82)');
      c.save(); c.beginPath(); rrp(c, x, fy, fw, fh, 4); c.clip();
      var fc = done && fake ? FAKE : SG_WHITE;
      dfFace(c, x + fw / 2, fy + fh * .44, fw, fh, fc, done && fake ? .7 : .5);
      if (done && fake) {
        dfMesh(c, x + fw / 2, fy + fh * .44, fw, FAKE, t, .9);
        var gy = fy + ((t * 40 + i * 31) % fh);
        c.fillStyle = rgba(FAKE, .16); c.fillRect(x, gy, fw, 2.2 * s);
        c.fillStyle = rgba(FAKE, .1 + .06 * Math.sin(t * 7 + i)); c.fillRect(x + (Math.sin(t * 11 + i) * 2.5), fy + fh * .55, fw, 3 * s);
      } else if (done) { c.fillStyle = rgba(REAL, .05); c.fillRect(x, fy, fw, fh); }
      if (scanning) { c.fillStyle = rgba(tone, .08); c.fillRect(x, fy, fw * p, fh); }
      c.restore();
      strokeRR(c, x + .5, fy + .5, fw - 1, fh - 1, 4, rgba(edge, done || scanning ? .9 : .2), done || scanning ? 1.4 : 1);
      if (scanning) brackets(c, x - 2, fy - 2, fw + 4, fh + 4, 7, rgba(bright(tone, .4), 1), 1.4);
      /* label row */
      var ly = fy + fh + L.labH / 2 + 2;
      var lab = done ? (fake ? 'FAKE' : 'REAL') : (scanning ? 'SCAN' : '---');
      font(c, fp, 700); track(c, .8);
      txt(c, lab, x + fw / 2, ly, done ? rgba(bright(fake ? FAKE : REAL, .2), 1) : LBL, 'center'); track(c, 0);
    }
    /* beam */
    if (bu < 1 && bu > 0) {
      var bx = fx + bu * (w - L.pad * 2);
      c.globalCompositeOperation = 'lighter'; glow(c, bx, fy + fh / 2, fh * .7, tone, .35); c.globalCompositeOperation = 'source-over';
      line(c, bx, fy - 3, bx, fy + fh + 2); c.strokeStyle = rgba(bright(tone, .7), .95); c.lineWidth = 1.3; c.stroke();
    }
    /* confidence plot (P(fake) per frame sample) */
    var px0 = L.pad, pw = w - L.pad * 2, py0 = L.plotY, ph = L.plotH;
    fillRR(c, px0, py0, pw, ph, 3, 'rgba(255,255,255,.03)');
    /* the P(FAKE) caption owns the left end of the plot: the midline and the sparkline both start after it, so no line runs through the text
       (a short plot has no room for the caption at all) */
    var capOn = ph >= 26, capW = 0;
    if (capOn) { font(c, fsz(v, 8.5), 400); capW = c.measureText('P(FAKE)').width + 12; }
    var sx0 = px0 + 4 + capW, sw2 = pw - 8 - capW;
    c.setLineDash([3, 3]); line(c, px0 + capW, py0 + ph * .5, px0 + pw, py0 + ph * .5); c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 1; c.stroke(); c.setLineDash([]);
    var upto = Math.floor(bu * (M - 1)), vv;
    if (upto > 0 || bu >= 1) {
      c.beginPath();
      for (j = 0; j <= upto; j++) { var X = sx0 + sw2 * (j / (M - 1)), Y = py0 + ph - 3 - vals[j] * (ph - 6); if (j) c.lineTo(X, Y); else c.moveTo(X, Y); }
      neon(c, vals[upto] > .5 ? FAKE : REAL, 1.4, .95);
      var lx = sx0 + sw2 * (upto / (M - 1)), ly2 = py0 + ph - 3 - vals[upto] * (ph - 6);
      c.beginPath(); c.arc(lx, ly2, 2.4, 0, TAU); c.fillStyle = '#fff'; c.fill();
    }
    if (capOn) { font(c, fsz(v, 8.5), 400); txt(c, 'P(FAKE)', px0 + 5, py0 + ph / 2, LBL, 'left'); }

    /* header */
    var ty = 13 * s + 1;
    font(c, fsz(v, 8.5), 700); track(c, 1.2);
    txt(c, bu < 1 ? 'ANALYSING FRAMES' + '...'.slice(0, 1 + Math.floor(t * 3) % 3) : 'FRAMES SCORED', L.pad, ty, LBL, 'left'); track(c, 0);
    if (bu >= 1) {
      var verdict = fakeCount * 2 > doneCount, vc = verdict ? FAKE : REAL, vt = verdict ? 'FAKE' : 'REAL';
      var show = local > DF_SCAN + .15;
      if (show) {
        font(c, clamp(13 * s, 12, 19), 800, DISP);
        c.save(); c.shadowColor = rgba(vc, .85); c.shadowBlur = 9 * s;
        txt(c, vt, w - L.pad, ty + 1, rgba(bright(vc, .15), 1), 'right'); c.restore();
        font(c, fsz(v, 8.5), 700); track(c, 1);
        txt(c, 'VERDICT', w - L.pad - c.measureText(vt).width - 22 * s, ty + .5, LBL, 'right'); track(c, 0);
      }
    } else clipTag(v, c, w - L.pad, ty);
    if (hot > .05) { c.globalAlpha = hot * .5; strokeRR(c, 1, 1, w - 2, h - 2, 2, rgba(tone, .6), 1); c.globalAlpha = 1; }
  }

  reg('scan-grid', {
    still: function (v) { return v.st.kind === 'cctv' ? cctvStill(v) : (v.st.kind === 'yolo' ? YOLO_STAGE * 2 + 2.2 : DF_SCAN + 1.5); },
    init: function (v) {
      var vr = v.variant;
      v.st.kind = /deepfake|df/.test(vr) ? 'df' : (/cv-fund|yolo/.test(vr) ? 'yolo' : 'cctv');
      if (v.st.kind === 'cctv') cctvInit(v); else if (v.st.kind === 'yolo') yoloInit(v);
    },
    layout: function (v) {
      var s = v.s, h = v.h, w = v.w, L = v.L = {};
      if (v.st.kind === 'df') {
        L.pad = 10 * s; L.n = w / h > 2.2 ? 5 : (w < 250 ? 3 : 4); L.gap = 6 * s;
        L.frameY = 26 * s; L.labH = 15 * s; L.plotH = clamp(h * .2, 22, 44); L.plotY = h - L.plotH - 8 * s;
        L.frameH = Math.max(30, L.plotY - 6 * s - L.labH - L.frameY);
      } else if (v.st.kind === 'yolo') sgLayout(v, 26 * s, 24 * s, 8.5);
      else sgLayout(v, 26 * s, 22 * s, 9);
    },
    draw: function (v, c, t) { var k = v.st.kind; if (k === 'df') dfDraw(v, c, t); else if (k === 'yolo') yoloDraw(v, c, t); else cctvDraw(v, c, t); }
  });

  /* =====================================================================
     CHAT - LLM / RAG / agents.  Variants (data-variant):
       rag (default)  policy assistant: typed question -> cited answer with source chips, tool route, honest out-of-scope refusal
       honeypot       scammer vs AI persona, engagement-style tag, extracted UPI / link / phone chips
       telegram       bot with inline keyboard taps (sign -> day -> reading)
     ===================================================================== */
  var CHAT_DEFS = {
    rag: {
      name: 'POLICY ASSISTANT', short: 'ASSISTANT', tags: ['RAG', 'TOOL', 'CHAT'], hint: 'Ask about the policies...', cps: 34,
      ex: [
        { route: 0, turns: [
          { who: 'u', text: 'How do refills work?', instant: true },
          { who: 'b', text: 'Refill requests follow the refills policy. Details are in the cited section.', chips: [{ t: 'medication_refill_policy', k: 'src' }, { t: 'conf: high', k: 'ok' }] }
        ] },
        { route: 1, turns: [
          { who: 'u', text: 'Book me a visit on Tuesday' },
          { who: 'b', text: 'Done. A slot is reserved in the mock scheduler.', chips: [{ t: 'mock scheduler', k: 'tool' }] }
        ] },
        { route: 0, turns: [
          { who: 'u', text: 'Who won the match last night?' },
          { who: 'b', warn: true, text: 'That is outside the policy documents, so I will not guess.', chips: [{ t: 'out of scope', k: 'warn' }] }
        ] }
      ]
    },
    honeypot: {
      name: 'HONEYPOT', honey: true, styles: ['PASSIVE', 'ENGAGED', 'VULNERABLE', 'STALLING'],
      ex: [
        { turns: [
          { who: 's', tag: 'SCAMMER', text: 'URGENT: your account will be blocked. Verify your UPI ID now.' },
          { who: 'a', tag: 'AI PERSONA', text: 'Oh dear, I am not good with phones. Which bank is this?' },
          { who: 's', tag: 'SCAMMER', text: 'Send Rs 1 to verify. Open the link and share your phone number.', extract: true }
        ] }
      ],
      extract: [{ t: 'UPI ID' }, { t: 'LINK' }, { t: 'PHONE' }]
    },
    telegram: {
      name: 'ASTRA BOT', sub: 'bot', hint: 'Message', cps: 30,
      ex: [
        { turns: [
          { who: 'u', text: '/horoscope', instant: true },
          { who: 'b', text: 'Choose your sign', kb: [['ARI', 'TAU', 'GEM'], ['CAN', 'LEO', 'VIR']], tap: [1, 1] },
          { who: 'u', text: 'Leo', instant: true }
        ] },
        { turns: [
          { who: 'b', text: 'Which day?', noDots: true, kb: [['Today', 'Tomorrow'], ['Yesterday', 'Date']], tap: [0, 0] },
          { who: 'u', text: 'Today', instant: true },
          { who: 'b', text: 'Leo, today', ghost: 2 }
        ] }
      ]
    }
  };

  var BOT_CPS = 56;   /* characters per second of the bot / scammer reply */
  /* several exchanges become ONE continuous conversation: earlier bubbles stay on screen and scroll away whole, the panel is never blank mid-loop */
  function chatFlatten(def) {
    if (def.flat || def.ex.length < 2) return;
    var all = { route: 0, turns: [] };
    def.ex.forEach(function (ex) { ex.turns.forEach(function (tn) { tn.route = ex.route; all.turns.push(tn); }); });
    def.ex = [all]; def.flat = true;
  }
  function chatBuild(def) {
    if (def.period) return;
    var t = .15, cpsU = def.cps || 22;
    def.ex.forEach(function (ex) {
      ex.t0 = t;
      ex.turns.forEach(function (tn) {
        tn.start = t;
        if (tn.who === 'u') {
          if (tn.instant) { tn.sent = t + .1; t = tn.sent + .55; }
          else { tn.typeEnd = t + tn.text.length / cpsU + .15; tn.sent = tn.typeEnd + .12; t = tn.sent + .55; }
        } else {
          tn.textStart = t + (tn.noDots ? .2 : .3);
          tn.textEnd = tn.textStart + tn.text.length / BOT_CPS;
          t = tn.textEnd + .2;
          tn.chipT = t; t += (tn.chips ? tn.chips.length * .22 : 0);
          if (tn.ghost) { tn.ghostT = t; t += .7; }
          if (tn.kb) { tn.kbT = t; tn.tapT = t + .85; t = tn.tapT + .6; }
          if (tn.extract) { tn.exT = tn.textEnd + .35; t = tn.exT + def.extract.length * .35 + .2; }
          t += .35;
        }
      });
      ex.t1 = t + 1.1;           /* hold the finished exchange, then a quick clear (< 0.4 s) before the next one */
      t = ex.t1 + .25;
    });
    def.period = t;
  }

  /* a label that does not fit maxW loses its tail and gets an ellipsis (set font and tracking first) */
  function ellipsize(c, str, maxW) {
    if (c.measureText(str).width <= maxW) return str;
    var n = str.length;
    while (n > 1 && c.measureText(str.slice(0, n) + '…').width > maxW) n--;
    return str.slice(0, n) + '…';
  }
  /* Header of the chat panel, decided once per size from measured text: the name, the route tags and the style pill never share pixels.
     Order of preference: full name + every tag, short name + every tag, short name + only the active tag, short name alone. */
  function chatHeaderFit(v, D, L) {
    var c = v.ctx, s = v.s, w = v.w, avail = w - L.pad * 2 - 16 * s - 8 * s, i, names = D.short ? [D.name, D.short] : [D.name];
    L.hdrName = D.name; L.hdrTags = D.tags ? 'all' : 'none'; L.hdrStyleLabel = true;
    function nameW(n) { font(c, fsz(v, 9), 700); track(c, 1.2); var m = c.measureText(n).width; track(c, 0); return m; }
    if (D.tags) {
      var sumW = 0, maxW = 0;
      font(c, fsz(v, 8), 700); track(c, .8);
      D.tags.forEach(function (tg) { var tw = c.measureText(tg).width + 10; sumW += tw + 3 * s; maxW = Math.max(maxW, tw + 3 * s); });
      track(c, 0);
      var modes = [['all', sumW], ['one', maxW], ['none', 0]], m, k, done = false;
      for (m = 0; m < modes.length && !done; m++) for (k = 0; k < names.length && !done; k++) {
        if (nameW(names[k]) + modes[m][1] <= avail) { L.hdrName = names[k]; L.hdrTags = modes[m][0]; done = true; }
      }
      if (!done) { L.hdrName = names[names.length - 1]; L.hdrTags = 'none'; }
    } else if (D.styles) {
      var pw = 0, lw;
      font(c, fsz(v, 8), 700); track(c, .8);
      D.styles.forEach(function (st) { pw = Math.max(pw, c.measureText(st).width + 12); });
      track(c, 0); font(c, fsz(v, 8), 400); lw = c.measureText('STYLE').width + 5;
      L.hdrStyleLabel = nameW(D.name) + pw + lw <= avail;
    }
    L.hdrNameW = nameW(L.hdrName);
    font(c, fsz(v, 8.5), 400); L.hdrSubFits = !D.sub || !D.styles && (L.hdrNameW + 6 * s + c.measureText(D.sub).width + 52 * s <= avail + 8 * s);
  }

  function chatLayout(v) {
    var c = v.ctx, s = v.s, w = v.w, h = v.h, D = v.st.def, L = v.L = {};
    L.pad = 10 * s; L.fs = clamp(10 * s, 9.5, 15); L.lh = L.fs * 1.36; L.px = 7 * s; L.py = 4.6 * s; L.gap = 6 * s;
    L.hdr = 24 * s; L.barH = 18 * s; L.barY = h - L.barH - 8 * s; L.areaT = L.hdr; L.areaB = L.barY - 5 * s; L.areaH = L.areaB - L.areaT;
    L.maxW = (w - L.pad * 2) * .8;
    L.tagH = fsz(v, 8) * 1.25;
    L.chipH = 13 * s; L.btnH = 14 * s; L.fsMono = fsz(v, 8.5);
    chatHeaderFit(v, D, L);
    D.ex.forEach(function (ex) {
      var y = 0;
      ex.turns.forEach(function (tn) {
        font(c, L.fs, 500, BODY);
        tn.lines = wrap(c, tn.text, L.maxW - L.px * 2);
        var mw = 0; tn.lines.forEach(function (ln) { mw = Math.max(mw, c.measureText(ln).width); });
        tn.bw = Math.max(mw + L.px * 2, 30 * s);
        if (tn.kb) tn.bw = Math.max(tn.bw, L.maxW * .86);
        tn.bh = tn.lines.length * L.lh + L.py * 2;
        var extra = tn.tag ? L.tagH : 0;
        tn.tagOff = extra;
        var below = 0;
        if (tn.chips) {
          /* chips flow left to right and wrap to a new row when the next one would leave the canvas; a label wider than a whole row is shortened with an ellipsis */
          font(c, L.fsMono, 700); track(c, .4);
          var rowW = (tn.who === 'u' || tn.who === 'a' ? tn.bw : w - L.pad * 2), cx = 0, row = 0; tn.chipX = [];
          tn.chips.forEach(function (ch) {
            var label = ellipsize(c, ch.t, rowW - 14 * s), cw = c.measureText(label).width + 14 * s;
            if (cx > 0 && cx + cw > rowW) { cx = 0; row++; }
            tn.chipX.push([cx, cw, row, label]); cx += cw + 4 * s;
          });
          track(c, 0);
          tn.chipRows = row + 1;
          below += 4 * s + tn.chipRows * L.chipH + row * 3 * s;
        }
        if (tn.ghost) below += 4 * s + tn.ghost * (L.lh * .85);
        if (tn.kb) { tn.kbH = tn.kb.length * (L.btnH + 3 * s); below += 3 * s + tn.kbH; }
        tn.y = y; tn.top = y + extra; tn.h = extra + tn.bh + below;
        y += tn.h + L.gap;
      });
    });
  }

  function bubbleCols(v, tn, tone) {
    if (tn.who === 's') return { f: rgba(PAL.red, .14), s: rgba(PAL.red, .75), t: rgba(bright(PAL.red, .6), 1) };
    if (tn.who === 'u' || tn.who === 'a') return { f: rgba(tone, .17), s: rgba(tone, .8), t: rgba(bright(tone, .62), 1) };
    if (tn.warn) return { f: rgba(PAL.amber, .1), s: rgba(PAL.amber, .75), t: 'rgba(240,232,214,.96)' };
    return { f: 'rgba(255,255,255,.055)', s: 'rgba(255,255,255,.22)', t: 'rgba(226,234,244,.96)' };
  }

  function chatDraw(v, c, t) {
    var D = v.st.def, L = v.L, s = v.s, w = v.w, h = v.h, tone = v.tone, tone2 = v.tone2, hot = v.hot;
    var lt = mod(t, D.period), ex = null, k, i;
    for (k = 0; k < D.ex.length; k++) if (lt >= D.ex[k].t0 - .02 && lt < D.ex[k].t1 + .3) { ex = D.ex[k]; break; }

    /* header */
    var curRoute = ex ? ex.route : -1;
    if (ex) for (k = 0; k < ex.turns.length; k++) { tn = ex.turns[k]; if (tn.route != null && lt >= (tn.who === 'u' ? tn.sent : tn.start)) curRoute = tn.route; }
    var hy = 12 * s + 1;
    c.beginPath(); c.arc(L.pad + 6 * s, hy, 6 * s, 0, TAU); c.fillStyle = rgba(tone, .18); c.fill();
    c.strokeStyle = rgba(tone, .9); c.lineWidth = 1.2; c.stroke();
    c.globalCompositeOperation = 'lighter'; glow(c, L.pad + 6 * s, hy, 11 * s, tone, .3 + .1 * pulse(t, .6)); c.globalCompositeOperation = 'source-over';
    c.beginPath(); c.arc(L.pad + 6 * s, hy, 1.8 * s, 0, TAU); c.fillStyle = rgba(bright(tone, .6), 1); c.fill();
    /* the name, the route tags and the style pill were measured in chatHeaderFit: a narrow panel shortens the name, then shows only the active tag, then none */
    font(c, fsz(v, 9), 700); track(c, 1.2);
    var name = L.hdrName;
    txt(c, name, L.pad + 16 * s, hy + .5, 'rgba(226,234,244,.95)', 'left'); track(c, 0);
    var nameW = L.hdrNameW;
    if (D.sub && L.hdrSubFits) { font(c, fsz(v, 8.5), 400); txt(c, D.sub, L.pad + 16 * s + nameW + 6 * s, hy + .5, LBL, 'left'); }
    var xr = w - L.pad;
    if (D.tags) {                                           /* route tags */
      font(c, fsz(v, 8), 700); track(c, .8);
      var actTag = Math.max(0, curRoute);
      for (i = D.tags.length - 1; i >= 0; i--) {
        if (L.hdrTags === 'none' || (L.hdrTags === 'one' && i !== actTag)) continue;
        var tw = c.measureText(D.tags[i]).width + 10, on = ex && curRoute === i;
        fillRR(c, xr - tw, hy - 6.5, tw, 13, 3, on ? rgba(tone, .22) : 'rgba(255,255,255,.03)');
        strokeRR(c, xr - tw + .5, hy - 6, tw - 1, 12, 3, on ? rgba(tone, .95) : 'rgba(255,255,255,.14)', 1);
        txt(c, D.tags[i], xr - tw / 2 + .4, hy + .5, on ? rgba(bright(tone, .3), 1) : LBL, 'center');
        xr -= tw + 3 * s;
      }
      track(c, 0);
    } else if (D.styles) {                                  /* engagement style */
      var sty = D.styles[Math.floor(t / 2.3) % D.styles.length];
      font(c, fsz(v, 8), 700); track(c, .8);
      var sw = c.measureText(sty).width + 12;
      fillRR(c, xr - sw, hy - 6.5, sw, 13, 3, rgba(tone2, .15)); strokeRR(c, xr - sw + .5, hy - 6, sw - 1, 12, 3, rgba(tone2, .75), 1);
      txt(c, sty, xr - sw / 2 + .4, hy + .5, rgba(bright(tone2, .35), 1), 'center'); track(c, 0);
      if (L.hdrStyleLabel) { font(c, fsz(v, 8), 400); txt(c, 'STYLE', xr - sw - 5, hy + .5, LBL, 'right'); }
    } else {
      c.beginPath(); c.arc(xr - 3 * s, hy, 2.6 * s, 0, TAU); c.fillStyle = rgba(PAL.green, .85); c.fill();
      font(c, fsz(v, 8.5), 400); txt(c, 'online', xr - 9 * s, hy + .5, LBL, 'right');
    }
    c.fillStyle = 'rgba(255,255,255,.07)'; c.fillRect(0, L.hdr - 3 * s, w, 1);

    /* input bar / extraction row */
    var by = L.barY, bh = L.barH, typing = null, tn;
    if (ex) for (k = 0; k < ex.turns.length; k++) { tn = ex.turns[k]; if (tn.who === 'u' && !tn.instant && lt >= tn.start && lt < tn.sent) typing = tn; }
    if (D.honey) {
      font(c, fsz(v, 8), 700); track(c, 1);
      txt(c, 'EXTRACTED', L.pad, by + bh / 2, LBL, 'left');
      var ex0 = L.pad + c.measureText('EXTRACTED').width + 9 * 1 + 8 * s; track(c, 0);
      font(c, fsz(v, 8.5), 700); track(c, .6);
      var exTurn = null; if (ex) for (k = 0; k < ex.turns.length; k++) if (ex.turns[k].extract) exTurn = ex.turns[k];
      for (i = 0; i < D.extract.length; i++) {
        var lab = D.extract[i].t, cw = c.measureText(lab).width + 24 * s, ts = exTurn ? exTurn.exT + i * .35 : 1e9;
        var pa = easeOut((lt - ts) / .3);
        if (ex && pa > 0 && ex0 + cw < w - L.pad + 2) {
          c.globalAlpha = pa; var yy = by + (1 - pa) * 4;
          fillRR(c, ex0, yy + 2, cw, bh - 4, 3, rgba(PAL.green, .14)); strokeRR(c, ex0 + .5, yy + 2.5, cw - 1, bh - 5, 3, rgba(PAL.green, .8), 1);
          c.beginPath(); c.moveTo(ex0 + 5 * s, yy + bh / 2 + .5); c.lineTo(ex0 + 8 * s, yy + bh / 2 + 3.2); c.lineTo(ex0 + 12.5 * s, yy + bh / 2 - 2.4); c.strokeStyle = rgba(PAL.green, 1); c.lineWidth = 1.5; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
          txt(c, lab, ex0 + 16 * s, yy + bh / 2 + .5, rgba(bright(PAL.green, .3), 1), 'left');
          c.globalAlpha = 1;
        }
        ex0 += cw + 4 * s;
      }
      track(c, 0);
    } else {
      fillRR(c, L.pad, by, w - L.pad * 2, bh, bh / 2, 'rgba(255,255,255,.05)');
      strokeRR(c, L.pad + .5, by + .5, w - L.pad * 2 - 1, bh - 1, bh / 2, typing ? rgba(tone, .75) : 'rgba(255,255,255,.17)', 1);
      font(c, L.fs, 500, BODY);
      var shown = typing ? typed(typing.text, lt, typing.start, D.cps || 22) : '';
      if (shown) {
        txt(c, shown, L.pad + 10 * s, by + bh / 2 + .5, 'rgba(232,241,255,.97)', 'left');
        if (Math.sin(t * 9) > -.2) { var cx2 = L.pad + 10 * s + c.measureText(shown).width + 1.5; c.fillStyle = rgba(bright(tone, .5), 1); c.fillRect(cx2, by + bh / 2 - L.fs * .5, 1.4, L.fs); }
      } else txt(c, D.hint, L.pad + 10 * s, by + bh / 2 + .5, 'rgba(139,149,170,.9)', 'left');
      var sr = bh / 2 - 3, sx = w - L.pad - bh / 2;
      c.beginPath(); c.arc(sx, by + bh / 2, sr, 0, TAU); c.fillStyle = rgba(tone, typing ? .9 : .28); c.fill();
      c.beginPath(); c.moveTo(sx - sr * .35, by + bh / 2 + sr * .05); c.lineTo(sx + sr * .45, by + bh / 2 - sr * .35); c.lineTo(sx + sr * .05, by + bh / 2 + sr * .45); c.closePath();
      c.fillStyle = typing ? 'rgba(4,6,12,.9)' : 'rgba(232,241,255,.7)'; c.fill();
    }

    if (!ex) return;
    var fade = 1 - sstep(ex.t1, ex.t1 + .2, lt) , fin = sstep(ex.t0 - .02, ex.t0 + .2, lt);
    var scroll = 0, prevT = 0;
    for (k = 0; k < ex.turns.length; k++) {
      tn = ex.turns[k];
      var visAt = tn.who === 'u' ? tn.sent : tn.start;
      if (lt < visAt) break;
      /* scroll in whole bubbles: the oldest bubble that still lets the newest one fit stays on top, nothing is left half-clipped under the header strip */
      var tgt = 0, need = tn.y + tn.h + 7 * s;
      for (var jj = 0; jj <= k; jj++) { if (need - ex.turns[jj].y <= L.areaH) { tgt = ex.turns[jj].y; break; } tgt = need - L.areaH; }
      scroll = lerp(prevT, tgt, sstep(0, .4, lt - visAt)); prevT = tgt;
    }
    c.save(); c.beginPath(); c.rect(0, L.areaT, w, L.areaH); c.clip();
    c.globalAlpha = fade * fin;
    var top0 = L.areaT + 3 * s - scroll;
    for (k = 0; k < ex.turns.length; k++) {
      tn = ex.turns[k];
      var right = tn.who === 'u' || tn.who === 'a', cols = bubbleCols(v, tn, tone);
      var appear, bx, byy = top0 + tn.top;
      if (tn.who === 'u') { appear = easeOut((lt - tn.sent) / .26); }
      else appear = easeOut((lt - tn.start) / .22);
      if (appear <= 0) continue;
      bx = right ? w - L.pad - tn.bw : L.pad;
      var slide = (1 - appear) * 7 * s; byy += slide;
      c.globalAlpha = fade * fin * appear;
      if (tn.tag) { font(c, fsz(v, 8), 700); track(c, 1); txt(c, tn.tag, right ? bx + tn.bw - 2 : bx + 2, byy - L.tagH / 2 + 1, tn.who === 's' ? rgba(PAL.red, .95) : rgba(bright(tone, .2), .95), right ? 'right' : 'left'); track(c, 0); }
      var nLines = tn.lines.length, typedN = 0, dots = false;
      if (tn.who === 'u') typedN = tn.text.length;
      else if (lt < tn.textStart) dots = true;
      else typedN = Math.floor((lt - tn.textStart) * BOT_CPS);
      var visLines = nLines;
      if (!dots && tn.who !== 'u') { var acc = 0; visLines = 0; for (i = 0; i < nLines; i++) { if (typedN > acc || i === 0) visLines = i + 1; acc += tn.lines[i].length + 1; } }
      var bhh = dots ? L.lh + L.py * 2 : visLines * L.lh + L.py * 2, bww = dots ? 28 * s : tn.bw;
      var bx2 = right ? w - L.pad - bww : bx;
      fillRR(c, bx2, byy, bww, bhh, 7 * s, cols.f); strokeRR(c, bx2 + .5, byy + .5, bww - 1, bhh - 1, 7 * s, cols.s, 1);
      if (dots) {
        for (i = 0; i < 3; i++) { c.beginPath(); c.arc(bx2 + bww / 2 + (i - 1) * 5 * s, byy + bhh / 2 + Math.sin(t * 8 - i * .9) * 1.4, 1.5 * s, 0, TAU); c.fillStyle = rgba(bright(tone, .3), .55 + .45 * Math.sin(t * 8 - i * .9)); c.fill(); }
      } else {
        font(c, L.fs, 500, BODY);
        var acc2 = 0, caret = null;
        for (i = 0; i < visLines; i++) {
          var seg = tn.lines[i], take = tn.who === 'u' ? seg.length : clamp(typedN - acc2, 0, seg.length), str = seg.slice(0, take);
          txt(c, str, bx2 + L.px, byy + L.py + L.lh * (i + .5) + .5, cols.t, 'left');
          if (take < seg.length || i === visLines - 1) caret = { x: bx2 + L.px + c.measureText(str).width, y: byy + L.py + L.lh * (i + .5) };
          acc2 += seg.length + 1;
        }
        if (tn.who !== 'u' && typedN < tn.text.length && caret) { c.fillStyle = rgba(bright(tone, .4), .95); c.fillRect(caret.x + 1.5, caret.y - L.fs * .5, 1.4, L.fs); }
      }
      var yb = byy + bhh + 4 * s;
      if (tn.chips && lt >= tn.chipT) {
        font(c, L.fsMono, 700); track(c, .4);
        for (i = 0; i < tn.chips.length; i++) {
          var ca = easeBack((lt - tn.chipT - i * .22) / .3); if (ca <= 0) continue;
          var ch = tn.chips[i], cc = ch.k === 'warn' ? PAL.amber : (ch.k === 'tool' ? tone2 : (ch.k === 'ok' ? PAL.green : tone)), cw2 = tn.chipX[i][1], cx3 = bx2 + tn.chipX[i][0], cy3 = yb + tn.chipX[i][2] * (L.chipH + 3 * s);
          c.globalAlpha = fade * fin * Math.min(1, ca);
          fillRR(c, cx3, cy3, cw2, L.chipH, L.chipH / 2, rgba(cc, .13)); strokeRR(c, cx3 + .5, cy3 + .5, cw2 - 1, L.chipH - 1, L.chipH / 2, rgba(cc, .8), 1);
          c.beginPath(); c.arc(cx3 + 6 * s, cy3 + L.chipH / 2, 1.7 * s, 0, TAU); c.fillStyle = rgba(cc, 1); c.fill();
          txt(c, tn.chipX[i][3], cx3 + 10 * s, cy3 + L.chipH / 2 + .5, rgba(bright(cc, .35), 1), 'left');
        }
        track(c, 0); yb += tn.chipRows * L.chipH + (tn.chipRows - 1) * 3 * s + 4 * s; c.globalAlpha = fade * fin * appear;
      }
      if (tn.ghost && lt >= tn.ghostT) {
        for (i = 0; i < tn.ghost; i++) { var ga = easeOut((lt - tn.ghostT - i * .2) / .45); fillRR(c, bx2 + L.px, yb + i * L.lh * .85, (tn.bw - L.px * 2) * (i === tn.ghost - 1 ? .55 : .92) * ga, L.lh * .38, 2, 'rgba(255,255,255,.16)'); }
      }
      if (tn.kb && lt >= tn.kbT) {
        var kp = easeOut((lt - tn.kbT) / .3), rows = tn.kb.length, ky = byy + bhh + 3 * s;
        c.globalAlpha = fade * fin * kp; font(c, L.fsMono, 700); track(c, .4);
        for (var r = 0; r < rows; r++) {
          var cols2 = tn.kb[r].length, bwid = (tn.bw - 3 * s * (cols2 - 1)) / cols2;
          for (var q = 0; q < cols2; q++) {
            var kx = bx2 + q * (bwid + 3 * s), kyy = ky + r * (L.btnH + 3 * s), tapped = tn.tap && tn.tap[0] === r && tn.tap[1] === q, ta = tapped ? easeOut((lt - tn.tapT) / .18) : 0;
            fillRR(c, kx, kyy, bwid, L.btnH, 4, rgba(tone, .1 + .45 * ta)); strokeRR(c, kx + .5, kyy + .5, bwid - 1, L.btnH - 1, 4, rgba(tone, .45 + .5 * ta), 1);
            txt(c, tn.kb[r][q], kx + bwid / 2 + .3, kyy + L.btnH / 2 + .5, rgba(bright(tone, .35 + .4 * ta), 1), 'center');
            if (tapped && lt > tn.tapT && lt < tn.tapT + .55) { var rp = (lt - tn.tapT) / .55; c.beginPath(); c.arc(kx + bwid / 2, kyy + L.btnH / 2, L.btnH * (.4 + rp * 1.3), 0, TAU); c.strokeStyle = rgba(bright(tone, .5), (1 - rp) * .8); c.lineWidth = 1.4; c.stroke(); }
          }
        }
        track(c, 0);
      }
      c.globalAlpha = 1;
    }
    c.restore(); c.globalAlpha = 1;
    if (scroll > .5) {                                       /* soft top fade where old bubbles scroll away */
      c.globalCompositeOperation = 'destination-out';
      var g = c.createLinearGradient(0, L.areaT, 0, L.areaT + 14 * s); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(0, L.areaT, w, 14 * s); c.globalCompositeOperation = 'source-over';
    }
  }

  reg('chat', {
    start: 3.5,                 /* pre-rolled: the timeline never starts from an empty panel */
    freezeStill: true,          /* parked visuals show the finished exchange, never a blank panel */
    still: function (v) { var D = v.st.def; return D.ex[0].t1 - 1.0; },
    init: function (v) {
      var vr = v.variant;
      var src = /honeypot/.test(vr) ? CHAT_DEFS.honeypot : (/telegram|astra/.test(vr) ? CHAT_DEFS.telegram : CHAT_DEFS.rag);   /* mount() only routes rag / healthcare / policy variants here */
      v.st.def = JSON.parse(JSON.stringify(src));      /* per-instance copy: layout writes measurements into it */
      chatFlatten(v.st.def);
      chatBuild(v.st.def);
    },
    layout: chatLayout,
    draw: chatDraw
  });

  /* =====================================================================
     NETWORK - observability: a request chain (client > api > llm > tool > db) with travelling packets
     above a trace waterfall.  The slow tool span is a planted demo bug: the loop shows the slow run,
     then the fixed run (span timing on synthetic data, ~15 s -> <50 ms).
     ===================================================================== */
  var NET_NODES = ['CLIENT', 'API', 'LLM', 'TOOL', 'DB'];
  var NET_ROWS = ['POST /ask', 'llm.route', 'tool.query', 'db.join', 'llm.summarise'];
  var NET_NODE_OF = [1, 2, 3, 4, 2];
  /* spans as [start, end] in axis units, per phase */
  var NET_SPANS = [
    [[0, 1], [.03, .15], [.17, .82], [.19, .8], [.84, .98]],      /* slow */
    [[0, 1], [.03, .2], [.22, .42], [.24, .4], [.44, .98]]        /* fixed */
  ];
  var NET_PH = 5.6, NET_SWEEP = 3.5;

  reg('network', {
    still: 4.1,
    layout: function (v) {
      var s = v.s, w = v.w, h = v.h, L = v.L = {};
      L.pad = 10 * s;
      L.nodeY = 25 * s; L.nodeH = 17 * s; L.gap = 11 * s;
      L.nw = (w - L.pad * 2 - L.gap * 4) / 5;
      /* everything below is measured, so a narrow tile drops or shortens a label instead of letting two texts share pixels */
      var c = v.ctx;
      font(c, fsz(v, 8.5), 700); track(c, .6);
      /* the longest label tries the normal letter spacing, then none, then the short word */
      L.nodeTrack = c.measureText('CLIENT').width + 5 > L.nw ? 0 : .6;
      track(c, L.nodeTrack);
      L.nodeLab = NET_NODES.map(function (n) { return n === 'CLIENT' && c.measureText(n).width + 5 > L.nw ? 'APP' : n; });
      track(c, 0); font(c, fsz(v, 8.5), 400);
      var rowW = 0; NET_ROWS.forEach(function (r, k) { rowW = Math.max(rowW, c.measureText(r).width + (k === 3 ? 8 * s : 0)); });
      L.labW = Math.min(Math.max(clamp(70 * s, 56, 90), rowW + 8), Math.max(56, w - L.pad * 2 - 96));
      L.rowTxt = NET_ROWS.map(function (r, k) { return ellipsize(c, r, L.labW - 6 - (k === 3 ? 8 * s : 0)); });
      /* the header: TRACE + id on the left, JAEGER on the right, and the latency chip above the TOOL node between them */
      font(c, fsz(v, 8.5), 700); track(c, 1.2); var trW = c.measureText('TRACE').width; track(c, 0);
      font(c, fsz(v, 8.5), 400); var idW = c.measureText('a41f9c0e').width;
      font(c, fsz(v, 8.5), 700); track(c, 1); var jW = c.measureText('JAEGER').width;
      var chipW = 0; ['~15 s', '<50 ms'].forEach(function (t) { chipW = Math.max(chipW, c.measureText(t).width + 10); }); track(c, 0);
      var idEnd = L.pad + trW + 6 * s + 5 + idW, jStart = w - L.pad - jW, toolCx = L.pad + 3 * (L.nw + L.gap) + L.nw / 2;
      L.hdrId = true; L.hdrJaeger = true; L.chipW = chipW;
      var lo = idEnd + 5, hi = jStart - 5;
      if (hi - lo < chipW) { L.hdrJaeger = false; hi = w - L.pad; }
      if (hi - lo < chipW) { L.hdrId = false; lo = L.pad + trW + 5; }
      L.chipX = clamp(toolCx - chipW / 2, lo, Math.max(lo, hi - chipW));
      L.footY = h - 11 * s;
      L.wy = L.nodeY + L.nodeH + 12 * s;
      L.rowH = clamp((L.footY - 9 * s - L.wy) / 5, 10, 20 * s);
      L.barH = Math.min(L.rowH * .62, 13 * s);
      L.ax0 = L.pad + L.labW; L.ax1 = w - L.pad - 2 * s;
    },
    draw: function (v, c, t) {
      var L = v.L, s = v.s, w = v.w, h = v.h, tone = v.tone, i, k;
      var ph = Math.floor(t / NET_PH) % 2, lc = mod(t, NET_PH);
      var u = clamp(lc / NET_SWEEP, 0, 1), fadeOut = 1 - sstep(NET_PH - .35, NET_PH, lc), fadeIn = sstep(0, .2, lc);
      var A = fadeOut * fadeIn;
      var slow = ph === 0, spans = NET_SPANS[ph];
      var BAD = PAL.magenta, GOOD = PAL.green, LLM = PAL.purple, BASE = tone;

      /* header */
      var hy = 12 * s + 1;
      font(c, fsz(v, 8.5), 700); track(c, 1.2);
      txt(c, 'TRACE', L.pad, hy, LBL, 'left');
      var trW = c.measureText('TRACE').width; track(c, 0);
      if (L.hdrId) { font(c, fsz(v, 8.5), 400); txt(c, 'a41f9c0e', L.pad + trW + 6 * s + 5, hy + .5, rgba(bright(tone, .4), .9), 'left'); }
      if (L.hdrJaeger) { font(c, fsz(v, 8.5), 700); track(c, 1); txt(c, 'JAEGER', w - L.pad, hy, LBL, 'right'); track(c, 0); }

      /* which nodes are active right now */
      var act = [0, 0, 0, 0, 0];
      if (u > 0 && u < 1) { act[0] = 1; for (i = 0; i < 5; i++) if (u >= spans[i][0] && u <= spans[i][1]) act[NET_NODE_OF[i]] = 1; }

      /* node chain + packets */
      var ny = L.nodeY, nh = L.nodeH;
      for (i = 0; i < 4; i++) { var xa = L.pad + i * (L.nw + L.gap) + L.nw, xb = xa + L.gap; line(c, xa, ny + nh / 2, xb, ny + nh / 2); c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 1; c.stroke(); }
      font(c, fsz(v, 8.5), 700); track(c, L.nodeTrack);
      for (i = 0; i < 5; i++) {
        var nx = L.pad + i * (L.nw + L.gap), on = act[i], isTool = i === 3, nc = isTool ? (slow ? BAD : GOOD) : (i === 2 ? LLM : BASE);
        fillRR(c, nx, ny, L.nw, nh, 4, rgba(nc, on ? .22 : .07));
        strokeRR(c, nx + .5, ny + .5, L.nw - 1, nh - 1, 4, rgba(nc, on ? .98 : .4), on ? 1.5 : 1);
        txt(c, L.nodeLab[i], nx + L.nw / 2 + .3, ny + nh / 2 + .5, on ? rgba(bright(nc, .45), 1) : LBL, 'center');
        if (on) { c.globalCompositeOperation = 'lighter'; glow(c, nx + L.nw / 2, ny + nh / 2, L.nw * .8, nc, .22); c.globalCompositeOperation = 'source-over'; }
      }
      track(c, 0);
      var chainLen = 4 * (L.nw + L.gap) + L.nw;
      c.globalCompositeOperation = 'lighter';
      for (k = 0; k < 3; k++) { var pp = fract(t * .38 + k / 3), px = L.pad + pp * chainLen; glow(c, px, ny + nh / 2, 5 * s, bright(tone, .3), .8); }
      c.globalCompositeOperation = 'source-over';
      /* latency chip on the TOOL node */
      if (u >= spans[2][1] - .02) {
        var chipT = slow ? '~15 s' : '<50 ms', cc = slow ? BAD : GOOD;
        font(c, fsz(v, 8.5), 700);
        var cw = c.measureText(chipT).width + 10, cx = L.chipX + L.chipW / 2, ca = easeBack((u - spans[2][1]) / .08) , cy = ny - 3 * s;
        c.globalAlpha = A * Math.min(1, ca);
        fillRR(c, cx - cw / 2, cy - 12 * s, cw, 12 * s, 3, 'rgba(5,6,10,.9)'); strokeRR(c, cx - cw / 2 + .5, cy - 11.5 * s, cw - 1, 11 * s, 3, rgba(cc, .95), 1);
        txt(c, chipT, cx + .3, cy - 6 * s + .5, rgba(bright(cc, .3), 1), 'center'); c.globalAlpha = 1;
      }

      /* waterfall */
      var ax0 = L.ax0, ax1 = L.ax1, aw = ax1 - ax0, wy = L.wy;
      for (i = 0; i <= 4; i++) { var gx = ax0 + aw * i / 4; line(c, gx, wy - 3, gx, wy + L.rowH * 5); c.strokeStyle = 'rgba(255,255,255,' + (i === 0 ? .18 : .06) + ')'; c.lineWidth = 1; c.stroke(); }
      font(c, fsz(v, 8.5), 400);
      c.globalAlpha = A;
      for (i = 0; i < 5; i++) {
        var ry = wy + i * L.rowH + L.rowH / 2, sp = spans[i];
        var nodeCol = i === 2 || i === 3 ? (slow ? BAD : GOOD) : (i === 1 || i === 4 ? LLM : BASE);
        txt(c, L.rowTxt[i], L.pad + (i === 3 ? 8 * s : 0), ry + .5, 'rgba(200,211,224,.78)', 'left');
        var x0 = ax0 + aw * sp[0], x1 = ax0 + aw * Math.min(sp[1], u);
        if (u > sp[0] && x1 > x0 + .5) {
          var bw2 = x1 - x0, bt = ry - L.barH / 2;
          fillRR(c, x0, bt, bw2, L.barH, 2.5, rgba(nodeCol, .3));
          fillRR(c, x0, bt, Math.min(bw2, 3), L.barH, 1.5, rgba(nodeCol, 1));
          strokeRR(c, x0 + .5, bt + .5, bw2 - 1, L.barH - 1, 2.5, rgba(nodeCol, .95), 1);
          if ((i === 2 || i === 3) && slow && bw2 > 14) {     /* hazard stripes on the slow span */
            c.save(); c.beginPath(); rrp(c, x0, bt, bw2, L.barH, 2.5); c.clip();
            c.strokeStyle = rgba(BAD, .28); c.lineWidth = 2; c.beginPath();
            for (var sx = x0 - L.barH; sx < x1; sx += 7) { c.moveTo(sx, bt + L.barH); c.lineTo(sx + L.barH, bt); }
            c.stroke(); c.restore();
          }
        }
      }
      c.globalAlpha = 1;
      /* cursor */
      if (u > 0 && u < 1) {
        var cxp = ax0 + aw * u;
        c.globalAlpha = A; c.globalCompositeOperation = 'lighter'; glow(c, cxp, wy + L.rowH * 2.5, L.rowH * 3, bright(tone, .3), .22); c.globalCompositeOperation = 'source-over';
        line(c, cxp, wy - 3, cxp, wy + L.rowH * 5); c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1; c.stroke(); c.globalAlpha = 1;
      }

      /* footer: phase + honesty tag */
      var fy = L.footY, lab = slow ? 'SLOW LOOKUP' : 'FIXED', lcol = slow ? BAD : GOOD;
      c.beginPath(); c.arc(L.pad + 3 * s, fy, 2.7 * s, 0, TAU); c.fillStyle = rgba(lcol, .6 + .4 * pulse(t, 1.1)); c.fill();
      font(c, fsz(v, 8.5), 700); track(c, 1);
      txt(c, lab, L.pad + 10 * s, fy + .5, rgba(bright(lcol, .3), 1), 'left'); track(c, 0);
      font(c, fsz(v, 8), 400);
      var labEnd = L.pad + 10 * s + c.measureText(lab).width + 14;
      txt(c, fitText(c, ['SYNTHETIC DATA', 'SYNTHETIC'], w - L.pad - labEnd), w - L.pad, fy + .5, LBL, 'right');
    }
  });

  /* =====================================================================
     BARS - ML / numbers.  Variants (data-variant):
       house   (house-price-predictor)   scatter + linear fit vs random-forest steps + R2 bars (LIN 0.80 / RF 0.89)
       scatter (default / insurance)     scatter + linear fit + residual ticks + R2 chip (0.74 on test)
       boxes   (django-box-selection)    items hop into the smallest box that fits; one order fails with a 400; 27 test pips
     ===================================================================== */
  var SC_PER = 10.6;

  function scInit(v) {
    var house = v.st.kind === 'house', r = rng(hashStr('sc' + v.variant)), N = v.lite ? 24 : 34, pts = [], i;
    var sigma = house ? .07 : .14;
    for (i = 0; i < N; i++) {
      var x = (i + .2 + r() * .6) / N;
      var base = house ? .1 + .5 * x + .34 * Math.pow(x, 2.4) : .14 + .7 * x;
      var y = clamp(base + (r() + r() + r() - 1.5) * sigma * 2, .03, .97);
      pts.push([x, y]);
    }
    var mx = 0, my = 0; pts.forEach(function (p) { mx += p[0]; my += p[1]; }); mx /= N; my /= N;
    var cov = 0, vr = 0; pts.forEach(function (p) { cov += (p[0] - mx) * (p[1] - my); vr += (p[0] - mx) * (p[0] - mx); });
    var b = cov / vr, a = my - b * mx;
    var bins = 8, steps = [];
    for (i = 0; i < bins; i++) { var sum = 0, cnt = 0; pts.forEach(function (p) { if (p[0] >= i / bins && p[0] < (i + 1) / bins) { sum += p[1]; cnt++; } }); steps.push(cnt ? sum / cnt : null); }
    for (i = 0; i < bins; i++) if (steps[i] == null) steps[i] = i ? steps[i - 1] : .3;
    v.st.pts = pts; v.st.lin = [a, b]; v.st.steps = steps; v.st.bins = bins;
  }
  function scDraw(v, c, t) {
    var L = v.L, s = v.s, w = v.w, h = v.h, tone = v.tone, tone2 = v.tone2, house = v.st.kind === 'house', pts = v.st.pts, N = pts.length, i;
    var lc = mod(t, SC_PER), A = (1 - sstep(9.5, 10.3, lc)) * sstep(0, .2, lc);
    var px = L.px, py = L.py, pw = L.pw, ph = L.ph;
    function X(x) { return px + 4 * s + (pw - 8 * s) * x; }
    function Y(y) { return py + ph - 4 * s - (ph - 8 * s) * y; }
    c.globalAlpha = A;
    /* axes + grid */
    for (i = 1; i <= 3; i++) { line(c, px, py + ph * i / 4, px + pw, py + ph * i / 4); c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 1; c.stroke(); }
    c.beginPath(); c.moveTo(px, py); c.lineTo(px, py + ph); c.lineTo(px + pw, py + ph); c.strokeStyle = 'rgba(200,211,224,.38)'; c.lineWidth = 1; c.stroke();
    c.beginPath(); for (i = 1; i < 6; i++) { c.moveTo(px + pw * i / 6, py + ph); c.lineTo(px + pw * i / 6, py + ph + 3); } c.strokeStyle = 'rgba(200,211,224,.3)'; c.stroke();
    font(c, fsz(v, 8.5), 400);
    txt(c, house ? 'PRICE' : 'CHARGES', px + 5, py + 7 * s, LBL, 'left');
    if (!house) txt(c, 'AGE', px + pw, py + ph + 9 * s + 1, LBL, 'right');

    /* fits */
    var lin = v.st.lin, tl = clamp((lc - 2.7) / 1.2, 0, 1), fa = 0;
    var tRes = house ? 5.6 : 4.0;
    /* residual ticks */
    var ra = sstep(tRes, tRes + .7, lc);
    if (ra > 0) {
      c.beginPath();
      for (i = 0; i < N; i++) {
        var fx = pts[i][0], fy;
        if (house) { var bi = Math.min(v.st.bins - 1, Math.floor(fx * v.st.bins)); fy = v.st.steps[bi]; } else fy = lin[0] + lin[1] * fx;
        c.moveTo(X(fx), Y(pts[i][1])); c.lineTo(X(fx), Y(fy));
      }
      c.strokeStyle = rgba(bright(tone, .2), .4 * ra); c.lineWidth = 1; c.stroke();
    }
    /* points */
    c.globalCompositeOperation = 'lighter';
    for (i = 0; i < N; i++) {
      var ti = .2 + i / N * 2.2, pa = easeBack((lc - ti) / .35); if (pa <= 0) continue;
      glow(c, X(pts[i][0]), Y(pts[i][1]), 6.5 * s * pa, tone, .55);
    }
    c.globalCompositeOperation = 'source-over';
    for (i = 0; i < N; i++) {
      var ti2 = .2 + i / N * 2.2, pa2 = easeBack((lc - ti2) / .35); if (pa2 <= 0) continue;
      c.beginPath(); c.arc(X(pts[i][0]), Y(pts[i][1]), 2.3 * s * Math.max(0, pa2), 0, TAU); c.fillStyle = rgba(bright(tone, .55), 1); c.fill();
    }
    /* linear fit */
    if (tl > 0) {
      var xa = 0, xb = tl;
      c.beginPath(); c.moveTo(X(xa), Y(clamp(lin[0] + lin[1] * xa, 0, 1))); c.lineTo(X(xb), Y(clamp(lin[0] + lin[1] * xb, 0, 1)));
      if (house) { c.setLineDash([5, 4]); c.strokeStyle = rgba(tone2, .9); c.lineWidth = 1.4; c.stroke(); c.setLineDash([]); }
      else neon(c, tone2, 1.6, .95);
    }
    /* forest steps (house) */
    if (house) {
      var tf = clamp((lc - 4.2) / 1.4, 0, 1);
      if (tf > 0) {
        c.beginPath();
        var B = v.st.bins, started = false;
        for (i = 0; i < B; i++) {
          var x0 = i / B, x1 = (i + 1) / B; if (x0 >= tf) break;
          var xe = Math.min(x1, tf), yv = v.st.steps[i];
          if (!started) { c.moveTo(X(x0), Y(yv)); started = true; } else c.lineTo(X(x0), Y(yv));
          c.lineTo(X(xe), Y(yv));
        }
        neon(c, bright(tone, .35), 1.7, 1);
      }
    }
    c.globalAlpha = 1;

    /* legend */
    font(c, fsz(v, 8.5), 700); track(c, .5);
    var ly = py + ph + 9 * s + 1, lx = px + 4;
    c.globalAlpha = A;
    if (house) {
      c.setLineDash([4, 3]); line(c, lx, ly, lx + 12 * s, ly); c.strokeStyle = rgba(tone2, .95); c.lineWidth = 1.4; c.stroke(); c.setLineDash([]);
      txt(c, 'LINEAR', lx + 16 * s, ly + .5, LBL, 'left');
      var lw = c.measureText('LINEAR').width; lx += 16 * s + lw + 10 * s;
      line(c, lx, ly, lx + 12 * s, ly); c.strokeStyle = rgba(bright(tone, .35), 1); c.lineWidth = 1.7; c.stroke();
      txt(c, 'RANDOM FOREST', lx + 16 * s, ly + .5, LBL, 'left');
    } else {
      line(c, lx, ly, lx + 12 * s, ly); c.strokeStyle = rgba(tone2, .95); c.lineWidth = 1.6; c.stroke();
      txt(c, 'LINEAR REGRESSION', lx + 16 * s, ly + .5, LBL, 'left');
    }
    track(c, 0);

    /* right panel */
    var rx = px + pw + 14 * s, rw = w - L.pad - rx;
    if (house && rw > 40 * s) {
      var vals = [[.797, 'LIN', tone2, '0.80'], [.892, 'RF', bright(tone, .35), '0.89']], bwid = Math.min(20 * s, rw * .36), g = (rw - bwid * 2) / 3;
      font(c, fsz(v, 8.5), 700); track(c, 1); txt(c, 'R2', rx + rw / 2, py + 6 * s, LBL, 'center'); track(c, 0);
      var top = py + 16 * s, bot = py + ph, hh = bot - top - 12 * s;
      for (i = 0; i < 2; i++) {
        var gp = easeOut((lc - 4.6 - i * .5) / .9), bx = rx + g + i * (bwid + g), bh = hh * vals[i][0] * gp, col = vals[i][2];
        fillRR(c, bx, bot - bh, bwid, bh, 2, rgba(col, .28)); strokeRR(c, bx + .5, bot - bh + .5, bwid - 1, Math.max(1, bh - 1), 2, rgba(col, .95), 1);
        c.globalCompositeOperation = 'lighter'; glow(c, bx + bwid / 2, bot - bh, bwid, col, .25 * gp); c.globalCompositeOperation = 'source-over';
        font(c, fsz(v, 8.5), 700); txt(c, vals[i][3], bx + bwid / 2, bot - bh - 6 * s, rgba(bright(col, .4), Math.min(1, gp * 1.5)), 'center');
        txt(c, vals[i][1], bx + bwid / 2, bot + 9 * s + 1, LBL, 'center');
      }
    } else if (!house && rw > 30 * s) {
      var ca = easeBack((lc - 4.8) / .4);
      if (ca > 0) {
        c.globalAlpha = A * Math.min(1, ca);
        font(c, clamp(18 * s, 15, 28), 800, DISP);
        c.save(); c.shadowColor = rgba(tone, .8); c.shadowBlur = 10 * s;
        txt(c, '0.74', rx + rw / 2, py + ph * .42, '#fff', 'center'); c.restore();
        font(c, fsz(v, 8.5), 700); track(c, 1);
        txt(c, 'R2 TEST', rx + rw / 2, py + ph * .42 - clamp(16 * s, 14, 24), LBL, 'center');
        txt(c, '1,338 ROWS', rx + rw / 2, py + ph * .42 + clamp(16 * s, 14, 24), LBL, 'center'); track(c, 0);
        c.globalAlpha = 1;
      }
    }
    /* header */
    c.globalAlpha = 1;
    font(c, fsz(v, 8.5), 700); track(c, 1.2);
    txt(c, house ? 'PRICE MODEL' : 'COST MODEL', L.pad, 12 * s + 1, LBL, 'left'); track(c, 0);
    if (house) { font(c, fsz(v, 8.5), 400); txt(c, '8 FEATURES', w - L.pad, 12 * s + 1, LBL, 'right'); }
  }

  /* ---- box selection ---- */
  var BOX_PER = 4.9;
  var BOX_SIZES = [{ n: 'S', w: 36, h: 30 }, { n: 'M', w: 50, h: 40 }, { n: 'L', w: 66, h: 52 }];
  var BOX_SCEN = [
    { items: [[8, 8], [7, 9], [9, 7]], box: 0 },
    { items: [[10, 10], [9, 11], [11, 8], [8, 8], [10, 7]], box: 1 },
    { items: [[9, 9], [11, 10], [24, 19], [8, 8]], box: -1, big: 2 }
  ];
  var BOX_COLS = [[0, 255, 255], [181, 83, 242], [0, 128, 255], [52, 255, 140], [255, 176, 64]];
  var TESTS = 27, TEST_UNIT = 11;

  function boxDraw(v, c, t) {
    var L = v.L, s = v.s, w = v.w, h = v.h, tone = v.tone, i, k;
    var loop = BOX_PER * 3, lt = mod(t, loop), si = Math.floor(lt / BOX_PER), lc = lt - si * BOX_PER, sc = BOX_SCEN[si];
    var A = (1 - sstep(BOX_PER - .4, BOX_PER, lc)) * sstep(0, .2, lc), n = sc.items.length, u2 = s * 1.4;

    /* header */
    font(c, fsz(v, 8.5), 700); track(c, 1.2);
    txt(c, 'ORDER', L.pad, 12 * s + 1, LBL, 'left'); track(c, 0);
    font(c, fsz(v, 8.5), 400); txt(c, '6 ROTATIONS', w - L.pad, 12 * s + 1, LBL, 'right');

    /* boxes */
    var landAll = .6 + (n - 1) * .3 + .6 + .1, closeP = sc.box >= 0 ? easeOut((lc - landAll) / .45) : 0;
    var bigHit = sc.big != null ? .6 + sc.big * .3 + .3 : 0, flash = sc.big != null ? clamp(1 - Math.abs(lc - bigHit) / .35, 0, 1) : 0;
    c.globalAlpha = 1;
    for (i = 0; i < 3; i++) {
      var bz = BOX_SIZES[i], bw = bz.w * s * 1.15, bh = bz.h * s * 1.15, bx = L.bx[i] - bw / 2, by = L.base - bh, chosen = sc.box === i;
      var col = chosen ? PAL.green : (i === 2 && flash > 0 ? PAL.red : tone), act = chosen ? .55 + .45 * closeP : (i === 2 ? flash * .8 : 0);
      c.globalAlpha = 1;
      fillRR(c, bx, by, bw, bh, 3, rgba(col, .05 + .12 * act));
      strokeRR(c, bx + .5, by + .5, bw - 1, bh - 1, 3, rgba(col, .5 + .5 * act), 1 + .4 * act);
      /* flaps: open -> closed */
      var open = chosen ? 1 - closeP : 1, fl = 7 * s * open;
      c.beginPath(); c.moveTo(bx, by); c.lineTo(bx - 3 * s * open, by - fl); c.moveTo(bx + bw, by); c.lineTo(bx + bw + 3 * s * open, by - fl);
      c.strokeStyle = rgba(col, .35 + .4 * act); c.lineWidth = 1.2; c.stroke();
      if (act > .2) { c.globalCompositeOperation = 'lighter'; glow(c, bx + bw / 2, by + bh / 2, bw * .9, col, .22 * act); c.globalCompositeOperation = 'source-over'; }
      font(c, fsz(v, 8.5), 700); track(c, 1);
      txt(c, bz.n, bx + bw / 2, L.base + 9 * s + 1, chosen && closeP > .2 ? rgba(bright(PAL.green, .3), 1) : LBL, 'center'); track(c, 0);
    }
    /* result chip */
    c.globalAlpha = A;
    if (sc.box >= 0 && closeP > .05) {
      var txtc = 'BOX ' + BOX_SIZES[sc.box].n, cx0 = L.bx[sc.box];
      font(c, fsz(v, 8.5), 700); track(c, .8);
      var cw = c.measureText(txtc).width + 20 * s, cyy = L.base - BOX_SIZES[sc.box].h * s * 1.15 - 16 * s;
      c.globalAlpha = A * closeP;
      fillRR(c, cx0 - cw / 2, cyy - 6.5 * s, cw, 13 * s, 3, 'rgba(5,6,10,.92)'); strokeRR(c, cx0 - cw / 2 + .5, cyy - 6 * s, cw - 1, 12 * s, 3, rgba(PAL.green, .95), 1);
      c.beginPath(); c.moveTo(cx0 - cw / 2 + 5 * s, cyy); c.lineTo(cx0 - cw / 2 + 8 * s, cyy + 2.8 * s); c.lineTo(cx0 - cw / 2 + 12.5 * s, cyy - 2.4 * s); c.strokeStyle = rgba(PAL.green, 1); c.lineWidth = 1.5; c.lineCap = 'round'; c.stroke();
      txt(c, txtc, cx0 + 6 * s, cyy + .5, rgba(bright(PAL.green, .3), 1), 'center'); track(c, 0);
    }
    if (sc.big != null && lc > bigHit) {
      c.globalAlpha = A * easeBack((lc - bigHit) / .3);
      var msg = '400  NO BOX FITS: PIANO'; font(c, fsz(v, 8.5), 700); track(c, .6);
      var mw = c.measureText(msg).width + 14 * s, mx = L.bx[1];
      fillRR(c, mx - mw / 2, L.base - 70 * s, mw, 13 * s, 3, 'rgba(5,6,10,.92)'); strokeRR(c, mx - mw / 2 + .5, L.base - 70 * s + .5, mw - 1, 12 * s, 3, rgba(PAL.red, .95), 1);
      txt(c, msg, mx + .3, L.base - 70 * s + 6.5 * s, rgba(bright(PAL.red, .35), 1), 'center'); track(c, 0);
    }
    c.globalAlpha = 1;

    /* items */
    var slot = L.slotCols;
    for (i = 0; i < n; i++) {
      var it = sc.items[i], iw = it[0] * u2, ih = it[1] * u2, col2 = i === sc.big ? PAL.red : BOX_COLS[(i + si * 2) % BOX_COLS.length];
      var qx = L.qx + i * L.qstep, qy = L.qy, p = clamp((lc - (.6 + i * .3)) / .6, 0, 1), e = p * p * (3 - 2 * p), x, y, ang = 0;
      var bzi = sc.box >= 0 ? sc.box : 2, bz2 = BOX_SIZES[bzi], bw2 = bz2.w * s * 1.15, bh2 = bz2.h * s * 1.15;
      var cols = bzi === 0 ? 2 : 3, cell = Math.min(bw2 / (cols + .4), 11 * u2);
      var sxp = L.bx[bzi] - (cols * cell) / 2 + cell / 2 + (i % cols) * cell, syp = L.base - 4 * s - cell / 2 - Math.floor(i / cols) * cell;
      if (sc.box < 0) {                                       /* oversize order: hop toward the big box, bounce back */
        if (i === sc.big) { var q = p < .5 ? p * 1.7 : (1 - p) * 1.7; q = q * q * (3 - 2 * q); sxp = L.bx[2]; syp = L.base - bh2 - 6 * s; x = lerp(qx, sxp, q); y = lerp(qy, syp, q) - Math.sin(Math.min(1, q) * PI) * 10 * s; ang = q * .5; }
        else { x = lerp(qx, L.bx[0] - 6 * s + (i % 2) * cell, e); y = lerp(qy, L.base - 4 * s - cell / 2, e) - Math.sin(e * PI) * 14 * s; if (i > sc.big) { x = lerp(qx, L.bx[0] - 6 * s + 2 * cell, e); } }
        if (i === sc.big && p >= 1) { x = qx; y = qy; ang = 0; }
      } else {
        var mx2 = (qx + sxp) / 2, my2 = Math.min(qy, syp) - 18 * s;
        x = (1 - e) * (1 - e) * qx + 2 * (1 - e) * e * mx2 + e * e * sxp;
        y = (1 - e) * (1 - e) * qy + 2 * (1 - e) * e * my2 + e * e * syp;
        ang = (i % 2 ? 1 : 0) * e * PI / 2;
      }
      var pop = easeBack((lc - .1 - i * .06) / .3); if (pop <= 0) continue;
      var sz = p > 0 && p < 1 ? 1 : 1, dw = iw * pop * (p >= 1 && sc.box >= 0 ? cell / Math.max(iw, ih) * .82 : 1), dh = ih * pop * (p >= 1 && sc.box >= 0 ? cell / Math.max(iw, ih) * .82 : 1);
      c.save(); c.translate(x, y); c.rotate(ang);
      c.globalAlpha = A;
      fillRR(c, -dw / 2, -dh / 2, dw, dh, 2, rgba(col2, .32)); strokeRR(c, -dw / 2 + .5, -dh / 2 + .5, dw - 1, dh - 1, 2, rgba(col2, 1), 1.2);
      c.restore();
      if (p > 0 && p < 1) { c.globalAlpha = A * .6; c.globalCompositeOperation = 'lighter'; glow(c, x, y, 9 * s, col2, .5); c.globalCompositeOperation = 'source-over'; }
    }
    c.globalAlpha = 1;
    /* flash X over the big box */
    if (flash > 0) { var fxp = L.bx[2], fyp = L.base - BOX_SIZES[2].h * s * 1.15 - 6 * s; c.beginPath(); c.moveTo(fxp - 5 * s, fyp - 5 * s); c.lineTo(fxp + 5 * s, fyp + 5 * s); c.moveTo(fxp + 5 * s, fyp - 5 * s); c.lineTo(fxp - 5 * s, fyp + 5 * s); neon(c, PAL.red, 1.8, flash); }

    /* tests: 27 pips light up across the loop */
    var py = h - 11 * s, pw = 3.4 * s, pg = 2 * s, x0 = L.pad;
    var lit = Math.floor(lt / loop * (TESTS + 3));
    for (i = 0; i < TESTS; i++) {
      var on = i < lit, gx = x0 + i * (pw + pg) + (i >= TEST_UNIT ? 4 * s : 0);
      c.fillStyle = on ? rgba(PAL.green, .95) : 'rgba(255,255,255,.12)'; c.fillRect(gx, py - 4 * s, pw, 8 * s);
    }
    font(c, fsz(v, 8.5), 700); track(c, .8);
    txt(c, lit >= TESTS ? '27 / 27 PASSING' : (lit + ' / 27'), w - L.pad, py + .5, lit >= TESTS ? rgba(bright(PAL.green, .3), 1) : LBL, 'right'); track(c, 0);
  }

  reg('bars', {
    still: function (v) { return v.st.kind === 'boxes' ? BOX_PER + 3.9 : 7.0; },
    init: function (v) {
      var vr = v.variant;
      v.st.kind = /box/.test(vr) ? 'boxes' : (/house/.test(vr) ? 'house' : 'scatter');
      if (v.st.kind !== 'boxes') scInit(v);
    },
    layout: function (v) {
      var s = v.s, w = v.w, h = v.h, L = v.L = {};
      L.pad = 10 * s;
      if (v.st.kind === 'boxes') {
        L.base = h - 31 * s; L.qy = 33 * s; L.qx = L.pad + 8 * s; L.qstep = Math.min(24 * s, (w * .62) / 6);
        L.bx = [w * .2, w * .5, w * .8];
        L.slotCols = 3;
      } else {
        var house = v.st.kind === 'house';
        L.px = L.pad + 6 * s; L.py = 24 * s; L.ph = h - L.py - 24 * s;
        L.pw = house ? (w - L.px - L.pad) * .62 : (w - L.px - L.pad) * .68;
      }
    },
    draw: function (v, c, t) { if (v.st.kind === 'boxes') boxDraw(v, c, t); else scDraw(v, c, t); }
  });

  /* =====================================================================
     TERMINAL - typed command lines (scraper, console quiz) and CODE - syntax-coloured editor (translate + summarise)
     ===================================================================== */
  var TC = { dim: [128, 140, 164], txt: [226, 234, 244], grn: [96, 255, 168], amb: [255, 190, 90], pnk: [255, 120, 176], pur: [206, 150, 255], cya: [110, 236, 255], blu: [96, 176, 255] };

  var TERMS = {
    scraper: {
      title: 'scrape.ipynb', cps: 46,
      lines: [
        { k: 'cmd', seg: [['$ ', 'grn'], ['python scrape.py', 'txt']] },
        { k: 'out', seg: [['GET page=1 ........ ', 'dim'], ['200 OK', 'grn']] },
        { k: 'out', seg: [['GET page=2 ........ ', 'dim'], ['200 OK', 'grn']] },
        { k: 'out', seg: [['+ ', 'grn'], ['parsed product cards', 'txt']] },
        { k: 'out', seg: [['+ ', 'grn'], ['de-duplicated by name', 'txt']] },
        { k: 'out', seg: [['+ ', 'grn'], ['cleaned price strings', 'txt']] },
        { k: 'cmd', seg: [['$ ', 'grn'], ['head products.csv', 'txt']] },
        { k: 'out', seg: [['name', 'cya'], [' , ', 'dim'], ['price', 'cya'], [' , ', 'dim'], ['url', 'cya']] },
        { k: 'rows', w: [.3, .1, .36] }, { k: 'rows', w: [.38, .1, .3] }, { k: 'rows', w: [.26, .12, .4] }
      ]
    },
    quiz: {
      title: 'quiz.exe', cps: 40,
      lines: [
        { k: 'cmd', seg: [['$ ', 'grn'], ['./quiz', 'txt']] },
        { k: 'out', seg: [['== ULTIMATE QUIZ GAME ==', 'cya']] },
        { k: 'out', seg: [['[1] Login [2] Register [3] Scores', 'dim']] },
        { k: 'cmd', seg: [['> ', 'amb'], ['1', 'txt']] },
        { k: 'out', seg: [['Topic: ', 'dim'], ['Geography', 'pur'], ['  Level: ', 'dim'], ['Easy', 'pur']] },
        { k: 'out', seg: [['Q1. Capital of Australia?', 'txt']] },
        { k: 'out', seg: [['a) Sydney b) Canberra c) Perth', 'dim']] },
        { k: 'cmd', seg: [['> ', 'amb'], ['b', 'txt']] },
        { k: 'out', seg: [['Correct!', 'grn'], ['  score saved to leaderboard', 'dim']] }
      ]
    },
    sql: {
      title: 'ask.py', cps: 44,
      lines: [
        { k: 'cmd', seg: [['$ ', 'grn'], ['ask ', 'txt'], ['"deposits by branch"', 'amb']] },
        { k: 'out', seg: [['schema match: ', 'dim'], ['3 tables', 'cya']] },
        { k: 'out', seg: [['SELECT ', 'pur'], ['branch, SUM(amt)', 'txt']] },
        { k: 'out', seg: [['FROM ', 'pur'], ['deposits ', 'txt'], ['GROUP BY ', 'pur'], ['branch', 'txt']] },
        { k: 'out', seg: [['sqlglot: ', 'dim'], ['read-only ', 'txt'], ['ok', 'grn']] },
        { k: 'out', seg: [['+ ', 'grn'], ['rows returned', 'txt']] }
      ]
    },
    generic: {
      title: 'terminal', cps: 42,
      lines: [
        { k: 'cmd', seg: [['$ ', 'grn'], ['python main.py', 'txt']] },
        { k: 'out', seg: [['loading modules ...... ', 'dim'], ['ok', 'grn']] },
        { k: 'out', seg: [['running pipeline', 'txt']] },
        { k: 'out', seg: [['+ ', 'grn'], ['done', 'txt']] }
      ]
    }
  };

  function termBuild(D) {
    if (D.period) return;
    var t = .5;
    D.lines.forEach(function (ln) {
      ln.len = 0; if (ln.seg) ln.seg.forEach(function (sg) { ln.len += sg[0].length; });
      ln.t0 = t + (ln.k === 'cmd' ? .45 : .1);
      ln.dur = ln.k === 'rows' ? .35 : ln.len / (ln.k === 'cmd' ? D.cps : D.cps * 3);
      t = ln.t0 + ln.dur;
      if (ln.k === 'cmd') t += .25;
    });
    D.tEnd = t; D.period = t + 1.2;
  }

  function panel(v, c, x, y, w, h, title, col) {
    var s = v.s;
    fillRR(c, x, y, w, h, 6, 'rgba(4,6,11,.84)');
    c.save(); c.beginPath(); rrp(c, x, y, w, h, 6); c.clip();
    c.fillStyle = 'rgba(255,255,255,.045)'; c.fillRect(x, y, w, 17 * s);
    winBar(v, c, x, y, w, 17 * s, title);
    c.restore();
    strokeRR(c, x + .5, y + .5, w - 1, h - 1, 6, rgba(col, .38), 1);
  }

  reg('terminal', {
    start: 3.5,                 /* pre-rolled: the first paint already shows several typed lines */
    freezeStill: true,
    still: function (v) { return v.st.def.tEnd + .3; },
    init: function (v) {
      var vr = v.variant, src = /quiz/.test(vr) ? TERMS.quiz : (/zapvi|scrap/.test(vr) ? TERMS.scraper : (/sql|finacle/.test(vr) ? TERMS.sql : TERMS.generic));
      v.st.def = JSON.parse(JSON.stringify(src)); termBuild(v.st.def);
    },
    layout: function (v) {
      var s = v.s, w = v.w, h = v.h, D = v.st.def, L = v.L = {}, c = v.ctx;
      L.px = 10 * s; L.py = 9 * s; L.pw = w - L.px * 2; L.ph = h - L.py * 2;
      L.bodyX = L.px + 10 * s; L.bodyY = L.py + 17 * s + 7 * s; L.bodyW = L.pw - 20 * s; L.bodyH = L.ph - 17 * s - 12 * s;
      var maxCh = 10; D.lines.forEach(function (ln) { if (ln.len > maxCh) maxCh = ln.len; });
      L.fs = clamp(Math.min(10.8 * s, L.bodyW / ((maxCh + 1) * .612)), 9, 16);
      L.lh = L.fs * 1.5; L.cw = L.fs * .612;
      L.rows = Math.max(3, Math.floor(L.bodyH / L.lh));
    },
    draw: function (v, c, t) {
      var D = v.st.def, L = v.L, s = v.s, w = v.w, tone = v.tone, i, k;
      var lt = mod(t, D.period), A = 1;
      panel(v, c, L.px, L.py, L.pw, L.ph, D.title, tone);
      /* which lines have started. The screen is never wiped: the previous run scrolls up as the next one starts typing (virtual index vi:
         0..n-1 = previous run, fully typed; n.. = current run) */
      var started = 0, nl = D.lines.length;
      for (i = 0; i < nl; i++) if (lt >= D.lines[i].t0) started = i + 1;
      var total = nl + started + (started ? 0 : 1);
      var first = Math.max(0, total - L.rows);
      c.save(); c.beginPath(); c.rect(L.px + 1, L.bodyY - 3 * s, L.pw - 2, L.bodyH + 5 * s); c.clip();
      c.globalAlpha = A;
      font(c, L.fs, 400); c.textBaseline = 'middle';
      var curY = 0, curX = 0;
      for (var vi = first; vi < nl + started; vi++) {
        var oldRun = vi < nl, ln = D.lines[oldRun ? vi : vi - nl], y = L.bodyY + (vi - first + .5) * L.lh, x = L.bodyX;
        i = oldRun ? -1 : vi - nl;
        if (ln.k === 'rows') {
          var ra = oldRun ? 1 : easeOut((lt - ln.t0) / ln.dur), cx = x;
          for (k = 0; k < ln.w.length; k++) { var bw = L.bodyW * ln.w[k] * ra; fillRR(c, cx, y - L.fs * .32, bw, L.fs * .64, 2, k === 1 ? rgba(tone, .55) : 'rgba(200,211,224,.28)'); cx += L.bodyW * ln.w[k] + L.cw * 2; }
          continue;
        }
        var n = Math.min(ln.len, Math.floor((lt - ln.t0) * (ln.len / ln.dur))), shown = 0;
        if (oldRun || lt - ln.t0 >= ln.dur) n = ln.len;
        for (k = 0; k < ln.seg.length && shown < n; k++) {
          var str = ln.seg[k][0].slice(0, n - shown);
          txt(c, str, x + shown * L.cw, y + .5, rgba(TC[ln.seg[k][1]], ln.seg[k][1] === 'dim' ? .85 : 1), 'left');
          shown += ln.seg[k][0].length;
        }
        if (!oldRun && i === started - 1) { curY = y; curX = x + n * L.cw; }
      }
      /* block cursor */
      var lastL = D.lines[Math.max(0, started - 1)], blink = Math.sin(t * 7) > -.3 || lt < lastL.t0 + lastL.dur;
      if (!started) { curX = L.bodyX; curY = L.bodyY + (total - first - .5) * L.lh; blink = Math.sin(t * 7) > -.3; }
      if (blink && lt < D.tEnd + 2) { c.fillStyle = rgba(bright(tone, .5), .95); c.fillRect(curX + 1, curY - L.fs * .52, L.cw * .8, L.fs * 1.04); }
      c.globalAlpha = 1; c.restore();
    }
  });

  /* ---------- CODE ---------- */
  var CODE_LINES = [
    [['from ', 'pur'], ['transformers ', 'txt'], ['import ', 'pur'], ['pipeline', 'cya']],
    [['MARIAN ', 'txt'], ['= ', 'dim'], ['"Helsinki-NLP/opus-mt-de-en"', 'grn']],
    [['BART ', 'txt'], ['= ', 'dim'], ['"facebook/bart-large-cnn"', 'grn']],
    [['mt ', 'txt'], ['= ', 'dim'], ['pipeline', 'cya'], ['("translation", MARIAN)', 'txt']],
    [['tldr ', 'txt'], ['= ', 'dim'], ['pipeline', 'cya'], ['("summarization", BART)', 'txt']],
    [['en ', 'txt'], ['= ', 'dim'], ['mt', 'cya'], ['(chunk)[0]', 'txt'], ['["translation_text"]', 'grn']],
    [['out ', 'txt'], ['= ', 'dim'], ['tldr', 'cya'], ['(en)[0]', 'txt'], ['["summary_text"]', 'grn']]
  ];
  /* AMS: the FastAPI service that drafts audit findings and refuses ungrounded facts */
  var CODE_AMS = [
    [['@router', 'pur'], ['.post', 'cya'], ['("/findings/draft")', 'grn']],
    [['async def ', 'pur'], ['draft', 'cya'], ['(req: Finding):', 'txt']],
    [['    ', 'txt'], ['ctx ', 'txt'], ['= ', 'dim'], ['ground', 'cya'], ['(req.evidence)', 'txt']],
    [['    ', 'txt'], ['out ', 'txt'], ['= ', 'dim'], ['llm.draft', 'cya'], ['(req, ctx)', 'txt']],
    [['    ', 'txt'], ['gates.check', 'cya'], ['(out, ctx)', 'txt']],
    [['    ', 'txt'], ['return ', 'pur'], ['rank(out)', 'txt']]
  ];
  var CODE_CPS = 62, CODE_GENERIC = [
    [['def ', 'pur'], ['predict', 'cya'], ['(x):', 'txt']],
    [['    ', 'txt'], ['z ', 'txt'], ['= ', 'dim'], ['model', 'cya'], ['.run(x)', 'txt']],
    [['    ', 'txt'], ['return ', 'pur'], ['softmax(z)', 'txt']],
    [],
    [['print', 'cya'], ['(predict(data))', 'txt']]
  ];

  function codeBuild(v) {
    var vr = v.variant, kind = /german|translate|summar/.test(vr) ? 'translate' : (/ams|^ams-|finding/.test(vr) ? 'ams' : 'neutral');
    var lines = kind === 'translate' ? CODE_LINES : (kind === 'ams' ? CODE_AMS : CODE_GENERIC), t = .5, out = [];
    lines.forEach(function (ln) {
      var len = 0; ln.forEach(function (sg) { len += sg[0].length; });
      var o = { seg: ln, len: len, t0: t, dur: Math.max(.15, len / CODE_CPS) };
      t = o.t0 + o.dur + .12; out.push(o);
    });
    v.st.lines = out; v.st.tEnd = t;
    v.st.flowT = t + .15; v.st.period = v.st.flowT + 4.0;
    v.st.kind = kind;
    v.st.file = kind === 'translate' ? 'translate.py' : (kind === 'ams' ? 'finding_engine.py' : 'main.py');
    v.st.flow = kind === 'translate' ? ['DE', 'MarianMT', 'EN', 'BART', 'SUMMARY'] : (kind === 'ams' ? ['EVIDENCE', 'GROUND', 'DRAFT', 'GATES', 'FINDING'] : null);
  }

  reg('code', {
    start: 3.5, freezeStill: true,
    still: function (v) { return v.st.flowT + 3.3; },
    init: function (v) { codeBuild(v); },
    layout: function (v) {
      var s = v.s, w = v.w, h = v.h, L = v.L = {};
      L.px = 10 * s; L.py = 9 * s; L.pw = w - L.px * 2; L.ph = h - L.py * 2;
      var maxCh = 10; v.st.lines.forEach(function (ln) { if (ln.len > maxCh) maxCh = ln.len; });
      L.gut = 22 * s;
      L.bodyX = L.px + L.gut + 6 * s; L.bodyW = L.pw - L.gut - 14 * s;
      L.fs = clamp(Math.min(10.4 * s, L.bodyW / ((maxCh + 1) * .612)), 8, 16);
      L.lh = L.fs * 1.5; L.cw = L.fs * .612;
      var n = v.st.lines.length, bodyTop = L.py + 17 * s + 5 * s;
      L.flow = !!v.st.flow && (L.ph - n * L.lh) > 56 * s;   /* the stage labels sit above the chips: the strip needs a clear band under the last code line */
      L.bodyY = bodyTop; L.flowY = L.py + L.ph - 13 * s;
    },
    draw: function (v, c, t) {
      var S = v.st, L = v.L, s = v.s, w = v.w, tone = v.tone, tone2 = v.tone2, i, k;
      var lt = mod(t, S.period), A = 1 - sstep(S.period - .3, S.period, lt);
      panel(v, c, L.px, L.py, L.pw, L.ph, S.file, tone);
      c.save(); c.beginPath(); c.rect(L.px + 1, L.py + 17 * s, L.pw - 2, L.ph - 17 * s - 1); c.clip();
      c.globalAlpha = A;
      font(c, L.fs, 400); c.textBaseline = 'middle';
      var activeY = null, curX = 0;
      for (i = 0; i < S.lines.length; i++) {
        var ln = S.lines[i], y = L.bodyY + (i + .5) * L.lh;
        var done = lt >= ln.t0 + ln.dur, on = lt >= ln.t0 && !done;
        if (lt < ln.t0) { /* gutter number appears once the line exists */ continue; }
        if (on) { fillRR(c, L.px + 3, y - L.lh / 2, L.pw - 6, L.lh, 2, rgba(tone, .09)); c.fillStyle = rgba(tone, .9); c.fillRect(L.px + 3, y - L.lh / 2, 2, L.lh); }
        txt(c, String(i + 1), L.px + L.gut - 2, y + .5, on ? rgba(bright(tone, .4), 1) : LBL, 'right');
        var n = done ? ln.len : Math.floor((lt - ln.t0) * ln.len / ln.dur), shown = 0, x = L.bodyX;
        for (k = 0; k < ln.seg.length && shown < n; k++) {
          var str = ln.seg[k][0].slice(0, n - shown);
          txt(c, str, x + shown * L.cw, y + .5, rgba(TC[ln.seg[k][1]], ln.seg[k][1] === 'dim' ? .9 : 1), 'left');
          shown += ln.seg[k][0].length;
        }
        if (on || i === S.lines.length - 1) { activeY = y; curX = x + n * L.cw; }
      }
      if (activeY != null && (Math.sin(t * 7) > -.3 || lt < S.tEnd)) { c.fillStyle = rgba(bright(tone, .5), .95); c.fillRect(curX + 1, activeY - L.fs * .52, 1.6, L.fs * 1.04); }

      /* translate -> summarise flow, lit once the code is written */
      if (L.flow) {
        var fy = L.flowY, lf = lt - S.flowT, items = S.flow.map(function (n) { return [n, 0]; });
        font(c, fsz(v, 8.5), 700); track(c, .6);
        var widths = [], tot = 0;
        for (i = 0; i < items.length; i++) { var wd = c.measureText(items[i][0]).width + (i % 2 === 0 ? 12 * s : 6 * s); widths.push(wd); tot += wd; }
        var gap = Math.max(6, (L.pw - 20 * s - tot) / 4), x0 = L.px + 10 * s, xs = [], xx = x0;
        for (i = 0; i < items.length; i++) { xs.push(xx); xx += widths[i] + gap; }
        for (i = 0; i < items.length; i++) {
          var stage = lf < 0 ? -1 : Math.floor(lf / 1.0), lit = lf >= 0 && (lf > i * .7 || lf > 3.2), isNode = i % 2 === 0, col = i === 1 ? tone2 : (i === 3 ? tone : tone);
          var ch = 12 * s, cy = fy;
          if (isNode) {
            var nc = i === 4 ? PAL.green : tone;
            fillRR(c, xs[i], cy - ch / 2, widths[i], ch, 3, rgba(nc, lit ? .2 : .06)); strokeRR(c, xs[i] + .5, cy - ch / 2 + .5, widths[i] - 1, ch - 1, 3, rgba(nc, lit ? .95 : .3), 1);
            txt(c, items[i][0], xs[i] + widths[i] / 2 + .3, cy + .5, lit ? rgba(bright(nc, .4), 1) : LBL, 'center');
          } else {
            var lc2 = i === 1 ? tone2 : PAL.amber;
            txt(c, items[i][0], xs[i] + widths[i] / 2, cy - 7 * s - 1, lit ? rgba(bright(lc2, .3), 1) : LBL, 'center');
            line(c, xs[i - 1] + widths[i - 1], cy, xs[i + 1], cy); c.strokeStyle = lit ? rgba(lc2, .85) : 'rgba(255,255,255,.18)'; c.lineWidth = 1; c.stroke();
            if (lf > 0) { var pp = fract(lf * .9 - (i - 1) * .35); if (lf > (i - 1) * .7 && lf < 3.8) { c.globalCompositeOperation = 'lighter'; glow(c, lerp(xs[i - 1] + widths[i - 1], xs[i + 1], pp), cy, 5 * s, lc2, .95); c.globalCompositeOperation = 'source-over'; } }
          }
        }
        track(c, 0);
      }
      c.globalAlpha = 1; c.restore();
    }
  });

  /* =====================================================================
     QR - text typed into a field, button press, modules ripple into a QR matrix, scan beam, next text.
     (The empty-input shake from the real tool plays at the start of every other cycle.)
     ===================================================================== */
  var QR_N = 21, QR_CYC = 9.6, QR_TEXTS = ['https://example.com', 'hello, world'];

  function qrMatrix(seed) {
    var r = rng(seed), m = [], fixed = [], i, j;
    for (i = 0; i < QR_N; i++) { m.push([]); fixed.push([]); for (j = 0; j < QR_N; j++) { m[i].push(r() < .5 ? 1 : 0); fixed[i].push(0); } }
    function finder(ox, oy) {
      for (var y = -1; y <= 7; y++) for (var x = -1; x <= 7; x++) {
        var X = ox + x, Y = oy + y; if (X < 0 || Y < 0 || X >= QR_N || Y >= QR_N) continue;
        var on = x >= 0 && x <= 6 && y >= 0 && y <= 6 && (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4));
        m[Y][X] = on ? 1 : 0; fixed[Y][X] = 2;
      }
    }
    finder(0, 0); finder(QR_N - 7, 0); finder(0, QR_N - 7);
    for (i = 8; i < QR_N - 8; i++) { m[6][i] = i % 2 === 0 ? 1 : 0; m[i][6] = i % 2 === 0 ? 1 : 0; fixed[6][i] = 1; fixed[i][6] = 1; }
    return { m: m, fixed: fixed };
  }

  reg('qr', {
    still: QR_CYC * 1 + 6.2,
    init: function (v) {
      var h = hashStr(v.variant);
      v.st.q = [qrMatrix(h ^ 0x51), qrMatrix(h ^ 0xa7)];
      var r = rng(h), d = [];
      for (var i = 0; i < QR_N; i++) { d.push([]); for (var j = 0; j < QR_N; j++) d[i].push(r()); }
      v.st.jit = d;
    },
    layout: function (v) {
      var s = v.s, w = v.w, h = v.h, L = v.L = {};
      L.pad = 10 * s; L.two = w / h > 1.12;
      L.ms = Math.min((L.two ? w * .4 : w * .56) / QR_N, (h - 30 * s) / QR_N);
      L.qs = L.ms * QR_N;
      L.qx = L.two ? w - L.pad - L.qs - 6 * s : (w - L.qs) / 2;
      L.qy = (h - L.qs) / 2 + 3 * s;
      L.ux = L.pad; L.uw = L.two ? Math.max(70 * s, L.qx - L.pad - 14 * s) : 0;
    },
    draw: function (v, c, t) {
      var L = v.L, s = v.s, w = v.w, h = v.h, tone = v.tone, tone2 = v.tone2, i, j;
      var ci = Math.floor(t / QR_CYC), lc = t - ci * QR_CYC, Q = v.st.q[ci % 2], jit = v.st.jit;
      var shakeCycle = ci % 2 === 0, typeStart = shakeCycle ? .95 : .3, text = QR_TEXTS[ci % 2], typeEnd = typeStart + text.length / 13;
      var pressT = typeEnd + .3, revealT = pressT + .25, scanT = revealT + 1.5, okT = scanT + 1.4, clearT = QR_CYC - 1.0;
      var clr = sstep(clearT, clearT + .6, lc);
      var A = 1 - clr;

      /* left: input + generate button */
      if (L.two) {
        var ux = L.ux, uw = L.uw, iy = h * .5 - 26 * s, ih = 19 * s;
        var shake = shakeCycle && lc > .25 && lc < .85 ? Math.sin((lc - .25) * 60) * 3 * s * (1 - (lc - .25) / .6) : 0;
        var empty = shakeCycle && lc > .25 && lc < .85;
        font(c, fsz(v, 8), 700); track(c, 1);
        txt(c, 'TEXT OR URL', ux, iy - 8 * s, LBL, 'left'); track(c, 0);
        var typedS = typed(text, lc, typeStart, 13); if (lc > QR_CYC - 1) typedS = '';
        var focus = lc >= typeStart - .1 && lc < pressT;
        fillRR(c, ux + shake, iy, uw, ih, 4, 'rgba(255,255,255,.05)');
        strokeRR(c, ux + shake + .5, iy + .5, uw - 1, ih - 1, 4, empty ? rgba(PAL.red, .95) : rgba(tone, focus ? .95 : .45), 1);
        font(c, fsz(v, 9), 400);
        var tw = c.measureText(typedS).width, maxW = uw - 14 * s;
        var tx = ux + shake + 7 * s - Math.max(0, tw - maxW);
        c.save(); c.beginPath(); c.rect(ux + shake + 3, iy, uw - 6, ih); c.clip();
        if (typedS) txt(c, typedS, tx, iy + ih / 2 + .5, 'rgba(232,241,255,.97)', 'left'); else txt(c, 'Enter text...', ux + shake + 7 * s, iy + ih / 2 + .5, LBL, 'left');
        if (focus && Math.sin(t * 9) > -.2) { c.fillStyle = rgba(bright(tone, .5), 1); c.fillRect(tx + tw + 1, iy + ih * .22, 1.4, ih * .56); }
        c.restore();
        var by = iy + ih + 7 * s, bh = 18 * s, bw = Math.min(uw, 74 * s);
        var press = clamp(1 - Math.abs(lc - pressT - .06) / .18, 0, 1), press2 = shakeCycle ? clamp(1 - Math.abs(lc - .3) / .18, 0, 1) : 0, pp = Math.max(press, press2);
        var bbw = bw * (1 - .04 * pp), bbx = ux + (bw - bbw) / 2;
        fillRR(c, bbx, by, bbw, bh, bh / 2, rgba(tone, .16 + .5 * pp)); strokeRR(c, bbx + .5, by + .5, bbw - 1, bh - 1, bh / 2, rgba(tone, .95), 1.2);
        font(c, fsz(v, 8.5), 700); track(c, 1);
        txt(c, 'GENERATE', bbx + bbw / 2 + .5, by + bh / 2 + .5, pp > .5 ? 'rgba(4,6,12,.95)' : rgba(bright(tone, .35), 1), 'center'); track(c, 0);
        c.globalCompositeOperation = 'lighter'; glow(c, bbx + bbw / 2, by + bh / 2, bbw * .7, tone, .12 + .4 * pp); c.globalCompositeOperation = 'source-over';
        /* status */
        var sy = by + bh + 10 * s;
        font(c, fsz(v, 8), 400);
        if (lc > revealT && A > 0) {
          c.globalAlpha = A; c.beginPath(); c.arc(ux + 3 * s, sy, 2.4 * s, 0, TAU);
          var ok = lc > okT; c.fillStyle = rgba(ok ? PAL.green : PAL.amber, .9); c.fill();
          txt(c, ok ? 'SCAN OK' : 'api.qrserver.com', ux + 10 * s, sy + .5, ok ? rgba(bright(PAL.green, .3), 1) : LBL, 'left'); c.globalAlpha = 1;
        }
      }

      /* QR matrix */
      var ms = L.ms, qx = L.qx, qy = L.qy, qs = L.qs;
      fillRR(c, qx - 5 * s, qy - 5 * s, qs + 10 * s, qs + 10 * s, 5, 'rgba(255,255,255,.035)');
      brackets(c, qx - 7 * s, qy - 7 * s, qs + 14 * s, qs + 14 * s, 9 * s, rgba(tone, .8), 1.4);
      var rev = lc - revealT, mid = QR_N / 2;
      c.beginPath();
      var pass = 0, scanY = qy + clamp((lc - scanT) / 1.2, 0, 1) * qs, scanning = lc > scanT && lc < scanT + 1.2;
      for (pass = 0; pass < 3; pass++) {
        c.beginPath();
        for (j = 0; j < QR_N; j++) for (i = 0; i < QR_N; i++) {
          if (!Q.m[j][i]) continue;
          var fx = Q.fixed[j][i] === 2;
          var dist = Math.sqrt((i - mid + .5) * (i - mid + .5) + (j - mid + .5) * (j - mid + .5));
          var pop = easeBack((rev - dist * .07 - jit[j][i] * .25) / .35 + (clr > 0 ? 0 : 0));
          if (clr > 0) pop *= 1 - clr * (.6 + jit[j][i] * .4);
          if (pop <= 0) continue;
          var mx = qx + i * ms + ms / 2, my = qy + j * ms + ms / 2, near = scanning && Math.abs(my - scanY) < ms * 1.6;
          var grp = fx ? 1 : (near ? 2 : 0);
          if (grp !== pass) continue;
          var sz = ms * .84 * Math.min(1.12, pop);
          rrp(c, mx - sz / 2, my - sz / 2, sz, sz, sz * .2);
        }
        c.fillStyle = pass === 1 ? rgba(tone2, .95) : (pass === 2 ? rgba(bright(tone, .75), 1) : rgba(tone, .86)); c.fill();
      }
      c.globalCompositeOperation = 'lighter'; if (rev > 0) glow(c, qx + qs / 2, qy + qs / 2, qs * .75, tone, .12 * A); c.globalCompositeOperation = 'source-over';
      if (scanning) {
        c.globalCompositeOperation = 'lighter'; glow(c, qx + qs / 2, scanY, qs * .6, bright(tone, .4), .22); c.globalCompositeOperation = 'source-over';
        line(c, qx - 5 * s, scanY, qx + qs + 5 * s, scanY); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1.3; c.stroke();
      }
      if (rev <= 0 && lc < QR_CYC - 1 || clr > .9) {          /* idle placeholder: dotted frame */
        font(c, fsz(v, 8.5), 700); track(c, 1); txt(c, 'QR', qx + qs / 2, qy + qs / 2, 'rgba(163,173,194,.4)', 'center'); track(c, 0);
      }
    }
  });

  /* =====================================================================
     GAME - self-playing Tetris on a 10x20 board (greedy bot with a little noise): pieces fall, stack, clear lines.
     ===================================================================== */
  var TET_SHAPES = {
    I: [[0, 0], [1, 0], [2, 0], [3, 0]], O: [[0, 0], [1, 0], [0, 1], [1, 1]], T: [[0, 0], [1, 0], [2, 0], [1, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]]
  };
  var TET_KEYS = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  var TET_COL = { I: [0, 255, 255], O: [232, 241, 255], T: [181, 83, 242], S: [52, 255, 140], Z: [255, 0, 110], J: [0, 128, 255], L: [255, 150, 60] };
  var TET_ROT = (function () {
    var out = {};
    TET_KEYS.forEach(function (k) {
      var cur = TET_SHAPES[k], list = [];
      for (var r = 0; r < 4; r++) {
        var mx = 99, my = 99;
        cur.forEach(function (c) { mx = Math.min(mx, c[0]); my = Math.min(my, c[1]); });
        var norm = cur.map(function (c) { return [c[0] - mx, c[1] - my]; });
        var sig = norm.map(function (c) { return c.join(); }).sort().join('|');
        if (!list.some(function (q) { return q.sig === sig; })) { var W = 0, H = 0; norm.forEach(function (c) { W = Math.max(W, c[0] + 1); H = Math.max(H, c[1] + 1); }); list.push({ cells: norm, sig: sig, w: W, h: H }); }
        cur = norm.map(function (c) { return [-c[1], c[0]]; });
      }
      out[k] = list;
    });
    return out;
  })();
  var TW = 10, TH = 20;

  function tetNew(v) {
    var g = { b: [], r: rng(hashStr(v.variant + 'tetris') + (v.st.games = (v.st.games || 0) + 1)), cur: null, next: null, clear: null, over: 0, lines: 0, score: 0, last: -1, bag: [] };
    for (var j = 0; j < TH; j++) g.b.push(new Array(TW).fill(0));
    g.next = tetPick(g); tetSpawn(g);
    return g;
  }
  function tetPick(g) {
    if (!g.bag.length) { g.bag = TET_KEYS.slice(); for (var i = g.bag.length - 1; i > 0; i--) { var j = Math.floor(g.r() * (i + 1)), tmp = g.bag[i]; g.bag[i] = g.bag[j]; g.bag[j] = tmp; } }
    return g.bag.pop();
  }
  function tetHit(g, cells, x, y) {
    for (var i = 0; i < cells.length; i++) {
      var X = x + cells[i][0], Y = y + cells[i][1];
      if (X < 0 || X >= TW || Y >= TH) return true;
      if (Y >= 0 && g.b[Y][X]) return true;
    }
    return false;
  }
  function tetPlan(g, key) {
    var best = null, bs = -1e9, rots = TET_ROT[key];
    for (var ri = 0; ri < rots.length; ri++) {
      var R = rots[ri];
      for (var x = 0; x <= TW - R.w; x++) {
        var y = -2; while (!tetHit(g, R.cells, x, y + 1)) y++;
        if (y < -1) continue;
        /* evaluate */
        var heights = [], holes = 0, lines = 0, i, j;
        var tmp = g.b.map(function (row) { return row.slice(); });
        R.cells.forEach(function (c) { if (y + c[1] >= 0) tmp[y + c[1]][x + c[0]] = 1; });
        for (j = 0; j < TH; j++) { var full = true; for (i = 0; i < TW; i++) if (!tmp[j][i]) { full = false; break; } if (full) lines++; }
        for (i = 0; i < TW; i++) { var hh = 0, seen = false; for (j = 0; j < TH; j++) { if (tmp[j][i]) { if (!seen) { hh = TH - j; seen = true; } } else if (seen) holes++; } heights.push(hh); }
        var agg = 0, bump = 0; for (i = 0; i < TW; i++) { agg += heights[i]; if (i) bump += Math.abs(heights[i] - heights[i - 1]); }
        var sc = -.51 * agg + .76 * lines * 3 - .36 * holes * 1.4 - .18 * bump + (g.r() - .5) * 3.2;
        if (sc > bs) { bs = sc; best = { ri: ri, x: x }; }
      }
    }
    return best;
  }
  function tetSpawn(g) {
    var key = g.next; g.next = tetPick(g);
    var plan = tetPlan(g, key) || { ri: 0, x: 3 }, R = TET_ROT[key][plan.ri];
    g.cur = { key: key, ri: plan.ri, x: Math.floor((TW - R.w) / 2), y: -R.h + 0, fy: -R.h, tx: plan.x };
    if (tetHit(g, R.cells, g.cur.x, Math.max(0, g.cur.y))) g.over = 1.1;
  }
  function tetStep(g, dt, speed) {
    if (g.over > 0) { g.over -= dt; return g.over <= 0 ? 'reset' : null; }
    if (g.clear) { g.clear.t -= dt; if (g.clear.t <= 0) { var rows = g.clear.rows; rows.sort(function (a, b) { return a - b; }); rows.forEach(function (rj) { g.b.splice(rj, 1); g.b.unshift(new Array(TW).fill(0)); }); g.clear = null; tetSpawn(g); } return null; }
    var p = g.cur, R = TET_ROT[p.key][p.ri];
    p.fy += speed * dt;
    while (Math.floor(p.fy) > p.y) {
      if (tetHit(g, R.cells, p.x, p.y + 1)) {            /* land */
        R.cells.forEach(function (c) { var Y = p.y + c[1]; if (Y >= 0) g.b[Y][p.x + c[0]] = p.key; });
        var rows = []; for (var j = 0; j < TH; j++) { var full = true; for (var i = 0; i < TW; i++) if (!g.b[j][i]) { full = false; break; } if (full) rows.push(j); }
        g.cur = null;
        if (rows.length) { g.clear = { rows: rows, t: .34 }; g.lines += rows.length; g.score += [0, 100, 300, 500, 800][rows.length]; }
        else { var top = 0; while (top < TH && !g.b[top].some(Boolean)) top++; if (top < 5) g.over = 1.1; else tetSpawn(g); }
        return null;
      }
      p.y++;
      var mv = 0; while (p.x !== p.tx && mv < 3) { var nx = p.x + (p.tx > p.x ? 1 : -1); if (tetHit(g, R.cells, nx, p.y)) break; p.x = nx; mv++; }
    }
    return null;
  }
  function tetCell(c, x, y, sz, col, a) {
    c.fillStyle = rgba(col, .86 * a); c.fillRect(x + .5, y + .5, sz - 1, sz - 1);
    c.fillStyle = rgba(bright(col, .65), .85 * a); c.fillRect(x + .5, y + .5, sz - 1, Math.max(1, sz * .16));
    c.fillRect(x + .5, y + .5, Math.max(1, sz * .16), sz - 1);
    c.fillStyle = rgba([0, 0, 0], .25 * a); c.fillRect(x + .5, y + sz - 1 - Math.max(1, sz * .12), sz - 1, Math.max(1, sz * .12));
  }

  reg('game', {
    still: 40,
    prep: function (v) {
      var g = v.st.g = tetNew(v), n = 0, guard = 0;
      while (n < 15 && guard++ < 4000) { var before = g.b.reduce(function (a, r) { return a + r.filter(Boolean).length; }, 0); tetStep(g, .05, 14); var after = g.b.reduce(function (a, r) { return a + r.filter(Boolean).length; }, 0); if (after !== before) n++; if (g.over > 0) break; }
      g.over = 0; if (!g.cur && !g.clear) tetSpawn(g);
      v.st.lastT = v.tt;
    },
    init: function (v) {
      v.st.g = tetNew(v); v.st.lastT = null;
      var r = rng(hashStr(v.variant + 'bg')), bg = [];
      for (var i = 0; i < 9; i++) bg.push({ k: TET_KEYS[Math.floor(r() * 7)], x: r(), ph: r(), sp: .02 + r() * .025, rot: Math.floor(r() * 4) });
      v.st.bg = bg;
    },
    layout: function (v) {
      var s = v.s, w = v.w, h = v.h, L = v.L = {};
      L.pad = 10 * s; L.cs = Math.max(4, Math.floor((h - 20 * s) / TH)); L.bw = L.cs * TW; L.bh = L.cs * TH;
      L.bx = Math.round((w - L.bw) / 2); L.by = Math.round((h - L.bh) / 2);
    },
    draw: function (v, c, t, dt) {
      var L = v.L, s = v.s, w = v.w, h = v.h, tone = v.tone, i, j, g = v.st.g, cs = L.cs, bx = L.bx, by = L.by;
      var d = v.st.lastT == null ? 0 : t - v.st.lastT; v.st.lastT = t;
      if (d < 0 || d > .5) d = 0;
      if (d > 0) { var sub = Math.ceil(d / .05), step = d / sub; for (i = 0; i < sub; i++) { if (tetStep(g, step, 11) === 'reset') { g = v.st.g = tetNew(v); } } }

      /* drifting background pieces (very faint) */
      c.globalAlpha = .13;
      v.st.bg.forEach(function (o) {
        var R = TET_ROT[o.k][o.rot % TET_ROT[o.k].length], yy = fract(o.ph + t * o.sp) * (h + 40 * s) - 20 * s;
        var side = o.x < .5 ? o.x / .5 * (bx - 16 * s - 4 * cs * .8) + 6 * s : bx + L.bw + 14 * s + (o.x - .5) / .5 * (w - bx - L.bw - 30 * s - 4 * cs * .8);
        R.cells.forEach(function (q) { tetCell(c, side + q[0] * cs * .8, yy + q[1] * cs * .8, cs * .8, TET_COL[o.k], 1); });
      });
      c.globalAlpha = 1;

      /* board */
      fillRR(c, bx - 3, by - 3, L.bw + 6, L.bh + 6, 3, 'rgba(4,6,11,.86)');
      c.globalCompositeOperation = 'lighter'; glow(c, bx + L.bw / 2, by + L.bh / 2, L.bw * 1.1, tone, .1 + .06 * v.hot); c.globalCompositeOperation = 'source-over';
      c.fillStyle = 'rgba(255,255,255,.035)';
      for (i = 1; i < TW; i++) c.fillRect(bx + i * cs, by, 1, L.bh);
      for (j = 1; j < TH; j++) c.fillRect(bx, by + j * cs, L.bw, 1);
      strokeRR(c, bx - 2.5, by - 2.5, L.bw + 5, L.bh + 5, 3, rgba(tone, .75), 1.3);
      c.save(); c.beginPath(); c.rect(bx, by, L.bw, L.bh); c.clip();
      var flash = g.clear ? Math.sin((.34 - g.clear.t) * 40) * .5 + .5 : 0, rowsClr = g.clear ? g.clear.rows : [];
      for (j = 0; j < TH; j++) for (i = 0; i < TW; i++) {
        var k = g.b[j][i]; if (!k) continue;
        if (rowsClr.indexOf(j) >= 0) { c.fillStyle = 'rgba(255,255,255,' + (.4 + .6 * flash) + ')'; c.fillRect(bx + i * cs + .5, by + j * cs + .5, cs - 1, cs - 1); }
        else tetCell(c, bx + i * cs, by + j * cs, cs, TET_COL[k], g.over > 0 ? .5 : 1);
      }
      if (g.cur) {
        var p = g.cur, R = TET_ROT[p.key][p.ri];
        var gy = p.y; while (!tetHit(g, R.cells, p.x, gy + 1)) gy++;                 /* landing shadow */
        R.cells.forEach(function (q) { c.strokeStyle = rgba(TET_COL[p.key], .35); c.lineWidth = 1; c.strokeRect(bx + (p.x + q[0]) * cs + 1.5, by + (gy + q[1]) * cs + 1.5, cs - 3, cs - 3); });
        var frac = clamp(p.fy - p.y, 0, 1);
        R.cells.forEach(function (q) { tetCell(c, bx + (p.x + q[0]) * cs, by + (p.y + q[1] + frac * .0) * cs, cs, TET_COL[p.key], 1); });
        c.globalCompositeOperation = 'lighter'; R.cells.forEach(function (q) { glow(c, bx + (p.x + q[0] + .5) * cs, by + (p.y + q[1] + .5) * cs, cs * 1.6, TET_COL[p.key], .22); }); c.globalCompositeOperation = 'source-over';
      }
      c.restore();

      /* side panels */
      var lx = L.pad, rx = bx + L.bw + 14 * s;
      font(c, fsz(v, 8), 700); track(c, 1);
      txt(c, 'SCORE', lx, by + 6 * s, LBL, 'left');
      txt(c, 'LINES', lx, by + 44 * s, LBL, 'left');
      txt(c, 'NEXT', rx, by + 6 * s, LBL, 'left'); track(c, 0);
      font(c, clamp(13 * s, 11, 19), 800, DISP);
      c.save(); c.shadowColor = rgba(tone, .7); c.shadowBlur = 7 * s;
      txt(c, ('0000' + g.score).slice(-5), lx, by + 22 * s, '#fff', 'left'); txt(c, ('00' + g.lines).slice(-3), lx, by + 60 * s, '#fff', 'left'); c.restore();
      if (g.next) {
        var NR = TET_ROT[g.next][0], ns = cs * 1.05;
        NR.cells.forEach(function (q) { tetCell(c, rx + q[0] * ns, by + 16 * s + q[1] * ns, ns, TET_COL[g.next], 1); });
      }
      if (g.over > 0) { font(c, fsz(v, 9), 700); track(c, 1.5); var oa = Math.min(1, g.over * 3); c.globalAlpha = oa; txt(c, 'GAME OVER', bx + L.bw / 2, by + L.bh / 2, rgba(PAL.red, 1), 'center'); c.globalAlpha = 1; track(c, 0); }
    }
  });

  /* =====================================================================
     MONOGRAM - large glowing initials with a sheen sweep, scramble-in on show / hover, falling glyph columns and a
     "generated" line (password-generator style).  Initials: data-initials, else first letters of the first 2 variant words.
     ===================================================================== */
  var MONO_CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*?';

  reg('monogram', {
    still: 2.4,
    init: function (v) {
      var ini = v.el.getAttribute('data-initials');
      if (!ini) { var words = (v.variant || 'pv').split(/[-_\s]+/).filter(Boolean); ini = (words[0] || 'P').charAt(0) + (words[1] ? words[1].charAt(0) : ''); }
      v.st.ini = ini.toUpperCase().slice(0, 3); v.st.scr0 = 0; v.st.hotPrev = 0;
      var r = rng(hashStr(v.variant + 'mono')), cols = [];
      for (var i = 0; i < 40; i++) cols.push({ x: r(), sp: .05 + r() * .09, ph: r(), n: 4 + Math.floor(r() * 4), seed: Math.floor(r() * 1e6) });
      v.st.cols = cols;
    },
    layout: function (v) {
      var s = v.s, w = v.w, h = v.h, L = v.L = {}, n = v.st.ini.length;
      L.fs = Math.min(h * .5, (w * .66) / (n * .9));
      L.cx = w / 2; L.cy = h * .47;
      L.ncols = Math.min(v.st.cols.length, Math.max(6, Math.floor(w / (v.lite ? 40 : 28))));
    },
    draw: function (v, c, t) {
      var L = v.L, s = v.s, w = v.w, h = v.h, tone = v.tone, tone2 = v.tone2, S = v.st, i, k;
      if (v.hot > .6 && S.hotPrev <= .6 && t - S.scr0 > 3) S.scr0 = t;
      S.hotPrev = v.hot;
      /* glyph rain */
      font(c, fsz(v, 10), 400); c.textBaseline = 'middle'; c.textAlign = 'center';
      for (k = 0; k < L.ncols; k++) {
        var col = S.cols[k], x = (k + .5) / L.ncols * w + (col.x - .5) * 8, head = fract(col.ph + t * col.sp * (1 + v.hot * .6)) * (h + col.n * 13) - col.n * 6;
        for (i = 0; i < col.n; i++) {
          var y = head - i * 13; if (y < -6 || y > h + 6) continue;
          var ch = MONO_CHARS.charAt(Math.floor(hashN(col.seed + Math.floor(y / 13) * 7 + Math.floor(t * 1.5 + i)) * MONO_CHARS.length));
          c.fillStyle = rgba(i === 0 ? bright(tone, .55) : tone, (i === 0 ? .42 : .16) * (1 - i / col.n));
          c.fillText(ch, x, y);
        }
      }
      /* backlight */
      c.globalCompositeOperation = 'lighter';
      glow(c, L.cx - L.fs * .35, L.cy, L.fs * 1.5, tone, .22 + .08 * pulse(t, .25) + .12 * v.hot);
      glow(c, L.cx + L.fs * .4, L.cy + L.fs * .1, L.fs * 1.3, tone2, .14 + .06 * pulse(t, .3 + .05));
      c.globalCompositeOperation = 'source-over';
      /* letters */
      var n = S.ini.length, adv = L.fs * .86, x0 = L.cx - adv * (n - 1) / 2, ts = t - S.scr0;
      font(c, L.fs, 900, DISP); c.textAlign = 'center'; c.textBaseline = 'middle';
      var sweepX = L.cx - L.fs * 2 + fract(t / 4.6) * (L.fs * 4 + 0), sw = L.fs * .8;
      var gr = c.createLinearGradient(sweepX - sw, 0, sweepX + sw, 0);
      var baseA = bright(tone, .12), baseB = mixc(tone, tone2, .55);
      gr.addColorStop(0, rgba(baseA, 1)); gr.addColorStop(.42, rgba(baseB, 1)); gr.addColorStop(.5, 'rgba(255,255,255,1)'); gr.addColorStop(.58, rgba(baseB, 1)); gr.addColorStop(1, rgba(baseA, 1));
      for (i = 0; i < n; i++) {
        var settle = .45 + i * .3, ch = S.ini.charAt(i), scr = ts < settle;
        if (scr) ch = MONO_CHARS.charAt(Math.floor(hashN(Math.floor(t * 18) + i * 13) * MONO_CHARS.length)).toUpperCase();
        var lx = x0 + i * adv;
        c.save(); c.translate(lx, L.cy); c.transform(1, 0, -.14, 1, 0, 0);
        c.lineJoin = 'round';
        c.lineWidth = L.fs * .1; c.strokeStyle = rgba(tone, .08); c.strokeText(ch, 0, 0);
        c.lineWidth = L.fs * .045; c.strokeStyle = rgba(tone, .2); c.strokeText(ch, 0, 0);
        c.restore();
        c.save(); c.translate(lx, L.cy); c.transform(1, 0, -.14, 1, 0, 0);
        c.fillStyle = scr ? rgba(bright(tone, .5), .9) : gr; c.fillText(ch, 0, 0);
        c.restore();
      }
      /* generated line */
      var G = Math.floor(t / 3.4), gl = 8 + (hashStr(v.variant + G) % 7), gt = t - G * 3.4, str = '';
      for (i = 0; i < gl; i++) { var set = .25 + i * .13; str += gt < set ? MONO_CHARS.charAt(Math.floor(hashN(Math.floor(t * 20) + i * 9) * MONO_CHARS.length)) : MONO_CHARS.charAt(Math.floor(hashN(G * 97 + i * 31) * MONO_CHARS.length)); }
      font(c, fsz(v, 9.5), 700); track(c, 1.5);
      var gy = h - 14 * s;
      txt(c, str, w / 2, gy, rgba(bright(tone, .35), .95), 'center'); track(c, 0);
      font(c, fsz(v, 8), 400); txt(c, 'len=' + gl, w - L.cx * 0 - 10 * s, gy + .5, LBL, 'right');
      txt(c, 'random', 10 * s, gy + .5, LBL, 'left');
    }
  });

  /* =====================================================================
     GENERIC - drifting node constellation (fallback for unknown types)
     ===================================================================== */
  reg('generic', {
    still: 3,
    init: function (v) {
      var r = rng(hashStr(v.variant + 'gen')), pts = [], n = v.lite ? 18 : 28;
      for (var i = 0; i < n; i++) pts.push({ x: r(), y: r(), a: r() * TAU, sp: .01 + r() * .02, rr: 1.4 + r() * 1.8, ph: r() * TAU });
      v.st.pts = pts;
    },
    draw: function (v, c, t) {
      var w = v.w, h = v.h, s = v.s, P2 = v.st.pts, n = P2.length, tone = v.tone, tone2 = v.tone2, i, j, xs = v.st.xs || (v.st.xs = []), ys = v.st.ys || (v.st.ys = []);
      for (i = 0; i < n; i++) {
        var p = P2[i];
        xs[i] = (.08 + .84 * (.5 + .5 * Math.sin(p.x * 9 + t * p.sp * 6 + p.a))) * w;
        ys[i] = (.12 + .76 * (.5 + .5 * Math.cos(p.y * 9 + t * p.sp * 5 + p.ph))) * h;
      }
      var maxD = Math.min(w, h) * .42;
      c.lineWidth = 1;
      for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) {
        var dx = xs[i] - xs[j], dy = ys[i] - ys[j], d2 = dx * dx + dy * dy;
        if (d2 < maxD * maxD) { var a = 1 - Math.sqrt(d2) / maxD; line(c, xs[i], ys[i], xs[j], ys[j]); c.strokeStyle = rgba(j % 3 === 0 ? tone2 : tone, a * .5); c.stroke(); }
      }
      c.globalCompositeOperation = 'lighter';
      for (i = 0; i < n; i++) glow(c, xs[i], ys[i], (6 + P2[i].rr * 3) * s, i % 4 === 0 ? tone2 : tone, .5 + .3 * Math.sin(t * 1.5 + P2[i].ph));
      c.globalCompositeOperation = 'source-over';
      for (i = 0; i < n; i++) { c.beginPath(); c.arc(xs[i], ys[i], P2[i].rr * s, 0, TAU); c.fillStyle = rgba(bright(i % 4 === 0 ? tone2 : tone, .6), 1); c.fill(); }
    }
  });

  /* =====================================================================
     SCREENSHOT - frame + scanlines + corner brackets + sweeping scan line around an <img> child (CSS does the
     frame, JS only adds the sweep).  Without an <img> a canvas mock of the app is drawn instead
     (variant spam-classifier: message verdicts + confusion matrix; atm-simulator: PIN entry + main menu).
     ===================================================================== */
  var SS_BAR = 22;

  reg('screenshot', {
    still: function (v) { return v.st.kind === 'atm' ? 6.4 : 4.3; },
    mount: function (v) {
      var img = v.el.querySelector('img');
      if (!img) return false;
      var sw = doc.createElement('span'); sw.className = 'pv-sweep'; sw.setAttribute('aria-hidden', 'true'); sw.appendChild(doc.createElement('i'));
      v.el.appendChild(sw);
      return true;
    },
    init: function (v) { v.st.kind = /atm/.test(v.variant) ? 'atm' : (/spam/.test(v.variant) ? 'spam' : 'app'); },
    layout: function (v) {
      var s = v.s, w = v.w, h = v.h, L = v.L = {};
      L.oy = SS_BAR + 8; L.ox = 10; L.iw = w - 20; L.ih = h - L.oy - 10;
    },
    draw: function (v, c, t) {
      var L = v.L, s = v.s, w = v.w, h = v.h, tone = v.tone, tone2 = v.tone2, i, k = v.st.kind;
      c.save(); c.translate(L.ox, L.oy);
      var iw = L.iw, ih = L.ih, fp = fsz(v, 8.5);
      if (k === 'spam') {
        var per = 4.6, lc = mod(t, per), ci = Math.floor(t / per), rows = 4, rh = ih / rows - 3 * s, lw = iw * .58;
        var msgs = [[.62, .4], [.5, .3], [.7, .5], [.44, .36]];
        for (i = 0; i < rows; i++) {
          var y = i * (rh + 3 * s), scanT = .35 + i * .9, spam = ((i * 7 + ci * 3 + (hashStr(v.variant) & 3)) % 5) < 2, sc = easeBack((lc - scanT - .3) / .3), act = lc > scanT && lc < scanT + .9;
          var col = spam ? PAL.magenta : PAL.green;
          fillRR(c, 0, y, lw, rh, 4, act ? rgba(tone, .12) : 'rgba(255,255,255,.04)'); strokeRR(c, .5, y + .5, lw - 1, rh - 1, 4, act ? rgba(tone, .9) : 'rgba(255,255,255,.12)', 1);
          c.beginPath(); c.arc(9 * s, y + rh / 2, 4 * s, 0, TAU); c.fillStyle = rgba(spam ? PAL.magenta : tone, .35); c.fill();
          fillRR(c, 19 * s, y + rh * .3, (lw - 70 * s) * msgs[i][0], 3 * s, 1.5, 'rgba(200,211,224,.4)');
          fillRR(c, 19 * s, y + rh * .6, (lw - 70 * s) * msgs[i][1], 3 * s, 1.5, 'rgba(200,211,224,.22)');
          if (lc > scanT + .3) {
            c.globalAlpha = Math.min(1, sc); var lab = spam ? 'SPAM' : 'HAM'; font(c, fp, 700); track(c, .8);
            var tw = c.measureText(lab).width + 10; fillRR(c, lw - tw - 5 * s, y + rh / 2 - 7 * s, tw, 14 * s, 3, rgba(col, .16)); strokeRR(c, lw - tw - 5 * s + .5, y + rh / 2 - 7 * s + .5, tw - 1, 14 * s - 1, 3, rgba(col, .9), 1);
            txt(c, lab, lw - tw / 2 - 5 * s + .4, y + rh / 2 + .5, rgba(bright(col, .35), 1), 'center'); track(c, 0); c.globalAlpha = 1;
          }
        }
        /* confusion matrix: [[896, 0], [30, 108]] on 1,034 held-out messages */
        var mx = lw + 14 * s, mw = iw - mx, cwd = Math.min(46 * s, (mw - 4) / 2), chh = Math.min(34 * s, (ih - 40 * s) / 2), my = 22 * s;
        var cells = [[896, PAL.green, .9], [0, PAL.red, .05], [30, PAL.amber, .22], [108, PAL.magenta, .6]], gx = mx + (mw - cwd * 2 - 4) / 2;
        font(c, fsz(v, 8), 700); track(c, .8); txt(c, fitText(c, ['CONFUSION MATRIX', 'MATRIX'], mw), mx + mw / 2, 8 * s, LBL, 'center'); track(c, 0);
        for (i = 0; i < 4; i++) {
          var cxm = gx + (i % 2) * (cwd + 4), cym = my + Math.floor(i / 2) * (chh + 4), ca = easeOut((lc - 3.2 - i * .12) / .4);
          fillRR(c, cxm, cym, cwd, chh, 3, rgba(cells[i][1], .08 + .4 * cells[i][2] * ca)); strokeRR(c, cxm + .5, cym + .5, cwd - 1, chh - 1, 3, rgba(cells[i][1], .35 + .6 * cells[i][2]), 1);
          font(c, clamp(12 * s, 11, 17), 800, DISP); txt(c, String(Math.round(cells[i][0] * ca)), cxm + cwd / 2, cym + chh / 2 + .5, rgba(bright(cells[i][1], .3), Math.min(1, .35 + ca)), 'center');
        }
        font(c, fsz(v, 8), 400); txt(c, fitText(c, ['1,034 TEST MESSAGES', '1,034 TESTS'], mw), mx + mw / 2, my + chh * 2 + 14 * s, LBL, 'center');
      } else if (k === 'atm') {
        var phase = mod(t, 8) < 3.6 ? 0 : 1, pl = mod(t, 8), sw2 = iw * .56, sh = ih;
        fillRR(c, 0, 0, sw2, sh, 5, 'rgba(4,6,11,.85)'); strokeRR(c, .5, .5, sw2 - 1, sh - 1, 5, rgba(tone, .55), 1.2);
        font(c, fsz(v, 8.5), 700); track(c, 1.2);
        txt(c, phase === 0 ? 'ENTER YOUR PIN' : 'MAIN MENU', sw2 / 2, 11 * s, rgba(bright(tone, .35), 1), 'center'); track(c, 0);
        if (phase === 0) {
          for (i = 0; i < 4; i++) { var on = pl > .8 + i * .65; c.beginPath(); c.arc(sw2 / 2 + (i - 1.5) * 14 * s, sh * .42, 4.2 * s, 0, TAU); c.fillStyle = on ? rgba(bright(tone, .4), 1) : 'rgba(255,255,255,.12)'; c.fill(); if (on) { c.globalCompositeOperation = 'lighter'; glow(c, sw2 / 2 + (i - 1.5) * 14 * s, sh * .42, 9 * s, tone, .5); c.globalCompositeOperation = 'source-over'; } }
          font(c, fsz(v, 8), 400); txt(c, 'CARD + PIN', sw2 / 2, sh * .72, LBL, 'center');
          var cp = easeOut(pl / .6); fillRR(c, sw2 / 2 - 16 * s, sh * .86 - (1 - cp) * 16 * s, 32 * s, 9 * s, 2, rgba(tone2, .25)); strokeRR(c, sw2 / 2 - 16 * s + .5, sh * .86 - (1 - cp) * 16 * s + .5, 32 * s - 1, 9 * s - 1, 2, rgba(tone2, .9), 1);
        } else {
          var items = ['DEPOSIT', 'WITHDRAWAL', 'FAST CASH', 'MINI STATEMENT', 'PIN CHANGE'], hi = Math.floor((pl - 3.6) / .85) % 5, rh2 = (sh - 24 * s) / 5;
          font(c, fsz(v, 8.5), 700);
          for (i = 0; i < 5; i++) { var yy = 20 * s + i * rh2, a2 = i === hi; fillRR(c, 8 * s, yy, sw2 - 16 * s, rh2 - 2 * s, 3, a2 ? rgba(tone, .2) : 'rgba(255,255,255,.04)'); if (a2) strokeRR(c, 8 * s + .5, yy + .5, sw2 - 16 * s - 1, rh2 - 2 * s - 1, 3, rgba(tone, .9), 1); txt(c, items[i], 14 * s, yy + (rh2 - 2 * s) / 2 + .5, a2 ? rgba(bright(tone, .5), 1) : LBL, 'left'); }
        }
        /* keypad */
        var kx = sw2 + 12 * s, kw = iw - kx, kc = 3, kr = 4, kcw = (kw - 3 * s * (kc - 1)) / kc, kch = Math.min(kcw * .62, (ih - 3 * s * (kr - 1)) / kr), lab2 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'];
        var pressed = phase === 0 ? [3, 7, 1, 5][Math.min(3, Math.max(0, Math.floor((pl - .8) / .65)))] : -1, pt = phase === 0 ? fract((pl - .8) / .65) : 1;
        font(c, fsz(v, 8.5), 700);
        for (i = 0; i < 12; i++) {
          var kxx = kx + (i % 3) * (kcw + 3 * s), kyy = (ih - (kch * 4 + 9 * s)) / 2 + Math.floor(i / 3) * (kch + 3 * s), pr = i === pressed && pl > .8 && pl < 3.4 ? clamp(1 - pt * 2, 0, 1) : 0;
          fillRR(c, kxx, kyy, kcw, kch, 3, rgba(tone, .06 + .5 * pr)); strokeRR(c, kxx + .5, kyy + .5, kcw - 1, kch - 1, 3, rgba(tone, .35 + .6 * pr), 1);
          txt(c, lab2[i], kxx + kcw / 2 + .4, kyy + kch / 2 + .5, pr > .3 ? 'rgba(4,6,12,.95)' : LBL, 'center');
        }
      } else {
        /* generic app mock: sidebar + cards + chart line */
        fillRR(c, 0, 0, iw * .2, ih, 4, 'rgba(255,255,255,.04)');
        for (i = 0; i < 5; i++) fillRR(c, 7 * s, 8 * s + i * 14 * s, iw * .2 - 14 * s, 6 * s, 3, i === Math.floor(t / 1.2) % 5 ? rgba(tone, .7) : 'rgba(200,211,224,.2)');
        for (i = 0; i < 3; i++) { var cx2 = iw * .24 + i * (iw * .76 - 8 * s) / 3; fillRR(c, cx2, 0, (iw * .76 - 8 * s) / 3 - 4 * s, ih * .3, 4, 'rgba(255,255,255,.05)'); strokeRR(c, cx2 + .5, .5, (iw * .76 - 8 * s) / 3 - 4 * s - 1, ih * .3 - 1, 4, rgba(i === 1 ? tone2 : tone, .55), 1); }
        c.beginPath(); for (i = 0; i <= 30; i++) { var xx = iw * .24 + (iw * .74) * i / 30, yy2 = ih * .62 + Math.sin(i * .5 + t * 1.3) * ih * .13 + Math.sin(i * .21) * ih * .08; if (i) c.lineTo(xx, yy2); else c.moveTo(xx, yy2); } neon(c, tone, 1.5, .95);
      }
      c.restore();
    }
  });

  /* =====================================================================
     ENGINE - instances, shared scheduler, observers, hover, reduced motion
     ===================================================================== */
  var live = [];            /* every mounted visual */
  var active = [];          /* visible + animating */
  var loopOn = false, ownId = 0, lastTs = 0;
  var ro = null, ioVis = null, ioNear = null;
  var fontsOk = false;

  function reduced() { return P ? P.prefersReducedMotion : !!(win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function liteEnv() { return P ? (P.isMobile || P.isCoarse) : !!(win.matchMedia && win.matchMedia('(max-width: 767px), (pointer: coarse)').matches); }

  function Visual(el, type) {
    this.el = el;
    this.type = type;
    this.def = TYPES[type];
    this.variant = (el.getAttribute('data-variant') || '').toLowerCase();
    this.rnd = rng(hashStr(this.variant || type));
    this.st = {};
    this.cv = null; this.ctx = null;
    this.cw = 0; this.ch = 0;               /* css size reported by ResizeObserver */
    this.w = 0; this.h = 0; this.s = 1; this.dpr = 1;
    this.lite = false;
    this.tt = 0; this.hot = 0; this.hotT = 0; this.acc = 0;
    this.frozen = false;                    /* parked on its last frame (only MAX_ANIM visuals animate at once) */
    this.tagH = 0;                          /* height of the 'Illustration' strip, subtracted from the canvas box */
    this.near = false; this.visible = false; this.drawn = false; this.dead = false; this.noCanvas = false;
    this.readTone();
  }
  Visual.prototype.readTone = function () {
    var el = this.el, name = el.getAttribute('data-tone');
    if (!name) { var h = el.closest ? el.closest('[data-tone]') : null; name = h ? h.getAttribute('data-tone') : ''; }
    if (!PAL[name] || name === 'white' || name === 'ink' || name === 'red' || name === 'amber') name = doc.documentElement.getAttribute('data-accent') || 'cyan';
    if (!PAL[name]) name = 'cyan';
    this.toneName = name;
    this.tone = PAL[name];
    this.tone2 = PAL[PARTNER[name]] || PAL.purple;
  };
  Visual.prototype.alloc = function () {
    if (this.dead || this.noCanvas || !this.cv) return;
    var cw = this.cw, ch = this.ch;
    if (!cw || !ch || !this.near) return;
    this.lite = liteEnv();
    var dpr = Math.min(win.devicePixelRatio || 1, this.lite ? 1.5 : 2);
    var pw = Math.round(cw * dpr), ph = Math.round(ch * dpr);
    var changed = this.cv.width !== pw || this.cv.height !== ph || this.w !== cw || this.h !== ch;
    if (!changed) return;
    this.cv.width = pw; this.cv.height = ph;
    this.ctx.__f = this.ctx.__ls = null;     /* a canvas resize resets font / letterSpacing: drop the memo */
    this.w = cw; this.h = ch; this.dpr = dpr;
    this.s = clamp(Math.min(cw / 320, ch / 180), .72, 1.9);
    this.relayout();
    this.drawn = false;
  };
  Visual.prototype.free = function () {
    if (!this.cv || this.noCanvas || !this.w) return;
    this.cv.width = 0; this.cv.height = 0; this.w = this.h = 0; this.drawn = false;
  };
  Visual.prototype.relayout = function () {
    if (!this.w) return;
    try { if (this.def.layout) this.def.layout(this); } catch (e) { this.fail(e); }
  };
  Visual.prototype.paint = function (dt) {
    if (this.dead || !this.w || !this.ctx) return;
    var c = this.ctx;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.__f = c.__ls = null;
    c.clearRect(0, 0, this.w, this.h);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    try { this.def.draw(this, c, this.tt, dt || 0); } catch (e) { this.fail(e); return; }
    if (!this.drawn) { this.drawn = true; this.el.classList.add('is-ready'); }
  };
  Visual.prototype.still = function () {     /* a deliberately chosen static frame (reduced motion / offscreen first paint) */
    if (!this.w) return;
    var d = this.def;
    if (d.still != null) this.tt = typeof d.still === 'function' ? d.still(this) : d.still;
    if (d.prep) { try { d.prep(this); } catch (e) { this.fail(e); return; } }
    this.paint(0);
  };
  Visual.prototype.refreshFrame = function () {
    if (!this.w) return;
    if (reduced() || active.indexOf(this) < 0) this.still(); else this.paint(0);
  };
  Visual.prototype.fail = function (e) {
    this.dead = true;
    var i = active.indexOf(this); if (i >= 0) active.splice(i, 1);
    this.el.classList.add('pv--failed');
    if (win.console && console.error) console.error('[visuals] ' + this.type + ' failed', e);
  };

  /* ---------- scheduler ---------- */
  /* The cards are decorative thumbnails: at most MAX_ANIM of them animate at once (the ones nearest the viewport centre, plus any hovered /
     focused one); the rest are parked on their last frame. Everything runs at 30 fps unless it is hot (hover / focus). */
  var MAX_ANIM = 2, rankT = 9;
  function rankVisuals() {
    var mid = (win.innerHeight || 800) * .5, cand = [], hotN = 0, i, v, r;
    for (i = 0; i < active.length; i++) {
      v = active[i];
      if (!v.w || v.dead) continue;
      if (v.hotT > 0) { hotN++; v.frozen = false; continue; }
      r = v.el.getBoundingClientRect();
      cand.push({ v: v, d: Math.abs((r.top + r.bottom) * .5 - mid) - (v.frozen ? 0 : 70) });   /* hysteresis: the animating ones keep their slot */
    }
    cand.sort(function (a, b) { return a.d - b.d; });
    for (i = 0; i < cand.length; i++) {
      v = cand[i].v;
      var park = (i + hotN) >= MAX_ANIM;
      if (park && !v.frozen) { v.frozen = true; v.hot = 0; v.acc = 0; if (v.def.freezeStill) v.still(); }
      else if (!park && v.frozen) v.frozen = false;
    }
  }
  function master(dt) {
    dt = Math.min(dt || .016, .05);
    rankT += dt;
    if (rankT > .25) { rankT = 0; rankVisuals(); }
    for (var i = 0; i < active.length; i++) {
      var v = active[i], d = dt;
      if (!v.w || v.dead || v.frozen) continue;
      if (v.lite || v.hot < .05) { v.acc += dt; if (v.acc < .031) continue; d = v.acc; v.acc = 0; }   /* 30 fps (full rate only while hot) */
      v.hot += (v.hotT - v.hot) * (1 - Math.exp(-d * 7));
      v.tt += d * (1 + 1.15 * v.hot);
      v.paint(d);
    }
  }
  function masterJob(ts, dt) { master(dt); if (!active.length || reduced()) { loopOn = false; return false; } }
  function ownTick(ts) {
    ownId = 0;
    if (!loopOn || doc.hidden) return;
    var dt = lastTs ? Math.min((ts - lastTs) / 1000, .05) : .016; lastTs = ts;
    master(dt);
    if (!active.length || reduced()) { loopOn = false; return; }
    ownId = win.requestAnimationFrame(ownTick);
  }
  function ensureLoop() {
    if (loopOn || !active.length || reduced()) return;
    loopOn = true;
    if (P && P.raf) P.raf.add(masterJob);
    else { lastTs = 0; if (!doc.hidden) ownId = win.requestAnimationFrame(ownTick); }
  }
  function stopLoop() {
    loopOn = false;
    if (P && P.raf) P.raf.remove(masterJob);
    if (ownId && win.cancelAnimationFrame) { win.cancelAnimationFrame(ownId); ownId = 0; }
  }

  function setVisible(v, on) {
    if (v.dead || v.visible === on) return;
    v.visible = on; rankT = 9;
    v.el.classList.toggle('is-live', on && !reduced());
    var i = active.indexOf(v);
    if (on) {
      if (v.noCanvas) return;
      if (!v.drawn) v.refreshFrame();
      if (!reduced() && i < 0) { active.push(v); ensureLoop(); }
    } else if (i >= 0) {
      active.splice(i, 1);
      if (!active.length) stopLoop();
    }
  }
  function setNear(v, on) {
    if (v.dead || v.near === on) return;
    v.near = on;
    if (on) { v.alloc(); if (v.w && !v.drawn) v.refreshFrame(); } else if (!v.visible) v.free();
  }

  /* ---------- hover / focus intensify ---------- */
  function wireHover(v) {
    var host = v.el.closest('.card') || v.el.closest('[data-pv-host]') || v.el;
    v.host = host;
    var H = host.__pvH;
    if (!H) {
      H = host.__pvH = { vs: [], hover: false, focus: false };
      var upd = function () {
        var on = H.hover || H.focus;
        rankT = 9;
        for (var i = 0; i < H.vs.length; i++) { H.vs[i].hotT = on ? 1 : 0; if (on) H.vs[i].el.setAttribute('data-hot', ''); else H.vs[i].el.removeAttribute('data-hot'); }
        if (!on || reduced()) return;
        for (var j = 0; j < H.vs.length; j++) if (H.vs[j].visible && !H.vs[j].dead && active.indexOf(H.vs[j]) < 0 && !H.vs[j].noCanvas) { active.push(H.vs[j]); ensureLoop(); }
      };
      host.addEventListener('pointerenter', function (e) { if (e.pointerType === 'touch') return; H.hover = true; upd(); });
      host.addEventListener('pointerleave', function () { H.hover = false; upd(); });
      host.addEventListener('focusin', function () { H.focus = true; upd(); });
      host.addEventListener('focusout', function (e) { if (!e.relatedTarget || !host.contains(e.relatedTarget)) { H.focus = false; upd(); } });
    }
    H.vs.push(v);
  }

  /* ---------- mount ---------- */
  /* every generated (non-screenshot) visual says so: a small visible 'Illustration' strip, so invented transcripts and verdicts are never mistaken for real output */
  function addTag(v) {
    var el = v.el;
    if (el.querySelector('.pv-tag')) return;
    var tag = doc.createElement('span');
    tag.className = 'pv-tag'; tag.setAttribute('aria-hidden', 'true'); tag.textContent = 'Illustration';
    el.appendChild(tag); el.classList.add('has-tag');
    v.tagH = 18;
  }
  function mount(el) {
    if (!el || el.__pv || !el.getAttribute) return null;
    var type = (el.getAttribute('data-visual') || '').toLowerCase();
    if (!TYPES[type]) type = TYPES.generic ? 'generic' : '';
    if (!type) return null;
    if (ACCEPTS[type] && !ACCEPTS[type].test((el.getAttribute('data-variant') || '').toLowerCase())) type = TYPES.generic ? 'generic' : type;
    var v = new Visual(el, type);
    el.__pv = v;
    live.push(v);
    el.setAttribute('data-pv', type);
    if (!el.hasAttribute('role') && !el.hasAttribute('aria-hidden')) el.setAttribute('aria-hidden', 'true');   /* decorative: the card text carries the meaning */

    var handled = false;
    if (v.def.mount) { try { handled = !!v.def.mount(v); } catch (e) { handled = false; if (win.console) console.error(e); } }
    if (handled) v.noCanvas = true;
    else {
      var cv = doc.createElement('canvas');
      cv.className = 'pv-canvas';
      cv.setAttribute('aria-hidden', 'true');
      el.insertBefore(cv, el.firstChild);
      v.cv = cv; v.ctx = cv.getContext('2d');
      if (!v.ctx) { v.dead = true; el.classList.add('pv--failed'); return v; }
      if (v.def.init) { try { v.def.init(v); } catch (e2) { v.fail(e2); } }
      if (v.def.start != null) v.tt = v.def.start;           /* pre-rolled timelines (chat / terminal / code) */
      var ctx2 = v.ctx, rst = ctx2.restore;
      ctx2.restore = function () { rst.call(this); this.__f = this.__ls = null; };   /* restore() reverts font / letterSpacing: drop the memo */
      addTag(v);
    }
    wireHover(v);
    if (ro) ro.observe(el);
    if (ioVis) ioVis.observe(el); else setVisible(v, true);
    if (ioNear) ioNear.observe(el); else { v.near = true; }
    return v;
  }
  /* tiles are mounted when they come within reach of the viewport (not all at once at load): the first paint stays light */
  function mountAll() {
    var list = doc.querySelectorAll('.pv');
    if (!('IntersectionObserver' in win)) { for (var j = 0; j < list.length; j++) if (!list[j].__pv) mount(list[j]); return; }
    var ioMount = new IntersectionObserver(function (es) {
      for (var i = 0; i < es.length; i++) {
        if (!es[i].isIntersecting) continue;
        ioMount.unobserve(es[i].target);
        mount(es[i].target);
      }
    }, { rootMargin: '600px 0px', threshold: 0 });
    for (var k = 0; k < list.length; k++) if (!list[k].__pv) ioMount.observe(list[k]);
  }

  /* ---------- global listeners ---------- */
  function onMotionChange() {
    if (reduced()) {
      stopLoop();
      active.length = 0;
      live.forEach(function (v) { v.el.classList.remove('is-live'); v.tt = 0; if (v.w) v.still(); });
    } else {
      live.forEach(function (v) {
        if (v.visible && !v.noCanvas && !v.dead && active.indexOf(v) < 0) active.push(v);
        v.el.classList.toggle('is-live', v.visible);
      });
      ensureLoop();
    }
  }
  function onFonts() {
    fontsOk = true;
    live.forEach(function (v) { v.relayout(); if (v.w && !(active.indexOf(v) >= 0 && !reduced())) v.refreshFrame(); });
  }
  function onAccent() {
    live.forEach(function (v) {
      if (v.el.getAttribute('data-tone') || (v.el.closest && v.el.closest('[data-tone]'))) return;
      v.readTone(); v.relayout(); if (v.w && !(active.indexOf(v) >= 0 && !reduced())) v.refreshFrame();
    });
  }
  var lastDpr = win.devicePixelRatio || 1;
  function onWinResize() {
    var d = win.devicePixelRatio || 1;
    if (d === lastDpr) return;
    lastDpr = d;
    live.forEach(function (v) { if (v.cv && !v.noCanvas) { v.w = 0; v.alloc(); if (v.w) v.refreshFrame(); } });
  }

  function init() {
    if (win.__pvBooted) return;
    win.__pvBooted = true;

    if ('ResizeObserver' in win) {
      ro = new ResizeObserver(function (es) {
        for (var i = 0; i < es.length; i++) {
          var v = es[i].target.__pv; if (!v) continue;
          var r = es[i].contentRect;
          v.cw = Math.round(r.width * 10) / 10; v.ch = Math.round(Math.max(0, r.height - v.tagH) * 10) / 10;
          if (v.noCanvas) continue;
          if (!v.cw || !v.ch) { v.free(); continue; }
          v.alloc();
          if (v.w) v.refreshFrame();   /* the resize cleared the canvas: repaint synchronously */
        }
      });
    }
    if ('IntersectionObserver' in win) {
      ioVis = new IntersectionObserver(function (es) { for (var i = 0; i < es.length; i++) { var v = es[i].target.__pv; if (v) setVisible(v, es[i].isIntersecting); } }, { rootMargin: '40px 0px', threshold: 0 });
      ioNear = new IntersectionObserver(function (es) { for (var i = 0; i < es.length; i++) { var v = es[i].target.__pv; if (v) setNear(v, es[i].isIntersecting); } }, { rootMargin: '900px 0px', threshold: 0 });
    }

    mountAll();

    doc.addEventListener('portfolio:motion', onMotionChange);
    doc.addEventListener('portfolio:accent', onAccent);
    win.addEventListener('resize', onWinResize, { passive: true });
    doc.addEventListener('visibilitychange', function () { if (!doc.hidden && loopOn && !(P && P.raf) && !ownId) { lastTs = 0; ownId = win.requestAnimationFrame(ownTick); } });

    if (doc.fonts && doc.fonts.load) {
      var loads = ['700 10px "Space Mono"', '400 10px "Space Mono"', '700 14px "Orbitron"', '900 40px "Orbitron"'].map(function (f) { return doc.fonts.load(f).catch(function () { return []; }); });
      Promise.all(loads).then(onFonts, onFonts);
    } else fontsOk = true;
  }

  var api = { types: Object.keys(TYPES), list: function () { return live.slice(); }, activeCount: function () { return active.filter(function (v) { return !v.frozen && !v.dead; }).length; }, visibleCount: function () { return active.length; } };
  if (P) P.visuals = api; else win.PortfolioVisuals = api;

  if (P && P.ready) P.ready(init);
  else if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
