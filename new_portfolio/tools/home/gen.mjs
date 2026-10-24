// Home page generator: writes the home partials (everything except hero.html, which tools/hero/gen.mjs writes) from
// content/content.json plus the project selection (projects.config.json), and home.content.html + home.page.json.
// Run by build.mjs, or alone:  node tools/home/gen.mjs
// Sections (one idea each, <= 4-6 items, "View all" links to dedicated pages):
//   01 hero (hero.html)  02 offer  03 selected  04 bio (whoami card: the ONLY place languages appear)  05 roles
//   06 process  07 faq (top 5)  08 contact (hire CTA + channels + form)
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, abs, personNode, websiteNode } from '../../build.mjs';
import { GENERATED, readContent, escText as esc, icon } from '../lib.mjs';
import { findBanned, LANGUAGE_RE, LD_NEVER_RE, YEAR_RE } from '../rules.mjs';
import { loadSelection } from '../selection.mjs';
import { SERVICE_SLUG, faqFor } from '../pages/data.mjs';   // content slug -> published page slug (the service pages are written under the published slug)
import { contactForm, contactList, title as ttl } from '../pages/ui.mjs';   // the same form and channel list as /contact/

const C = readContent();
const OUT = GENERATED;
fs.mkdirSync(OUT, { recursive: true });
const cfg = loadConfig();
const selection = loadSelection(C);

const H2 = C.pages.home.h2 || {};   // section titles written for search (content.pages.home.h2); the last word is highlighted
const curly = s => String(s).replace(/(\w)'(\w)/g, '$1\u2019$2');         // apostrophes only; visible text and JSON-LD use the same string
const P = C.profile;
const byId = Object.fromEntries(C.projects.map(p => [p.id, p]));
const need = (cond, msg) => { if (!cond) { console.error('GEN ERROR:', msg); process.exit(1); } };

/* ------------------------------------------------------------------ 02  OFFER (what I can build for you; tone and icon come from content.services[]) */
need(C.services.length === 6, 'the offer text and the services page say "six" services; update them before adding or removing one');
const offerCards = C.services.map((s, i) => {
  const href = `{{base}}services/${SERVICE_SLUG[s.slug] || s.slug}/`;
  return `      <article class="card hm-card hm-card--svc${i >= 4 ? ' hm-xs-hide' : ''}" data-tone="${s.tone}" data-tilt data-reveal style="--i:${i % 3}">
        <div class="card__head">
          <div class="icon-tile">${icon(s.icon)}</div>
          <h3 class="card__title"><a class="card__link" href="${href}">${esc(s.nav_label.replace(' & ', '\u00a0& '))}<span class="sr-only"> freelance service</span></a></h3>
        </div>
        <p class="card__text">${esc(curly(s.blurb))}</p>
        <div class="card__foot"><span class="link-arrow" aria-hidden="true">Learn more ${icon('arrow-right')}</span></div>
      </article>`;
}).join('\n');
const offer = `<section id="offer" class="section section--alt hm-offer hm-cv" data-num="02" data-rail="02·build" aria-labelledby="offer-title">
  <div class="container">
    <header class="section__head">
      <p class="eyebrow">Services</p>
      <h2 id="offer-title" class="section__title" data-reveal="scan">${ttl(H2.offer, 'What I can <span class="hl hl--purple">build</span> for you', 'hl--purple')}</h2>
      <p class="section__lead">${esc(curly(C.pages.services.lead))}</p>
    </header>
    <div class="grid grid--c3 hm-grid">
${offerCards}
    </div>
    <p class="hm-more" data-reveal><a class="link-arrow" href="{{base}}services/">See all ${C.services.length} services ${icon('arrow-right')}</a></p>
  </div>
</section>
`;

/* ------------------------------------------------------------------ 03  SELECTED WORK (6 case-study cards, NO year) */
const FEATURED = selection.homeFeatured;   // up to 6 case studies in projects.config.json order (rule: see tools/selection.mjs)
/* the generative visual per project: type = content visual_hint, variant = content visual_variant (else the project id). visuals.js draws a variant
   only when it truly belongs to that project, and falls back to the neutral generic visual otherwise, so no card shows another project's content. */
const workCards = FEATURED.map((id, i) => {
  const p = byId[id]; need(p, 'project missing ' + id);
  const vis = p.visual_hint, variant = p.visual_variant || p.id;
  const stack = p.stack.slice(0, 3).map(t => `<li class="tag">${esc(t)}</li>`).join('');
  const by = (p.collaborators || []).filter(c => /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(c));   // plain-text credit only, never a link
  return `      <li class="hm-work__item${i >= 3 ? ' hm-xs-hide' : ''}" data-reveal style="--i:${i}">
        <article class="card hm-card hm-card--work" data-tone="${p.tone}" data-tilt data-cursor="case">
          <div class="hm-card__media"><div class="pv" data-visual="${esc(vis)}" data-variant="${esc(variant)}" data-tone="${p.tone}" aria-hidden="true"></div></div>
          <div class="hm-card__body">
            <p class="hm-card__cat">${esc(p.category)}</p>
            <h3 class="card__title"><a class="card__link" href="{{base}}projects/${p.slug}/">${esc(p.title)}<span class="sr-only"> case study</span></a></h3>
            <p class="card__text">${esc(curly(p.card_blurb))}</p>
            <ul class="tags hm-card__tags" role="list" aria-label="Main tools">${stack}</ul>
            ${by.length ? `<p class="hm-card__by">Co-built with ${esc(by.join(' and '))}</p>` : ''}
            <div class="card__foot"><span class="link-arrow" aria-hidden="true">Case study ${icon('arrow-right')}</span></div>
          </div>
        </article>
      </li>`;
}).join('\n');
const selected = `<section id="selected" class="section hm-work hm-cv" data-num="03" data-rail="03·work" aria-labelledby="selected-title">
  <div class="container">
    <header class="section__head">
      <p class="eyebrow">Work</p>
      <h2 id="selected-title" class="section__title" data-reveal="scan">${ttl(H2.work, 'Selected <span class="hl">work</span>')}</h2>
      <p class="section__lead">Real projects from my job and my own time. Each one explains the problem, what I built and what the results do and do not show.</p>
    </header>
    <ul class="hm-work__grid" role="list">
${workCards}
    </ul>
    <p class="hm-more" data-reveal><a class="link-arrow" href="{{base}}projects/">All projects ${icon('arrow-right')}</a></p>
  </div>
</section>
`;

/* ------------------------------------------------------------------ 04  ABOUT IN BRIEF (+ whoami card: the ONLY place the languages appear) */
const W = C.about.whoami;
need(Array.isArray(W.languages) && W.languages.length === 5, 'whoami.languages');
const blurb = curly(C.about.home_blurb);
const focusTags = `<ul class="tags hm-term__tags" role="list">${W.focus.map((t, i) => `<li><span class="tag" data-tone="${['cyan', 'blue', 'magenta', 'purple', 'blue'][i % 5]}">${esc(t)}</span></li>`).join('')}</ul>`;
const langTags = `<ul class="tags hm-term__tags" role="list">${W.languages.map(t => `<li><span class="tag tag--dim">${esc(t)}</span></li>`).join('')}</ul>`;
const bio = `<section id="bio" class="section hm-about hm-cv" data-num="04" data-rail="04·about" aria-labelledby="bio-title">
  <div class="container">
    <header class="section__head">
      <p class="eyebrow">About</p>
      <h2 id="bio-title" class="section__title" data-reveal="scan">Hi, I&rsquo;m <span class="hl hl--magenta">Shaunak</span></h2>
    </header>
    <div class="split hm-about__split">
      <div class="hm-about__copy">
        <p class="hm-about__lead" data-reveal>${esc(blurb)}</p>
        <ul class="hm-about__links" role="list" data-reveal>
          <li><a class="link-arrow" href="{{base}}about/">More about my background ${icon('arrow-right')}</a></li>
          <li><a class="link-arrow" href="{{base}}resume/" data-tone="purple">Read the resume ${icon('arrow-right')}</a></li>
        </ul>
      </div>
      <div class="hm-term" role="group" aria-label="Quick facts about Shaunak" data-reveal>
        <div class="hm-term__bar" aria-hidden="true">
          <span class="hm-term__dots"><i></i><i></i><i></i></span>
          <span class="hm-term__title">${esc(W.prompt)}</span>
          <span class="hm-term__tag">${esc(W.script)}</span>
        </div>
        <div class="hm-term__body">
          <p class="hm-term__prompt" aria-hidden="true"><span class="hm-term__ps">$</span> <span class="hm-term__cmd" style="--n:${W.command.length}">${esc(W.command)}</span><span class="hm-term__caret"></span></p>
          <dl class="hm-term__facts">
            <div class="hm-term__fact" data-tone="blue" style="--r:1"><dt>education</dt><dd>${esc(W.education.degree)}<span class="hm-term__sub">${esc(W.education.institution)}</span></dd></div>
            <div class="hm-term__fact" data-tone="magenta" style="--r:2"><dt>focus</dt><dd>${focusTags}</dd></div>
            <div class="hm-term__fact" data-tone="purple" style="--r:3"><dt>languages</dt><dd>${langTags}</dd></div>
            <div class="hm-term__fact" data-tone="cyan" style="--r:4"><dt>now</dt><dd>${esc(W.now)}</dd></div>
          </dl>
          <p class="hm-term__prompt hm-term__prompt--end" aria-hidden="true"><span class="hm-term__ps">$</span> <span class="hm-term__caret hm-term__caret--idle"></span></p>
        </div>
      </div>
    </div>
  </div>
</section>
`;

/* ------------------------------------------------------------------ 05  EXPERIENCE IN BRIEF (3 industry roles, one line each) */
const ONE = {
  'Claptek Pvt Ltd': 'AI tools for audit and compliance software: drafting, document reading and bank-database questions answered on the bank\'s own servers.',
  'Osource Global Pvt. Ltd.': 'Backend APIs in FastAPI and PostgreSQL, and document tools that use AI models on company machines.',
  'Shivohini Tech-AI LLP': 'AI chatbots for clients, built on Supabase and PostgreSQL.',
};
const work = C.experience.filter(e => e.group === 'work');
need(work.length === 3, '3 work roles expected, got ' + work.length);
const roleItems = work.map((e, i) => {
  need(ONE[e.org], 'one-liner missing for ' + e.org);
  const now = /present/i.test(e.period);
  return `      <li class="hm-role${now ? ' hm-role--now' : ''}" data-tone="${['cyan', 'magenta', 'purple'][i]}" data-reveal style="--i:${i}">
        <p class="hm-role__period">${esc(e.period)}</p>
        <h3 class="hm-role__title">${esc(e.role)}</h3>
        <p class="hm-role__org">${esc(e.org)} <span class="hm-role__loc">&middot; ${esc(e.location.replace(', India', ''))}</span></p>
        <p class="hm-role__text">${esc(ONE[e.org])}</p>
      </li>`;
}).join('\n');
const roles = `<section id="roles" class="section section--alt hm-roles-sec hm-cv" data-num="05" data-rail="05·roles" aria-labelledby="roles-title">
  <div class="container">
    <header class="section__head">
      <p class="eyebrow">Experience</p>
      <h2 id="roles-title" class="section__title" data-reveal="scan">Where I&rsquo;ve <span class="hl hl--blue">worked</span></h2>
    </header>
    <ol class="hm-roles">
${roleItems}
    </ol>
    <p class="hm-more" data-reveal><a class="link-arrow" href="{{base}}about/#experience">Full experience ${icon('arrow-right')}</a></p>
  </div>
</section>
`;

/* ------------------------------------------------------------------ 06  HOW I WORK (4-step strip; wording follows faq "process" + the service process step names) */
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
const process_ = `<section id="process" class="section hm-process hm-cv" data-num="06" data-rail="06·process" aria-labelledby="process-title">
  <div class="container">
    <header class="section__head">
      <p class="eyebrow">Process</p>
      <h2 id="process-title" class="section__title" data-reveal="scan">${ttl(H2.process, 'How a project <span class="hl hl--purple">runs</span>', 'hl--purple')}</h2>
      <p class="section__lead">Four steps, with short written updates along the way. No code is written until we agree on the scope.</p>
    </header>
    <ol class="hm-steps">
${stepItems}
    </ol>
  </div>
</section>
`;

/* ------------------------------------------------------------------ 07  FAQ (the faq_all groups with page "home"; every question belongs to exactly one page, see content/keywords.json) */
const faq5 = faqFor('home').map(f => ({ id: f.id, q: curly(f.q), a: curly(f.a) }));
need(faq5.length >= 1, 'faq: the home page needs at least one question (content.faq_all, group page "home")');
const qaItems = faq5.map((f, i) => `      <details class="hm-qa" name="home-faq"${i === 0 ? ' open' : ''} data-reveal style="--i:${i}">
        <summary class="hm-qa__q">
          <span class="hm-qa__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <h3 class="hm-qa__t">${esc(f.q)}</h3>
          ${icon('chevron-down', 'hm-qa__chev')}
        </summary>
        <div class="hm-qa__a"><p>${esc(f.a)}</p></div>
      </details>`).join('\n');
const faq = `<section id="faq" class="section hm-faq hm-cv" data-num="07" data-rail="07·faq" aria-labelledby="faq-title">
  <div class="container">
    <header class="section__head">
      <p class="eyebrow">FAQ</p>
      <h2 id="faq-title" class="section__title" data-reveal="scan">${ttl(H2.faq, 'Before we <span class="hl">start</span>')}</h2>
    </header>
    <div class="hm-faq__list">
${qaItems}
    </div>
    <p class="hm-more" data-reveal><a class="link-arrow" href="{{base}}faq/">All FAQs ${icon('arrow-right')}</a></p>
  </div>
</section>
`;

/* ------------------------------------------------------------------ 08  HIRE / CONTACT (CTA band + channels + form; ids kept for contact.js) */
const contact = `<section id="contact" class="section contact hm-contact hm-cv" data-num="08" data-rail="08·contact" aria-labelledby="contact-title">
  <div class="container">

    <div class="contact__band" id="hire" data-reveal="scale">
      <span class="contact__line" aria-hidden="true"></span>
      <div class="bg-grid bg-grid--quiet bg-grid--fade" aria-hidden="true"></div>
      <div class="bg-circuit" aria-hidden="true"></div>
      <div class="contact__band-in hm-band">
        <header class="contact__head">
          <p class="eyebrow">Hire me</p>
          <h2 id="contact-title" class="contact__title">Have an AI or backend project <span class="hl">in mind?</span></h2>
          <p class="contact__lead">${esc(C.cta.text)}</p>
          <div class="contact__actions">
            <a class="btn btn--solid btn--lg btn--glow hm-xs-hide" href="#contact-form-panel" data-magnetic>${esc(C.cta.primary.label)} ${icon('arrow-right', 'icon--still')}</a>
            <a class="btn btn--solid btn--lg btn--glow hm-xs-only" href="{{base}}contact/#hire">${esc(C.cta.primary.label)} ${icon('arrow-right', 'icon--still')}</a>
            <a class="btn btn--ghost btn--lg" href="{{base}}${esc(C.cta.secondary.href)}" data-magnetic>${esc(C.cta.secondary.label)} ${icon('arrow-right', 'icon--still')}</a>
          </div>
          <p class="hm-band__line"><span class="hero__free-dot" aria-hidden="true"></span>${esc(C.cta.line)}</p>
          <p class="hm-band__mail hm-xs-only">Or email <a class="link" href="mailto:${esc(P.email)}">${esc(P.email)}</a></p>
        </header>
      </div>
    </div>

    <div class="contact__cols hm-xs-hide">
      <div class="contact__channels">
        <div class="contact__sub" data-reveal>
          <h3 class="contact__h">Reach me directly</h3>
          <p class="contact__note">Based in Mumbai, India. I work remotely in Indian Standard Time (IST).</p>
        </div>
        ${contactList({ group: true })}
        <p class="hm-more hm-more--left" data-reveal><a class="link-arrow" href="{{base}}contact/">Contact page ${icon('arrow-right')}</a></p>
      </div>

      ${contactForm({
        title: 'Send a brief', rows: 5, placeholder: 'Tell me about your project.', subject: 'New message from the portfolio',
        note: 'A few lines about what you want to build and when you need it are enough. All three fields are required. I only use your details to reply. Messages are delivered through Formspree, a form service.',
      })}
    </div>

  </div>
</section>
`;

/* ------------------------------------------------------------------ write partials + guard rails (banned words: tools/rules.mjs) */
const files = { 'home-offer.html': offer, 'home-work.html': selected, 'home-about.html': bio, 'home-roles.html': roles, 'home-process.html': process_, 'home-faq.html': faq, 'home-contact.html': contact };
let langFiles = 0;
for (const [f, html] of Object.entries(files)) {
  const visible = html.replace(/\{\{base\}\}/g, '');
  const bad = findBanned(visible, { learning: true, home: true });
  if (bad) { console.error(`FORBIDDEN in ${f}:`, bad); process.exit(1); }
  if ((f === 'home-work.html' || f === 'home-offer.html') && YEAR_RE.test(visible)) { console.error('YEAR in', f, YEAR_RE.exec(visible)[0]); process.exit(1); }   // no project years (role periods and the degree date are not project years)
  if (LANGUAGE_RE.test(visible)) { langFiles++; need(f === 'home-about.html', 'languages outside the whoami card: ' + f); }
  fs.writeFileSync(path.join(OUT, f), html);
}
need(langFiles === 1, 'languages must appear in exactly one partial');
need((files['home-about.html'].match(/English/g) || []).length === 1, 'languages rendered once');

const content = ['hero', 'home-offer', 'home-work', 'home-about', 'home-roles', 'home-process', 'home-faq', 'home-contact'].map(n => `<!-- @section:${n} -->`).join('\n') + '\n';
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
    { '@type': 'FAQPage', '@id': abs(cfg, '#faq'), mainEntity: faq5.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ],
};
const pageJson = { title: pg.title, description: pg.description, jsonld };
const ldBad = findBanned(JSON.stringify(jsonld), { languages: true }) || (LD_NEVER_RE.exec(JSON.stringify(jsonld)) || [])[0];
need(!ldBad, 'forbidden token in home JSON-LD: ' + ldBad);
fs.writeFileSync(path.join(OUT, 'home.page.json'), JSON.stringify(pageJson, null, 2) + '\n');
console.log(Object.entries(files).map(([f, h]) => `${f} ${h.length}B`).join(' | '), `| title ${pg.title.length} / description ${pg.description.length} chars`);
