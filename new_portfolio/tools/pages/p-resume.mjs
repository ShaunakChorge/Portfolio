// p-resume.mjs - /resume/ (HTML resume + PDF download, ProfilePage). Employment / education dates are resume facts (only PROJECT years are banned).
import {
  cfg, abs, CTA_TEXT, experience, education, certifications, achievements, profile, pagesMeta, resumeProjects, RESUME_PDF, EMAIL, GITHUB, LINKEDIN,
} from './data.mjs';
import {
  esc, ico, tags, btn, pageHead, section, hireBand, hireHref, qaList,
  ctx, crumbNode, webPage, faqNode, PERSON_ID,
} from './ui.mjs';
import { certList, awardList, stackTiers } from './p-about.mjs';

const WORK_TONE = ['cyan', 'blue', 'purple'];

function page() {
  const m = pagesMeta.resume;
  const b = '../';
  const url = abs(cfg, m.path);
  const crumbItems = [{ name: 'Home', path: '' }, { name: 'Resume', path: m.path }];
  const head = pageHead({
    crumbItems, b, eyebrow: 'Resume', h1: esc(m.h1), lead: m.lead,
    answer: m.direct_answer,
    actions: `<a class="btn btn--solid btn--lg btn--glow" href="${b}${RESUME_PDF}" download="Shaunak-Chorge-Resume.pdf">Download PDF ${ico('download', 'icon--still')}</a>` + btn('Hire me', hireHref(b), { v: 'ghost', size: 'lg' }),
  });

  const work = experience.filter(e => e.group === 'work');
  const prog = experience.filter(e => e.group !== 'work');
  const job = (e, i) => `<article class="pg-job" data-tone="${WORK_TONE[i % 3]}" data-reveal>
        <header class="pg-job__head"><h3 class="pg-job__t">${esc(e.role)}</h3><p class="pg-job__org">${esc(e.org)}</p><p class="pg-job__meta">${esc(e.period)}${e.location ? ` &middot; ${esc(e.location)}` : ''}</p></header>
        <ul class="dot-list pg-job__list" data-tone="${WORK_TONE[i % 3]}">${e.bullets.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        ${tags(e.tags, { tone: WORK_TONE[i % 3], cls: 'pg-job__tags', label: 'Tools' })}
      </article>`;
  const exp = section({
    id: 'experience', eyebrow: 'Experience', title: `Work <span class="hl">experience</span>`,
    body: `<div class="pg-jobs">${work.map(job).join('')}</div>
    <details class="pg-morebox pg-morebox--sm" data-reveal>
      <summary class="pg-morebox__sum"><span>Earlier internships and programmes (${prog.length})</span>${ico('chevron-down', 'pg-morebox__chev')}</summary>
      <ul class="pg-more" role="list">${prog.map(e => `<li class="pg-more__row"><div><p class="pg-more__t">${esc(e.role)}, ${esc(e.org)}</p><p class="pg-more__d">${esc(e.period)}${e.bullets.length ? ' &middot; ' + esc(e.bullets.join(' ')) : ''}</p></div></li>`).join('')}</ul>
    </details>`,
  });

  const edu = education.filter(e => !e.minor)[0];
  const minor = education.filter(e => e.minor);
  const eduSec = section({
    id: 'education', eyebrow: 'Education', title: `<span class="hl hl--purple">Education</span>`, tint: true,
    body: `<div class="pg-two">
      <div class="panel" data-tone="cyan" data-reveal><h3 class="pg-panel__h">${esc(edu.degree)}</h3><p class="pg-plain__t">${esc(edu.institution)}</p><p class="pg-plain__s">${esc(edu.period)}</p>
        ${tags(edu.coursework, { tone: 'cyan', cls: 'pg-cred__tags', label: 'Coursework' })}</div>
      <div class="panel" data-tone="blue" data-reveal style="--i:1"><h3 class="pg-panel__h">Earlier schooling</h3>
        <ul class="pg-plain" role="list">${minor.map(e => `<li><span class="pg-plain__t">${esc(e.institution)}</span><span class="pg-plain__s">${esc(e.degree)}, ${esc(e.period)}</span></li>`).join('')}</ul></div>
    </div>`,
  });

  const cred = section({
    id: 'credentials', eyebrow: 'Credentials', title: `Certifications and <span class="hl hl--magenta">awards</span>`,
    body: `<div class="pg-two">
      <div class="panel" data-tone="purple" data-reveal><h3 class="pg-panel__h">${ico('award', 'icon--sm')} Certifications</h3>${certList()}</div>
      <div class="panel" data-tone="magenta" data-reveal style="--i:1"><h3 class="pg-panel__h">${ico('trophy', 'icon--sm')} Awards</h3>${awardList()}</div>
    </div>`,
  });

  const skillsSec = section({
    id: 'skills', eyebrow: 'Skills', title: `Skills and <span class="hl hl--blue">tools</span>`, tint: true,
    body: stackTiers(),
  });

  const feat = resumeProjects;
  const proj = feat.length ? section({
    id: 'projects', eyebrow: 'Selected projects', title: `Projects <span class="hl hl--magenta">worth a read</span>`,
    body: `<ul class="pg-rel" role="list" data-reveal-group>${feat.map(p => `<li><a class="pg-rel__link" href="${b}${p.path}" data-tone="${esc(p.tone)}"><span class="icon-tile">${ico('folder')}</span><span><strong>${esc(p.title)}</strong><span class="pg-rel__t">${esc(p.card_blurb)}</span></span>${ico('arrow-right', 'pg-rel__go')}</a></li>`).join('')}</ul>
    <p class="pg-linkrow" data-reveal><a class="link-arrow" href="${b}projects/">All projects ${ico('arrow-right')}</a><a class="link-arrow" href="${b}services/">Freelance services ${ico('arrow-right')}</a></p>`,
  }) : '';

  const faqItems = (m.faqs || []).map((f, i) => ({ id: `q${i + 1}`, q: f.q, a: f.a }));
  const faq = faqItems.length ? section({
    id: 'faq', eyebrow: 'FAQ', title: 'Quick <span class="hl">answer</span>',
    body: qaList(faqItems, { idPrefix: 'resume', openFirst: true }),
  }) : '';

  const contact = `<p class="pg-resume-contact" data-reveal><a class="link" href="mailto:${EMAIL}">${EMAIL}</a><span aria-hidden="true"> &middot; </span><a class="link" href="${LINKEDIN}" target="_blank" rel="noopener noreferrer">LinkedIn<span class="sr-only"> (opens in a new tab)</span></a><span aria-hidden="true"> &middot; </span><a class="link" href="${GITHUB}" target="_blank" rel="noopener noreferrer">GitHub<span class="sr-only"> (opens in a new tab)</span></a><span aria-hidden="true"> &middot; </span>Mumbai, India</p>`;

  const jsonld = ctx([
    webPage(url, m.title, m.description, { '@type': 'ProfilePage', mainEntity: { '@id': PERSON_ID } }),
    { '@type': 'Person', '@id': PERSON_ID, name: cfg.name, url: cfg.url, jobTitle: cfg.person.jobTitle, email: 'mailto:' + EMAIL, worksFor: { '@type': 'Organization', name: cfg.person.employer }, sameAs: cfg.sameAs },
    crumbNode(url, crumbItems),
    ...(faqItems.length ? [faqNode(url, faqItems)] : []),
  ]);
  return {
    path: m.path, current: 'resume', title: m.title, description: m.description, jsonld,
    content: head + `<div class="container pg-resume-top">${contact}</div>` + exp + eduSec + cred + skillsSec + proj + faq +
      hireBand({ b, heading: 'Hiring, or have <span class="hl">a project?</span>', text: CTA_TEXT }),
    llms: {
      heading: 'Resume', url, desc: m.description,
      text: [m.direct_answer, 'Roles: ' + work.map(e => `${e.role} at ${e.org}`).join('; ') + '.', 'Certifications: ' + certifications.map(c => `${c.name} (${c.issuer})`).join('; ') + '.', 'Awards: ' + achievements.map(a => a.title).join('; ') + '.', ...faqItems.map(f => `Q: ${f.q} A: ${f.a}`)],
    },
  };
}

export function build() { return [page()]; }
