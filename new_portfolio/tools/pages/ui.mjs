// ui.mjs - small HTML fragment helpers shared by every page module. Pure string templates, no dependencies.
import { breadcrumb, abs } from '../../build.mjs';
import { esc, icon } from '../lib.mjs';
import { cfg, collage, EMAIL, FREELANCE_LINE, LASTMOD, profile } from './data.mjs';

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

/** a normal content section with the standard header */
export function section({ id = '', title, titleId, eyebrow = '', lead = '', body, cls = '', tint = false, reveal = true }) {
  const tid = titleId || id + '-h';
  return `<section${id ? ` id="${id}"` : ''} class="section pg-sec${tint ? ' section--tint' : ''}${cls ? ' ' + cls : ''}" aria-labelledby="${tid}">
  <div class="container">
    <header class="section__head"${reveal ? ' data-reveal' : ''}>
      ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
      <h2 id="${tid}" class="section__title">${title}</h2>
      ${lead ? `<p class="section__lead">${esc(lead)}</p>` : ''}
    </header>
${body}
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
export function hireBand({ b, heading, text, topic = '', secondary = null }) {
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
        <a class="btn btn--solid btn--lg btn--glow" href="${href}" data-magnetic>Hire me ${ico('arrow-right', 'icon--still')}</a>
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

/** one collage tile: the visual, a small category + origin line, the title and (wide and big tiles only, see collage.css) the blurb.
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
          <p class="tile__meta"><span class="tile__cat">${esc(p.category)}</span>${p.origin ? `<span class="tile__origin">${esc(p.origin)}</span>` : ''}</p>
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
            <div class="field" data-field-type>
              <label for="cf-type">Project type</label>
              <select class="input" id="cf-type" name="project_type">
                <option value="">Choose one (optional)</option>
                ${typeOptions}
                <option value="other">Something else</option>
              </select>
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
          <p class="contact__h contact__h--done">Message sent</p>
          <p class="contact__note">Thanks<span id="cf-done-name"></span>. I will reply to <strong id="cf-done-email">your address</strong> as soon as I can.</p>
          <button class="btn btn--ghost" id="cf-again" type="button">Send another message</button>
        </div>
      </div>`;
}

/** the contact channels: email (with copy button), phone, LinkedIn, GitHub and, on /contact/, where I am based */
export function contactList({ group = false, location = false } = {}) {
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
${row('purple', 'github', 'GitHub', out(L.github, L.github.replace(/^https?:\/\//, '')))}${location ? '\n' + row('cyan', 'map-pin', 'Based in', `<span class="contact__value">Mumbai, India &middot; <span data-clock="Asia/Kolkata" data-clock-label="Local time" data-clock-suffix="IST">IST</span></span>`, { go: false, cls: ' contact__row--static' }) : ''}
        </ul>`;
}
