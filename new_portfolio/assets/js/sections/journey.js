/* =====================================================================
   JOURNEY  (#journey)  -  owner: JOURNEY engineer
   - rides a glowing "comet head" along the end of the scroll-drawn spine (core.js sets --fill on .timeline[data-fill])
   - keeps the sticky mini index in sync with the timeline item the reader is on (position based: the last card whose top is above a
     line ~140px under the header; core's .is-passed only drives the node fill). A click on an index row pins that row until the scroll settles.
   - pointer spotlight inside cards (--mx / --my), fine pointers only
   Classic script, IIFE, registers through window.Portfolio, never throws when markup is missing.
   ===================================================================== */
(function () {
  'use strict';
  var win = window, doc = document;

  function qs(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  function init() {
    var P = win.Portfolio || {};
    var root = qs('#journey');
    if (!root) return;

    var wrap = qs('.journey__tl', root);
    var tl = qs('.journey__timeline', root);
    var head = qs('.journey__head', root);
    var items = tl ? qsa('.timeline__item', tl) : [];
    var links = qsa('.journey__index a', root);
    var spineH = 0, lastHy = -1, lastActive = -1, pinned = -1, pinTimer = 0;
    var header = qs('.site-header');

    /* ---- spine length (cached; the head travels from the top of the spine to its end) ---- */
    function measure() {
      if (!tl) return;
      spineH = Math.max(0, tl.offsetHeight - 24);   /* matches top/bottom: 12px of the spine in journey.css */
    }
    measure();
    if (tl && 'ResizeObserver' in win) {
      new win.ResizeObserver(measure).observe(tl);
    } else if (P.onResize) {
      P.onResize(measure);
    }

    /* ---- one scroll subscriber (runs after core has written --fill / .is-passed in the same frame) ---- */
    function sync() {
      if (tl && head && spineH > 0) {
        var f = parseFloat(tl.style.getPropertyValue('--fill'));
        if (!isNaN(f)) {
          var hy = Math.round(Math.max(0, Math.min(1, f)) * spineH);
          if (hy !== lastHy) { lastHy = hy; head.style.setProperty('--hy', hy + 'px'); }
        }
      }
      /* the index is only shown on wide screens: skip the layout reads when it is hidden */
      if (links.length && items.length && links[0].offsetParent !== null) {
        var idx = 0;
        if (pinned >= 0) {
          idx = pinned;
        } else {
          var line = (header ? header.getBoundingClientRect().bottom : 0) + 140;
          for (var i = 0; i < items.length; i++) { if (items[i].getBoundingClientRect().top <= line) idx = i; }
        }
        setActive(idx);
      }
    }
    function setActive(idx) {
      if (idx === lastActive) return;
      lastActive = idx;
      links.forEach(function (a, k) {
        var on = k === idx;
        if (a.classList.contains('is-active') !== on) a.classList.toggle('is-active', on);
      });
    }
    function unpin() { pinned = -1; clearTimeout(pinTimer); sync(); }
    qsa('.journey__index', root).forEach(function (list) {
      list.addEventListener('click', function (e) {
        var a = e.target && e.target.closest ? e.target.closest('a') : null;
        var k = a ? links.indexOf(a) : -1;
        if (k < 0) return;
        pinned = k;
        setActive(k);
        clearTimeout(pinTimer);
        pinTimer = setTimeout(unpin, 1400);                               /* fallback when no scrollend event arrives */
      });
    });
    if ('onscrollend' in win) win.addEventListener('scrollend', function () { if (pinned >= 0) { clearTimeout(pinTimer); pinTimer = setTimeout(unpin, 120); } });
    ['wheel', 'touchmove', 'keydown'].forEach(function (t) { win.addEventListener(t, function () { if (pinned >= 0) unpin(); }, { passive: true }); });
    if (typeof P.onScroll === 'function') P.onScroll(sync);
    sync();

    /* ---- pointer spotlight: one delegated listener, rAF-throttled, fine pointers only ---- */
    var fine = win.matchMedia && win.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (fine) {
      var pending = null, queued = false;
      var flush = function () {
        queued = false;
        if (!pending) return;
        var card = pending.card, r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (pending.x - r.left).toFixed(1) + 'px');
        card.style.setProperty('--my', (pending.y - r.top).toFixed(1) + 'px');
        pending = null;
      };
      root.addEventListener('pointermove', function (e) {
        if (e.pointerType && e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
        var t = e.target;
        var card = t && t.closest ? t.closest('[data-glow]') : null;
        if (!card) return;
        pending = { card: card, x: e.clientX, y: e.clientY };
        if (!queued) { queued = true; win.requestAnimationFrame(flush); }
      }, { passive: true });
      root.addEventListener('pointerout', function (e) {
        var card = e.target && e.target.closest ? e.target.closest('[data-glow]') : null;
        if (!card || (e.relatedTarget && card.contains(e.relatedTarget))) return;
        card.style.removeProperty('--mx');
        card.style.removeProperty('--my');
      }, { passive: true });
    }
  }

  if (win.Portfolio && typeof win.Portfolio.ready === 'function') win.Portfolio.ready(init);
  else if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
