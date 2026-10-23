/* =====================================================================
   ABOUT  (#about)  -  owner: ABOUT engineer
   - runs the portrait's looping animations (scan sweep, orbit rings) only while it is on screen
   - counts the CGPA up at the moment its terminal line is printed (CSS animationstart)
   Classic script, IIFE, registers through window.Portfolio, never throws when markup is missing.
   ===================================================================== */
(function () {
  'use strict';
  var win = window, doc = document;

  function qs(sel, ctx) { return (ctx || doc).querySelector(sel); }

  function init() {
    var P = win.Portfolio || {};
    var portrait = qs('#about .about__portrait');
    var term = qs('#about .about__term');

    /* 1) pause decorative loops when the portrait is off-screen */
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

    /* 2) CGPA count-up, synced to the line's own fade-in. No animation (reduced motion / no JS) = the final value stays. */
    if (term) {
      var num = qs('.about__cgpa-num', term);
      var row = num && num.closest ? num.closest('.about__fact') : null;
      if (row && typeof P.countUp === 'function') {
        row.addEventListener('animationstart', function (e) {
          if (e.target !== row || e.animationName !== 'about-line') return;
          if (P.prefersReducedMotion) return;
          P.countUp(num, { from: 0, to: 9.62, decimals: 2, suffix: '/10', duration: 700 });
        }, { once: true });
      }
    }
  }

  if (win.Portfolio && typeof win.Portfolio.ready === 'function') win.Portfolio.ready(init);
  else if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
