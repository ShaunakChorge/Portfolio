/* =====================================================================
   NEURAL NEON - contact.js   copy-to-clipboard buttons, the floating "Let's talk" FAB (every page) and the CTA band
   Classic IIFE, registers through window.Portfolio, never throws when markup is missing.
     1 copy-to-clipboard buttons ([data-copy])        -> toast + button state (the copy itself is Portfolio.copy in core.js)
     2 FAB (.contact-fab, markup in footer.html)      -> shown after the hero, hidden while #contact or the footer is in view; opens the "Let's talk" menu (2b)
     3 CTA band                                       -> rotating border only runs while on screen
   The contact form is in contact-form.js (loaded only on pages that have the form).
   ===================================================================== */
(function () {
  'use strict';

  var win = window, doc = document;
  if (!win.Portfolio || !win.Portfolio.qs) return;            /* core.js not loaded: nothing to do */

  /* ---------- helpers ---------- */
  var qs = win.Portfolio.qs, qsa = win.Portfolio.qsa;
  function P() { return win.Portfolio || null; }
  function toast(msg, type) { var p = P(); if (p && typeof p.toast === 'function') p.toast(msg, { type: type || 'info' }); }
  function setIcon(svg, id) { var u = svg && svg.querySelector ? svg.querySelector('use') : null; if (u) u.setAttribute('href', '#i-' + id); }

  /* =====================================================================
     1  copy buttons
     ===================================================================== */
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
        P().copy(text).then(function (ok) {
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
     2  floating "Let's talk" FAB
     ===================================================================== */
  function initFab() {
    var wrap = qs('.contact-fab');
    if (!wrap) return;
    var hero = doc.getElementById('home') || qs('#main > *'), contact = doc.getElementById('contact'), foot = qs('footer.footer');
    var st = { hero: true, contact: false, foot: false, ready: false };

    function apply() {
      var show = st.ready && !st.hero && !st.contact && !st.foot;
      if (wrap.classList.contains('is-shown') !== show) wrap.classList.toggle('is-shown', show);
    }

    /* phones / touch: hide while the reader scrolls down (it would sit on text and links), show again on the first scroll up */
    var mq = win.matchMedia ? win.matchMedia('(max-width: 767px), (pointer: coarse)') : null;
    var lastY = 0, acc = 0, away = false;
    function setAway(on) {
      if (on && (wrap.contains(doc.activeElement) || wrap.classList.contains('is-open'))) return;   /* never hide the control the keyboard user is on, or an open menu */
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
     2b  the "Let's talk" menu on the FAB: book a call, send a brief, WhatsApp, email (the links are in footer.html; this only opens and closes the box)
         Without JavaScript the button is a plain link to the contact form.
     ===================================================================== */
  function initConnect() {
    var wrap = qs('.contact-fab'), btn = wrap ? qs('[data-connect-toggle]', wrap) : null, menu = wrap ? qs('#connect-menu', wrap) : null;
    if (!btn || !menu) return;
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-haspopup', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'connect-menu');
    btn.setAttribute('aria-label', 'Let’s talk: ways to connect');

    function isOpen() { return !menu.hidden; }
    function open(byKeyboard) {
      menu.hidden = false;
      wrap.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      if (byKeyboard) { var first = qs('a', menu); if (first) first.focus(); }
    }
    function close(returnFocus) {
      if (!isOpen()) return;
      menu.hidden = true;
      wrap.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      if (returnFocus) btn.focus();
    }
    btn.addEventListener('click', function (e) {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;   /* a modified click still follows the link */
      e.preventDefault();
      if (isOpen()) close(false); else open(e.detail === 0);                              /* detail 0 = opened with the keyboard: move into the menu */
    });
    btn.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); btn.click(); } });   /* role="button" promises Space as well as Enter: a link only answers to Enter */
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen()) { e.preventDefault(); close(true); } });
    doc.addEventListener('pointerdown', function (e) { if (isOpen() && !wrap.contains(e.target)) close(false); });
    wrap.addEventListener('focusout', function (e) { if (isOpen() && e.relatedTarget && !wrap.contains(e.relatedTarget)) close(false); });
    menu.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) close(false); });
  }

  /* =====================================================================
     3  CTA band: run the rotating border only while it is on screen
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
    initFab();
    initConnect();
    initBand();
  }

  if (win.Portfolio.ready) win.Portfolio.ready(init);
  else if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
