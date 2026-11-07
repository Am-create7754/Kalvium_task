/* =====================================================================
   PRISM — Keyword Retrieval Simulator
   ---------------------------------------------------------------------
   HONEST LABEL: this is a teaching simulation. It does NOT use embeddings,
   a vector database, or an LLM. It scores chunks with a simple
   TF-IDF-style keyword match so students can SEE why a chunk was chosen.
   Production RAG systems usually embed the query and chunks as vectors
   and rank by semantic similarity (e.g. cosine similarity).
   ===================================================================== */
(function (root) {
  'use strict';

  const Engine = (typeof module !== 'undefined' && module.exports)
    ? require('./chunking.js')
    : root.ChunkEngine;

  // Common words that carry little meaning for matching.
  const STOPWORDS = new Set((
    'a an the is are was were be been being am do does did doing have has had ' +
    'i me my we our you your he she it its they them their what which who whom ' +
    'this that these those of to in on at by for with about from into over under ' +
    'and or but if then so than too very can could should would will shall may might ' +
    'must how when where why there here all any each some no not only own same ' +
    'just also as up out off again once get got please tell know need want much many ' +
    'there s'
  ).split(/\s+/));

  // A tiny, VISIBLE synonym list. Keyword search cannot understand meaning,
  // so without this "timings" would never match "open … AM". Real systems
  // solve this with embeddings instead of hand-written lists.
  const SYNONYMS = {
    timing: ['hour', 'open'],
    time: ['hour', 'open'],
    late: ['late', 'deadline', 'penalty'],
    minimum: ['minimum', 'least'],
    fee: ['fee', 'fine'],
    borrow: ['borrow', 'book'],
    register: ['registration', 'register'],
    exam: ['examination', 'exam'],
    eligible: ['eligible', 'eligibility']
  };

  /** Very small stemmer: enough to match "submissions"→"submission", "timings"→"timing". */
  function stem(w) {
    if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
    if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3);
    if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    return w;
  }

  /** Lower-case, strip punctuation, drop stopwords, stem. */
  function normalize(word) {
    const w = String(word).toLowerCase().replace(/[^a-z0-9%]/g, '');
    if (!w || STOPWORDS.has(w)) return '';
    return stem(w);
  }

  /** Turn a query into normalized terms + synonym expansions (shown to the student). */
  function queryTerms(query) {
    const base = [];
    String(query || '').split(/\s+/).forEach((raw) => {
      const t = normalize(raw);
      if (t && !base.includes(t)) base.push(t);
    });
    const expanded = [];
    base.forEach((t) => {
      (SYNONYMS[t] || []).forEach((s) => {
        const st = stem(s);
        if (!base.includes(st) && !expanded.some((e) => e.term === st)) expanded.push({ term: st, from: t });
      });
    });
    return { base: base, expanded: expanded, all: base.concat(expanded.map((e) => e.term)) };
  }

  /** Count normalized terms inside a list of words. */
  function termCounts(words) {
    const m = new Map();
    words.forEach((w) => {
      const t = normalize(w);
      if (t) m.set(t, (m.get(t) || 0) + 1);
    });
    return m;
  }

  /**
   * Score each chunk:  score = Σ (1 + ln tf) × idf   over query terms present
   *   tf  = how often the term appears in the chunk
   *   idf = ln((n + 1) / (df + 1)) + 1   (rarer terms count more)
   */
  function scoreChunks(chunks, terms) {
    const n = chunks.length;
    const counts = chunks.map((c) => termCounts(c.words));
    const idf = {};
    terms.forEach((t) => {
      const df = counts.filter((m) => m.has(t)).length;
      idf[t] = Math.log((n + 1) / (df + 1)) + 1;
    });
    return chunks.map((c, i) => {
      let score = 0;
      const matched = [];
      terms.forEach((t) => {
        const tf = counts[i].get(t) || 0;
        if (tf > 0) {
          score += (1 + Math.log(tf)) * idf[t];
          matched.push({ term: t, tf: tf });
        }
      });
      return { chunk: c, score: score, matched: matched };
    });
  }

  /** Score a single span of words (used to pick sentences for the extractive answer). */
  function scoreSpan(words, terms) {
    const m = termCounts(words);
    let s = 0;
    terms.forEach((t) => { if (m.has(t)) s += 1; });
    return s;
  }

  /**
   * Full simulated retrieval.
   * @returns {{terms, results, answer, fragmentation}}
   */
  function retrieve(text, query, chunkOpts, topK) {
    const k = topK || 3;
    const terms = queryTerms(query);
    const out = Engine.chunkText(text, chunkOpts);
    if (!terms.all.length || !out.chunks.length) {
      return { terms: terms, chunking: out, results: [], answer: [], fragmentation: null };
    }

    const results = scoreChunks(out.chunks, terms.all)
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.chunk.index - b.chunk.index)
      .slice(0, k);

    // EXTRACTIVE "answer": the best-matching sentence fragments found INSIDE
    // the retrieved chunks. No language model writes anything here — so if
    // chunking cut a sentence in half, the student sees the broken fragment.
    const candidates = [];
    results.forEach((r) => {
      // paragraph breaks inside this chunk, as chunk-local indices
      const localParas = new Set(Array.from(out.paraStarts).filter((p) => p > r.chunk.start && p < r.chunk.end).map((p) => p - r.chunk.start));
      const local = Engine.toSentences(r.chunk.words, localParas);
      local.forEach((s) => {
        const ws = r.chunk.words.slice(s.start, s.end);
        const sc = scoreSpan(ws, terms.all);
        if (sc > 0) {
          candidates.push({
            text: ws.join(' '),
            score: sc,
            chunkIndex: r.chunk.index,
            globalStart: r.chunk.start + s.start,
            complete: (Engine.endsSentence(ws[ws.length - 1]) || out.paraStarts.has(r.chunk.start + s.end)) &&
                      (r.chunk.start + s.start === 0 || out.paraStarts.has(r.chunk.start + s.start) || Engine.endsSentence(out.words[r.chunk.start + s.start - 1]))
          });
        }
      });
    });
    // Skip 1–3 word headings (e.g. "Attendance Policy.") when real sentences exist,
    // and drop duplicates: overlap can repeat the same sentence (or part of it)
    // in two chunks. Keep the best two.
    const substantial = candidates.filter((c) => c.text.split(' ').length > 3);
    const pool = substantial.length ? substantial : candidates;
    const kept = [];
    pool
      .sort((a, b) => b.score - a.score || a.globalStart - b.globalStart)
      .forEach((c) => {
        const dup = kept.some((k) => k.text.includes(c.text) || c.text.includes(k.text));
        if (!dup && kept.length < 2) kept.push(c);
      });
    const answer = kept.sort((a, b) => a.globalStart - b.globalStart);

    // FRAGMENTATION CHECK: find the best-matching sentence in the WHOLE document
    // and check whether any single retrieved chunk contains all of it.
    const docSentences = Engine.toSentences(out.words, out.paraStarts);
    let best = null;
    docSentences.forEach((s) => {
      const sc = scoreSpan(out.words.slice(s.start, s.end), terms.all);
      if (sc > 0 && (!best || sc > best.score)) best = { start: s.start, end: s.end, score: sc };
    });
    let fragmentation = null;
    if (best) {
      const containedIn = out.chunks.filter((c) => c.start <= best.start && c.end >= best.end).map((c) => c.index);
      const spans = out.chunks.filter((c) => c.start < best.end && c.end > best.start).map((c) => c.index);
      const retrievedIdx = results.map((r) => r.chunk.index);
      fragmentation = {
        sentence: out.words.slice(best.start, best.end).join(' '),
        intactInAnyChunk: containedIn.length > 0,
        intactInRetrieved: containedIn.some((i) => retrievedIdx.includes(i)),
        spansChunks: spans
      };
    }

    return { terms: terms, chunking: out, results: results, answer: answer, fragmentation: fragmentation };
  }

  const API = {
    STOPWORDS: STOPWORDS,
    SYNONYMS: SYNONYMS,
    stem: stem,
    normalize: normalize,
    queryTerms: queryTerms,
    scoreChunks: scoreChunks,
    retrieve: retrieve
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Retriever = API;
})(typeof window !== 'undefined' ? window : this);
