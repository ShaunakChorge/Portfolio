// Round 3 HOME generator: writes the home partials (everything except hero.html, which _hero_tools/gen.mjs writes) from
// content/content.json (single source of truth) plus home.content.html and home.page.json.
//   node tools/<name>/gen.mjs
// Sections (one idea each, <= 4-6 items, "View all" links to dedicated pages, D9):
//   01 hero (hero.html)  02 offer  03 selected  04 bio (whoami card: the ONLY place languages appear, D4)  05 roles
//   06 process  07 faq (top 5 + FAQPage JSON-LD)  08 contact (hire CTA + channels + form)
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, abs, personNode, websiteNode, breadcrumb } from '../../build.mjs';

import { CONTENT_FILE, GEN_DIR } from '../paths.mjs';
import { SERVICE_SLUG } from '../pages/data.mjs';   // content slug -> published page slug (the service pages are written under the published slug)
const C = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
const OUT = GEN_DIR;
fs.mkdirSync(OUT, { recursive: true });
const cfg = loadConfig();

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escA = s => esc(s).replace(/"/g, '&quot;');
const curly = s => String(s).replace(/(\w)'(\w)/g, '$1\u2019$2');            // apostrophes only; visible text and JSON-LD use the same string
const icon = (n, cls = '') => `<svg class="icon${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="#i-${n}"/></svg>`;
const P = C.profile;
const byId = Object.fromEntries(C.projects.map(p => [p.id, p]));
const svcById = Object.fromEntries(C.services.map(s => [s.id, s]));
const need = (cond, msg) => { if (!cond) { console.error('GEN ERROR:', msg); process.exit(1); } };

/* ------------------------------------------------------------------ 02  OFFER (what I can build for you) */
const OFFER = [
  { id: 'llm-apps-rag', tone: 'cyan', icon: 'brain-circuit' },
  { id: 'document-ai-extraction', tone: 'purple', icon: 'file-text' },
  { id: 'python-backend-apis', tone: 'blue', icon: 'server' },
  { id: 'computer-vision', tone: 'magenta', icon: 'scan-eye' },
];
need(OFFER.length <= 4, 'offer: max 4 cards');
const offerCards = OFFER.map((o, i) => {
  const s = svcById[o.id]; need(s, 'service missing ' + o.id);
  const href = `{{base}}services/${SERVICE_SLUG[s.slug] || s.slug}/`;
  return `      <article class="card hm-card hm-card--svc" data-tone="${o.tone}" data-tilt data-reveal style="--i:${i}">
        <div class="card__head">
          <div class="icon-tile">${icon(o.icon)}</div>
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
      <h2 id="offer-title" class="section__title" data-reveal="scan">What I can <span class="hl hl--purple">build</span> for you</h2>
      <p class="section__lead">${esc(curly(C.pages.services.lead))}</p>
    </header>
    <div class="grid grid--c4 hm-grid">
${offerCards}
    </div>
    <p class="hm-more" data-reveal><a class="link-arrow" href="{{base}}services/">All ${C.services.length} services ${icon('arrow-right')}</a></p>
  </div>
</section>
`;

/* ------------------------------------------------------------------ 03  SELECTED WORK (6 case-study cards, NO year, D3) */
const FEATURED = C.selection_default.home_featured;
need(FEATURED.length <= 6, 'selected: max 6');
for (const id of FEATURED) need(C.selection_default.casestudy.includes(id), 'home_featured must be a case study: ' + id);
/* the generative visual per project: type = content visual_hint, variant = content visual_variant (else the project id). visuals.js draws a variant
   only when it truly belongs to that project, and falls back to the neutral generic visual otherwise, so no card shows another project's content. */
const workCards = FEATURED.map((id, i) => {
  const p = byId[id]; need(p, 'project missing ' + id);
  const vis = p.visual_hint, variant = p.visual_variant || p.id;
  const stack = p.stack.slice(0, 3).map(t => `<li class="tag">${esc(t)}</li>`).join('');
  const by = (p.collaborators || []).filter(c => /^[A-Z][a-z]+ [A-Z][a-z]+$/.test(c));   // plain-text credit only, never a link (D1)
  return `      <li class="hm-work__item" data-reveal style="--i:${i}">
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
      <h2 id="selected-title" class="section__title" data-reveal="scan">Selected <span class="hl">work</span></h2>
      <p class="section__lead">Real projects from my job and my own time. Each one explains the problem, what I built and what the results do and do not show.</p>
    </header>
    <ul class="hm-work__grid" role="list">
${workCards}
    </ul>
    <p class="hm-more" data-reveal><a class="link-arrow" href="{{base}}projects/">All projects ${icon('arrow-right')}</a></p>
  </div>
</section>
`;

/* ------------------------------------------------------------------ 04  ABOUT IN BRIEF (+ whoami card: the ONLY place the languages appear, D4) */
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
      <h2 id="process-title" class="section__title" data-reveal="scan">How a project <span class="hl hl--purple">runs</span></h2>
      <p class="section__lead">Four steps, with short written updates along the way. No code is written until we agree on the scope.</p>
    </header>
    <ol class="hm-steps">
${stepItems}
    </ol>
  </div>
</section>
`;

/* ------------------------------------------------------------------ 07  FAQ (top 5 + FAQPage JSON-LD built from the SAME strings) */
const FAQ_IDS = ['how-to-start', 'pricing', 'existing-code', 'nda', 'location'];
const allFaq = C.faq_all.flatMap(g => g.items);
const faq5 = FAQ_IDS.map(id => { const f = allFaq.find(x => x.id === id); need(f, 'faq missing ' + id); return { id, q: curly(f.q), a: curly(f.a) }; });
need(faq5.length === 5, 'faq: 5');
const qaItems = faq5.map((f, i) => `      <details class="hm-qa" name="home-faq"${i === 0 ? ' open' : ''} data-reveal style="--i:${i}">
        <summary class="hm-qa__q">
          <span class="hm-qa__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <span class="hm-qa__t">${esc(f.q)}</span>
          ${icon('chevron-down', 'hm-qa__chev')}
        </summary>
        <div class="hm-qa__a"><p>${esc(f.a)}</p></div>
      </details>`).join('\n');
const faqLd = { '@type': 'FAQPage', '@id': abs(cfg, '#faq'), mainEntity: faq5.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
const faq = `<section id="faq" class="section hm-faq hm-cv" data-num="07" data-rail="07·faq" aria-labelledby="faq-title">
  <div class="container container--narrow">
    <header class="section__head">
      <p class="eyebrow">FAQ</p>
      <h2 id="faq-title" class="section__title" data-reveal="scan">Before we <span class="hl">start</span></h2>
    </header>
    <div class="hm-faq__list">
${qaItems}
    </div>
    <p class="hm-more" data-reveal><a class="link-arrow" href="{{base}}faq/">All FAQs ${icon('arrow-right')}</a></p>
  </div>
</section>
`;

/* ------------------------------------------------------------------ 08  HIRE / CONTACT (CTA band + channels + form; ids kept for contact.js) */
const L = P.links;
const row = (tone, ic, label, valueHtml, go = true) => `          <li class="contact__row" data-tone="${tone}">
            <span class="icon-tile contact__icon" aria-hidden="true">${icon(ic)}</span>
            <div class="contact__meta">
              <span class="contact__label">${label}</span>
              ${valueHtml}
            </div>
            ${go ? icon('arrow-up-right', 'contact__go') : ''}
          </li>`;
const ext = '<span class="sr-only"> (opens in a new tab)</span>';
const contact = `<section id="contact" class="section contact hm-contact" data-num="08" data-rail="08·contact" aria-labelledby="contact-title">
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
            <a class="btn btn--solid btn--lg btn--glow" href="#contact-form-panel" data-magnetic>${esc(C.cta.primary.label)} ${icon('arrow-right', 'icon--still')}</a>
            <a class="btn btn--ghost btn--lg" href="{{base}}${esc(C.cta.secondary.href)}" data-magnetic>${esc(C.cta.secondary.label)} ${icon('arrow-right', 'icon--still')}</a>
          </div>
          <p class="hm-band__line"><span class="hero__free-dot" aria-hidden="true"></span>${esc(C.cta.line)}</p>
        </header>
      </div>
    </div>

    <div class="contact__cols">
      <div class="contact__channels">
        <div class="contact__sub" data-reveal>
          <h3 class="contact__h">Reach me directly</h3>
          <p class="contact__note">Based in Mumbai, India. I work remotely in Indian Standard Time (IST).</p>
        </div>
        <ul class="contact__list" data-reveal-group>
          <li class="contact__row contact__row--copy" data-tone="cyan">
            <span class="icon-tile contact__icon" aria-hidden="true">${icon('mail')}</span>
            <div class="contact__meta">
              <span class="contact__label">Email</span>
              <a class="contact__value" id="contact-email" href="mailto:${esc(P.email)}">${esc(P.email)}</a>
            </div>
            <button class="contact__copy" type="button" data-copy="${escA(P.email)}" aria-label="Copy email address">${icon('copy', 'icon--sm')}<span class="contact__copy-text">Copy</span></button>
          </li>
${row('green', 'phone', 'Phone', `<a class="contact__value" href="${escA(P.phone_tel)}">${esc(P.phone)}</a>`)}
${row('blue', 'linkedin', 'LinkedIn', `<a class="contact__value" href="${escA(L.linkedin)}" target="_blank" rel="noopener noreferrer">${esc(L.linkedin.replace(/^https?:\/\/(www\.)?/, ''))}${ext}</a>`)}
${row('purple', 'github', 'GitHub', `<a class="contact__value" href="${escA(L.github)}" target="_blank" rel="noopener noreferrer">${esc(L.github.replace(/^https?:\/\//, ''))}${ext}</a>`)}
        </ul>
        <p class="hm-more hm-more--left" data-reveal><a class="link-arrow" href="{{base}}contact/">Contact page ${icon('arrow-right')}</a></p>
      </div>

      <div class="contact__formwrap panel" id="contact-form-panel" data-tone="cyan" data-reveal>
        <div class="contact__compose" data-compose>
          <div class="contact__sub">
            <h3 class="contact__h" id="cf-title">Send a brief</h3>
            <p class="contact__note">A few lines about what you want to build and when you need it are enough. All three fields are required. I only use your details to reply. Messages are delivered through Formspree, a form service.</p>
          </div>
          <form class="contact__form" id="contact-form" action="${escA(L.formspree)}" method="POST" data-email="${escA(P.email)}" aria-labelledby="cf-title">
            <input type="hidden" name="_subject" value="New message from the portfolio">

            <div class="contact__pair">
              <div class="field" data-field="name">
                <label for="cf-name">Name</label>
                <input class="input" id="cf-name" name="name" type="text" autocomplete="name" autocapitalize="words" enterkeyhint="next" maxlength="80" required placeholder="Your name" aria-describedby="cf-name-err">
                <span class="field__error" id="cf-name-err" aria-live="polite"><span class="field__error-in">${icon('circle-alert', 'icon--sm')}<span class="field__msg"></span></span></span>
              </div>
              <div class="field" data-field="email">
                <label for="cf-email">Email</label>
                <input class="input" id="cf-email" name="email" type="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" enterkeyhint="next" maxlength="120" required placeholder="you@example.com" aria-describedby="cf-email-err">
                <span class="field__error" id="cf-email-err" aria-live="polite"><span class="field__error-in">${icon('circle-alert', 'icon--sm')}<span class="field__msg"></span></span></span>
              </div>
            </div>

            <div class="field" data-field="message">
              <div class="contact__labelrow">
                <label class="label" for="cf-message">Message</label>
                <span class="contact__count" id="cf-count" aria-hidden="true">0 / 2000</span>
              </div>
              <textarea class="input" id="cf-message" name="message" rows="5" maxlength="2000" required placeholder="Tell me about your project." aria-describedby="cf-message-err"></textarea>
              <span class="field__error" id="cf-message-err" aria-live="polite"><span class="field__error-in">${icon('circle-alert', 'icon--sm')}<span class="field__msg"></span></span></span>
            </div>

            <div class="hp" aria-hidden="true" inert><label for="cf-website">Leave this field empty</label><input id="cf-website" type="text" name="_gotcha" tabindex="-1" autocomplete="off"></div>

            <div class="contact__fail" id="cf-fail" role="alert" hidden>
              ${icon('triangle-alert', 'icon--lg contact__fail-icon')}
              <div class="contact__fail-body">
                <p class="contact__fail-title" id="cf-fail-title">Message not sent</p>
                <p class="contact__fail-text" id="cf-fail-text">Something went wrong on the way. Your text is still in the form, so you can try again, or email me directly.</p>
                <a class="btn btn--sm btn--magenta" id="cf-fail-mail" href="mailto:${esc(P.email)}">Email me instead ${icon('mail', 'icon--still')}</a>
              </div>
            </div>

            <div class="contact__submit">
              <button class="btn btn--solid btn--lg" id="cf-submit" type="submit"><span class="contact__submit-label">Send message</span>${icon('send', 'icon--still')}</button>
              <p class="form-status contact__status" id="cf-status" role="status" aria-live="polite"></p>
            </div>
          </form>
        </div>

        <div class="contact__done" id="cf-done" role="status" tabindex="-1" hidden>
          <span class="contact__done-icon" aria-hidden="true">${icon('check', 'icon--xl')}</span>
          <h3 class="contact__h">Message sent</h3>
          <p class="contact__note">Thanks<span id="cf-done-name"></span>. I will reply to <strong id="cf-done-email">your address</strong> as soon as I can.</p>
          <button class="btn btn--ghost" id="cf-again" type="button">Send another message</button>
        </div>
      </div>
    </div>

  </div>
</section>
`;

/* ------------------------------------------------------------------ write partials + guard rails (D1 D2 D3 D4 D5 D6 D7 D8 D10) */
const files = { 'home-offer.html': offer, 'home-work.html': selected, 'home-about.html': bio, 'home-roles.html': roles, 'home-process.html': process_, 'home-faq.html': faq, 'home-contact.html': contact };
const BAD = /Pune|LangGraph|exploring|(?<!machine )learning|prasannapatil|prasanna4149|\bpatil\.in|systems shipped|industry-level|No frameworks|vanilla JS|LlamaIndex/i;
const YEAR = /\b(19|20)\d\d\b/;   // D3: no project years (role periods and the degree date are not project years)
const LANG = /English|Hindi|Marathi|German|French/;
let langFiles = 0;
for (const [f, html] of Object.entries(files)) {
  const visible = html.replace(/\{\{base\}\}/g, '');
  const m = BAD.exec(visible.replace(/\+91 9920644655/g, ''));
  if (m) { console.error(`FORBIDDEN in ${f}:`, m[0], '...', visible.slice(Math.max(0, m.index - 40), m.index + 40)); process.exit(1); }
  if ((f === 'home-work.html' || f === 'home-offer.html') && YEAR.test(visible)) { console.error('YEAR in', f, YEAR.exec(visible)[0]); process.exit(1); }
  if (LANG.test(visible)) { langFiles++; need(f === 'home-about.html', 'languages outside the whoami card: ' + f); }
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
const site = websiteNode(cfg); delete site.inLanguage;            // spec: no inLanguage anywhere (D4)
const jsonld = {
  '@context': 'https://schema.org',
  '@graph': [
    site,
    { '@type': 'ProfilePage', '@id': abs(cfg, '#profilepage'), url: cfg.url, name: pg.title, description: pg.description, isPartOf: { '@id': abs(cfg, '#website') }, mainEntity: { '@id': abs(cfg, '#person') }, breadcrumb: { '@id': abs(cfg, '#breadcrumb') } },
    person,
    { '@id': abs(cfg, '#breadcrumb'), ...breadcrumb(cfg, [{ name: 'Home', path: '' }]) },
    faqLd,
  ],
};
const pageJson = { title: pg.title, description: pg.description, jsonld };
const LDBAD = /Pune|LangGraph|English|Hindi|Marathi|German|French|knowsLanguage|inLanguage|telephone/;
need(!LDBAD.test(JSON.stringify(jsonld)), 'forbidden token in home JSON-LD: ' + (LDBAD.exec(JSON.stringify(jsonld)) || [])[0]);
fs.writeFileSync(path.join(OUT, 'home.page.json'), JSON.stringify(pageJson, null, 2) + '\n');
console.log(Object.entries(files).map(([f, h]) => `${f} ${h.length}B`).join(' | '), `| title ${pg.title.length} / description ${pg.description.length} chars`);
