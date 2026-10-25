// keywords.mjs - the approved keyword map (content/keywords.json) and the build guard that enforces it.
//
// content/keywords.json lists, per page: one PRIMARY keyword, the secondary keywords, the FAQ questions that belong to that page and the approved
// anchor texts for links to it. The copy itself (title, description, H1, H2s, first paragraph, FAQ answers) lives in content/content.json.
//
// Two titles per page: the BROWSER-TAB title (<title>) is one constant string on every page (content.json seo.tab_title), and the PAGE title
// (og:title, which twitter:title repeats) is the per-page one that carries the primary keyword. The rules below say "page title" for the second.
//
// keywordProblems() reads the BUILT pages and fails the build when:
//   - the browser-tab title of any page differs from seo.tab_title (compared as exact markup), or is longer than 60 characters, or the head holds more than one <title>
//   - a page has no og:title (the page title is read from it)
//   - two pages share a primary keyword, a page title or a meta description (or one phrase appears on two pages)
//   - a page title is longer than 60 characters or a description longer than 155
//   - a page has no keywords.json entry, or keywords.json lists a page that does not exist
//   - the primary keyword is missing from the page title, the H1 or the first paragraph (the answer under the H1; on the home page the hero lede)
//   - the primary keyword appears more than 3 times in the page body (keyword stuffing)
//   - a FAQ question is not registered for its page, is registered for another page, or appears on two pages
//   - a FAQ answer or a first-paragraph answer is not 40 to 60 words
//   - a link text equals a primary keyword and is used more than twice (exact-match anchor stuffing)
// A phrase matches when its words appear in order, with no more than two small filler words between them (in, for, of, a, an, the, with, to ...)
// and with plurals ignored: "hire fastapi developers" matches "Hire a FastAPI Developer"; "text to sql llm" matches "Text-to-SQL with an LLM".
import fs from 'node:fs';
import path from 'node:path';
import { SITE, read, readContent, esc } from '../lib.mjs';

export const KEYWORDS_FILE = path.join(SITE, 'content', 'keywords.json');
export const loadKeywords = () => JSON.parse(read(KEYWORDS_FILE));
/** the one constant browser-tab title (content.json seo.tab_title) */
export const loadTabTitle = () => ((readContent().seo || {}).tab_title || '');
/** keywords.json is keyed by page path; the home page is "/" */
export const pageKey = p => (p === '' ? '/' : p);

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ', '&rsquo;': "'", '&lsquo;': "'", '&ldquo;': '"', '&rdquo;': '"', '&middot;': ' ', '&ndash;': '-', '&mdash;': '-', '&hellip;': '...' };
export const textOf = html => String(html)
  .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[#a-z0-9]+;/gi, m => ENTITIES[m.toLowerCase()] ?? ' ')
  .replace(/\s+/g, ' ').trim();
/** lower case, letters and digits only, one space between words */
export const norm = s => String(s).toLowerCase().replace(/[‘’]/g, "'").replace(/'/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export const words = s => String(s).trim().split(/\s+/).filter(Boolean).length;

const FILL = ['in', 'for', 'of', 'a', 'an', 'the', 'with', 'to', 'and', 'at', 'on', 'from', 'is', 'my', 'your'];
const reCache = new Map();
export function phraseRe(phrase) {
  if (reCache.has(phrase)) return reCache.get(phrase);
  const toks = norm(phrase).split(' ').filter(Boolean);
  const stem = t => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t) + 's?';
  const gap = `(?:\\s+(?:${FILL.join('|')})){0,2}\\s+`;
  const re = new RegExp(`(?:^|\\s)${toks.map(stem).join(gap)}(?=\\s|$)`, 'g');
  reCache.set(phrase, re);
  return re;
}
export const countPhrase = (text, phrase) => (norm(text).match(phraseRe(phrase)) || []).length;
export const hasPhrase = (text, phrase) => countPhrase(text, phrase) > 0;

const between = (html, re) => { const m = re.exec(html); return m ? m[1] : ''; };

/** what the guard reads from one built page */
export function readPage(file) {
  const html = fs.readFileSync(file, 'utf8');
  const headEnd = html.search(/<\/head>/i);
  const head = html.slice(0, headEnd >= 0 ? headEnd : html.length).replace(/<!--[\s\S]*?-->/g, '');   // comments do not count
  const tabRaw = between(head, /<title>([\s\S]*?)<\/title>/);
  const main = between(html, /<main id="main"[^>]*>([\s\S]*?)<\/main>/);
  const answer = between(main, /<p class="pg-answer" data-answer>([\s\S]*?)<\/p>/) || between(main, /<p class="hero__lede"[^>]*>([\s\S]*?)<\/p>/);
  const qas = [];
  for (const m of main.matchAll(/<h3 class="(?:pg-qa__h|hm-qa__t)">([\s\S]*?)<\/h3>[\s\S]*?<div class="(?:pg-qa__a|hm-qa__a)"><p>([\s\S]*?)<\/p>/g)) qas.push({ q: textOf(m[1]), a: textOf(m[2]) });
  const links = [...main.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map(m => ({ href: m[1], text: textOf(m[2]) }));
  return {
    tabTitleRaw: tabRaw,                                                                 // the exact markup between <title> and </title> in the head
    tabTitleCount: (head.match(/<title[\s>]/gi) || []).length,                           // must be exactly one
    tabTitle: textOf(tabRaw),                                                            // what the browser tab shows: the same on every page
    title: textOf(between(html, /<meta property="og:title" content="([^"]*)"/)),        // the page title (shared links; twitter:title repeats it): one per page, with the primary keyword
    description: textOf(between(html, /<meta name="description" content="([^"]*)"/)),
    h1: textOf(between(main, /<h1[^>]*>([\s\S]*?)<\/h1>/)),
    answer: textOf(answer),
    body: textOf(main),
    qas, links,
  };
}

/** all problems, as strings. `paths` = page paths without the home page, as the build writes them ('services/', 'projects/x/' ...) */
export function keywordProblems({ site = SITE, paths, keywords = loadKeywords(), tabTitle = loadTabTitle() } = {}) {
  const problems = [];
  const bad = (page, msg) => problems.push(`keywords: ${page}: ${msg}`);
  if (!tabTitle) problems.push('keywords: content/content.json has no seo.tab_title (the one constant browser-tab title)');
  const all = ['', ...paths];
  const entries = keywords.pages || {};
  const pages = {};
  for (const p of all) {
    const key = pageKey(p);
    if (!entries[key]) bad(key, 'no entry in content/keywords.json');
    const file = path.join(site, p, 'index.html');
    if (fs.existsSync(file)) pages[key] = readPage(file);
  }
  for (const key of Object.keys(entries)) if (!pages[key]) bad(key, 'listed in content/keywords.json but the page is not built');

  const phraseOwner = new Map(), titles = new Map(), descs = new Map(), questions = new Map(), primaries = new Map();
  for (const [key, pg] of Object.entries(pages)) {
    const e = entries[key];
    if (!e) continue;
    if (!e.primary) { bad(key, 'no primary keyword'); continue; }
    if (primaries.has(norm(e.primary))) bad(key, `primary keyword "${e.primary}" is also the primary of ${primaries.get(norm(e.primary))}`); else primaries.set(norm(e.primary), key);
    for (const ph of [e.primary, ...(e.secondary || [])]) {
      const n = norm(ph);
      if (phraseOwner.has(n) && phraseOwner.get(n) !== key) bad(key, `keyword "${ph}" is also listed on ${phraseOwner.get(n)}`); else phraseOwner.set(n, key);
    }
    // browser-tab title: the same constant on every page
    if (tabTitle && pg.tabTitleRaw !== esc(tabTitle)) bad(key, `browser-tab title is "${pg.tabTitleRaw}" but every page must use "${esc(tabTitle)}" (content.json seo.tab_title)`);
    if (pg.tabTitleCount !== 1) bad(key, `the head has ${pg.tabTitleCount} <title> elements (want exactly 1)`);
    if (pg.tabTitle.length > 60) bad(key, `browser-tab title is ${pg.tabTitle.length} characters (max 60)`);
    // page title (og:title), description
    if (!pg.title) bad(key, 'no og:title (the page title shown when the link is shared)');
    if (pg.title.length > 60) bad(key, `page title (og:title) is ${pg.title.length} characters (max 60)`);
    if (pg.description.length > 155) bad(key, `description is ${pg.description.length} characters (max 155)`);
    if (titles.has(pg.title)) bad(key, `same page title (og:title) as ${titles.get(pg.title)}`); else titles.set(pg.title, key);
    if (descs.has(pg.description)) bad(key, `same meta description as ${descs.get(pg.description)}`); else descs.set(pg.description, key);
    // primary keyword placement
    if (!hasPhrase(pg.title, e.primary)) bad(key, `primary keyword "${e.primary}" is not in the page title (og:title) "${pg.title}"`);
    if (!hasPhrase(pg.h1, e.primary)) bad(key, `primary keyword "${e.primary}" is not in the H1 "${pg.h1}"`);
    if (!hasPhrase(pg.answer, e.primary)) bad(key, `primary keyword "${e.primary}" is not in the first paragraph`);
    const n = countPhrase(pg.body, e.primary);
    if (n > 3) bad(key, `primary keyword "${e.primary}" appears ${n} times in the page body (max 3)`);
    // the first paragraph is a direct answer
    const aw = words(pg.answer);
    if (key !== '/' && (aw < 40 || aw > 60)) bad(key, `first paragraph is ${aw} words (want 40-60)`);
    // questions: every question is registered for this page and only this page
    const mine = new Set((e.questions || []).map(norm));
    const shown = new Set();
    for (const { q, a } of pg.qas) {
      const nq = norm(q);
      if (shown.has(nq)) bad(key, `question shown twice: "${q}"`);
      shown.add(nq);
      if (!mine.has(nq)) bad(key, `question "${q}" is not registered for this page in content/keywords.json`);
      if (questions.has(nq) && questions.get(nq) !== key) bad(key, `question "${q}" is also on ${questions.get(nq)} (each question belongs to one page)`); else questions.set(nq, key);
      const w = words(a);
      if (w < 40 || w > 60) bad(key, `answer to "${q}" is ${w} words (want 40-60)`);
    }
    for (const q of e.questions || []) if (!shown.has(norm(q))) bad(key, `registered question "${q}" is not on the page`);
  }
  // exact-match anchor stuffing: a link text equal to a primary keyword, used more than twice across the site
  const exact = new Map();
  for (const pg of Object.values(pages)) for (const l of pg.links) { const n = norm(l.text); if (primaries.has(n)) exact.set(n, (exact.get(n) || 0) + 1); }
  for (const [n, c] of exact) if (c > 2) bad(primaries.get(n), `the link text "${n}" (the primary keyword) is used ${c} times in page bodies (max 2): vary the anchors`);
  return problems;
}

/** the table the final report prints: page -> primary, page title (og:title), lengths */
export function keywordTable({ site = SITE, paths, keywords = loadKeywords() } = {}) {
  return ['', ...paths].map(p => {
    const key = pageKey(p), e = keywords.pages[key] || {};
    const file = path.join(site, p, 'index.html');
    const pg = fs.existsSync(file) ? readPage(file) : null;
    return { page: key, primary: e.primary, title: pg && pg.title, titleLen: pg && pg.title.length, descLen: pg && pg.description.length, bodyCount: pg && countPhrase(pg.body, e.primary) };
  });
}
