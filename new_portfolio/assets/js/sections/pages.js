/* =====================================================================
   NEURAL NEON - pages.js   inner pages only; every function returns quietly when its markup is missing (home, 404...)
     1 project filter chips on /projects/ ([data-filterbar] + [data-filterable] > [data-cat]);
     2 <details> that contain the URL hash target open themselves (projects/#more, faq/#faq-pricing)
     3 ?topic=<service-slug> preselects the project type on /contact/
     4 "Copy template" button on /contact/ ([data-copy-brief])
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
    var items = qsa('[data-filterable] > [data-cat]');
    var chips = qsa('[data-filter]', bar);
    var count = qs('[data-filtercount]', bar);
    if (!items.length || !chips.length) return;
    var total = items.length;
    var sections = [];
    items.forEach(function (it) { var s = it.closest('section'); if (s && sections.indexOf(s) < 0) sections.push(s); });
    bar.hidden = false;                                 // without JS the bar stays hidden and every project is visible

    function apply(cat) {
      var ok = chips.some(function (c) { return c.getAttribute('data-filter') === cat; });
      if (!ok) cat = 'all';
      var shown = 0;
      items.forEach(function (it) {
        var hide = cat !== 'all' && it.getAttribute('data-cat') !== cat;
        it.hidden = hide;
        if (!hide) shown++;
      });
      sections.forEach(function (s) {                    // a group with nothing left in it disappears too (but never the one holding the bar)
        if (s.contains(bar)) return;
        var any = qsa('[data-cat]', s).some(function (it) { return !it.hidden; });
        s.hidden = !any;
      });
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-filter') === cat ? 'true' : 'false'); });
      if (count) count.innerHTML = 'Showing <strong>' + shown + '</strong> of ' + total + ' projects';
    }
    chips.forEach(function (c) { c.addEventListener('click', function () { apply(c.getAttribute('data-filter')); }); });
  }

  /* ---------- 2 details + hash ---------- */
  function openForHash() {
    var h = win.location.hash;
    if (!h || h.length < 2) return;
    var el = null;
    try { el = doc.getElementById(decodeURIComponent(h.slice(1))); } catch (e) { el = null; }
    if (!el) return;
    var d = el.tagName === 'DETAILS' ? el : (el.closest ? el.closest('details') : null);
    if (d && !d.open) d.open = true;
  }
  function initHash() {
    openForHash();
    win.addEventListener('hashchange', openForHash);
    doc.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!a) return;
      var id = a.getAttribute('href').slice(1), el = id ? doc.getElementById(id) : null;
      var d = el && el.closest ? el.closest('details') : null;
      if (d && !d.open) d.open = true;
    });
  }

  /* ---------- 3 ?topic= ---------- */
  function initTopic() {
    var sel = qs('#cf-type');
    if (!sel) return;
    var m = /[?&]topic=([^&#]+)/.exec(win.location.search || '');
    if (!m) return;
    var v = '';
    try { v = decodeURIComponent(m[1]); } catch (e) { return; }
    for (var i = 0; i < sel.options.length; i++) { if (sel.options[i].value === v) { sel.value = v; break; } }
  }

  /* ---------- 4 copy the brief template ---------- */
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

  function init() { initFilter(); initHash(); initTopic(); initBrief(); }
  var p = P();
  if (p && typeof p.ready === 'function') p.ready(init);
  else if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
