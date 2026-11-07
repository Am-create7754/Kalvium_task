/* =====================================================================
   PRISM — Learning progress & navigation
   Builds the sticky nav, lesson-map drawer, 45-minute timeline and the
   prev / mark-done / next footer of every module. Progress is kept in
   localStorage (wrapped in try/catch — the lesson works without it).
   ===================================================================== */
(function () {
  'use strict';

  // The lesson plan. Minutes MUST add up to 45.
  const SECTIONS = [
    { id: 'objectives',   short: 'Goals',      title: 'Welcome & learning goals',  min: 2 },
    { id: 'problem',      short: 'Problem',    title: 'The problem & RAG',          min: 4 },
    { id: 'chunking',     short: 'Chunking',   title: 'What is text chunking?',     min: 6 },
    { id: 'size-overlap', short: 'Size & overlap', title: 'Chunk size & overlap',   min: 8, key: true },
    { id: 'lab',          short: 'Lab',        title: 'The Chunking Lab',           min: 8, key: true },
    { id: 'rag',          short: 'RAG sim',    title: 'RAG retrieval simulation',   min: 6 },
    { id: 'challenge',    short: 'Challenge',  title: 'Engineer challenge',         min: 4 },
    { id: 'quiz',         short: 'Quiz',       title: 'Knowledge check',            min: 5 },
    { id: 'applications', short: 'Real world', title: 'Real-world apps & wrap-up',  min: 2 }
  ];
  const TOTAL = SECTIONS.reduce((a, s) => a + s.min, 0);   // 45
  const KEY = 'chunklab-progress-v1';
  const emit = (type, data) => document.dispatchEvent(new CustomEvent('chunklab', { detail: Object.assign({ type: type }, data) }));

  let state = load();
  const listeners = [];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      const s = raw ? JSON.parse(raw) : null;
      if (s && Array.isArray(s.done)) return s;
    } catch (e) { /* storage unavailable — fall through */ }
    return { done: [], meta: {} };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } }

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  function isDone(id) { return state.done.includes(id); }
  function markDone(id, silent) {
    if (!SECTIONS.some((s) => s.id === id) || isDone(id)) return;
    state.done.push(id);
    save();
    render();
    emit('module-done', { id: id, all: state.done.length === SECTIONS.length, anchor: document.activeElement });
    if (!silent) toast('✓ ' + SECTIONS.find((s) => s.id === id).title + ' completed');
  }
  function setMeta(k, v) { state.meta = state.meta || {}; state.meta[k] = v; save(); render(); }
  function getMeta(k) { return (state.meta || {})[k]; }
  function reset() { state = { done: [], meta: {} }; save(); render(); listeners.forEach((f) => f('reset')); emit('reset', {}); }
  function onChange(f) { listeners.push(f); }

  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('is-show'), 2600);
  }

  // ---------- Build static navigation once ----------
  function build() {
    $('#topnavList').innerHTML = SECTIONS.map((s) =>
      '<li><a class="topnav__link" href="#' + s.id + '" data-nav="' + s.id + '"><span class="tick" aria-hidden="true">✓</span>' + s.short + '</a></li>'
    ).join('');

    $('#mapList').innerHTML = SECTIONS.map((s, i) =>
      '<li><a class="map-item" href="#' + s.id + '" data-nav="' + s.id + '">' +
        '<span class="map-item__n">' + (i + 1) + '</span>' +
        '<span class="map-item__t">' + s.title + '</span>' +
        '<span class="map-item__time">' + s.min + ' min</span></a></li>'
    ).join('');

    $('#timelineBar').innerHTML = SECTIONS.map((s) =>
      '<li class="tl-seg' + (s.key ? ' is-key' : '') + '" style="--min:' + s.min + '" data-tl="' + s.id + '">' +
        '<a href="#' + s.id + '" aria-label="' + s.title + ', ' + s.min + ' minutes">' +
        '<span class="tl-seg__bar"></span><span class="tl-seg__t">' + s.short + '</span>' +
        '<span class="tl-seg__m">' + s.min + 'm</span></a></li>'
    ).join('');
    $('#timeTotal').textContent = 'Σ ' + TOTAL + ' min';

    // Section footers: Previous · Mark done · Next
    SECTIONS.forEach((s, i) => {
      const foot = $('[data-foot="' + s.id + '"]');
      if (!foot) return;
      const prev = SECTIONS[i - 1];
      const next = SECTIONS[i + 1];
      foot.innerHTML =
        '<div class="foot">' +
          '<a class="btn btn--ghost" href="#' + (prev ? prev.id : 'home') + '">← ' + (prev ? prev.short : 'Top') + '</a>' +
          '<div class="foot__mid" data-mid="' + s.id + '"></div>' +
          '<a class="btn btn--primary" data-next="' + s.id + '" href="#' + (next ? next.id : 'complete') + '">' +
            (next ? 'Done · Next: ' + next.short : 'Finish lesson') + ' →</a>' +
        '</div>';
    });

    // "Done · Next" marks the module complete and continues.
    document.addEventListener('click', (e) => {
      const nx = e.target.closest('[data-next]');
      if (nx) markDone(nx.getAttribute('data-next'));
      const nav = e.target.closest('#mapList [data-nav]');
      if (nav) closeMap();
    });

    // Drawer
    $('#mapToggle').addEventListener('click', openMap);
    $('#mapClose').addEventListener('click', closeMap);
    $('#mapScrim').addEventListener('click', closeMap);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#lessonMap').hidden) closeMap(); });
    $('#resetProgress').addEventListener('click', () => { reset(); toast('Progress reset'); });

    observe();
  }

  function openMap() { $('#lessonMap').hidden = false; $('#mapToggle').setAttribute('aria-expanded', 'true'); $('#mapClose').focus(); }
  function closeMap() { $('#lessonMap').hidden = true; $('#mapToggle').setAttribute('aria-expanded', 'false'); $('#mapToggle').focus({ preventScroll: true }); }

  // ---------- Active-section tracking ----------
  let active = null;
  function observe() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) setActive(en.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    SECTIONS.forEach((s) => { const el = document.getElementById(s.id); if (el) io.observe(el); });
    const home = document.getElementById('home');
    if (home) io.observe(home);
  }
  function setActive(id) {
    active = id;
    $$('[data-nav]').forEach((a) => {
      const on = a.getAttribute('data-nav') === id;
      a.classList.toggle('is-active', on);
      if (on) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
    });
    const link = $('.topnav [data-nav="' + id + '"]');
    if (link && link.scrollIntoView && window.innerWidth > 1180) {
      const nav = $('.topnav');
      const l = link.offsetLeft - nav.clientWidth / 2 + link.clientWidth / 2;
      nav.scrollTo({ left: l, behavior: 'smooth' });
    }
  }

  // ---------- Render dynamic state ----------
  function render() {
    const doneMin = SECTIONS.filter((s) => isDone(s.id)).reduce((a, s) => a + s.min, 0);
    const pct = Math.round((doneMin / TOTAL) * 100);
    $('#progressPct').textContent = pct + '%';
    $('#progressRing').style.setProperty('--p', pct);
    $('#progressBar').style.width = pct + '%';

    $$('[data-nav]').forEach((a) => a.classList.toggle('is-done', isDone(a.getAttribute('data-nav'))));
    $$('[data-tl]').forEach((li) => li.classList.toggle('is-done', isDone(li.getAttribute('data-tl'))));
    $$('[data-mid]').forEach((m) => {
      m.innerHTML = isDone(m.getAttribute('data-mid')) ? '<span class="foot__done">Completed</span>' : '';
    });

    // Completion card
    const n = state.done.length;
    $('#cmpModules').textContent = n + '/' + SECTIONS.length;
    const q = getMeta('quiz');
    $('#cmpQuiz').textContent = q ? q.score + '/' + q.total : '–';
    const c = getMeta('challenge');
    $('#cmpChallenge').textContent = c ? c.passed + '/' + c.total + ' tests' : '–';
    const all = n === SECTIONS.length;
    $('#complete').classList.toggle('is-done', all);
    $('#completeTitle').textContent = all ? 'You completed PRISM! 🎉' : (n ? 'Keep going — you\'re on your way' : 'Your progress lives here');
    const missing = SECTIONS.filter((s) => !isDone(s.id)).map((s) => s.short);
    $('#completeMsg').textContent = all
      ? 'You can now explain why RAG systems chunk documents, choose a strategy, tune size and overlap, and predict how those choices affect retrieval. Next step: try a real splitter (like LangChain\'s) on your own PDF and test it with real questions.'
      : 'Still to do: ' + missing.join(', ') + '.';
    $('#finishBtn').textContent = all ? 'Completed ✓' : 'Mark lesson complete';
    $('#finishBtn').disabled = all;

    listeners.forEach((f) => f('render'));
  }

  window.Progress = {
    SECTIONS: SECTIONS, TOTAL: TOTAL,
    isDone: isDone, markDone: markDone, setMeta: setMeta, getMeta: getMeta,
    reset: reset, onChange: onChange, toast: toast,
    init: function () { build(); render(); }
  };
})();
