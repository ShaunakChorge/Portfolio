/* =====================================================================
   SERVICES  (#build)  -  owner: ABOUT engineer
   - "See related work" links emit Portfolio.emit('portfolio:filter', {cat}) (PROJECTS applies the filter);
     the href="#work" keeps its normal anchor behaviour, so core.js scrolls to the work section
     (and the link still works without JS, it just doesn't pre-filter).
   - pointer-follow spotlight on the cards (CSS custom properties --mx / --my, one rAF per frame).
   Classic script, IIFE, never throws when markup is missing.
   ===================================================================== */
(function () {
  'use strict';
  var win = window, doc = document;

  function qs(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function closest(el, sel) { return el && el.closest ? el.closest(sel) : null; }

  function init() {
    var P = win.Portfolio || {};
    var grid = qs('#build .services__grid');
    if (!grid) return;

    /* "In practice" lists: collapsed behind a 44px summary on phones, always open (and inert) from 640px up.
       No JS = plain <details open>, which is fine. */
    var evs = Array.prototype.slice.call(grid.querySelectorAll('details.services__ev'));
    if (evs.length && win.matchMedia) {
      var wide = win.matchMedia('(min-width: 640px)');
      var syncEv = function () {
        evs.forEach(function (d) {
          d.open = wide.matches;
          var s = d.querySelector('summary');
          if (s) { if (wide.matches) s.setAttribute('tabindex', '-1'); else s.removeAttribute('tabindex'); }
        });
      };
      syncEv();
      if (wide.addEventListener) wide.addEventListener('change', syncEv); else if (wide.addListener) wide.addListener(syncEv);
      evs.forEach(function (d) {
        d.addEventListener('toggle', function () { if (wide.matches && !d.open) d.open = true; });   /* Enter / Space on the summary can never collapse it when wide */
      });
    }

    /* filter hand-off */
    grid.addEventListener('click', function (e) {
      var link = closest(e.target, '[data-filter-cat]');
      if (!link || !grid.contains(link)) return;
      var cat = link.getAttribute('data-filter-cat');
      if (cat && typeof P.emit === 'function') P.emit('portfolio:filter', { cat: cat });
    });

    /* spotlight: fine pointers only, never with reduced motion */
    var fine = win.matchMedia && win.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!fine || P.prefersReducedMotion) return;
    var pending = null, ticking = false;
    function apply() {
      ticking = false;
      if (!pending) return;
      var r = pending.card.getBoundingClientRect();
      pending.card.style.setProperty('--mx', Math.round(pending.x - r.left) + 'px');
      pending.card.style.setProperty('--my', Math.round(pending.y - r.top) + 'px');
      pending = null;
    }
    grid.addEventListener('pointermove', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      var card = closest(e.target, '.services__card');
      if (!card) return;
      pending = { card: card, x: e.clientX, y: e.clientY };
      if (!ticking) { ticking = true; (win.requestAnimationFrame || win.setTimeout)(apply, 16); }
    }, { passive: true });
  }

  if (win.Portfolio && typeof win.Portfolio.ready === 'function') win.Portfolio.ready(init);
  else if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
