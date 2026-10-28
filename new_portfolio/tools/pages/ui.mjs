// ui.mjs - small HTML fragment helpers shared by every page module. Pure string templates, no dependencies.
import { breadcrumb, abs } from '../../build.mjs';
import { esc, icon } from '../lib.mjs';
import { whatsappHref, connectActions, liveCalendarUrl } from '../connect.mjs';
import { cfg, collage, content, services, EMAIL, FREELANCE_LINE, LASTMOD, profile } from './data.mjs';

export { esc, abs, cfg };

/* ---------- atoms ---------- */
export const ico = icon;

/** render a list of strings as .tag chips (tone via data-tone on the wrapper or per call) */
export function tags(list, { tone = '', cls = '', label = '', itemCls = '' } = {}) {
  if (!list || !list.length) return '';
  const t = tone ? ` data-tone="${tone}"` : '';
  return `<ul class="tags${cls ? ' ' + cls : ''}" role="list"${label ? ` aria-label="${esc(label)}"` : ''}${t}>${list.map(x => `<li class="tag${itemCls ? ' ' + itemCls : ''}">${esc(x)}</li>`).join('')}</ul>`;
}

export function btn(label, href, { v = 'solid', size = '', icon = 'arrow-right', extra = '' } = {}) {
  const cls = ['btn', v ? `btn--${v}` : '', size ? `btn--${size}` : '', v === 'solid' ? 'btn--glow' : ''].filter(Boolean).join(' ');
  return `<a class="${cls}" href="${href}"${extra ? ' ' + extra : ''}>${esc(label)}${icon ? ' ' + ico(icon, 'icon--still') : ''}</a>`;
}

/* ---------- page head ---------- */
function crumbs(items, b) {
  // items: [{ name, path }] from Home down; last one is the current page (no link)
  const lis = items.map((it, i) => {
    const last = i === items.length - 1;
    const href = it.path ? b + it.path : (b || './');
    return last
      ? `<li><span aria-current="page">${esc(it.name)}</span></li>`
      : `<li><a href="${href}">${esc(it.name)}</a></li>`;
  }).join('');
  return `<nav class="pg-crumbs" aria-label="Breadcrumb"><ol>${lis}</ol></nav>`;
}

/**
 * pageHead({ crumbItems, b, eyebrow, h1, lead, answer, actions, aside, tone, id })
 * answer = the 40-60 word direct-answer paragraph (AEO): rendered as <p data-answer> straight under the H1/lead.
 */
export function pageHead({ crumbItems, b, eyebrow, h1, lead = '', answer = '', actions = '', aside = '', tone = '', wide = false }) {
  return `<section class="pg-head${aside ? ' pg-head--aside' : ''}"${tone ? ` data-tone="${tone}"` : ''}>
  <div class="container">
    ${crumbs(crumbItems, b)}
    <div class="pg-head__grid">
      <div class="pg-head__main">
        <p class="eyebrow">${esc(eyebrow)}</p>
        <h1 class="pg-h1">${h1}</h1>
        ${lead ? `<p class="pg-lead">${esc(lead)}</p>` : ''}
        ${answer ? `<p class="pg-answer" data-answer>${esc(answer)}</p>` : ''}
        ${actions ? `<div class="pg-actions">${actions}</div>` : ''}
      </div>
      ${aside ? `<div class="pg-head__aside">${aside}</div>` : ''}
    </div>
  </div>
</section>`;
}

/** a normal content section with the standard header.
    `aside` (optional) is a block that stands beside the whole section content (heading, lead and body) from 80em and follows it below that: the About portrait */
export function section({ id = '', title, titleId, eyebrow = '', lead = '', body, cls = '', tint = false, reveal = true, aside = '' }) {
  const tid = titleId || id + '-h';
  const head = `<header class="section__head"${reveal ? ' data-reveal' : ''}>
      ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
      <h2 id="${tid}" class="section__title">${title}</h2>
      ${lead ? `<p class="section__lead">${esc(lead)}</p>` : ''}
    </header>`;
  const inner = aside
    ? `<div class="pg-split">
    <div class="pg-split__main">
    ${head}
${body}
    </div>
    <div class="pg-split__aside">
          ${aside}
    </div>
  </div>`
    : `${head}
${body}`;
  return `<section${id ? ` id="${id}"` : ''} class="section pg-sec${tint ? ' section--tint' : ''}${cls ? ' ' + cls : ''}" aria-labelledby="${tid}">
  <div class="container">
    ${inner}
  </div>
</section>`;
}

/** a section title: the content override (plain text, last word highlighted) when there is one, else the fallback HTML */
export function title(override, fallbackHtml, cls = '') {
  if (!override) return fallbackHtml;
  const parts = String(override).trim().split(' ');
  const last = parts.pop();
  return (parts.length ? esc(parts.join(' ')) + ' ' : '') + `<span class="hl${cls ? ' ' + cls : ''}">${esc(last)}</span>`;
}

/* ---------- hire band: the closing block of every page ---------- */
export function hireBand({ b, heading, text, topic = '', secondary = null, cta = 'Get in touch' }) {
  const href = hireHref(b, topic);
  const sec = secondary || { label: 'See projects', href: `${b}projects/` };
  return `<section class="section pg-sec pg-hire" aria-labelledby="hire-band-h">
  <div class="container">
    <div class="pg-hire__band" data-reveal="scale">
      <span class="pg-hire__line" aria-hidden="true"></span>
      <div class="pg-hire__text">
        <p class="badge badge--accent"><span class="badge__dot" aria-hidden="true"></span>${esc(FREELANCE_LINE)}</p>
        <h2 id="hire-band-h" class="pg-hire__title">${heading}</h2>
        <p class="pg-hire__lead">${esc(text)}</p>
      </div>
      <div class="pg-hire__act">
        <a class="btn btn--solid btn--lg btn--glow" href="${href}" data-magnetic>${esc(cta)} ${ico('arrow-right', 'icon--still')}</a>
        <p class="pg-hire__alt"><a class="link" href="mailto:${EMAIL}">${EMAIL}</a><span aria-hidden="true"> &middot; </span><a class="link" href="${sec.href}">${esc(sec.label)}</a></p>
      </div>
    </div>
  </div>
</section>`;
}

/* ---------- FAQ accordion (native <details>, every answer open on load; the visitor can close any) ---------- */
export function qaList(items, { idPrefix = 'q', links = {} } = {}) {
  return `<div class="pg-qas">` + items.map((it, i) => {
    const id = it.id ? `${idPrefix}-${it.id}` : `${idPrefix}-${i + 1}`;
    const l = links[it.id];
    return `<details class="pg-qa" id="${id}" open data-reveal${i ? ` style="--i:${Math.min(i, 4)}"` : ''}>
      <summary class="pg-qa__q"><h3 class="pg-qa__h">${esc(it.q)}</h3>${ico('chevron-down', 'pg-qa__chev')}</summary>
      <div class="pg-qa__a"><p>${esc(it.a)}</p>${l ? `<p class="pg-qa__more"><a class="link-arrow" href="${l.href}">${esc(l.label)} ${ico('arrow-right')}</a></p>` : ''}</div>
    </details>`;
  }).join('') + `</div>`;
}

/* ---------- project visuals and the collage ---------- */
/** visual thumbnail (generative canvas, decorative) */
export function pv(p, extra = '') {
  return `<div class="pv${extra ? ' ' + extra : ''}" data-visual="${esc(p.visual_hint || 'generic')}" data-variant="${esc(p.visual_variant || p.id)}" data-tone="${esc(p.tone)}" aria-hidden="true"></div>`;
}

/** one collage tile: the visual, a small category line, the title and (wide and big tiles only, see collage.css) the blurb.
 *  A project with a case study links to it. Without one, a public repository is the link and a private one is a plain label. */
function tile(p, b, i, filterable, lone) {
  const href = p.hasCase ? b + p.path : p.repoInfo.kind === 'public' ? p.repoInfo.href : '';
  const name = !href ? esc(p.title)
    : p.hasCase ? `<a class="card__link" href="${href}">${esc(p.title)}<span class="sr-only"> case study</span></a>`
      : `<a class="card__link" href="${href}" target="_blank" rel="noopener noreferrer">${esc(p.title)}<span class="sr-only"> on GitHub (opens in a new tab)</span></a>`;
  return `<li class="tile${p.size === 'small' ? '' : ' tile--' + p.size}${lone ? ' tile--lone' : ''}" id="p-${esc(p.id)}" data-rank="${p.rank}" data-pid="${esc(p.id)}"${filterable ? ` data-cat="${esc(p.category_group)}"` : ''} style="--area:p${p.rank}">
      <article class="card tile__card" data-tone="${esc(p.tone)}" data-tilt${p.hasCase ? ' data-cursor="case"' : ''} data-reveal style="--i:${i % 4}" aria-labelledby="pj-${esc(p.id)}">
        <div class="tile__media">${pv(p)}</div>
        <div class="tile__body">
          <p class="tile__meta"><span class="tile__cat">${esc(p.category)}</span></p>
          <h3 class="tile__title" id="pj-${esc(p.id)}">${name}</h3>
          <p class="tile__blurb">${esc(p.card_blurb)}</p>${href ? '' : `\n          <p class="tile__note">${esc(p.repoInfo.text || 'Private')}</p>`}
        </div>
      </article>
    </li>`;
}

/** the selected projects as a collage of mixed tile sizes (tools/selection.mjs and projects.config.json decide order, sizes and the desktop grid)
 *  plus the plain link tile that closes it; `all` = { href, label, icon } for that tile; `filterable` adds the category data the chips on /projects/ use */
export function projectCollage({ b, all, filterable = false }) {
  const rows = collage.areas.map(r => `'${r}'`).join(' ');
  /* the two-column (tablet) layout keeps the rank order: a small tile left alone in its row, because a wide or big tile (or the end) follows, spans both columns */
  const lone = new Set();
  let col = 0;
  [...collage.tiles, { rank: collage.linkRank, size: 'small' }].forEach(t => {
    if (t.size === 'small') { col ^= 1; if (col) lone.add(t.rank); else lone.delete(t.rank - 1); }
    else col = 0;
  });
  return `<ul class="collage" role="list"${filterable ? ' data-filterable' : ''} style="--areas:${rows}">
    ${collage.tiles.map((p, i) => tile(p, b, i, filterable, lone.has(p.rank))).join('\n    ')}
    <li class="tile tile--link${lone.has(collage.linkRank) ? ' tile--lone' : ''}" data-rank="${collage.linkRank}" style="--area:p${collage.linkRank}" data-reveal><a class="tile__all" href="${all.href}"><span>${esc(all.label)}</span>${ico(all.icon || 'arrow-right')}</a></li>
  </ul>`;
}

/** the "project type" choices of the contact forms, keyed by the published service slug (the same slugs ?topic= carries) */
export const TYPE_LABELS = {
  'llm-rag-development': 'AI chatbot or document assistant',
  'ai-document-compliance-automation': 'Document AI or data extraction',
  'ai-backend-fastapi-django': 'Python backend or API',
  'computer-vision': 'Computer vision',
  'speech-nlp-ml': 'Speech, text or machine learning',
  'python-automation-integrations': 'Automation, bot or integration',
};

/* ---------- ways to connect: ONE list (content.connect) used by the contact page strip and the floating "Let's talk" menu ---------- */
export { whatsappHref, connectActions };
/** the four quick-connect tiles at the top of /contact/ */
export function connectStrip(b) {
  return `<ul class="connect-strip" role="list" aria-label="Quick ways to connect">${connectActions(b).map((a, i) => `<li><a class="connect-tile" href="${esc(a.href)}"${a.external ? ' target="_blank" rel="noopener noreferrer"' : ''} data-tone="${['cyan', 'purple', 'green', 'magenta'][i % 4]}" data-connect="${esc(a.id)}">
      <span class="icon-tile connect-tile__icon" aria-hidden="true">${ico(a.icon)}</span>
      <span class="connect-tile__text"><strong>${esc(a.label)}</strong><span>${esc(a.hint)}</span></span>
      ${ico(a.external ? 'arrow-up-right' : 'arrow-right', 'connect-tile__go')}${a.external ? '<span class="sr-only"> (opens in a new tab)</span>' : ''}
    </a></li>`).join('')}</ul>`;
}

/* ---------- the "Book a call" picker (assets/js/sections/booking.js builds the day and time buttons from data-booking) ---------- */
export function bookingPanel() {
  const B = content.booking;
  const cfgJson = esc(JSON.stringify({ tz: B.timezone, label: B.timezone_label, lengths: B.lengths, defaultLength: B.default_length, daysAhead: B.days_ahead, minNoticeHours: B.min_notice_hours, step: B.step_minutes, weekly: B.weekly, subject: 'Call request from the portfolio', person: cfg.name }));
  const lengths = B.lengths.map(n => `<label class="book__len"><input type="radio" name="call_length" value="${n}"${n === B.default_length ? ' checked' : ''}><span>${n} min</span></label>`).join('');
  const opts = services.map(s => `<option value="${s.slug}">${esc(TYPE_LABELS[s.slug] || s.name)}</option>`).join('');
  return `<div class="contact__formwrap panel book pg-contact__panel" id="book" data-tone="purple" data-booking="${cfgJson}" data-reveal>
        <div class="book__compose" data-book-compose>
          <div class="contact__sub">
            <h2 class="contact__h" id="book-title">${esc(B.title)}</h2>
            <p class="contact__note">${esc(B.intro)}</p>${liveCalendarUrl() ? `
            <p class="book__live"><a class="btn btn--ghost btn--sm" href="${esc(liveCalendarUrl())}" target="_blank" rel="noopener noreferrer">Open my live calendar ${ico('arrow-up-right', 'icon--still')}<span class="sr-only"> (opens in a new tab)</span></a></p>` : ''}
          </div>
          <form class="contact__form book__form" id="book-form" action="${esc(profile.links.formspree)}" method="POST" data-email="${esc(EMAIL)}" aria-labelledby="book-title">
            <input type="hidden" name="_subject" value="Call request from the portfolio">
            <input type="hidden" name="slot_ist" value=""><input type="hidden" name="slot_utc" value=""><input type="hidden" name="visitor_time" value="">

            <fieldset class="book__group"><legend class="label">Call length</legend><div class="book__lens">${lengths}</div></fieldset>

            <div class="book__pick pg-needs-js">
              <p class="label" id="book-day-l">Day <span class="book__tz">(India Standard Time)</span></p>
              <div class="book__days" id="book-days" role="radiogroup" aria-labelledby="book-day-l"></div>
              <p class="label" id="book-time-l">Time</p>
              <div class="book__slots" id="book-slots" role="radiogroup" aria-labelledby="book-time-l"><p class="book__hint">Choose a day first.</p></div>
              <p class="book__local" id="book-local" aria-live="polite"></p>
            </div>
            <div class="book__nojs">
              <div class="field"><label for="bk-date">Preferred day</label><input class="input" id="bk-date" name="preferred_day" type="date"></div>
              <div class="field"><label for="bk-time">Preferred time (India Standard Time)</label><input class="input" id="bk-time" name="preferred_time" type="time"></div>
            </div>

            <div class="contact__pair">
              <div class="field" data-field="name"><label for="bk-name">Name</label><input class="input" id="bk-name" name="name" type="text" autocomplete="name" autocapitalize="words" maxlength="80" required placeholder="Your name" aria-describedby="bk-name-err">${fieldError('bk-name-err')}</div>
              <div class="field" data-field="email"><label for="bk-email">Email</label><input class="input" id="bk-email" name="email" type="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" maxlength="120" required placeholder="you@example.com" aria-describedby="bk-email-err">${fieldError('bk-email-err')}</div>
            </div>
            <div class="field"><label for="bk-type">What is it about?</label><select class="input" id="bk-type" name="project_type"><option value="">Choose one (optional)</option>${opts}<option value="role">Full-time role or job opportunity</option><option value="other">Something else</option></select></div>
            <div class="field" data-field="message"><label class="label" for="bk-note">Anything I should read first? <span class="book__opt">(optional)</span></label><textarea class="input" id="bk-note" name="message" rows="3" maxlength="800" placeholder="A line or two about what you want to talk about"></textarea></div>
            <div class="hp" aria-hidden="true" inert><label for="bk-website">Leave this field empty</label><input id="bk-website" type="text" name="_gotcha" tabindex="-1" autocomplete="off"></div>

            <div class="contact__fail" id="bk-fail" role="alert" hidden>
              ${ico('triangle-alert', 'icon--lg contact__fail-icon')}
              <div class="contact__fail-body"><p class="contact__fail-title" id="bk-fail-title">Request not sent</p><p class="contact__fail-text" id="bk-fail-text">Something went wrong on the way. Please try again, or email me directly.</p><a class="btn btn--sm btn--magenta" id="bk-fail-mail" href="mailto:${esc(EMAIL)}">Email me instead ${ico('mail', 'icon--still')}</a></div>
            </div>
            <div class="contact__submit">
              <button class="btn btn--solid btn--lg" id="bk-submit" type="submit"><span class="contact__submit-label">Request this slot</span>${ico('calendar', 'icon--still')}</button>
              <p class="form-status contact__status" id="bk-status" role="status" aria-live="polite"></p>
            </div>
          </form>
        </div>
        <div class="contact__done book__done" id="bk-done" role="status" tabindex="-1" hidden>
          <span class="contact__done-icon" aria-hidden="true">${ico('check', 'icon--xl')}</span>
          <h2 class="contact__h contact__h--done">Request sent</h2>
          <p class="contact__note" id="bk-done-text">Thank you. I will confirm this slot by email.</p>
          <p class="book__when" id="bk-done-when"></p>
          <div class="book__cal">
            <a class="btn btn--solid" id="bk-gcal" href="#" target="_blank" rel="noopener noreferrer">Add to Google Calendar ${ico('arrow-up-right', 'icon--still')}<span class="sr-only"> (opens in a new tab)</span></a>
            <a class="btn btn--ghost" id="bk-ics" href="#" download="call-with-shaunak-chorge.ics">Download calendar file ${ico('download', 'icon--still')}</a>
          </div>
          <p class="contact__note">The calendar entry is marked tentative until I confirm.</p>
          <button class="btn btn--ghost" id="bk-again" type="button">Pick another time</button>
        </div>
      </div>`;
}

/* ---------- credentials: the education collage, certificate tiles and award tiles (About page and Resume page) ---------- */
const TONES = ['cyan', 'purple', 'blue', 'magenta'];

/** the education collage: one big tile for the degree, a smaller tile for each school; the years sit in the footer of every tile (no subjects list) */
export function eduCollage(education, { short = false } = {}) {
  const main = education.find(e => !e.minor);
  const schools = education.filter(e => e.minor);
  const years = e => esc(e.period && !/^Completed/i.test(e.period) ? e.period : e.year);
  const foot = (e, label) => `<footer class="edu__foot"><span class="edu__years">${years(e)}</span><span class="edu__label">${esc(label)}</span></footer>`;
  const mainTile = main ? `<article class="edu__tile edu__tile--main" data-tone="cyan" data-reveal aria-labelledby="edu-main-t">
      <header class="edu__head"><span class="icon-tile">${ico('graduation-cap')}</span><p class="edu__kind">Degree</p></header>
      <h3 class="edu__title" id="edu-main-t">${esc(short && main.degree_short ? main.degree_short : main.degree)}</h3>
      <p class="edu__inst">${esc(main.institution)}</p>
      ${main.activities && main.activities.length ? `<p class="edu__note">${ico('users', 'icon--sm')}<span>${esc(main.activities.join(', '))}</span></p>` : ''}
      ${foot(main, 'Years')}
    </article>` : '';
  const small = schools.map((e, i) => `<article class="edu__tile edu__tile--small" data-tone="${TONES[(i + 1) % TONES.length]}" data-reveal style="--i:${i + 1}" aria-labelledby="edu-s${i}-t">
      <header class="edu__head"><span class="icon-tile">${ico('book-open')}</span><p class="edu__kind">${esc(e.degree)}</p></header>
      <h3 class="edu__title" id="edu-s${i}-t">${esc(e.institution)}</h3>
      ${e.location ? `<p class="edu__inst">${ico('map-pin', 'icon--sm')}<span>${esc(e.location)}</span></p>` : ''}
      ${foot(e, 'Completed')}
    </article>`).join('\n    ');
  return `<div class="edu">
    ${mainTile}
    ${small}
  </div>`;
}

/** one certificate tile. A certificate with a document links to its Google Drive preview; a digital badge links to its public page.
    `lastRow` is the class from lastRowClasses() (empty for every tile but the first one on a short last row) */
function certTile(c, i, { award = false, group = 'c', lastRow = '' } = {}) {
  const tone = award ? (i % 2 ? 'magenta' : 'purple') : TONES[i % 3];
  const when = award ? c.year : (c.year || c.period || '');
  const label = award ? `Award${c.kind ? ' / ' + c.kind : ''}` : c.kind || 'Certificate';
  const href = c.doc || c.verify || '';
  const cta = c.doc ? (c.kind === 'Internship letter' ? 'View letter' : 'View certificate') : c.verify ? 'Verify badge' : '';
  const seal = award ? (c.rank && /^Winner/i.test(c.rank) ? 'trophy' : 'medal') : (c.kind && /^Internship/.test(c.kind) ? 'briefcase' : 'award');
  const title = award ? c.event : c.name;
  const sub = award ? c.rank : c.issuer;
  const noteText = award ? c.detail : c.note;
  return `<li class="cert${c.featured ? ' cert--wide' : ''}${award ? ' cert--award' : ''}${lastRow}" data-tone="${tone}" data-reveal style="--i:${i % 4}">
      <article class="cert__card" aria-labelledby="ct-${award ? 'a' : group}${i}">
        <span class="cert__corner cert__corner--tl" aria-hidden="true"></span><span class="cert__corner cert__corner--tr" aria-hidden="true"></span><span class="cert__corner cert__corner--bl" aria-hidden="true"></span><span class="cert__corner cert__corner--br" aria-hidden="true"></span>
        <header class="cert__head"><p class="cert__kind">${esc(label)}</p>${when ? `<p class="cert__when">${esc(when)}</p>` : ''}</header>
        <p class="cert__to"><span>Awarded to</span> Shaunak Chorge</p>
        <h3 class="cert__title" id="ct-${award ? 'a' : group}${i}">${esc(title)}</h3>
        <p class="cert__issuer">${award ? ico('medal', 'icon--sm') : ico('building-2', 'icon--sm')}<span>${esc(sub || '')}</span></p>
        ${noteText ? `<p class="cert__note">${esc(noteText)}</p>` : ''}
        <footer class="cert__foot">
          <span class="cert__meta">${c.credential_id ? `<span class="cert__id">ID ${esc(c.credential_id)}</span>` : ''}${href ? `<a class="cert__view" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(cta)} ${ico('arrow-up-right', 'icon--sm')}<span class="sr-only"> for ${esc(title)} (opens in a new tab)</span></a>` : ''}</span>
          <span class="cert__seal" aria-hidden="true">${ico(seal)}</span>
        </footer>
      </article>
    </li>`;
}
/** The tiles grid has 3 columns from 64em and 2 from 40em (pages.css). When the last row is not full, its tiles stand in the middle instead of leaving empty cells on the
    right: this returns, for every tile, the class that tells the stylesheet where the short last row starts (`cert--last1of3`: the row holds one cell; `cert--last2of3`; `cert--last1of2`).
    A featured tile is two cells wide at 3 columns and fills a whole row at 2. Only the first tile of the short row gets a class; the rest follow it.
    This models a grid that fills row by row in the order of the list, which is how pages.css lays it out (no grid-auto-flow: dense): a featured tile that does not fit
    after the tiles before it starts the next row and leaves the row before it short, so keep the featured tile first. */
export function lastRowClasses(items) {
  const cls = items.map(() => '');
  for (const cols of [3, 2]) {
    let used = 0, first = 0;
    items.forEach((c, i) => {
      const span = Math.min(c.featured ? 2 : 1, cols);
      if (used + span > cols) used = 0;
      if (used === 0) first = i;
      used += span;
      if (used === cols) used = 0;
    });
    if (used) cls[first] += ` cert--last${used}of${cols}`;
  }
  return cls;
}
/** certificate tiles in a collage grid (the featured ones are wider); kinds = which kinds of certificate to show */
export function certTiles(list, { kinds = null, group = 'c' } = {}) {
  const items = kinds ? list.filter(c => kinds.includes(c.kind)) : list;
  const last = lastRowClasses(items);
  return `<ul class="certs" role="list">${items.map((c, i) => certTile(c, i, { group, lastRow: last[i] })).join('\n    ')}</ul>`;
}
export function awardTiles(list) {
  const last = lastRowClasses(list);
  return `<ul class="certs certs--awards" role="list">${list.map((a, i) => certTile(a, i, { award: true, lastRow: last[i] })).join('\n    ')}</ul>`;
}

/* ---------- "ask a question": a plain GET form that opens the contact page with the question and this page already filled in ---------- */
/** askBox({ b, ref, topic, prompts, subject }): `ref` is the page path (projects/x/), `topic` a service slug (preselects the project type on /contact/) */
export function askBox({ b, ref, about = '', topic = '', prompts = [], title = 'Have a question about this, or your own idea?' }) {
  const href = q => `${b}contact/?${topic ? `topic=${encodeURIComponent(topic)}&` : ''}ref=${encodeURIComponent(ref).replace(/%2F/gi, '/')}${about ? `&about=${encodeURIComponent(about)}` : ''}&q=${encodeURIComponent(q)}#hire`;
  return `<section id="ask" class="section pg-sec pg-ask" aria-labelledby="ask-h">
  <div class="container">
    <div class="pg-ask__box panel" data-tone="cyan" data-reveal>
      <div class="pg-ask__text">
        <p class="eyebrow">Ask me</p>
        <h2 id="ask-h" class="pg-ask__title">${esc(title)}</h2>
        <p class="pg-ask__lead">Type your question below. The contact form opens with your question and this page already filled in, so you only add your name and email.</p>
      </div>
      <form class="pg-ask__form" action="${b}contact/#hire" method="get">
        ${topic ? `<input type="hidden" name="topic" value="${esc(topic)}">` : ''}
        <input type="hidden" name="ref" value="${esc(ref)}">
        ${about ? `<input type="hidden" name="about" value="${esc(about)}">` : ''}
        <label class="sr-only" for="ask-q">Your question</label>
        <input class="input pg-ask__input" id="ask-q" name="q" type="text" maxlength="300" autocomplete="off" enterkeyhint="send" placeholder="${esc(prompts[0] || 'Type your question here')}">
        <button class="btn btn--solid btn--glow" type="submit">Ask me ${ico('arrow-right', 'icon--still')}</button>
      </form>
      ${prompts.length ? `<ul class="pg-ask__chips" role="list" aria-label="Questions people often ask">${prompts.map(q => `<li><a class="pg-ask__chip" href="${href(q)}">${esc(q)}</a></li>`).join('')}</ul>` : ''}
    </div>
  </div>
</section>`;
}

/* ---------- related case studies (business view): cards with the reason they are related ---------- */
/** relatedCards([{ p: projectModel, reason }], { b, heading }) -> HTML (no section wrapper) */
export function relatedCards(items, { b }) {
  return `<ul class="pg-relcards" role="list" data-reveal-group>${items.map(({ p, reason, href, label }, i) => `<li><a class="pg-relcard" href="${href || b + p.path}" data-tone="${esc(p.tone)}" style="--i:${i}">
      <span class="pg-relcard__cat">${esc(p.category)}</span>
      <strong class="pg-relcard__t">${esc(label || p.title)}</strong>
      <span class="pg-relcard__why">${esc(reason)}</span>
      <span class="pg-relcard__go">Read the case study ${ico('arrow-right', 'icon--sm')}</span>
    </a></li>`).join('')}</ul>`;
}

/* ---------- a left-to-right pipeline diagram from a short list of { label, note } ---------- */
export function flowDiagram(flow, tone = 'cyan') {
  return `<ol class="pg-flow" data-tone="${esc(tone)}" aria-label="Pipeline, step by step" data-reveal-group>${flow.map((n, i) => `<li class="pg-flow__node" style="--i:${Math.min(i, 5)}"><span class="pg-flow__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><strong class="pg-flow__t">${esc(n.label)}</strong><span class="pg-flow__d">${esc(n.note)}</span></li>`).join('')}</ol>`;
}

/* ---------- JSON-LD helpers ---------- */
export const PERSON_ID = abs(cfg, '#person');
export const WEBSITE_ID = abs(cfg, '#website');
export const personRef = () => ({ '@id': PERSON_ID });
export const personMini = () => ({ '@type': 'Person', '@id': PERSON_ID, name: cfg.name, url: cfg.url, jobTitle: cfg.person.jobTitle, worksFor: { '@type': 'Organization', name: cfg.person.employer } });
// every page repeats the small WebSite node, because its WebPage points at it by @id
const websiteMini = () => ({ '@type': 'WebSite', '@id': WEBSITE_ID, url: cfg.url, name: cfg.name });
export const ctx = nodes => ({ '@context': 'https://schema.org', '@graph': nodes.some(n => n && n['@type'] === 'WebSite') ? nodes : [...nodes, websiteMini()] });
export function crumbNode(pageUrl, items) {
  const node = breadcrumb(cfg, items);
  node['@id'] = pageUrl + '#breadcrumb';
  return node;
}
export function webPage(url, name, description, extra = {}) {
  return { '@type': 'WebPage', '@id': url + '#webpage', url, name, description, isPartOf: { '@id': WEBSITE_ID }, breadcrumb: { '@id': url + '#breadcrumb' }, ...(/\/projects\//.test(url) ? {} : { dateModified: LASTMOD }), ...extra };
}
export function faqNode(url, items) {
  return { '@type': 'FAQPage', '@id': url + '#faq', mainEntity: items.map(it => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.a } })) };
}

/* ---------- misc ---------- */
/** "Hire me" link carrying the topic so the contact form can preselect it */
export const hireHref = (b, topic = '') => `${b}contact/${topic ? `?topic=${topic}` : ''}#hire`;

/* ---------- contact: ONE form and ONE channel list, used by the home page (section 08) and /contact/ ----------
   The ids and data attributes are the contract with assets/js/sections/contact.js and contact-form.js (validation, honeypot, Formspree POST, success panel). */
const fieldError = (id) => `<span class="field__error" id="${id}" aria-live="polite"><span class="field__error-in">${ico('circle-alert', 'icon--sm')}<span class="field__msg"></span></span></span>`;
export function contactForm({ heading = 'h3', title, note, subject, rows, placeholder, typeOptions = '', wrapCls = '' }) {
  return `<div class="contact__formwrap panel${wrapCls ? ' ' + wrapCls : ''}" id="contact-form-panel" data-tone="cyan" data-reveal>
        <div class="contact__compose" data-compose>
          <div class="contact__sub">
            <${heading} class="contact__h" id="cf-title">${esc(title)}</${heading}>
            <p class="contact__note">${esc(note)}</p>
          </div>
          <form class="contact__form" id="contact-form" action="${esc(profile.links.formspree)}" method="POST" data-email="${esc(EMAIL)}" aria-labelledby="cf-title">
            <input type="hidden" name="_subject" value="${esc(subject)}">
            <input type="hidden" name="page" id="cf-page" value="">

            <div class="contact__pair">
              <div class="field" data-field="name">
                <label for="cf-name">Name</label>
                <input class="input" id="cf-name" name="name" type="text" autocomplete="name" autocapitalize="words" enterkeyhint="next" maxlength="80" required placeholder="Your name" aria-describedby="cf-name-err">
                ${fieldError('cf-name-err')}
              </div>
              <div class="field" data-field="email">
                <label for="cf-email">Email</label>
                <input class="input" id="cf-email" name="email" type="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" enterkeyhint="next" maxlength="120" required placeholder="you@example.com" aria-describedby="cf-email-err">
                ${fieldError('cf-email-err')}
              </div>
            </div>
${typeOptions ? `
            <div class="contact__pair">
              <div class="field" data-field-type>
                <label for="cf-type">Project type</label>
                <select class="input" id="cf-type" name="project_type">
                  <option value="">Choose one (optional)</option>
                  ${typeOptions}
                  <option value="role">Full-time role or job opportunity</option>
                  <option value="other">Something else</option>
                </select>
              </div>
              <div class="field">
                <label for="cf-when">When do you need it?</label>
                <select class="input" id="cf-when" name="timeline">
                  <option value="">Choose one (optional)</option>
                  <option value="As soon as possible">As soon as possible</option>
                  <option value="Within a month">Within a month</option>
                  <option value="In two to three months">In two to three months</option>
                  <option value="Flexible, or not sure yet">Flexible, or not sure yet</option>
                </select>
              </div>
            </div>
` : ''}
            <div class="field" data-field="message">
              <div class="contact__labelrow">
                <label class="label" for="cf-message">Message</label>
                <span class="contact__count" id="cf-count" aria-hidden="true">0 / 2000</span>
              </div>
              <textarea class="input" id="cf-message" name="message" rows="${rows}" maxlength="2000" required placeholder="${esc(placeholder)}" aria-describedby="cf-message-err"></textarea>
              ${fieldError('cf-message-err')}
            </div>

            <div class="hp" aria-hidden="true" inert><label for="cf-website">Leave this field empty</label><input id="cf-website" type="text" name="_gotcha" tabindex="-1" autocomplete="off"></div>

            <div class="contact__fail" id="cf-fail" role="alert" hidden>
              ${ico('triangle-alert', 'icon--lg contact__fail-icon')}
              <div class="contact__fail-body">
                <p class="contact__fail-title" id="cf-fail-title">Message not sent</p>
                <p class="contact__fail-text" id="cf-fail-text">Something went wrong on the way. Your text is still in the form, so you can try again, or email me directly.</p>
                <a class="btn btn--sm btn--magenta" id="cf-fail-mail" href="mailto:${esc(EMAIL)}">Email me instead ${ico('mail', 'icon--still')}</a>
              </div>
            </div>

            <div class="contact__submit">
              <button class="btn btn--solid btn--lg" id="cf-submit" type="submit"><span class="contact__submit-label">Send message</span>${ico('send', 'icon--still')}</button>
              <p class="form-status contact__status" id="cf-status" role="status" aria-live="polite"></p>
            </div>
          </form>
        </div>

        <div class="contact__done" id="cf-done" role="status" tabindex="-1" hidden>
          <span class="contact__done-icon" aria-hidden="true">${ico('check', 'icon--xl')}</span>
          <${heading} class="contact__h contact__h--done">Message sent</${heading}>
          <p class="contact__note">Thanks<span id="cf-done-name"></span>. I will reply to <strong id="cf-done-email">your address</strong> as soon as I can.</p>
          <button class="btn btn--ghost" id="cf-again" type="button">Send another message</button>
        </div>
      </div>`;
}

/** the contact channels: email (with copy button), phone, LinkedIn, GitHub and, on /contact/, where I am based */
export function contactList({ group = false, location = false, b = '' } = {}) {
  const row = (tone, ic, label, value, { go = true, cls = '' } = {}) => [
    `          <li class="contact__row${cls}" data-tone="${tone}">`,
    `            <span class="icon-tile contact__icon" aria-hidden="true">${ico(ic)}</span>`,
    '            <div class="contact__meta">',
    `              <span class="contact__label">${label}</span>`,
    `              ${value}`,
    '            </div>',
    go ? `            ${ico('arrow-up-right', 'contact__go')}` : '',
    '          </li>',
  ].filter(Boolean).join('\n');
  const out = (href, text) => `<a class="contact__value" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(text)}<span class="sr-only"> (opens in a new tab)</span></a>`;
  const L = profile.links;
  return `<ul class="contact__list"${group ? ' data-reveal-group' : ''}>
          <li class="contact__row contact__row--copy" data-tone="cyan">
            <span class="icon-tile contact__icon" aria-hidden="true">${ico('mail')}</span>
            <div class="contact__meta">
              <span class="contact__label">Email</span>
              <a class="contact__value" id="contact-email" href="mailto:${esc(EMAIL)}">${esc(EMAIL)}</a>
            </div>
            <button class="contact__copy" type="button" data-copy="${esc(EMAIL)}" aria-label="Copy email address">${ico('copy', 'icon--sm')}<span class="contact__copy-text">Copy</span></button>
          </li>
${row('green', 'phone', 'Phone', `<a class="contact__value" href="${esc(profile.phone_tel)}">${esc(profile.phone)}</a>`)}
${row('blue', 'linkedin', 'LinkedIn', out(L.linkedin, L.linkedin.replace(/^https?:\/\/(www\.)?/, '')))}
${row('purple', 'github', 'GitHub', out(L.github, L.github.replace(/^https?:\/\//, '')))}
${row('magenta', 'download', 'Contact card', `<a class="contact__value" href="${b}${esc(content.connect.vcard)}" download="Shaunak-Chorge.vcf">Save my contact to your phone</a>`)}${location ? '\n' + row('cyan', 'map-pin', 'Based in', `<span class="contact__value">Mumbai, India &middot; <span data-clock="Asia/Kolkata" data-clock-label="Local time" data-clock-suffix="IST">IST</span></span>`, { go: false, cls: ' contact__row--static' }) : ''}
        </ul>`;
}
