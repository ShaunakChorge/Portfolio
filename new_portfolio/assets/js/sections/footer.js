/* =====================================================================
   NEURAL NEON - footer.js
   "Back to top": smooth scroll via Portfolio.goto('home') (locks the scroll-spy, moves focus to the hero), with a plain
   scrollTo fallback. Without JS the link is a normal #top anchor. Never throws when the markup is missing.
   ===================================================================== */
(function () {
  'use strict';
  var win = window, doc = document;

  /* "Pause effects" buttons (footer + mobile menu): always available, any screen size or pointer. State and saving live in core (Portfolio.motion). */
  function initMotionToggles() {
    var P = win.Portfolio, btns = doc.querySelectorAll('[data-motion-toggle]');
    if (!btns.length || !P || !P.motion) return;
    function sync() {
      var on = !!P.motion.paused();
      for (var i = 0; i < btns.length; i++) btns[i].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    for (var i = 0; i < btns.length; i++) {
      btns[i].hidden = false;
      btns[i].addEventListener('click', function () { P.motion.toggle(); sync(); });
    }
    if (P.on) P.on('portfolio:motion', sync); else doc.addEventListener('portfolio:motion', sync);
    sync();
  }

  function init() {
    initMotionToggles();
    var btn = doc.querySelector('[data-back-to-top]');
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();                                   /* also stops core's generic anchor handler (it checks defaultPrevented) */
      var P = win.Portfolio;
      if (P && typeof P.goto === 'function' && doc.getElementById('home') && P.goto('home')) return;
      var reduce = !!(P && P.prefersReducedMotion);
      try { win.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); } catch (err) { win.scrollTo(0, 0); }
      var logo = doc.querySelector('.site-header .logo');
      if (logo) { try { logo.focus({ preventScroll: true }); } catch (err2) { /* ignore */ } }
    });
  }

  if (win.Portfolio && win.Portfolio.ready) win.Portfolio.ready(init);
  else if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
