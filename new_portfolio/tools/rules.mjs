// rules.mjs - the ONE list of words and patterns that must never ship. Every generator and the build guard import it.
// To ban another word, add it here; nothing else needs to change.
const literal = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** never allowed anywhere: other people's handles, claims the owner rejected, internal field names, the old college score */
const NEVER = ['Pune', 'LangGraph', 'exploring', 'prasannapatil', 'prasanna4149', 'patil.in', 'systems shipped', 'industry-level', 'Enterprise AI systems',
  'No frameworks', 'Plain HTML', 'CGPA', '9.62', 'display_year'];
export const NEVER_RE = new RegExp('(?<![\\w.])(?:' + NEVER.map(literal).join('|') + ')(?!\\w)', 'i');

/** spoken languages appear ONCE on the whole site: in the home page "whoami" card (LANGUAGE_SENTINEL is the word the guard counts) */
const LANGUAGES = ['English', 'Hindi', 'Marathi', 'German', 'French'];
export const LANGUAGE_SENTINEL = 'Marathi';
export const LANGUAGE_RE = new RegExp('\\b(?:' + LANGUAGES.join('|') + ')\\b');

/** the bare word "learning" is banned in marketing text ("machine learning" is the one allowed phrase) */
const LEARNING_RE = /(?<!machine )learning/i;

/** banned in the home page copy only (the case studies may name these tools) */
const HOME_ONLY_RE = /vanilla JS|LlamaIndex/i;

/** JSON-LD must not carry these properties */
export const LD_NEVER_RE = /knowsLanguage|inLanguage|telephone/;

/** project pages and llms files carry no years */
export const YEAR_RE = /\b(?:19|20)\d\d\b/;

/** the first forbidden thing in `text`, or null. Options: languages (also check spoken languages), learning (also the bare word), home (also the home-only words). */
export function findBanned(text, { languages = false, learning = false, home = false } = {}) {
  const hits = [NEVER_RE.exec(text), languages && LANGUAGE_RE.exec(text), learning && LEARNING_RE.exec(text), home && HOME_ONLY_RE.exec(text)].filter(Boolean);
  return hits.length ? hits.sort((a, b) => a.index - b.index)[0][0] : null;
}
