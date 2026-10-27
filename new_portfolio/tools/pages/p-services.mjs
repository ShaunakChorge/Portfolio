// p-services.mjs - /services/ (hub) and /services/<slug>/ x6
// A service page answers, in order: who it is for, which problems it solves, what you get and what I need from you, how a project runs, which tools do what,
// which trade-offs to decide together, where it fits in a business, the work that proves it, FAQs, related services and case studies, and a question box.
// Every new section renders only when its data exists in content.json (services[].who, problems, inputs, stack_roles, tradeoffs, use_cases, proof_reasons, related_services, ask_prompts).
import { cfg, abs, services, serviceByKey, projectModel, projectHref, pagesMeta, CTA_TEXT, anchors } from './data.mjs';
import {
  esc, ico, tags, btn, pageHead, section, hireBand, qaList, hireHref, title as ttl, askBox,
  ctx, crumbNode, webPage, faqNode, personMini, PERSON_ID,
} from './ui.mjs';
import { howIWork } from './p-about.mjs';

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

const stepsHtml = (steps, extra = '') => `<ol class="pg-steps${extra}" data-reveal-group>${steps.map((s, i) =>
  `<li class="pg-step" style="--i:${i}"><span class="pg-step__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h3 class="pg-step__t">${esc(s.step)}</h3><p>${esc(s.detail)}</p></li>`).join('')}</ol>`;

const toc = items => `<nav class="pg-toc" aria-label="On this page"><div class="container"><ul class="pg-toc__list" role="list">${items.map(([id, label]) => `<li><a href="#${id}">${esc(label)}</a></li>`).join('')}</ul></div></nav>`;
const TONES = ['cyan', 'purple', 'blue', 'magenta'];

function serviceCard(s, b, i = 0) {
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
    crumbItems, b, eyebrow: 'Freelance services', h1: esc(m.h1), answer: m.direct_answer,
    actions: btn('Contact me', hireHref(b), { v: 'solid', size: 'lg' }) + btn('See projects', b + 'projects/', { v: 'ghost', size: 'lg', icon: 'arrow-right' }),
  });
  const cards = section({
    id: 'all-services', eyebrow: 'Services', title: 'What I can build <span class="hl">for you</span>',
    body: `<div class="grid grid--c3 pg-cards">${services.map((s, i) => serviceCard(s, b, i)).join('')}</div>`,
  });

  /* which service fits: a buyer's situation, the service that answers it, and why */
  const guide = (m.guide || []).length ? section({
    id: 'which-service', eyebrow: 'Choosing', title: ttl(m.h2 && m.h2.guide, 'Which service <span class="hl hl--purple">fits you?</span>', 'hl--purple'), tint: true,
    lead: 'Start from your situation. Each line points to the service that answers it.',
    body: `<ul class="pg-guide" role="list" data-reveal-group>${m.guide.map((g, i) => {
      const s = serviceByKey[g.then];
      return `<li style="--i:${i % 4}"><a class="pg-guide__item" href="${b}${s.path}" data-tone="${s.tone}"><span class="pg-guide__if">${esc(g.if)}</span><span class="pg-guide__then"><span class="icon-tile">${ico(s.icon)}</span><span><strong>${esc(anchors(s.path).related || s.name)}</strong><span class="pg-guide__why">${esc(g.why)}</span></span></span>${ico('arrow-right', 'pg-rel__go')}</a></li>`;
    }).join('')}</ul>`,
  }) : '';

  const process = section({
    id: 'process', eyebrow: 'How it runs', title: ttl(m.h2 && m.h2.process, 'How an engagement <span class="hl hl--purple">runs</span>', 'hl--purple'),
    lead: 'Four steps, in this order. You see working software early, and I share progress in short written updates.',
    body: stepsHtml(PROCESS),
  });

  const engagement = (m.engagement || []).length ? section({
    id: 'engagement', eyebrow: 'Project sizes', title: ttl(m.h2 && m.h2.engagement, 'Small fix or <span class="hl hl--blue">full build</span>', 'hl--blue'), tint: true,
    lead: 'Projects of any size are welcome. The plan and the deadline are agreed together before work starts.',
    body: `<ul class="pg-sizes" role="list" data-reveal-group>${m.engagement.map((e, i) => `<li class="pg-size" data-tone="${TONES[i % 4]}" style="--i:${i}"><h3 class="pg-size__t">${esc(e.title)}</h3><p>${esc(e.text)}</p></li>`).join('')}</ul>`,
  }) : '';

  const industries = (m.industries || []).length ? section({
    id: 'industries', eyebrow: 'Where it helps', title: ttl(m.h2 && m.h2.industries, 'Industries and <span class="hl hl--magenta">teams I can help</span>', 'hl--magenta'),
    body: `<ul class="pg-uses pg-uses--wide" role="list" data-reveal-group>${m.industries.map((x, i) => `<li class="pg-use" data-tone="${TONES[i % 4]}" style="--i:${i % 4}"><h3 class="pg-use__who">${esc(x.name)}</h3><p>${esc(x.text)}</p></li>`).join('')}</ul>`,
  }) : '';

  const how = howIWork({
    extra: `<p class="pg-linkrow" data-reveal><a class="link-arrow" href="${b}projects/">See the projects behind these services ${ico('arrow-right')}</a><a class="link-arrow" href="${b}faq/">Read the freelance FAQ ${ico('arrow-right')}</a></p>`,
  });
  const faqItems = (m.faqs || []).map((f, i) => ({ id: `q${i + 1}`, q: f.q, a: f.a }));
  const faq = faqItems.length ? section({
    id: 'faq', eyebrow: 'FAQ', title: 'Choosing <span class="hl">a service</span>',
    body: qaList(faqItems, { idPrefix: 'services' }),
  }) : '';
  const jsonld = ctx([
    webPage(url, m.title, m.description, { '@type': 'CollectionPage', mainEntity: { '@id': url + '#services' }, about: { '@id': PERSON_ID } }),
    { '@type': 'ItemList', '@id': url + '#services', name: 'Freelance AI and backend services', itemListElement: services.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.name, url: abs(cfg, s.path) })) },
    crumbNode(url, crumbItems),
    ...(faqItems.length ? [faqNode(url, faqItems)] : []),
    personMini(),
  ]);
  return {
    path: m.path, current: 'services', title: m.title, description: m.description, jsonld,
    content: head + cards + guide + process + engagement + industries + how + faq + askBox({ b, ref: m.path, about: 'Services', prompts: ['Which service fits my idea?', 'Can a single build combine several services?', 'How do we start with a small test?'], title: 'Not sure which service you need?' }) + hireBand({ b, heading: 'Have a project in <span class="hl">mind?</span>', text: CTA_TEXT }),
    llms: {
      heading: m.h1, url, desc: m.description,
      text: [m.direct_answer, ...services.map(s => `${s.name}: ${s.blurb}`), ...(m.guide || []).map(g => `If ${g.if}: ${serviceByKey[g.then].name}. ${g.why}`), ...(m.industries || []).map(x => `${x.name}: ${x.text}`), ...faqItems.map(f => `Q: ${f.q} A: ${f.a}`)],
    },
  };
}

/* ============================== one service ============================== */
function proofCard(p, b, i, reason) {
  const m = (p.metrics || [])[0];
  const href = projectHref(p, b);
  const label = p.hasCase ? 'Read case study' : 'See project';
  return `<article class="card pg-proof" data-tone="${esc(p.tone)}" data-tilt data-reveal style="--i:${i}" aria-labelledby="pf-${esc(p.id)}">
        <p class="pg-proj__meta">${esc(p.category)}</p>
        <h3 class="pg-proj__title" id="pf-${esc(p.id)}">${esc(p.title)}</h3>
        <p class="pg-proj__blurb">${esc(p.card_blurb)}</p>
        ${reason ? `<p class="pg-proj__why"><strong>Why it is evidence:</strong> ${esc(reason)}</p>` : m ? `<p class="pg-proj__stat"><span class="pg-proj__num">${esc(m.value)}</span><span class="pg-proj__statlabel">${esc(m.label)}</span></p>` : ''}
        <div class="pg-proj__foot"><a class="link-arrow card__link" href="${href}">${label}<span class="sr-only">: ${esc(p.title)}</span> ${ico('arrow-right')}</a></div>
      </article>`;
}

function servicePage(s) {
  let band = 0; const alt = () => band++ % 2 === 0;   // sections alternate the plain and the tinted band, in page order
  const b = '../../';
  const url = abs(cfg, s.path);
  const title = s.title;
  const crumbItems = [{ name: 'Home', path: '' }, { name: 'Services', path: 'services/' }, { name: s.name, path: s.path }];
  const jump = [];
  const head = pageHead({
    crumbItems, b, tone: s.tone, eyebrow: 'Freelance service', h1: esc(s.h1), lead: s.intro, answer: s.direct_answer,
    aside: `<div class="pg-svcmark" data-tone="${s.tone}" aria-hidden="true"><span class="pg-svcmark__ring"></span><span class="icon-tile pg-svcmark__tile">${ico(s.icon)}</span></div>`,
    actions: btn('Discuss this service', hireHref(b, s.slug), { v: 'solid', size: 'lg' }) + btn('See the work', '#proof', { v: 'ghost', size: 'lg', icon: 'arrow-right' }),
  });

  /* who it is for */
  const who = (s.who || []).length ? section({
    id: 'who', eyebrow: 'Who it is for', title: ttl(s.h2 && s.h2.who, 'Who this <span class="hl hl--blue">is for</span>', 'hl--blue'), tint: alt(),
    body: `<ul class="pg-uses" role="list" data-reveal-group>${s.who.map((u, i) => `<li class="pg-use" data-tone="${TONES[i % 4]}" style="--i:${i % 4}"><h3 class="pg-use__who">${esc(u.who)}</h3><p>${esc(u.need)}</p></li>`).join('')}</ul>`,
  }) : '';
  if (who) jump.push(['who', 'Who it is for']);

  /* the problems it solves */
  const problems = (s.problems || []).length ? section({
    id: 'problems', eyebrow: 'Problems I solve', title: ttl(s.h2 && s.h2.problems, 'Problems I <span class="hl hl--magenta">solve</span>', 'hl--magenta'), tint: alt(),
    body: `<ul class="pg-problems" role="list" data-reveal-group>${s.problems.map((x, i) => `<li class="pg-problem" data-tone="${s.tone}" style="--i:${Math.min(i, 5)}"><p class="pg-problem__p"><span class="pg-problem__k">Problem</span>${esc(x.problem)}</p><p class="pg-problem__a"><span class="pg-problem__k">How I approach it</span>${esc(x.approach)}</p></li>`).join('')}</ul>`,
  }) : '';
  if (problems) jump.push(['problems', 'Problems solved']);

  /* what you get, and what I need from you */
  const second = (s.inputs || []).length
    ? `<div class="panel" data-tone="green" data-reveal style="--i:1"><h3 class="pg-panel__h">${ico('info', 'icon--sm')} What I need from you</h3><ul class="dot-list">${s.inputs.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`
    : `<div class="panel" data-tone="green" data-reveal style="--i:1"><h3 class="pg-panel__h">Good fit when</h3><ul class="dot-list">${s.good_fit.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`;
  const what = section({
    id: 'deliverables', eyebrow: 'Deliverables and fit', title: ttl(s.h2 && s.h2.deliverables, 'What you <span class="hl">get</span>'), tint: alt(),
    body: `<div class="pg-two">
      <div class="panel" data-tone="${s.tone}" data-reveal><h3 class="pg-panel__h">${ico('circle-check', 'icon--sm')} Deliverables</h3><ul class="dot-list">${s.deliverables.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      ${second}
    </div>`,
  });
  jump.push(['deliverables', 'What you get']);

  const process = section({
    id: 'process', eyebrow: 'The process', title: ttl(s.h2 && s.h2.process, 'How a project <span class="hl hl--purple">runs</span>', 'hl--purple'), tint: alt(),
    body: stepsHtml(s.process),
  });
  jump.push(['process', 'Process']);

  /* tools and the job each does */
  const stack = (s.stack_roles || []).length ? section({
    id: 'tools', eyebrow: 'Technology', title: ttl(s.h2 && s.h2.tools, 'Technology, and <span class="hl hl--blue">where it fits</span>', 'hl--blue'), tint: alt(),
    body: `<dl class="pg-roles panel" data-tone="${s.tone}" data-reveal>${s.stack_roles.map(r => `<div class="pg-roles__row"><dt>${esc(r.tool)}</dt><dd>${esc(r.role)}</dd></div>`).join('')}</dl>`,
  }) : section({
    id: 'tools', eyebrow: 'Tools', title: `Tools I use <span class="hl hl--blue">for this</span>`, tint: alt(),
    body: `<div data-reveal>${tags(s.tech, { cls: 'pg-tools', tone: s.tone, label: 'Tools used for this service' })}</div>`,
  });
  jump.push(['tools', 'Technology']);

  /* trade-offs to decide together */
  const trade = (s.tradeoffs || []).length ? section({
    id: 'tradeoffs', eyebrow: 'Decide together', title: ttl(s.h2 && s.h2.tradeoffs, 'Trade-offs we <span class="hl hl--purple">decide together</span>', 'hl--purple'), tint: alt(),
    body: `<ul class="pg-sizes" role="list" data-reveal-group>${s.tradeoffs.map((t, i) => `<li class="pg-size" data-tone="${TONES[i % 4]}" style="--i:${i}"><h3 class="pg-size__t">${esc(t.title)}</h3><p>${esc(t.text)}</p></li>`).join('')}</ul>`,
  }) : '';
  if (trade) jump.push(['tradeoffs', 'Trade-offs']);

  /* where it fits in a business */
  const uses = (s.use_cases || []).length ? section({
    id: 'use-cases', eyebrow: 'In a business', title: ttl(s.h2 && s.h2.uses, 'Where this <span class="hl hl--magenta">fits</span>', 'hl--magenta'), tint: alt(),
    lead: 'Situations where a team could use this service. These are examples, not past clients.',
    body: `<ul class="pg-uses" role="list" data-reveal-group>${s.use_cases.map((u, i) => `<li class="pg-use" data-tone="${TONES[i % 4]}" style="--i:${i % 4}"><h3 class="pg-use__who">${esc(u.who)}</h3><p>${esc(u.need)}</p></li>`).join('')}</ul>`,
  }) : '';
  if (uses) jump.push(['use-cases', 'Where it fits']);

  // proof: case studies + selected projects first (with the reason each one is evidence), smaller builds as a text line
  const reasons = s.proof_reasons || {};
  const ids = [...new Set([...s.related_projects, ...Object.keys(reasons)])];
  const rel = ids.map(id => projectModel[id]).filter(Boolean);
  const cards = rel.filter(p => p.hasCase || p.inShow);
  const small = rel.filter(p => !(p.hasCase || p.inShow));
  const proof = section({
    id: 'proof', eyebrow: 'Proof from real work', title: ttl(s.h2 && s.h2.proof, 'Work behind <span class="hl hl--magenta">this service</span>', 'hl--magenta'), tint: alt(),
    lead: 'Real projects, each with its results on its own page.',
    body: `<div class="grid grid--c3 pg-cards">${cards.map((p, i) => proofCard(p, b, i, reasons[p.id])).join('')}</div>
    ${small.length ? `<p class="pg-smallrel" data-reveal>Related personal builds: ${small.map(p => `<a class="link" href="${projectHref(p, b)}">${esc(p.title)}</a>`).join(', ')}.</p>` : ''}
    <p class="pg-linkrow" data-reveal><a class="link-arrow" href="${b}projects/">See all case studies ${ico('arrow-right')}</a><a class="link-arrow" href="${b}projects/#by-need">Browse work by business need ${ico('arrow-right')}</a></p>`,
  });
  jump.push(['proof', 'Proof']);

  const faqItems = s.faqs.map((f, i) => ({ id: `q${i + 1}`, q: f.q, a: f.a }));
  const faq = section({
    id: 'faq', eyebrow: 'FAQ', title: ttl(s.h2 && s.h2.faq, `Questions about <span class="hl">${esc(s.name)}</span>`), tint: alt(),
    body: qaList(faqItems, { idPrefix: s.slug }),
  });
  jump.push(['faq', 'FAQ']);

  const sibs = SIBLINGS[s.key].map(k => serviceByKey[k]);
  const why = s.related_services || {};
  const related = section({
    id: 'related', eyebrow: 'Related', title: 'Related <span class="hl hl--purple">services</span>', tint: alt(),
    body: `<ul class="pg-rel" role="list" data-reveal-group>${sibs.map(x => `<li><a class="pg-rel__link" href="${b}${x.path}" data-tone="${x.tone}"><span class="icon-tile">${ico(x.icon)}</span><span><strong>${esc(anchors(x.path).related || x.name)}</strong><span class="pg-rel__t">${esc(why[x.key] || x.blurb)}</span></span>${ico('arrow-right', 'pg-rel__go')}</a></li>`).join('')}
      <li><a class="pg-rel__link" href="${b}faq/" data-tone="green"><span class="icon-tile">${ico('message-circle')}</span><span><strong>Freelance FAQ</strong><span class="pg-rel__t">Cost, how to start, NDAs and ownership.</span></span>${ico('arrow-right', 'pg-rel__go')}</a></li>
    </ul>
    <p class="pg-linkrow" data-reveal><a class="link-arrow" href="${b}services/">All services ${ico('arrow-right')}</a><a class="link-arrow" href="${b}services/#which-service">Which service fits you? ${ico('arrow-right')}</a></p>`,
  });
  jump.push(['related', 'Related']);

  const ask = askBox({ b, ref: s.path, about: s.name, topic: s.slug, prompts: s.ask_prompts || [], title: `Have a question about ${s.name.toLowerCase()}, or your own idea?` });
  jump.push(['ask', 'Ask a question']);

  const jsonld = ctx([
    webPage(url, title, s.description, { mainEntity: { '@id': url + '#service' } }),
    {
      '@type': 'Service', '@id': url + '#service', name: s.name, serviceType: s.h1, description: s.direct_answer, url,
      provider: personMini(), areaServed: [{ '@type': 'City', name: 'Mumbai' }, { '@type': 'Country', name: 'India' }],
      availableChannel: { '@type': 'ServiceChannel', serviceUrl: abs(cfg, 'contact/') + `?topic=${s.slug}` },
    },
    crumbNode(url, crumbItems),
    faqNode(url, faqItems),
  ]);
  const tail = hireBand({ b, heading: `Discuss ${esc(anchors(s.path).hire || s.name)} <span class="hl">with me</span>`, text: CTA_TEXT, topic: s.slug });
  return {
    path: s.path, current: 'services', title, description: s.description, jsonld,
    content: head + toc(jump) + who + problems + what + process + stack + trade + uses + proof + faq + related + ask + tail,
    llms: {
      heading: s.h1, url, desc: s.description,
      text: [s.direct_answer,
        ...(s.who || []).length ? ['Who it is for: ' + s.who.map(u => `${u.who}: ${u.need}`).join(' ')] : [],
        ...(s.problems || []).length ? ['Problems I solve: ' + s.problems.map(x => `${x.problem}. ${x.approach}`).join(' ')] : [],
        'Deliverables: ' + s.deliverables.join('; ') + '.',
        ...(s.inputs || []).length ? ['What I need from you: ' + s.inputs.join('; ') + '.'] : ['Good fit: ' + s.good_fit.join('; ') + '.'],
        ...(s.stack_roles || []).length ? ['Technology: ' + s.stack_roles.map(r => `${r.tool} (${r.role})`).join('; ') + '.'] : ['Tools: ' + s.tech.join(', ') + '.'],
        ...(s.tradeoffs || []).length ? ['Trade-offs: ' + s.tradeoffs.map(t => `${t.title}. ${t.text}`).join(' ')] : [],
        ...(s.use_cases || []).length ? ['Where it fits: ' + s.use_cases.map(u => `${u.who}: ${u.need}`).join(' ')] : [],
        ...s.faqs.map(f => `Q: ${f.q} A: ${f.a}`)],
    },
  };
}

export function build() {
  return [hub(), ...services.map(servicePage)];
}
