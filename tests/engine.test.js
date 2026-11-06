/* Run with:  node tests/engine.test.js
   Zero dependencies — uses Node's built-in assert. */
'use strict';
const assert = require('assert');
const E = require('../js/chunking.js');
const R = require('../js/retrieval.js');
const C = require('../js/content.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('  ✓ ' + name); }
  catch (e) { console.error('  ✗ ' + name + '\n    ' + e.message); process.exitCode = 1; }
}
const words = (n) => Array.from({ length: n }, (_, i) => 'w' + (i + 1)).join(' ');

console.log('\nChunking engine');

test('empty input → no chunks', () => {
  assert.strictEqual(E.chunkText('', { size: 10, overlap: 2 }).chunks.length, 0);
  assert.strictEqual(E.chunkText('   \n\t ', { strategy: 'sentence', size: 10, overlap: 2 }).chunks.length, 0);
});

test('single word → exactly one chunk', () => {
  const r = E.chunkText('Hello', { size: 10, overlap: 3 });
  assert.strictEqual(r.chunks.length, 1);
  assert.strictEqual(r.chunks[0].text, 'Hello');
  const s = E.chunkText('Hello', { strategy: 'sentence', size: 10, overlap: 3 });
  assert.strictEqual(s.chunks.length, 1);
});

test('fixed: N=20, C=10, O=0 → 2 chunks of 10', () => {
  const r = E.chunkText(words(20), { size: 10, overlap: 0 });
  assert.deepStrictEqual(r.chunks.map((c) => [c.start, c.end]), [[0, 10], [10, 20]]);
});

test('fixed: N=20, C=10, O=3 → step 7, no redundant trailing chunk', () => {
  const r = E.chunkText(words(20), { size: 10, overlap: 3 });
  assert.deepStrictEqual(r.chunks.map((c) => [c.start, c.end]), [[0, 10], [7, 17], [14, 20]]);
  assert.deepStrictEqual(r.chunks.map((c) => c.overlapPrev), [0, 3, 3]);
  assert.strictEqual(r.stats.redundantWords, 6);
});

test('fixed: chunk ending exactly at N stops the loop', () => {
  const r = E.chunkText(words(17), { size: 10, overlap: 3 });
  assert.deepStrictEqual(r.chunks.map((c) => [c.start, c.end]), [[0, 10], [7, 17]]);
});

test('fixed: overlap ≥ size is clamped to size-1 (no infinite loop)', () => {
  const r = E.chunkText(words(12), { size: 5, overlap: 99 });
  assert.strictEqual(r.settings.overlap, 4);
  assert.strictEqual(r.chunks.length, 8);   // starts 0..7, last ends at 12
});

test('fixed: invalid numbers sanitised', () => {
  const r = E.chunkText(words(5), { size: 'abc', overlap: -4 });
  assert.strictEqual(r.settings.size, 1);
  assert.strictEqual(r.settings.overlap, 0);
  assert.strictEqual(r.chunks.length, 5);
});

test('every word is covered and no chunk is empty', () => {
  [[3, 0], [7, 2], [10, 9], [50, 10]].forEach(([s, o]) => {
    ['fixed', 'sentence'].forEach((strategy) => {
      const r = E.chunkText(C.HANDBOOK, { strategy, size: s, overlap: o });
      assert.ok(r.chunks.every((c) => c.wordCount > 0), 'empty chunk');
      assert.strictEqual(r.chunks[0].start, 0);
      assert.strictEqual(r.chunks[r.chunks.length - 1].end, r.words.length);
      for (let i = 1; i < r.chunks.length; i++) {
        assert.ok(r.chunks[i].start <= r.chunks[i - 1].end, 'gap between chunks');
        assert.ok(r.chunks[i].start > r.chunks[i - 1].start, 'no progress');
      }
    });
  });
});

test('stats match generated output', () => {
  const r = E.chunkText(C.LAB_SAMPLE, { size: 25, overlap: 5 });
  const sum = r.chunks.reduce((a, c) => a + c.wordCount, 0);
  assert.strictEqual(r.stats.totalStoredWords, sum);
  assert.strictEqual(r.stats.totalStoredWords - r.stats.redundantWords, r.stats.totalWords);
  assert.ok(Math.abs(r.stats.avgChunkSize - sum / r.chunks.length) < 1e-9);
});

console.log('\nSentence-based chunking');

test('sentences are never split when they fit', () => {
  const text = 'One two three. Four five six. Seven eight nine. Ten eleven twelve.';
  const r = E.chunkText(text, { strategy: 'sentence', size: 7, overlap: 0 });
  assert.deepStrictEqual(r.chunks.map((c) => c.text),
    ['One two three. Four five six.', 'Seven eight nine. Ten eleven twelve.']);
  assert.ok(r.chunks.every((c) => !c.endsMidSentence));
});

test('sentence overlap carries whole trailing sentences', () => {
  const text = 'A b c. D e f. G h i. J k l.';
  const r = E.chunkText(text, { strategy: 'sentence', size: 6, overlap: 3 });
  assert.deepStrictEqual(r.chunks.map((c) => c.text), ['A b c. D e f.', 'D e f. G h i.', 'G h i. J k l.']);
  assert.deepStrictEqual(r.chunks.map((c) => c.overlapPrev), [0, 3, 3]);
});

test('oversized sentence is split into fixed windows', () => {
  const r = E.chunkText('Short one. ' + words(12) + '.', { strategy: 'sentence', size: 5, overlap: 0 });
  assert.strictEqual(r.chunks[0].text, 'Short one.');
  assert.ok(r.chunks.slice(1).every((c) => c.wordCount <= 5));
  assert.strictEqual(r.chunks[r.chunks.length - 1].end, r.words.length);
});

test('text without final punctuation still chunks', () => {
  const r = E.chunkText('no punctuation at all here', { strategy: 'sentence', size: 10, overlap: 2 });
  assert.strictEqual(r.chunks.length, 1);
});

test('sentence chunking on handbook keeps every chunk sentence-aligned', () => {
  const r = E.chunkText(C.HANDBOOK, { strategy: 'sentence', size: 60, overlap: 0 });
  assert.strictEqual(r.stats.midSentenceBreaks, 0);
});

test('sentence chunks never cross a paragraph break', () => {
  const r = E.chunkText(C.CHALLENGE_DOC, { strategy: 'sentence', size: 60, overlap: 10 });
  const topic = [];
  C.CHALLENGE_DOC.split(/\n\s*\n/).forEach((p, i) => E.toWords(p).forEach(() => topic.push(i)));
  assert.ok(r.chunks.every((c) => topic[c.start] === topic[c.end - 1]));
  assert.strictEqual(r.chunks.length, 4);
});

test('challenge: sentence-based settings pass all 3 retrieval tests', () => {
  const opts = { strategy: 'sentence', size: 25, overlap: 0 };
  C.CHALLENGE_TESTS.forEach((t) => {
    const r = R.retrieve(C.CHALLENGE_DOC, t.q, opts, 3);
    assert.ok(r.results[0].chunk.text.includes(t.answer), t.q);
  });
});

console.log('\nRetrieval simulation');

test('attendance question retrieves the 75% sentence', () => {
  const r = R.retrieve(C.HANDBOOK, 'What is the minimum attendance required?', { strategy: 'sentence', size: 40, overlap: 0 });
  assert.ok(r.results.length > 0);
  assert.ok(r.results[0].chunk.text.includes('75%'));
  assert.ok(r.answer.some((a) => a.text.includes('minimum attendance of 75%')));
});

test('late assignment question retrieves the 48-hour rule', () => {
  const r = R.retrieve(C.HANDBOOK, 'Can I submit an assignment late?', { strategy: 'sentence', size: 40, overlap: 0 });
  assert.ok(r.results[0].chunk.text.includes('48 hours'));
});

test('library timings question uses visible synonym expansion', () => {
  const r = R.retrieve(C.HANDBOOK, 'What are the library timings?', { strategy: 'sentence', size: 40, overlap: 0 });
  assert.ok(r.terms.expanded.some((e) => e.term === 'hour' || e.term === 'open'));
  assert.ok(r.results[0].chunk.text.includes('8:00 AM'));
});

test('books + credits questions', () => {
  const b = R.retrieve(C.HANDBOOK, 'How many books can I borrow?', { strategy: 'sentence', size: 40, overlap: 0 });
  assert.ok(b.results[0].chunk.text.includes('up to 4 books'));
  const c = R.retrieve(C.HANDBOOK, 'How many credits must I register for?', { strategy: 'sentence', size: 40, overlap: 0 });
  assert.ok(c.results[0].chunk.text.includes('16 credits'));
});

test('tiny fixed chunks fragment the answer sentence', () => {
  const r = R.retrieve(C.HANDBOOK, 'What is the minimum attendance required?', { strategy: 'fixed', size: 8, overlap: 0 });
  assert.strictEqual(r.fragmentation.intactInAnyChunk, false);
  assert.ok(r.fragmentation.spansChunks.length >= 2);
});

test('stopword-only / empty query → no results, no crash', () => {
  assert.strictEqual(R.retrieve(C.HANDBOOK, 'what is the', { size: 40, overlap: 0 }).results.length, 0);
  assert.strictEqual(R.retrieve(C.HANDBOOK, '', { size: 40, overlap: 0 }).results.length, 0);
  assert.strictEqual(R.retrieve('', 'attendance', { size: 40, overlap: 0 }).results.length, 0);
});

test('challenge test answers exist verbatim in the challenge document', () => {
  C.CHALLENGE_TESTS.forEach((t) => assert.ok(C.CHALLENGE_DOC.includes(t.answer), t.answer));
});

console.log('\n' + passed + ' tests passed' + (process.exitCode ? ' — SOME FAILED' : '') + '\n');
