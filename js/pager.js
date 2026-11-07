/* =====================================================================
   PRISM — Pager: one module per page, with sliding transitions
   ---------------------------------------------------------------------
   Every <main> > <section> becomes a page. Navigation is hash-based, so
   every existing link (top nav, lesson map, timeline, "Done · Next",
   resume prompt…) keeps working, and the browser's Back button works too.

   Direction alternates as the learner moves forward: page 2 slides in
   from the right, page 3 from the left, page 4 from the right… Going
   back plays the mirror image. Calm mode switches pages instantly.
   ===================================================================== */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const calm = () => !window.Fun || window.Fun.calm();

  let pages = [];
  let current = -1;
  let busy = false;
  let queued = null;

  const pageOf = (id) => {
    const el = id && document.getElementById(id);
    if (!el) return null;
    const page = el.matches('main > section') ? el : el.closest('main > section');
    return page ? { page: page, index: pages.indexOf(page), target: el } : null;
  };
  /** Forward to index i: odd pages enter from the right, even from the left. */
  const enterSide = (i) => (i % 2 === 1 ? 'right' : 'left');

  function scrollTop() {
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    html.style.scrollBehavior = prev;
  }

  function finish(target, page) {
    if (target && target !== page) {
      // a link to something inside the page (e.g. #complete): scroll to it
      requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
    }
    updateChrome();
  }

  function show(index, target, instant) {
    if (index < 0 || index >= pages.length) return;
    if (index === current) { finish(target, pages[index]); return; }
    if (busy) { queued = [index, target]; return; }

    const from = pages[current];
    const to = pages[index];
    const forward = index > current;
    const side = forward ? enterSide(index) : (enterSide(current) === 'right' ? 'left' : 'right');
    current = index;

    if (instant || calm() || !from) {
      if (from) from.classList.remove('is-current');
      to.classList.add('is-current');
      scrollTop();
      finish(target, to);
      return;
    }

    busy = true;
    // 1) the old page slides out towards the opposite side
    from.classList.add('page-out-' + (side === 'right' ? 'left' : 'right'));
    document.body.classList.add('is-paging');
    setTimeout(() => {
      from.classList.remove('is-current', 'page-out-left', 'page-out-right');
      scrollTop();
      // 2) the new page slides in from `side`
      to.classList.add('is-current', 'page-in-' + side);
      const done = () => {
        to.classList.remove('page-in-left', 'page-in-right');
        document.body.classList.remove('is-paging');
        busy = false;
        finish(target, to);
        if (queued) { const q = queued; queued = null; show(q[0], q[1]); }
      };
      to.addEventListener('animationend', function h(e) { if (e.target === to) { to.removeEventListener('animationend', h); done(); } });
      setTimeout(() => { if (busy) done(); }, 900);   // safety net
    }, 260);
  }

  function route(instant) {
    const id = decodeURIComponent((location.hash || '#home').slice(1)) || 'home';
    const hit = pageOf(id);
    if (hit && hit.index >= 0) show(hit.index, hit.target, instant);
    else if (current < 0) show(0, null, true);
  }

  function go(delta) {
    const i = current + delta;
    if (i < 0 || i >= pages.length) return;
    location.hash = '#' + pages[i].id;
  }

  // ---------- page chrome: edge arrows + counter ----------
  function buildChrome() {
    const nav = document.createElement('div');
    nav.className = 'pager';
    nav.innerHTML =
      '<button type="button" class="pager__arrow pager__arrow--prev" aria-label="Previous page"><span aria-hidden="true">‹</span><small></small></button>' +
      '<button type="button" class="pager__arrow pager__arrow--next" aria-label="Next page"><span aria-hidden="true">›</span><small></small></button>' +
      '<div class="pager__count" aria-live="polite"></div>';
    document.body.appendChild(nav);
    $('.pager__arrow--prev').addEventListener('click', () => go(-1));
    $('.pager__arrow--next').addEventListener('click', () => go(1));
  }
  const titleOf = (p) => {
    if (p.id === 'home') return 'Start';
    const S = window.Progress && window.Progress.SECTIONS.find((s) => s.id === p.id);
    return S ? S.short : p.id;
  };
  function updateChrome() {
    const prev = pages[current - 1], next = pages[current + 1];
    const pb = $('.pager__arrow--prev'), nb = $('.pager__arrow--next');
    pb.hidden = !prev; nb.hidden = !next;
    if (prev) { pb.querySelector('small').textContent = titleOf(prev); pb.setAttribute('aria-label', 'Previous page: ' + titleOf(prev)); }
    if (next) { nb.querySelector('small').textContent = titleOf(next); nb.setAttribute('aria-label', 'Next page: ' + titleOf(next)); }
    $('.pager__count').innerHTML = '<b>' + String(current + 1).padStart(2, '0') + '</b> / ' + String(pages.length).padStart(2, '0');
    document.body.dataset.page = pages[current].id;
  }

  // ---------- keyboard ← → and touch swipe ----------
  const INTERACTIVE = 'input, textarea, select, [contenteditable], [role="radiogroup"], [role="tablist"], [role="group"], .quiz, .mcq, .seg, pre, .code';
  function keyboard() {
    document.addEventListener('keydown', (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      if (e.target.closest && e.target.closest(INTERACTIVE)) return;
      if (!$('#lessonMap').hidden) return;
      e.preventDefault();
      go(e.key === 'ArrowRight' ? 1 : -1);
    });
  }
  function swipe() {
    let x0 = null, y0 = null, t0 = 0, blocked = false;
    document.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      blocked = !!e.target.closest(INTERACTIVE + ', .chunk-grid, .size-demo__out, .cmp__chunks, .text-map, .doc-view__body, .heat, .topnav, .drawer');
      x0 = t.clientX; y0 = t.clientY; t0 = Date.now();
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
      if (x0 === null || blocked) { x0 = null; return; }
      const t = e.changedTouches[0];
      const dx = t.clientX - x0, dy = t.clientY - y0;
      x0 = null;
      if (Date.now() - t0 > 600 || Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
      go(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  function init() {
    pages = $$('main > section[id]');
    if (!pages.length) return;
    document.documentElement.classList.add('paged');
    buildChrome();
    keyboard();
    swipe();
    window.addEventListener('hashchange', () => route(false));
    // keep the URL tidy on first load
    route(true);
  }

  window.Pager = { go: go, show: (id) => { location.hash = '#' + id; }, current: () => pages[current] && pages[current].id };
  document.addEventListener('DOMContentLoaded', init);
})();
