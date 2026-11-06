/* =====================================================================
   ChunkLab — Knowledge check
   One question at a time · select → submit → feedback + explanation →
   next · score tracking · final screen with review · retake.
   ===================================================================== */
(function () {
  'use strict';

  const QUESTIONS = [
    {
      q: 'A team loads a 300-page manual into their RAG app as ONE single block of text. What is the main problem?',
      options: [
        'The embedding becomes too accurate to compare.',
        'It can exceed model and embedding input limits, and retrieval cannot pinpoint the one relevant passage.',
        'Language models cannot read text that comes from PDFs.',
        'There is no problem — bigger context always gives better answers.'
      ],
      answer: 1,
      why: 'RAG works by retrieving small, relevant pieces. One giant block may not fit the model\'s context window or the embedding model\'s token limit, and even if it fits, the useful sentence is buried in noise. Chunking creates searchable units.'
    },
    {
      q: 'You set chunk size to 5 words. A student asks, "What happens if my attendance is below 65%?" What is the most likely problem?',
      options: [
        'Each chunk contains too much unrelated information.',
        'The vector database rejects chunks shorter than 10 words.',
        'The rule is spread over several tiny chunks, so a retrieved chunk lacks its full meaning.',
        'Nothing — smaller chunks are always more accurate.'
      ],
      answer: 2,
      why: '"Students with attendance below 65% are not eligible…" is 16 words long. At 5 words per chunk it is split into 4 pieces; a chunk like "not eligible for the examination" no longer says who it applies to. Too-small chunks lose context.'
    },
    {
      q: 'Why would an engineer add a 50-token overlap between 500-token chunks?',
      options: [
        'So an idea that crosses a chunk boundary still appears complete in at least one chunk.',
        'To make every chunk completely unique.',
        'To reduce the amount of text that has to be stored.',
        'To make the language model write longer answers.'
      ],
      answer: 0,
      why: 'Overlap repeats the end of one chunk at the start of the next, acting as a bridge across boundaries. The cost is redundancy: more stored text and more embeddings — not less.'
    },
    {
      q: 'Your embedding model accepts at most 512 tokens. You chunk your documents at 512 WORDS. What could go wrong?',
      options: [
        'Nothing — words and tokens are the same unit.',
        'The chunks will be far too short to be useful.',
        'Token limits only apply to images, not text.',
        '512 words is usually more than 512 tokens, so chunks may be cut off (truncated) or rejected.'
      ],
      answer: 3,
      why: 'Models count tokens, not words. In English one word is about 1.3 tokens on average, so 512 words ≈ 680 tokens — over the limit. The end of each chunk could be silently truncated. Production chunkers measure size with the model\'s tokenizer.'
    },
    {
      q: 'The rule "Late submissions are accepted for up to 48 hours … with a penalty of 10%" is split: Chunk 7 ends "…for up to 48" and Chunk 8 starts "hours after the deadline with a penalty…". What can happen?',
      options: [
        'The system automatically merges the two chunks back together.',
        'Retrieval may return only one half, so the bot gives an incomplete or wrong answer — for example, missing the penalty.',
        'The language model refuses to answer.',
        'Both halves are always retrieved together because they are neighbours.'
      ],
      answer: 1,
      why: 'Chunks are retrieved independently. Nothing guarantees the neighbour is retrieved too. Sentence-aware chunking or overlap reduces this risk — you saw this in the RAG simulation with "Poor: fixed · 8 / 0".'
    },
    {
      q: 'You are chunking a help-center FAQ where each question and its answer take 2–3 sentences. What is the best starting point?',
      options: [
        'Fixed 3-word chunks, so every chunk is very focused.',
        'The whole FAQ as one chunk, so nothing is ever split.',
        'Structure-aware chunks that keep each question with its answer — then test with real user questions.',
        'Random chunk sizes so the retriever sees variety.'
      ],
      answer: 2,
      why: 'Match the chunking to the document\'s natural structure: a Q&A pair is a self-contained unit of meaning. Then validate with real queries — there is no universal best setting, so testing is part of the job.'
    }
  ];

  const root = document.getElementById('quizRoot');
  let i = 0, score = 0, picked = null, submitted = false, history = [];
  const K = ['A', 'B', 'C', 'D'];
  const emit = (type, data) => document.dispatchEvent(new CustomEvent('chunklab', { detail: Object.assign({ type: type }, data) }));

  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function dots() {
    return '<div class="quiz__dots" aria-hidden="true">' + QUESTIONS.map((_, n) => {
      const h = history[n];
      const cls = n === i && !h ? 'is-cur' : h ? (h.correct ? 'is-right' : 'is-wrong') : '';
      return '<i class="' + cls + '"></i>';
    }).join('') + '</div>';
  }

  function renderQuestion() {
    const Q = QUESTIONS[i];
    root.innerHTML =
      '<div class="quiz__top">' + dots() +
        '<span class="quiz__score">Question ' + (i + 1) + ' / ' + QUESTIONS.length + ' · Score ' + score + '</span></div>' +
      '<h3 class="quiz__q" id="qText">' + esc(Q.q) + '</h3>' +
      '<div class="quiz__opts" role="radiogroup" aria-labelledby="qText">' +
        Q.options.map((o, n) =>
          '<button class="opt" role="radio" aria-checked="false" data-opt="' + n + '"><span class="opt__k">' + K[n] + '</span><span>' + esc(o) + '</span></button>'
        ).join('') +
      '</div>' +
      '<div class="quiz__fb" aria-live="polite"></div>' +
      '<div class="quiz__nav"><button class="btn btn--primary" id="qSubmit" disabled>Submit answer</button></div>';
    picked = null; submitted = false;
  }

  function select(n) {
    if (submitted) return;
    picked = n;
    root.querySelectorAll('.opt').forEach((b) => {
      const on = Number(b.dataset.opt) === n;
      b.classList.toggle('is-selected', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    root.querySelector('#qSubmit').disabled = false;
  }

  function submit() {
    if (picked === null || submitted) return;
    submitted = true;
    const Q = QUESTIONS[i];
    const correct = picked === Q.answer;
    if (correct) score++;
    history[i] = { correct: correct, picked: picked };

    root.querySelectorAll('.opt').forEach((b) => {
      const n = Number(b.dataset.opt);
      b.disabled = true;
      b.classList.remove('is-selected');
      if (n === Q.answer) b.classList.add('is-correct');
      else if (n === picked) b.classList.add('is-wrong');
    });
    root.querySelector('.quiz__fb').innerHTML =
      '<div class="fb ' + (correct ? 'fb--good' : 'fb--warn') + '"><div><b>' +
      (correct ? 'Correct!' : 'Not quite — the answer is ' + K[Q.answer] + '.') + '</b> ' + esc(Q.why) + '</div></div>';
    root.querySelector('.quiz__score').textContent = 'Question ' + (i + 1) + ' / ' + QUESTIONS.length + ' · Score ' + score;
    root.querySelector('.quiz__dots').outerHTML = dots();
    const last = i === QUESTIONS.length - 1;
    root.querySelector('.quiz__nav').innerHTML = '<button class="btn btn--primary" id="qNext">' + (last ? 'See my results' : 'Next question →') + '</button>';
    root.querySelector('#qNext').focus();
    emit('quiz-answer', { correct: correct, i: i, anchor: root.querySelector('.opt.is-correct') });
  }

  function next() {
    if (i < QUESTIONS.length - 1) { i++; renderQuestion(); root.querySelector('.opt').focus(); }
    else finish();
  }

  function finish() {
    const pct = Math.round((score / QUESTIONS.length) * 100);
    const msg = pct === 100 ? 'Perfect — you can reason about chunking like an engineer.'
      : pct >= 67 ? 'Strong understanding. Review the questions you missed below.'
      : 'Good start. Revisit "Chunk size & overlap" and the Lab, then retake the quiz.';
    root.innerHTML =
      '<div class="quiz-result">' +
        '<p class="label">Your result</p>' +
        '<div class="quiz-result__score">' + score + '<small> / ' + QUESTIONS.length + '</small></div>' +
        '<p>' + msg + '</p>' +
        '<ul class="quiz-review">' + QUESTIONS.map((Q, n) =>
          '<li class="' + (history[n] && history[n].correct ? '' : 'is-wrong') + '"><span><b>Q' + (n + 1) + '.</b> ' + esc(Q.q) +
          '<br><span class="muted small">Answer: ' + esc(Q.options[Q.answer]) + '</span></span></li>'
        ).join('') + '</ul>' +
        '<div class="btn-row" style="justify-content:center"><button class="btn btn--ghost" id="qRetake">↻ Retake quiz</button>' +
        '<a class="btn btn--primary" href="#applications">Continue to real-world apps →</a></div>' +
      '</div>';
    if (window.Progress) {
      window.Progress.setMeta('quiz', { score: score, total: QUESTIONS.length });
      window.Progress.markDone('quiz');
    }
    emit('quiz-finish', { score: score, total: QUESTIONS.length });
  }

  function retake() { i = 0; score = 0; history = []; renderQuestion(); root.querySelector('.opt').focus(); }

  root.addEventListener('click', (e) => {
    const o = e.target.closest('.opt');
    if (o) return select(Number(o.dataset.opt));
    if (e.target.closest('#qSubmit')) return submit();
    if (e.target.closest('#qNext')) return next();
    if (e.target.closest('#qRetake')) return retake();
  });
  // Arrow keys move between options (radio-group behaviour).
  root.addEventListener('keydown', (e) => {
    const o = e.target.closest('.opt');
    if (!o || submitted || !['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    const n = (Number(o.dataset.opt) + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : 3)) % 4;
    const b = root.querySelector('[data-opt="' + n + '"]');
    b.focus(); select(n);
  });

  window.Quiz = { QUESTIONS: QUESTIONS, init: renderQuestion };
})();
