/* =====================================================================
   NEURAL NEON - footer.js
   "Back to top": smooth scroll via Portfolio.goto('home') (locks the scroll-spy, moves focus to the hero), with a plain
   scrollTo fallback. Without JS the link is a normal #top anchor. Never throws when the markup is missing.
   ===================================================================== */
(function () {
  'use strict';
  var win = window, doc = document;

  function init() {
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
