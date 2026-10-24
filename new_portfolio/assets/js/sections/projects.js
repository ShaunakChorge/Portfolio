/* =====================================================================
   PROJECTS (#work)  -  progressive enhancement of the static markup.
   * filter chips (aria-pressed) with FLIP re-layout, live result count, zig-zag bento spans
   * case-study dialog (<dialog>): focus trap, ESC, backdrop click, prev/next, scroll lock,
     focus return, deep link  #p=<id>
   * bus: listens 'portfolio:filter' {cat}, 'portfolio:open-project' {id}; emits 'portfolio:open-project'
     {id, source:'projects'} when it opens a project itself, 'portfolio:close-project' {id}, 'pv:refresh'
   * exposes  Portfolio.projects = [{id,title,category,tone,year,url:'#p=id'}]  and  Portfolio.work {open, close, filter}
   Never throws when its markup is missing; content stays readable without JS (details blocks).
   ===================================================================== */
(function () {
  'use strict';
  var P = window.Portfolio;
  if (!P) return;

  var doc = document, win = window;
  var SELF = 'projects';
  var EASE = 'cubic-bezier(.19, 1, .22, 1)';
  /* desktop (3 col) span patterns per visible featured count: zig-zag rows with no empty cells */
  var SPANS3 = { 1: [3], 2: [2, 1], 3: [1, 1, 1], 4: [2, 1, 1, 2], 5: [2, 1, 1, 1, 1], 6: [2, 1, 1, 2, 2, 1] };

  var root, gridWrap, noneMsg, moreWrap, ctaEl, countEl, barEl, dialog, sheet, bodyEl, scrollEl;
  var items = [], byId = Object.create(null), chips = [], labels = { all: 'All' };
  var total = 0, current = 'all';
  var dlg = { open: false, id: null, opener: null, pushed: false, closing: false };

  function qs(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function reduced() { return !!P.prefersReducedMotion; }
  function canAnimate() { return !reduced() && typeof Element !== 'undefined' && !!Element.prototype.animate; }
  function lc(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function el(tag, cls, text) { var n = doc.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function inViewport(node) {
    var r = node.getBoundingClientRect(), vh = win.innerHeight || doc.documentElement.clientHeight;
    return r.bottom > 0 && r.top < vh;
  }

  /* ------------------------------------------------------------------ data */
  function collect() {
    items = qsa('[data-pid]', root).map(function (li) {
      var d = li.dataset;
      var it = {
        el: li, id: d.pid, kind: d.kind, cat: d.cat, n: parseInt(d.n, 10) || 0, title: d.title || '', category: d.category || '',
        tone: d.tone || 'cyan', year: d.year || '', vis: d.vis || 'code', visible: !li.hidden,
        btn: qs('.projects__open', li)
      };
      byId[it.id] = it;
      return it;
    });
    total = items.length;
  }

  function publish() {
    P.projects = items.map(function (it) {
      return { id: it.id, title: it.title, category: it.category, group: it.cat, tone: it.tone, year: it.year, kind: it.kind, url: '#p=' + it.id };
    });
  }

  /* ------------------------------------------------------------------ filter */
  function normCat(c) {
    var v = lc(c);
    if (!v || v === 'all' || v === '*') return 'all';
    if (chips.some(function (ch) { return ch.id === v; })) return v;
    var hit = chips.filter(function (ch) { return lc(ch.label) === v; })[0];
    if (hit) return hit.id;
    var proj = items.filter(function (it) { return lc(it.category) === v; })[0];
    return proj ? proj.cat : 'all';
  }

  function matches(it, cat) { return cat === 'all' || it.cat === cat; }

  function layoutGrid() {
    var vis = items.filter(function (it) { return it.kind === 'card' && it.visible; });
    var n = vis.length, pattern = SPANS3[n] || [];
    vis.forEach(function (it, i) {
      it.el.style.setProperty('--s3', String(pattern[i] || 1));
      it.el.style.setProperty('--s2', String(i === n - 1 && n % 2 === 1 ? 2 : 1));   /* tablet: 2 cols, lone last card spans both */
      it.el.classList.toggle('is-lead', i === 0);
      it.el.classList.toggle('is-wide', (pattern[i] || 1) >= 2);   /* 3-col desktop: single-column cards let their media absorb the row slack (CSS) */
    });
  }

  function syncSections() {
    var nCards = items.filter(function (it) { return it.kind === 'card' && it.visible; }).length;
    var nRows = items.filter(function (it) { return it.kind === 'row' && it.visible; }).length;
    if (gridWrap) gridWrap.hidden = nCards === 0;
    if (noneMsg) noneMsg.hidden = !(nCards === 0 && current !== 'all');
    if (moreWrap) moreWrap.hidden = nRows === 0;
  }

  function syncChips() {
    chips.forEach(function (ch) { ch.btn.setAttribute('aria-pressed', ch.id === current ? 'true' : 'false'); });
  }

  function updateCount() {
    if (!countEl) return;
    var n = items.filter(function (it) { return it.visible; }).length;
    countEl.textContent = '';
    countEl.appendChild(doc.createTextNode('Showing '));
    countEl.appendChild(el('strong', null, String(n)));
    countEl.appendChild(doc.createTextNode(' of ' + total + ' projects' + (current !== 'all' ? ' in ' + (labels[current] || current) : '')));
  }

  function snapshot(targets) {
    var m = new Map();
    targets.forEach(function (t) { if (!t.hidden) { var r = t.getBoundingClientRect(); m.set(t, { left: r.left, top: r.top, width: r.width, height: r.height }); } });
    return m;
  }

  function play(before, targets) {
    var enter = 0;
    targets.forEach(function (t) {
      if (t.hidden) return;
      var f = before.get(t), l = t.getBoundingClientRect();
      if (!f) {
        t.animate([{ opacity: 0, transform: 'translateY(16px) scale(.97)' }, { opacity: 1, transform: 'none' }],
          { duration: 480, delay: Math.min(enter++, 8) * 45, easing: EASE, fill: 'backwards' });
        return;
      }
      var dx = f.left - l.left, dy = f.top - l.top;
      var resized = Math.abs(f.width - l.width) > 2 || Math.abs(f.height - l.height) > 2;
      if (!dx && !dy && !resized) return;
      t.animate([{ opacity: resized ? .5 : 1, transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { opacity: 1, transform: 'none' }],
        { duration: 460, easing: EASE });
    });
  }

  function setFilter(cat, o) {
    o = o || {};
    cat = normCat(cat);
    if (cat === current && !o.force) { syncChips(); return; }
    var targets = items.map(function (it) { return it.el; });
    if (moreWrap) targets.push(moreWrap);
    if (ctaEl) targets.push(ctaEl);
    var animate = o.animate !== false && canAnimate() && inViewport(root);
    var before = animate ? snapshot(targets) : null;

    current = cat;
    items.forEach(function (it) {
      var show = matches(it, cat);
      it.visible = show;
      if (it.el.hidden === show) it.el.hidden = !show;
    });
    layoutGrid();
    syncSections();
    syncChips();
    updateCount();
    if (animate && before) play(before, targets);
    if (animate) setTimeout(function () { P.emit('pv:refresh'); }, 520); else P.emit('pv:refresh');
  }

  /* phones: the chip row is one horizontal scroller (keep the active chip in view) and the filtered cards start right below the bar,
     so a tap on a chip never leaves the first result below the fold */
  function afterFilter(btn) {
    var behavior = reduced() ? 'auto' : 'smooth';
    var sc = btn.closest ? btn.closest('.chips') : null;
    if (sc && sc.scrollWidth > sc.clientWidth + 2) {
      var r = btn.getBoundingClientRect(), sr = sc.getBoundingClientRect();
      try { sc.scrollTo({ left: sc.scrollLeft + (r.left - sr.left) - (sr.width - r.width) / 2, behavior: behavior }); } catch (e) { /* ignore */ }
    }
    if (!barEl || !(P.isMobile || win.innerWidth < 768)) return;
    var b = barEl.getBoundingClientRect(), vh = win.innerHeight || doc.documentElement.clientHeight;
    if (b.top < 56 || b.top > vh * .4) { try { barEl.scrollIntoView({ block: 'start', behavior: behavior }); } catch (e2) { /* ignore */ } }
  }

  function bindChips() {
    qsa('.projects__filters [data-filter]', root).forEach(function (b) {
      var id = b.getAttribute('data-filter');
      var first = b.firstChild && b.firstChild.nodeType === 3 ? b.firstChild.textContent : b.textContent;
      labels[id] = String(first).trim();
      chips.push({ id: id, btn: b, label: labels[id] });
      b.addEventListener('click', function () {
        var next = (id !== 'all' && current === id) ? 'all' : id;   /* pressing the active chip clears the filter */
        setFilter(next);
        P.emit('portfolio:filter', { cat: next, source: SELF });
        afterFilter(b);
      });
    });
  }

  /* ------------------------------------------------------------------ dialog */
  function navList() {
    var vis = items.filter(function (it) { return !it.el.hidden; });
    return vis.some(function (it) { return it.id === dlg.id; }) ? vis : items;
  }

  function hashId() {
    var m = /(?:^#|[#&?\/])p=([a-z0-9_-]+)/i.exec(win.location.hash || '');
    return m ? m[1].toLowerCase() : null;
  }

  function setHash(h, mode) {
    try {
      if (mode === 'push') win.history.pushState(null, '', h);
      else win.history.replaceState(null, '', h);
      return true;
    } catch (e) { return false; }
  }

  function render(it, dir) {
    var src = qs('.projects__case-body', it.el);
    var frag = src ? src.cloneNode(true) : el('div');
    var media = el('div', 'projects__dmedia');
    var fig = qs('.projects__figure', frag);
    var madePv = false;
    if (fig) { media.appendChild(fig); }
    else {
      var pv = el('div', 'pv');
      pv.setAttribute('data-visual', it.vis);
      pv.setAttribute('data-variant', it.id);
      pv.setAttribute('data-tone', it.tone);
      pv.setAttribute('aria-hidden', 'true');   /* decorative: the case study text carries the meaning */
      media.appendChild(pv);
      madePv = true;
    }
    var head = el('div', 'projects__dtitle');
    var eyebrow = el('p', 'projects__deyebrow');
    eyebrow.appendChild(el('span', null, it.category));
    if (it.year) eyebrow.appendChild(el('span', null, it.year));
    var h = el('h3', 'projects__dname', it.title);
    h.id = 'work-dialog-title';
    h.setAttribute('tabindex', '-1');
    head.appendChild(eyebrow);
    head.appendChild(h);
    var tag = qs('.pc__tagline', frag);
    if (tag) head.appendChild(tag);

    /* portrait / near-square capture: image on the left, title + tagline + lede on the right (>= 900px, CSS); stacked otherwise */
    var side = !!fig && fig.getAttribute('data-orient') === 'portrait';
    if (side) { var lede = qs('.pc__lede', frag); if (lede) head.appendChild(lede); }
    var top = el('div', 'projects__dtop' + (side ? ' projects__dtop--side' : ''));
    top.appendChild(media);
    top.appendChild(head);

    while (bodyEl.firstChild) bodyEl.removeChild(bodyEl.firstChild);
    bodyEl.appendChild(top);
    while (frag.firstChild) bodyEl.appendChild(frag.firstChild);

    sheet.setAttribute('data-tone', it.tone);
    var list = navList();
    var idx = list.indexOf(it);
    var single = list.length < 2;
    dialog.setAttribute('data-single', single ? 'true' : 'false');
    var cnt = qs('[data-dlg-count]', dialog);
    if (cnt) cnt.textContent = '// ' + pad(it.n) + ' / ' + total;
    var prev = list[(idx - 1 + list.length) % list.length], next = list[(idx + 1) % list.length];
    setText('[data-dlg-prev-title]', prev ? prev.title : '');
    setText('[data-dlg-next-title]', next ? next.title : '');
    qsa('[data-dlg="prev"]', dialog).forEach(function (b) { b.setAttribute('aria-label', 'Previous project: ' + (prev ? prev.title : '')); });
    qsa('[data-dlg="next"]', dialog).forEach(function (b) { b.setAttribute('aria-label', 'Next project: ' + (next ? next.title : '')); });
    setText('[data-dlg-live]', it.title + ', project ' + (idx + 1) + ' of ' + list.length);

    if (scrollEl) scrollEl.scrollTop = 0;
    if (dir && canAnimate()) {
      bodyEl.classList.remove('is-swapping-next', 'is-swapping-prev');
      void bodyEl.offsetWidth;
      bodyEl.classList.add(dir > 0 ? 'is-swapping-next' : 'is-swapping-prev');
    }
    if (madePv) P.emit('pv:refresh');
    return h;
  }

  function setText(sel, text) { var n = qs(sel, dialog); if (n) n.textContent = text; }

  /* the previous project's scroll offset is restored by the browser when the dialog is shown again: reset it right after showModal() and once more next frame */
  function resetScroll() {
    if (!scrollEl) return;
    scrollEl.scrollTop = 0;
    win.requestAnimationFrame(function () { if (scrollEl) scrollEl.scrollTop = 0; });
  }

  function openProject(id, o) {
    o = o || {};
    var it = byId[lc(id)];
    if (!it || !dialog) return false;
    if (dlg.closing) finishClose();
    var wasOpen = dlg.open;
    var dir = o.dir || 0;
    if (!wasOpen) {
      var ae = doc.activeElement;
      dlg.opener = o.opener || (ae && ae !== doc.body && root.contains(ae) ? ae : null);
      dlg.id = it.id;
      var title = render(it, 0);
      try { if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', ''); }
      catch (e) { dialog.setAttribute('open', ''); }
      dlg.open = true;
      resetScroll();
      P.lockScroll(true, 'dialog');
      if (o.fromHash) dlg.pushed = false;
      else if (o.fromHistory) dlg.pushed = true;
      else dlg.pushed = setHash('#p=' + it.id, 'push');
      try { title.focus({ preventScroll: true }); } catch (e2) { /* ignore */ }
    } else {
      dlg.id = it.id;
      var active = doc.activeElement;
      var h = render(it, dir);
      if (!(active && dialog.contains(active) && active.hasAttribute('data-dlg'))) { try { h.focus({ preventScroll: true }); } catch (e3) { /* ignore */ } }
      if (!o.fromHistory && !o.fromHash) setHash('#p=' + it.id, 'replace');
    }
    P.emit('portfolio:open-project', { id: it.id, source: SELF });
    return true;
  }

  function restoreFocus(id) {
    var op = dlg.opener, target = null;
    if (op && doc.contains(op) && !op.closest('[hidden]') && op.getClientRects().length) target = op;
    else {
      var it = byId[id];
      if (it && it.btn && !it.el.hidden) target = it.btn;
    }
    if (target) { try { target.focus({ preventScroll: !!op && target === op }); } catch (e) { /* ignore */ } }
  }

  function finishClose() {
    var id = dlg.id;
    dlg.closing = false;
    dialog.classList.remove('is-closing');
    try { if (dialog.open) dialog.close(); } catch (e) { dialog.removeAttribute('open'); }
    if (scrollEl) scrollEl.scrollTop = 0;
    P.lockScroll(false, 'dialog');
    restoreFocus(id);
    dlg.opener = null;
    P.emit('portfolio:close-project', { id: id, source: SELF });
  }

  function closeProject(o) {
    o = o || {};
    if (!dlg.open || dlg.closing) return;
    dlg.open = false;
    if (o.fromHistory) dlg.pushed = false;
    else if (dlg.pushed) { dlg.pushed = false; if (o.noBack) setHash('#work', 'replace'); else { try { win.history.back(); } catch (e) { setHash('#work', 'replace'); } } }
    else if (hashId()) setHash('#work', 'replace');
    if (canAnimate() && !o.instant) {
      dlg.closing = true;
      dialog.classList.add('is-closing');
      var done = false;
      var onEnd = function (e) { if (e.target === sheet) fin(); };
      var fin = function () { if (done) return; done = true; sheet.removeEventListener('animationend', onEnd); if (dlg.closing) finishClose(); };
      sheet.addEventListener('animationend', onEnd);
      setTimeout(fin, 320);
    } else finishClose();
  }

  function copyLink(btn) {
    var url = win.location.href.split('#')[0] + '#p=' + dlg.id;
    function done(ok) {
      var use = qs('use', btn);
      setText('[data-dlg-live]', ok ? 'Link copied to the clipboard' : 'Could not copy the link');
      if (!ok) return;
      btn.classList.add('is-done');
      if (use) use.setAttribute('href', '#i-check');
      setTimeout(function () { btn.classList.remove('is-done'); if (use) use.setAttribute('href', '#i-link'); }, 1800);
    }
    function legacy() {
      try {
        var ta = el('textarea');
        ta.value = url; ta.setAttribute('readonly', ''); ta.setAttribute('aria-hidden', 'true');
        ta.className = 'sr-only';
        dialog.appendChild(ta); ta.select();
        var okc = doc.execCommand('copy');
        dialog.removeChild(ta);
        done(!!okc);
      } catch (e) { done(false); }
    }
    if (win.navigator && navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { done(true); }, legacy);
    else legacy();
  }

  function step(dir) {
    if (!dlg.open) return;
    var list = navList();
    if (list.length < 2) return;
    var i = -1;
    list.forEach(function (it, k) { if (it.id === dlg.id) i = k; });
    if (i < 0) return;
    openProject(list[(i + dir + list.length) % list.length].id, { dir: dir });
  }

  function syncFromHash() {
    var id = hashId();
    if (id && byId[id]) {
      if (dlg.open && dlg.id !== id) openProject(id, { fromHistory: true });
      else if (!dlg.open) openProject(id, { fromHistory: true });
    } else if (dlg.open) closeProject({ fromHistory: true });
  }

  function bindDialog() {
    if (!dialog) return;
    dialog.addEventListener('cancel', function (e) { e.preventDefault(); closeProject(); });
    dialog.addEventListener('close', function () {
      /* closed by something other than closeProject (e.g. UA) */
      if (scrollEl) scrollEl.scrollTop = 0;
      if (dlg.open) { dlg.open = false; P.lockScroll(false, 'dialog'); dlg.closing = false; dialog.classList.remove('is-closing'); restoreFocus(dlg.id); dlg.opener = null; }
    });
    var downOnBackdrop = false;
    dialog.addEventListener('pointerdown', function (e) { downOnBackdrop = e.target === dialog; });
    dialog.addEventListener('click', function (e) {
      var t = e.target;
      if (t === dialog) { if (downOnBackdrop) closeProject(); downOnBackdrop = false; return; }
      var ctl = t.closest ? t.closest('[data-dlg]') : null;
      if (ctl) {
        var a = ctl.getAttribute('data-dlg');
        if (a === 'close') closeProject();
        else if (a === 'prev') step(-1);
        else if (a === 'next') step(1);
        else if (a === 'copy') copyLink(ctl);
        return;
      }
      var link = t.closest ? t.closest('a[href^="#"]') : null;
      if (link) {
        var href = link.getAttribute('href') || '';
        var target = null;
        try { target = href.length > 1 ? doc.getElementById(decodeURIComponent(href.slice(1))) : null; } catch (err) { target = null; }
        if (target) {
          e.preventDefault();
          closeProject({ instant: true, noBack: true });
          setTimeout(function () { if (P.goto) P.goto(target.id); else target.scrollIntoView(); }, 30);
        }
      }
    });
    /* document-level so the shortcuts and the Tab wrap keep working even when focus has fallen back to <body> */
    doc.addEventListener('keydown', function (e) {
      if (!dlg.open || dlg.closing) return;
      if ((e.ctrlKey || e.metaKey) && lc(e.key) === 'k') { closeProject({ instant: true }); return; }   /* let the command palette take over */
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var t = e.target;
      if (t && t.closest && t.closest('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'Tab') {
        var f = focusables();
        if (!f.length) return;
        var a = doc.activeElement, first = f[0], last = f[f.length - 1];
        if (!a || !dialog.contains(a)) { e.preventDefault(); (e.shiftKey ? last : first).focus(); }
        else if (e.shiftKey && a === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && a === last) { e.preventDefault(); first.focus(); }
        return;
      }
      if (e.shiftKey) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    });
  }

  function focusables() {
    return qsa('button:not([disabled]), a[href], summary, [tabindex]:not([tabindex="-1"])', dialog).filter(function (n) { return n.getClientRects().length > 0; });
  }

  /* whole card / row opens the case study; nested links, buttons and summaries keep their own behaviour */
  function bindOpeners() {
    root.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button > 0) return;
      var t = e.target;
      if (!t || !t.closest || (dialog && dialog.contains(t))) return;
      var btn = t.closest('.projects__open');
      if (btn) { openProject(btn.getAttribute('data-open'), { opener: btn }); return; }
      if (t.closest('a, button, summary, input, select, textarea, label')) return;
      var host = t.closest('.projects__card, .projects__rowin');
      if (!host) return;
      var sel = win.getSelection && win.getSelection();
      if (sel && String(sel).length > 0) return;
      var li = host.closest('[data-pid]');
      if (li) openProject(li.getAttribute('data-pid'), { opener: qs('.projects__open', li) });
    });
  }

  /* ------------------------------------------------------------------ boot */
  function init() {
    root = doc.getElementById('work');
    if (!root) return;
    gridWrap = qs('#work-featured', root);
    noneMsg = qs('#work-none', root);
    moreWrap = qs('#work-more', root);
    ctaEl = qs('.projects__cta', root);
    countEl = qs('#work-count', root);
    barEl = qs('.projects__bar', root);
    dialog = qs('#work-dialog', root);
    sheet = dialog ? qs('.projects__sheet', dialog) : null;
    bodyEl = dialog ? qs('[data-dlg-body]', dialog) : null;
    scrollEl = dialog ? qs('[data-dlg-scroll]', dialog) : null;
    collect();
    if (!items.length) return;
    publish();
    layoutGrid();
    bindChips();
    bindOpeners();
    if (dialog && sheet && bodyEl) bindDialog(); else dialog = null;

    P.work = {
      open: function (id) { return openProject(id); },
      close: function () { closeProject(); },
      filter: function (cat) { setFilter(cat); },
      get filterId() { return current; },
      get openId() { return dlg.open ? dlg.id : null; }
    };

    P.on('portfolio:filter', function (e) {
      var d = (e && e.detail) || {};
      if (d.source === SELF) return;
      setFilter(d.cat);
    });
    P.on('portfolio:open-project', function (e) {
      var d = (e && e.detail) || {};
      if (d.source === SELF || !d.id) return;
      if (byId[lc(d.id)]) openProject(d.id);
    });
    P.on('portfolio:open-palette', function () { if (dlg.open) closeProject({ instant: true }); });
    win.addEventListener('popstate', syncFromHash);
    win.addEventListener('hashchange', syncFromHash);

    var id = hashId();
    if (id && byId[id] && dialog) {
      try { root.scrollIntoView({ block: 'start', behavior: 'auto' }); } catch (e) { /* ignore */ }
      win.requestAnimationFrame(function () { openProject(id, { fromHash: true }); });
    }
  }

  if (P.ready) P.ready(init);
  else if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
