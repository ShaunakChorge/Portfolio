/* Neon portrait behaviour: pointer-parallax tilt, glitch ghosts, off-screen pause. Classic script, defer.
   No dependencies. Does nothing under prefers-reduced-motion (re-evaluated live). window.NeonPortrait.init(root?) re-scans. */
(function () {
  'use strict';
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var MAX_TILT = 7;          // degrees
  var EASE = 0.12;           // lerp per frame
  var instances = [];

  function reduced() { return !!mq.matches; }

  function Portrait(root) {
    this.root = root;
    this.stage = root.querySelector('.np__stage');
    this.tilt = root.querySelector('.np__tilt');
    this.fig = root.querySelector('.np__fig');
    this.x = 0; this.y = 0; this.tx = 0; this.ty = 0;      // current / target, -1..1
    this.raf = 0; this.inView = true; this.active = false;
    this.ghosts = false;
    if (!this.stage || !this.tilt) return;
    this.bind();
    this.applyMotionState();
  }

  Portrait.prototype.bind = function () {
    var self = this, st = this.stage;
    function toTarget(e) {
      var r = st.getBoundingClientRect();
      if (!r.width || !r.height) return;
      self.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      self.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
      self.kick();
    }
    function relax() { self.tx = 0; self.ty = 0; self.kick(); }
    st.addEventListener('pointermove', function (e) { if (!reduced()) toTarget(e); }, { passive: true });
    st.addEventListener('pointerenter', function (e) { if (!reduced()) toTarget(e); }, { passive: true });
    st.addEventListener('pointerleave', relax, { passive: true });
    st.addEventListener('pointercancel', relax, { passive: true });
    st.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') relax(); }, { passive: true });

    if ('IntersectionObserver' in window) {
      this.io = new IntersectionObserver(function (entries) {
        var vis = entries[entries.length - 1].isIntersecting;
        self.inView = vis;
        self.root.classList.toggle('is-paused', !vis);
        if (!vis) { cancelAnimationFrame(self.raf); self.raf = 0; }
      }, { rootMargin: '80px' });
      this.io.observe(this.root);
    }
    document.addEventListener('visibilitychange', function () {
      self.root.classList.toggle('is-paused', document.hidden || !self.inView);
    });
  };

  /* clone the base picture twice for the CSS RGB-split glitch (no extra network: same URLs) */
  Portrait.prototype.addGhosts = function () {
    if (this.ghosts || !this.fig) return;
    var base = this.fig.querySelector('.np__pic');
    if (!base) return;
    ['c', 'm'].forEach(function (k) {
      var g = base.cloneNode(true);
      g.className = 'np__ghost np__ghost--' + k;
      g.setAttribute('aria-hidden', 'true');
      var img = g.querySelector('img');
      if (img) { img.alt = ''; img.removeAttribute('id'); img.className = ''; img.loading = 'lazy'; }
      this.fig.appendChild(g);
    }, this);
    this.fig.classList.add('is-glitchy');
    this.ghosts = true;
  };
  Portrait.prototype.removeGhosts = function () {
    if (!this.ghosts || !this.fig) return;
    var g = this.fig.querySelectorAll('.np__ghost');
    for (var i = 0; i < g.length; i++) g[i].parentNode.removeChild(g[i]);
    this.fig.classList.remove('is-glitchy');
    this.ghosts = false;
  };

  Portrait.prototype.applyMotionState = function () {
    if (reduced()) {
      this.removeGhosts();
      this.tx = this.ty = this.x = this.y = 0;
      this.write();
    } else {
      this.addGhosts();
    }
  };

  Portrait.prototype.kick = function () {
    if (this.raf || reduced() || !this.inView) return;
    var self = this;
    this.raf = requestAnimationFrame(function step() {
      self.raf = 0;
      self.x += (self.tx - self.x) * EASE;
      self.y += (self.ty - self.y) * EASE;
      var settled = Math.abs(self.tx - self.x) < 0.002 && Math.abs(self.ty - self.y) < 0.002;
      if (settled) { self.x = self.tx; self.y = self.ty; }
      self.write();
      if (!settled) self.raf = requestAnimationFrame(step);
    });
  };

  Portrait.prototype.write = function () {
    var s = this.root.style;
    s.setProperty('--np-rx', (-this.y * MAX_TILT).toFixed(3) + 'deg');
    s.setProperty('--np-ry', (this.x * MAX_TILT).toFixed(3) + 'deg');
    s.setProperty('--np-px', this.x.toFixed(3));
    s.setProperty('--np-py', this.y.toFixed(3));
  };

  function init(scope) {
    var nodes = (scope || document).querySelectorAll('[data-neon-portrait]');
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].__np) continue;
      var p = new Portrait(nodes[i]);
      nodes[i].__np = p; nodes[i].setAttribute('data-np-ready', '');
      instances.push(p);
    }
  }

  function onMotionChange() { instances.forEach(function (p) { p.applyMotionState(); }); }
  if (mq.addEventListener) mq.addEventListener('change', onMotionChange);
  else if (mq.addListener) mq.addListener(onMotionChange);

  window.NeonPortrait = { init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); });
  else init();
})();
