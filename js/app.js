/* =====================================================================
   ChunkLab — UI wiring for every interactive module.
   Logic lives in chunking.js (ChunkEngine) and retrieval.js (Retriever);
   this file only reads controls and renders results.
   ===================================================================== */
(function () {
  'use strict';

  const E = window.ChunkEngine;
  const R = window.Retriever;
  const C = window.ChunkContent;
  const P = window.Progress;

  // ---------- tiny helpers ----------
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n, d) => (Number.isInteger(n) ? String(n) : n.toFixed(d == null ? 1 : d));
  const debounce = (fn, ms) => { let t; return function () { clearTimeout(t); const a = arguments; t = setTimeout(() => fn.apply(null, a), ms); }; };
  const emit = (type, data) => document.dispatchEvent(new CustomEvent('chunklab', { detail: Object.assign({ type: type }, data) }));
  const isCalm = () => !window.Fun || window.Fun.calm();
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const paragraphs = (text) => text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  /** Keep the slider's filled track in sync with its value. */
  function fill(r) {
    const min = Number(r.min) || 0, max = Number(r.max) || 100;
    r.style.setProperty('--fill', (((Number(r.value) - min) / Math.max(1, max - min)) * 100) + '%');
  }
  function bindRange(input, out, cb) {
    const h = () => { if (out) out.textContent = input.value; fill(input); if (cb) cb(Number(input.value)); };
    input.addEventListener('input', h);
    fill(input);
    if (out) out.textContent = input.value;
  }
  /** Overlap slider can never exceed size − 1 (keeps step S ≥ 1). */
  function limitOverlap(sizeEl, ovEl, ovOut) {
    const max = Math.max(0, Number(sizeEl.value) - 1);
    ovEl.max = String(max);
    if (Number(ovEl.value) > max) ovEl.value = String(max);
    if (ovOut) ovOut.textContent = ovEl.value;
    fill(ovEl);
  }
  /** Segmented radio control. */
  function bindSeg(group, attr, cb) {
    const btns = $$('.seg__btn', group);
    const set = (b) => {
      btns.forEach((x) => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute(x.getAttribute('role') === 'tab' ? 'aria-selected' : 'aria-checked', on ? 'true' : 'false'); });
      cb(b.dataset[attr]);
    };
    btns.forEach((b) => b.addEventListener('click', () => set(b)));
    group.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const i = btns.indexOf(document.activeElement);
      if (i < 0) return;
      const n = btns[(i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length];
      n.focus(); set(n);
    });
    return { select: (val) => { const b = btns.find((x) => x.dataset[attr] === val); if (b) set(b); } };
  }

  /** Chunk text with the overlapping prefix wrapped in coral. */
  function chunkHTML(chunk) {
    const ov = chunk.overlapPrev;
    const head = chunk.words.slice(0, ov).map(esc).join(' ');
    const rest = chunk.words.slice(ov).map(esc).join(' ');
    return (ov ? '<span class="ov" title="Repeated from previous chunk">' + head + '</span> ' : '') + rest;
  }
  function rowChunk(c) {
    return '<div class="row-chunk' + (c.endsMidSentence ? ' is-cut' : '') + '"><span class="row-chunk__n">#' + (c.index + 1) + '</span><span>' + chunkHTML(c) + '</span></div>';
  }
  function chunkCard(c, extra) {
    return '<article class="chunk-card' + (c.endsMidSentence ? ' is-cut' : '') + (extra || '') + '" style="--i:' + c.index + '">' +
      '<div class="chunk-card__head"><span class="chunk-card__n">Chunk ' + (c.index + 1) + '</span>' +
      '<span class="chunk-card__meta">' + c.wordCount + ' words' + (c.overlapPrev ? ' · ' + c.overlapPrev + ' overlap' : '') + '</span></div>' +
      '<div class="chunk-card__body">' + chunkHTML(c) + '</div>' +
      (c.endsMidSentence ? '<span class="cut-badge">✂ cut mid-sentence</span>' : '') +
      '</article>';
  }
  function statTile(v, k, coral) { return '<div class="stat' + (coral ? ' stat--coral' : '') + '"><span class="stat__v">' + v + '</span><span class="stat__k">' + k + '</span></div>'; }

  /** How many sentences survive whole inside at least one chunk. */
  function intactSentences(out) {
    const s = E.toSentences(out.words);
    const intact = s.filter((x) => out.chunks.some((c) => c.start <= x.start && c.end >= x.end)).length;
    return { total: s.length, intact: intact };
  }

  // =================================================================
  // MODULE 1 — Problem simulator & pipeline
  // =================================================================
  function initProblem() {
    const modes = {
      all: { words: '≈ 80,000 words', tokens: '≈ 107,000', width: 100, good: false,
        items: ['May not even fit in the model\'s <b>context window</b> (the maximum text it can read at once).',
                'Slower and more expensive — you pay for every token, every question.',
                'The one useful sentence is buried in thousands of irrelevant ones.'] },
      rag: { words: '≈ 300 words', tokens: '≈ 400', width: 0.4, good: true,
        items: ['Only the 3 most relevant chunks (~100 words each) are sent.',
                'Fast and cheap — roughly 250× less text per question.',
                'The model reads focused context, so its answer can be grounded in the handbook.'] }
    };
    bindSeg($('#problemSim .seg'), 'mode', (m) => {
      const d = modes[m];
      $('#pmWords').textContent = d.words;
      $('#pmTokens').textContent = d.tokens;
      const bar = $('#pmBar');
      bar.style.width = d.width + '%';
      bar.classList.toggle('is-good', d.good);
      $('#pmList').innerHTML = d.items.map((t) => '<li class="' + (d.good ? 'good' : 'bad') + '">' + t + '</li>').join('');
    });

    const stages = [
      { t: 'Document', tag: 'live', d: 'The source file — a PDF handbook, a web page, a Word document. This is the knowledge we want the AI to use. In ChunkLab you can upload your own in the Lab and the RAG simulation.' },
      { t: 'Text extraction', tag: 'live', d: 'Software pulls the plain text out of the file and cleans it: removing page numbers, broken hyphenation, wrapped lines, and extra spaces. Garbage in here means garbage everywhere after. Upload a PDF or Word file in the Lab to see the cleanup report. (Scanned PDFs need OCR, which ChunkLab does not do.)' },
      { t: 'Chunking', tag: 'live', focus: true, d: 'The clean text is split into small, meaningful pieces called chunks. This is what you will master today — and what you can try live in the Lab.' },
      { t: 'Embeddings', tag: 'concept', d: 'Each chunk is turned into an embedding: a list of numbers that captures its meaning, so chunks with similar meaning get similar numbers. (A topic for another lesson.)' },
      { t: 'Vector database', tag: 'concept', d: 'The embeddings are stored in a database built to quickly find the vectors most similar to a query vector.' },
      { t: 'Retrieval', tag: 'sim', d: 'When a user asks a question, the system finds the top few chunks most related to it. ChunkLab simulates this step with keyword matching.' },
      { t: 'LLM response', tag: 'concept', d: 'The retrieved chunks are added to the prompt, and the language model writes an answer grounded in them.' }
    ];
    const tagTxt = { live: 'Working in ChunkLab', sim: 'Simulated in ChunkLab', concept: 'Explained conceptually' };
    const pipe = $('#pipeline');
    pipe.innerHTML = stages.map((s, i) =>
      '<button class="pipe-step' + (s.focus ? ' is-focus' : '') + '" role="tab" id="pipe-' + i + '" aria-controls="pipelineDetail" aria-selected="false" data-i="' + i + '">' +
      '<span class="pipe-step__n">0' + (i + 1) + '</span><span class="pipe-step__t">' + s.t + '</span></button>'
    ).join('');
    const btns = $$('.pipe-step', pipe);
    const show = (i) => {
      btns.forEach((b, n) => { b.classList.toggle('is-on', n === i); b.setAttribute('aria-selected', n === i ? 'true' : 'false'); b.tabIndex = n === i ? 0 : -1; });
      const s = stages[i];
      $('#pipelineDetail').innerHTML = '<span class="pill' + (s.tag === 'live' ? '' : s.tag === 'sim' ? ' pill--coral' : '') + ' pd-tag">' + tagTxt[s.tag] + '</span>' +
        '<h4>' + (i + 1) + '. ' + s.t + '</h4><p>' + s.d + '</p>';
      $('#pipelineDetail').setAttribute('aria-labelledby', 'pipe-' + i);
    };
    btns.forEach((b, i) => b.addEventListener('click', () => show(i)));
    pipe.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      const i = btns.indexOf(document.activeElement);
      const n = (i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length;
      btns[n].focus(); show(n);
    });
    show(2);

    // ▶ Play: send a question through every stage, one after another.
    const play = $('#pipePlay');
    play.addEventListener('click', async () => {
      play.disabled = true;
      play.textContent = '▶ Playing…';
      for (let i = 0; i < btns.length; i++) {
        show(i);
        btns[i].classList.add('is-pulse');
        await wait(isCalm() ? 450 : 1100);
        btns[i].classList.remove('is-pulse');
        btns[i].classList.add('is-visited');
      }
      await wait(300);
      btns.forEach((b) => b.classList.remove('is-visited'));
      show(2);
      play.disabled = false;
      play.textContent = '↻ Play again';
      emit('pipeline-done', {});
    });
  }

  // =================================================================
  // MODULE 2 — Transform demo & approach comparison
  // =================================================================
  function initChunkingModule() {
    const para = paragraphs(C.HANDBOOK)[0];
    const pre = E.chunkText(para, { strategy: 'sentence', size: 25, overlap: 0 });
    // The paragraph is rendered as one span per future chunk, so each card can
    // fly out of the exact place its text came from (FLIP animation).
    $('#transformDoc').innerHTML = pre.chunks.map((c) => '<span class="t-src">' + esc(c.text) + '</span>').join(' ');
    const btn = $('#transformBtn');
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(on));
      btn.textContent = on ? 'Show original ↺' : 'Chunk it ✂';
      const from = $$('.t-src').map((sp) => sp.getBoundingClientRect());
      $('#transformDoc').hidden = on;
      const box = $('#transformChunks');
      box.hidden = !on;
      if (on) {
        const out = pre;
        const animate = !isCalm() && typeof Element.prototype.animate === 'function';
        box.innerHTML = out.chunks.map((c) => '<div class="t-chunk' + (animate ? ' no-pop' : '') + '" style="--i:' + c.index + '"><b>CHUNK ' + (c.index + 1) + ' · ' + c.wordCount + ' words</b>' + esc(c.text) + '</div>').join('');
        if (animate) {
          const stage = $('#transformStage');
          stage.classList.remove('is-snipping'); void stage.offsetWidth; stage.classList.add('is-snipping');
          $$('.t-chunk', box).forEach((card, i) => {
            const to = card.getBoundingClientRect(), fr = from[i];
            if (!fr || !to.width) return;
            card.animate([
              { transform: 'translate(' + (fr.left - to.left) + 'px,' + (fr.top - to.top) + 'px) scale(' + Math.max(.3, fr.width / to.width) + ',' + Math.max(.3, fr.height / to.height) + ')', opacity: .3 },
              { transform: 'translateY(-10px) rotate(' + (i % 2 ? 2 : -2) + 'deg)', opacity: 1, offset: .7 },
              { transform: 'none', opacity: 1 }
            ], { duration: 750, delay: 250 + i * 140, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
          });
        }
        emit('transform', { n: out.chunks.length });
        $('#transformNote').textContent = 'One paragraph → ' + out.chunks.length + ' chunks (sentence-based, up to 25 words each). Each chunk can now be stored and searched on its own.';
      } else {
        $('#transformNote').textContent = 'This is one paragraph from our sample handbook (Attendance Policy).';
      }
    });

    const text = paragraphs(C.CHALLENGE_DOC)[1].replace(/^Hostel Rules\.\s*/, '');
    const f = E.chunkText(text, { strategy: 'fixed', size: 20, overlap: 0 });
    const s = E.chunkText(text, { strategy: 'sentence', size: 20, overlap: 0 });
    $('#approachFixed').innerHTML = f.chunks.map(rowChunk).join('');
    $('#approachSentence').innerHTML = s.chunks.map(rowChunk).join('');
    $('#approachFixedStat').textContent = f.stats.chunkCount + ' chunks · ' + f.stats.midSentenceBreaks + ' cut mid-sentence · every chunk exactly ≤ 20 words';
    $('#approachSentenceStat').textContent = s.stats.chunkCount + ' chunks · ' + s.stats.midSentenceBreaks + ' cut mid-sentence · sizes vary (' + s.stats.minChunk + '–' + s.stats.maxChunk + ' words)';
  }

  // =================================================================
  // MODULE 3 — Size dial, boundary demo, unit meter
  // =================================================================
  function initSizeOverlap() {
    const text = paragraphs(C.HANDBOOK).slice(0, 2).join('\n\n');
    const range = $('#sizeDemoRange');
    const run = (size) => {
      const out = E.chunkText(text, { strategy: 'fixed', size: size, overlap: 0 });
      $('#sizeDemoOut').innerHTML = out.chunks.map(rowChunk).join('');
      const st = out.stats;
      const it = intactSentences(out);
      let msg = st.chunkCount + ' chunks, about ' + fmt(st.avgChunkSize) + ' words each. ' + it.intact + ' of ' + it.total + ' sentences stay whole inside a single chunk. ';
      msg += size <= 10 ? 'Very focused pieces — but most rules are chopped up and lose their meaning.'
        : size >= 45 ? 'Lots of context per chunk — but each one mixes several different rules.'
        : 'A middle ground: some context, still fairly focused.';
      $('#sizeDemoMsg').textContent = msg;
    };
    bindRange(range, $('#sizeDemoVal'), run);
    run(Number(range.value));

    const para = paragraphs(C.HANDBOOK)[0];
    const bd = (ov) => {
      const out = E.chunkText(para, { strategy: 'fixed', size: 14, overlap: ov });
      $('#boundaryOut').innerHTML = out.chunks.map(rowChunk).join('');
      const it = intactSentences(out);
      $('#boundaryMsg').innerHTML = ov === 0
        ? 'With <b>no overlap</b>: ' + out.chunks.length + ' chunks, ' + out.stats.redundantWords + ' repeated words, and only <b>' + it.intact + ' of ' + it.total + '</b> sentences fit whole in one chunk. Chunk 1 ends “…' + esc(out.chunks[0].words.slice(-3).join(' ')) + '” — the rule continues in chunk 2, so neither chunk holds it completely.'
        : 'With <b>5 words of overlap</b>: ' + out.chunks.length + ' chunks, ' + out.stats.redundantWords + ' repeated words (coral). Each chunk now starts with the end of the previous one, so the text around every cut appears in two chunks. The cost: ' + out.chunks.length + ' chunks instead of ' + E.chunkText(para, { strategy: 'fixed', size: 14, overlap: 0 }).chunks.length + ', and ' + out.stats.redundantWords + ' words stored twice.';
    };
    bindSeg($('#boundaryDemo .seg'), 'ov', (v) => bd(Number(v)));
    bd(0);

    const ui = $('#unitInput');
    const measure = () => {
      const t = ui.value;
      const words = E.toWords(t);
      $('#umChars').textContent = t.trim().length;
      $('#umWords').textContent = words.length;
      $('#umTokens').textContent = E.estimateTokens(t);
      $('#umSent').textContent = words.length ? E.toSentences(words).length : 0;
    };
    ui.addEventListener('input', measure);
    measure();
  }

  // =================================================================
  // MODULE 4 — The Chunking Lab
  // =================================================================
  const lab = { strategy: 'fixed', size: 20, overlap: 4, generated: false, prev: null, view: 'cards', last: null };

  function initLab() {
    const input = $('#labInput');
    const size = $('#labSize');
    const ov = $('#labOverlap');
    input.value = C.LAB_SAMPLE;

    const counts = () => {
      $('#labWordCount').textContent = E.toWords(input.value).length;
      $('#labCharCount').textContent = input.value.length;
      $('#labTokCount').textContent = E.estimateTokens(input.value);
    };
    const formula = () => {
      $('#labFormula').textContent = lab.strategy === 'fixed'
        ? 'step S = C − O = ' + lab.size + ' − ' + lab.overlap + ' = ' + (lab.size - lab.overlap) + (lab.size - lab.overlap === 1 ? ' word' : ' words') + ' — each new chunk starts this far after the previous one'
        : 'pack whole sentences up to ' + lab.size + ' words · new paragraph = new chunk · carry ≤ ' + lab.overlap + ' words of trailing sentences';
      $('#labOverlapHint').textContent = lab.strategy === 'fixed'
        ? 'Max overlap = chunk size − 1, so every chunk moves forward.'
        : 'Sentence mode repeats whole sentences only — if the last sentence is longer than the overlap, nothing is repeated.';
    };
    const auto = debounce(() => { if (lab.generated) generate(); }, 140);

    bindRange(size, $('#labSizeVal'), (v) => { lab.size = v; limitOverlap(size, ov, $('#labOverlapVal')); lab.overlap = Number(ov.value); formula(); auto(); });
    bindRange(ov, $('#labOverlapVal'), (v) => { lab.overlap = v; formula(); auto(); });
    limitOverlap(size, ov, $('#labOverlapVal'));
    bindSeg($('#labStrategy'), 'strategy', (v) => { lab.strategy = v; formula(); auto(); });
    bindSeg($('#labOutput .seg'), 'view', (v) => { lab.view = v; $('#labChunks').hidden = v !== 'cards'; $('#labMap').hidden = v !== 'map'; });

    const regenOnType = debounce(() => { if (lab.generated) generate(); }, 350);
    input.addEventListener('input', () => { counts(); regenOnType(); });
    $('#labRestore').addEventListener('click', () => { input.value = C.LAB_SAMPLE; $('#labUploadStatus').innerHTML = ''; counts(); if (lab.generated) generate(); P.toast('Sample document restored'); });

    // Bring your own document: upload or drag & drop (text extracted in the browser).
    window.DocLoader.attach({
      button: $('#labUpload'), dropzone: $('#labDrop'), status: $('#labUploadStatus'),
      onLoad: (res) => {
        input.value = res.text;
        counts();
        lab.generated = true;
        generate(true);
        P.toast('Loaded “' + res.name + '” — now experiment with the dials');
        emit('upload', { anchor: $('#labUpload') });
      }
    });
    $('#labClear').addEventListener('click', () => { input.value = ''; counts(); if (lab.generated) generate(); input.focus(); });
    $('#labGenerate').addEventListener('click', () => { lab.generated = true; generate(true); });

    counts(); formula();
    generate(false, true);    // show an initial result so the panel is never empty
    initCompare();
  }

  function generate(fromButton, initial) {
    const text = $('#labInput').value;
    const out = E.chunkText(text, { strategy: lab.strategy, size: lab.size, overlap: lab.overlap });
    const st = out.stats;

    $('#labStats').innerHTML =
      statTile(st.totalWords, 'total words') +
      statTile(st.chunkCount, 'chunks') +
      statTile(fmt(st.avgChunkSize), 'avg words / chunk') +
      statTile(out.settings.overlap, 'overlap setting') +
      statTile(st.redundantWords, 'redundant words (stored twice)', true) +
      statTile(st.midSentenceBreaks, 'chunks cut mid-sentence', true);

    if (!out.chunks.length) {
      $('#labChunks').innerHTML = '<div class="empty-out">Your document is empty. Type or paste some text, or press <b>Restore sample</b>.</div>';
      $('#labMap').innerHTML = '<p class="muted">Nothing to show yet.</p>';
    } else {
      // Large uploaded documents: render a capped number of cards (stats still use ALL chunks).
      const CAP = 200;
      $('#labChunks').innerHTML = out.chunks.slice(0, CAP).map((c) => chunkCard(c)).join('') +
        (out.chunks.length > CAP ? '<p class="cap-note">Showing the first ' + CAP + ' of ' + out.chunks.length.toLocaleString() + ' chunks. The statistics above include every chunk.</p>' : '');
      $('#labMap').innerHTML = textMap(out);
    }

    // What changed since the last run?
    const p = lab.prev;
    let change = '';
    if (p && !initial && out.chunks.length) {
      const bits = [];
      if (p.settings.strategy !== out.settings.strategy) bits.push('strategy changed to <b>' + (out.settings.strategy === 'fixed' ? 'fixed-size' : 'sentence-based') + '</b>');
      if (p.settings.size !== out.settings.size) bits.push('chunk size ' + (out.settings.size > p.settings.size ? 'increased' : 'decreased') + ' from ' + p.settings.size + ' to <b>' + out.settings.size + '</b>');
      if (p.settings.overlap !== out.settings.overlap) bits.push('overlap ' + (out.settings.overlap > p.settings.overlap ? 'increased' : 'decreased') + ' from ' + p.settings.overlap + ' to <b>' + out.settings.overlap + '</b>');
      if (p.stats.totalWords !== st.totalWords) bits.push('the document changed (' + p.stats.totalWords + ' → ' + st.totalWords + ' words)');
      if (bits.length) {
        change = '<b>What changed:</b> ' + bits.join(', ') + '. Result: <b>' + p.stats.chunkCount + ' → ' + st.chunkCount + '</b> chunks, redundant words <b>' + p.stats.redundantWords + ' → ' + st.redundantWords + '</b>, mid-sentence cuts <b>' + p.stats.midSentenceBreaks + ' → ' + st.midSentenceBreaks + '</b>.';
      }
    }
    $('#labChange').innerHTML = change;
    lab.prev = out;
    lab.last = out;
    $('#labFeedback').innerHTML = labFeedback(out);
    if (fromButton && P) { P.markDone('lab'); }
    if (!initial && st.totalWords) emit('lab-generate', { overlap: out.settings.overlap, redundant: st.redundantWords, strategy: out.settings.strategy, cuts: st.midSentenceBreaks, chunks: st.chunkCount });
    renderCompare();
  }

  /** Original text, coloured by chunk; words shared by two chunks in coral. */
  function textMap(out) {
    const cover = new Array(out.words.length).fill(0);
    const owner = new Array(out.words.length).fill(-1);
    out.chunks.forEach((c) => { for (let i = c.start; i < c.end; i++) { cover[i]++; if (owner[i] < 0) owner[i] = c.index; } });
    const starts = new Map(out.chunks.map((c) => [c.start, c.index]));
    const LIMIT = 4000;   // keep the map fast for long uploaded documents
    return out.words.slice(0, LIMIT).map((w, i) => {
      const mark = starts.has(i) ? '<span class="tm-break" aria-label="Chunk ' + (starts.get(i) + 1) + ' starts">▸' + (starts.get(i) + 1) + '</span>' : '';
      const cls = cover[i] > 1 ? 'tm-ov' : (owner[i] % 2 ? 'tm-b' : 'tm-a');
      return mark + '<span class="tm-w ' + cls + '">' + esc(w) + '</span>';
    }).join(' ') + (out.words.length > LIMIT ? '<p class="cap-note">Showing the first ' + LIMIT.toLocaleString() + ' of ' + out.words.length.toLocaleString() + ' words.</p>' : '');
  }

  /** Contextual feedback — describes the trade-offs, never declares a "best". */
  function labFeedback(out) {
    const st = out.stats, s = out.settings;
    const fb = [];
    const add = (t, cls) => fb.push('<div class="fb' + (cls ? ' fb--' + cls : '') + '"><div>' + t + '</div></div>');
    if (!st.totalWords) { add('Add some text to see how it gets chunked.', 'warn'); return fb.join(''); }
    if (st.chunkCount === 1) add('Your whole document fits in <b>one chunk</b>. That is no different from sending everything — try a smaller chunk size or a longer document.', 'warn');
    if (s.size <= 10) add('Your current configuration produces <b>smaller, more focused chunks</b>. Matches can be precise, but a single idea may be spread over several chunks and lose its context.');
    else if (s.size >= 40) add('Your current configuration produces <b>larger chunks</b> that keep more surrounding context — but each chunk may also include information unrelated to a question.');
    else add('Medium-sized chunks: a balance between focus and context for this document.');

    const ratio = s.overlap / s.size;
    if (s.overlap === 0) add('<b>No overlap:</b> every word is stored once. Ideas that cross a boundary may be split' + (st.midSentenceBreaks ? ' — here ' + st.midSentenceBreaks + ' chunk' + (st.midSentenceBreaks > 1 ? 's end' : ' ends') + ' mid-sentence.' : '.'));
    else if (ratio >= 0.5) add('<b>High overlap increases repeated content:</b> ' + st.redundantWords + ' words (' + fmt(st.redundancyPct, 0) + '% of the document) are stored more than once. That means more storage, more embeddings, and near-duplicate search results.', 'warn');
    else if (st.redundantWords > 0) add('Your overlap helps <b>preserve context between neighbouring chunks</b> at a cost of ' + st.redundantWords + ' repeated words (' + fmt(st.redundancyPct, 0) + '% extra).');
    else add('You set an overlap, but in sentence mode only whole sentences are repeated — none of the trailing sentences fit inside ' + s.overlap + ' words, so nothing was repeated.');

    if (s.strategy === 'sentence') add('<b>Sentence-based:</b> chunks end at sentence boundaries' + (st.midSentenceBreaks ? ' (except ' + st.midSentenceBreaks + ' where a single sentence was longer than the limit)' : '') + ', so their sizes vary (' + st.minChunk + '–' + st.maxChunk + ' words).');
    else if (st.midSentenceBreaks) add('<b>Fixed-size:</b> every chunk has a predictable size, but ' + st.midSentenceBreaks + ' of ' + st.chunkCount + ' chunks are cut mid-sentence. Try sentence-based mode and compare.');

    add('There is no universally best setting. The right choice depends on your document\'s structure, the questions users ask, and your model\'s token limits.', 'good');
    return fb.join('');
  }

  // ---------- Compare two configurations ----------
  const cmp = { A: { strategy: 'fixed', size: 10, overlap: 0 }, B: { strategy: 'fixed', size: 10, overlap: 3 } };
  const PRESETS = {
    overlap:  [{ strategy: 'fixed', size: 10, overlap: 0 }, { strategy: 'fixed', size: 10, overlap: 3 }],
    size:     [{ strategy: 'fixed', size: 8, overlap: 0 },  { strategy: 'fixed', size: 30, overlap: 0 }],
    strategy: [{ strategy: 'fixed', size: 20, overlap: 0 }, { strategy: 'sentence', size: 20, overlap: 0 }]
  };

  function initCompare() {
    ['A', 'B'].forEach((k) => {
      const el = $('[data-cmp="' + k + '"]');
      el.innerHTML =
        '<div class="cmp__title"><span>' + k + '</span>Configuration ' + k + '</div>' +
        '<div class="cmp__ctrls">' +
          '<div class="ctrl"><span class="ctrl__label" id="cmpS' + k + '">Strategy</span><div class="seg seg--full seg--sm" role="radiogroup" aria-labelledby="cmpS' + k + '">' +
            '<button role="radio" class="seg__btn" data-strategy="fixed">Fixed-size</button><button role="radio" class="seg__btn" data-strategy="sentence">Sentence</button></div></div>' +
          '<div class="ctrl"><label for="cmpSize' + k + '">Size <b class="mono" id="cmpSizeV' + k + '"></b></label><input type="range" id="cmpSize' + k + '" min="3" max="60" /></div>' +
          '<div class="ctrl"><label for="cmpOv' + k + '">Overlap <b class="mono" id="cmpOvV' + k + '"></b></label><input type="range" id="cmpOv' + k + '" min="0" max="59" /></div>' +
        '</div><div class="cmp__stats" id="cmpStats' + k + '"></div><div class="cmp__chunks" id="cmpOut' + k + '"></div>';
      const size = $('#cmpSize' + k), ov = $('#cmpOv' + k);
      size.value = cmp[k].size; ov.value = cmp[k].overlap;
      const seg = bindSeg($('.seg', el), 'strategy', (v) => { cmp[k].strategy = v; renderCompare(); });
      cmp[k].seg = seg;
      bindRange(size, $('#cmpSizeV' + k), (v) => { cmp[k].size = v; limitOverlap(size, ov, $('#cmpOvV' + k)); cmp[k].overlap = Number(ov.value); renderCompare(); });
      bindRange(ov, $('#cmpOvV' + k), (v) => { cmp[k].overlap = v; renderCompare(); });
      limitOverlap(size, ov, $('#cmpOvV' + k));
    });
    $$('#comparePresets .chip').forEach((b) => b.addEventListener('click', () => { applyPreset(b.dataset.preset); emit('compare', {}); }));
    applyPreset('overlap');
  }

  function applyPreset(name) {
    $$('#comparePresets .chip').forEach((b) => b.classList.toggle('is-on', b.dataset.preset === name));
    PRESETS[name].forEach((cfg, i) => {
      const k = i ? 'B' : 'A';
      Object.assign(cmp[k], cfg);
      const size = $('#cmpSize' + k), ov = $('#cmpOv' + k);
      size.value = cfg.size; $('#cmpSizeV' + k).textContent = cfg.size; fill(size);
      limitOverlap(size, ov);
      ov.value = cfg.overlap; $('#cmpOvV' + k).textContent = cfg.overlap; fill(ov);
      cmp[k].seg.select(cfg.strategy);   // triggers renderCompare
    });
  }

  function renderCompare() {
    if (!cmp.A.seg || !cmp.B.seg) return;
    const text = $('#labInput').value;
    const res = {};
    ['A', 'B'].forEach((k) => {
      const o = E.chunkText(text, cmp[k]);
      res[k] = o;
      const st = o.stats;
      $('#cmpStats' + k).innerHTML = statTile(st.chunkCount, 'chunks') + statTile(fmt(st.avgChunkSize), 'avg words') +
        statTile(st.redundantWords, 'redundant', true) + statTile(st.midSentenceBreaks, 'mid-sentence cuts', true);
      $('#cmpOut' + k).innerHTML = o.chunks.length
        ? o.chunks.slice(0, 80).map(rowChunk).join('') + (o.chunks.length > 80 ? '<p class="cap-note">First 80 of ' + o.chunks.length + ' chunks shown.</p>' : '')
        : '<p class="muted small">No text in the editor.</p>';
    });
    const a = res.A.stats, b = res.B.stats, sa = res.A.settings, sb = res.B.settings;
    const lines = [];
    if (!a.totalWords) { $('#compareExplain').innerHTML = ''; return; }
    if (sa.strategy === sb.strategy && sa.size === sb.size && sa.overlap === sb.overlap) {
      lines.push('Both configurations are identical — change one to see a difference.');
    } else {
      if (sa.overlap !== sb.overlap) lines.push('<b>Overlap ' + sa.overlap + ' vs ' + sb.overlap + ':</b> ' + (b.redundantWords >= a.redundantWords ? 'B' : 'A') + ' repeats more text (' + a.redundantWords + ' vs ' + b.redundantWords + ' redundant words) and produces ' + a.chunkCount + ' vs ' + b.chunkCount + ' chunks. The repeated words act as bridges, so text near a cut appears in two chunks.');
      if (sa.size !== sb.size) lines.push('<b>Size ' + sa.size + ' vs ' + sb.size + ':</b> the smaller setting gives ' + Math.max(a.chunkCount, b.chunkCount) + ' focused chunks; the larger gives ' + Math.min(a.chunkCount, b.chunkCount) + ' chunks with more context in each.');
      if (sa.strategy !== sb.strategy) lines.push('<b>Strategy:</b> fixed-size cut ' + (sa.strategy === 'fixed' ? a : b).midSentenceBreaks + ' chunk(s) mid-sentence; sentence-based cut ' + (sa.strategy === 'sentence' ? a : b).midSentenceBreaks + ', but its chunk sizes vary.');
      lines.push('Which is better depends on the questions you expect — that is why engineers test settings with real queries.');
    }
    $('#compareExplain').innerHTML = lines.map((l, i) => '<div class="fb' + (i === lines.length - 1 && lines.length > 1 ? ' fb--good' : '') + '"><div>' + l + '</div></div>').join('');
  }

  // =================================================================
  // MODULE 5 — RAG simulation (sample handbook OR the learner's own document)
  // =================================================================
  const rag = { strategy: 'sentence', size: 40, overlap: 0, query: '', src: 'sample', customText: '', customName: '' };
  const RAG_PRESETS = { good: { strategy: 'sentence', size: 40, overlap: 0 }, poor: { strategy: 'fixed', size: 8, overlap: 0 }, overlap: { strategy: 'fixed', size: 25, overlap: 8 } };
  let ragChanged = () => {};
  let ragSrcSeg = null;

  /** The text the simulation is currently searching. */
  function ragDoc() { return rag.src === 'custom' ? rag.customText : C.HANDBOOK; }

  /**
   * Suggest questions for an unknown document: the most frequent meaningful
   * keywords (computed, not hard-coded), shown in their most common spelling.
   */
  function topKeywords(text, n) {
    const counts = new Map(), surface = new Map();
    E.toWords(text).forEach((w) => {
      const t = R.normalize(w);
      if (!t || t.length < 4 || /^\d/.test(t)) return;
      counts.set(t, (counts.get(t) || 0) + 1);
      const s = w.toLowerCase().replace(/[^a-z0-9%-]/g, '');
      const m = surface.get(t) || new Map();
      m.set(s, (m.get(s) || 0) + 1);
      surface.set(t, m);
    });
    return Array.from(counts.entries())
      .filter((e) => e[1] >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map((e) => Array.from(surface.get(e[0]).entries()).sort((a, b) => b[1] - a[1])[0][0]);
  }

  function renderRagDoc() {
    const custom = rag.src === 'custom';
    const text = ragDoc();
    $('#docViewTitle').innerHTML = custom
      ? 'View your document <span class="muted small">' + (rag.customName ? '(' + esc(rag.customName) + ')' : '') + '</span>'
      : 'View the sample handbook <span class="muted small">(fictional university)</span>';
    $('#ragDocBadge').textContent = custom ? '— about ' + (rag.customName || 'your document') : '— about the sample handbook';
    $('#ragQuery').placeholder = custom ? 'Ask something your document answers…' : 'e.g. What is the minimum attendance required?';

    if (!text) {
      $('#handbookView').innerHTML = '<p class="muted">No document yet — upload a file, paste text, or use the Lab text.</p>';
    } else if (custom) {
      const paras = paragraphs(text);
      $('#handbookView').innerHTML = paras.slice(0, 80).map((p) => '<p>' + esc(p) + '</p>').join('') +
        (paras.length > 80 ? '<p class="muted small">… ' + (paras.length - 80) + ' more paragraphs not shown (all are searched).</p>' : '');
    } else {
      $('#handbookView').innerHTML = paragraphs(text).map((p) => {
        const m = p.match(/^([^.]+\.)\s*(.*)$/);
        return m ? '<p><b>' + esc(m[1]) + '</b> ' + esc(m[2]) + '</p>' : '<p>' + esc(p) + '</p>';
      }).join('');
    }

    if (!custom) {
      $('#ragSamples').innerHTML = '<span class="chips__label">Sample questions</span>' +
        C.SAMPLE_QUESTIONS.map((q) => '<button type="button" class="chip" data-q="' + esc(q) + '">' + esc(q) + '</button>').join('');
    } else {
      const kws = text ? topKeywords(text, 6) : [];
      $('#ragSamples').innerHTML = kws.length
        ? '<span class="chips__label">Frequent topics in your document — or type your own question</span>' +
          kws.map((k) => { const q = 'Tell me about ' + k; return '<button type="button" class="chip" data-q="' + esc(q) + '">' + esc(q) + '</button>'; }).join('')
        : (text ? '<span class="chips__label">Tip: use words that actually appear in your document — keyword search matches exact words.</span>' : '');
    }
  }

  function resetRagResult(msg) {
    rag.query = '';
    $('#ragResult').innerHTML = '<div class="empty clay clay--beige"><p>' + msg + '</p></div>';
  }

  function setCustomDoc(text, name) {
    rag.customText = text;
    rag.customName = name || 'pasted text';
    if (rag.src !== 'custom') ragSrcSeg.select('custom'); else { renderRagDoc(); ragChanged(true); }
    resetRagResult(text ? 'Your document is chunked and ready. Pick a suggested topic or type a question.' : 'Upload or paste a document to begin.');
  }

  function initRag() {
    const size = $('#ragSize'), ov = $('#ragOverlap');
    const seg = bindSeg($('#ragStrategy'), 'strategy', (v) => { rag.strategy = v; changed(); });
    bindRange(size, $('#ragSizeVal'), (v) => { rag.size = v; limitOverlap(size, ov, $('#ragOverlapVal')); rag.overlap = Number(ov.value); changed(); });
    bindRange(ov, $('#ragOverlapVal'), (v) => { rag.overlap = v; changed(); });
    limitOverlap(size, ov, $('#ragOverlapVal'));

    function changed(fromPreset) {
      if (!fromPreset) $$('[data-rag-preset]').forEach((b) => b.classList.remove('is-on'));
      const out = E.chunkText(ragDoc(), rag);
      $('#ragChunkInfo').textContent = out.stats.totalWords
        ? '→ ' + out.stats.chunkCount + ' chunks · avg ' + fmt(out.stats.avgChunkSize) + ' words · ' + out.stats.midSentenceBreaks + ' cut mid-sentence'
        : '→ no document loaded yet';
      if (rag.query) ask(rag.query);
    }
    ragChanged = changed;

    $$('[data-rag-preset]').forEach((b) => b.addEventListener('click', () => {
      const p = RAG_PRESETS[b.dataset.ragPreset];
      Object.assign(rag, p);
      size.value = p.size; $('#ragSizeVal').textContent = p.size; fill(size);
      limitOverlap(size, ov);
      ov.value = p.overlap; $('#ragOverlapVal').textContent = p.overlap; fill(ov);
      seg.select(p.strategy);
      $$('[data-rag-preset]').forEach((x) => x.classList.toggle('is-on', x === b));
      changed(true);
    }));

    // Document source: sample handbook vs own document
    ragSrcSeg = bindSeg($('#ragSource'), 'src', (v) => {
      rag.src = v;
      $('#ragCustom').hidden = v !== 'custom';
      renderRagDoc();
      changed(true);
      if (v === 'custom') resetRagResult(rag.customText ? 'Using your document. Pick a suggested topic or type a question.' : 'Upload a file, paste text, or reuse the Lab text — then ask a question about it.');
      else resetRagResult('Pick a sample question or type your own to start the simulation.');
    });

    window.DocLoader.attach({
      button: $('#ragUpload'), dropzone: $('#ragDrop'), status: $('#ragUploadStatus'),
      onLoad: (res) => { $('#ragCustomText').value = res.text; setCustomDoc(res.text, res.name); emit('upload', { anchor: $('#ragUpload') }); }
    });
    $('#ragFromLab').addEventListener('click', () => {
      const cleaned = window.DocLoader.cleanText($('#labInput').value);
      if (!cleaned.text) { $('#ragUploadStatus').innerHTML = '<div class="fb fb--warn"><div>The Lab editor is empty.</div></div>'; return; }
      $('#ragCustomText').value = cleaned.text;
      $('#ragUploadStatus').innerHTML = '<div class="fb fb--good"><div>Using the text from the Chunking Lab (' + cleaned.text.split(/\s+/).length + ' words).</div></div>';
      setCustomDoc(cleaned.text, 'Lab text');
    });
    $('#ragUseText').addEventListener('click', () => {
      const cleaned = window.DocLoader.cleanText($('#ragCustomText').value);
      if (!cleaned.text) { $('#ragUploadStatus').innerHTML = '<div class="fb fb--warn"><div>Paste some text first.</div></div>'; return; }
      $('#ragCustomText').value = cleaned.text;
      $('#ragUploadStatus').innerHTML = '<div class="fb fb--good"><div>' + cleaned.text.split(/\s+/).length + ' words ready. Preprocessing: ' + window.DocLoader.describeReport(cleaned.report) + '.</div></div>';
      setCustomDoc(cleaned.text, 'pasted text');
    });

    $('#ragSamples').addEventListener('click', (e) => {
      const c = e.target.closest('[data-q]');
      if (!c) return;
      $('#ragQuery').value = c.dataset.q;
      ask(c.dataset.q);
    });
    $('#ragForm').addEventListener('submit', (e) => { e.preventDefault(); ask($('#ragQuery').value); });
    renderRagDoc();
    changed(true);
  }

  function ask(query) {
    const q = String(query || '').trim();
    const box = $('#ragResult');
    if (rag.src === 'custom' && !rag.customText) { box.innerHTML = '<div class="fb fb--warn"><div>Load your document first: upload a file, paste text, or use the Lab text.</div></div>'; return; }
    if (!q) { box.innerHTML = '<div class="fb fb--warn"><div>Type a question first' + (rag.src === 'sample' ? ', or pick one of the sample questions' : '') + '.</div></div>'; return; }
    rag.query = q;
    const r = R.retrieve(ragDoc(), q, rag, 3);
    const out = r.chunking;
    const top = r.results[0] ? r.results[0].score : 1;
    const kwSet = new Set(r.terms.all);
    const hl = (words) => words.map((w) => kwSet.has(R.normalize(w)) ? '<mark class="kw">' + esc(w) + '</mark>' : esc(w)).join(' ');
    const docName = rag.src === 'custom' ? 'your document' : 'the handbook';

    const steps = [];
    steps.push({ t: 'Chunk ' + docName, b: '<p>' + (rag.strategy === 'fixed' ? 'Fixed-size' : 'Sentence-based') + ' chunking, size ' + out.settings.size + ', overlap ' + out.settings.overlap + ' → <b>' + out.stats.chunkCount + ' chunks</b> of about ' + fmt(out.stats.avgChunkSize) + ' words.</p>' });

    const termsHTML = r.terms.base.map((t) => '<span class="term-chip">' + esc(t) + '</span>').join('') +
      r.terms.expanded.map((e) => '<span class="term-chip term-chip--exp">' + esc(e.term) + ' <small>(from "' + esc(e.from) + '")</small></span>').join('');
    steps.push({ t: 'Turn the question into keywords', b: '<p class="small">Filler words like "what", "is", "the" are removed, and words are reduced to a simple root (e.g. "timings" → "timing").' + (r.terms.expanded.length ? ' Grey terms come from a small hand-written synonym list — keyword search cannot understand meaning on its own.' : '') + '</p>' + (termsHTML || '<p class="muted small">No meaningful keywords found.</p>') });

    if (!r.results.length) {
      steps.push({ t: 'Score every chunk', b: '<div class="fb fb--warn"><div>No chunk shares a keyword with your question. Keyword search only finds exact words. A production RAG system using <b>embeddings</b> could still match by meaning. Try ' + (rag.src === 'sample' ? 'a sample question, or use words from the handbook.' : 'a suggested topic, or use words that appear in your document.') + '</div></div>' });
    } else {
      // Score bar for EVERY chunk — real scores, so students see the "competition".
      const all = R.scoreChunks(out.chunks, r.terms.all).slice(0, 400);
      const max = Math.max.apply(null, all.map((a) => a.score).concat([0.0001]));
      const topIdx = new Set(r.results.map((x) => x.chunk.index));
      const heat = '<div class="heat" role="img" aria-label="Score of each of the ' + all.length + ' chunks; the top ' + r.results.length + ' are highlighted">' +
        all.map((a, i) => '<span class="heat__bar' + (topIdx.has(i) ? ' is-top' : '') + '" style="--h:' + Math.max(4, (a.score / max) * 100).toFixed(1) + '%;--i:' + i + '" title="Chunk ' + (i + 1) + ': score ' + a.score.toFixed(2) + '"></span>').join('') +
        '</div><p class="tiny muted">Each bar is one chunk, and its height is the score. The coral bars are the top ' + r.results.length + ' that get retrieved.</p>';
      steps.push({ t: 'Score all ' + out.stats.chunkCount + ' chunks and retrieve the top ' + r.results.length, b: '<p class="small">Each chunk gets points for every keyword it contains; rarer keywords are worth more (TF-IDF style).</p>' + heat +
        r.results.map((x, i) =>
          '<div class="ret-card"><div class="ret-card__head"><span class="chunk-card__n">#' + (i + 1) + ' · Chunk ' + (x.chunk.index + 1) + '</span>' +
          '<span class="ret-card__score">score ' + x.score.toFixed(2) + ' <i style="--s:' + Math.round((x.score / top) * 100) + '%"></i></span></div>' +
          '<div class="ret-card__txt">' + hl(x.chunk.words) + '</div>' +
          '<p class="ret-card__why">Why selected: matched ' + x.matched.map((m) => '<b>' + esc(m.term) + '</b> ×' + m.tf).join(', ') + (x.chunk.endsMidSentence ? ' · <span style="color:var(--coral-ink)">⚠ this chunk ends mid-sentence</span>' : '') + '</p></div>'
        ).join('') });

      const ans = r.answer.length
        ? r.answer.map((a) => '<q>' + esc(a.text) + '</q>' + (a.complete ? '' : ' <span class="tiny" style="display:inline;color:#F7B9A6">(fragment)</span>')).join(' ')
        : 'No sentence in the retrieved chunks matched.';
      steps.push({ t: 'Illustrative answer', b: '<div class="answer">' + ans + '<span class="tiny">Extracted word-for-word from the retrieved chunks — no language model wrote this. A real RAG app would pass these chunks to an LLM, which would write a fluent answer grounded in them.</span></div>' });
    }

    let frag = '';
    if (r.fragmentation && r.results.length) {
      const f = r.fragmentation;
      frag = f.intactInRetrieved
        ? '<div class="fb fb--good frag"><div><b>Good chunking for this question:</b> the best-matching sentence in ' + docName + ' — “' + esc(f.sentence) + '” — sits whole inside a retrieved chunk.</div></div>'
        : !f.intactInAnyChunk
          ? '<div class="fb fb--warn frag"><div><b>Chunking fragmented the answer.</b> The best-matching sentence — “' + esc(f.sentence) + '” — is split across chunks ' + f.spansChunks.map((n) => '#' + (n + 1)).join(', ') + '. No chunk contains it whole, so the retriever can only return pieces. Try <b>Sentence · 40 / 0</b> or add overlap.</div></div>'
          : '<div class="fb fb--warn frag"><div>The best-matching sentence exists whole in some chunk, but that chunk was not in the top results. Retrieval quality depends on both chunking and scoring.</div></div>';
    }

    box.innerHTML = '<ol class="rs-list">' + steps.map((s, i) =>
      '<li class="rs" style="--i:' + i + '"><span class="rs__n">' + (i + 1) + '</span><div class="rs__body"><h4>' + s.t + '</h4>' + s.b + '</div></li>'
    ).join('') + '</ol>' + frag;
    if (P) P.markDone('rag', P.isDone('rag'));
    emit('rag-ask', { found: r.results.length > 0, fragmented: !!(r.fragmentation && r.results.length && !r.fragmentation.intactInAnyChunk) });
  }

  // =================================================================
  // MODULE 6 — Challenge
  // =================================================================
  const ch = { strategy: 'fixed', size: 10, overlap: 0, result: null };

  function initChallenge() {
    $('#challengeDocView').innerHTML = paragraphs(C.CHALLENGE_DOC).map((p) => {
      const m = p.match(/^([^.]+\.)\s*(.*)$/);
      return '<p><b>' + esc(m[1]) + '</b> ' + esc(m[2]) + '</p>';
    }).join('');
    const size = $('#chSize'), ov = $('#chOverlap');
    bindSeg($('#chStrategy'), 'strategy', (v) => { ch.strategy = v; });
    bindRange(size, $('#chSizeVal'), (v) => { ch.size = v; limitOverlap(size, ov, $('#chOverlapVal')); ch.overlap = Number(ov.value); });
    bindRange(ov, $('#chOverlapVal'), (v) => { ch.overlap = v; });
    limitOverlap(size, ov, $('#chOverlapVal'));
    $('#chGenerate').addEventListener('click', runChallenge);
    const reason = $('#chReason');
    reason.addEventListener('input', () => { $('#chReasonCount').textContent = reason.value.trim().length + ' / 40 characters minimum'; });
    $('#chSubmit').addEventListener('click', checkChallenge);
  }

  function runChallenge() {
    const opts = { strategy: ch.strategy, size: ch.size, overlap: ch.overlap };
    const out = E.chunkText(C.CHALLENGE_DOC, opts);
    // Paragraph (topic) of every word, to detect chunks that mix two policies.
    const topicOf = [];
    paragraphs(C.CHALLENGE_DOC).forEach((p, i) => E.toWords(p).forEach(() => topicOf.push(i)));
    const mixed = out.chunks.filter((c) => topicOf[c.start] !== topicOf[c.end - 1]).length;

    const tests = C.CHALLENGE_TESTS.map((t) => {
      const r = R.retrieve(C.CHALLENGE_DOC, t.q, opts, 3);
      const topOk = r.results[0] && r.results[0].chunk.text.includes(t.answer);
      const anyOk = r.results.some((x) => x.chunk.text.includes(t.answer));
      return { q: t.q, answer: t.answer, status: topOk ? 'pass' : anyOk ? 'part' : 'fail', top: r.results[0] };
    });
    const passed = tests.filter((t) => t.status === 'pass').length;
    ch.result = { out: out, tests: tests, passed: passed, mixed: mixed, opts: opts };

    $('#chOutput').hidden = false;
    $('#chReasonBox').hidden = false;
    const st = out.stats;
    $('#chStats').innerHTML = statTile(st.chunkCount, 'chunks') + statTile(fmt(st.avgChunkSize), 'avg words') +
      statTile(st.redundantWords, 'redundant words', true) + statTile(st.midSentenceBreaks, 'cut mid-sentence', true) +
      statTile(mixed, 'chunks mixing 2 policies', true) + statTile(passed + '/3', 'tests passed');
    $('#chChunks').innerHTML = out.chunks.map((c) => chunkCard(c)).join('');
    $('#chTests').innerHTML = tests.map((t) =>
      '<li class="test test--' + t.status + '"><div><b>' + esc(t.q) + '</b><small>' +
      (t.status === 'pass' ? 'Top chunk contains the full answer: “' + esc(t.answer) + '”'
        : t.status === 'part' ? 'The full answer is retrieved, but not in the top chunk.'
        : 'No retrieved chunk contains the complete answer sentence. ' + (t.top ? 'Top chunk: “' + esc(t.top.chunk.text) + '”' : '')) +
      '</small></div></li>').join('');
    $('#chFeedback').innerHTML = '';
    $('#chOutput').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function checkChallenge() {
    const res = ch.result;
    const box = $('#chFeedback');
    const reason = $('#chReason').value.trim();
    if (!res) { box.innerHTML = '<div class="fb fb--warn"><div>Generate your chunks first (step 4).</div></div>'; return; }
    if (reason.length < 40) { box.innerHTML = '<div class="fb fb--warn"><div>Explain your choice in at least 40 characters — the reasoning is the most important part of this challenge.</div></div>'; $('#chReason').focus(); return; }

    const st = res.out.stats, o = res.opts;
    const fb = [];
    const add = (t, cls) => fb.push('<div class="fb' + (cls ? ' fb--' + cls : '') + '"><div>' + t + '</div></div>');

    add('<b>Retrieval test: ' + res.passed + ' of 3</b> questions got the complete answer in the top chunk.', res.passed === 3 ? 'good' : res.passed ? '' : 'warn');

    if (o.strategy === 'sentence') add('<b>Strategy — sentence-based:</b> each policy statement stays whole, which suits a document made of short, self-contained rules.' + (st.midSentenceBreaks ? ' (' + st.midSentenceBreaks + ' sentence(s) were longer than your limit and had to be split.)' : ''));
    else add('<b>Strategy — fixed-size:</b> predictable chunk sizes, but ' + st.midSentenceBreaks + ' of ' + st.chunkCount + ' chunks end mid-sentence. In a policy document, a cut can separate a rule from its number (like "10:30 PM").', st.midSentenceBreaks ? 'warn' : '');

    if (o.size < 10) add('<b>Size ' + o.size + ':</b> smaller than most statements in this document (about 8–15 words each), so rules get split and lose meaning.', 'warn');
    else if (o.size <= 35) add('<b>Size ' + o.size + ':</b> room for one to a few related statements — focused chunks that still carry context.');
    else add('<b>Size ' + o.size + ':</b> large chunks keep whole topics together, but ' + res.mixed + ' chunk(s) mix two different policies, which can add unrelated text to the context.', res.mixed ? 'warn' : '');

    const ratio = o.overlap / o.size;
    if (o.overlap === 0) add('<b>Overlap 0:</b> no redundancy. ' + (o.strategy === 'sentence' ? 'Fine here, because sentence boundaries already protect each rule.' : 'With fixed-size chunks, nothing protects ideas at the boundaries.'));
    else if (ratio > 0.4) add('<b>Overlap ' + o.overlap + ':</b> ' + st.redundantWords + ' repeated words (' + fmt(st.redundancyPct, 0) + '% extra storage). That is a lot of duplication for short statements.', 'warn');
    else add('<b>Overlap ' + o.overlap + ':</b> a modest bridge between chunks for ' + st.redundantWords + ' repeated words.');

    // Reasoning coverage — rewards explaining trade-offs, not a magic answer.
    const concepts = [
      { k: 'document structure', re: /sentence|structure|paragraph|statement|rule|polic/i },
      { k: 'context / meaning', re: /context|meaning|complete|whole|intact|self-contained/i },
      { k: 'boundaries / splitting', re: /bound|split|cut|break|fragment|half/i },
      { k: 'size trade-off', re: /size|small|large|big|focus|precise|short|long/i },
      { k: 'overlap / redundancy', re: /overlap|redundan|repeat|duplicat|storage|cost/i },
      { k: 'retrieval / questions', re: /retriev|search|question|answer|query|find|match/i }
    ];
    const hit = concepts.filter((c) => c.re.test(reason));
    const miss = concepts.filter((c) => !c.re.test(reason));
    add('<b>Your reasoning covers ' + hit.length + ' of 6 key ideas</b>' + (hit.length ? ': ' + hit.map((c) => c.k).join(', ') + '.' : '.') +
      (miss.length ? ' To strengthen it, also discuss: ' + miss.map((c) => c.k).join(', ') + '.' : ' Excellent — that is how an engineer justifies a design.'), hit.length >= 4 ? 'good' : '');

    const level = res.passed === 3 && hit.length >= 4 ? 'Document Processing Engineer — certified ✓'
      : res.passed >= 2 && hit.length >= 3 ? 'Solid engineering judgement'
      : 'Good attempt — try another configuration and compare';
    add('<b>' + level + '.</b> Remember: there is no single correct configuration. Another engineer could pick different settings and be just as right, if they can explain the trade-offs and test them.', 'good');
    box.innerHTML = fb.join('');

    if (P) { P.setMeta('challenge', { passed: res.passed, total: 3 }); P.markDone('challenge'); }
    emit('challenge', { passed: res.passed });
  }

  // =================================================================
  // MODULE 8 — Architecture flow & completion
  // =================================================================
  function initApplications() {
    const steps = [
      ['User uploads document', 'live', 'Upload, drop or paste'],
      ['Text extraction', 'live', 'PDF, DOCX, HTML → text'],
      ['Document preprocessing', 'live', 'Page numbers, hyphens, spacing'],
      ['Chunking', 'live', 'Fixed & sentence-based'],
      ['Embedding generation', 'concept', 'Text → vectors'],
      ['Vector database storage', 'concept', 'Indexed for search'],
      ['User query', 'live', 'Your question'],
      ['Retrieval', 'sim', 'Keyword scoring'],
      ['Relevant context', 'live', 'Top-3 chunks shown'],
      ['LLM response', 'sim', 'Extractive stand-in']
    ];
    $('#archFlow').innerHTML = steps.map((s) => '<li class="arch__step arch--' + s[1] + '">' + s[0] + '<small>' + s[2] + '</small></li>').join('');

    $('#finishBtn').addEventListener('click', () => {
      const missing = P.SECTIONS.filter((s) => s.id !== 'applications' && !P.isDone(s.id));
      P.markDone('applications', true);
      if (missing.length) {
        P.toast('Almost there — still to do: ' + missing.map((s) => s.short).join(', '));
        const el = document.getElementById(missing[0].id);
        if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 400);
      } else {
        P.toast('🎉 Lesson complete — great work!');
      }
    });
  }

  // =================================================================
  // Boot
  // =================================================================
  document.addEventListener('DOMContentLoaded', () => {
    P.init();
    initProblem();
    initChunkingModule();
    initSizeOverlap();
    initLab();
    initRag();
    initChallenge();
    window.Quiz.init();
    initApplications();
    P.onChange((ev) => { if (ev === 'reset') { window.Quiz.init(); } });
  });
})();
