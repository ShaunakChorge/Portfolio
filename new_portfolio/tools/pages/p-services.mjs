// p-services.mjs - /services/ (hub) and /services/<slug>/ x6
import {
  cfg, abs, services, serviceByKey, projectModel, projectHref, pagesMeta, content, FREELANCE_LINE, EMAIL, words, CTA_TEXT,
} from './data.mjs';
import {
  esc, ico, tags, rv, btn, pageHead, section, hireBand, qaList, hireHref,
  ctx, crumbNode, webPage, faqNode, personMini, PERSON_ID, WEBSITE_ID,
} from './ui.mjs';

const TITLE_OVERRIDE = {};
const SIBLINGS = {
  'llm-apps-rag': ['document-ai-extraction', 'python-backend-apis'],
  'document-ai-extraction': ['llm-apps-rag', 'python-backend-apis'],
  'python-backend-apis': ['llm-apps-rag', 'automation-integrations'],
  'computer-vision': ['speech-nlp-ml', 'python-backend-apis'],
  'speech-nlp-ml': ['computer-vision', 'python-backend-apis'],
  'automation-integrations': ['python-backend-apis', 'llm-apps-rag'],
};

/* the 4-step engagement, taken from faq_all[process] + faq[how-to-start] */
const PROCESS = [
  { step: 'Scope', detail: 'We agree the problem and how success will be measured, using a sample of your data.' },
  { step: 'Prototype', detail: 'A small working version on your data, so you see real software early.' },
  { step: 'Harden', detail: 'Tests and safety checks, plus short written updates along the way.' },
  { step: 'Hand over', detail: 'Notes, setup instructions and a walkthrough so your team can run it.' },
];
/* honest limits - every line is a fact from content (faq / contact note / CV faq) */
const LIMITS = [
  'I keep the number of projects small, so each one gets proper attention alongside my full-time job.',
  'I will not promise an accuracy number before I have seen your data.',
  'I write no code before we agree on the scope, and I will say plainly if a project is not a good fit.',
];

const stepsHtml = (steps, extra = '') => `<ol class="pg-steps${extra}" data-reveal-group>${steps.map((s, i) =>
  `<li class="pg-step" style="--i:${i}"><span class="pg-step__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h3 class="pg-step__t">${esc(s.step)}</h3><p>${esc(s.detail)}</p></li>`).join('')}</ol>`;

export function serviceCard(s, b, i = 0) {
  return `<article class="card pg-svc" data-tone="${s.tone}" data-tilt data-reveal style="--i:${i % 3}" aria-labelledby="svc-${s.slug}">
        <div class="card__head"><div class="icon-tile">${ico(s.icon)}</div><h3 class="card__title" id="svc-${s.slug}">${esc(s.name)}</h3></div>
        <p class="card__text">${esc(s.blurb)}</p>
        <div class="card__foot"><a class="link-arrow card__link" href="${b}${s.path}">See this service<span class="sr-only">: ${esc(s.name)}</span> ${ico('arrow-right')}</a></div>
      </article>`;
}

/* ============================== hub ============================== */
function hub() {
  const m = pagesMeta.services;
  const b = '../';
  const url = abs(cfg, m.path);
  const crumbItems = [{ name: 'Home', path: '' }, { name: 'Services', path: m.path }];
  const head = pageHead({
    crumbItems, b, eyebrow: 'Freelance services', h1: esc(m.h1), lead: m.lead, answer: m.direct_answer,
    actions: btn('Hire me', hireHref(b), { v: 'solid', size: 'lg' }) + btn('View work', b + 'projects/', { v: 'ghost', size: 'lg', icon: 'arrow-right' }),
  });
  const cards = section({
    id: 'all-services', eyebrow: 'Six services', title: 'What I can build <span class="hl">for you</span>',
    lead: 'Each service has its own page. It lists what you get, how the work runs, the tools and the real projects behind it.',
    body: `<div class="grid grid--c3 pg-cards">${services.map((s, i) => serviceCard(s, b, i)).join('')}</div>`,
  });
  const process = section({
    id: 'process', eyebrow: 'How it runs', title: 'How an engagement <span class="hl hl--purple">runs</span>',
    lead: 'Four steps, in this order. You see working software early, and I share progress in short written updates.',
    body: stepsHtml(PROCESS),
  });
  const limits = section({
    id: 'limits', eyebrow: 'Straight talk', title: 'Honest <span class="hl hl--magenta">limits</span>', tint: true,
    body: `<div class="panel pg-limits" data-tone="magenta" data-reveal><ul class="dot-list">${LIMITS.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <p class="pg-linkrow" data-reveal><a class="link-arrow" href="${b}projects/">See the projects behind these services ${ico('arrow-right')}</a><a class="link-arrow" href="${b}faq/">Read the freelance FAQ ${ico('arrow-right')}</a></p>`,
  });
  const jsonld = ctx([
    webPage(url, m.title, m.description, { '@type': 'CollectionPage', mainEntity: { '@id': url + '#services' }, about: { '@id': PERSON_ID } }),
    { '@type': 'ItemList', '@id': url + '#services', name: 'Freelance AI and backend services', itemListElement: services.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.name, url: abs(cfg, s.path) })) },
    crumbNode(url, crumbItems),
    personMini(),
  ]);
  return {
    path: m.path, current: 'services', title: m.title, description: m.description, jsonld,
    content: head + cards + process + limits + hireBand({ b, heading: 'Have a project in <span class="hl">mind?</span>', text: CTA_TEXT }),
    llms: { heading: m.h1, url, desc: m.description, text: [m.direct_answer, ...services.map(s => `${s.name}: ${s.blurb}`)] },
  };
}

/* ============================== one service ============================== */
function proofCard(p, b, i) {
  const m = (p.metrics || [])[0];
  const href = projectHref(p, b);
  const label = p.hasCase ? 'Read case study' : 'See project';
  return `<article class="card pg-proof" data-tone="${esc(p.tone)}" data-tilt data-reveal style="--i:${i}" aria-labelledby="pf-${esc(p.id)}">
        <p class="pg-proj__meta">${esc(p.category)}</p>
        <h3 class="pg-proj__title" id="pf-${esc(p.id)}">${esc(p.title)}</h3>
        <p class="pg-proj__blurb">${esc(p.card_blurb)}</p>
        ${m ? `<p class="pg-proj__stat"><span class="pg-proj__num">${esc(m.value)}</span><span class="pg-proj__statlabel">${esc(m.label)}</span></p>` : ''}
        <div class="pg-proj__foot"><a class="link-arrow card__link" href="${href}">${label}<span class="sr-only">: ${esc(p.title)}</span> ${ico('arrow-right')}</a></div>
      </article>`;
}

function servicePage(s) {
  const b = '../../';
  const url = abs(cfg, s.path);
  const title = TITLE_OVERRIDE[s.key] || s.title;
  const crumbItems = [{ name: 'Home', path: '' }, { name: 'Services', path: 'services/' }, { name: s.name, path: s.path }];
  const head = pageHead({
    crumbItems, b, tone: s.tone, eyebrow: 'Freelance service', h1: esc(s.h1), lead: s.intro, answer: s.direct_answer,
    aside: `<div class="pg-svcmark" data-tone="${s.tone}" aria-hidden="true"><span class="pg-svcmark__ring"></span><span class="icon-tile pg-svcmark__tile">${ico(s.icon)}</span></div>`,
    actions: btn('Hire me for this', hireHref(b, s.slug), { v: 'solid', size: 'lg' }) + btn('See the work', '#proof', { v: 'ghost', size: 'lg', icon: 'arrow-right' }),
  });

  const what = section({
    id: 'deliverables', eyebrow: 'Deliverables and fit', title: `What you <span class="hl">get</span>`, tint: true,
    body: `<div class="pg-two">
      <div class="panel" data-tone="${s.tone}" data-reveal><h3 class="pg-panel__h">Deliverables</h3><ul class="dot-list">${s.deliverables.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="panel" data-tone="green" data-reveal style="--i:1"><h3 class="pg-panel__h">Good fit when</h3><ul class="dot-list">${s.good_fit.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    </div>`,
  });

  const process = section({
    id: 'process', eyebrow: 'The process', title: `How a project <span class="hl hl--purple">runs</span>`,
    body: stepsHtml(s.process),
  });

  // proof: case studies + selected projects first, smaller builds as a text line
  const rel = s.related_projects.map(id => projectModel[id]).filter(Boolean);
  const cards = rel.filter(p => p.hasCase || p.inShow);
  const small = rel.filter(p => !(p.hasCase || p.inShow));
  const proof = section({
    id: 'proof', eyebrow: 'Proof from real work', title: `Work behind <span class="hl hl--magenta">this service</span>`, tint: true,
    lead: 'Real projects, with the numbers and their limits on each page.',
    body: `<div class="grid grid--c3 pg-cards">${cards.map((p, i) => proofCard(p, b, i)).join('')}</div>
    ${small.length ? `<p class="pg-smallrel" data-reveal>Smaller related builds: ${small.map(p => `<a class="link" href="${b}projects/#more">${esc(p.title)}</a>`).join(', ')}.</p>` : ''}
    <p class="pg-linkrow" data-reveal><a class="link-arrow" href="${b}projects/">All projects ${ico('arrow-right')}</a></p>`,
  });

  const toolsSec = section({
    id: 'tools', eyebrow: 'Tools', title: `Tools I use <span class="hl hl--blue">for this</span>`,
    body: `<div data-reveal>${tags(s.tech, { cls: 'pg-tools', tone: s.tone, label: 'Tools used for this service' })}</div>`,
  });

  const faqItems = s.faqs.map((f, i) => ({ id: `q${i + 1}`, q: f.q, a: f.a }));
  const faq = section({
    id: 'faq', eyebrow: 'FAQ', title: `Questions about <span class="hl">${esc(s.name)}</span>`,
    body: qaList(faqItems, { idPrefix: s.slug, openFirst: true }),
  });

  const sibs = SIBLINGS[s.key].map(k => serviceByKey[k]);
  const related = section({
    id: 'related', eyebrow: 'Related', title: 'Related <span class="hl hl--purple">services</span>', tint: true,
    body: `<ul class="pg-rel" role="list" data-reveal-group>${sibs.map(x => `<li><a class="pg-rel__link" href="${b}${x.path}" data-tone="${x.tone}"><span class="icon-tile">${ico(x.icon)}</span><span><strong>${esc(x.name)}</strong><span class="pg-rel__t">${esc(x.blurb)}</span></span>${ico('arrow-right', 'pg-rel__go')}</a></li>`).join('')}
      <li><a class="pg-rel__link" href="${b}faq/" data-tone="green"><span class="icon-tile">${ico('message-circle')}</span><span><strong>Freelance FAQ</strong><span class="pg-rel__t">Cost, how to start, NDAs and ownership.</span></span>${ico('arrow-right', 'pg-rel__go')}</a></li>
    </ul>
    <p class="pg-linkrow" data-reveal><a class="link-arrow" href="${b}services/">All services ${ico('arrow-right')}</a></p>`,
  });

  const jsonld = ctx([
    webPage(url, title, s.description, { mainEntity: { '@id': url + '#service' } }),
    {
      '@type': 'Service', '@id': url + '#service', name: s.name, serviceType: s.h1, description: s.direct_answer, url,
      provider: personMini(), areaServed: [{ '@type': 'City', name: 'Mumbai' }, { '@type': 'Country', name: 'India' }],
      availableChannel: { '@type': 'ServiceChannel', serviceUrl: abs(cfg, 'contact/') + `?topic=${s.slug}` },
      isPartOf: { '@id': WEBSITE_ID },
    },
    crumbNode(url, crumbItems),
    faqNode(url, faqItems),
  ]);
  const tail = hireBand({ b, heading: `Discuss ${esc(s.name)} <span class="hl">with me</span>`, text: CTA_TEXT, topic: s.slug, secondary: { label: 'View work', href: b + 'projects/' } });
  return {
    path: s.path, current: 'services', title, description: s.description, jsonld,
    content: head + what + process + proof + toolsSec + faq + related + tail,
    llms: {
      heading: s.h1, url, desc: s.description,
      text: [s.direct_answer, 'Deliverables: ' + s.deliverables.join('; ') + '.', 'Good fit: ' + s.good_fit.join('; ') + '.', 'Tools: ' + s.tech.join(', ') + '.', ...s.faqs.map(f => `Q: ${f.q} A: ${f.a}`)],
    },
  };
}

export function build() {
  return [hub(), ...services.map(servicePage)];
}
