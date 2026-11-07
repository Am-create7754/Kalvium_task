/* =====================================================================
   PRISM — Learning-science layer
   ---------------------------------------------------------------------
   • Predict → check: the learner commits to a prediction BEFORE playing
     with a demo; the answer is computed by the real engine, not typed in.
   • Quick checks: one retrieval-practice question at the end of modules.
   • Glossary: first use of each jargon term gets a tap/hover definition.
   ===================================================================== */
(function () {
  'use strict';
  const E = window.ChunkEngine, R = window.Retriever, C = window.ChunkContent;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const emit = (type, data) => document.dispatchEvent(new CustomEvent('chunklab', { detail: Object.assign({ type: type }, data) }));
  const paras = (t) => t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  // ---------------- Predict → check (answers computed live) ----------------
  function predictions() {
    const sizeText = paras(C.HANDBOOK).slice(0, 2).join('\n\n');
    const n24 = E.chunkText(sizeText, { strategy: 'fixed', size: 24, overlap: 0 }).chunks.length;
    const n12 = E.chunkText(sizeText, { strategy: 'fixed', size: 12, overlap: 0 }).chunks.length;
    const para = paras(C.HANDBOOK)[0];
    const o0 = E.chunkText(para, { strategy: 'fixed', size: 14, overlap: 0 }).chunks.length;
    const o5 = E.chunkText(para, { strategy: 'fixed', size: 14, overlap: 5 }).chunks.length;
    const frag = R.retrieve(C.HANDBOOK, 'What is the minimum attendance required?', { strategy: 'fixed', size: 8, overlap: 0 }, 3).fragmentation;
    return {
      size: {
        q: 'At <b>24 words</b> per chunk, the attendance and exam rules make <b>' + n24 + ' chunks</b>. If you halve the size to <b>12 words</b>, how many chunks do you expect?',
        options: ['About ' + Math.round(n24 / 2) + ' (half as many)', 'About ' + n24 + ' (the same)', 'About ' + n24 * 2 + ' (twice as many)'],
        answer: 2,
        why: 'The engine makes <b>' + n12 + ' chunks</b> at 12 words. Halving the chunk size roughly doubles the number of chunks, which also means twice as many embeddings to compute and store. Now drag the dial below and watch it happen.'
      },
      overlap: {
        q: 'Chunks of <b>14 words</b> with no overlap give <b>' + o0 + ' chunks</b> for this paragraph. What happens if you add <b>5 words of overlap</b>?',
        options: ['Fewer chunks', 'The same number of chunks', 'More chunks'],
        answer: o5 > o0 ? 2 : o5 < o0 ? 0 : 1,
        why: 'You get <b>' + o5 + ' chunks</b>. With overlap, each new chunk starts only 14 − 5 = <b>9 words</b> after the previous one, so it takes more chunks to cover the same text. That is the price of continuity.'
      },
      rag: {
        q: 'Before you start: if the handbook is cut into tiny <b>8-word fixed chunks</b>, will the 75% attendance rule still sit <b>whole</b> inside one chunk?',
        options: ['Yes, retrieval will find the whole rule', 'No, the rule will be split across chunks'],
        answer: frag && !frag.intactInAnyChunk ? 1 : 0,
        why: 'The engine splits that sentence across <b>' + (frag ? frag.spansChunks.length : '?') + ' chunks</b>, so no single chunk holds the whole rule. Try it: pick <b>Poor: fixed · 8 / 0</b> and ask about attendance.'
      }
    };
  }

  // ---------------- Quick checks (retrieval practice) ----------------
  const CHECKS = {
    problem: {
      q: 'A student asks the campus chatbot a question. Which of these happens <b>first</b>?',
      options: ['The language model writes an answer', 'The system retrieves the most relevant chunks', 'The handbook is chunked again from scratch', 'The question is stored in the vector database'],
      answer: 1,
      why: 'RAG <b>retrieves, then generates</b>. Chunking and embedding happen earlier, once, when the handbook is first added (that step is called <i>indexing</i>). They are not repeated for every question.'
    },
    chunking: {
      q: 'Which chunk would be <b>most useful</b> if it were retrieved on its own?',
      options: ['“…and a late fee of Rs 500.”', '“Late registration is allowed only with the approval of the faculty advisor and a late fee of Rs 500.”', '“Course Registration.”', '“…the approval of the faculty”'],
      answer: 1,
      why: 'A good chunk is <b>self-contained</b>: whoever reads it understands it without its neighbours. The other options are fragments that lose what the fee is for.'
    },
    'size-overlap': {
      q: 'Your chunks are <b>200 tokens</b> with <b>50 tokens</b> of overlap. How many tokens after the previous chunk does each new chunk start?',
      options: ['50', '150', '200', '250'],
      answer: 1,
      why: 'The step is <b>S = C − O = 200 − 50 = 150</b> tokens. The last 50 tokens of each chunk are repeated at the start of the next one.'
    },
    lab: {
      q: 'Switching from fixed-size to sentence-based chunking usually…',
      options: ['removes mid-sentence cuts, but chunk sizes vary', 'makes every chunk exactly the same size', 'always creates more chunks', 'removes the need for overlap entirely'],
      answer: 0,
      why: 'Sentence-based chunking respects sentence boundaries (no cuts unless one sentence is longer than the limit), so sizes vary. You can confirm it with the <b>Fixed vs sentence</b> preset in the Compare box.'
    },
    rag: {
      q: 'For “penalty for handing in homework late”, keyword search retrieved the <b>library fine</b> chunk. What is the best fix in a real system?',
      options: ['Make every chunk much bigger', 'Use embeddings so retrieval matches meaning, not exact words', 'Remove all overlap', 'Let the language model guess without context'],
      answer: 1,
      why: 'The words “penalty” and “due date” appear in the wrong chunk, but the <b>meaning</b> matches the assignment rule. Embedding-based (semantic) retrieval fixes this. Load the real model above and see it happen.'
    }
  };

  function renderMCQ(el, item, kind, id) {
    const K = ['A', 'B', 'C', 'D'];
    el.innerHTML =
      '<p class="label">' + (kind === 'predict' ? '🔮 Predict first' : '✅ Quick check') + '</p>' +
      '<p class="mcq__q">' + item.q + '</p>' +
      '<div class="mcq__opts" role="group">' + item.options.map((o, i) =>
        '<button type="button" class="mcq__opt" data-i="' + i + '"><span class="opt__k">' + K[i] + '</span><span>' + esc(o) + '</span></button>').join('') + '</div>' +
      '<div class="mcq__fb" aria-live="polite"></div>';
    el.addEventListener('click', (e) => {
      const b = e.target.closest('.mcq__opt');
      if (!b || el.dataset.done) return;
      el.dataset.done = '1';
      const pick = Number(b.dataset.i), ok = pick === item.answer;
      $$('.mcq__opt', el).forEach((x, i) => {
        x.disabled = true;
        x.classList.toggle('is-correct', i === item.answer);
        x.classList.toggle('is-wrong', i === pick && !ok);
      });
      $('.mcq__fb', el).innerHTML = '<div class="fb ' + (ok ? 'fb--good' : 'fb--warn') + '"><div><b>' +
        (kind === 'predict' ? (ok ? 'Good prediction!' : 'Interesting guess. Here is what really happens:') : (ok ? 'Correct!' : 'Not quite.')) +
        '</b> ' + item.why + '</div></div>';
      emit(kind === 'predict' ? 'predict' : 'quick-check', { id: id, correct: ok, anchor: b });
    });
  }

  // ---------------- Glossary (first mention of each term) ----------------
  const GLOSSARY = [
    ['Retrieval-Augmented Generation', 'An AI app design that first retrieves relevant pieces of your documents, then lets a language model answer using them.'],
    ['language model', 'An AI model (an LLM, such as the one behind ChatGPT) that reads text and generates text.'],
    ['context window', 'The maximum amount of text, counted in tokens, that a model can read at once.'],
    ['tokens', 'The small units of text a model actually reads: often a whole word, sometimes part of a word or a symbol.'],
    ['embedding', 'A list of numbers that represents the meaning of a piece of text. Texts with similar meaning get similar numbers.'],
    ['vector database', 'A database that stores embeddings and quickly finds the ones closest to a question\'s embedding.'],
    ['TF-IDF', 'Term frequency × inverse document frequency: a classic keyword score where words that are rare across chunks count more.'],
    ['cosine similarity', 'A score from −1 to 1 measuring how closely two embeddings point in the same direction, i.e. how similar their meanings are.'],
    ['tokenizer', 'The program that splits text into tokens. Each model family has its own.'],
    ['indexing', 'The one-time preparation step: extract, clean, chunk, embed and store a document so it can be searched later.']
  ];
  function glossary() {
    const tip = document.createElement('div');
    tip.className = 'gloss-tip'; tip.id = 'glossTip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
    document.body.appendChild(tip);
    const SKIP = 'button, a, label, code, pre, h1, h2, h3, h4, .gloss, .chat, .mcq, .quiz, .label, .tok-view, .chunk-card, .row-chunk, textarea, .seg, .chip, summary';
    GLOSSARY.forEach(([term, def]) => {
      const re = new RegExp('\\b(' + term.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&') + ')\\b', 'i');
      const walker = document.createTreeWalker($('main'), NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => (n.parentElement && !n.parentElement.closest(SKIP) && n.parentElement.closest('p, li') && re.test(n.nodeValue)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
      });
      const node = walker.nextNode();
      if (!node) return;
      const m = re.exec(node.nodeValue);
      const after = node.splitText(m.index);
      after.nodeValue = after.nodeValue.slice(m[0].length);
      const g = document.createElement('span');
      g.className = 'gloss'; g.tabIndex = 0; g.textContent = m[0];
      g.setAttribute('role', 'button'); g.setAttribute('aria-describedby', 'glossTip'); g.dataset.def = def;
      node.parentNode.insertBefore(g, after);
    });
    let current = null;
    const show = (g) => {
      current = g;
      tip.innerHTML = '<b>' + esc(g.textContent) + '</b> ' + esc(g.dataset.def);
      tip.hidden = false;
      const r = g.getBoundingClientRect(), w = Math.min(300, innerWidth - 24);
      tip.style.width = w + 'px';
      const left = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2));
      tip.style.left = left + 'px';
      const top = r.top - tip.offsetHeight - 10;
      tip.style.top = (top > 70 ? top : r.bottom + 10) + 'px';
    };
    const hide = () => { tip.hidden = true; current = null; };
    document.addEventListener('mouseover', (e) => { const g = e.target.closest('.gloss'); if (g) show(g); });
    document.addEventListener('mouseout', (e) => { if (e.target.closest('.gloss')) hide(); });
    document.addEventListener('focusin', (e) => { const g = e.target.closest('.gloss'); if (g) show(g); });
    document.addEventListener('focusout', (e) => { if (e.target.closest('.gloss')) hide(); });
    document.addEventListener('click', (e) => { const g = e.target.closest('.gloss'); if (g) { if (current === g) hide(); else show(g); } else if (current) hide(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); if ((e.key === 'Enter' || e.key === ' ') && document.activeElement.classList.contains('gloss')) { e.preventDefault(); show(document.activeElement); } });
    addEventListener('scroll', hide, { passive: true });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const P = predictions();
    $$('[data-predict]').forEach((el) => renderMCQ(el, P[el.dataset.predict], 'predict', el.dataset.predict));
    $$('[data-qcheck]').forEach((el) => renderMCQ(el, CHECKS[el.dataset.qcheck], 'check', el.dataset.qcheck));
    glossary();
  });
  window.Learn = { CHECKS: CHECKS, GLOSSARY: GLOSSARY };
})();
