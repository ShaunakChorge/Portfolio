// Home page generator: writes the home partials (everything except hero.html, which tools/hero/gen.mjs writes) from
// content/content.json plus the project selection (projects.config.json), and home.content.html + home.page.json.
// Run by build.mjs, or alone:  node tools/home/gen.mjs
// A minimal page: one idea per section, few words, plenty of room. Sections in order:
//   01 hero (hero.html)  02 stack (the moving tool ribbon)  03 about (whoami card: lead lines, location, role, profiles; no languages)  04 offer (services)
//   05 selected (the collage)  06 roles  07 process  08 faq (open)  09 contact (hire call to action)
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, abs, personNode, websiteNode } from '../../build.mjs';
import { GENERATED, readContent, escText as esc, icon } from '../lib.mjs';
import { findBanned, LANGUAGE_RE, LD_NEVER_RE, YEAR_RE } from '../rules.mjs';
import { SERVICE_SLUG, faqFor } from '../pages/data.mjs';   // content slug -> published page slug (the service pages are written under the published slug)
import { projectCollage, title as ttl } from '../pages/ui.mjs';

const C = readContent();
const OUT = GENERATED;
fs.mkdirSync(OUT, { recursive: true });
const cfg = loadConfig();

const H2 = C.pages.home.h2 || {};   // section titles written for search (content.pages.home.h2); the last word is highlighted
const curly = s => String(s).replace(/(\w)'(\w)/g, '$1’$2');         // apostrophes only; visible text and JSON-LD use the same string
const P = C.profile;
const need = (cond, msg) => { if (!cond) { console.error('GEN ERROR:', msg); process.exit(1); } };

/* ------------------------------------------------------------------ 02  STACK RIBBON (content.skills.ribbon: name, tone, daily = a core tool) */
/* The strip is decorative (aria-hidden): the same tools are written once for screen readers. Two identical sets make the CSS loop seamless
   (marquee.css moves the track by half its width); only the first set is shown without JavaScript or with reduced motion. */
const ribbon = C.skills.ribbon;
need(Array.isArray(ribbon) && ribbon.length >= 8, 'skills.ribbon: the tool ribbon needs at least 8 tools');
const chips = ribbon.map(t => `<li class="mq__chip" data-tone="${t.tone}"${t.daily ? ' data-tier="daily"' : ''}><i class="mq__dot"></i>${esc(t.name)}</li>`).join('');
const sets = [0, 1].map(i => `<ul class="mq__set"${i ? ' data-clone' : ''}>${chips}</ul>`).join('\n          ');
const stack = `<section id="stack" class="mq section--alt" data-num="02" data-rail="02·stack" aria-labelledby="stack-title">
  <h2 id="stack-title" class="sr-only">${esc(H2.stack || 'Tools I work with')}</h2>
  <p class="sr-only">${esc(ribbon.map(t => t.name).join(', '))}.</p>
  <div class="container mq__bar">
    <div class="mq__stage" aria-hidden="true" data-reveal="fade">
      <div class="mq__track">
        ${sets}
      </div>
    </div>
    <button class="mq__toggle" type="button" aria-pressed="false" aria-label="Pause the tools animation">
      <svg class="icon mq__ico mq__ico--pause" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
      <svg class="icon mq__ico mq__ico--play" aria-hidden="true" focusable="false"><use href="#i-play"/></svg>
    </button>
  </div>
</section>
`;

/* ------------------------------------------------------------------ 03  ABOUT CARD (whoami terminal: a few written lines, where I am, what I do now, my profiles; the spoken languages are on /about/ only) */
const W = C.about.whoami, HC = C.about.home_card;
need(HC && Array.isArray(HC.lead) && HC.lead.length >= 1 && HC.title, 'about.home_card: title and lead paragraphs');
need(W.now_short && W.based_short && W.education.short, 'about.whoami: now_short, based_short and education.short (short forms for the home card)');
const aboutLinks = [['About me', 'about/'], ['Resume', 'resume/'], ['Experience', 'about/#experience'], ['FAQ', 'faq/']];
const profiles = [['GitHub', P.links.github, 'github'], ['LinkedIn', P.links.linkedin, 'linkedin'], ['Email', 'mailto:' + P.email, 'mail']];
const profileChips = `<ul class="hm-term__find" role="list">${profiles.map(([label, href, ic]) => {
  const out = !href.startsWith('mailto:');
  return `<li><a class="hm-chip" href="${esc(href)}"${out ? ' target="_blank" rel="noopener noreferrer"' : ''}>${icon(ic)}<span>${label}</span>${out ? '<span class="sr-only"> (opens in a new tab)</span>' : ''}</a></li>`;
}).join('')}</ul>`;
const about = `<section id="about" class="section hm-cv" data-num="03" data-rail="03·about" aria-labelledby="about-title">
  <div class="container">
    <div class="hm-term" role="group" aria-labelledby="about-title" data-reveal>
      <div class="hm-term__bar">
        <span class="hm-term__dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <h2 id="about-title" class="hm-term__title">${esc(HC.title)}</h2>
        <span class="hm-term__tag" aria-hidden="true">${esc(W.script)}</span>
      </div>
      <div class="hm-term__body">
        <p class="hm-term__prompt" aria-hidden="true"><span class="hm-term__ps">$</span> <span class="hm-term__cmd" style="--n:${W.command.length}">${esc(W.command)}</span><span class="hm-term__caret"></span></p>
        <div class="hm-term__lead">
${HC.lead.map(t => `          <p>${esc(curly(t))}</p>`).join('\n')}
        </div>
        <dl class="hm-term__facts">
          <div class="hm-term__fact" data-tone="cyan" style="--r:1"><dt>based</dt><dd>${esc(W.based_short)}</dd></div>
          <div class="hm-term__fact" data-tone="purple" style="--r:2"><dt>now</dt><dd>${esc(W.now_short)}</dd></div>
          <div class="hm-term__fact" data-tone="blue" style="--r:3"><dt>education</dt><dd>${esc(W.education.short)}, ${esc(W.education.year)}</dd></div>
          <div class="hm-term__fact hm-term__fact--wide" data-tone="magenta" style="--r:4"><dt>${esc(HC.links_label || 'find me')}</dt><dd>${profileChips}</dd></div>
        </dl>
        <ul class="hm-term__links" role="list">
${aboutLinks.map(([label, href], i) => `          <li><a class="link-arrow" href="{{base}}${href}" data-tone="${['cyan', 'purple', 'blue', 'magenta'][i]}">${label} ${icon('arrow-right')}</a></li>`).join('\n')}
        </ul>
      </div>
    </div>
  </div>
</section>
`;

/* ------------------------------------------------------------------ 04  OFFER (what I can build for you; tone and icon come from content.services[]) */
const offerRows = C.services.map((s, i) => {
  const href = `{{base}}services/${SERVICE_SLUG[s.slug] || s.slug}/`;
  return `      <li class="hm-svc__item" data-reveal style="--i:${i % 3}">
        <article class="card hm-svc" data-tone="${s.tone}">
          <div class="icon-tile">${icon(s.icon)}</div>
          <div class="hm-svc__text">
            <h3 class="hm-svc__title"><a class="card__link" href="${href}">${esc(s.nav_label.replace(' & ', ' & '))}<span class="sr-only"> freelance service</span></a></h3>
            <p class="hm-svc__blurb">${esc(curly(s.blurb))}</p>
          </div>
        </article>
      </li>`;
}).join('\n');
const offer = `<section id="offer" class="section section--alt hm-offer hm-cv" data-num="04" data-rail="04·build" aria-labelledby="offer-title">
  <div class="container">
    <header class="section__head">
      <p class="eyebrow">Services</p>
      <h2 id="offer-title" class="section__title" data-reveal="scan">${ttl(H2.offer, 'What I <span class="hl hl--purple">build</span> for clients', 'hl--purple')}</h2>
    </header>
    <ul class="hm-svcs" role="list">
${offerRows}
    </ul>
    <p class="hm-more" data-reveal><a class="link-arrow" href="{{base}}services/">See all services ${icon('arrow-right')}</a></p>
  </div>
</section>
`;

/* ------------------------------------------------------------------ 05  SELECTED WORK (the collage, no year) */
/* the generative visual per project: type = content visual_hint, variant = content visual_variant (else the project id). visuals.js draws a variant
   only when it truly belongs to that project, and falls back to the neutral generic visual otherwise, so no tile shows another project's content. */
const selected = `<section id="selected" class="section hm-cv" data-num="05" data-rail="05·work" aria-labelledby="selected-title">
  <div class="container">
    <header class="section__head">
      <p class="eyebrow">Work</p>
      <h2 id="selected-title" class="section__title" data-reveal="scan">${ttl(H2.work, 'Selected <span class="hl">work</span>')}</h2>
    </header>
    ${projectCollage({ b: '{{base}}', all: { href: '{{base}}projects/', label: 'All projects' } })}
  </div>
</section>
`;

/* ------------------------------------------------------------------ 06  ROLES (the work roles: period, title, company) */
const work = C.experience.filter(e => e.group === 'work');
need(work.length >= 1, 'experience: no work roles');
const roleItems = work.map((e, i) => {
  const now = /present/i.test(e.period);
  return `      <li class="hm-role${now ? ' hm-role--now' : ''}" data-tone="${['cyan', 'magenta', 'purple', 'blue'][i % 4]}" data-reveal style="--i:${i}">
        <p class="hm-role__period">${esc(e.period)}</p>
        <h3 class="hm-role__title">${esc(e.role)}</h3>
        <p class="hm-role__org">${esc(e.org)}</p>${e.location ? `
        <p class="hm-role__loc">${esc(e.location)}</p>` : ''}
      </li>`;
}).join('\n');
const roles = `<section id="roles" class="section hm-cv" data-num="06" data-rail="06·roles" aria-labelledby="roles-title">
  <div class="container">
    <header class="section__head">
      <p class="eyebrow">Experience</p>
      <h2 id="roles-title" class="section__title" data-reveal="scan">${ttl(H2.roles, 'Where I have <span class="hl hl--blue">worked</span>', 'hl--blue')}</h2>
    </header>
    <ol class="hm-roles">
${roleItems}
    </ol>
    <p class="hm-more hm-more--left" data-reveal><a class="link-arrow" href="{{base}}about/#experience">Full experience ${icon('arrow-right')}</a></p>
  </div>
</section>
`;

/* ------------------------------------------------------------------ 07  PROCESS (4 short steps; wording follows the service process step names) */
const STEPS = [
  { t: 'Scope', d: 'We agree the problem and how success will be measured.' },
  { t: 'Prototype', d: 'A small working version on your data, so you see progress early.' },
  { t: 'Harden', d: 'Tests and safety checks, so it keeps working outside the demo.' },
  { t: 'Hand over', d: 'Notes and a walkthrough your team can follow to run and extend it.' },
];
const stepItems = STEPS.map((s, i) => `      <li class="hm-step" data-tone="${['cyan', 'purple', 'magenta', 'blue'][i]}" data-reveal style="--i:${i}">
        <span class="hm-step__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
        <h3 class="hm-step__t">${esc(s.t)}</h3>
        <p class="hm-step__d">${esc(s.d)}</p>
      </li>`).join('\n');
const process_ = `<section id="process" class="section hm-process hm-cv" data-num="07" data-rail="07·process" aria-labelledby="process-title">
  <div class="container">
    <header class="section__head">
      <p class="eyebrow">Process</p>
      <h2 id="process-title" class="section__title" data-reveal="scan">${ttl(H2.process, 'How a project <span class="hl hl--purple">runs</span>', 'hl--purple')}</h2>
    </header>
    <ol class="hm-steps">
${stepItems}
    </ol>
  </div>
</section>
`;

/* ------------------------------------------------------------------ 08  FAQ (the faq_all groups with page "home"; every question belongs to exactly one page, see content/keywords.json; every answer open) */
const faqs = faqFor('home').map(f => ({ id: f.id, q: curly(f.q), a: curly(f.a) }));
need(faqs.length >= 1, 'faq: the home page needs at least one question (content.faq_all, group page "home")');
const qaItems = faqs.map((f, i) => `      <details class="hm-qa" open data-reveal style="--i:${i}">
        <summary class="hm-qa__q">
          <span class="hm-qa__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <h3 class="hm-qa__t">${esc(f.q)}</h3>
          ${icon('chevron-down', 'hm-qa__chev')}
        </summary>
        <div class="hm-qa__a"><p>${esc(f.a)}</p></div>
      </details>`).join('\n');
const faq = `<section id="faq" class="section hm-faq hm-cv" data-num="08" data-rail="08·faq" aria-labelledby="faq-title">
  <div class="container">
    <header class="section__head">
      <p class="eyebrow">FAQ</p>
      <h2 id="faq-title" class="section__title" data-reveal="scan">${ttl(H2.faq, 'Before we <span class="hl">start</span>')}</h2>
    </header>
    <div class="hm-faq__list">
${qaItems}
    </div>
    <p class="hm-more hm-more--left" data-reveal><a class="link-arrow" href="{{base}}faq/">All FAQs ${icon('arrow-right')}</a></p>
  </div>
</section>
`;

/* ------------------------------------------------------------------ 09  HIRE (the closing call to action: the full form lives on /contact/) */
const contact = `<section id="contact" class="section contact hm-cv" data-num="09" data-rail="09·contact" aria-labelledby="contact-title">
  <div class="container">
    <div class="contact__band" data-reveal="scale">
      <span class="contact__line" aria-hidden="true"></span>
      <div class="bg-grid bg-grid--quiet bg-grid--fade" aria-hidden="true"></div>
      <div class="bg-circuit" aria-hidden="true"></div>
      <div class="contact__band-in hm-band">
        <header class="contact__head">
          <p class="eyebrow">Hire me</p>
          <h2 id="contact-title" class="contact__title">Have an AI or backend project <span class="hl">in mind?</span></h2>
          <p class="contact__lead">${esc(C.cta.text)}</p>
          <div class="contact__actions">
            <a class="btn btn--solid btn--lg btn--glow" href="{{base}}contact/#hire" data-magnetic>${esc(C.cta.primary.label)} ${icon('arrow-right', 'icon--still')}</a>
            <a class="btn btn--ghost btn--lg" href="{{base}}contact/#book" data-magnetic>Book a call ${icon('calendar', 'icon--still')}</a>
          </div>
          <p class="hm-band__line"><span class="hero__free-dot" aria-hidden="true"></span>${esc(C.cta.line)}</p>
          <p class="hm-band__mail">Or write to <a class="link" href="mailto:${esc(P.email)}">${esc(P.email)}</a></p>
        </header>
      </div>
    </div>
  </div>
</section>
`;

/* ------------------------------------------------------------------ write partials + guard rails (banned words: tools/rules.mjs) */
const files = { 'home-stack.html': stack, 'home-about.html': about, 'home-offer.html': offer, 'home-work.html': selected, 'home-roles.html': roles, 'home-process.html': process_, 'home-faq.html': faq, 'home-contact.html': contact };
for (const [f, html] of Object.entries(files)) {
  const visible = html.replace(/\{\{base\}\}/g, '');
  const bad = findBanned(visible, { learning: true, home: true });
  if (bad) { console.error(`FORBIDDEN in ${f}:`, bad); process.exit(1); }
  if ((f === 'home-work.html' || f === 'home-offer.html') && YEAR_RE.test(visible)) { console.error('YEAR in', f, YEAR_RE.exec(visible)[0]); process.exit(1); }   // no project years (role periods and the degree date are not project years)
  need(!LANGUAGE_RE.test(visible), 'the spoken languages belong on /about/ only, not in ' + f);
  fs.writeFileSync(path.join(OUT, f), html);
}

const content = ['hero', ...Object.keys(files).map(f => f.replace('.html', ''))].map(n => `<!-- @section:${n} -->`).join('\n') + '\n';
fs.writeFileSync(path.join(OUT, 'home.content.html'), content);

/* ------------------------------------------------------------------ home.page.json: meta + full JSON-LD graph */
const pg = C.pages.home;
need(pg.title.length <= 60, 'home title > 60: ' + pg.title.length);
need(pg.description.length <= 155, 'home description > 155: ' + pg.description.length);
const person = personNode(cfg);
person.makesOffer = C.services.map(s => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', '@id': abs(cfg, `services/${SERVICE_SLUG[s.slug] || s.slug}/#service`), name: s.nav_label } }));
person.hasOccupation = { '@type': 'Occupation', name: 'AI Engineer' };
const site = websiteNode(cfg);
const jsonld = {
  '@context': 'https://schema.org',
  '@graph': [
    site,
    { '@type': 'ProfilePage', '@id': abs(cfg, '#profilepage'), url: cfg.url, name: pg.title, description: pg.description, isPartOf: { '@id': abs(cfg, '#website') }, mainEntity: { '@id': abs(cfg, '#person') } },
    person,
    { '@type': 'FAQPage', '@id': abs(cfg, '#faq'), mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ],
};
const pageJson = { title: pg.title, description: pg.description, jsonld };
const ldBad = findBanned(JSON.stringify(jsonld), { languages: true }) || (LD_NEVER_RE.exec(JSON.stringify(jsonld)) || [])[0];
need(!ldBad, 'forbidden token in home JSON-LD: ' + ldBad);
fs.writeFileSync(path.join(OUT, 'home.page.json'), JSON.stringify(pageJson, null, 2) + '\n');
console.log(Object.entries(files).map(([f, h]) => `${f} ${h.length}B`).join(' | '), `| title ${pg.title.length} / description ${pg.description.length} chars`);
