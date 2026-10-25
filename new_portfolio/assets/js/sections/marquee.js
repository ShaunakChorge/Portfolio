/* =====================================================================
   NEURAL NEON - marquee.js   section #stack: the moving tools ribbon
   The loop itself is CSS (two identical sets, translateX 0 -> -50%, see marquee.css). This file only
   * sets a constant px/s speed (--mq-dur from the measured track width, re-measured when fonts load and on resize)
   * pauses the animation while the strip is off-screen (.is-off)
   * wires the pause / play button (aria-pressed) -> .is-paused / .is-forced
   Never throws when the markup is missing.
   ===================================================================== */
(function () {
  'use strict';

  var doc = document;
  var P = window.Portfolio;
  var SPEED = 44;   /* px per second */

  function boot() {
    var root = doc.getElementById('stack');
    var track = root && root.querySelector('.mq__track');
    if (!track) return;
    var btn = root.querySelector('.mq__toggle');

    function measure() {
      var animated = window.getComputedStyle(track).animationName !== 'none';
      if (!animated) { track.style.removeProperty('--mq-dur'); return; }
      /* the loop distance is -50% of the track (a translation does not change the rect width) */
      var w = track.getBoundingClientRect().width / 2;
      if (w > 0) track.style.setProperty('--mq-dur', Math.max(24, Math.round(w / SPEED)) + 's');
    }
    measure();
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(measure, function () {});
    window.addEventListener('load', measure);
    if (P && P.onResize) P.onResize(measure); else window.addEventListener('resize', measure);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { root.classList.toggle('is-off', !en.isIntersecting); });
      }, { threshold: 0 }).observe(root);
    }

    if (btn) {
      btn.addEventListener('click', function () {
        var pause = btn.getAttribute('aria-pressed') !== 'true';
        btn.setAttribute('aria-pressed', pause ? 'true' : 'false');
        btn.setAttribute('aria-label', pause ? 'Play the tools animation' : 'Pause the tools animation');
        root.classList.toggle('is-paused', pause);
        root.classList.toggle('is-forced', !pause);     /* an explicit Play beats the hover pause (see marquee.css) */
      });
    }
  }

  if (P && P.ready) P.ready(boot);
  else if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
