/* =====================================================================
   PRISM — Real tokenizer + TOKEN-BASED CHUNKING
   ---------------------------------------------------------------------
   Uses the real cl100k_base BPE tokenizer (GPT-4 / GPT-3.5 and OpenAI's
   text-embedding-3 models) via the open-source `gpt-tokenizer` package,
   loaded on demand (~1 MB). Production chunkers measure size in tokens,
   so this turns PRISM's token lessons from an estimate into the real thing.

   chunkIds() is pure and unit-tested in Node with a fake encoder.
   ===================================================================== */
(function (root) {
  'use strict';

  const Engine = (typeof module !== 'undefined' && module.exports) ? require('./chunking.js') : root.ChunkEngine;
  const LIB = 'https://cdn.jsdelivr.net/npm/gpt-tokenizer@2.9.0/dist/cl100k_base.js';
  const NAME = 'cl100k_base';
  let enc = null;
  let loading = null;

  /** True if a piece of text ends a sentence (allowing trailing quotes/space). */
  const endsSentenceText = (t) => /[.!?।]["'”’)\]]*\s*$/.test(t);
  /** True if two neighbouring token pieces are parts of one word. */
  const joinsWord = (a, b) => /[\p{L}\p{N}]$/u.test(a || '') && /^[\p{L}\p{N}]/u.test(b || '');

  /**
   * Token-based chunking over an already-encoded document.
   * @param {number[]} ids     token ids of the whole document
   * @param {Function} decode  ids[] → string
   * @returns same shape as ChunkEngine.chunkText(), with unit 'token'
   *   - chunks are fixed windows of `size` tokens, step = size − overlap
   *   - words[] holds each token's text, so the UI can show token pills
   */
  function chunkIds(ids, decode, size, overlap) {
    const s = Engine.sanitize(size, overlap);
    const settings = { strategy: 'token', size: s.size, overlap: s.overlap };
    const pieces = ids.map((id) => decode([id]));
    const ranges = ids.length ? Engine.fixedRanges(ids.length, s.size, s.overlap) : [];
    const chunks = ranges.map((r, i) => {
      const prev = ranges[i - 1];
      const text = decode(ids.slice(r.start, r.end));
      const isLast = r.end >= ids.length;
      return {
        index: i, start: r.start, end: r.end,
        words: pieces.slice(r.start, r.end),
        text: text,
        wordCount: r.end - r.start,                       // = tokens in this chunk
        overlapPrev: prev ? Math.max(0, prev.end - r.start) : 0,
        endsMidSentence: !isLast && !endsSentenceText(text),
        endsMidWord: !isLast && joinsWord(pieces[r.end - 1], pieces[r.end])
      };
    });
    const stats = Engine.computeStats(pieces, chunks, settings);
    stats.midWordCuts = chunks.filter((c) => c.endsMidWord).length;
    return { words: pieces, chunks: chunks, settings: settings, stats: stats, unit: 'token', joiner: '' };
  }

  // ---------------- browser: load + use the real tokenizer ----------------
  function load() {
    if (enc) return Promise.resolve(enc);
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = LIB;
      s.async = true;
      s.onload = () => {
        const lib = root.GPTTokenizer_cl100k_base;
        if (!lib || typeof lib.encode !== 'function') { loading = null; reject(new Error('Tokenizer did not initialise.')); return; }
        enc = lib;
        resolve(enc);
        document.dispatchEvent(new CustomEvent('chunklab', { detail: { type: 'tokenizer-ready' } }));
      };
      s.onerror = () => { loading = null; reject(new Error('Could not download the tokenizer (are you offline?). Showing an estimate instead.')); };
      document.head.appendChild(s);
    });
    return loading;
  }

  const ready = () => !!enc;
  const encode = (text) => enc.encode(String(text || ''));
  const count = (text) => (enc ? encode(text).length : null);
  /** Each token of a short text as {id, text} — for the "see the tokens" view. */
  const pieces = (text) => encode(text).map((id) => ({ id: id, text: enc.decode([id]) }));
  function chunkText(text, opts) {
    const clean = Engine.preprocess(text);
    return chunkIds(clean ? encode(clean) : [], enc.decode, opts.size, opts.overlap);
  }

  const API = { NAME: NAME, chunkIds: chunkIds, load: load, ready: ready, count: count, pieces: pieces, chunkText: chunkText };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.Tok = API;
})(typeof window !== 'undefined' ? window : this);
