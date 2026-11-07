/* =====================================================================
   PRISM — Chunking Engine
   ---------------------------------------------------------------------
   Pure functions, no DOM access. Works in the browser (window.ChunkEngine)
   and in Node (module.exports) so the logic can be unit-tested.

   Every chunk is represented as a contiguous RANGE of word indices
   [start, end) into the document's word list. This makes overlap exact:
   overlap with the previous chunk = max(0, prev.end - this.start).
   ===================================================================== */
(function (root) {
  'use strict';

  /**
   * Basic preprocessing: normalise line endings and collapse runs of
   * spaces/tabs. Real pipelines also strip headers/footers, fix broken
   * hyphenation from PDFs, remove boilerplate, etc.
   */
  function preprocess(text) {
    return String(text || '')
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /** Split text into words on any whitespace. Punctuation stays attached. */
  function toWords(text) {
    const clean = preprocess(text);
    return clean ? clean.split(/\s+/) : [];
  }

  /** True if a word ends a sentence (., !, ? optionally followed by quotes/brackets). */
  function endsSentence(word) {
    // . ! ?  plus Hindi danda । ॥ and full-width 。！？
    return /[.!?।॥。！？]["'”’)\]]*$/.test(word);
  }

  /**
   * Group word indices into sentences.
   * Returns [{start, end}] ranges over the word list.
   * A trailing fragment without final punctuation still counts as a sentence.
   * If paragraph starts are given, a paragraph break also ends a sentence
   * (so a heading like "Member Guide" never merges into the next line).
   */
  function toSentences(words, paraStarts) {
    const sentences = [];
    const breaks = paraStarts || new Set();
    let start = 0;
    for (let i = 0; i < words.length; i++) {
      if (endsSentence(words[i]) || breaks.has(i + 1)) {
        sentences.push({ start: start, end: i + 1 });
        start = i + 1;
      }
    }
    if (start < words.length) sentences.push({ start: start, end: words.length });
    return sentences;
  }

  /**
   * Word indices where a new paragraph begins (paragraphs = blank-line separated).
   * Counts use the same whitespace split as toWords, so indices line up.
   */
  function paragraphStarts(text) {
    const starts = new Set();
    let idx = 0;
    preprocess(text).split(/\n\s*\n/).forEach((p) => {
      const t = p.trim();
      if (!t) return;
      starts.add(idx);
      idx += t.split(/\s+/).length;
    });
    return starts;
  }

  /** Clamp settings into a valid, loop-safe configuration. */
  function sanitize(size, overlap) {
    let C = Math.floor(Number(size));
    if (!Number.isFinite(C) || C < 1) C = 1;
    let O = Math.floor(Number(overlap));
    if (!Number.isFinite(O) || O < 0) O = 0;
    if (O > C - 1) O = C - 1;            // overlap must leave a step of >= 1 word
    return { size: C, overlap: O };
  }

  /**
   * FIXED-SIZE WORD CHUNKING
   *   N = total words, C = chunk size, O = overlap, S = C - O (step)
   *   Chunk k starts at k * S and ends at min(start + C, N).
   *   We stop as soon as a chunk reaches the end of the document, so we never
   *   emit a trailing chunk that is entirely contained in the previous one.
   */
  function fixedRanges(N, size, overlap, offset) {
    const base = offset || 0;
    const { size: C, overlap: O } = sanitize(size, overlap);
    const S = C - O;                     // always >= 1 → loop always terminates
    const ranges = [];
    for (let start = 0; start < N; start += S) {
      const end = Math.min(start + C, N);
      ranges.push({ start: base + start, end: base + end });
      if (end === N) break;
    }
    return ranges;
  }

  /**
   * SENTENCE-BASED CHUNKING
   *   Pack whole sentences into a chunk until adding the next sentence would
   *   exceed C words. Then start a new chunk.
   *   Overlap: carry the trailing whole sentences of the previous chunk
   *   (at most O words in total) into the next chunk.
   *   A single sentence longer than C is split with fixed-size windows,
   *   because there is no other way to respect the limit.
   */
  function sentenceRanges(words, size, overlap, paraStarts) {
    const { size: C, overlap: O } = sanitize(size, overlap);
    const newPara = paraStarts || new Set();
    const sentences = toSentences(words, newPara);
    const ranges = [];
    const len = (s) => s.end - s.start;

    let current = [];      // sentences in the chunk being built
    let fresh = 0;         // how many of them are NEW (not carried overlap)

    const flush = () => {
      if (current.length && fresh > 0) {
        ranges.push({ start: current[0].start, end: current[current.length - 1].end });
      }
    };
    const total = () => current.reduce((a, s) => a + len(s), 0);

    for (const s of sentences) {
      const sl = len(s);

      // Structure-aware: a new paragraph always starts a new chunk
      // (no overlap carried across paragraphs — they are different topics).
      if (newPara.has(s.start) && current.length) {
        flush();
        current = [];
        fresh = 0;
      }

      if (sl > C) {
        // Oversized sentence: close the current chunk, then split this sentence.
        flush();
        fixedRanges(sl, C, O, s.start).forEach((r) => ranges.push(r));
        current = [];
        fresh = 0;
        continue;
      }

      if (current.length && total() + sl > C) {
        flush();
        // Build the overlap carry from the END of the finished chunk.
        const carry = [];
        let carried = 0;
        for (let j = current.length - 1; j >= 0; j--) {
          const l = len(current[j]);
          if (carried + l <= O && carried + l + sl <= C) {
            carry.unshift(current[j]);
            carried += l;
          } else break;
        }
        current = carry;
        fresh = 0;
      }

      current.push(s);
      fresh++;
    }
    flush();
    return ranges;
  }

  /**
   * Main entry point.
   * @param {string} text
   * @param {{strategy:'fixed'|'sentence', size:number, overlap:number}} opts
   * @returns {{words:string[], chunks:Array, stats:Object, settings:Object}}
   */
  function chunkText(text, opts) {
    const o = opts || {};
    const strategy = o.strategy === 'sentence' ? 'sentence' : 'fixed';
    const settings = Object.assign({ strategy: strategy }, sanitize(o.size, o.overlap));
    const words = toWords(text);
    const paras = paragraphStarts(text);

    const ranges = words.length === 0
      ? []
      : strategy === 'sentence'
        ? sentenceRanges(words, settings.size, settings.overlap, paras)
        : fixedRanges(words.length, settings.size, settings.overlap);

    const chunks = ranges.map((r, i) => {
      const prev = ranges[i - 1];
      const overlapPrev = prev ? Math.max(0, prev.end - r.start) : 0;
      const w = words.slice(r.start, r.end);
      return {
        index: i,
        start: r.start,
        end: r.end,
        words: w,
        text: w.join(' '),
        wordCount: w.length,
        overlapPrev: overlapPrev,                 // first N words repeat the previous chunk
        // a cut is mid-sentence unless it lands on punctuation or a paragraph break
        endsMidSentence: !endsSentence(w[w.length - 1]) && r.end < words.length && !paras.has(r.end)
      };
    });

    return { words: words, chunks: chunks, paraStarts: paras, settings: settings, stats: computeStats(words, chunks, settings) };
  }

  /** Statistics computed from the ACTUAL generated chunks. */
  function computeStats(words, chunks, settings) {
    const totalChunkWords = chunks.reduce((a, c) => a + c.wordCount, 0);
    const redundant = chunks.reduce((a, c) => a + c.overlapPrev, 0);
    return {
      totalWords: words.length,
      chunkCount: chunks.length,
      avgChunkSize: chunks.length ? totalChunkWords / chunks.length : 0,
      minChunk: chunks.length ? Math.min.apply(null, chunks.map((c) => c.wordCount)) : 0,
      maxChunk: chunks.length ? Math.max.apply(null, chunks.map((c) => c.wordCount)) : 0,
      overlapSetting: settings.overlap,
      redundantWords: redundant,                 // words stored more than once
      totalStoredWords: totalChunkWords,
      redundancyPct: words.length ? (redundant / words.length) * 100 : 0,
      midSentenceBreaks: chunks.filter((c) => c.endsMidSentence).length
    };
  }

  /**
   * Rough token estimate for English text (~4 characters per token).
   * This is a rule of thumb ONLY — real tokenizers (BPE, WordPiece, …) vary.
   */
  function estimateTokens(text) {
    const t = String(text || '').trim();
    return t ? Math.max(1, Math.round(t.length / 4)) : 0;
  }

  const API = {
    preprocess: preprocess,
    toWords: toWords,
    toSentences: toSentences,
    paragraphStarts: paragraphStarts,
    endsSentence: endsSentence,
    sanitize: sanitize,
    fixedRanges: fixedRanges,
    sentenceRanges: sentenceRanges,
    chunkText: chunkText,
    computeStats: computeStats,
    estimateTokens: estimateTokens
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.ChunkEngine = API;
})(typeof window !== 'undefined' ? window : this);
