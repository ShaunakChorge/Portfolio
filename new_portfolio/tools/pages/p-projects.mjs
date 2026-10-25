// p-projects.mjs - /projects/ (hub) and /projects/<slug>/ for every case study of projects.config.json
import {
  cfg, abs, CTA_TEXT, caseStudies, showProjects, personalProjects, filters, pagesMeta, anchors,
} from './data.mjs';
import {
  esc, ico, tags, btn, pageHead, section, hireBand, qaList, hireHref, projectCollage, pv, title as ttl,
  ctx, crumbNode, webPage, faqNode, personRef, personMini, WEBSITE_ID, PERSON_ID,
} from './ui.mjs';

/* projects adapted from public work: Shaunak is a contributor, not the original author (the page text says so) */
const ADAPTED = { 'speech-emotion-recognition': 'A public training recipe from Kaggle, adapted and extended' };
/* ============================== hub ============================== */
function hub() {
  const m = pagesMeta.projects;
  const b = '../';
  const url = abs(cfg, m.path);
  const crumbItems = [{ name: 'Home', path: '' }, { name: 'Projects', path: m.path }];
  const answer = m.direct_answer;
  const head = pageHead({
    crumbItems, b, eyebrow: 'Projects', h1: esc(m.h1), answer,
    actions: btn('Hire me', hireHref(b), { v: 'solid', size: 'lg' }) + btn('See services', b + 'services/', { v: 'ghost', size: 'lg' }),
  });

  // filter chips: only groups that have selected projects, labels only; JS-free fallback shows everything
  const groups = new Set(showProjects.map(p => p.category_group));
  const chips = filters.filter(f => f.id === 'all' || groups.has(f.id)).map(f => {
    const tone = { llm: 'cyan', vision: 'magenta', 'speech-ml': 'purple', backend: 'blue', automation: 'blue' }[f.id];
    return `<li><button type="button" class="chip" data-filter="${f.id}"${tone ? ` data-tone="${tone}"` : ''} aria-pressed="${f.id === 'all'}">${esc(f.label)}</button></li>`;
  }).join('');
  const filterBar = `<div class="pg-filterbar" data-filterbar hidden data-reveal>
      <div role="group" aria-label="Filter selected projects by category"><ul class="chips" role="list">${chips}</ul></div>
    </div>`;

  const selected = section({
    id: 'selected-projects', eyebrow: 'Work', title: ttl(m.h2.work, 'Selected <span class="hl">projects</span>'),
    body: `${filterBar}
    ${projectCollage({ b, filterable: true, all: { href: '#personal-builds', label: 'Personal builds', icon: 'arrow-right' } })}`,
  });

  /* Personal builds: small projects, open rows (a short line, repository and live links when they exist), low-key on purpose */
  const rows = personalProjects.map(p => {
    const links = [];
    if (p.repoInfo.kind === 'public') links.push(`<a class="link" href="${p.repoInfo.href}" target="_blank" rel="noopener noreferrer">GitHub<span class="sr-only"> repository for ${esc(p.title)} (opens in a new tab)</span></a>`);
    if (p.live) links.push(`<a class="link" href="${p.live}" target="_blank" rel="noopener noreferrer">Live<span class="sr-only"> demo of ${esc(p.title)} (opens in a new tab)</span></a>`);
    return `<li class="pg-builds__row" id="p-${esc(p.id)}">
          <p class="pg-builds__t">${esc(p.title)}</p>
          <p class="pg-builds__d">${esc(p.personal_line)}</p>
          ${links.length ? `<p class="pg-builds__links">${links.join('<span aria-hidden="true"> &middot; </span>')}</p>` : ''}
        </li>`;
  }).join('');
  const personal = section({
    id: 'personal-builds', eyebrow: 'On my own', title: ttl(m.h2.personal, 'Personal <span class="hl hl--purple">builds</span>', 'hl--purple'), tint: true,
    body: `<ul class="pg-builds" role="list" data-reveal>${rows}</ul>`,
  });

  const faqItems = (m.faqs || []).map((f, i) => ({ id: `q${i + 1}`, q: f.q, a: f.a }));
  const faq = faqItems.length ? section({
    id: 'faq', eyebrow: 'FAQ', title: 'About these <span class="hl">projects</span>',
    body: qaList(faqItems, { idPrefix: 'projects' }),
  }) : '';
  const jsonld = ctx([
    webPage(url, m.title, m.description, { '@type': 'CollectionPage', mainEntity: { '@id': url + '#cases' }, about: { '@id': PERSON_ID } }),
    { '@type': 'ItemList', '@id': url + '#cases', name: 'Case studies', itemListElement: caseStudies.map((p, i) => ({ '@type': 'ListItem', position: i + 1, name: p.title, url: abs(cfg, p.path) })) },
    crumbNode(url, crumbItems),
    ...(faqItems.length ? [faqNode(url, faqItems)] : []),
    personMini(),
  ]);
  return {
    path: m.path, current: 'projects', title: m.title, description: m.description, jsonld,
    content: head + selected + personal + faq + hireBand({ b, heading: 'Want something <span class="hl">like this built?</span>', text: CTA_TEXT }),
    llms: { heading: m.h1, url, desc: m.description, text: [answer, ...faqItems.map(f => `Q: ${f.q} A: ${f.a}`)] },
  };
}

/* ============================== one case study ============================== */
const repoLine = p => p.repoInfo.kind === 'public'
  ? `<a class="link" href="${p.repoInfo.href}" target="_blank" rel="noopener noreferrer">${esc(p.repoInfo.href.replace('https://github.com/', ''))} on GitHub<span class="sr-only"> (opens in a new tab)</span></a>`
  : esc(p.repoInfo.text || 'Not public');

function casePage(p, idx) {
  const b = '../../';
  const url = abs(cfg, p.path);
  const cs = p.case_study;
  const { title, description } = cs.seo;
  const h2 = cs.h2 || {};
  const crumbItems = [{ name: 'Home', path: '' }, { name: 'Projects', path: 'projects/' }, { name: p.title, path: p.path }];

  const head = pageHead({
    crumbItems, b, tone: p.tone, eyebrow: `Case study / ${p.category}`, h1: esc(cs.seo.h1), lead: p.tagline, answer: cs.summary,
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
    id: 'story', eyebrow: 'The story', title: ttl(h2.story, 'Problem and <span class="hl hl--purple">approach</span>', 'hl--purple'),
    body: `<div class="pg-two">
      <div class="panel" data-tone="${p.tone}" data-reveal><h3 class="pg-panel__h">The problem</h3><p>${esc(cs.problem)}</p></div>
      <div class="panel" data-tone="${p.tone}" data-reveal style="--i:1"><h3 class="pg-panel__h">What I built</h3><p>${esc(cs.approach)}</p></div>
    </div>`,
  });

  const arch = section({
    id: 'how-it-works', eyebrow: 'How it is built', title: ttl(h2.arch, 'How it <span class="hl hl--blue">works</span>', 'hl--blue'), tint: true,
    body: `<ol class="pg-arch" data-reveal-group>${cs.architecture.map((x, i) => `<li class="pg-arch__item" data-tone="${p.tone}" style="--i:${Math.min(i, 5)}"><span class="pg-arch__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><p>${esc(x)}</p></li>`).join('')}</ol>`,
  });

  const results = section({
    id: 'results', eyebrow: 'Results', title: ttl(h2.results, 'What it <span class="hl hl--magenta">showed</span>', 'hl--magenta'),
    lead: 'Every number comes with how it was measured. The limits are part of the result.',
    body: `<div class="panel" data-tone="${p.tone}" data-reveal><ul class="dot-list pg-results">${cs.results.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`,
  });

  const ext = section({
    id: 'extensions', eyebrow: 'For your project', title: ttl(h2.ext, 'Extensions I can build <span class="hl">for you</span>'), tint: true,
    lead: 'Not part of this project. These are add-ons I can build for a client.',
    body: `<ul class="grid grid--c3 pg-ext pg-ext--n${(p.extensions || []).length}" role="list">${(p.extensions || []).map((e, i) => `<li class="pg-ext__item" data-reveal style="--i:${i % 3}"><article class="card card--flat pg-ext__card" data-tone="${p.tone}"><h3 class="pg-ext__t">${esc(e.title)}</h3><p>${esc(e.benefit)}</p>${tags(e.tech || [], { cls: 'pg-ext__tags', label: 'Possible tools', itemCls: 'tag--dashed' })}</article></li>`).join('')}</ul>`,
  });

  const svcCards = section({
    id: 'hire-for', eyebrow: 'Hire me', title: `Services behind <span class="hl hl--purple">this project</span>`,
    body: `<ul class="pg-rel" role="list" data-reveal-group>${p.svc.map(x => `<li><a class="pg-rel__link" href="${b}${x.path}" data-tone="${x.tone}"><span class="icon-tile">${ico(x.icon)}</span><span><strong>Hire me for ${esc(anchors(x.path).hire || x.name)}</strong><span class="pg-rel__t">${esc(x.blurb)}</span></span>${ico('arrow-right', 'pg-rel__go')}</a></li>`).join('')}</ul>
    <p class="pg-author" data-reveal>Built by <a class="link" href="${b}about/">Shaunak Chorge</a>, ${/\bAI\b/.test((head + glance + story + arch + results + ext).replace(/<[^>]+>/g, ' ')) ? 'AI' : 'Artificial Intelligence (AI)'} Engineer at Claptek Pvt Ltd in Mumbai.</p>`,
  });

  const faqItems = (p.faq || []).map((f, i) => ({ id: `q${i + 1}`, q: f.q, a: f.a }));
  const faq = faqItems.length ? section({
    id: 'faq', eyebrow: 'FAQ', title: ttl(h2.faq, 'Questions about <span class="hl">this project</span>'), tint: true,
    body: qaList(faqItems, { idPrefix: p.id }),
  }) : '';

  const prev = caseStudies[(idx - 1 + caseStudies.length) % caseStudies.length];
  const next = caseStudies[(idx + 1) % caseStudies.length];
  const pn = caseStudies.length > 1 ? `<section class="section pg-sec pg-pnsec" aria-label="More case studies"><div class="container"><nav class="pg-pn" aria-label="More case studies">
      <a class="pg-pn__link" href="${b}${prev.path}" rel="prev" data-reveal>${ico('arrow-left')}<span><small>Previous case study</small><strong>${esc(anchors(prev.path).related || prev.title)}</strong></span></a>
      <a class="pg-pn__link pg-pn__link--next" href="${b}${next.path}" rel="next" data-reveal style="--i:1"><span><small>Next case study</small><strong>${esc(anchors(next.path).related || next.title)}</strong></span>${ico('arrow-right')}</a>
    </nav></div></section>` : '';

  const keywords = p.stack || [];
  const isCode = p.repoInfo.kind === 'public';
  const work = {
    '@type': isCode ? 'SoftwareSourceCode' : 'CreativeWork', '@id': url + '#project', name: p.title, headline: p.tagline, abstract: cs.summary,
    description, url, genre: 'Case study', keywords,
    ...(ADAPTED[p.id]
      ? { contributor: personRef(), isBasedOn: ADAPTED[p.id] }
      : { author: p.coBuilders.length ? [personRef(), ...p.coBuilders.map(n => ({ '@type': 'Person', name: n }))] : personRef() }),
    isPartOf: { '@id': WEBSITE_ID }, mainEntityOfPage: { '@id': url + '#webpage' },
    ...(isCode ? { codeRepository: p.repoInfo.href, ...((p.stack || []).includes('Python') ? { programmingLanguage: 'Python' } : {}) } : {}),
  };
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
      heading: cs.seo.h1, url, desc: description,
      text: [cs.summary, 'Problem: ' + cs.problem, 'Approach: ' + cs.approach, 'Architecture: ' + cs.architecture.join('; ') + '.', 'Results: ' + cs.results.join('; ') + '.', 'Role: ' + p.role,
        'Extensions I can build for you (not part of this build): ' + (p.extensions || []).map(e => e.title).join('; ') + '.'],
    },
  };
}

export function build() {
  return [hub(), ...caseStudies.map((p, i) => casePage(p, i))];
}
