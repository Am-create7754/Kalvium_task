/* =====================================================================
   ChunkLab — Play layer: learn while playing
   ---------------------------------------------------------------------
   • Chunky, a little document mascot that gives tips and reacts
   • XP + levels + 10 badges for real learning actions
   • Confetti bursts, floating "+XP", badge pop-ups
   • Scroll-reveal transitions, count-up numbers, slider value pops
   • Calm mode: switches all of it off (default when the OS asks for
     reduced motion). The lesson works identically either way.

   Other modules talk to this file only through DOM events:
     document.dispatchEvent(new CustomEvent('chunklab', { detail: { type, … } }))
   ===================================================================== */
(function () {
  'use strict';

  const KEY = 'chunklab-fun-v1';
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  const LEVELS = [
    { xp: 0, name: 'Chunk Rookie' },
    { xp: 80, name: 'Chunk Apprentice' },
    { xp: 180, name: 'Chunk Builder' },
    { xp: 300, name: 'Retrieval Ranger' },
    { xp: 420, name: 'RAG Master' }
  ];
  const BADGES = [
    { id: 'first-cut', ic: '✂️', name: 'First Cut', desc: 'Generate chunks in the Lab' },
    { id: 'bridge', ic: '🌉', name: 'Bridge Builder', desc: 'Use overlap to link chunks' },
    { id: 'surgeon', ic: '🧩', name: 'Sentence Surgeon', desc: 'Sentence chunking with zero mid-sentence cuts' },
    { id: 'scientist', ic: '🔬', name: 'Lab Scientist', desc: 'Compare two configurations' },
    { id: 'detective', ic: '🔎', name: 'Retrieval Detective', desc: 'Ask the RAG assistant a question' },
    { id: 'fragment', ic: '💥', name: 'Fragment Finder', desc: 'Discover an answer sliced by bad chunking' },
    { id: 'explorer', ic: '📄', name: 'Doc Explorer', desc: 'Bring your own document' },
    { id: 'engineer', ic: '🛠️', name: 'Doc Engineer', desc: 'Pass all 3 challenge tests' },
    { id: 'quiz', ic: '🧠', name: 'Quiz Whiz', desc: 'Score 5 or more in the quiz' },
    { id: 'champion', ic: '🏆', name: 'ChunkLab Champion', desc: 'Complete every module' }
  ];
  const TIPS = {
    home: ['Hi! I\'m Chunky ✂️ I turn huge documents into bite-size pieces. Let\'s play!', 'Collect badges and XP as you learn. Tap me any time for a hint!'],
    objectives: ['7 goals, 45 minutes. I\'ll keep score — every real experiment earns XP ⭐', 'Orange-outlined boxes are toys. Poke them!'],
    problem: ['Flip the toggle! Look how much text the AI would have to read 😱', 'Press ▶ Play to send a question through the whole RAG pipeline!'],
    chunking: ['Press "Chunk it ✂" and watch me slice that paragraph!', 'Spot the coral edge? That chunk was cut mid-sentence. Ouch!'],
    'size-overlap': ['Drag the size dial all the way left… what happens to the sentences? 👀', 'Overlap is a bridge 🌉 — the same words appear in two chunks.'],
    lab: ['This is my playground! Every number here is real. Turn the dials!', 'Try the presets in the Compare box — earn the Lab Scientist badge 🔬', 'Got a PDF? Drop it in the editor! 📄'],
    rag: ['Ask me something! Then pick "Poor: fixed · 8 / 0" and watch me break 😵', 'The bars show how every chunk scored. Tallest bars win!'],
    challenge: ['Can you turn all 3 tests green? There\'s more than one way 🟢🟢🟢', 'Explain WHY — that\'s what real engineers do.'],
    quiz: ['Quiz time! You\'ve got this 💪', 'Wrong answers are fine — read the explanation, that\'s how you learn.'],
    applications: ['Look how many real apps run on chunking! 🌍', 'Press "Mark lesson complete" when you\'re done — something fun happens 🎉']
  };

  // ---------------- state ----------------
  let st = load();
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && typeof s.xp === 'number' && Array.isArray(s.badges)) return s;
    } catch (e) { /* ignore */ }
    return { xp: 0, badges: [], quizRight: [], calm: reduceMotion };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } }
  const calm = () => !!st.calm;
  const levelOf = (xp) => LEVELS.filter((l) => xp >= l.xp).pop();
  const nextLevel = (xp) => LEVELS.find((l) => l.xp > xp);

  // ---------------- confetti (canvas, palette colours) ----------------
  let canvas, ctx, parts = [], raf = 0;
  const COLORS = ['#164E46', '#F07858', '#F7B9A6', '#8FC1B5', '#EAE4D8', '#FFD3A8'];
  function ensureCanvas() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.className = 'confetti';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    const size = () => { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; };
    size(); addEventListener('resize', size);
  }
  function burst(x, y, n, power) {
    if (calm()) return;
    ensureCanvas();
    const p = power || 1;
    for (let i = 0; i < (n || 40); i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (4 + Math.random() * 7) * p;
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5 * p, g: .32, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .4,
        w: 6 + Math.random() * 6, h: 4 + Math.random() * 5, c: pick(COLORS), life: 70 + Math.random() * 40, round: Math.random() < .3 });
    }
    if (!raf) raf = requestAnimationFrame(tick);
  }
  function burstAt(el, n, power) {
    const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null;
    burst(r ? r.left + r.width / 2 : innerWidth / 2, r ? r.top + r.height / 2 : innerHeight / 3, n, power);
  }
  function rain() {
    if (calm()) return;
    for (let k = 0; k < 6; k++) setTimeout(() => burst(innerWidth * (0.1 + Math.random() * 0.8), -10, 45, 0.7), k * 160);
  }
  function tick() {
    const d = devicePixelRatio;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts = parts.filter((q) => q.life > 0);
    parts.forEach((q) => {
      q.vy += q.g; q.vx *= .99; q.x += q.vx; q.y += q.vy; q.r += q.vr; q.life--;
      ctx.save();
      ctx.globalAlpha = Math.min(1, q.life / 30);
      ctx.translate(q.x * d, q.y * d); ctx.rotate(q.r);
      ctx.fillStyle = q.c;
      if (q.round) { ctx.beginPath(); ctx.arc(0, 0, q.h * d / 2, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-q.w * d / 2, -q.h * d / 2, q.w * d, q.h * d);
      ctx.restore();
    });
    raf = parts.length ? requestAnimationFrame(tick) : 0;
    if (!raf) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // ---------------- floating "+XP" ----------------
  function floatText(text, el) {
    if (calm()) return;
    const r = el && el.getBoundingClientRect ? el.getBoundingClientRect() : $('#xpPill').getBoundingClientRect();
    const f = document.createElement('span');
    f.className = 'float-xp';
    f.textContent = text;
    f.style.left = (r.left + r.width / 2) + 'px';
    f.style.top = (r.top + 4) + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1300);
  }

  // ---------------- XP & badges ----------------
  function addXP(n, anchor) {
    const before = levelOf(st.xp);
    st.xp += n;
    save();
    floatText('+' + n + ' XP', anchor);
    renderXP(true);
    const after = levelOf(st.xp);
    if (after.name !== before.name) {
      queuePop({ ic: '⭐', title: 'Level up!', text: 'You are now a ' + after.name, big: true });
      mascot('cheer', 'LEVEL UP! You\'re a ' + after.name + ' now 🎉');
      rain();
    }
  }
  function has(id) { return st.badges.includes(id); }
  function award(id, anchor) {
    if (has(id)) return false;
    const b = BADGES.find((x) => x.id === id);
    if (!b) return false;
    st.badges.push(id);
    save();
    queuePop({ ic: b.ic, title: 'Badge unlocked: ' + b.name, text: b.desc });
    addXP(25, anchor);
    burstAt(anchor || $('#xpPill'), 50);
    renderBadges();
    return true;
  }

  // Badge / level pop-ups, shown one after another.
  const popQ = [];
  let popping = false;
  function queuePop(p) { popQ.push(p); if (!popping) nextPop(); }
  async function nextPop() {
    const p = popQ.shift();
    if (!p) { popping = false; return; }
    popping = true;
    const el = $('#badgePop');
    el.innerHTML = '<span class="badge-pop__ic">' + p.ic + '</span><span><b>' + p.title + '</b><small>' + p.text + '</small></span>';
    el.classList.toggle('is-big', !!p.big);
    el.classList.add('is-show');
    await sleep(calm() ? 2200 : 2600);
    el.classList.remove('is-show');
    await sleep(350);
    nextPop();
  }

  function renderXP(bump) {
    const lv = levelOf(st.xp), nx = nextLevel(st.xp);
    $('#xpVal').textContent = st.xp;
    $('#xpLevel').textContent = lv.name;
    const pct = nx ? Math.round(((st.xp - lv.xp) / (nx.xp - lv.xp)) * 100) : 100;
    $$('[data-xp-bar]').forEach((b) => { b.style.width = pct + '%'; });
    $$('[data-xp-next]').forEach((t) => { t.textContent = nx ? (nx.xp - st.xp) + ' XP to ' + nx.name : 'Max level reached!'; });
    $$('[data-xp-level]').forEach((t) => { t.textContent = lv.name + ' · ' + st.xp + ' XP'; });
    if (bump && !calm()) { const p = $('#xpPill'); p.classList.remove('is-bump'); void p.offsetWidth; p.classList.add('is-bump'); }
  }
  function renderBadges() {
    const html = BADGES.map((b) =>
      '<li class="badge' + (has(b.id) ? ' is-earned' : '') + '" title="' + b.name + ' — ' + b.desc + '">' +
      '<span class="badge__ic" aria-hidden="true">' + (has(b.id) ? b.ic : '🔒') + '</span>' +
      '<span class="badge__t">' + b.name + '</span>' +
      '<span class="sr-only">' + (has(b.id) ? 'earned' : 'locked') + ': ' + b.desc + '</span></li>').join('');
    $$('[data-badge-shelf]').forEach((s) => { s.innerHTML = html; });
    $$('[data-badge-count]').forEach((c) => { c.textContent = st.badges.length + '/' + BADGES.length; });
  }

  // ---------------- Chunky the mascot ----------------
  let sayTimer, lastMsg = '', lastAt = 0, currentSection = 'home', tipIdx = {};
  const seenTips = new Set();
  function buildBuddy() {
    const b = document.createElement('div');
    b.className = 'buddy';
    b.id = 'buddy';
    b.dataset.mood = 'idle';
    b.innerHTML =
      '<div class="buddy__bubble" role="status" aria-live="polite"><span class="buddy__msg"></span>' +
      '<button class="buddy__x" type="button" aria-label="Hide tip">✕</button></div>' +
      '<button class="buddy__body" type="button" aria-label="Chunky the helper: show a tip">' +
        '<span class="buddy__lines" aria-hidden="true"><i></i><i></i><i></i></span>' +
        '<span class="buddy__face" aria-hidden="true"><i class="buddy__eye"></i><i class="buddy__eye"></i><b class="buddy__mouth"></b></span>' +
        '<span class="buddy__cheek buddy__cheek--l" aria-hidden="true"></span><span class="buddy__cheek buddy__cheek--r" aria-hidden="true"></span>' +
      '</button>';
    document.body.appendChild(b);
    $('.buddy__body', b).addEventListener('click', () => {
      const list = TIPS[currentSection] || TIPS.home;
      tipIdx[currentSection] = ((tipIdx[currentSection] || 0) + 1) % list.length;
      mascot('happy', list[tipIdx[currentSection]], true);
    });
    $('.buddy__x', b).addEventListener('click', () => { b.classList.remove('is-talking'); });
  }
  function mascot(mood, msg, force) {
    const b = $('#buddy');
    if (!b || calm()) return;
    const now = Date.now();
    if (!force && msg === lastMsg && now - lastAt < 5000) return;   // don't repeat
    lastMsg = msg; lastAt = now;
    b.dataset.mood = mood || 'idle';
    b.classList.remove('is-react'); void b.offsetWidth; b.classList.add('is-react');
    if (msg) {
      $('.buddy__msg', b).textContent = msg;
      b.classList.add('is-talking');
      clearTimeout(sayTimer);
      sayTimer = setTimeout(() => { b.classList.remove('is-talking'); b.dataset.mood = 'idle'; }, 5200);
    }
  }
  function watchSections() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      currentSection = e.target.id;
      if (seenTips.has(currentSection)) return;
      seenTips.add(currentSection);
      setTimeout(() => { if (currentSection === e.target.id) mascot('wave', (TIPS[currentSection] || TIPS.home)[0]); }, 700);
    }), { rootMargin: '-40% 0px -50% 0px' });
    $$('main > section[id]').forEach((s) => io.observe(s));
  }

  // ---------------- scroll reveal ----------------
  const REVEAL = '.section__head, .obj-card, .howto, .timeline, .scenario, .try-box, .concept, .pipeline, .pipeline-detail, .term, .analogy, .ctx-card, .benefit, .callout, .approach, .vs, .overlap-example, .trade, .unit, .lab__editor, .lab__controls, .lab__output, .compare, .honest, .rag__source, .rag__settings, .doc-view, .ask, .prod-vs > *, .mission, .challenge__steps, .quiz, .app, .arch, .code-row > *, .takeaways li, .complete';
  function setupReveal() {
    const els = $$(REVEAL);
    const sib = new Map();
    els.forEach((el) => {
      const p = el.parentElement;
      const i = sib.get(p) || 0;
      sib.set(p, i + 1);
      el.style.setProperty('--d', Math.min(i, 6) * 70 + 'ms');
      el.classList.add('reveal');
    });
    if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add('is-in');
      io.unobserve(el);
      // once revealed, drop the classes so hover effects aren't delayed by the stagger
      setTimeout(() => el.classList.remove('reveal', 'is-in'), 1100 + (parseInt(el.style.getPropertyValue('--d'), 10) || 0));
    }), { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    els.forEach((e) => io.observe(e));
  }

  // ---------------- count-up numbers in stat tiles ----------------
  const prevVals = new WeakMap();
  function countUp(container) {
    const prev = prevVals.get(container) || {};
    const next = {};
    $$('.stat', container).forEach((s) => {
      const v = $('.stat__v', s), k = $('.stat__k', s).textContent;
      const txt = v.textContent;
      if (!/^-?\d+(\.\d+)?$/.test(txt)) return;
      const to = parseFloat(txt), dec = (txt.split('.')[1] || '').length;
      next[k] = to;
      const from = k in prev ? prev[k] : 0;
      if (calm() || from === to) return;
      const t0 = performance.now(), dur = 550;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        v.textContent = (from + (to - from) * e).toFixed(dec);
        if (p < 1) requestAnimationFrame(step); else v.textContent = txt;
      };
      requestAnimationFrame(step);
      if (from !== to) { s.classList.remove('is-changed'); void s.offsetWidth; s.classList.add('is-changed'); }
    });
    prevVals.set(container, next);
  }
  function watchStats() {
    $$('#labStats, #chStats, .cmp__stats').forEach((c) => new MutationObserver(() => countUp(c)).observe(c, { childList: true }));
    // compare panels are built later — observe them when they appear
    new MutationObserver(() => $$('.cmp__stats').forEach((c) => {
      if (c.dataset.watched) return;
      c.dataset.watched = '1';
      new MutationObserver(() => countUp(c)).observe(c, { childList: true });
    })).observe($('#compare'), { childList: true, subtree: true });
  }

  // ---------------- micro-interactions ----------------
  function microInteractions() {
    // slider value "pop"
    document.addEventListener('input', (e) => {
      if (e.target.type !== 'range' || calm()) return;
      const b = e.target.closest('.ctrl') && $('label b', e.target.closest('.ctrl'));
      if (!b) return;
      b.classList.remove('is-pop'); void b.offsetWidth; b.classList.add('is-pop');
    });
    // tiny burst on "Done · Next"
    document.addEventListener('click', (e) => {
      const nx = e.target.closest('[data-next]');
      if (nx) burstAt(nx, 28, 0.8);
    });
  }

  // ---------------- calm mode ----------------
  function applyCalm() {
    document.documentElement.classList.toggle('calm', calm());
    document.documentElement.classList.toggle('play', !calm());
    $$('[data-calm-toggle]').forEach((b) => {
      b.setAttribute('aria-pressed', String(calm()));
      b.innerHTML = calm() ? '🧘 Calm mode <small>on — tap for Play mode</small>' : '🎈 Play mode <small>on — tap for Calm mode</small>';
    });
    if (calm()) { const b = $('#buddy'); if (b) b.classList.remove('is-talking'); }
  }

  // ---------------- event wiring ----------------
  const pickCheer = () => pick(['Woohoo! 🎉', 'Nailed it! ✨', 'Look at you go! 🚀', 'Chunk-tastic! ✂️']);
  document.addEventListener('chunklab', (ev) => {
    const d = ev.detail || {};
    switch (d.type) {
      case 'module-done':
        addXP(20, d.anchor);
        if (d.all) { award('champion', d.anchor); rain(); mascot('cheer', 'YOU DID IT! Every module complete 🏆'); }
        else mascot('cheer', pickCheer() + ' Module complete, +20 XP');
        break;
      case 'lab-generate':
        award('first-cut', $('#labGenerate'));
        if (d.overlap > 0 && d.redundant > 0) award('bridge', $('#labOverlap'));
        if (d.strategy === 'sentence' && d.cuts === 0 && d.chunks > 1) award('surgeon', $('#labChunks'));
        if (d.chunks > 60) mascot('shock', d.chunks + ' chunks?! That\'s a lot of tiny pieces 😵');
        else if (d.chunks === 1) mascot('think', 'Just one chunk… that\'s the whole document! Try a smaller size.');
        break;
      case 'compare': award('scientist', $('#compare')); mascot('happy', 'Science! 🔬 Spot the difference between A and B.'); break;
      case 'transform': mascot('happy', 'Snip, snip! ✂️ One paragraph → ' + d.n + ' chunks.'); break;
      case 'pipeline-done': mascot('cheer', 'That\'s RAG from start to finish! 🚀'); break;
      case 'upload': award('explorer', d.anchor); mascot('happy', 'Ooh, a new document! Let me chew on it 📄'); break;
      case 'rag-ask':
        award('detective', $('#ragForm'));
        if (d.fragmented) { award('fragment', $('#ragResult')); mascot('shock', 'Oh no! The answer got sliced in half 😵'); }
        else if (d.found) mascot('happy', pick(['Found it! 🔎', 'Gotcha! Here are the best chunks 🎯']));
        else mascot('think', 'Hmm, no matching keywords… try different words? 🤔');
        break;
      case 'challenge':
        if (d.passed === 3) { award('engineer', $('#chSubmit')); burstAt($('#chSubmit'), 70, 1.2); mascot('cheer', 'All tests green! Real engineer vibes 🛠️'); }
        else mascot('think', d.passed + '/3 tests green. Tweak the dials and try again!');
        break;
      case 'quiz-answer':
        if (d.correct) {
          if (!st.quizRight.includes(d.i)) { st.quizRight.push(d.i); save(); addXP(10, d.anchor); }
          burstAt(d.anchor, 26, 0.7);
          mascot('happy', pickCheer());
        } else mascot('sad', 'So close! Read the explanation 👇');
        break;
      case 'quiz-finish':
        if (d.score >= 5) award('quiz', $('#quizRoot'));
        if (d.score === d.total) { rain(); mascot('cheer', 'PERFECT SCORE! 🧠✨'); }
        break;
      case 'reset':
        st = { xp: 0, badges: [], quizRight: [], calm: st.calm };
        save(); renderXP(); renderBadges();
        break;
    }
  });

  function init() {
    buildBuddy();
    applyCalm();
    renderXP();
    renderBadges();
    setupReveal();
    watchSections();
    watchStats();
    microInteractions();
    $$('[data-calm-toggle]').forEach((b) => b.addEventListener('click', () => {
      st.calm = !st.calm; save(); applyCalm();
      if (!st.calm) { mascot('wave', 'Play mode on! Let\'s have fun 🎈', true); burstAt(b, 30); }
    }));
    $('#xpPill').addEventListener('click', () => $('#mapToggle').click());
  }

  window.Fun = { calm: calm, burst: burstAt, mascot: mascot, award: award, BADGES: BADGES, init: init,
    state: () => JSON.parse(JSON.stringify(st)) };
  document.addEventListener('DOMContentLoaded', init);
})();
