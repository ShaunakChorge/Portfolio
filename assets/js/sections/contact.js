/* =====================================================================
   NEURAL NEON - contact.js   (CONTACT engineer)   section #contact + the floating "Let's talk" FAB
   Classic IIFE, registers through window.Portfolio, never throws when markup is missing.
     1 copy-to-clipboard buttons ([data-copy])        -> toast + button state
     2 contact form (#contact-form)                   -> inline validation, honeypot, client-side rate limit, fetch POST (Formspree, JSON),
                                                         success panel, error panel with mailto fallback
     3 FAB (.contact-fab, markup in footer.html)      -> shown after the hero, hidden while #contact or the footer is in view
     4 CTA band                                       -> rotating border only runs while on screen
   Public: Portfolio.contact = { copyEmail(), focusForm(), reset() }
   ===================================================================== */
(function () {
  'use strict';

  var win = window, doc = document;

  /* ---------- helpers ---------- */
  function qs(sel, root) { try { return (root || doc).querySelector(sel); } catch (e) { return null; } }
  function qsa(sel, root) { try { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); } catch (e) { return []; } }
  function P() { return win.Portfolio || null; }
  function reduced() { var p = P(); return !!(p && p.prefersReducedMotion); }
  function toast(msg, type) { var p = P(); if (p && typeof p.toast === 'function') p.toast(msg, { type: type || 'info' }); }
  function setIcon(svg, id) { var u = svg && svg.querySelector ? svg.querySelector('use') : null; if (u) u.setAttribute('href', '#i-' + id); }
  function focusEl(el, opts) { if (!el) return; try { el.focus(opts || {}); } catch (e) { /* ignore */ } }

  /* =====================================================================
     1  clipboard
     ===================================================================== */
  function legacyCopy(text) {
    var ok = false, prev = doc.activeElement, ta = doc.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.setAttribute('aria-hidden', 'true');
    ta.tabIndex = -1;
    ta.className = 'hp';
    doc.body.appendChild(ta);
    try { ta.select(); ta.setSelectionRange(0, text.length); ok = doc.execCommand('copy'); } catch (e) { ok = false; }
    doc.body.removeChild(ta);
    if (prev && prev !== doc.body) focusEl(prev, { preventScroll: true });
    return ok;
  }
  function copyText(text) {
    var nav = win.navigator;
    if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
      return nav.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function initCopy() {
    qsa('[data-copy]').forEach(function (btn) {
      var label = qs('.contact__copy-text', btn), icon = qs('svg.icon', btn), timer = 0;
      var idleLabel = label ? label.textContent : 'Copy', idleAria = btn.getAttribute('aria-label') || 'Copy';
      function reset() {
        btn.classList.remove('is-copied');
        setIcon(icon, 'copy');
        if (label) label.textContent = idleLabel;
        btn.setAttribute('aria-label', idleAria);
      }
      btn.addEventListener('click', function () {
        var text = btn.getAttribute('data-copy') || '';
        copyText(text).then(function (ok) {
          clearTimeout(timer);
          if (ok) {
            btn.classList.add('is-copied');
            setIcon(icon, 'check');
            if (label) label.textContent = 'Copied';
            btn.setAttribute('aria-label', 'Copied to clipboard');
            toast('Email address copied to clipboard', 'success');
            timer = setTimeout(reset, 2200);
          } else {
            toast('Could not copy automatically. My address is ' + text, 'error');
          }
        });
      });
    });
  }

  /* =====================================================================
     2  contact form
     ===================================================================== */
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

    var p = P();
    if (p) {
      p.contact = p.contact || {};
      p.contact.reset = function () { showForm(); };
      p.contact.focusForm = function () { showForm(); };
    }
  }

  /* =====================================================================
     3  floating "Let's talk" FAB
     ===================================================================== */
  function initFab() {
    var wrap = qs('.contact-fab');
    if (!wrap) return;
    var hero = doc.getElementById('home'), contact = doc.getElementById('contact'), foot = qs('footer.footer');
    var st = { hero: true, contact: false, foot: false, ready: false };

    function apply() {
      var show = st.ready && !st.hero && !st.contact && !st.foot;
      if (wrap.classList.contains('is-shown') !== show) wrap.classList.toggle('is-shown', show);
    }

    /* phones / touch: hide while the reader scrolls down (it would sit on text and links), show again on the first scroll up */
    var mq = win.matchMedia ? win.matchMedia('(max-width: 767px), (pointer: coarse)') : null;
    var lastY = 0, acc = 0, away = false;
    function setAway(on) {
      if (on && wrap.contains(doc.activeElement)) return;              /* never hide the control the keyboard user is on */
      if (away === on) return;
      away = on;
      wrap.classList.toggle('is-away', on);
    }
    var pp = P();
    if (pp && typeof pp.onScroll === 'function') {
      pp.onScroll(function (state) {
        var y = state && typeof state.y === 'number' ? state.y : (win.pageYOffset || 0), d = y - lastY;
        lastY = y;
        if (!mq || !mq.matches) { acc = 0; setAway(false); return; }
        if (d === 0) return;
        if ((d > 0) !== (acc > 0)) acc = 0;                             /* direction changed: restart the run */
        acc += d;
        if (acc > 14) setAway(true); else if (acc < -14) setAway(false);
      });
    }
    wrap.addEventListener('focusin', function () { setAway(false); });

    if ('IntersectionObserver' in win) {
      if (hero) {
        /* the hero counts as "in view" until its bottom passes ~30% of the viewport, so the button appears right after it */
        new IntersectionObserver(function (en) { st.hero = en[en.length - 1].isIntersecting; st.ready = true; apply(); }, { rootMargin: '-30% 0px 0px 0px', threshold: 0 }).observe(hero);
      } else { st.hero = false; }
      if (contact) {
        new IntersectionObserver(function (en) { st.contact = en[en.length - 1].isIntersecting; st.ready = true; apply(); }, { rootMargin: '0px 0px -12% 0px', threshold: 0 }).observe(contact);
      }
      if (foot) {
        new IntersectionObserver(function (en) { st.foot = en[en.length - 1].isIntersecting; st.ready = true; apply(); }, { rootMargin: '0px 0px -8% 0px', threshold: 0 }).observe(foot);
      }
      if (!hero && !contact && !foot) { st.ready = true; apply(); }
    } else {
      /* very old browsers: one scroll subscription through core */
      var p = P();
      var check = function () {
        var vh = win.innerHeight || 800, h = hero ? hero.getBoundingClientRect() : null, c = contact ? contact.getBoundingClientRect() : null, f = foot ? foot.getBoundingClientRect() : null;
        st.hero = h ? h.bottom > vh * 0.3 : (win.pageYOffset || 0) < vh * 0.8;
        st.contact = c ? (c.top < vh * 0.88 && c.bottom > 0) : false;
        st.foot = f ? f.top < vh * 0.92 : false;
        st.ready = true;
        apply();
      };
      if (p && p.onScroll) p.onScroll(check);
      check();
    }
  }

  /* =====================================================================
     4  CTA band: run the rotating border only while it is on screen
     ===================================================================== */
  function initBand() {
    var band = qs('.contact__band');
    if (!band) return;
    if (!('IntersectionObserver' in win)) { band.classList.add('is-live'); return; }
    new IntersectionObserver(function (en) { band.classList.toggle('is-live', en[en.length - 1].isIntersecting); }, { rootMargin: '80px 0px', threshold: 0 }).observe(band);
  }

  /* ---------- boot ---------- */
  function init() {
    initCopy();
    initForm();
    initFab();
    initBand();
    var p = P();
    if (p) {
      p.contact = p.contact || {};
      p.contact.copyEmail = function () {
        var btn = qs('[data-copy]');
        var text = btn ? btn.getAttribute('data-copy') : '';
        if (!text) return Promise.resolve(false);
        return copyText(text).then(function (ok) {
          toast(ok ? 'Email address copied to clipboard' : 'Could not copy automatically. My address is ' + text, ok ? 'success' : 'error');
          return ok;
        });
      };
    }
  }

  if (win.Portfolio && typeof win.Portfolio.ready === 'function') win.Portfolio.ready(init);
  else if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
