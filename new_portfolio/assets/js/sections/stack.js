/* =====================================================================
   STACK  (#stack)  -  owner: ABOUT engineer
   Interactive chips:
     hover (mouse) / focus (keyboard)  -> anchored tooltip: which projects (and internship work) used the tool,
                                          and the tools used alongside it light up while the rest recede
     click / Enter / Space             -> pin that tool (aria-pressed), tap again or Esc / click away to clear
     Arrow keys / Home / End           -> roving tabindex: the whole board is ONE tab stop
   All usage data is derived at build time from content.final.json (data-p on each chip + #stack-data JSON);
   without JS the chips are plain readable text with the same info in visually-hidden text.
   Classic script, IIFE, never throws when markup is missing.
   ===================================================================== */
(function () {
  'use strict';
  var win = window, doc = document;

  function qs(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function closest(el, sel) { return el && el.closest ? el.closest(sel) : null; }
  function el(tag, cls, text) { var n = doc.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; }

  var TONE_RGB = { cyan: 'var(--cyan)', magenta: 'var(--magenta)', purple: 'var(--purple)', blue: 'var(--blue)', green: 'var(--green)' };

  function init() {
    var board = qs('#stack-board');
    var tip = board ? qs('.stack__tip', board) : null;
    if (!board || !tip) return;
    var chips = qsa('.stack-chip', board);
    if (!chips.length) return;

    var data = { p: {}, w: 'Internship work' };
    try { var j = qs('#stack-data'); if (j) data = JSON.parse(j.textContent) || data; } catch (err) { /* keep defaults */ }

    /* per-chip place sets (projects + 'w' = internship work) */
    chips.forEach(function (c) {
      c._ids = (c.getAttribute('data-p') || '').split(' ').filter(Boolean);
      c._set = {};
      c._ids.forEach(function (id) { c._set[id] = true; });
    });
    function shares(a, b) { for (var k in a._set) { if (b._set[k]) return true; } return false; }

    /* roving tabindex: one tab stop for the whole board */
    chips.forEach(function (c, i) { c.tabIndex = i === 0 ? 0 : -1; });
    function rove(c) { chips.forEach(function (o) { o.tabIndex = o === c ? 0 : -1; }); }

    var hov = null, foc = null, pinned = null, timer = 0;
    var dismissed = null;                                   /* chip whose tooltip was closed with Esc: stays closed until focus AND pointer have left it (WCAG 1.4.13) */
    var live = qs('#stack-live');

    function mark(c) {
      board.setAttribute('data-focus', '');
      chips.forEach(function (o) {
        o.classList.toggle('is-sel', o === c);
        o.classList.toggle('is-rel', o !== c && shares(c, o));
      });
    }
    function unmark() {
      board.removeAttribute('data-focus');
      chips.forEach(function (o) { o.classList.remove('is-sel'); o.classList.remove('is-rel'); });
    }

    function render(c) {
      var name = c.getAttribute('data-n') || c.textContent;
      var tone = c.getAttribute('data-tone') || 'cyan';
      var ids = c._ids.filter(function (id) { return id !== 'w'; });
      var work = c._ids.indexOf('w') > -1;
      tip.setAttribute('data-tone', tone);
      while (tip.firstChild) tip.removeChild(tip.firstChild);
      tip.appendChild(el('p', 'stack__tip-name', name));
      if (ids.length) {
        tip.appendChild(el('p', 'stack__tip-meta', 'Used in ' + ids.length + (ids.length === 1 ? ' project' : ' projects')));
        var ul = el('ul', 'stack__tip-list');
        ids.slice(0, 4).forEach(function (id) {
          var rec = data.p[id] || [id, tone];
          var li = el('li', '', rec[0]);
          li.style.setProperty('--pt', TONE_RGB[rec[1]] || TONE_RGB[tone]);
          ul.appendChild(li);
        });
        tip.appendChild(ul);
        var rest = ids.length - 4, bits = [];
        if (rest > 0) bits.push('+' + rest + ' more');
        if (work) bits.push((rest > 0 ? 'and ' : 'Also in ') + String(data.w || 'internship work').toLowerCase());
        if (bits.length) tip.appendChild(el('p', 'stack__tip-more', bits.join(' ')));
      } else if (work) {
        tip.appendChild(el('p', 'stack__tip-meta', 'Used in ' + String(data.w || 'internship work').toLowerCase()));
      } else {
        tip.appendChild(el('p', 'stack__tip-note', c.getAttribute('data-note') || 'In my toolkit.'));
      }
    }

    function place(c) {
      var br = board.getBoundingClientRect(), cr = c.getBoundingClientRect();
      var tw = tip.offsetWidth, th = tip.offsetHeight;
      var cx = cr.left - br.left + cr.width / 2;
      var left = clamp(cx - tw / 2, 4, Math.max(4, br.width - tw - 4));
      var above = cr.top >= th + 84;                                  /* room under the sticky header? */
      var top = above ? (cr.top - br.top) - th - 12 : (cr.bottom - br.top) + 12;
      tip.setAttribute('data-side', above ? 'top' : 'bottom');
      tip.style.setProperty('--tx', Math.round(left) + 'px');
      tip.style.setProperty('--ty', Math.round(top) + 'px');
      tip.style.setProperty('--ax', Math.round(clamp(cx - left, 18, Math.max(18, tw - 18))) + 'px');
    }

    function show(c) {
      if (dismissed === c) return;
      clearTimeout(timer);
      mark(c); render(c); place(c);
      tip.classList.add('is-on');
    }
    function hide() { tip.classList.remove('is-on'); unmark(); }
    function settle() {
      var t = hov || foc || pinned;
      if (t && t !== dismissed) show(t); else hide();
    }
    /* the tooltip is aria-hidden, so a pinned tool's details go to a polite status line instead */
    function announce(c) {
      if (!live) return;
      if (!c) { live.textContent = ''; return; }
      var bits = [];
      Array.prototype.forEach.call(tip.children, function (n) {
        if (n.tagName === 'UL') bits.push(Array.prototype.map.call(n.children, function (li) { return li.textContent; }).join(', '));
        else bits.push(n.textContent);
      });
      live.textContent = bits.join('. ');
    }
    function later() { clearTimeout(timer); timer = setTimeout(settle, 70); }   /* tiny grace so moving chip -> chip doesn't flicker */

    function syncPressed() { chips.forEach(function (o) { o.setAttribute('aria-pressed', o === pinned ? 'true' : 'false'); }); }

    chips.forEach(function (c) {
      c.addEventListener('pointerenter', function (e) {
        if (e.pointerType === 'touch') return;
        hov = c; show(c);
      });
      c.addEventListener('pointerleave', function (e) {
        if (e.pointerType === 'touch') return;
        if (hov === c) hov = null;
        if (dismissed === c && foc !== c) dismissed = null;
        later();
      });
      c.addEventListener('focus', function () {
        rove(c);
        var kb = true;
        try { kb = c.matches(':focus-visible'); } catch (err) { kb = true; }
        if (kb) { foc = c; show(c); }
      });
      c.addEventListener('blur', function () { if (foc === c) foc = null; if (dismissed === c && hov !== c) dismissed = null; later(); });
      c.addEventListener('click', function () {
        pinned = pinned === c ? null : c;
        dismissed = null;
        syncPressed();
        if (pinned) { show(c); announce(c); } else { settle(); announce(null); }
      });
    });

    /* arrow-key navigation (visual order, including up/down across wrapped rows) */
    function vertical(c, dir) {
      var r = c.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, best = null, score = 1e9;
      chips.forEach(function (o) {
        if (o === c) return;
        var q = o.getBoundingClientRect(), dy = (q.top + q.height / 2) - cy;
        if (dir > 0 ? dy <= r.height * 0.6 : dy >= -r.height * 0.6) return;
        var s = Math.abs(dy) * 3 + Math.abs((q.left + q.width / 2) - cx);
        if (s < score) { score = s; best = o; }
      });
      return best;
    }
    board.addEventListener('keydown', function (e) {
      var c = closest(e.target, '.stack-chip');
      if (!c || e.altKey || e.ctrlKey || e.metaKey) return;
      var i = chips.indexOf(c), k = e.key, n = null;
      if (k === 'ArrowRight') n = chips[Math.min(i + 1, chips.length - 1)];
      else if (k === 'ArrowLeft') n = chips[Math.max(i - 1, 0)];
      else if (k === 'ArrowDown') n = vertical(c, 1);
      else if (k === 'ArrowUp') n = vertical(c, -1);
      else if (k === 'Home') n = chips[0];
      else if (k === 'End') n = chips[chips.length - 1];
      else return;
      e.preventDefault();
      if (n) n.focus();
    });

    /* clear: Esc, or pressing anywhere outside the chips */
    doc.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' && e.key !== 'Esc') return;
      if (!pinned && !tip.classList.contains('is-on')) return;
      dismissed = hov || foc || pinned;                     /* Esc hides the tooltip even while the chip is hovered / focused */
      pinned = null; syncPressed(); announce(null); settle();
    });
    doc.addEventListener('pointerdown', function (e) {
      if (!pinned || closest(e.target, '.stack-chip')) return;
      pinned = null; syncPressed(); announce(null); settle();
    });
    win.addEventListener('resize', function () {
      var t = hov || foc || pinned;
      if (t && tip.classList.contains('is-on')) place(t);
    });
  }

  if (win.Portfolio && typeof win.Portfolio.ready === 'function') win.Portfolio.ready(init);
  else if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
