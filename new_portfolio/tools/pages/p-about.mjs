// p-about.mjs - /about/  (bio, how I work, experience, 2-tier stack, education, certifications, awards). NO languages here.
import { personNode } from '../../build.mjs';
import {
  cfg, abs, services, skills, CTA_TEXT, experience, education, certifications, achievements, profile, aboutPage, pagesMeta, stats, ENTITY, FREELANCE_LINE,
} from './data.mjs';
import {
  esc, ico, tags, btn, pageHead, section, hireBand, hireHref, qaList, title as ttl,
  ctx, crumbNode, webPage, faqNode, PERSON_ID,
} from './ui.mjs';

/* ---------- whoami terminal (same idea as the home card, WITHOUT the languages line) ---------- */
export function terminal() {
  const w = aboutPage.whoami;
  return `<div class="pg-term" role="group" aria-label="Quick facts about Shaunak">
        <div class="pg-term__bar" aria-hidden="true"><i></i><i></i><i></i><span>${esc(w.script)}</span></div>
        <div class="pg-term__body">
          <p class="pg-term__prompt"><span class="pg-term__user">${esc(w.prompt)}</span><span class="pg-term__sym" aria-hidden="true">$</span><span class="pg-term__cmd">${esc(w.command)}</span></p>
          <dl class="pg-term__kv">
            <div><dt>education</dt><dd>${esc(w.education.degree)}<br><span class="pg-term__sub">${esc(w.education.institution)}</span></dd></div>
            <div><dt>focus</dt><dd><ul class="pg-term__list" role="list">${w.focus.map(f => `<li>${esc(f)}</li>`).join('')}</ul></dd></div>
            <div><dt>now</dt><dd>${esc(w.now)}</dd></div>
            <div><dt>freelance</dt><dd>${esc(FREELANCE_LINE)}</dd></div>
          </dl>
          <p class="pg-term__prompt" aria-hidden="true"><span class="pg-term__user">${esc(w.prompt)}</span><span class="pg-term__sym">$</span><span class="pg-term__cursor"></span></p>
        </div>
      </div>`;
}

/* ---------- reusable credential blocks (also used by the resume page) ---------- */
export function certList(cls = '') {
  return `<ul class="pg-plain${cls ? ' ' + cls : ''}" role="list">${certifications.map(c => {
    const name = c.url
      ? `<a class="link" href="${c.url}" target="_blank" rel="noopener noreferrer">${esc(c.name)}<span class="sr-only"> (opens in a new tab)</span></a>`
      : esc(c.name);
    return `<li><span class="pg-plain__t">${name}</span><span class="pg-plain__s">${esc(c.issuer)}</span></li>`;
  }).join('')}</ul>`;
}
export function awardList(cls = '') {
  return `<ul class="pg-plain${cls ? ' ' + cls : ''}" role="list">${achievements.map(a => `<li><span class="pg-plain__t">${esc(a.title)}</span><span class="pg-plain__s">${esc(a.detail)}</span></li>`).join('')}</ul>`;
}
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
    crumbItems, b, eyebrow: 'About', h1: esc(m.h1), lead: m.lead, answer: ENTITY, aside: terminal(),
    actions: btn('Hire me', hireHref(b), { v: 'solid', size: 'lg' }) + btn('Read the resume', b + 'resume/', { v: 'ghost', size: 'lg', icon: 'file-text' }),
  });

  // story: profile.summary_long, three paragraphs; the last one links to the contact page
  const paras = profile.summary_long.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
  const html = paras.map(p => {
    let t = esc(p);
    t = t.replace('the contact page', `<a href="${b}contact/#hire">the contact page</a>`);
    return `<p>${t}</p>`;
  }).join('');
  const statTone = { roles: 'cyan', podiums: 'magenta', projects: 'purple' };
  const statIcon = { roles: 'briefcase', podiums: 'trophy', projects: 'folder' };
  const story = section({
    id: 'story', eyebrow: 'Background', title: ttl(m.h2 && m.h2.story, 'The short <span class="hl">story</span>'),
    body: `<div class="pg-story"><div class="prose pg-prose" data-reveal>${html}</div></div>
    <div class="stats pg-stats" data-reveal="scale">${stats.map(s => `<div class="stat" data-tone="${statTone[s.id]}">${ico(statIcon[s.id])}<span class="stat__num" data-count="${s.value}">${s.value}</span><span class="stat__label">${esc(s.label)}</span></div>`).join('')}</div>`,
  });

  const how = section({
    id: 'how-i-work', eyebrow: 'Principles', title: ttl(m.h2 && m.h2.how, 'How I <span class="hl hl--purple">work</span>', 'hl--purple'), tint: true,
    body: `<ul class="grid grid--c4 pg-how" role="list">${aboutPage.page.how_i_work.map((x, i) => `<li><article class="card card--flat" data-tone="${['cyan', 'purple', 'magenta', 'blue'][i % 4]}" data-reveal style="--i:${i}"><h3 class="pg-how__t">${esc(x.title)}</h3><p class="card__text">${esc(x.detail)}</p></article></li>`).join('')}</ul>`,
  });

  const work = experience.filter(e => e.group === 'work');
  const exp = section({
    id: 'experience', eyebrow: 'Experience', title: ttl(m.h2 && m.h2.experience, 'Where I have <span class="hl hl--blue">worked</span>', 'hl--blue'),
    lead: 'Three industry roles. The full detail is on the resume.',
    body: `<ol class="timeline pg-timeline" data-fill>${work.map((e, i) => `<li class="timeline__item${i === 0 ? ' timeline__item--now' : ''}" data-tone="${WORK_TONE[i % 3]}" data-reveal>
        <p class="timeline__meta">${esc(e.period)}${e.location ? ` &middot; ${esc(e.location)}` : ''}</p>
        <h3 class="timeline__title">${esc(e.role)} <span class="pg-at">at ${esc(e.org)}</span></h3>
        <ul class="dot-list pg-tl__list" data-tone="${WORK_TONE[i % 3]}">${e.bullets.slice(0, 3).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        ${tags(e.tags, { tone: WORK_TONE[i % 3], cls: 'pg-tl__tags', label: 'Tools' })}
      </li>`).join('')}</ol>
    <p class="pg-linkrow" data-reveal><a class="link-arrow" href="${b}resume/">Full experience on the resume ${ico('arrow-right')}</a></p>`,
  });

  const stack = section({
    id: 'stack', eyebrow: 'Stack', title: ttl(m.h2 && m.h2.stack, 'Tools I <span class="hl">use</span>'), tint: true,
    lead: aboutPage.page.stack_intro,
    body: stackTiers(),
  });

  const edu = education[0];
  const cred = section({
    id: 'credentials', eyebrow: 'Credentials', title: `Education, <span class="hl hl--magenta">certifications</span> and awards`,
    body: `<div class="grid grid--c3 pg-cred">
      <div class="panel" data-tone="cyan" data-reveal><h3 class="pg-panel__h">${ico('graduation-cap', 'icon--sm')} Education</h3>
        <p class="pg-plain__t">${esc(edu.degree)}</p><p class="pg-plain__s">${esc(edu.institution)}</p><p class="pg-plain__s">${esc(edu.period)}</p>
        ${tags(edu.coursework, { tone: 'cyan', cls: 'pg-cred__tags', label: 'Coursework' })}
        ${edu.activities && edu.activities.length ? `<p class="pg-plain__s">Activities: ${esc(edu.activities.join(', '))}</p>` : ''}</div>
      <div class="panel" data-tone="purple" data-reveal style="--i:1"><h3 class="pg-panel__h">${ico('award', 'icon--sm')} Certifications</h3>${certList()}</div>
      <div class="panel" data-tone="magenta" data-reveal style="--i:2"><h3 class="pg-panel__h">${ico('trophy', 'icon--sm')} Awards</h3>${awardList()}</div>
    </div>`,
  });

  const faqItems = (m.faqs || []).map((f, i) => ({ id: `q${i + 1}`, q: f.q, a: f.a }));
  const faq = faqItems.length ? section({
    id: 'faq', eyebrow: 'FAQ', title: 'Quick <span class="hl">answer</span>', tint: true,
    body: qaList(faqItems, { idPrefix: 'about', openFirst: true }),
  }) : '';
  const person = {
    ...personNode(cfg), description: ENTITY,
    makesOffer: services.map(s => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', '@id': abs(cfg, s.path) + '#service', name: s.name } })),
  };
  const jsonld = ctx([
    webPage(url, m.title, m.description, { '@type': 'AboutPage', mainEntity: { '@id': PERSON_ID } }),
    person,
    crumbNode(url, crumbItems),
    ...(faqItems.length ? [faqNode(url, faqItems)] : []),
  ]);
  return {
    path: m.path, current: 'about', title: m.title, description: m.description, jsonld,
    content: head + story + how + exp + stack + cred + faq + hireBand({ b, heading: 'Let’s talk about <span class="hl">your project</span>', text: CTA_TEXT }),
    llms: {
      heading: m.h1, url, desc: m.description,
      text: [ENTITY, 'Experience: ' + work.map(e => `${e.role} at ${e.org}`).join('; ') + '.', 'Core stack: ' + skills.core.join(', ') + '.', 'Also works with: ' + skills.also.join(', ') + '.',
        'How I work: ' + aboutPage.page.how_i_work.map(x => `${x.title}. ${x.detail}`).join(' '), ...faqItems.map(f => `Q: ${f.q} A: ${f.a}`)],
    },
  };
}

export function build() { return [page()]; }
