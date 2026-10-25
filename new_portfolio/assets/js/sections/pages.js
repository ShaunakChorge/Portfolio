/* =====================================================================
   NEURAL NEON - pages.js   inner pages only; every function returns quietly when its markup is missing (home, 404...)
     1 project filter chips on /projects/ ([data-filterbar] + [data-filterable] > [data-cat]); a filtered collage flows its tiles into the free cells
     2 ?topic=<service-slug> preselects the project type on /contact/
     3 "Copy template" button on /contact/ ([data-copy-brief])
   Classic IIFE, registers through window.Portfolio, no globals.
   ===================================================================== */
(function () {
  'use strict';
  var win = window, doc = document;
  if (!win.Portfolio || !win.Portfolio.qs) return;            // core.js not loaded: nothing to do

  var qs = win.Portfolio.qs, qsa = win.Portfolio.qsa;
  function P() { return win.Portfolio || null; }
  function toast(msg, type) { var p = P(); if (p && typeof p.toast === 'function') p.toast(msg, { type: type || 'info' }); }

  /* ---------- 1 filter ---------- */
  function initFilter() {
    var bar = qs('[data-filterbar]');
    if (!bar) return;
    var grid = qs('[data-filterable]');
    var items = qsa('[data-filterable] > [data-cat]');
    var chips = qsa('[data-filter]', bar);
    if (!grid || !items.length || !chips.length) return;
    bar.hidden = false;                                 // without JS the bar stays hidden and every project is visible

    function apply(cat) {
      var ok = chips.some(function (c) { return c.getAttribute('data-filter') === cat; });
      if (!ok) cat = 'all';
      items.forEach(function (it) { it.hidden = cat !== 'all' && it.getAttribute('data-cat') !== cat; });
      grid.toggleAttribute('data-filtered', cat !== 'all');   // collage.css: tiles drop their desktop slots and flow, so nothing leaves a gap
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-filter') === cat ? 'true' : 'false'); });
    }
    chips.forEach(function (c) { c.addEventListener('click', function () { apply(c.getAttribute('data-filter')); }); });
  }

  /* ---------- 2 ?topic= ---------- */
  function initTopic() {
    var sel = qs('#cf-type');
    if (!sel) return;
    var m = /[?&]topic=([^&#]+)/.exec(win.location.search || '');
    if (!m) return;
    var v = '';
    try { v = decodeURIComponent(m[1]); } catch (e) { return; }
    for (var i = 0; i < sel.options.length; i++) { if (sel.options[i].value === v) { sel.value = v; break; } }
  }

  /* ---------- 3 copy the brief template ---------- */
  function initBrief() {
    qsa('[data-copy-brief]').forEach(function (btn) {
      var src = qs(btn.getAttribute('data-copy-brief'));
      var lbl = qs('.pg-brief__lbl', btn), timer = 0, idle = lbl ? lbl.textContent : 'Copy template';
      if (!src) return;
      btn.addEventListener('click', function () {
        P().copy(btn.getAttribute('data-copy-text') || src.textContent || '').then(function (ok) {
          clearTimeout(timer);
          if (ok) {
            if (lbl) lbl.textContent = 'Copied';
            toast('Brief template copied to clipboard', 'success');
            timer = setTimeout(function () { if (lbl) lbl.textContent = idle; }, 2200);
          } else {
            toast('Could not copy automatically. Select the text and copy it by hand.', 'error');
          }
        });
      });
    });
  }

  function init() { initFilter(); initTopic(); initBrief(); }
  var p = P();
  if (p && typeof p.ready === 'function') p.ready(init);
  else if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
