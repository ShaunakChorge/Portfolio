// p-projects.mjs - /projects/ (hub) and /projects/<slug>/ for every id in selection.casestudy
import {
  cfg, abs, services, CTA_TEXT, caseStudies, showProjects, showOnly, moreProjects, filters, pagesMeta, selection, clip,
} from './data.mjs';
import {
  esc, ico, tags, btn, pageHead, section, hireBand, qaList, hireHref, caseCard, miniCard, pv,
  ctx, crumbNode, webPage, faqNode, personRef, personMini, WEBSITE_ID, PERSON_ID,
} from './ui.mjs';

const NUM_WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const numWord = n => NUM_WORD[n] || String(n);

/* meta descriptions (<= 155 chars), hand-written from each project's own verified numbers; unknown ids fall back to a clipped description_short */
const DESC = {
  'ams-ai-finding-engine': 'Case study: an AI service at Claptek that drafts audit findings with no invented facts across 27 checked drafts and about 28 times faster responses.',
  'obligation-management-system': 'Case study: an AI service that lists obligations from regulatory PDFs, with 97.2% of 1,266 records linked to an exact, highlightable source passage.',
  'finacle-text-to-sql': 'Case study: an on-premise assistant that turns plain questions into bank database queries, lifting the share of accounts found from 34% to 54%.',
  'ai-rag-healthcare-assistant': 'Case study: a chatbot over healthcare policy documents that cites its source and refuses out-of-scope questions instead of guessing.',
  'agentic-honeypot': 'Case study: an AI persona that keeps scammers talking while it flags scam intent and logs payment IDs and links. Co-built with Prasanna Patil.',
  'advanced-cctv-analytics': 'Case study: a Smart India Hackathon prototype that watches one CCTV feed for crowd limits, crime types and faces. Co-built with Prasanna Patil.',
  'speech-emotion-recognition': 'Case study: a neural network that labels seven emotions in speech, 93.87% on a random test split, with live microphone input and a web app.',
  'deepfake-video-detection': 'Case study: a neural network that scores each video frame as real or fake, with a web app and PDF report. 74.16% on a random frame split.',
  'observable-ai-backend': 'Case study: an AI-routed backend with request IDs, metrics and traces. A slow step fell from about 15 seconds to under 50 milliseconds on made-up data.',
};
const caseTitle = p => {
  const a = `${p.title}: Case Study | ${cfg.name}`;
  return a.length <= 60 ? a : `${p.title} | ${cfg.name}`;
};
const caseDesc = p => DESC[p.id] || clip('Case study: ' + p.description_short, 155);

/* ============================== hub ============================== */
function hub() {
  const m = pagesMeta.projects;
  const b = '../';
  const url = abs(cfg, m.path);
  const crumbItems = [{ name: 'Home', path: '' }, { name: 'Projects', path: m.path }];
  const nCase = caseStudies.length;
  const lead = `A selection of the Artificial Intelligence (AI) chatbot, computer vision, speech and backend work I have built, at my job and on my own. ${numWord(nCase)[0].toUpperCase() + numWord(nCase).slice(1)} have full case studies, including what I can add for a client.`;
  const answer = `Shaunak Chorge's work includes AI systems built at Claptek for audit and compliance, a chatbot that cites its sources, a backend that shows where requests slow down, speech and vision models, and automation. ${numWord(nCase)[0].toUpperCase() + numWord(nCase).slice(1)} projects have full case studies with the problem, what he built, measured results and what he can add for a client. Smaller builds are listed at the end.`;
  const head = pageHead({
    crumbItems, b, eyebrow: 'Projects', h1: esc(m.h1), lead, answer,
    actions: btn('Hire me', hireHref(b), { v: 'solid', size: 'lg' }) + btn('See services', b + 'services/', { v: 'ghost', size: 'lg' }),
  });

  // filter chips: only groups that have selected projects; JS-free fallback shows everything
  const counts = {};
  for (const p of showProjects) counts[p.category_group] = (counts[p.category_group] || 0) + 1;
  const chips = filters.filter(f => f.id === 'all' || counts[f.id]).map(f => {
    const n = f.id === 'all' ? showProjects.length : counts[f.id];
    const tone = { llm: 'cyan', vision: 'magenta', 'speech-ml': 'purple', backend: 'blue', automation: 'blue', 'web-tools': 'blue' }[f.id];
    return `<li><button type="button" class="chip" data-filter="${f.id}"${tone ? ` data-tone="${tone}"` : ''} aria-pressed="${f.id === 'all'}">${esc(f.label)} <span class="chip__count" aria-hidden="true">${n}</span><span class="sr-only">(${n} ${n === 1 ? 'project' : 'projects'})</span></button></li>`;
  }).join('');
  const filterBar = `<div class="pg-filterbar" data-filterbar hidden data-reveal>
      <div role="group" aria-label="Filter selected projects by category"><ul class="chips" role="list">${chips}</ul></div>
      <p class="pg-filtercount" data-filtercount role="status" aria-live="polite" aria-atomic="true">Showing <strong>${showProjects.length}</strong> of ${showProjects.length} projects</p>
    </div>`;

  const cases = section({
    id: 'case-studies', eyebrow: 'Case studies', title: `Case studies with <span class="hl">the evidence</span>`,
    lead: 'Each one covers the problem, what I built, what it does and what the results do not show.',
    body: `${filterBar}
    <ul class="pg-grid pg-grid--cases" role="list" data-filterable>${caseStudies.map((p, i) => caseCard(p, b, i)).join('')}</ul>`,
  });
  const also = showOnly.length ? section({
    id: 'also-selected', eyebrow: 'Also selected', title: `More selected <span class="hl hl--blue">work</span>`, tint: true,
    lead: 'Smaller builds, and client work, that do not have a full write-up.',
    body: `<ul class="pg-grid pg-grid--mini" role="list" data-filterable>${showOnly.map((p, i) => miniCard(p, b, i)).join('')}</ul>`,
  }) : '';

  const rows = moreProjects.map(p => {
    const links = [];
    if (p.repoInfo.kind === 'public') links.push(`<a class="link" href="${p.repoInfo.href}" target="_blank" rel="noopener noreferrer">GitHub<span class="sr-only"> repository for ${esc(p.title)} (opens in a new tab)</span></a>`);
    if (p.live) links.push(`<a class="link" href="${p.live}" target="_blank" rel="noopener noreferrer">Live<span class="sr-only"> demo of ${esc(p.title)} (opens in a new tab)</span></a>`);
    return `<li class="pg-more__row" id="m-${esc(p.id)}">
          <div><p class="pg-more__t">${esc(p.title)}</p><p class="pg-more__d">${esc(p.card_blurb)}</p></div>
          <div class="pg-more__side"><span class="pg-more__tech">${esc((p.stack || []).slice(0, 3).join(' / '))}</span>${links.length ? `<span class="pg-more__links">${links.join('<span aria-hidden="true"> &middot; </span>')}</span>` : ''}</div>
        </li>`;
  }).join('');
  const more = moreProjects.length ? section({
    id: 'more-projects', eyebrow: 'Smaller builds', title: `More <span class="hl hl--purple">projects</span>`,
    body: `<details class="pg-morebox" id="more" data-reveal>
      <summary class="pg-morebox__sum"><span>Show the ${moreProjects.length} smaller projects</span>${ico('chevron-down', 'pg-morebox__chev')}</summary>
      <ul class="pg-more" role="list">${rows}</ul>
    </details>`,
  }) : '';

  const jsonld = ctx([
    webPage(url, m.title, m.description, { '@type': 'CollectionPage', mainEntity: { '@id': url + '#cases' }, about: { '@id': PERSON_ID } }),
    { '@type': 'ItemList', '@id': url + '#cases', name: 'Case studies', itemListElement: caseStudies.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.title, url: abs(cfg, p.path) })) },
    crumbNode(url, crumbItems),
    personMini(),
  ]);
  return {
    path: m.path, current: 'projects', title: m.title, description: m.description, jsonld,
    content: head + cases + also + more + hireBand({ b, heading: 'Want something <span class="hl">like this built?</span>', text: CTA_TEXT }),
    llms: { heading: m.h1, url, desc: m.description, text: [answer] },
  };
}

/* ============================== one case study ============================== */
const repoLine = p => p.repoInfo.kind === 'public'
  ? `<a class="link" href="${p.repoInfo.href}" target="_blank" rel="noopener noreferrer">${esc(p.repoInfo.href.replace('https://github.com/', ''))} on GitHub<span class="sr-only"> (opens in a new tab)</span></a>`
  : esc(p.repoInfo.text || 'Not public');

function casePage(p, idx) {
  const b = '../../';
  const url = abs(cfg, p.path);
  const title = caseTitle(p);
  const description = caseDesc(p);
  const crumbItems = [{ name: 'Home', path: '' }, { name: 'Projects', path: 'projects/' }, { name: p.title, path: p.path }];
  const cs = p.case_study;

  const head = pageHead({
    crumbItems, b, tone: p.tone, eyebrow: `Case study / ${p.category}`, h1: esc(p.title), lead: p.tagline, answer: cs.summary,
    aside: `<div class="pg-casevis">${pv(p)}</div>`,
    actions: btn('Hire me for something like this', hireHref(b, p.primarySvc.slug), { v: 'solid', size: 'lg' }) + btn('All projects', b + 'projects/', { v: 'ghost', size: 'lg', icon: 'arrow-left' }),
  });

  /* key facts (no year) */
  const facts = [
    ['Role', esc(p.role)],
    ...(p.atClaptek ? [['Built at', 'Claptek Pvt Ltd, as AI Engineer']] : []),
    ...(p.coBuilders.length ? [['Co-built with', esc(p.coBuilders.join(', '))]] : []),
    ...(p.context ? [['Context', esc(p.context.charAt(0).toUpperCase() + p.context.slice(1))]] : []),
    ['Repository', repoLine(p)],
  ];
  const metrics = (p.metrics || []).slice(0, 3);
  const glance = section({
    id: 'at-a-glance', eyebrow: 'At a glance', title: `Key <span class="hl">facts</span>`, tint: true,
    body: `<div class="pg-glance">
      <dl class="panel pg-facts" data-tone="${p.tone}" data-reveal>${facts.map(([k, v]) => `<div class="pg-facts__row"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}
        <div class="pg-facts__row"><dt>Stack</dt><dd>${tags(p.stack, { tone: p.tone, label: 'Stack used in this build', cls: 'pg-facts__tags' })}</dd></div>
      </dl>
      ${metrics.length ? `<ul class="pg-metrics" role="list" data-reveal-group>${metrics.map((m, i) => `<li class="pg-metric" data-tone="${p.tone}" style="--i:${i}"><span class="pg-metric__v">${esc(m.value)}</span><span class="pg-metric__l">${esc(m.label)}</span></li>`).join('')}</ul>` : ''}
    </div>`,
  });

  const story = section({
    id: 'story', eyebrow: 'The story', title: `Problem and <span class="hl hl--purple">approach</span>`,
    body: `<div class="pg-two">
      <div class="panel" data-tone="${p.tone}" data-reveal><h3 class="pg-panel__h">The problem</h3><p>${esc(cs.problem)}</p></div>
      <div class="panel" data-tone="${p.tone}" data-reveal style="--i:1"><h3 class="pg-panel__h">What I built</h3><p>${esc(cs.approach)}</p></div>
    </div>`,
  });

  const arch = section({
    id: 'how-it-works', eyebrow: 'How it is built', title: `How it <span class="hl hl--blue">works</span>`, tint: true,
    body: `<ol class="pg-arch" data-reveal-group>${cs.architecture.map((x, i) => `<li class="pg-arch__item" data-tone="${p.tone}" style="--i:${Math.min(i, 5)}"><span class="pg-arch__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><p>${esc(x)}</p></li>`).join('')}</ol>`,
  });

  const results = section({
    id: 'results', eyebrow: 'Results', title: `What it <span class="hl hl--magenta">showed</span>`,
    lead: 'Every number comes with how it was measured. The limits are part of the result.',
    body: `<div class="panel" data-tone="${p.tone}" data-reveal><ul class="dot-list pg-results">${cs.results.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    <p class="pg-role" data-reveal><strong>My role.</strong> ${esc(cs.role)}</p>`,
  });

  const ext = section({
    id: 'extensions', eyebrow: 'For your project', title: `Extensions I can build <span class="hl">for you</span>`, tint: true,
    lead: 'Not part of this project. These are add-ons I can build for a client.',
    body: `<ul class="grid grid--c3 pg-ext" role="list">${(p.extensions || []).map((e, i) => `<li class="pg-ext__item" data-reveal style="--i:${i % 3}"><article class="card card--flat pg-ext__card" data-tone="${p.tone}"><h3 class="pg-ext__t">${esc(e.title)}</h3><p>${esc(e.benefit)}</p>${tags(e.tech || [], { cls: 'pg-ext__tags', label: 'Possible tools', itemCls: 'tag--dashed' })}</article></li>`).join('')}</ul>`,
  });

  const svcCards = section({
    id: 'hire-for', eyebrow: 'Hire me', title: `Need this <span class="hl hl--purple">kind of work?</span>`,
    body: `<ul class="pg-rel" role="list" data-reveal-group>${p.svc.map(x => `<li><a class="pg-rel__link" href="${b}${x.path}" data-tone="${x.tone}"><span class="icon-tile">${ico(x.icon)}</span><span><strong>Hire me for ${esc(x.name)}</strong><span class="pg-rel__t">${esc(x.blurb)}</span></span>${ico('arrow-right', 'pg-rel__go')}</a></li>`).join('')}</ul>
    <p class="pg-author" data-reveal>Built by <a class="link" href="${b}about/">Shaunak Chorge</a>, AI Engineer at Claptek Pvt Ltd in Mumbai.</p>`,
  });

  const faqItems = (p.faq || []).map((f, i) => ({ id: `q${i + 1}`, q: f.q, a: f.a }));
  const faq = faqItems.length ? section({
    id: 'faq', eyebrow: 'FAQ', title: `Questions about <span class="hl">this project</span>`, tint: true,
    body: qaList(faqItems, { idPrefix: p.id, openFirst: true }),
  }) : '';

  const prev = caseStudies[(idx - 1 + caseStudies.length) % caseStudies.length];
  const next = caseStudies[(idx + 1) % caseStudies.length];
  const pn = caseStudies.length > 1 ? `<section class="section pg-sec pg-pnsec" aria-label="More case studies"><div class="container"><nav class="pg-pn" aria-label="More case studies">
      <a class="pg-pn__link" href="${b}${prev.path}" rel="prev" data-reveal>${ico('arrow-left')}<span><small>Previous case study</small><strong>${esc(prev.title)}</strong></span></a>
      <a class="pg-pn__link pg-pn__link--next" href="${b}${next.path}" rel="next" data-reveal style="--i:1"><span><small>Next case study</small><strong>${esc(next.title)}</strong></span>${ico('arrow-right')}</a>
    </nav></div></section>` : '';

  const keywords = p.stack || [];
  const isCode = p.repoInfo.kind === 'public';
  const work = {
    '@type': isCode ? 'SoftwareSourceCode' : 'CreativeWork', '@id': url + '#project', name: p.title, headline: p.tagline, abstract: cs.summary,
    description, url, genre: 'Case study', keywords, inLanguage: undefined,
    author: personRef(), isPartOf: { '@id': WEBSITE_ID }, mainEntityOfPage: { '@id': url + '#webpage' },
    ...(isCode ? { codeRepository: p.repoInfo.href, ...((p.stack || []).includes('Python') ? { programmingLanguage: 'Python' } : {}) } : {}),
    ...(p.coBuilders.length ? { contributor: p.coBuilders.map(n => ({ '@type': 'Person', name: n })) } : {}),
  };
  delete work.inLanguage;
  const nodes = [
    webPage(url, title, description, { mainEntity: { '@id': url + '#project' } }),
    work,
    crumbNode(url, crumbItems),
    personMini(),
  ];
  if (faqItems.length) nodes.push(faqNode(url, faqItems));
  const tail = hireBand({ b, heading: 'Need something <span class="hl">like this built?</span>', text: CTA_TEXT, topic: p.primarySvc.slug });
  return {
    path: p.path, current: 'projects', title, description, og_type: 'article', jsonld: ctx(nodes),
    content: head + glance + story + arch + results + ext + svcCards + faq + pn + tail,
    llms: {
      heading: p.title, url, desc: description,
      text: [cs.summary, 'Problem: ' + cs.problem, 'Approach: ' + cs.approach, 'Architecture: ' + cs.architecture.join('; ') + '.', 'Results: ' + cs.results.join('; ') + '.', 'Role: ' + cs.role,
        'Extensions I can build for you (not part of this build): ' + (p.extensions || []).map(e => e.title).join('; ') + '.'],
    },
  };
}

export function build() {
  return [hub(), ...caseStudies.map((p, i) => casePage(p, i))];
}
