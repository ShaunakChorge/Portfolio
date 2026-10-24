#!/usr/bin/env node
/**
 * process-photo.mjs - turns a finished portrait ARTWORK into the site's animated neon portrait assets.
 *
 *   node tools/photo/process-photo.mjs <input-image> [--out <dir>]
 *
 * Produces (default --out = <site>/assets/img/portrait):
 *   portrait-480.webp/.avif  portrait-800.webp/.avif   the artwork with a clean transparent background
 *   rim-480.avif/.webp       rim-800.avif/.webp             glow-only rim-light layer (screen-blended on top by the page)
 * Every file is kept under 120 KB (quality is lowered automatically until it fits). Master size is 3:4 (800 x 1067).
 *
 * The artwork keeps its own colours and tone EXACTLY: no grading, no duotone, no smoothing, no baked lighting. The only
 * thing computed is the alpha (so the figure blends into the page) and the separate rim-glow layer built from the alpha edge.
 * The neon frame, rim pulse and scan sweep are page layers (assets/css/sections/portrait.css), not part of the picture.
 *
 * Background (picked automatically): the input's own alpha if it has any; else, when the border is one flat colour (a black or white
 * studio background), a tight border flood fill (nothing inside the figure is ever removed); else rembg (python, optional:
 * pip install rembg onnxruntime) and, without it, a looser border flood fill. The source image is never changed.
 *
 * Needs: node + sharp (npm i --no-save sharp, or NODE_PATH pointing at a folder that has it).
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { loadPackage } from '../optional.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = path.resolve(HERE, '..', '..');   // the new_portfolio folder

const sharp = loadPackage('sharp');   // npm i --no-save sharp

/* ------------------------------- args ------------------------------- */
const argv = process.argv.slice(2);
let input = null, out = path.join(SITE_ROOT, 'assets/img/portrait');
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--out') out = argv[++i];
  else if (!argv[i].startsWith('--')) input = argv[i];
}
if (!input || !fs.existsSync(input)) {
  console.error('usage: node tools/photo/process-photo.mjs <input-image> [--out dir]');
  process.exit(1);
}
fs.mkdirSync(out, { recursive: true });

/* ------------------------------ helpers ----------------------------- */
const W = 800, H = 1067;                    // 3:4 master size (800 wide)
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

/** separable box blur on a Float32Array plane, clamped edges, `passes` passes ~ gaussian */
function boxBlur(src, w, h, r, passes = 3) {
  let a = Float32Array.from(src), b = new Float32Array(w * h);
  const win = 2 * r + 1;
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < h; y++) {          // horizontal
      const row = y * w; let acc = 0;
      for (let k = -r; k <= r; k++) acc += a[row + clamp(k, 0, w - 1)];
      for (let x = 0; x < w; x++) {
        b[row + x] = acc / win;
        acc += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {          // vertical
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += b[clamp(k, 0, h - 1) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = acc / win;
        acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
      }
    }
  }
  return a;
}

/* ------------------------------ matting ----------------------------- */
async function loadRGBA(file, resize) {
  let s = sharp(file, { failOn: 'none' }).rotate();
  if (resize) s = s.resize(W, H, { fit: 'cover', position: 'centre', kernel: 'lanczos3' });
  const { data, info } = await s.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), w: info.width, h: info.height };
}

function hasUsefulAlpha(img) {
  let transparent = 0; const n = img.w * img.h;
  for (let i = 3; i < img.data.length; i += 4) if (img.data[i] < 250) transparent++;
  return transparent / n > 0.05;
}

/** background colour from the image border (median per channel) */
function borderColour(img) {
  const { data, w, h } = img; const ch = [[], [], []];
  const take = (x, y) => { const o = (y * w + x) * 4; ch[0].push(data[o]); ch[1].push(data[o + 1]); ch[2].push(data[o + 2]); };
  for (let x = 0; x < w; x += 3) { take(x, 0); take(x, 1); take(x, h - 1 - 0); }
  for (let y = 0; y < h * 0.6; y += 3) { take(0, y); take(w - 1, y); }
  return ch.map((a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; });
}

/** flood fill from the border over pixels close to the border colour (distance < hi), soft alpha between lo and hi. Pixels the flood cannot
 *  reach stay fully opaque, so dark hair or a dark jacket inside the figure are never touched. Colours are not modified, only alpha. */
function floodMatte(img, { distance, lo, hi, blurPasses, gain = 1, bias = 0 }) {
  const { data, w, h } = img; const bg = borderColour(img);
  const dist = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) dist[i] = distance(data, i * 4, bg);
  const reached = new Uint8Array(w * h); const stack = [];
  const push = (i) => { if (!reached[i] && dist[i] < hi) { reached[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (stack.length) {
    const i = stack.pop(); const x = i % w, y = (i / w) | 0;
    if (x > 0) push(i - 1); if (x < w - 1) push(i + 1); if (y > 0) push(i - w); if (y < h - 1) push(i + w);
  }
  const alpha = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = reached[i] ? smooth(lo, hi, dist[i]) : 1;
  const soft = boxBlur(alpha, w, h, 1, blurPasses);      // removes the hard staircase
  const result = new Uint8Array(data);
  for (let i = 0; i < w * h; i++) result[i * 4 + 3] = Math.round(clamp(soft[i] * gain + bias) * 255);
  return { data: result, w, h };
}
/** flat studio background (black or white): tight thresholds on the largest channel difference, crisp outline */
const keyMatte = (img) => floodMatte(img, { distance: (d, o, bg) => Math.max(Math.abs(d[o] - bg[0]), Math.abs(d[o + 1] - bg[1]), Math.abs(d[o + 2] - bg[2])), lo: 4, hi: 12, blurPasses: 1 });
/** any other border: looser thresholds on the colour distance */
const looseMatte = (img) => floodMatte(img, { distance: (d, o, bg) => Math.sqrt((d[o] - bg[0]) ** 2 + (d[o + 1] - bg[1]) ** 2 + (d[o + 2] - bg[2]) ** 2), lo: 14, hi: 46, blurPasses: 2, gain: 1.08, bias: -0.04 });

/** true when the border is one flat colour (so a key matte is safe) */
function flatBorder(img) {
  const { data, w, h } = img; let lo = [255, 255, 255], hi = [0, 0, 0];
  const take = (x, y) => { const o = (y * w + x) * 4; for (let c = 0; c < 3; c++) { lo[c] = Math.min(lo[c], data[o + c]); hi[c] = Math.max(hi[c], data[o + c]); } };
  for (let x = 0; x < w; x += 2) take(x, 0);   // not the bottom row: a cut-off figure may touch it
  for (let y = 0; y < h * 0.6; y += 2) { take(0, y); take(w - 1, y); }
  return Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) <= 12;
}

function rembgMatte(file) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portrait-'));
  const dst = path.join(tmpDir, 'matte.png');
  for (const py of ['python', 'py', 'python3']) {
    const r = spawnSync(py, [path.join(HERE, 'matte_rembg.py'), file, dst], { stdio: ['ignore', 'ignore', 'pipe'], encoding: 'utf8', timeout: 480000 });
    if (r.status === 0 && fs.existsSync(dst)) return dst;
    if (r.status === 2) break;                 // rembg missing, other interpreters will not help
  }
  return null;
}

async function getMatte() {
  const probe = await loadRGBA(input, true);
  if (hasUsefulAlpha(probe)) { console.log('matte: using the input image alpha channel'); return probe; }
  if (flatBorder(probe)) { console.log('matte: key (flat border colour)'); return keyMatte(probe); }
  const f = rembgMatte(input);
  if (f) { console.log('matte: rembg + alpha matting'); return await loadRGBA(f, true); }
  console.log('matte: rembg unavailable, falling back to border-colour flood fill');
  return looseMatte(probe);
}

/* ----------------------------- compose ------------------------------ */
/* The artwork keeps its OWN colours and tone: no grading, no duotone, no smoothing, no baked lighting.
   Output 1 (base): the source pixels, untouched, with a clean alpha (only used so the figure blends into the page).
   Output 2 (rim) : a glow-only layer built from the alpha edge; the page screen-blends it over the base and animates it. */
const CYAN = [0, 255, 255], MAGENTA = [255, 0, 110], PURPLE = [181, 83, 242];

function compose(matte) {
  const { data, w, h } = matte; const N = w * h;
  const A = new Float32Array(N);
  for (let i = 0; i < N; i++) A[i] = data[i * 4 + 3] / 255;

  // alpha-edge fields (from the matte only, so the canvas cut never lights up)
  const Ab = boxBlur(A, w, h, 5, 3), Ab2 = boxBlur(A, w, h, 7, 3), Ah = boxBlur(A, w, h, 17, 3);
  const base = new Uint8ClampedArray(N * 4);
  const rimOut = new Uint8ClampedArray(N * 4);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x, o = i * 4;
      // base: colours exactly as drawn
      base[o] = data[o]; base[o + 1] = data[o + 1]; base[o + 2] = data[o + 2]; base[o + 3] = data[o + 3];

      // rim fields
      const inner = A[i] * Math.pow(clamp((1 - Ab[i]) * 1.7), 1.15);
      const halo = (1 - A[i]) * Math.pow(clamp(Ah[i] * 1.35), 0.95);
      // outward normal from the blurred matte
      const gx = (Ab2[i + (x < w - 1 ? 1 : 0)] - Ab2[i - (x > 0 ? 1 : 0)]) * 0.5;
      const gy = (Ab2[i + (y < h - 1 ? w : 0)] - Ab2[i - (y > 0 ? w : 0)]) * 0.5;
      const gl = Math.hypot(gx, gy) || 1; const nx = -gx / gl, ny = -gy / gl;
      const t = clamp(0.5 + 0.62 * nx);
      let rc = [mix(CYAN[0], MAGENTA[0], t), mix(CYAN[1], MAGENTA[1], t), mix(CYAN[2], MAGENTA[2], t)];
      const up = clamp(-ny) * 0.55;
      rc = [mix(rc[0], PURPLE[0], up), mix(rc[1], PURPLE[1], up), mix(rc[2], PURPLE[2], up)];

      // rim layer (glow only): hot core for the inner rim, soft halo outside
      const core = Math.pow(inner, 1.1);
      const white = 0.32 * core * core;
      const rr = mix(rc[0], 255, white), rg = mix(rc[1], 255, white), rb = mix(rc[2], 255, white);
      const ra = clamp(core * 0.95 + halo * 0.5);
      rimOut[o] = rr; rimOut[o + 1] = rg; rimOut[o + 2] = rb; rimOut[o + 3] = ra * 255;
    }
  }
  return { base, rim: rimOut, w, h };
}

/* ------------------------------ encode ------------------------------ */
const MAX = 120 * 1024;
async function encode(buf, w, h, outW, name, kind) {
  const mk = () => {
    let s = sharp(Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength), { raw: { width: w, height: h, channels: 4 } });
    if (outW !== w) s = s.resize(outW, Math.round(outW * h / w), { kernel: 'lanczos3' });
    return s;
  };
  const tries = kind === 'webp' ? [92, 90, 88, 86, 82, 78, 74, 70, 64, 58] : name.startsWith('rim') ? [52, 45, 38, 30] : [70, 65, 60, 55, 50, 45, 40, 34, 28];   // the rim glow is mostly transparent, so AVIF at 52 is plenty
  for (const q of tries) {
    const s = mk();
    const bufOut = kind === 'webp'
      ? await s.webp({ quality: q, alphaQuality: Math.min(100, q + 10), effort: 6, smartSubsample: true }).toBuffer()
      : await s.avif({ quality: q, effort: 6, chromaSubsampling: '4:4:4' }).toBuffer();
    if (bufOut.length <= MAX || q === tries[tries.length - 1]) {
      const file = path.join(out, `${name}.${kind}`);
      fs.writeFileSync(file, bufOut);
      return { file, bytes: bufOut.length, q };
    }
  }
}

/* ------------------------------- main ------------------------------- */
const matte = await getMatte();
const { base, rim, w, h } = compose(matte);
const report = [];
for (const width of [480, 800]) {
  report.push(await encode(base, w, h, width, `portrait-${width}`, 'webp'));
  report.push(await encode(base, w, h, width, `portrait-${width}`, 'avif'));
  report.push(await encode(rim, w, h, width, `rim-${width}`, 'webp'));
  report.push(await encode(rim, w, h, width, `rim-${width}`, 'avif'));
}
for (const r of report) console.log(`${path.basename(r.file).padEnd(20)} ${(r.bytes / 1024).toFixed(1).padStart(6)} KB  q${r.q}`);
console.log(`master ${w}x${h} (3:4). Use width=800 height=1067 on the 800 file, 480x640 on the small one.`);
