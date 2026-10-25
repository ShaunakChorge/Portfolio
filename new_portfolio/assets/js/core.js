/* =====================================================================
   NEURAL NEON - core.js  (FOUNDATION)
   Classic script (no modules), IIFE, defer.  Exposes  window.Portfolio.
   Never throws when markup is missing.  Section scripts load AFTER this file.

   API
     Portfolio.ready(fn)                    run fn once DOM + core are ready
     Portfolio.qs / qsa(sel, root)          qsa returns a real Array
     Portfolio.copy(text)                   copy to the clipboard -> Promise<boolean> (shared by contact, pages and the palette)
     Portfolio.prefersReducedMotion         live getter (boolean)
     Portfolio.isCoarse / isMobile          live getters
     Portfolio.on / off / emit              CustomEvent bus on document
     Portfolio.observe(root)                (re)scan [data-reveal] [data-parallax] [data-reveal-group] .timeline[data-fill]
     Portfolio.reveal(elOrSel) / revealAll()   revealAll is for QA scripts (reveals everything at once)
     Portfolio.onScroll(fn) / onResize(fn)  rAF-throttled; fn(state)
     Portfolio.scroll                       {y, max, progress, dir, vh, vw}
     Portfolio.sections / activeSection / goto(id)
     Portfolio.menu.open/close/toggle/isOpen
     Portfolio.toast(msg, {type, duration, title})
     Portfolio.lockScroll(bool, key?)
     Portfolio.store.get/set/remove         safe localStorage ('pf:' prefix)
     Portfolio.raf.add(fn) / remove(fn) / once(fn)   shared rAF loop, paused when the tab is hidden
     Portfolio.refresh()                    rebuild rail / spy / observers after DOM changes
   ===================================================================== */
(function () {
  'use strict';

  var win = window, doc = document, root = doc.documentElement;
  if (win.Portfolio && win.Portfolio.__core) return;
  var P = win.Portfolio = win.Portfolio || {};
  P.__core = true;

  /* ---------- helpers ---------- */
  function qs(sel, ctx) { try { return (ctx || doc).querySelector(sel); } catch (e) { return null; } }
  function qsa(sel, ctx) { try { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); } catch (e) { return []; } }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function now() { return (win.performance && performance.now) ? performance.now() : Date.now(); }
  function noop() {}
  function matchesSel(el, sel) { try { return !!(el && el.matches && el.matches(sel)); } catch (e) { return false; } }
  function scan(ctx, sel) { var out = qsa(sel, ctx); if (ctx && ctx !== doc && matchesSel(ctx, sel)) out.unshift(ctx); return out; }
  function mq(q) {
    var m = null;
    try { m = win.matchMedia ? win.matchMedia(q) : null; } catch (e) { m = null; }
    return m || { matches: false, addEventListener: noop, addListener: noop };
  }
  function listenMQ(m, fn) { if (m.addEventListener) m.addEventListener('change', fn); else if (m.addListener) m.addListener(fn); }
  function raf(fn) { return (win.requestAnimationFrame || function (f) { return setTimeout(function () { f(now()); }, 16); })(fn); }

  P.qs = qs;
  P.qsa = qsa;

  /* clipboard: the async API when allowed, else a hidden textarea + execCommand. One copy of this logic for every script. */
  function legacyCopy(text) {
    var ok = false, prev = doc.activeElement, ta = doc.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.setAttribute('aria-hidden', 'true');
    ta.tabIndex = -1;
    ta.className = 'hp';
    doc.body.appendChild(ta);
    try { ta.select(); ta.setSelectionRange(0, text.length); ok = doc.execCommand('copy'); } catch (e) { ok = false; }
    doc.body.removeChild(ta);
    if (prev && prev !== doc.body && prev.focus) { try { prev.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    return ok;
  }
  P.copy = function (text) {
    text = String(text);
    var nav = win.navigator;
    if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
      return nav.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  };

  var mqReduce = mq('(prefers-reduced-motion: reduce)');
  var mqCoarse = mq('(pointer: coarse)');
  var mqMobile = mq('(max-width: 47.9375em)');      /* em: follows the browser's default font size, like the CSS breakpoints */
  var mqDesktop = mq('(min-width: 48em)');
  /* effects run continuously; the only thing that switches them off is the visitor's own system setting (prefers-reduced-motion) */
  Object.defineProperty(P, 'prefersReducedMotion', { enumerable: true, get: function () { return !!mqReduce.matches; } });
  Object.defineProperty(P, 'isCoarse', { enumerable: true, get: function () { return !!mqCoarse.matches; } });
  Object.defineProperty(P, 'isMobile', { enumerable: true, get: function () { return !!mqMobile.matches; } });

  /* ---------- event bus (CustomEvent on document) ---------- */
  P.on = function (name, fn, opts) { doc.addEventListener(name, fn, opts); return function () { doc.removeEventListener(name, fn, opts); }; };
  P.off = function (name, fn, opts) { doc.removeEventListener(name, fn, opts); };
  P.emit = function (name, detail) {
    var ev;
    try { ev = new CustomEvent(name, { detail: detail }); }
    catch (e) { ev = doc.createEvent('CustomEvent'); ev.initCustomEvent(name, false, false, detail); }
    doc.dispatchEvent(ev);
    return ev;
  };

  listenMQ(mqReduce, function () {
    P.emit('portfolio:motion', { reduced: P.prefersReducedMotion });
    if (P.prefersReducedMotion) { prog.v = prog.target; writeProgress(); }
  });

  /* ---------- safe storage ---------- */
  var mem = {};
  P.store = {
    get: function (key, fallback) {
      var f = fallback === undefined ? null : fallback, v = null;
      try { v = win.localStorage.getItem('pf:' + key); } catch (e) { return key in mem ? mem[key] : f; }
      if (v === null) return f;
      if (v.slice(0, 2) === 'j:') { try { return JSON.parse(v.slice(2)); } catch (e) { return f; } }
      return v;
    },
    set: function (key, val) {
      mem[key] = val;
      try { win.localStorage.setItem('pf:' + key, typeof val === 'string' ? val : 'j:' + JSON.stringify(val)); return true; } catch (e) { return false; }
    },
    remove: function (key) { delete mem[key]; try { win.localStorage.removeItem('pf:' + key); } catch (e) { /* ignore */ } }
  };

  /* ---------- shared rAF scheduler (pauses while the tab is hidden) ---------- */
  var jobs = [], rafId = 0, lastTs = 0;
  function frame(ts) {
    rafId = 0;
    if (!jobs.length || doc.hidden) return;
    var dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016;
    lastTs = ts;
    var list = jobs.slice();
    for (var i = 0; i < list.length; i++) {
      var r;
      try { r = list[i](ts, dt); } catch (e) { r = false; if (win.console) console.error(e); }
      if (r === false) P.raf.remove(list[i]);
    }
    if (jobs.length) rafId = raf(frame);
  }
  function startLoop() { if (!rafId && !doc.hidden && jobs.length) { lastTs = 0; rafId = raf(frame); } }
  P.raf = {
    add: function (fn) { if (typeof fn !== 'function') return fn; if (jobs.indexOf(fn) < 0) jobs.push(fn); startLoop(); return fn; },
    remove: function (fn) { var i = jobs.indexOf(fn); if (i >= 0) jobs.splice(i, 1); return fn; },
    once: function (fn) { return P.raf.add(function (ts, dt) { fn(ts, dt); return false; }); }
  };
  Object.defineProperty(P.raf, 'size', { get: function () { return jobs.length; } });
  doc.addEventListener('visibilitychange', function () {
    if (doc.hidden) { if (rafId && win.cancelAnimationFrame) cancelAnimationFrame(rafId); rafId = 0; }
    else { startLoop(); scheduleTick(); startClock(); }
  });

  /* ---------- scroll lock (keyed, idempotent, scrollbar-width compensated) ---------- */
  var locks = {}, lockedNow = false;
  P.lockScroll = function (on, key) {
    key = key || 'default';
    if (on) locks[key] = 1; else delete locks[key];
    var any = false, k;
    for (k in locks) { if (Object.prototype.hasOwnProperty.call(locks, k)) { any = true; break; } }
    if (any === lockedNow) return any;
    lockedNow = any;
    if (any) {
      root.style.setProperty('--sbw', Math.max(0, win.innerWidth - root.clientWidth) + 'px');
      root.classList.add('is-locked');
    } else {
      root.classList.remove('is-locked');
      root.style.removeProperty('--sbw');
    }
    return any;
  };

  /* ---------- state + element cache ---------- */
  var S = P.scroll = { y: 0, max: 0, progress: 0, dir: 0, vh: 0, vw: 0 };
  var els = {};
  var scrollSubs = [], resizeSubs = [];
  var scrollQueued = false, lastY = 0;
  var parallaxEls = [], timelineEls = [];

  /* ---------- progress hairline (spring) ---------- */
  var prog = { v: 0, vel: 0, target: 0, running: false };
  function writeProgress() {
    if (els.progress) els.progress.style.setProperty('--p', prog.v.toFixed(4));
  }
  function progressStep(ts, dt) {
    if (P.prefersReducedMotion) { prog.v = prog.target; prog.vel = 0; writeProgress(); prog.running = false; return false; }
    dt = Math.min(dt, 1 / 30);
    var k = 200, c = 30;                                   /* framer-like spring (stiffness 200, damping 30) */
    var a = -k * (prog.v - prog.target) - c * prog.vel;
    prog.vel += a * dt;
    prog.v += prog.vel * dt;
    writeProgress();
    if (Math.abs(prog.target - prog.v) < 0.0005 && Math.abs(prog.vel) < 0.002) {
      prog.v = prog.target; prog.vel = 0; writeProgress(); prog.running = false; return false;
    }
  }
  function setProgressTarget(t) {
    prog.target = clamp(t, 0, 1);
    if (P.prefersReducedMotion || !els.progress) { prog.v = prog.target; writeProgress(); return; }
    if (!prog.running) { prog.running = true; P.raf.add(progressStep); }
  }

  /* ---------- scroll spy + rail + nav indicator ---------- */
  var spy = { items: [], active: null, lock: null, lockTimer: 0, railSig: '' };
  P.sections = [];
  P.activeSection = null;

  function collectSections() {
    var list = [], seen = {};
    function add(el) { if (el && el.id && !seen[el.id]) { seen[el.id] = 1; list.push(el); } }
    qsa('section[data-rail]').forEach(add);
    qsa('.nav__link[href^="#"], .drawer__link[href^="#"]').forEach(function (a) {
      var id = (a.getAttribute('href') || '').slice(1);
      if (id) add(doc.getElementById(id));
    });
    list.sort(function (a, b) { return (a.compareDocumentPosition(b) & 4) ? -1 : 1; });
    spy.items = list;
    P.sections = list.map(function (el) { return el.id; });
  }

  function buildRail() {
    var list = qs('.rail__list');
    if (!list) return;
    var secs = qsa('section[data-rail]');
    var sig = secs.map(function (s) { return s.id + '|' + s.getAttribute('data-rail'); }).join(',');
    if (sig === spy.railSig) return;
    spy.railSig = sig;
    list.textContent = '';
    secs.forEach(function (s) {
      if (!s.id) return;
      var li = doc.createElement('li');
      var a = doc.createElement('a');
      a.className = 'rail__link';
      a.href = '#' + s.id;
      a.tabIndex = -1;   /* supplementary nav (the primary nav has the same links): keeps keyboard users from tabbing 7 extra stops before <main> */
      var tick = doc.createElement('span'); tick.className = 'rail__tick'; tick.setAttribute('aria-hidden', 'true');
      var lab = doc.createElement('span'); lab.className = 'rail__label'; lab.textContent = s.getAttribute('data-rail') || s.id;
      a.appendChild(tick); a.appendChild(lab); li.appendChild(a); list.appendChild(li);
    });
    if (els.rail) els.rail.hidden = !list.children.length;
    if (spy.active) markActive(spy.active);
  }

  function markActive(id) {
    qsa('.nav__link[href^="#"], .drawer__link[href^="#"], .rail__link[href^="#"]').forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
    });
    updateIndicator();
  }

  function setActive(id) {
    if (!id || id === spy.active) return;
    var prev = spy.active;
    spy.active = id;
    P.activeSection = id;
    markActive(id);
    var el = doc.getElementById(id);
    P.emit('portfolio:section', { id: id, prev: prev, index: P.sections.indexOf(id), el: el });
  }

  function pickActive() {
    var items = spy.items;
    if (!items.length) return null;
    if (S.max > 0 && S.y >= S.max - 3) return items[items.length - 1].id;      /* page bottom: last section wins */
    var line = S.vh * 0.4, cur = items[0];
    for (var i = 0; i < items.length; i++) {
      if (items[i].getBoundingClientRect().top <= line) cur = items[i]; else break;
    }
    return cur.id;
  }

  function updateIndicator() {
    var nav = els.nav, list = els.navList;
    if (!nav || !list) return;
    var a = qs('.nav__link.is-active', list) || qs('.nav__link[aria-current="page"]', list);   /* multi-page nav: the server marks the current page; home sections mark by hash */
    if (!a || !a.offsetWidth) { nav.classList.remove('is-ready'); return; }
    var cs = win.getComputedStyle(a);
    var pad = parseFloat(cs.paddingLeft) || 0;
    nav.style.setProperty('--ind-x', (a.offsetLeft + pad) + 'px');
    nav.style.setProperty('--ind-w', Math.max(0, a.offsetWidth - pad * 2) + 'px');
    nav.classList.add('is-ready');
  }

  function lockSpy(id) {
    spy.lock = { id: id, t: now() };
    clearTimeout(spy.lockTimer);
    spy.lockTimer = setTimeout(function () { spy.lock = null; scheduleTick(); }, 1100);
  }
  if ('onscrollend' in win) {
    win.addEventListener('scrollend', function () { if (spy.lock && now() - spy.lock.t > 120) { clearTimeout(spy.lockTimer); spy.lock = null; scheduleTick(); } });
  }

  /* ---------- the single scroll tick (reads first, writes after) ---------- */
  function scheduleTick() { if (!scrollQueued) { scrollQueued = true; raf(scrollTick); } }
  function scrollTick() {
    scrollQueued = false;
    var de = root, body = doc.body;
    var y = win.pageYOffset || de.scrollTop || 0;
    S.vh = win.innerHeight || de.clientHeight || 0;
    S.vw = win.innerWidth || de.clientWidth || 0;
    S.max = Math.max(0, Math.max(de.scrollHeight, body ? body.scrollHeight : 0) - S.vh);
    S.dir = y > lastY ? 1 : (y < lastY ? -1 : 0);
    lastY = y;
    S.y = y;
    S.progress = S.max > 0 ? clamp(y / S.max, 0, 1) : 0;

    /* reads */
    var pick = spy.lock ? spy.lock.id : pickActive();
    var tl = [], i, r;
    for (i = 0; i < timelineEls.length; i++) {
      if (timelineEls[i].closest('section.is-offscreen')) continue;   /* skipped (content-visibility) subtree: reading its geometry would force a layout */
      r = timelineEls[i].getBoundingClientRect();
      if (r.bottom > -200 && r.top < S.vh + 200) tl.push({ el: timelineEls[i], r: r });
    }
    var par = [];
    if (!P.prefersReducedMotion) {
      for (i = 0; i < parallaxEls.length; i++) {
        var host = parallaxEls[i].parentElement || parallaxEls[i];
        r = host.getBoundingClientRect();
        if (r.bottom > -100 && r.top < S.vh + 100) par.push({ el: parallaxEls[i], f: parseFloat(parallaxEls[i].getAttribute('data-parallax')) || 0.3, top: r.top });
      }
    }
    var passes = [];
    tl.forEach(function (t) {
      var items = qsa('.timeline__item', t.el), line = S.vh * 0.62;
      passes.push(items.map(function (it) { return it.getBoundingClientRect().top + 14 < line; }));
    });

    /* writes */
    if (els.header) {
      var sc = y > 20;
      if (sc !== !!spy.scrolled) { spy.scrolled = sc; els.header.classList.toggle('is-scrolled', sc); }
    }
    setProgressTarget(S.progress);
    if (pick) setActive(pick);
    par.forEach(function (p) {
      /* parallax relative to the host's own scroll position (0 when host top is at the viewport top) */
      var off = Math.max(0, -p.top) * p.f;
      p.el.style.translate = '0 ' + off.toFixed(1) + 'px';
    });
    tl.forEach(function (t, n) {
      var rr = t.r, line = S.vh * 0.62;
      t.el.style.setProperty('--fill', clamp((line - rr.top) / Math.max(rr.height, 1), 0, 1).toFixed(4));
      var items = qsa('.timeline__item', t.el);
      items.forEach(function (it, k) { var on = passes[n][k]; if (it.classList.contains('is-passed') !== on) it.classList.toggle('is-passed', on); });
    });
    for (i = 0; i < scrollSubs.length; i++) { try { scrollSubs[i](S); } catch (e) { if (win.console) console.error(e); } }
  }
  P.onScroll = function (fn) { if (typeof fn === 'function') scrollSubs.push(fn); return function () { var i = scrollSubs.indexOf(fn); if (i >= 0) scrollSubs.splice(i, 1); }; };
  P.onResize = function (fn) { if (typeof fn === 'function') resizeSubs.push(fn); return function () { var i = resizeSubs.indexOf(fn); if (i >= 0) resizeSubs.splice(i, 1); }; };

  var resizeQueued = false;
  function onResize() {
    if (resizeQueued) return;
    resizeQueued = true;
    raf(function () {
      resizeQueued = false;
      updateIndicator();
      /* the burger can disappear at a width the media query did not predict (large text): never leave the drawer open without its control */
      if (menu.isOpen() && els.burger && !els.burger.offsetParent) menu.close(false);
      if (lockedNow) root.style.setProperty('--sbw', Math.max(0, win.innerWidth - root.clientWidth) + 'px');
      scrollTick();
      for (var i = 0; i < resizeSubs.length; i++) { try { resizeSubs[i](S); } catch (e) { if (win.console) console.error(e); } }
    });
  }

  /* ---------- smooth anchors with header offset ---------- */
  /* The long pages draw a section only when it is near the screen (content-visibility, pages.css) and count the others at a guessed height, so a jump worked out from that layout
     lands far from its section. Before any jump every section is drawn once: the real heights are then known (and the browser remembers them), and the jump lands on its target. */
  var drawnAll = false;
  function drawAll() {
    if (drawnAll) return;
    drawnAll = true;
    if (!doc.querySelector('.pg-sec')) return;
    root.classList.add('pg-all');
    void root.offsetHeight;                                 /* lay everything out now, before the jump is measured */
  }
  function scrollToEl(target, id) {
    if (!target) return;
    drawAll();
    if (spy.items.indexOf(target) >= 0) { lockSpy(id); setActive(id); }
    var reduce = P.prefersReducedMotion;
    if (id === 'top') { try { win.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); } catch (e0) { win.scrollTo(0, 0); } return; }   /* #top = very top of the page (the sticky header must not be the scroll target) */
    try { target.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' }); }
    catch (e) { target.scrollIntoView(true); }
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    try { target.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }
  var lastHash = location.hash || '';
  function setHash(id) {
    try {
      if (location.hash !== '#' + id) history.pushState(null, '', '#' + id);
      else history.replaceState(null, '', '#' + id);     /* same hash: never stack duplicate history entries */
    } catch (e) { /* file:// or sandbox */ }
    lastHash = location.hash || '';
  }
  P.goto = function (id) {
    var el = typeof id === 'string' ? doc.getElementById(id.replace(/^#/, '')) : id;
    if (!el) return false;
    scrollToEl(el, el.id);
    if (el.id) setHash(el.id);
    return true;
  };
  /* instant jump (the page has scroll-behavior: smooth, which would animate scrollTo / scrollIntoView with 'auto') */
  function jumpTo(y) {
    var prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    try { win.scrollTo(0, y); } catch (e) { /* ignore */ }
    root.style.scrollBehavior = prev;
  }
  /* Back / Forward between section hashes: scrollRestoration is 'manual' (content-visibility sections change height, so the
     browser's saved offsets land in the wrong place); we scroll to the hash target ourselves. */
  function onPopState() {
    var cur = location.hash || '';
    var changed = cur !== lastHash;
    lastHash = cur;
    if (!changed) return;                                  /* same hash: dialog open/close (the project dialog owns #p=...) */
    var id = cur.slice(1);
    try { id = decodeURIComponent(id); } catch (e) { /* keep raw */ }
    if (/^p=/.test(id)) return;
    var beh = P.prefersReducedMotion ? 'auto' : 'smooth';
    var el = id ? doc.getElementById(id) : null;
    if (el) {
      drawAll();
      if (spy.items.indexOf(el) >= 0) { lockSpy(id); setActive(id); }
      try { el.scrollIntoView({ block: 'start', behavior: beh }); } catch (e) { el.scrollIntoView(true); }
    } else if (!id) {
      try { win.scrollTo({ top: 0, behavior: beh }); } catch (e) { win.scrollTo(0, 0); }
    }
  }
  /* scrollRestoration is 'manual', so reload / history navigation outside the page restores the position from here */
  function saveScroll() { try { win.sessionStorage.setItem('pf:scroll:' + location.pathname, String(Math.round(win.pageYOffset || 0))); } catch (e) { /* ignore */ } }
  function restoreScroll() {
    var type = '', saved = null, y;
    try { var n = performance.getEntriesByType('navigation')[0]; type = n ? n.type : ''; } catch (e) { /* ignore */ }
    try { saved = win.sessionStorage.getItem('pf:scroll:' + location.pathname); } catch (e) { saved = null; }
    y = saved === null ? NaN : parseInt(saved, 10);
    if ((type === 'reload' || type === 'back_forward') && !isNaN(y)) { if (y > 0) drawAll(); jumpTo(y); return y; }
    return null;
  }
  function onDocClick(e) {
    if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var t = e.target;
    if (!t || !t.closest) return;

    var trig = t.closest('[data-open-palette]');
    if (trig) { if (menu.isOpen()) menu.close(false); P.emit('portfolio:open-palette', { source: trig }); return; }

    var btn = t.closest('.btn');
    if (btn && !P.prefersReducedMotion) {
      btn.classList.remove('is-fired'); void btn.offsetWidth; btn.classList.add('is-fired');
      setTimeout(function () { btn.classList.remove('is-fired'); }, 650);
    }

    var a = t.closest('a[href^="#"]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var href = a.getAttribute('href') || '';
    if (href.length < 2) return;
    var id; try { id = decodeURIComponent(href.slice(1)); } catch (err) { id = href.slice(1); }
    var target = doc.getElementById(id);
    if (!target) return;
    e.preventDefault();
    if (menu.isOpen()) menu.close(false);
    scrollToEl(target, id);
    setHash(id);
  }

  /* ---------- mobile menu (drawer): focus trap, ESC, inert, scroll lock ---------- */
  var menu = (function () {
    var opened = false;
    function setInert(on) {
      ['#main', 'body > footer', '.rail', '.fab-wrap'].forEach(function (s) {
        qsa(s).forEach(function (n) { if (on) n.setAttribute('inert', ''); else n.removeAttribute('inert'); });
      });
    }
    function focusables() {
      var f = [];
      if (els.burger) f.push(els.burger);
      if (els.drawer) qsa('a[href], button:not([disabled])', els.drawer).forEach(function (n) { if (n.offsetParent !== null || n === doc.activeElement) f.push(n); });
      return f;
    }
    function onKey(e) {
      if (!opened) return;
      if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); api.close(true); return; }
      if (e.key !== 'Tab') return;
      var f = focusables();
      if (!f.length) return;
      var i = f.indexOf(doc.activeElement);
      if (e.shiftKey && i <= 0) { f[f.length - 1].focus(); e.preventDefault(); }
      else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { f[0].focus(); e.preventDefault(); }
    }
    var api = {
      isOpen: function () { return opened; },
      open: function () {
        if (opened || !els.drawer || !els.burger) return;
        opened = true;
        els.drawer.classList.add('is-open');
        if (els.header) els.header.classList.add('is-open');
        els.burger.setAttribute('aria-expanded', 'true');
        els.burger.setAttribute('aria-label', 'Close menu');
        setInert(true);
        P.lockScroll(true, 'menu');
        doc.addEventListener('keydown', onKey, true);
        var first = qs('a[href]', els.drawer);
        if (first) setTimeout(function () { try { first.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 60);
      },
      close: function (returnFocus) {
        if (!opened) return;
        opened = false;
        if (els.drawer) els.drawer.classList.remove('is-open');
        if (els.header) els.header.classList.remove('is-open');
        if (els.burger) { els.burger.setAttribute('aria-expanded', 'false'); els.burger.setAttribute('aria-label', 'Open menu'); }
        setInert(false);
        P.lockScroll(false, 'menu');
        doc.removeEventListener('keydown', onKey, true);
        if (returnFocus && els.burger) { try { els.burger.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }   /* preventScroll: the header is sticky, and a plain focus() scrolled the page up when the menu was closed with Escape */
      },
      toggle: function () { if (opened) api.close(true); else api.open(); }
    };
    return api;
  })();
  P.menu = menu;

  /* ---------- reveal ---------- */
  var revealIO = null;
  function markIn(el) { el.classList.add('is-in'); }
  function initObservers() {
    if (!('IntersectionObserver' in win)) return;
    revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { markIn(en.target); revealIO.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.02 });
  }

  P.reveal = function (target) {
    var list = typeof target === 'string' ? qsa(target) : (target && target.length !== undefined && !target.nodeType ? Array.prototype.slice.call(target) : [target]);
    list.forEach(function (el) { if (el && el.classList) markIn(el); });
  };
  P.revealAll = function () { root.classList.add('reveal-all'); qsa('[data-reveal]').forEach(markIn); };

  P.observe = function (ctx) {
    ctx = ctx || doc;
    var n = 0;
    scan(ctx, '[data-reveal-group]').forEach(function (g) {
      var variant = g.getAttribute('data-reveal-group') || '';
      Array.prototype.forEach.call(g.children, function (c, i) {
        if (c.hasAttribute('data-rv')) return;
        if (!c.hasAttribute('data-reveal')) c.setAttribute('data-reveal', variant);
        c.style.setProperty('--i', String(i));
      });
    });
    scan(ctx, '[data-reveal]').forEach(function (el) {
      if (el.hasAttribute('data-rv')) return;
      el.setAttribute('data-rv', '1');
      var d = parseInt(el.getAttribute('data-reveal-delay'), 10);
      if (d) el.style.setProperty('--rd', d + 'ms');
      if (revealIO) revealIO.observe(el); else markIn(el);
      n++;
    });
    scan(ctx, '[data-parallax]').forEach(function (el) { if (parallaxEls.indexOf(el) < 0) parallaxEls.push(el); });
    scan(ctx, '.timeline[data-fill]').forEach(function (el) { if (timelineEls.indexOf(el) < 0) timelineEls.push(el); });
    if (parallaxEls.length || timelineEls.length) scheduleTick();
    return n;
  };

  /* ---------- toast ---------- */
  var toastHost = null;
  function ensureToastHost() {
    if (toastHost && doc.body.contains(toastHost)) return toastHost;
    toastHost = qs('.toasts');
    if (!toastHost) {
      toastHost = doc.createElement('div');
      toastHost.className = 'toasts';
      toastHost.id = 'toasts';
      toastHost.setAttribute('aria-live', 'polite');
      toastHost.setAttribute('aria-relevant', 'additions');
      doc.body.appendChild(toastHost);
    }
    return toastHost;
  }
  function dismissToast(el) {
    if (!el || el.__gone) return;
    el.__gone = true;
    clearTimeout(el.__t);
    if (P.prefersReducedMotion) { if (el.parentNode) el.parentNode.removeChild(el); return; }
    el.classList.add('is-leaving');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 260);
  }
  P.toast = function (msg, opts) {
    opts = opts || {};
    var type = (opts.type === 'success' || opts.type === 'error') ? opts.type : 'info';
    var host = ensureToastHost();
    var el = doc.createElement('div');
    el.className = 'toast toast--' + type;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    var icon = type === 'success' ? 'check' : (type === 'error' ? 'circle-alert' : 'info');
    el.innerHTML = '<svg class="icon icon--lg toast__icon" aria-hidden="true" focusable="false"><use href="#i-' + icon + '"></use></svg>' +
      '<p class="toast__msg"></p>' +
      '<button type="button" class="toast__x" aria-label="Dismiss notification"><svg class="icon" aria-hidden="true" focusable="false"><use href="#i-x"></use></svg></button>';
    el.querySelector('.toast__msg').textContent = String(msg == null ? '' : msg);
    el.querySelector('.toast__x').addEventListener('click', function () { dismissToast(el); });
    var dur = opts.duration === undefined ? (type === 'error' ? 7000 : 4500) : opts.duration;
    function arm() { clearTimeout(el.__t); if (dur > 0) el.__t = setTimeout(function () { dismissToast(el); }, dur); }
    el.addEventListener('mouseenter', function () { clearTimeout(el.__t); });
    el.addEventListener('mouseleave', arm);
    el.addEventListener('focusin', function () { clearTimeout(el.__t); });
    el.addEventListener('focusout', arm);
    host.appendChild(el);
    /* count only toasts that are not already leaving (a leaving toast stays in the DOM for 260 ms; counting it froze the tab) */
    var live = Array.prototype.filter.call(host.children, function (t) { return !t.__gone; });
    while (live.length > 4) dismissToast(live.shift());
    arm();
    return el;
  };
  P.toast.clear = function () { qsa('.toast', toastHost || doc).forEach(dismissToast); };

  /* ---------- clock chips ---------- */
  var clockTimer = 0;
  var clockFmt = {};   /* one formatter per time zone, created on first use */
  function clockText(el) {
    var tz = el.getAttribute('data-clock') || 'Asia/Kolkata', t;
    try { t = (clockFmt[tz] || (clockFmt[tz] = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }))).format(new Date()); }
    catch (e) { return null; }
    var label = el.getAttribute('data-clock-label'), suf = el.getAttribute('data-clock-suffix');
    return (label ? label.toUpperCase() + ' ' : '') + t + (suf ? ' ' + suf : '');
  }
  function tickClock() {
    qsa('[data-clock]').forEach(function (el) { var s = clockText(el); if (s && el.textContent !== s) el.textContent = s; });
    startClock();
  }
  function startClock() {
    clearTimeout(clockTimer);
    if (doc.hidden || !qs('[data-clock]')) return;
    clockTimer = setTimeout(tickClock, 60000 - (Date.now() % 60000) + 40);
  }

  /* ---------- init ---------- */
  var readyQueue = [], sectionsStarted = false;
  P.ready = function (fn) {
    if (typeof fn !== 'function') return;
    if (sectionsStarted) { try { fn(); } catch (e) { if (win.console) console.error(e); } }
    else readyQueue.push(fn);
  };
  P.refresh = function () {
    collectSections();
    buildRail();
    P.observe(doc);
    updateIndicator();
    scheduleTick();
  };

  function init() {
    els.header = qs('.site-header');
    els.progress = qs('.progress');
    els.nav = qs('.nav');
    els.navList = qs('.nav__list');
    els.rail = qs('.rail');
    els.burger = qs('.burger');
    els.drawer = qs('.drawer');

    /* the accent switch and the pause switch are gone: forget what an earlier visit saved */
    P.store.remove('accent');
    P.store.remove('motion');

    initObservers();
    collectSections();
    buildRail();
    P.observe(doc);

    if (els.burger) els.burger.addEventListener('click', function () { menu.toggle(); });
    listenMQ(mqDesktop, function () { if (mqDesktop.matches && menu.isOpen()) menu.close(false); });

    doc.addEventListener('click', onDocClick);
    win.addEventListener('scroll', scheduleTick, { passive: true });
    win.addEventListener('resize', onResize, { passive: true });
    win.addEventListener('orientationchange', onResize);

    /* late-added markup (sections that render cards at runtime): rescan when element nodes appear */
    if ('MutationObserver' in win) {
      var mo = new MutationObserver(function (muts) {
        var hit = false;
        for (var i = 0; i < muts.length && !hit; i++) {
          var add = muts[i].addedNodes;
          for (var j = 0; j < add.length; j++) {
            var n = add[j];
            if (n.nodeType === 1 && (matchesSel(n, '[data-reveal],[data-reveal-group],[data-parallax],.timeline[data-fill],section[data-rail]') || (n.querySelector && n.querySelector('[data-reveal],[data-reveal-group],[data-parallax],.timeline[data-fill],section[data-rail]')))) { hit = true; break; }
          }
        }
        if (hit) raf(function () { P.refresh(); });
      });
      var m = qs('main');
      if (m) mo.observe(m, { childList: true, subtree: true });
    }

    /* pause the ambient CSS animations of sections that are far off-screen (one observer for all sections) */
    var secs = qsa('main > section');
    if (secs.length && 'IntersectionObserver' in win) {
      var offIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { en.target.classList.toggle('is-offscreen', !en.isIntersecting); });
      }, { rootMargin: '120px 0px' });
      secs.forEach(function (s) { offIO.observe(s); });
    }

    /* history: manual restoration + our own popstate / save / restore (see onPopState) */
    try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) { /* ignore */ }
    win.addEventListener('popstate', onPopState);
    win.addEventListener('pagehide', saveScroll);
    doc.addEventListener('visibilitychange', function () { if (doc.hidden) saveScroll(); });

    tickClock();
    scheduleTick();                                        /* first tick inside the first animation frame, not synchronously (avoids a forced layout during init) */
    root.classList.add('core-ready');

    /* the section scripts start after the first frame has been painted (their first layout read would otherwise force the page's first layout inside
       the start-up task), one per task and in order, so their start-up work never adds up to one long task. A hidden tab never paints, hence the timer fallback. */
    var started = false;
    function runNext() {
      var fn = readyQueue.shift();
      if (!fn) { sectionsStarted = true; return; }
      try { fn(); } catch (e) { if (win.console) console.error(e); }
      setTimeout(runNext, 0);
    }
    function startSections() { if (started) return; started = true; runNext(); }
    if (win.requestAnimationFrame) win.requestAnimationFrame(function () { setTimeout(startSections, 0); });
    setTimeout(startSections, 1500);

    /* settle: fonts / images change widths and heights */
    function settle() { collectSections(); updateIndicator(); scheduleTick(); }
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(settle, noop);
    function onLoad() {
      settle();
      /* reload / history navigation: put the visitor back where they were; fresh visit with a #hash: re-align once layout has settled
         (content-visibility / late images can shift it). Done twice (now and ~0.4 s later, content-visibility sections near the
         viewport swap their estimated height for the real one) unless the visitor has already scrolled by hand. */
      var moved = false;
      function stop() { moved = true; }
      ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) { win.addEventListener(ev, stop, { once: true, passive: true }); });
      var ry = restoreScroll(), restored = ry !== null;
      function hashTarget() {
        var h = location.hash && location.hash.length > 1 ? location.hash.slice(1) : '';
        if (!h) return null;
        try { h = decodeURIComponent(h); } catch (e) { /* keep raw */ }
        return /^p=/.test(h) ? null : doc.getElementById(h);
      }
      function align() {
        if (restored) { jumpTo(ry); return; }
        var t = hashTarget();
        if (!t) return;
        drawAll();
        var prev = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        try { t.scrollIntoView({ block: 'start', behavior: 'auto' }); } catch (e2) { /* ignore */ }
        root.style.scrollBehavior = prev;
      }
      if (!restored && !hashTarget()) return;
      if (!restored) align();
      else scheduleTick();
      setTimeout(function () { if (!moved) { align(); scheduleTick(); } }, 420);
    }
    if (doc.readyState === 'complete') raf(onLoad); else win.addEventListener('load', onLoad);
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
