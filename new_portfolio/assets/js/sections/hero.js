/* =====================================================================
   NEURAL NEON - hero.js   section #home
   * typed / rotating role line (one pass through every role, then rests on the first)
   * rAF-driven typing of the code window (~120 chars/s, the whole intro lands in ~4-5 s)
   * typing starts once the code window is on screen (>= 25%, phones >= 60%: it sits below the CTAs), not on load
   * mouse click / key / Skip button finishes everything instantly (a touch that starts a scroll does not); Replay restarts it
   * paused while the hero is off-screen (IntersectionObserver) and while the tab is hidden (core raf)
   * reduced motion: nothing animates, the full text is simply there (the markup is complete without JS)
   Uses window.Portfolio (core.js): ready, raf, prefersReducedMotion, on.  Exposes Portfolio.hero = {skip, replay, running}.
   ===================================================================== */
(function () {
  'use strict';

  var doc = document;
  var P = window.Portfolio;
  if (!P || !P.qs) return;                       /* core.js not loaded: nothing to do */

  var CPS = 120;             /* code typing speed, chars per second */
  var LINE_PAUSE = 0.04;     /* s, "Enter" between code lines */
  var START_DELAY = 0.4;     /* s: wait for the entrance sequence (counted from the moment the stage is on screen) */
  var ROLE_HOLD = 1.4, ROLE_TYPE_CPS = 28, ROLE_DEL_CPS = 60;   /* all four roles cycle in ~10 s */

  var qs = P.qs, qsa = P.qsa;

  /* decorative photos start loading just after the first paint (markup holds data-src / data-srcset behind a 1px placeholder),
     so they never compete with the CSS and fonts that paint the text. Runs even when the hero animation is off. */
  function lateImages() {
    qsa('[data-late]').forEach(function (pic) {
      qsa('source[data-srcset]', pic).forEach(function (s) { s.srcset = s.getAttribute('data-srcset'); s.removeAttribute('data-srcset'); });
      var img = qs('img[data-src]', pic);
      if (img) { img.src = img.getAttribute('data-src'); img.removeAttribute('data-src'); }
      pic.removeAttribute('data-late');
    });
  }
  function scheduleLate() {
    var go = function () { setTimeout(lateImages, 80); };
    if (doc.readyState === 'complete') go(); else window.addEventListener('load', go, { once: true });
  }

  function boot() {
    scheduleLate();
    var root = doc.getElementById('home');
    if (!root) return;

    var codeList = qs('.hero__lines', root);
    var roleEl = qs('[data-hero-role]', root);
    var roleBox = qs('.hero__roles', root);
    var ctrl = qs('[data-hero-ctrl]', root);
    var roles = (root.getAttribute('data-roles') || '').split('|').filter(Boolean);

    var reduced = P ? P.prefersReducedMotion : (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var canAnimate = !!(P && P.raf && codeList && 'IntersectionObserver' in window);

    if (reduced || !canAnimate) {                 /* static hero: complete text, no controls */
      root.classList.add('is-ready');
      if (ctrl) ctrl.hidden = true;
      return;
    }

    /* ------------------------------------------------------------ state */
    root.classList.add('has-typer');              /* phones: the code window shows about 10 lines and follows the typing (see hero.css) */
    var editor = qs('.hero__editor', root);
    var pristine = codeList.innerHTML;
    var S = { phase: 'idle', delay: 0, code: null, role: null, visible: true, running: false, armed: false };
    var lineEls = [];
    var caret = doc.createElement('span');
    caret.className = 'hero__caret is-live';
    caret.setAttribute('aria-hidden', 'true');
    var entranceUntil = (window.performance && performance.now ? performance.now() : Date.now()) + 1500;

    /* ------------------------------------------------------------ typing primitives */
    function buildUnits(sources) {
      /* every text node becomes  [typed text][hidden remainder]  so the final layout (and every wrap) is reserved from the start */
      var units = [];
      sources.forEach(function (src, li) {
        var w = doc.createTreeWalker(src, NodeFilter.SHOW_TEXT, null);
        var nodes = [];
        while (w.nextNode()) nodes.push(w.currentNode);
        nodes.forEach(function (tn) {
          var s = tn.data;
          if (!s) return;
          var typed = doc.createTextNode('');
          var rest = doc.createElement('span');
          rest.className = 'hero__rest';
          var rt = doc.createTextNode(s);
          rest.appendChild(rt);
          tn.parentNode.insertBefore(typed, tn);
          tn.parentNode.replaceChild(rest, tn);
          units.push({ typed: typed, rest: rest, rt: rt, s: s, n: 0, line: li });
        });
      });
      return units;
    }
    function typer(units, cps, pause, onLine) {
      return { u: units, i: 0, acc: 0, wait: 0, line: -1, cps: cps, pause: pause || 0, onLine: onLine || null, done: !units.length };
    }
    function moveCaret(node) { if (node && node.parentNode) node.parentNode.insertBefore(caret, node.nextSibling); }
    function dropCaret() { if (caret.parentNode) caret.parentNode.removeChild(caret); }
    function setCurLine(i) {
      lineEls.forEach(function (el, k) { el.classList.toggle('is-cur', k === i); });
      followLine(i);
    }
    /* when the window is shorter than its text (phones), keep the line being typed in view */
    function followLine(i) {
      if (!editor) return;
      if (i < 0) { editor.scrollTop = editor.scrollHeight; return; }   /* finished or skipped: show the end of the snippet */
      if (!lineEls[i]) return;
      var over = editor.scrollHeight - editor.clientHeight;
      if (over <= 1) { editor.scrollTop = 0; return; }
      var el = lineEls[i];
      var top = el.getBoundingClientRect().top - editor.getBoundingClientRect().top + editor.scrollTop;
      editor.scrollTop = Math.max(0, Math.min(over, top + el.offsetHeight - editor.clientHeight + 12));
    }
    function stepTyper(t, dt) {
      if (t.done) return true;
      if (t.wait > 0) { t.wait -= dt; if (t.wait > 0) return false; }
      t.acc += dt * t.cps;
      var guard = 0;
      while (t.acc >= 1 && t.i < t.u.length && guard++ < 64) {
        var u = t.u[t.i];
        if (u.n === 0 && u.line !== t.line) {
          var first = t.line === -1;
          t.line = u.line;
          if (t.onLine) t.onLine(u.line);
          if (!first && t.pause) { t.wait = t.pause; t.acc = 0; return false; }
        }
        u.n++; t.acc -= 1;
        u.typed.data = u.s.slice(0, u.n);
        if (u.n >= u.s.length) { if (u.rest.parentNode) u.rest.parentNode.removeChild(u.rest); t.i++; }
        else u.rt.data = u.s.slice(u.n);
        moveCaret(u.typed);
      }
      if (t.i >= t.u.length) { t.done = true; return true; }
      return false;
    }
    function completeTyper(t) {
      if (!t) return;
      for (var k = t.i; k < t.u.length; k++) {
        var u = t.u[k];
        u.typed.data = u.s;
        if (u.rest.parentNode) u.rest.parentNode.removeChild(u.rest);
        u.n = u.s.length;
      }
      t.i = t.u.length; t.done = true;
    }

    /* ------------------------------------------------------------ role rotator */
    function roleNode() { return roleEl.firstChild && roleEl.firstChild.nodeType === 3 ? roleEl.firstChild : roleEl.appendChild(doc.createTextNode('')); }
    function newRole() {
      return { phase: 'wait', t: START_DELAY + ROLE_HOLD, idx: 0, text: roles[0] || '', target: '', acc: 0, node: roleNode() };
    }
    function stepRole(R, dt) {
      if (!R || R.phase === 'done') return false;
      if (R.phase === 'wait') {
        R.t -= dt;
        if (R.t <= 0) { R.phase = 'del'; R.acc = 0; roleBox.classList.add('is-typing'); }
        return true;
      }
      if (R.phase === 'del') {
        R.acc += dt * ROLE_DEL_CPS;
        while (R.acc >= 1 && R.text.length) { R.text = R.text.slice(0, -1); R.acc -= 1; }
        R.node.data = R.text;
        if (!R.text.length) { R.idx = (R.idx + 1) % roles.length; R.target = roles[R.idx]; R.phase = 'type'; R.acc = 0; }
        return true;
      }
      R.acc += dt * ROLE_TYPE_CPS;                      /* type */
      while (R.acc >= 1 && R.text.length < R.target.length) { R.text = R.target.slice(0, R.text.length + 1); R.acc -= 1; }
      R.node.data = R.text;
      if (R.text.length >= R.target.length) {
        roleBox.classList.remove('is-typing');
        if (R.idx === 0) { R.phase = 'done'; return false; }
        R.phase = 'wait'; R.t = ROLE_HOLD;
      }
      return true;
    }

    /* ------------------------------------------------------------ setup / reset (also used by replay) */
    function prepare() {
      codeList.innerHTML = pristine;
      if (editor) editor.scrollTop = 0;
      lineEls = qsa('.hero__line', codeList);
      var srcs = qsa('.hero__src', codeList);
      S.code = typer(buildUnits(srcs), CPS, LINE_PAUSE, setCurLine);
      S.role = roles.length > 1 && roleEl ? newRole() : null;
      if (roleEl && roles[0]) roleNode().data = roles[0];
      if (roleBox) roleBox.classList.remove('is-typing');
      dropCaret();
      if (S.code.u.length) { moveCaret(S.code.u[0].typed); setCurLine(0); }   /* caret waits on line 1 */
      S.phase = 'delay'; S.delay = START_DELAY;
      setCtrl('skip');
    }
    function setCtrl(state) {
      if (!ctrl) return;
      ctrl.hidden = false;
      ctrl.setAttribute('data-state', state);
      ctrl.setAttribute('aria-label', state === 'skip' ? 'Skip the typing animation' : 'Replay the typing animation');
    }

    /* ------------------------------------------------------------ the loop (one shared rAF job) */
    function loop(ts, dt) {
      if (!S.visible) { S.running = false; return false; }
      var busy = false;

      switch (S.phase) {
        case 'delay':
          if (!S.armed) break;                        /* hold until the code window has been on screen */
          S.delay -= dt; busy = true;
          if (S.delay <= 0) S.phase = 'code';
          break;
        case 'code':
          busy = true;
          if (stepTyper(S.code, dt)) {
            setCurLine(-1); dropCaret();
            S.phase = 'done'; setCtrl('replay');
          }
          break;
        default: break;
      }

      if (S.role && S.role.phase !== 'done') { if (stepRole(S.role, dt)) busy = true; }
      if (!busy && S.phase === 'done') { S.running = false; return false; }
      return true;
    }
    function start() {
      if (S.running || !S.visible) return;
      if (S.phase === 'done' && (!S.role || S.role.phase === 'done')) return;
      S.running = true;
      P.raf.add(loop);
    }

    /* ------------------------------------------------------------ skip / replay */
    function finish() {
      completeTyper(S.code);
      setCurLine(-1); dropCaret();
      if (S.role) { S.role.phase = 'done'; S.role.text = roles[0]; S.role.node.data = roles[0]; }
      roleBox.classList.remove('is-typing');
      S.phase = 'done';
      setCtrl('replay');
      if (S.running) { S.running = false; P.raf.remove(loop); }
    }
    function replay() {
      if (S.running) { S.running = false; P.raf.remove(loop); }
      prepare();
      S.armed = true;                                 /* the user asked for it: no waiting for the viewport */
      S.delay = 0.2;
      if (S.role) S.role.t = 0.2 + ROLE_HOLD;
      start();
    }

    /* click / key anywhere on the hero skips the intro (entrance + typing) */
    function userSkip(e) {
      if (e.type === 'keydown') {
        var k = e.key;
        if (k === 'Tab' || k === 'Shift' || k === 'Control' || k === 'Alt' || k === 'Meta' || k === 'CapsLock' || k === 'Escape') return;
      }
      var now = (window.performance && performance.now ? performance.now() : Date.now());
      if (now < entranceUntil) root.classList.add('is-skipped');
      if (S.phase !== 'done' || (S.role && S.role.phase !== 'done')) finish();
    }
    /* a touch that starts a scroll must not skip the intro (phones scroll by touching the hero): taps skip through "click" instead */
    root.addEventListener('pointerdown', function (e) { if (e.pointerType === 'touch' || (ctrl && ctrl.contains(e.target))) return; userSkip(e); }, { passive: true });
    root.addEventListener('click', function (e) { if (ctrl && ctrl.contains(e.target)) return; userSkip(e); });
    doc.addEventListener('keydown', function (e) { if (ctrl && e.target === ctrl) return; userSkip(e); });
    if (ctrl) {
      ctrl.addEventListener('click', function () {
        if (ctrl.getAttribute('data-state') === 'skip') finish(); else replay();
      });
    }

    /* off-screen: stop the job (resumes where it left off) */
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        S.visible = en.isIntersecting;
        if (S.visible) start();
      });
    }, { threshold: 0 });
    io.observe(root);

    /* typing begins when the code window is actually on screen (>= 25%): on phones it sits below the text */
    var ioStage = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting || S.armed) return;
        S.armed = true; ioStage.disconnect(); start();
      });
    }, { threshold: P.isMobile ? 0.6 : 0.25 });   /* phones: wait until most of the (shorter) editor is in view */
    var stageEl = qs('.hero__code', root);
    if (stageEl) ioStage.observe(stageEl); else S.armed = true;

    /* OS "reduce motion" switched on while the page is open: finish at once */
    if (P.on) P.on('portfolio:motion', function (e) { if (e && e.detail && e.detail.reduced) finish(); });

    prepare();
    root.classList.add('is-ready');
    start();

    P.hero = { skip: finish, replay: replay, get running() { return S.running; }, get phase() { return S.phase; } };
  }

  if (P && P.ready) P.ready(boot);
  else if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
