/* =====================================================================
   ABOUT  (#about)  -  owner: ABOUT engineer
   - runs the portrait's looping animations (scan sweep, orbit rings) only while it is on screen
   Classic script, IIFE, registers through window.Portfolio, never throws when markup is missing.
   ===================================================================== */
(function () {
  'use strict';
  var win = window, doc = document;

  function qs(sel, ctx) { return (ctx || doc).querySelector(sel); }

  function init() {
    var portrait = qs('#about .about__portrait');

    /* pause decorative loops when the portrait is off-screen */
    if (portrait) {
      if ('IntersectionObserver' in win) {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) { portrait.classList.toggle('is-live', en.isIntersecting); });
        }, { rootMargin: '60px 0px' });
        io.observe(portrait);
      } else {
        portrait.classList.add('is-live');
      }
    }
  }

  if (win.Portfolio && typeof win.Portfolio.ready === 'function') win.Portfolio.ready(init);
  else if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
