/* =====================================================================
   NEURAL NEON - pages.js   inner pages only; every function returns quietly when its markup is missing (home, 404...)
     1 project filter chips on /projects/ ([data-filterbar] + [data-filterable] > [data-cat]); a filtered collage flows its tiles into the free cells
     2 ?topic=<service-slug> preselects the project type on /contact/
     3 "Copy template" button on /contact/ ([data-copy-brief])
     4 the "Send a brief" / "Book a call" tabs on /contact/ ([data-tabs]), opened by #hire or #book
     5 ?q= ?ref= ?about= : a question asked on a case study or service page is put into the brief form on /contact/
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

  /* ---------- 4 /contact/: the "Send a brief" and "Book a call" tabs (without JavaScript both panels are shown one after the other) ---------- */
  function initTabs() {
    var list = qs('[data-tabs]');
    if (!list) return;
    var tabs = qsa('[data-tab]', list), panels = { brief: qs('#brief-panel'), book: qs('#book') };
    if (!tabs.length || !panels.brief || !panels.book) return;
    Object.keys(panels).forEach(function (k) { panels[k].setAttribute('role', 'tabpanel'); panels[k].setAttribute('aria-labelledby', 'tab-' + k); });
    function show(name, focus) {
      tabs.forEach(function (t) { var on = t.getAttribute('data-tab') === name; t.setAttribute('aria-selected', on ? 'true' : 'false'); t.tabIndex = on ? 0 : -1; t.classList.toggle('is-on', on); if (on && focus) t.focus(); });
      Object.keys(panels).forEach(function (k) { panels[k].hidden = k !== name; });
    }
    function fromHash(scroll) {
      var h = win.location.hash;
      if (h === '#book') { show('book'); if (scroll) panels.book.scrollIntoView({ block: 'start', behavior: P() && P().prefersReducedMotion ? 'auto' : 'smooth' }); }
      else if (h === '#hire' || h === '#brief-panel') { show('brief'); }
    }
    show('brief');
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { show(t.getAttribute('data-tab')); });
      t.addEventListener('keydown', function (e) {
        var n = -1;
        if (e.key === 'ArrowRight') n = (i + 1) % tabs.length; else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length; else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = tabs.length - 1; else return;
        e.preventDefault(); show(tabs[n].getAttribute('data-tab'), true);
      });
    });
    win.addEventListener('hashchange', function () { fromHash(true); });
    fromHash(true);
  }

  /* ---------- 5 /contact/?q=...&ref=...&about=...: a question asked on a case study or service page arrives in the brief form ---------- */
  function initPrefill() {
    var msg = qs('#cf-message');
    if (!msg) return;
    function param(k) { var m = new RegExp('[?&]' + k + '=([^&#]*)').exec(win.location.search || ''); if (!m) return ''; try { return decodeURIComponent(m[1].replace(/\+/g, ' ')).trim().slice(0, 300); } catch (e) { return ''; } }
    var q = param('q'), ref = param('ref'), about = param('about');
    if (!q && !ref) return;
    if (!msg.value) msg.value = (about ? 'About: ' + about + '\n\n' : '') + (q ? 'My question: ' + q + '\n\n' : '');
    var page = qs('#cf-page');
    if (page && ref && !/[^a-z0-9\/_-]/i.test(ref)) { try { page.value = new win.URL('../' + ref, win.location.href).href; } catch (e) { /* ignore */ } }
    msg.dispatchEvent(new win.Event('input', { bubbles: true }));
  }

  function init() { initFilter(); initTopic(); initBrief(); initTabs(); initPrefill(); }
  var p = P();
  if (p && typeof p.ready === 'function') p.ready(init);
  else if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
