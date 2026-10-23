/* =====================================================================
   NEURAL NEON - marquee.js   (HERO engineer)   section #tech-marquee
   The loop itself is CSS (two identical sets, translateX 0 -> -50%).  This file only
   * sets a constant px/s speed per row (--mq-dur from the measured set width, re-measured on fonts / resize)
   * pauses the animation while the strip is off-screen (.is-off)
   * wires the pause / play toggle (aria-pressed) -> .is-paused / .is-forced
   Never throws when the markup is missing.
   ===================================================================== */
(function () {
  'use strict';

  var doc = document;
  var P = window.Portfolio;
  var SPEEDS = [40, 52];   /* px per second, per row */

  function qs(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  function boot() {
    var root = doc.getElementById('tech-marquee');
    if (!root) return;
    var rows = qsa('.mq__row', root);
    var btn = qs('.mq__toggle', root);
    var stage = qs('.mq__stage', root);

    function measure() {
      rows.forEach(function (row, i) {
        var track = qs('.mq__track', row);
        var set = qs('.mq__set', row);
        if (!track || !set) return;
        var animated = window.getComputedStyle(track).animationName !== 'none';
        if (!animated) { row.style.removeProperty('--mq-dur'); return; }
        var w = set.getBoundingClientRect().width;
        if (w > 0) row.style.setProperty('--mq-dur', Math.max(24, Math.round(w / SPEEDS[i % SPEEDS.length])) + 's');
      });
    }
    measure();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(measure, function () {});
    window.addEventListener('load', measure);
    if (P && P.onResize) P.onResize(measure); else window.addEventListener('resize', measure);

    if (stage && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { root.classList.toggle('is-off', !en.isIntersecting); });
      }, { threshold: 0 }).observe(stage);
    }

    if (btn) {
      btn.addEventListener('click', function () {
        var pause = btn.getAttribute('aria-pressed') !== 'true';
        btn.setAttribute('aria-pressed', pause ? 'true' : 'false');
        root.classList.toggle('is-paused', pause);
        root.classList.toggle('is-forced', !pause);     /* explicit Play beats the hover pause (see marquee.css) */
      });
    }
  }

  if (P && P.ready) P.ready(boot);
  else if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
