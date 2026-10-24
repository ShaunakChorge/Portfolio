// p-faq.mjs - /faq/ : grouped accordion (native <details>) + FAQPage JSON-LD built from the SAME strings as the visible text
import { cfg, abs, faqAll, pagesMeta, services, serviceByKey, CTA_TEXT } from './data.mjs';
import { esc, ico, btn, pageHead, hireBand, qaList, hireHref, ctx, crumbNode, personMini, PERSON_ID, WEBSITE_ID } from './ui.mjs';

/* one descriptive internal link under selected answers (internal linking, not part of the FAQPage text) */
const MORE = b => ({
  freelance: { label: 'See the freelance services', href: b + 'services/' },
  'what-i-build': { label: 'Browse the six services', href: b + 'services/' },
  'existing-code': { label: 'Python backend and API work', href: b + serviceByKey['python-backend-apis'].path },
  timeline: { label: 'Send a brief for an estimate', href: b + 'contact/#hire' },
  'how-to-start': { label: 'Send a brief', href: b + 'contact/#hire' },
  process: { label: 'How an engagement runs', href: b + 'services/#process' },
  stack: { label: 'The full list of tools on the About page', href: b + 'about/#stack' },
  'local-models': { label: 'AI chatbot and document assistant work', href: b + serviceByKey['llm-apps-rag'].path },
  location: { label: 'Contact and local time', href: b + 'contact/' },
  pricing: { label: 'Ask for a proposal', href: b + 'contact/#hire' },
  nda: { label: 'Get in touch', href: b + 'contact/#hire' },
  ownership: { label: 'Get in touch', href: b + 'contact/#hire' },
  support: { label: 'See how a project runs', href: b + 'services/#process' },
});

function page() {
  const m = pagesMeta.faq;
  const b = '../';
  const url = abs(cfg, m.path);
  const crumbItems = [{ name: 'Home', path: '' }, { name: 'FAQ', path: m.path }];
  const head = pageHead({
    crumbItems, b, eyebrow: 'FAQ', h1: esc(m.h1), lead: m.lead, answer: m.direct_answer,
    actions: btn('Hire me', hireHref(b), { v: 'solid', size: 'lg' }) + btn('See services', b + 'services/', { v: 'ghost', size: 'lg' }),
  });
  const more = MORE(b);
  let first = true;
  const groups = faqAll.map(g => {
    const html = qaList(g.items, { idPrefix: 'faq', openFirst: false, links: more }).replace(first ? '<details class="pg-qa"' : '@@never@@', () => { first = false; return '<details class="pg-qa" open'; });
    return `<div class="pg-qgroup"><h2 class="pg-qgroup__h" data-reveal>${esc(g.group)}</h2>${html}</div>`;
  }).join('');
  const body = `<section class="section pg-sec" aria-label="Questions and answers"><div class="container container--narrow">${groups}</div></section>`;

  const all = faqAll.flatMap(g => g.items);
  const jsonld = ctx([
    {
      '@type': 'FAQPage', '@id': url + '#webpage', url, name: m.title, description: m.description, isPartOf: { '@id': WEBSITE_ID },
      breadcrumb: { '@id': url + '#breadcrumb' }, about: { '@id': PERSON_ID },
      mainEntity: all.map(it => ({ '@type': 'Question', name: it.q, acceptedAnswer: { '@type': 'Answer', text: it.a } })),
    },
    crumbNode(url, crumbItems),
    personMini(),
  ]);
  return {
    path: m.path, current: 'faq', title: m.title, description: m.description, jsonld,
    content: head + body + hireBand({ b, heading: 'Still have <span class="hl">a question?</span>', text: 'Send a short brief or just ask. I reply with my view on feasibility and a proposed scope.', secondary: { label: 'See services', href: b + 'services/' } }),
    llms: { heading: m.h1, url, desc: m.description, text: [m.direct_answer, ...all.map(it => `Q: ${it.q} A: ${it.a}`)] },
  };
}

export function build() { return [page()]; }
