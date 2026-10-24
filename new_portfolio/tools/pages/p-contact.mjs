// p-contact.mjs - /contact/ : "Hire me" page. Form ids / data attributes match assets/js/sections/contact.js (validation, honeypot, Formspree POST, success panel).
import {
  cfg, abs, services, pagesMeta, faqShort, profile, EMAIL, PHONE_TEL, PHONE_TEXT, GITHUB, LINKEDIN, FREELANCE_LINE,
} from './data.mjs';
import { esc, ico, btn, pageHead, section, hireBand, qaList, ctx, crumbNode, personMini, webPage, PERSON_ID } from './ui.mjs';

const STEPS = [
  { step: 'Send a brief', detail: 'What you want to build, roughly when you need it and anything I should know.' },
  { step: 'I reply', detail: 'With my view on feasibility and a proposed scope.' },
  { step: 'Agree the scope', detail: 'No code is written until we both agree on it.' },
  { step: 'Build and hand over', detail: 'A small working prototype on your data, then tests, notes and a walkthrough.' },
];

const TYPE_LABEL = {
  'llm-rag-development': 'AI chatbot or document assistant',
  'ai-document-compliance-automation': 'Document AI or data extraction',
  'ai-backend-fastapi-django': 'Python backend or API',
  'computer-vision': 'Computer vision',
  'speech-nlp-ml': 'Speech, text or machine learning',
  'python-automation-integrations': 'Automation, bot or integration',
};

function page() {
  const m = pagesMeta.contact;
  const b = '../';
  const url = abs(cfg, m.path);
  const crumbItems = [{ name: 'Home', path: '' }, { name: 'Contact', path: m.path }];
  const head = pageHead({
    crumbItems, b, eyebrow: 'Hire me', h1: esc(m.h1), lead: m.lead,
    actions: `<p class="badge badge--accent"><span class="badge__dot" aria-hidden="true"></span>${esc(FREELANCE_LINE)}</p>`,
  });

  const checklist = m.brief_checklist.map(x => x.replace(/^Anything I should know:\s*/i, ''));
  const template = ['# brief.md', '', 'what:        ' + checklist[0], 'when:        ' + checklist[1], 'notes:       ' + checklist[2], 'tried:       ' + checklist[3]].join('\n');
  const mailto = `mailto:${EMAIL}?subject=${encodeURIComponent('Project brief')}&body=${encodeURIComponent(template.replace('# brief.md\n\n', ''))}`;

  const opts = services.map(s => `<option value="${s.slug}">${esc(TYPE_LABEL[s.slug] || s.name)}</option>`).join('');
  const form = `<div class="contact__formwrap panel pg-formwrap" id="contact-form-panel" data-tone="cyan" data-reveal>
        <div class="contact__compose" data-compose>
          <div class="contact__sub">
            <h2 class="contact__h" id="cf-title">Send a short brief</h2>
            <p class="contact__note">${esc(m.note)} Name, email and a few lines are enough. Messages are delivered through Formspree, a form service, and I only use your details to reply.</p>
          </div>
          <form class="contact__form" id="contact-form" action="${profile.links.formspree}" method="POST" data-email="${EMAIL}" aria-labelledby="cf-title">
            <input type="hidden" name="_subject" value="New project brief from the portfolio">
            <div class="contact__pair">
              <div class="field" data-field="name">
                <label for="cf-name">Name</label>
                <input class="input" id="cf-name" name="name" type="text" autocomplete="name" autocapitalize="words" enterkeyhint="next" maxlength="80" required placeholder="Your name" aria-describedby="cf-name-err">
                <span class="field__error" id="cf-name-err" aria-live="polite"><span class="field__error-in">${ico('circle-alert', 'icon--sm')}<span class="field__msg"></span></span></span>
              </div>
              <div class="field" data-field="email">
                <label for="cf-email">Email</label>
                <input class="input" id="cf-email" name="email" type="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" enterkeyhint="next" maxlength="120" required placeholder="you@example.com" aria-describedby="cf-email-err">
                <span class="field__error" id="cf-email-err" aria-live="polite"><span class="field__error-in">${ico('circle-alert', 'icon--sm')}<span class="field__msg"></span></span></span>
              </div>
            </div>
            <div class="field" data-field-type>
              <label for="cf-type">Project type</label>
              <select class="input" id="cf-type" name="project_type">
                <option value="">Choose one (optional)</option>
                ${opts}
                <option value="other">Something else</option>
              </select>
            </div>
            <div class="field" data-field="message">
              <div class="contact__labelrow">
                <label class="label" for="cf-message">Message</label>
                <span class="contact__count" id="cf-count" aria-hidden="true">0 / 2000</span>
              </div>
              <textarea class="input" id="cf-message" name="message" rows="6" maxlength="2000" required placeholder="What do you want to build, and when do you need it?" aria-describedby="cf-message-err"></textarea>
              <span class="field__error" id="cf-message-err" aria-live="polite"><span class="field__error-in">${ico('circle-alert', 'icon--sm')}<span class="field__msg"></span></span></span>
            </div>
            <div class="hp" aria-hidden="true" inert><label for="cf-website">Leave this field empty</label><input id="cf-website" type="text" name="_gotcha" tabindex="-1" autocomplete="off"></div>
            <div class="contact__fail" id="cf-fail" role="alert" hidden>
              ${ico('triangle-alert', 'icon--lg contact__fail-icon')}
              <div class="contact__fail-body">
                <p class="contact__fail-title" id="cf-fail-title">Message not sent</p>
                <p class="contact__fail-text" id="cf-fail-text">Something went wrong on the way. Your text is still in the form, so you can try again, or email me directly.</p>
                <a class="btn btn--sm btn--magenta" id="cf-fail-mail" href="mailto:${EMAIL}">Email me instead ${ico('mail', 'icon--still')}</a>
              </div>
            </div>
            <div class="contact__submit">
              <button class="btn btn--solid btn--lg" id="cf-submit" type="submit"><span class="contact__submit-label">Send message</span>${ico('send', 'icon--still')}</button>
              <p class="form-status contact__status" id="cf-status" role="status" aria-live="polite"></p>
            </div>
          </form>
        </div>
        <div class="contact__done" id="cf-done" role="status" tabindex="-1" hidden>
          <span class="contact__done-icon" aria-hidden="true">${ico('check', 'icon--xl')}</span>
          <h3 class="contact__h">Message sent</h3>
          <p class="contact__note">Thanks<span id="cf-done-name"></span>. I will reply to <strong id="cf-done-email">your address</strong> as soon as I can.</p>
          <button class="btn btn--ghost" id="cf-again" type="button">Send another message</button>
        </div>
      </div>`;

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
        <ul class="contact__list">
          <li class="contact__row contact__row--copy" data-tone="cyan">
            <span class="icon-tile contact__icon" aria-hidden="true">${ico('mail')}</span>
            <div class="contact__meta"><span class="contact__label">Email</span><a class="contact__value" id="contact-email" href="mailto:${EMAIL}">${EMAIL}</a></div>
            <button class="contact__copy" type="button" data-copy="${EMAIL}" aria-label="Copy email address">${ico('copy', 'icon--sm')}<span class="contact__copy-text">Copy</span></button>
          </li>
          <li class="contact__row" data-tone="green">
            <span class="icon-tile contact__icon" aria-hidden="true">${ico('phone')}</span>
            <div class="contact__meta"><span class="contact__label">Phone</span><a class="contact__value" href="${PHONE_TEL}">${PHONE_TEXT}</a></div>
            ${ico('arrow-up-right', 'contact__go')}
          </li>
          <li class="contact__row" data-tone="blue">
            <span class="icon-tile contact__icon" aria-hidden="true">${ico('linkedin')}</span>
            <div class="contact__meta"><span class="contact__label">LinkedIn</span><a class="contact__value" href="${LINKEDIN}" target="_blank" rel="noopener noreferrer">linkedin.com/in/shaunak-chorge<span class="sr-only"> (opens in a new tab)</span></a></div>
            ${ico('arrow-up-right', 'contact__go')}
          </li>
          <li class="contact__row" data-tone="purple">
            <span class="icon-tile contact__icon" aria-hidden="true">${ico('github')}</span>
            <div class="contact__meta"><span class="contact__label">GitHub</span><a class="contact__value" href="${GITHUB}" target="_blank" rel="noopener noreferrer">github.com/ShaunakChorge<span class="sr-only"> (opens in a new tab)</span></a></div>
            ${ico('arrow-up-right', 'contact__go')}
          </li>
          <li class="contact__row contact__row--static" data-tone="cyan">
            <span class="icon-tile contact__icon" aria-hidden="true">${ico('map-pin')}</span>
            <div class="contact__meta"><span class="contact__label">Based in</span><span class="contact__value">Mumbai, India &middot; <span data-clock="Asia/Kolkata" data-clock-label="Local time" data-clock-suffix="IST">IST</span></span></div>
          </li>
        </ul>
      </div>`;

  const hire = `<section id="hire" class="section pg-sec pg-hirebox" aria-label="Send a brief">
  <div class="container">
    <div class="pg-contact">
      <div class="pg-contact__form">${form}</div>
      <div class="pg-contact__side">${brief}${channels}</div>
    </div>
  </div>
</section>`;

  const process = section({
    id: 'process', eyebrow: 'What happens next', title: `How a project <span class="hl hl--purple">starts</span>`, tint: true,
    body: `<ol class="pg-steps" data-reveal-group>${STEPS.map((s, i) => `<li class="pg-step" style="--i:${i}"><span class="pg-step__n" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><h3 class="pg-step__t">${esc(s.step)}</h3><p>${esc(s.detail)}</p></li>`).join('')}</ol>`,
  });

  const faq = section({
    id: 'faq', eyebrow: 'FAQ', title: `Quick <span class="hl">answers</span>`,
    body: qaList(faqShort, { idPrefix: 'cq' }) + `<p class="pg-linkrow" data-reveal><a class="link-arrow" href="${b}faq/">Read all the questions ${ico('arrow-right')}</a><a class="link-arrow" href="${b}services/">See the services ${ico('arrow-right')}</a></p>`,
  });

  const close = `<section class="section pg-sec pg-closing" aria-label="Prefer email"><div class="container"><p class="pg-closing__p" data-reveal>Prefer to write directly? Email <a class="link" href="mailto:${EMAIL}">${EMAIL}</a> or <a class="link" href="#hire">go back to the form</a>.</p></div></section>`;

  const jsonld = ctx([
    webPage(url, m.title, m.description, { '@type': 'ContactPage', mainEntity: { '@id': PERSON_ID } }),
    { ...personMini(), email: 'mailto:' + EMAIL },
    crumbNode(url, crumbItems),
  ]);
  return {
    path: m.path, current: 'contact', title: m.title, description: m.description, jsonld,
    content: head + hire + process + faq + close,
    llms: { heading: m.h1, url, desc: m.description, text: [m.lead, 'Send a brief: ' + checklist.join('; ') + '.', m.note, `Email: ${EMAIL}`] },
  };
}

export function build() { return [page()]; }
