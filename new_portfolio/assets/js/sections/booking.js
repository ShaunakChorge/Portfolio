/* =====================================================================
   NEURAL NEON - booking.js   the "Book a call" picker on /contact/ (#book). Loaded only on pages that have it (assetTags() in build.mjs).
   Classic IIFE, registers through window.Portfolio, never throws when markup is missing.
     1 day buttons and time buttons built from the weekly hours in data-booking (India Standard Time, a fixed +05:30 offset: no daylight saving)
     2 the visitor's own time is shown under the picker (Intl), the call length changes the slots on offer
     3 submit: validation, honeypot, shared rate limit with the brief form, Formspree POST, success panel
     4 "Add to calendar": a Google Calendar link and a downloadable .ics file, both marked tentative until the slot is confirmed by email
   There is no calendar server: this sends a REQUEST, and the owner confirms by email. Two visitors can ask for the same slot.
   ===================================================================== */
(function () {
  'use strict';

  var win = window, doc = document;
  if (!win.Portfolio || !win.Portfolio.qs) return;

  var qs = win.Portfolio.qs, qsa = win.Portfolio.qsa;
  function P() { return win.Portfolio || null; }
  function reduced() { var p = P(); return !!(p && p.prefersReducedMotion); }
  function setIcon(svg, id) { var u = svg && svg.querySelector ? svg.querySelector('use') : null; if (u) u.setAttribute('href', '#i-' + id); }
  function focusEl(el, opts) { if (!el) return; try { el.focus(opts || {}); } catch (e) { /* ignore */ } }

  var IST = 330;                                         /* minutes ahead of UTC */
  var WD = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var RATE = { gap: 30000, max: 3, windowMs: 600000 };   /* the same limits as the brief form, and the same stored list, so both forms share them */

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toMin(hhmm) { var a = String(hhmm).split(':'); return (+a[0]) * 60 + (+a[1]); }
  function istParts(ms) { var d = new Date(ms + IST * 60000); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay() }; }
  function istToUtc(y, m, d, minutes) { return Date.UTC(y, m, d, Math.floor(minutes / 60), minutes % 60) - IST * 60000; }
  function clock12(minutes) { var h = Math.floor(minutes / 60), m = minutes % 60, ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return h + ':' + pad(m) + ' ' + ap; }
  function icsStamp(ms) { var d = new Date(ms); return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z'; }

  /* ---------- shared rate limit (the brief form stores the same list under the same key) ---------- */
  function loadSent() {
    var p = P(), list = p && p.store ? p.store.get('contact-sent', []) : [];
    if (!Array.isArray(list)) list = [];
    var now = Date.now();
    return list.filter(function (t) { return typeof t === 'number' && t <= now && now - t < RATE.windowMs; });
  }
  function recordSend() { var l = loadSent(); l.push(Date.now()); var p = P(); if (p && p.store) p.store.set('contact-sent', l); }
  function rateCheck() {
    var now = Date.now(), sent = loadSent(), last = sent.length ? sent[sent.length - 1] : 0;
    if (last && now - last < RATE.gap) return { kind: 'gap', wait: Math.ceil((RATE.gap - (now - last)) / 1000) };
    if (sent.length >= RATE.max) return { kind: 'max', wait: Math.ceil((RATE.windowMs - (now - sent[0])) / 1000) };
    return null;
  }

  /* ---------- a radio group made of buttons: one tab stop, arrow keys move and select ---------- */
  function radioGroup(box, onPick) {
    function items() { return qsa('[role="radio"]', box); }
    function pick(el, focus) {
      items().forEach(function (b) { var on = b === el; b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; b.classList.toggle('is-on', on); });
      if (focus) focusEl(el);
      onPick(el);
    }
    box.addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('[role="radio"]') : null; if (b && box.contains(b)) pick(b, false); });
    box.addEventListener('keydown', function (e) {
      var list = items(), i = list.indexOf(doc.activeElement), n = -1;
      if (i < 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = (i + 1) % list.length;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = (i - 1 + list.length) % list.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = list.length - 1;
      else return;
      e.preventDefault();
      pick(list[n], true);
    });
    return { pick: pick, items: items, reset: function () { items().forEach(function (b, k) { b.setAttribute('aria-checked', 'false'); b.classList.remove('is-on'); b.tabIndex = k === 0 ? 0 : -1; }); } };
  }

  function init() {
    var root = qs('#book');
    if (!root) return;
    var cfg;
    try { cfg = JSON.parse(root.getAttribute('data-booking') || ''); } catch (e) { return; }
    var form = qs('#book-form', root), compose = qs('[data-book-compose]', root), done = qs('#bk-done', root);
    var daysBox = qs('#book-days', root), slotsBox = qs('#book-slots', root), localOut = qs('#book-local', root);
    if (!form || !daysBox || !slotsBox || !compose || !done) return;

    var status = qs('#bk-status', root), submit = qs('#bk-submit', root), submitLabel = qs('.contact__submit-label', submit), submitIcon = qs('svg.icon', submit);
    var fail = qs('#bk-fail', root), failTitle = qs('#bk-fail-title', root), failText = qs('#bk-fail-text', root), failMail = qs('#bk-fail-mail', root);
    var honey = qs('input[name="_gotcha"]', form);
    var f = { name: qs('#bk-name', form), email: qs('#bk-email', form), type: qs('#bk-type', form), note: qs('#bk-note', form) };
    var hidSubject = qs('input[name="_subject"]', form), hidIst = qs('input[name="slot_ist"]', form), hidUtc = qs('input[name="slot_utc"]', form), hidLocal = qs('input[name="visitor_time"]', form);
    qsa('.book__nojs input', form).forEach(function (i) { i.disabled = true; });      /* the plain date and time boxes are only for visitors without JavaScript */

    var state = { length: cfg.defaultLength || 30, day: null, min: null, utc: 0, busy: false };
    var days = [];
    function dayByKey(key) { return days.filter(function (x) { return x.key === key; })[0]; }
    /* the two button groups are wired once; renderDays() and renderSlots() only replace the buttons inside them */
    var dayGroup = radioGroup(daysBox, function (el) { state.day = el.getAttribute('data-day'); state.min = null; state.utc = 0; renderSlots(); updateHidden(); });
    var slotGroup = radioGroup(slotsBox, function (el) {
      var d = dayByKey(state.day);
      state.min = +el.getAttribute('data-min');
      state.utc = d ? istToUtc(d.p.y, d.p.m, d.p.d, state.min) : 0;
      updateHidden();
    });

    /* ----- 1 days ----- */
    function dayList() {
      var now = Date.now(), out = [];
      for (var i = 0; i <= (cfg.daysAhead || 14); i++) {
        var t = now + i * 86400000, p = istParts(t), key = p.y + '-' + pad(p.m + 1) + '-' + pad(p.d);
        if (out.some(function (d) { return d.key === key; })) continue;
        var s = slotsFor(p, state.length);
        if (s.length) out.push({ key: key, p: p, slots: s });
      }
      return out;
    }
    function slotsFor(p, length) {
      var minUtc = Date.now() + (cfg.minNoticeHours || 0) * 3600000, out = [];
      (cfg.weekly[WD[p.wd]] || []).forEach(function (w) {
        for (var t = toMin(w[0]); t + length <= toMin(w[1]); t += (cfg.step || 30)) { if (istToUtc(p.y, p.m, p.d, t) >= minUtc) out.push(t); }
      });
      return out;
    }
    function renderDays() {
      days = dayList();
      daysBox.innerHTML = '';
      if (!days.length) { daysBox.innerHTML = '<p class="book__hint">No times are open in the next few days. Please send a brief instead and I will reply by email.</p>'; slotsBox.innerHTML = ''; return; }
      days.forEach(function (d, i) {
        var b = doc.createElement('button');
        b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false'); b.tabIndex = i === 0 ? 0 : -1; b.className = 'book__day'; b.setAttribute('data-day', d.key);
        b.setAttribute('aria-label', DAYS[d.p.wd] + ' ' + d.p.d + ' ' + MONTHS[d.p.m]);
        b.innerHTML = '<span>' + DAYS[d.p.wd] + '</span><strong>' + d.p.d + '</strong><span>' + MONTHS[d.p.m] + '</span>';
        daysBox.appendChild(b);
      });
      if (state.day) {                                    /* keep the chosen day when the length changes, if it is still on offer */
        var keep = qsa('.book__day', daysBox).filter(function (b) { return b.getAttribute('data-day') === state.day; })[0];
        if (keep) { dayGroup.pick(keep, false); return; }
      }
      state.day = null; state.min = null; state.utc = 0;
      slotsBox.innerHTML = '<p class="book__hint">Choose a day first.</p>';
      updateHidden();
    }

    /* ----- 2 times ----- */
    function renderSlots() {
      var d = dayByKey(state.day);
      slotsBox.innerHTML = '';
      if (!d) { slotsBox.innerHTML = '<p class="book__hint">Choose a day first.</p>'; return; }
      d.slots.forEach(function (t, i) {
        var b = doc.createElement('button');
        b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false'); b.tabIndex = i === 0 ? 0 : -1; b.className = 'book__slot'; b.setAttribute('data-min', String(t));
        b.textContent = clock12(t);
        slotsBox.appendChild(b);
      });
    }

    function istLabel() {
      var d = dayByKey(state.day);
      if (!d || state.min === null) return '';
      return DAYS[d.p.wd] + ' ' + d.p.d + ' ' + MONTHS[d.p.m] + ' ' + d.p.y + ', ' + clock12(state.min) + ' ' + (cfg.label || 'IST') + ' (' + state.length + ' min)';
    }
    function localLabel() {
      if (!state.utc) return '';
      try {
        var opt = { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' };
        var tz = (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || '';
        return new Intl.DateTimeFormat(undefined, opt).format(new Date(state.utc)) + (tz ? ' (' + tz + ')' : '');
      } catch (e) { return ''; }
    }
    function sameZoneAsIst() { return new Date().getTimezoneOffset() === -IST; }
    function updateHidden() {
      var ist = istLabel();
      hidIst.value = ist; hidUtc.value = state.utc ? new Date(state.utc).toISOString() : ''; hidLocal.value = localLabel();
      hidSubject.value = ist ? 'Call request: ' + ist : (cfg.subject || 'Call request from the portfolio');
      if (localOut) localOut.textContent = ist ? (sameZoneAsIst() ? 'You chose ' + ist + '.' : 'You chose ' + ist + '. In your time: ' + localLabel() + '.') : '';
    }

    /* call length: the radio buttons are plain inputs */
    qsa('input[name="call_length"]', form).forEach(function (r) {
      r.addEventListener('change', function () { if (r.checked) { state.length = +r.value; var hadMin = state.min; renderDays(); if (hadMin !== null && state.min === null) setStatus('That time is not free for the longer call. Please pick another.', 'error'); } });
    });

    /* ----- 3 the form ----- */
    function setStatus(text, st) { if (!status) return; status.textContent = text || ''; if (st) status.setAttribute('data-state', st); else status.removeAttribute('data-state'); }
    function fieldWrap(el) { return el.closest ? el.closest('.field') : null; }
    function setError(el, text) {
      var w = fieldWrap(el), msg = w ? qs('.field__msg', w) : null;
      if (!w) return;
      if (text) { w.classList.add('field--error'); el.setAttribute('aria-invalid', 'true'); if (msg) msg.textContent = text; }
      else { w.classList.remove('field--error'); el.removeAttribute('aria-invalid'); if (msg) msg.textContent = ''; }
    }
    function check() {
      var first = null;
      var n = f.name.value.trim(), em = f.email.value.trim();
      if (n.length < 2) { setError(f.name, n ? 'Your name looks too short.' : 'Please enter your name.'); first = first || f.name; } else setError(f.name, '');
      if (!em) { setError(f.email, 'Please enter your email address so I can confirm the time.'); first = first || f.email; }
      else if (!EMAIL_RE.test(em)) { setError(f.email, 'That does not look like a valid email address (for example name@example.com).'); first = first || f.email; }
      else setError(f.email, '');
      return first;
    }
    [f.name, f.email].forEach(function (el) { el.addEventListener('input', function () { if (fieldWrap(el).classList.contains('field--error')) check(); }); });

    function showFail(title, text) {
      if (failTitle) failTitle.textContent = title; if (failText) failText.textContent = text;
      if (failMail) failMail.setAttribute('href', 'mailto:' + (form.getAttribute('data-email') || '') + '?subject=' + encodeURIComponent('Call request') + '&body=' + encodeURIComponent((istLabel() ? 'I would like a call on ' + istLabel() + '.\n\n' : '') + f.note.value.trim().slice(0, 1200)));
      if (fail) { fail.hidden = false; try { fail.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); } catch (e) { /* ignore */ } }
    }
    function setSending(on) {
      state.busy = on; submit.disabled = on; submit.classList.toggle('is-loading', on); form.setAttribute('aria-busy', on ? 'true' : 'false');
      setIcon(submitIcon, on ? 'loader' : 'calendar'); if (submitLabel) submitLabel.textContent = on ? 'Sending…' : 'Request this slot';
      setStatus(on ? 'Sending your request…' : '', '');
    }

    form.noValidate = true;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (state.busy) return;
      if (fail) fail.hidden = true;
      var bad = check();
      if (!state.utc) { setStatus('Please choose a day and a time first.', 'error'); focusEl(qs('.book__day[aria-checked="true"]', daysBox) || qs('.book__day', daysBox) || f.name); return; }
      if (bad) { setStatus('Please fix the highlighted field and try again.', 'error'); focusEl(bad); return; }
      setStatus('', '');
      if (honey && honey.value) { showDone(); return; }
      var rl = rateCheck();
      if (rl) {
        var wait = rl.kind === 'gap' ? rl.wait + ' seconds' : Math.max(1, Math.ceil(rl.wait / 60)) + ' minutes';
        showFail('Slow down a little', 'You sent a message a moment ago. Please wait about ' + wait + ' before sending another request, or email me directly.');
        return;
      }
      send();
    });

    function send() {
      setSending(true);
      var ctrl = typeof win.AbortController === 'function' ? new win.AbortController() : null;
      var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 20000);
      var opts = { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) };
      if (ctrl) opts.signal = ctrl.signal;
      win.fetch(form.getAttribute('action') || '', opts).then(function (res) {
        clearTimeout(timer); setSending(false);
        if (res.ok) { recordSend(); showDone(); return; }
        if (res.status === 429) showFail('Too many requests', 'The form is receiving a lot of traffic right now. Please try again in a few minutes, or email me directly.');
        else showFail('Request not sent', 'Something went wrong on the way. Your choices are still here, so you can try again, or email me directly.');
        focusEl(submit);
      }).catch(function () {
        clearTimeout(timer); setSending(false);
        showFail('Request not sent', 'I could not reach the form service (check your connection). Your choices are still here, so you can try again, or email me directly.');
        focusEl(submit);
      });
    }

    /* ----- 4 success panel and calendar entries ----- */
    var icsUrl = '';
    function showDone() {
      var ist = istLabel(), loc = sameZoneAsIst() ? '' : localLabel();
      var nm = f.name.value.trim().split(/\s+/)[0] || '', em = f.email.value.trim();
      var text = qs('#bk-done-text', done), when = qs('#bk-done-when', done);
      if (text) text.textContent = 'Thank you' + (nm ? ', ' + nm : '') + '. I will confirm this slot by email to ' + (em || 'your address') + '.';
      if (when) when.textContent = ist + (loc ? '. In your time: ' + loc : '');
      var start = state.utc, end = start + state.length * 60000;
      var title = 'Call with ' + (cfg.person || 'Shaunak Chorge') + ' (to be confirmed)';
      var details = 'Requested through the portfolio website. The slot is tentative until it is confirmed by email.' + (f.type.value ? ' Topic: ' + f.type.options[f.type.selectedIndex].text + '.' : '');
      var g = qs('#bk-gcal', done), ics = qs('#bk-ics', done);
      if (g) g.setAttribute('href', 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) + '&dates=' + icsStamp(start) + '/' + icsStamp(end) + '&details=' + encodeURIComponent(details) + '&location=' + encodeURIComponent('Call (the link will be sent by email)'));
      if (ics && win.Blob && win.URL && win.URL.createObjectURL) {
        var body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Shaunak Chorge//Portfolio booking//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
          'UID:' + start + '-' + Math.round(Math.random() * 1e9) + '@portfolio', 'DTSTAMP:' + icsStamp(Date.now()), 'DTSTART:' + icsStamp(start), 'DTEND:' + icsStamp(end),
          'SUMMARY:' + title, 'DESCRIPTION:' + details.replace(/[,;]/g, function (c) { return '\\' + c; }), 'STATUS:TENTATIVE', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n') + '\r\n';
        if (icsUrl) win.URL.revokeObjectURL(icsUrl);
        icsUrl = win.URL.createObjectURL(new win.Blob([body], { type: 'text/calendar;charset=utf-8' }));
        ics.setAttribute('href', icsUrl);
      }
      if (root) root.style.setProperty('--cf-h', compose.offsetHeight + 'px');   /* the confirmation keeps the panel height (contact.css .contact__done): no layout jump */
      compose.hidden = true; done.hidden = false;
      focusEl(done, { preventScroll: true });
      try { done.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); } catch (e) { /* ignore */ }
    }
    var again = qs('#bk-again', done);
    if (again) again.addEventListener('click', function () {
      form.reset(); state.day = null; state.min = null; state.utc = 0; state.length = cfg.defaultLength || 30;
      renderDays(); updateHidden(); setStatus('', '');
      if (root) root.style.removeProperty('--cf-h');
      done.hidden = true; compose.hidden = false; focusEl(qs('.book__day', daysBox) || f.name);
    });

    /* ?q= and ?ref= are handled by pages.js (the brief form); a booking link only needs the topic */
    var topic = /[?&]topic=([^&#]+)/.exec(win.location.search || '');
    if (topic && f.type) { try { var v = decodeURIComponent(topic[1]); for (var i = 0; i < f.type.options.length; i++) if (f.type.options[i].value === v) { f.type.value = v; break; } } catch (e) { /* ignore */ } }

    renderDays();
    updateHidden();
  }

  if (win.Portfolio.ready) win.Portfolio.ready(init);
  else if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
