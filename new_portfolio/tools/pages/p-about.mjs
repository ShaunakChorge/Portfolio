// p-about.mjs - /about/  (bio beside the portrait, how I work, experience, 2-tier stack, education collage, certificate tiles, award tiles). The spoken languages are shown here, once.
import { personNode } from '../../build.mjs';
import {
  cfg, abs, content, services, skills, CTA_TEXT, experience, education, certifications, achievements, profile, aboutPage, pagesMeta, ENTITY,
} from './data.mjs';
import {
  esc, ico, tags, btn, pageHead, section, hireBand, hireHref, qaList, title as ttl, eduCollage, certTiles, awardTiles,
  ctx, crumbNode, webPage, faqNode, PERSON_ID,
} from './ui.mjs';

/* ---------- whoami terminal: plain facts only (education, focus, the spoken languages). The hero and the story say the rest once, so nothing is repeated here ---------- */
function terminal() {
  const w = aboutPage.whoami;
  return `<div class="pg-term" role="group" aria-label="Quick facts about Shaunak">
        <div class="pg-term__bar" aria-hidden="true"><i></i><i></i><i></i><span>${esc(w.script)}</span></div>
        <div class="pg-term__body">
          <p class="pg-term__prompt"><span class="pg-term__user">${esc(w.prompt)}</span><span class="pg-term__sym" aria-hidden="true">$</span> <span class="pg-term__cmd">${esc(w.command)}</span></p>
          <dl class="pg-term__kv">
            <div><dt>education</dt><dd>${esc(w.education.degree)}, ${esc(w.education.year)}<br><span class="pg-term__sub">${esc(w.education.institution)}</span></dd></div>
            <div><dt>focus</dt><dd>${w.focus.map(esc).join(', ')}</dd></div>
            <div><dt>${esc((aboutPage.page.languages_label || 'languages').toLowerCase())}</dt><dd>${w.languages.map(esc).join(', ')}</dd></div>
          </dl>
          <p class="pg-term__prompt" aria-hidden="true"><span class="pg-term__user">${esc(w.prompt)}</span><span class="pg-term__sym">$</span><span class="pg-term__cursor"></span></p>
        </div>
      </div>`;
}

/* ---------- the neon portrait (portrait.css and portrait.js load on this page because the markup has class="np") ---------- */
const SIZES = '(min-width: 56em) 22rem, 17rem';
const ALT = 'Illustrated portrait of Shaunak Chorge, a freelance AI engineer in Mumbai, smiling and wearing glasses and a dark jacket with arms crossed';
const pic = (b, name, cls, { alt = '', attrs = '' } = {}) => `<picture class="${cls}"${attrs}>
                      <source type="image/avif" srcset="${b}assets/img/portrait/${name}-480.avif 480w, ${b}assets/img/portrait/${name}-800.avif 800w" sizes="${SIZES}">
                      <source type="image/webp" srcset="${b}assets/img/portrait/${name}-480.webp 480w, ${b}assets/img/portrait/${name}-800.webp 800w" sizes="${SIZES}">
                      <img${alt ? ' class="np__img"' : ''} src="${b}assets/img/portrait/${name}-800.webp" width="800" height="1067" loading="lazy" decoding="async" alt="${alt}">
                    </picture>`;
const DUST = [   // x (%), size (px), duration (s), delay (s), colour
  [12, 3, 9, 0, 'cyan'], [24, 2, 11, -3, 'magenta'], [36, 4, 13, -6, 'purple'], [48, 2, 10, -1, 'cyan'], [60, 3, 12, -8, 'magenta'],
  [72, 2, 9.5, -4, 'cyan'], [84, 4, 14, -10, 'purple'], [92, 2, 11.5, -2, 'cyan'], [18, 2, 12.5, -7, 'purple'], [66, 3, 10.5, -5, 'magenta'],
];
const RGB = { cyan: '0 255 255', magenta: '255 0 110', purple: '181 83 242' };
function portrait(b) {
  return `<figure class="np np--side" data-neon-portrait data-reveal="scale">
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
                    ${pic(b, 'portrait', 'np__pic', { alt: ALT })}
                    ${pic(b, 'rim', 'np__rim', { attrs: ' aria-hidden="true"' })}
                    <span class="np__scan"></span>
                  </div>
                </div>
              </div>
              <div class="np__dust" aria-hidden="true">
                ${DUST.map(([x, s, d, t, c]) => `<i style="--x:${x}%;--s:${s}px;--d:${d}s;--t:${t}s;--c:var(--${c},${RGB[c]})"></i>`).join('\n                ')}
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
}

/* ---------- reusable blocks (also used by the services hub and the resume page) ---------- */
/** "How I work": the three plain sentences of content.how_i_work; `extra` is appended inside the section (a link row) */
export function howIWork({ extra = '' } = {}) {
  const h = content.how_i_work;
  return section({
    id: 'how-i-work', eyebrow: 'Working together', title: ttl(h.title, '', 'hl--purple'), tint: true,
    body: `<div class="panel pg-hiw" data-tone="purple" data-reveal><ul class="dot-list">${h.lines.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>${extra}`,
  });
}
/** education collage + certificate tiles + award tiles as three sections (About and Resume share them; `idPrefix` keeps the section ids unique per page) */
export function credentialSections({ tintAlt = false } = {}) {
  const certs = certifications.filter(c => c.kind === 'Certification');
  const interns = certifications.filter(c => c.kind !== 'Certification');
  const edu = section({
    id: 'education', eyebrow: 'Education', title: `Where I <span class="hl hl--purple">studied</span>`, tint: tintAlt,
    body: eduCollage(education),
  });
  const cert = section({
    id: 'certifications', eyebrow: 'Certificates', title: `Certifications and <span class="hl hl--blue">internship certificates</span>`,
    lead: 'Each certificate opens as a preview of the original document.',
    body: `<div class="pg-credgroup">${certTiles(certs, { group: 'c' })}</div>
    <div class="pg-credgroup"><h3 class="pg-credgroup__h">${ico('briefcase')} Internship certificates and letters</h3>${certTiles(interns, { group: 'i' })}</div>`,
  });
  const award = section({
    id: 'awards', eyebrow: 'Awards', title: `Contests and <span class="hl hl--magenta">hackathons</span>`, tint: !tintAlt,
    lead: aboutPage.page.recognition,
    body: awardTiles(achievements),
  });
  return { edu, cert, award };
}
/** the full stack: both tiers are plain panels, nothing is collapsed */
export function stackTiers() {
  const t = skills.tier_labels;
  return `<div class="pg-tiers">
      <div class="panel" data-tone="cyan" data-reveal><h3 class="pg-panel__h">${esc(t.core.title)}</h3><p class="pg-panel__cap">${esc(t.core.caption)}</p>${tags(skills.core, { tone: 'cyan', cls: 'pg-tier', label: t.core.title })}</div>
      <div class="panel" data-tone="purple" data-reveal style="--i:1"><h3 class="pg-panel__h">${esc(t.also.title)}</h3><p class="pg-panel__cap">${esc(t.also.caption)}</p>${tags(skills.also, { tone: 'purple', cls: 'pg-tier', label: t.also.title, itemCls: 'tag--dim' })}</div>
    </div>`;
}

const WORK_TONE = ['cyan', 'blue', 'purple'];

function page() {
  const m = pagesMeta.about;
  const b = '../';
  const url = abs(cfg, m.path);
  const crumbItems = [{ name: 'Home', path: '' }, { name: 'About', path: m.path }];
  const head = pageHead({
    crumbItems, b, eyebrow: 'About', h1: esc(m.h1), answer: m.direct_answer, aside: terminal(),
    actions: btn('Hire me', hireHref(b), { v: 'solid', size: 'lg' }) + btn('Read the resume', b + 'resume/', { v: 'ghost', size: 'lg', icon: 'file-text' }),
  });

  // story: profile.summary_long, three paragraphs (the last one links to the contact page), with the portrait on the right at the same height
  const paras = profile.summary_long.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
  const html = paras.map(p => {
    let t = esc(p);
    t = t.replace('the contact page', `<a href="${b}contact/#hire">the contact page</a>`);
    return `<p>${t}</p>`;
  }).join('');
  const story = section({
    id: 'story', eyebrow: 'Background', title: ttl(m.h2 && m.h2.story, 'Who I am and <span class="hl">what I do</span>'),
    body: `<div class="pg-story"><div class="prose pg-prose" data-reveal>${html}</div>${portrait(b)}</div>
    <p class="pg-linkrow" data-reveal><a class="link-arrow" href="${b}resume/">Resume ${ico('arrow-right')}</a><a class="link-arrow" href="${b}projects/">Projects ${ico('arrow-right')}</a><a class="link-arrow" href="#certifications">Certificates ${ico('arrow-right')}</a><a class="link-arrow" href="${b}faq/">FAQ ${ico('arrow-right')}</a><a class="link-arrow" href="${b}contact/#hire">Contact ${ico('arrow-right')}</a></p>`,
  });

  const work = experience.filter(e => e.group === 'work');
  const exp = section({
    id: 'experience', eyebrow: 'Experience', title: ttl(m.h2 && m.h2.experience, 'Where I have <span class="hl hl--blue">worked</span>', 'hl--blue'),
    lead: 'My roles so far, newest first. The full detail is on the resume.',
    body: `<ol class="timeline pg-timeline" data-fill>${work.map((e, i) => `<li class="timeline__item${i === 0 ? ' timeline__item--now' : ''}" data-tone="${WORK_TONE[i % 3]}" data-reveal>
        <p class="timeline__meta">${esc(e.period)}</p>
        <h3 class="timeline__title">${esc(e.role)} <span class="pg-at">at ${esc(e.org)}</span></h3>${e.location ? `
        <p class="timeline__loc">${esc(e.location)}</p>` : ''}
        <ul class="dot-list pg-tl__list" data-tone="${WORK_TONE[i % 3]}">${e.bullets.slice(0, 3).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        ${tags(e.tags, { tone: WORK_TONE[i % 3], cls: 'pg-tl__tags', label: 'Tools' })}${e.doc ? `
        <p class="pg-tl__doc"><a class="link" href="${esc(e.doc)}" target="_blank" rel="noopener noreferrer">${esc(e.doc_label || 'View certificate')}<span class="sr-only"> for ${esc(e.role)}, ${esc(e.org)} (opens in a new tab)</span></a></p>` : ''}
      </li>`).join('')}</ol>
    <p class="pg-linkrow" data-reveal><a class="link-arrow" href="${b}resume/">Full experience on the resume ${ico('arrow-right')}</a></p>`,
  });

  const stack = section({
    id: 'stack', eyebrow: 'Stack', title: ttl(m.h2 && m.h2.stack, 'Tools I <span class="hl">use</span>'), tint: true,
    lead: aboutPage.page.stack_intro,
    body: stackTiers(),
  });

  const { edu, cert, award } = credentialSections({ tintAlt: true });

  const faqItems = (m.faqs || []).map((f, i) => ({ id: `q${i + 1}`, q: f.q, a: f.a }));
  const faq = faqItems.length ? section({
    id: 'faq', eyebrow: 'FAQ', title: 'Quick <span class="hl">answer</span>', tint: true,
    body: qaList(faqItems, { idPrefix: 'about' }),
  }) : '';
  const person = {
    ...personNode(cfg), description: ENTITY,
    makesOffer: services.map(s => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', '@id': abs(cfg, s.path) + '#service', name: s.name } })),
    hasCredential: certifications.filter(c => c.kind === 'Certification').map(c => ({ '@type': 'EducationalOccupationalCredential', name: c.name, credentialCategory: 'certificate', recognizedBy: { '@type': 'Organization', name: c.issuer } })),
  };
  const jsonld = ctx([
    webPage(url, m.title, m.description, { '@type': 'AboutPage', mainEntity: { '@id': PERSON_ID } }),
    person,
    crumbNode(url, crumbItems),
    ...(faqItems.length ? [faqNode(url, faqItems)] : []),
  ]);
  return {
    path: m.path, current: 'about', title: m.title, description: m.description, jsonld,
    content: head + story + howIWork() + exp + stack + edu + cert + award + faq + hireBand({ b, heading: 'Let’s talk about <span class="hl">your project</span>', text: CTA_TEXT }),
    llms: {
      heading: m.h1, url, desc: m.description,
      text: [ENTITY, `${aboutPage.whoami.now_full}. ${aboutPage.whoami.based}.`, 'Experience: ' + work.map(e => `${e.role} at ${e.org}`).join('; ') + '.', 'Core stack: ' + skills.core.join(', ') + '.', 'Also works with: ' + skills.also.join(', ') + '.',
        `${content.how_i_work.title}: ${content.how_i_work.lines.join(' ')}`, ...faqItems.map(f => `Q: ${f.q} A: ${f.a}`)],
    },
  };
}

export function build() { return [page()]; }
