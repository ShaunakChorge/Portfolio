// ui.mjs - small HTML fragment helpers shared by every page module. Pure string templates, no dependencies.
import { esc, breadcrumb, abs, personNode } from '../../build.mjs';
import { cfg, EMAIL, FREELANCE_LINE, services, projectHref, words } from './data.mjs';

export { esc, abs, cfg };

/* ---------- atoms ---------- */
export const ico = (name, cls = '') =>
  `<svg class="icon${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;

/** render a list of strings as .tag chips (tone via data-tone on the wrapper or per call) */
export function tags(list, { tone = '', cls = '', label = '', itemCls = '' } = {}) {
  if (!list || !list.length) return '';
  const t = tone ? ` data-tone="${tone}"` : '';
  return `<ul class="tags${cls ? ' ' + cls : ''}" role="list"${label ? ` aria-label="${esc(label)}"` : ''}${t}>${list.map(x => `<li class="tag${itemCls ? ' ' + itemCls : ''}">${esc(x)}</li>`).join('')}</ul>`;
}

/** reveal attributes with a stagger index */
export const rv = (i = 0, kind = '') => ` data-reveal${kind ? `="${kind}"` : ''}${i ? ` style="--i:${i}"` : ''}`;

export function btn(label, href, { v = 'solid', size = '', icon = 'arrow-right', extra = '' } = {}) {
  const cls = ['btn', v ? `btn--${v}` : '', size ? `btn--${size}` : '', v === 'solid' ? 'btn--glow' : ''].filter(Boolean).join(' ');
  return `<a class="${cls}" href="${href}"${extra ? ' ' + extra : ''}>${esc(label)}${icon ? ' ' + ico(icon, 'icon--still') : ''}</a>`;
}

/* ---------- page head ---------- */
export function crumbs(items, b) {
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
  const tid = titleId || (id ? id + '-h' : 'h-' + Math.random().toString(36).slice(2, 7));
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

/* ---------- hire band: the closing block of every page (D2) ---------- */
export function hireBand({ b, heading, text, topic = '', secondary = null }) {
  const href = `${b}contact/${topic ? `?topic=${topic}` : ''}#hire`;
  const sec = secondary || { label: 'View work', href: `${b}projects/` };
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

/* ---------- FAQ accordion (native <details>, readable without JS) ---------- */
export function qaList(items, { idPrefix = 'q', openFirst = false, links = {} } = {}) {
  return `<div class="pg-qas">` + items.map((it, i) => {
    const id = it.id ? `${idPrefix}-${it.id}` : `${idPrefix}-${i + 1}`;
    const l = links[it.id];
    return `<details class="pg-qa" id="${id}"${openFirst && i === 0 ? ' open' : ''} data-reveal${i ? ` style="--i:${Math.min(i, 4)}"` : ''}>
      <summary class="pg-qa__q"><h3 class="pg-qa__h">${esc(it.q)}</h3>${ico('chevron-down', 'pg-qa__chev')}</summary>
      <div class="pg-qa__a"><p>${esc(it.a)}</p>${l ? `<p class="pg-qa__more"><a class="link-arrow" href="${l.href}">${esc(l.label)} ${ico('arrow-right')}</a></p>` : ''}</div>
    </details>`;
  }).join('') + `</div>`;
}

/* ---------- project cards ---------- */
/** visual thumbnail (generative canvas, decorative) */
export function pv(p, extra = '') {
  return `<div class="pv${extra ? ' ' + extra : ''}" data-visual="${esc(p.visual_hint || 'generic')}" data-variant="${esc(p.visual_variant || p.id)}" data-tone="${esc(p.tone)}" aria-hidden="true"></div>`;
}

/** a card for a project that has its own case study page */
export function caseCard(p, b, i = 0) {
  const m = (p.metrics || [])[0];
  return `<li class="pg-grid__item" data-pid="${esc(p.id)}" data-cat="${esc(p.category_group)}">
      <article class="card pg-proj" data-tone="${esc(p.tone)}" data-tilt data-reveal style="--i:${i % 3}" aria-labelledby="pj-${esc(p.id)}">
        <div class="pg-proj__media">${pv(p)}</div>
        <div class="pg-proj__body">
          <p class="pg-proj__meta">${esc(p.category)}</p>
          <h3 class="pg-proj__title" id="pj-${esc(p.id)}">${esc(p.title)}</h3>
          <p class="pg-proj__blurb">${esc(p.card_blurb)}</p>
          ${m ? `<p class="pg-proj__stat"><span class="pg-proj__num">${esc(m.value)}</span><span class="pg-proj__statlabel">${esc(m.label)}</span></p>` : ''}
          ${tags((p.stack || []).slice(0, 4), { cls: 'pg-proj__tags', label: 'Main tools' })}
          <div class="pg-proj__foot"><a class="link-arrow card__link" href="${b}${p.path}">Read case study<span class="sr-only">: ${esc(p.title)}</span> ${ico('arrow-right')}</a></div>
        </div>
      </article>
    </li>`;
}

/** a compact card for a selected project without a case study (no art, repo link only) */
export function miniCard(p, b, i = 0) {
  const link = p.repoInfo.kind === 'public'
    ? `<a class="link-arrow" href="${p.repoInfo.href}" target="_blank" rel="noopener noreferrer">View code on GitHub<span class="sr-only"> for ${esc(p.title)} (opens in a new tab)</span> ${ico('arrow-up-right')}</a>`
    : `<span class="pg-proj__private">${esc(p.repoInfo.text || 'Private')}</span>`;
  return `<li class="pg-grid__item" data-pid="${esc(p.id)}" data-cat="${esc(p.category_group)}" id="p-${esc(p.id)}">
      <article class="card pg-mini card--flat" data-tone="${esc(p.tone)}" data-reveal style="--i:${i % 3}" aria-labelledby="pj-${esc(p.id)}">
        <p class="pg-proj__meta">${esc(p.category)}</p>
        <h3 class="pg-proj__title" id="pj-${esc(p.id)}">${esc(p.title)}</h3>
        <p class="pg-proj__blurb">${esc(p.card_blurb)}</p>
        ${tags((p.stack || []).slice(0, 4), { cls: 'pg-proj__tags', label: 'Main tools' })}
        <div class="pg-proj__foot">${link}</div>
      </article>
    </li>`;
}

/* ---------- JSON-LD helpers ---------- */
export const PERSON_ID = abs(cfg, '#person');
export const WEBSITE_ID = abs(cfg, '#website');
export const personRef = () => ({ '@id': PERSON_ID });
export const personMini = () => ({ '@type': 'Person', '@id': PERSON_ID, name: cfg.name, url: cfg.url });
export const ctx = nodes => ({ '@context': 'https://schema.org', '@graph': nodes });
export function crumbNode(pageUrl, items) {
  const node = breadcrumb(cfg, items);
  node['@id'] = pageUrl + '#breadcrumb';
  return node;
}
export function webPage(url, name, description, extra = {}) {
  return { '@type': 'WebPage', '@id': url + '#webpage', url, name, description, isPartOf: { '@id': WEBSITE_ID }, breadcrumb: { '@id': url + '#breadcrumb' }, ...extra };
}
export function faqNode(url, items) {
  return { '@type': 'FAQPage', '@id': url + '#faq', mainEntity: items.map(it => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.a } })) };
}
export { personNode };

/* ---------- misc ---------- */
/** "Hire me" link carrying the topic so the contact form can preselect it */
export const hireHref = (b, topic = '') => `${b}contact/${topic ? `?topic=${topic}` : ''}#hire`;
export const serviceLink = (s, b) => `<a class="link" href="${b}${s.path}">${esc(s.name)}</a>`;
export { words, services, projectHref };
