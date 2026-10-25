// rules.mjs - the ONE list of words and patterns that must never ship. Every generator and the build guard import it.
// To ban another word, add it here; nothing else needs to change.
const literal = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** never allowed anywhere: other people's handles, claims the owner rejected, internal field names, the old college score,
 *  and wording the owner retired (remote-work lines, capacity and "no code first" promises, keyboard-shortcut hints, the collapsible "smaller projects" list) */
const NEVER = ['Pune', 'LangGraph', 'exploring', 'prasannapatil', 'prasanna4149', 'patil.in', 'systems shipped', 'industry-level', 'Enterprise AI systems',
  'No frameworks', 'Plain HTML', 'CGPA', '9.62', 'display_year',
  'working remotely', 'work remotely', 'works remotely', 'Straight talk', 'Honest limits', 'full attention', 'proper attention',
  'write no code', 'no code until', 'no code is written', 'before I write any code', 'a small number at a time', 'number of clients small', 'number of projects small',
  'will not promise', 'do not promise a number', 'no-code', 'graduated',
  'Ctrl K', 'Ctrl+K', 'Ctrl + K', 'Cmd K', 'Cmd+K', 'Cmd + K', 'smaller projects', 'compact project'];
export const NEVER_RE = new RegExp('(?<![\\w.])(?:' + NEVER.map(literal).join('|') + ')(?!\\w)', 'i');

/** spoken languages appear ONCE on the whole site: in the quick-facts card of the About page (LANGUAGE_SENTINEL is the word the guard counts) */
const LANGUAGES = ['English', 'Hindi', 'Marathi', 'German', 'French'];
export const LANGUAGE_SENTINEL = 'Marathi';
export const LANGUAGE_RE = new RegExp('\\b(?:' + LANGUAGES.join('|') + ')\\b');

/** the bare word "learning" is banned in marketing text ("machine learning" is the one allowed phrase) */
const LEARNING_RE = /(?<!machine )learning/i;

/** banned in the home page copy only (the case studies may name these tools) */
const HOME_ONLY_RE = /vanilla JS|LlamaIndex|LangChain/i;

/** JSON-LD must not carry these properties */
export const LD_NEVER_RE = /knowsLanguage|inLanguage|telephone/;

/** project pages and llms files carry no years */
export const YEAR_RE = /\b(?:19|20)\d\d\b/;

/** the first forbidden thing in `text`, or null. Options: languages (also check spoken languages), learning (also the bare word), home (also the home-only words). */
export function findBanned(text, { languages = false, learning = false, home = false } = {}) {
  const hits = [NEVER_RE.exec(text), languages && LANGUAGE_RE.exec(text), learning && LEARNING_RE.exec(text), home && HOME_ONLY_RE.exec(text)].filter(Boolean);
  return hits.length ? hits.sort((a, b) => a.index - b.index)[0][0] : null;
}

/* ---------- built pages and llms files: no tallies, no shortcut hints, nothing collapsed ---------- */

/** a count of projects, roles, services or podium finishes ("12 Selected projects", "Nine projects", "(12 projects)" chips, "Showing 3 of 12").
 *  Zero-padded numbers (the drawer's "02 Projects") and project results ("27 passing tests") are not tallies. */
const NUMBER = '(?:[1-9]\\d*|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)';
const TALLY_RE = new RegExp(`\\b${NUMBER}\\s+(?:freelance\\s+)?(?:AI\\s+development\\s+)?(?:industry\\s+|selected\\s+|smaller\\s+|case\\s+|contest\\s+)?(?:projects?|roles?|services|finishes|podium)\\b|\\b${NUMBER}\\s+(?:[\\w-]+\\s+){0,4}podium\\b|\\(\\d{1,3}\\)|\\bShowing\\s+\\d+`, 'i');

/** markup that must not appear in a built page: [pattern, what it is] */
const PAGE_MARKUP = [
  [/<kbd\b|data-kbd|aria-keyshortcuts/, 'a keyboard-shortcut hint'],
  [/data-count=|stat__num|hero__stats|pg-stats\b/, 'a stats counter'],
  [/chip__count|pg-filtercount|data-filtercount/, 'a project count in the filter bar'],
  [/<details\b[^>]*\sname=/, 'a <details name="..."> group (an exclusive accordion cannot have every item open)'],
  [/<details\b(?![^>]*\sopen\b)[^>]*>/, 'a <details> that is closed by default'],
  [/class="(?:nav|drawer)__link"[^>]*>\s*(?:<small>[^<]*<\/small>)?\s*Home\s*</, 'a Home link in the navigation (the logo goes home)'],
];

/** the text a visitor or a crawler reads: no styles, svg or scripts, except the JSON-LD (it is read by crawlers, so it follows the same rules) */
export const readableText = html => String(html)
  .replace(/<script(?![^>]*ld\+json)[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

/** problems of one built page or llms file, as strings. `rel` is its path in the site folder (only used in the message). */
export function pageProblems(rel, text) {
  const out = [];
  const isHtml = /\.html$/.test(rel);
  const tally = TALLY_RE.exec(readableText(text));
  if (tally) out.push(`a count in the text of ${rel}: "${tally[0]}"`);
  if (isHtml) for (const [re, what] of PAGE_MARKUP) if (re.test(text)) out.push(`${what} in ${rel}`);
  return out;
}
