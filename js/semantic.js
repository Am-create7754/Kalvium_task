/* =====================================================================
   PRISM — Real semantic search (optional, runs in the browser)
   ---------------------------------------------------------------------
   Loads the open-source sentence-embedding model all-MiniLM-L6-v2
   (quantised, ~23 MB) with transformers.js — only when the learner asks.
   Each chunk becomes a 384-number vector; the question is embedded the
   same way; chunks are ranked by cosine similarity. This is the real
   retrieval step of production RAG, minus the vector database (for a few
   hundred chunks, comparing against every vector is instant anyway).
   ===================================================================== */
(function (root) {
  'use strict';

  const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1/dist/transformers.min.js';
  const MODEL = 'Xenova/all-MiniLM-L6-v2';
  const MAX_CHUNKS = 400;          // keep embedding time reasonable for huge uploads
  let extractor = null, loading = null;
  const cache = new Map();         // chunk text → vector (re-used across questions)

  /** Download + initialise the model. onProgress(percent 0–100). */
  function load(onProgress) {
    if (extractor) return Promise.resolve(extractor);
    if (loading) return loading;
    const files = {};
    loading = (async () => {
      const t = await import(LIB);
      t.env.allowLocalModels = false;
      extractor = await t.pipeline('feature-extraction', MODEL, {
        progress_callback: (p) => {
          if (p.status === 'progress' && p.file && p.total) {
            files[p.file] = [p.loaded, p.total];
            const sum = Object.values(files).reduce((a, f) => [a[0] + f[0], a[1] + f[1]], [0, 0]);
            if (onProgress) onProgress(Math.round((sum[0] / sum[1]) * 100));
          }
        }
      });
      return extractor;
    })().catch((e) => { loading = null; throw e; });
    return loading;
  }

  async function embed(texts) {
    const todo = texts.filter((t) => !cache.has(t));
    for (let i = 0; i < todo.length; i += 16) {
      const batch = todo.slice(i, i + 16);
      const out = await extractor(batch, { pooling: 'mean', normalize: true });
      const rows = out.tolist();
      batch.forEach((t, j) => cache.set(t, rows[j]));
    }
    return texts.map((t) => cache.get(t));
  }
  // Vectors are normalised, so the dot product IS the cosine similarity.
  const cosine = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

  /** Rank chunks by meaning. Returns [{chunk, score}] best first. */
  async function search(query, chunks, k) {
    const list = chunks.slice(0, MAX_CHUNKS);
    const [q] = await embed([query]);
    const vecs = await embed(list.map((c) => c.text));
    return list.map((c, i) => ({ chunk: c, score: cosine(q, vecs[i]) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k || 3);
  }

  root.Semantic = { load: load, ready: () => !!extractor, search: search, MODEL: MODEL, MAX_CHUNKS: MAX_CHUNKS };
})(window);
