/* =====================================================================
   NEURAL NEON - contact-form.js   the contact form (#contact-form). Loaded only on pages that have it (home and /contact/), see assetTags() in build.mjs.
   Classic IIFE, registers through window.Portfolio, never throws when markup is missing.
     contact form   -> inline validation, honeypot, client-side rate limit, fetch POST (Formspree, JSON), success panel, error panel with mailto fallback
   ===================================================================== */
(function () {
  'use strict';

  var win = window, doc = document;
  if (!win.Portfolio || !win.Portfolio.qs) return;            /* core.js not loaded: nothing to do */

  /* ---------- helpers ---------- */
  var qs = win.Portfolio.qs, qsa = win.Portfolio.qsa;
  function P() { return win.Portfolio || null; }
  function reduced() { var p = P(); return !!(p && p.prefersReducedMotion); }
  function setIcon(svg, id) { var u = svg && svg.querySelector ? svg.querySelector('use') : null; if (u) u.setAttribute('href', '#i-' + id); }
  function focusEl(el, opts) { if (!el) return; try { el.focus(opts || {}); } catch (e) { /* ignore */ } }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var RATE = { gap: 30000, max: 3, windowMs: 600000 };       /* >= 30 s between messages, at most 3 per 10 minutes (per browser) */
  var memSent = [];

  var RULES = {
    name: function (v) {
      v = v.trim();
      if (!v) return 'Please enter your name.';
      if (v.length < 2) return 'Your name looks too short.';
      return '';
    },
    email: function (v) {
      v = v.trim();
      if (!v) return 'Please enter your email address so I can reply.';
      if (!EMAIL_RE.test(v)) return 'That does not look like a valid email address (for example name@example.com).';
      return '';
    },
    message: function (v) {
      v = v.trim();
      if (!v) return 'Please write a short message.';
      if (v.length < 10) return 'Please write at least 10 characters (' + v.length + ' so far).';
      return '';
    }
  };

  function loadSent() {
    var p = P(), list = p && p.store ? p.store.get('contact-sent', []) : memSent;
    if (!Array.isArray(list)) list = [];
    var now = Date.now();
    return list.filter(function (t) { return typeof t === 'number' && t <= now && now - t < RATE.windowMs; });
  }
  function saveSent(list) {
    memSent = list;
    var p = P();
    if (p && p.store) p.store.set('contact-sent', list);
  }
  function recordSend() { var l = loadSent(); l.push(Date.now()); saveSent(l); }
  function rateCheck() {
    var now = Date.now(), sent = loadSent(), last = sent.length ? sent[sent.length - 1] : 0;
    if (last && now - last < RATE.gap) return { kind: 'gap', wait: Math.ceil((RATE.gap - (now - last)) / 1000) };
    if (sent.length >= RATE.max) return { kind: 'max', wait: Math.ceil((RATE.windowMs - (now - sent[0])) / 1000) };
    return null;
  }

  function initForm() {
    var form = qs('#contact-form');
    if (!form) return;
    form.noValidate = true;                                  /* set here (not in markup) so the no-JS fallback keeps native validation */

    var EMAIL = form.getAttribute('data-email') || '';
    var compose = qs('[data-compose]'), done = qs('#cf-done'), again = qs('#cf-again'), panel = qs('#contact-form-panel');
    var fail = qs('#cf-fail'), failTitle = qs('#cf-fail-title'), failText = qs('#cf-fail-text'), failMail = qs('#cf-fail-mail');
    var status = qs('#cf-status'), count = qs('#cf-count');
    var submit = qs('#cf-submit'), submitLabel = submit ? qs('.contact__submit-label', submit) : null, submitIcon = submit ? qs('svg.icon', submit) : null;
    var honey = qs('input[name="_gotcha"]', form);
    var fields = {};
    ['name', 'email', 'message'].forEach(function (key) {
      var wrap = qs('[data-field="' + key + '"]', form);
      var input = wrap ? qs('input, textarea', wrap) : null;
      var msg = wrap ? qs('.field__msg', wrap) : null;
      if (wrap && input && msg) fields[key] = { key: key, wrap: wrap, input: input, msg: msg, touched: false };
    });
    if (!fields.name || !fields.email || !fields.message || !submit) return;
    var sending = false;

    /* ----- field state ----- */
    function setError(f, text) {
      if (text) {
        f.wrap.classList.add('field--error');
        f.wrap.classList.remove('field--ok');
        f.input.setAttribute('aria-invalid', 'true');
        f.msg.textContent = text;
      } else {
        f.wrap.classList.remove('field--error');
        f.input.removeAttribute('aria-invalid');
        f.msg.textContent = '';
      }
    }
    function validate(f, show) {
      var text = RULES[f.key](f.input.value);
      if (show) {
        setError(f, text);
        if (!text && f.input.value.trim()) f.wrap.classList.add('field--ok'); else f.wrap.classList.remove('field--ok');
      }
      return text;
    }
    function validateAll() {
      var first = null;
      Object.keys(fields).forEach(function (k) {
        var f = fields[k];
        f.touched = true;
        if (validate(f, true) && !first) first = f;
      });
      return first;
    }
    function updateCount() {
      if (!count) return;
      var n = fields.message.input.value.length, max = parseInt(fields.message.input.getAttribute('maxlength'), 10) || 2000;
      count.textContent = n + ' / ' + max;
      count.classList.toggle('is-near', n > max * 0.9);
    }

    Object.keys(fields).forEach(function (k) {
      var f = fields[k];
      f.input.addEventListener('blur', function () { if (f.input.value.trim() || f.touched) { f.touched = true; validate(f, true); } });
      f.input.addEventListener('input', function () {
        if (f.key === 'message') updateCount();
        if (f.touched || f.wrap.classList.contains('field--error')) validate(f, true);
        if (status && status.getAttribute('data-state') === 'error' && !qsa('.field--error', form).length) setStatus('', '');   /* stale 'please fix' line goes away once every field is fine */
        if (fail && !fail.hidden && !sending) fail.hidden = true;
      });
    });

    /* ----- status / panels ----- */
    function setStatus(text, state) {
      if (!status) return;
      status.textContent = text || '';
      if (state) status.setAttribute('data-state', state); else status.removeAttribute('data-state');
    }
    function mailtoHref() {
      var n = fields.name.input.value.trim(), m = fields.message.input.value.trim().slice(0, 1400);
      return 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('Portfolio message' + (n ? ' from ' + n : '')) + '&body=' + encodeURIComponent(m);
    }
    function showFail(title, text) {
      if (!fail) return;
      if (failTitle) failTitle.textContent = title;
      if (failText) failText.textContent = text;
      if (failMail) failMail.setAttribute('href', mailtoHref());
      fail.hidden = false;
      try { fail.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); } catch (e) { /* ignore */ }
    }
    function hideFail() { if (fail) fail.hidden = true; }

    function setSending(on) {
      sending = on;
      submit.disabled = on;
      submit.classList.toggle('is-loading', on);
      form.setAttribute('aria-busy', on ? 'true' : 'false');
      setIcon(submitIcon, on ? 'loader' : 'send');
      if (submitLabel) submitLabel.textContent = on ? 'Sending…' : 'Send message';
      setStatus(on ? 'Sending your message…' : '', '');
    }

    function showDone() {
      var nm = fields.name.input.value.trim().split(/\s+/)[0] || '';
      var em = fields.email.input.value.trim();
      var nameOut = qs('#cf-done-name'), emailOut = qs('#cf-done-email');
      if (nameOut) nameOut.textContent = nm ? ', ' + nm : '';
      if (emailOut) emailOut.textContent = em || 'your address';
      if (compose && panel && !compose.hidden && compose.offsetHeight) panel.style.setProperty('--cf-h', compose.offsetHeight + 'px');   /* the confirmation keeps the panel height: no layout jump */
      form.reset();
      Object.keys(fields).forEach(function (k) { fields[k].touched = false; setError(fields[k], ''); fields[k].wrap.classList.remove('field--ok'); });
      updateCount();
      hideFail();
      setStatus('', '');
      if (compose) compose.hidden = true;
      if (done) {
        done.hidden = false;
        focusEl(done, { preventScroll: true });
        try { done.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); } catch (e) { /* ignore */ }
      }
    }
    function showForm() {
      if (panel) panel.style.removeProperty('--cf-h');
      if (done) done.hidden = true;
      if (compose) compose.hidden = false;
      focusEl(fields.name.input);
    }
    if (again) again.addEventListener('click', showForm);

    /* ----- submit ----- */
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;
      hideFail();
      var bad = validateAll();
      if (bad) {
        setStatus('Please fix the highlighted field' + (qsa('.field--error', form).length > 1 ? 's' : '') + ' and try again.', 'error');
        focusEl(bad.input);
        return;
      }
      setStatus('', '');
      if (honey && honey.value) { showDone(); return; }      /* bot: pretend it worked, send nothing */
      var rl = rateCheck();
      if (rl) {
        var wait = rl.kind === 'gap' ? rl.wait + ' seconds' : Math.max(1, Math.ceil(rl.wait / 60)) + ' minutes';
        showFail('Slow down a little', (rl.kind === 'gap' ? 'You sent a message a moment ago. ' : 'You have already sent a few messages from this browser. ') +
          'Please wait about ' + wait + ' before sending another, or email me directly.');
        return;
      }
      send();
    });

    function send() {
      setSending(true);
      var ctrl = typeof win.AbortController === 'function' ? new win.AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
      var opts = { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) };
      if (ctrl) opts.signal = ctrl.signal;
      var action = form.getAttribute('action') || '';

      win.fetch(action, opts).then(function (res) {
        return res.json().then(function (d) { return d; }, function () { return {}; }).then(function (data) { return { res: res, data: data || {} }; });
      }).then(function (r) {
        clearTimeout(timer);
        setSending(false);
        if (r.res.ok) {
          recordSend();
          showDone();
          return;
        }
        var errs = Array.isArray(r.data.errors) ? r.data.errors : [];
        var emailErr = errs.filter(function (x) { return x && x.field === 'email'; })[0];
        if (r.res.status === 422 && emailErr) {
          setError(fields.email, 'That email address was not accepted. Please check it.');
          focusEl(fields.email.input);
          return;
        }
        if (r.res.status === 429) {
          showFail('Too many messages', 'The form is receiving a lot of traffic right now. Please try again in a few minutes, or email me directly.');
        } else {
          showFail('Message not sent', 'Something went wrong on the way. Your text is still in the form, so you can try again, or email me directly.');
        }
        focusEl(submit);
      }).catch(function () {
        clearTimeout(timer);
        setSending(false);
        showFail('Message not sent', 'I could not reach the form service (check your connection). Your text is still in the form, so you can try again, or email me directly.');
        focusEl(submit);
      });
    }

    updateCount();
  }

  if (win.Portfolio.ready) win.Portfolio.ready(initForm);
  else if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', initForm);
  else initForm();
})();
