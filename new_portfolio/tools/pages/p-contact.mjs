// p-contact.mjs - /contact/ : "Hire me" page. Four quick ways to connect, then ONE panel with two ways to start (send a brief, or book a call) and the direct channels beside it.
// Form ids / data attributes match assets/js/sections/contact.js and contact-form.js (brief) and booking.js (the call picker): validation, honeypot, Formspree POST, success panel.
import { cfg, abs, services, pagesMeta, faqFor, EMAIL, FREELANCE_LINE } from './data.mjs';
import { esc, ico, pageHead, section, qaList, title as ttl, ctx, crumbNode, personMini, webPage, faqNode, PERSON_ID, contactForm, contactList, connectStrip, bookingPanel, TYPE_LABELS } from './ui.mjs';

const STEPS = [
  { step: 'Send a brief', detail: 'What you want to build, roughly when you need it and anything I should know.' },
  { step: 'I reply', detail: 'With my view on feasibility and a proposed scope.' },
  { step: 'Agree the plan', detail: 'We settle the plan and a suitable deadline together before any work begins.' },
  { step: 'Build and hand over', detail: 'A small working prototype on your data, then tests, notes and a walkthrough.' },
];

// the contact page questions: the faq_all groups with page "contact" (each question lives on one page only)

function page() {
  const m = pagesMeta.contact;
  const b = '../';
  const url = abs(cfg, m.path);
  const crumbItems = [{ name: 'Home', path: '' }, { name: 'Contact', path: m.path }];
  const head = pageHead({
    crumbItems, b, eyebrow: 'Hire me', h1: esc(m.h1), answer: m.direct_answer,
    actions: `<p class="badge badge--accent"><span class="badge__dot" aria-hidden="true"></span>${esc(FREELANCE_LINE)}</p>`,
  });

  const quick = `<section class="section pg-sec pg-quick" aria-label="Quick ways to connect"><div class="container">${connectStrip(b)}</div></section>`;

  const checklist = m.brief_checklist.map(x => x.replace(/^Anything I should know:\s*/i, ''));
  const template = ['# brief.md', '', 'what:        ' + checklist[0], 'when:        ' + checklist[1], 'notes:       ' + checklist[2], 'tried:       ' + checklist[3]].join('\n');
  const mailto = `mailto:${EMAIL}?subject=${encodeURIComponent('Project brief')}&body=${encodeURIComponent(template.replace('# brief.md\n\n', ''))}`;

  const opts = services.map(s => `<option value="${s.slug}">${esc(TYPE_LABELS[s.slug] || s.name)}</option>`).join('');
  const form = contactForm({
    heading: 'h2', title: 'Send a short brief', wrapCls: 'pg-formwrap', rows: 6, typeOptions: opts,
    note: `${m.note} Name, email and a few lines are enough. Messages are delivered through Formspree, a form service, and I only use your details to reply.`,
    subject: 'New project brief from the portfolio', placeholder: 'What do you want to build, and when do you need it?',
  });

  const brief = `<div class="pg-brief" data-reveal>
        <div class="pg-term pg-term--brief">
          <div class="pg-term__bar" aria-hidden="true"><i></i><i></i><i></i><span>brief.md</span></div>
          <div class="pg-term__body">
            <dl class="pg-brief__kv" id="brief-template">${['what','when','notes','tried'].map((k,i)=>`<div><dt>${k}:</dt><dd>${esc(checklist[i])}</dd></div>`).join('')}</dl>
            <div class="pg-brief__act">
              <button type="button" class="btn btn--ghost btn--sm pg-needs-js" data-copy-brief="#brief-template" data-copy-text="${esc(template)}">${ico('copy', 'icon--still')} <span class="pg-brief__lbl">Copy template</span></button>
              <a class="btn btn--ghost btn--sm" href="${mailto}">Open in email ${ico('mail', 'icon--still')}</a>
            </div>
          </div>
        </div>
      </div>`;

  const channels = `<div class="pg-channels" data-reveal>
        <h3 class="contact__h">Or reach me directly</h3>
        ${contactList({ location: true, b })}
      </div>`;

  /* one panel, two ways to start: pages.js turns the two tab buttons on (without JavaScript both panels are shown one after the other) */
  const tabs = `<div class="pg-tabs pg-needs-js" role="tablist" aria-label="How would you like to start?" data-tabs>
          <button class="pg-tab" role="tab" type="button" id="tab-brief" aria-controls="brief-panel" aria-selected="true" data-tab="brief">${ico('send', 'icon--sm icon--still')} Send a brief</button>
          <button class="pg-tab" role="tab" type="button" id="tab-book" aria-controls="book" aria-selected="false" tabindex="-1" data-tab="book">${ico('calendar', 'icon--sm icon--still')} Book a call</button>
        </div>`;
  const hire = `<section id="hire" class="section pg-sec pg-hirebox" aria-label="Send a brief or book a call">
  <div class="container">
    <div class="pg-contact">
      <div class="pg-contact__form">
        ${tabs}
        <div class="pg-contact__panels" data-tabpanels>
          <div class="pg-contact__panel" id="brief-panel">${form}</div>
          ${bookingPanel()}
        </div>
      </div>
      <div class="pg-contact__side">${brief}${channels}</div>
    </div>
  </div>
</section>`;

  const process = section({
    id: 'process', eyebrow: 'What happens next', title: ttl(m.h2 && m.h2.process, 'How a project <span class="hl hl--purple">starts</span>', 'hl--purple'), tint: true,
    body: `<ol class="pg-steps" data-reveal-group>${STEPS.map((s, i) => `<li class="pg-step" style="--i:${i}"><span class="pg-step__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h3 class="pg-step__t">${esc(s.step)}</h3><p>${esc(s.detail)}</p></li>`).join('')}</ol>`,
  });

  const faqItems = faqFor('contact');
  const faq = section({
    id: 'faq', eyebrow: 'FAQ', title: ttl(m.h2 && m.h2.faq, 'Quick <span class="hl">answers</span>'),
    body: qaList(faqItems, { idPrefix: 'cq' }) + `<p class="pg-linkrow" data-reveal><a class="link-arrow" href="${b}faq/">Read all the questions ${ico('arrow-right')}</a><a class="link-arrow" href="${b}services/">See the services ${ico('arrow-right')}</a></p>`,
  });

  const close = `<section class="section pg-sec pg-closing" aria-label="Prefer email"><div class="container"><p class="pg-closing__p" data-reveal>Prefer to write directly? Email <a class="link" href="mailto:${EMAIL}">${EMAIL}</a> or <a class="link" href="#hire">go back to the form</a>.</p></div></section>`;

  const jsonld = ctx([
    webPage(url, m.title, m.description, {
      '@type': 'ContactPage', mainEntity: { '@id': PERSON_ID },
      potentialAction: { '@type': 'ReserveAction', name: 'Book a call', target: { '@type': 'EntryPoint', urlTemplate: url + '#book', actionPlatform: ['http://schema.org/DesktopWebPlatform', 'http://schema.org/MobileWebPlatform'] }, result: { '@type': 'Reservation', name: 'Call with Shaunak Chorge' } },
    }),
    { ...personMini(), email: 'mailto:' + EMAIL },
    crumbNode(url, crumbItems),
    faqNode(url, faqItems),
  ]);
  return {
    path: m.path, current: 'contact', title: m.title, description: m.description, jsonld,
    content: head + quick + hire + process + faq + close,
    llms: { heading: m.h1, url, desc: m.description, text: [m.direct_answer, m.lead, 'Ways to start: send a brief, or book a call (pick a day and time; I confirm by email), or message me on WhatsApp or email.', 'Send a brief: ' + checklist.join('; ') + '.', m.note, `Email: ${EMAIL}`, ...faqItems.map(f => `Q: ${f.q} A: ${f.a}`)] },
  };
}

export function build() { return [page()]; }
