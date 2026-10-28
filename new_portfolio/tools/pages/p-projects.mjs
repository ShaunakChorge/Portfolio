// p-projects.mjs - /projects/ (hub) and /projects/<slug>/ for every case study of projects.config.json
// A case study is long-form on purpose: why it matters, what was hard, my role, how it works, the decisions, results and limits, where the same
// solution fits, the extensions I can build, FAQs, related case studies by business need, and a box that sends a question to the contact form.
// Every new section renders only when its data exists in content.json (case_study.context, challenges, scope, flow, decisions, iteration, limits, use_cases, related, ask_prompts).
import {
  cfg, abs, CTA_TEXT, caseStudies, showProjects, personalProjects, filters, pagesMeta, anchors, projectModel, projectHref,
} from './data.mjs';
import {
  esc, ico, tags, btn, pageHead, section, hireBand, qaList, hireHref, projectCollage, pv, title as ttl, askBox, relatedCards, flowDiagram,
  ctx, crumbNode, webPage, faqNode, personRef, personMini, WEBSITE_ID, PERSON_ID,
} from './ui.mjs';

/* projects adapted from public work: Shaunak is a contributor, not the original author (the page text says so) */
const ADAPTED = { 'speech-emotion-recognition': 'A public training recipe from Kaggle, adapted and extended' };

/** "On this page" jump links: only the sections the page really has */
const toc = items => `<nav class="pg-toc" aria-label="On this page"><div class="container"><ul class="pg-toc__list" role="list">${items.map(([id, label]) => `<li><a href="#${id}">${esc(label)}</a></li>`).join('')}</ul></div></nav>`;

/* ============================== hub ============================== */
function hub() {
  const m = pagesMeta.projects;
  const b = '../';
  const url = abs(cfg, m.path);
  const crumbItems = [{ name: 'Home', path: '' }, { name: 'Projects', path: m.path }];
  const answer = m.direct_answer;
  const head = pageHead({
    crumbItems, b, eyebrow: 'Projects', h1: esc(m.h1), answer,
    actions: btn('Get in touch', hireHref(b), { v: 'solid', size: 'lg' }) + btn('See services', b + 'services/', { v: 'ghost', size: 'lg' }),
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

  /* browse by business need: the same projects grouped by what a business wants done */
  const needs = (m.needs || []).length ? section({
    id: 'by-need', eyebrow: 'By business need', title: ttl(m.h2.needs, 'Find work by <span class="hl hl--purple">what you need</span>', 'hl--purple'), tint: true,
    lead: 'Each need below points to the case studies that answer it, best match first.',
    body: `<ul class="pg-needs" role="list" data-reveal-group>${m.needs.map((n, i) => `<li class="pg-need" data-tone="${['cyan', 'purple', 'magenta', 'blue', 'green'][i % 5]}" style="--i:${i % 4}">
        <h3 class="pg-need__t">${esc(n.need)}</h3>
        <p class="pg-need__d">${esc(n.text)}</p>
        <p class="pg-need__links">${n.ids.map(id => projectModel[id]).filter(Boolean).map(p => `<a class="link-arrow" href="${projectHref(p, b)}">${esc(anchors(p.path).related || p.title)} ${ico('arrow-right')}</a>`).join('')}</p>
      </li>`).join('')}</ul>`,
  }) : '';

  const reading = (m.reading || []).length ? section({
    id: 'how-to-read', eyebrow: 'How to read them', title: ttl(m.h2.reading, 'What each case study <span class="hl hl--blue">contains</span>', 'hl--blue'),
    body: `<ol class="pg-reading" data-reveal-group>${m.reading.map((r, i) => `<li class="pg-reading__item" style="--i:${Math.min(i, 5)}"><span class="pg-reading__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h3 class="pg-reading__t">${esc(r.title)}</h3><p>${esc(r.text)}</p></li>`).join('')}</ol>`,
  }) : '';

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
    id: 'personal-builds', eyebrow: 'On my own', title: ttl(m.h2.personal, 'Personal <span class="hl hl--purple">builds</span>', 'hl--purple'), tint: !needs,
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
    content: head + selected + needs + reading + personal + faq + askBox({ b, ref: m.path, about: 'Projects', prompts: ['Which project is closest to my idea?', 'Can I see how a result was measured?', 'Which of these are client projects?'], title: 'Not sure which project fits your idea?' }) + hireBand({ b, heading: 'Need something <span class="hl">like this built,</span> or have a project?', text: CTA_TEXT, cta: "Let's talk", secondary: { label: 'View resume', href: b + 'resume/' } }),
    llms: {
      heading: m.h1, url, desc: m.description,
      text: [answer, ...(m.needs || []).map(n => `${n.need}: ${n.text}`), ...faqItems.map(f => `Q: ${f.q} A: ${f.a}`)],
    },
  };
}

/* ============================== one case study ============================== */
const repoLine = p => p.repoInfo.kind === 'public'
  ? `<a class="link" href="${p.repoInfo.href}" target="_blank" rel="noopener noreferrer">${esc(p.repoInfo.href.replace('https://github.com/', ''))} on GitHub<span class="sr-only"> (opens in a new tab)</span></a>`
  : esc(p.repoInfo.text || 'Not public');

function casePage(p, idx) {
  let band = 0; const alt = () => band++ % 2 === 0;   // every section that is really on the page alternates the plain and the tinted band, in page order
  const b = '../../';
  const url = abs(cfg, p.path);
  const cs = p.case_study;
  const { title, description } = cs.seo;
  const h2 = cs.h2 || {};
  const crumbItems = [{ name: 'Home', path: '' }, { name: 'Projects', path: 'projects/' }, { name: p.title, path: p.path }];
  const jump = [];   // the "On this page" links, in page order

  const head = pageHead({
    crumbItems, b, tone: p.tone, eyebrow: `Case study / ${p.category}`, h1: esc(cs.seo.h1), lead: p.tagline, answer: cs.summary,
    aside: `<div class="pg-casevis">${pv(p)}</div>`,
    actions: btn('Discuss something like this', hireHref(b, p.primarySvc.slug), { v: 'solid', size: 'lg' }) + btn('All projects', b + 'projects/', { v: 'ghost', size: 'lg', icon: 'arrow-left' }),
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
    id: 'at-a-glance', eyebrow: 'At a glance', title: `Key <span class="hl">facts</span>`, tint: alt(),
    body: `<div class="pg-glance">
      <dl class="panel pg-facts" data-tone="${p.tone}" data-reveal>${facts.map(([k, v]) => `<div class="pg-facts__row"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}
        <div class="pg-facts__row"><dt>Stack</dt><dd>${tags(p.stack, { tone: p.tone, label: 'Stack used in this build', cls: 'pg-facts__tags' })}</dd></div>
      </dl>
      ${metrics.length ? `<ul class="pg-metrics" role="list" data-reveal-group>${metrics.map((m, i) => `<li class="pg-metric" data-tone="${p.tone}" style="--i:${i}"><span class="pg-metric__v">${esc(m.value)}</span><span class="pg-metric__l">${esc(m.label)}</span></li>`).join('')}</ul>` : ''}
    </div>`,
  });
  jump.push(['at-a-glance', 'Key facts']);

  /* why it matters (business context) */
  const overview = (cs.context || []).length ? section({
    id: 'overview', eyebrow: 'Overview', title: ttl(h2.context, 'Why this <span class="hl hl--blue">matters</span>', 'hl--blue'), tint: alt(),
    body: `<div class="panel pg-context" data-tone="${p.tone}" data-reveal>${cs.context.map(t => `<p>${esc(t)}</p>`).join('')}</div>`,
  }) : '';
  if (overview) jump.push(['overview', 'Overview']);

  /* the problem, what I built, and what made it hard */
  const challenges = (cs.challenges || []).length ? `<h3 class="pg-subh" data-reveal>What made it hard</h3>
      <ol class="pg-challenges" data-reveal-group>${cs.challenges.map((c, i) => `<li class="pg-challenge" data-tone="${p.tone}" style="--i:${Math.min(i, 5)}"><span class="pg-challenge__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><div><h4 class="pg-challenge__t">${esc(c.title)}</h4><p>${esc(c.text)}</p></div></li>`).join('')}</ol>` : '';
  const story = section({
    id: 'story', eyebrow: 'The story', title: ttl(h2.story, 'Problem and <span class="hl hl--purple">approach</span>', 'hl--purple'), tint: alt(),
    body: `<div class="pg-two">
      <div class="panel" data-tone="${p.tone}" data-reveal><h3 class="pg-panel__h">The problem</h3><p>${esc(cs.problem)}</p></div>
      <div class="panel" data-tone="${p.tone}" data-reveal style="--i:1"><h3 class="pg-panel__h">What I built</h3><p>${esc(cs.approach)}</p></div>
    </div>
    ${challenges}`,
  });
  jump.push(['story', 'The problem']);

  /* my role: what I did, and the context around it (who else built what, what already existed) */
  const scope = cs.scope ? section({
    id: 'my-role', eyebrow: 'My role', title: ttl(h2.scope, 'My role in <span class="hl hl--magenta">the build</span>', 'hl--magenta'), tint: alt(),
    body: `<div class="pg-two">
      <div class="panel" data-tone="${p.tone}" data-reveal><h3 class="pg-panel__h">${ico('code', 'icon--sm')} My part</h3><ul class="dot-list">${cs.scope.owned.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="panel" data-tone="blue" data-reveal style="--i:1"><h3 class="pg-panel__h">${ico('layers', 'icon--sm')} Context and credits</h3><ul class="dot-list">${cs.scope.context.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    </div>`,
  }) : '';
  if (scope) jump.push(['my-role', 'My role']);

  /* how it works: the pipeline at a glance, then the numbered detail */
  const arch = section({
    id: 'how-it-works', eyebrow: 'How it is built', title: ttl(h2.arch, 'How it <span class="hl hl--blue">works</span>', 'hl--blue'), tint: alt(),
    body: `${(cs.flow || []).length ? flowDiagram(cs.flow, p.tone) : ''}
    <ol class="pg-arch" data-reveal-group>${cs.architecture.map((x, i) => `<li class="pg-arch__item" data-tone="${p.tone}" style="--i:${Math.min(i, 5)}"><span class="pg-arch__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><p>${esc(x)}</p></li>`).join('')}</ol>`,
  });
  jump.push(['how-it-works', 'How it works']);

  /* design decisions (and, when documented, a first attempt that changed) */
  const decisions = (cs.decisions || []).length ? section({
    id: 'decisions', eyebrow: 'Decisions', title: ttl(h2.decisions, 'Design decisions and <span class="hl hl--purple">trade-offs</span>', 'hl--purple'), tint: alt(),
    body: `<ul class="pg-decisions" role="list" data-reveal-group>${cs.decisions.map((d, i) => `<li class="pg-decision" data-tone="${p.tone}" style="--i:${Math.min(i, 5)}"><h3 class="pg-decision__t">${esc(d.title)}</h3><p class="pg-decision__row"><span class="pg-decision__k">Choice</span>${esc(d.choice)}</p><p class="pg-decision__row"><span class="pg-decision__k">Why</span>${esc(d.why)}</p></li>`).join('')}</ul>
    ${cs.iteration ? `<div class="panel pg-iteration" data-tone="magenta" data-reveal><h3 class="pg-panel__h">${ico('git-branch', 'icon--sm')} What I tried first, and what changed</h3><p><strong>First attempt.</strong> ${esc(cs.iteration.tried)}</p><p><strong>What changed.</strong> ${esc(cs.iteration.changed)}</p></div>` : ''}`,
  }) : '';
  if (decisions) jump.push(['decisions', 'Decisions']);

  /* results and honest limits */
  const results = section({
    id: 'results', eyebrow: 'Results', title: ttl(h2.results, 'What it <span class="hl hl--magenta">showed</span>', 'hl--magenta'), tint: alt(),
    lead: 'Every number comes with how it was measured. The limits are part of the result.',
    body: `<div class="${(cs.limits || []).length ? 'pg-two' : ''}">
      <div class="panel" data-tone="${p.tone}" data-reveal><h3 class="pg-panel__h">${ico('circle-check', 'icon--sm')} Results</h3><ul class="dot-list pg-results">${cs.results.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      ${(cs.limits || []).length ? `<div class="panel" data-tone="blue" data-reveal style="--i:1"><h3 class="pg-panel__h">${ico('info', 'icon--sm')} Limits to keep in mind</h3><ul class="dot-list pg-results">${cs.limits.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    </div>`,
  });
  jump.push(['results', 'Results']);

  /* where the same kind of solution fits in a business */
  const uses = (cs.use_cases || []).length ? section({
    id: 'where-it-fits', eyebrow: 'In a business', title: ttl(h2.uses, 'Where this kind of solution <span class="hl hl--blue">fits</span>', 'hl--blue'), tint: alt(),
    lead: 'Situations where a team could use the same approach. These are examples, not past clients.',
    body: `<ul class="pg-uses" role="list" data-reveal-group>${cs.use_cases.map((u, i) => `<li class="pg-use" data-tone="${['cyan', 'purple', 'blue', 'magenta'][i % 4]}" style="--i:${i % 4}"><h3 class="pg-use__who">${esc(u.who)}</h3><p>${esc(u.need)}</p></li>`).join('')}</ul>`,
  }) : '';
  if (uses) jump.push(['where-it-fits', 'Where it fits']);

  const ext = section({
    id: 'extensions', eyebrow: 'Next steps beyond', title: ttl(h2.ext, 'Extensions I can build <span class="hl">for you</span>'), tint: alt(),
    lead: 'Not part of this project. These are further pieces I could build on top of it.',
    body: `<ul class="grid grid--c3 pg-ext pg-ext--n${(p.extensions || []).length}" role="list">${(p.extensions || []).map((e, i) => `<li class="pg-ext__item" data-reveal style="--i:${i % 3}"><article class="card card--flat pg-ext__card" data-tone="${p.tone}"><h3 class="pg-ext__t">${esc(e.title)}</h3><p>${esc(e.benefit)}</p>${tags(e.tech || [], { cls: 'pg-ext__tags', label: 'Possible tools', itemCls: 'tag--dashed' })}</article></li>`).join('')}</ul>`,
  });
  jump.push(['extensions', 'Extensions']);

  const svcCards = section({
    id: 'hire-for', eyebrow: 'What I offer', title: `Services behind <span class="hl hl--purple">this project</span>`, tint: alt(),
    body: `<ul class="pg-rel" role="list" data-reveal-group>${p.svc.map(x => `<li><a class="pg-rel__link" href="${b}${x.path}" data-tone="${x.tone}"><span class="icon-tile">${ico(x.icon)}</span><span><strong>${esc(anchors(x.path).hire || x.name)}</strong><span class="pg-rel__t">${esc(x.blurb)}</span></span>${ico('arrow-right', 'pg-rel__go')}</a></li>`).join('')}</ul>
    <p class="pg-author" data-reveal>Built by <a class="link" href="${b}about/">Shaunak Chorge</a>, AI Engineer.</p>`,
  });

  const faqItems = (p.faq || []).map((f, i) => ({ id: `q${i + 1}`, q: f.q, a: f.a }));
  const faq = faqItems.length ? section({
    id: 'faq', eyebrow: 'FAQ', title: ttl(h2.faq, 'Questions about <span class="hl">this project</span>'), tint: alt(),
    body: qaList(faqItems, { idPrefix: p.id }),
  }) : '';
  if (faq) jump.push(['faq', 'FAQ']);

  /* related case studies, chosen by business need (reason line on each card), then previous / next in priority order */
  const rel = (cs.related || []).map(r => ({ p: projectModel[r.id], reason: r.reason })).filter(r => r.p && r.p.hasCase);
  const related = rel.length ? section({
    id: 'related', eyebrow: 'More case studies', title: ttl(h2.related, 'Related case studies by <span class="hl hl--purple">business need</span>', 'hl--purple'), tint: alt(),
    body: `${relatedCards(rel.map(r => ({ ...r, href: b + r.p.path, label: anchors(r.p.path).related || r.p.title })), { b })}
    <p class="pg-linkrow" data-reveal><a class="link-arrow" href="${b}projects/#by-need">Browse all work by business need ${ico('arrow-right')}</a><a class="link-arrow" href="${b}projects/">All projects ${ico('arrow-right')}</a></p>`,
  }) : '';
  if (related) jump.push(['related', 'Related']);

  const prev = caseStudies[(idx - 1 + caseStudies.length) % caseStudies.length];
  const next = caseStudies[(idx + 1) % caseStudies.length];
  const pn = caseStudies.length > 1 ? `<section class="section pg-sec pg-pnsec" aria-label="More case studies"><div class="container"><nav class="pg-pn" aria-label="More case studies">
      <a class="pg-pn__link" href="${b}${prev.path}" rel="prev" data-reveal>${ico('arrow-left')}<span><small>Previous case study</small><strong>${esc(anchors(prev.path).related || prev.title)}</strong></span></a>
      <a class="pg-pn__link pg-pn__link--next" href="${b}${next.path}" rel="next" data-reveal style="--i:1"><span><small>Next case study</small><strong>${esc(anchors(next.path).related || next.title)}</strong></span>${ico('arrow-right')}</a>
    </nav></div></section>` : '';

  const ask = askBox({ b, ref: p.path, about: p.title, topic: p.primarySvc.slug, prompts: cs.ask_prompts || [], title: 'Have a question about this project, or your own idea?' });
  jump.push(['ask', 'Ask a question']);

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
    webPage(url, title, description, { mainEntity: { '@id': url + '#project' }, ...(rel.length ? { relatedLink: rel.map(r => abs(cfg, r.p.path)) } : {}) }),
    work,
    crumbNode(url, crumbItems),
    personMini(),
  ];
  if (faqItems.length) nodes.push(faqNode(url, faqItems));
  const tail = hireBand({ b, heading: 'Need something <span class="hl">like this built,</span> or have a project?', text: CTA_TEXT, topic: p.primarySvc.slug, cta: "Let's talk" });
  return {
    path: p.path, current: 'projects', title, description, og_type: 'article', jsonld: ctx(nodes),
    content: head + toc(jump) + glance + overview + story + scope + arch + decisions + results + uses + ext + svcCards + faq + related + pn + ask + tail,
    llms: {
      heading: cs.seo.h1, url, desc: description,
      text: [cs.summary,
        ...(cs.context || []),
        'Problem: ' + cs.problem,
        ...(cs.challenges || []).length ? ['What made it hard: ' + cs.challenges.map(c => `${c.title}. ${c.text}`).join(' ')] : [],
        'Approach: ' + cs.approach,
        ...(cs.scope ? ['My part: ' + cs.scope.owned.join(' '), 'Context: ' + cs.scope.context.join(' ')] : []),
        'Architecture: ' + cs.architecture.join('; ') + '.',
        ...(cs.decisions || []).length ? ['Design decisions: ' + cs.decisions.map(d => `${d.title}. ${d.choice} ${d.why}`).join(' ')] : [],
        ...(cs.iteration ? ['First attempt: ' + cs.iteration.tried + ' What changed: ' + cs.iteration.changed] : []),
        'Results: ' + cs.results.join('; ') + '.',
        ...(cs.limits || []).length ? ['Limits: ' + cs.limits.join(' ')] : [],
        ...(cs.use_cases || []).length ? ['Where this fits: ' + cs.use_cases.map(u => `${u.who}: ${u.need}`).join(' ')] : [],
        'Role: ' + p.role,
        'Extensions I can build for you (not part of this build): ' + (p.extensions || []).map(e => e.title).join('; ') + '.',
        ...faqItems.map(f => `Q: ${f.q} A: ${f.a}`)],
    },
  };
}

export function build() {
  return [hub(), ...caseStudies.map((p, i) => casePage(p, i))];
}
