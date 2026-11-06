# ChunkLab — Testing checklist

Automated: `node tests/engine.test.js` → **23 tests passed**.
Manual checks were run in Chromium at 1280×800 (desktop) and 375×812 (mobile).

| # | Check | How to verify | Result |
|---|---|---|---|
| 1 | All navigation links work | Click each top-nav item, lesson-map entry, timeline segment, and Prev / Next | ✅ |
| 2 | All buttons perform their action | Every button in every module (no placeholders) | ✅ |
| 3 | Chunk size slider updates | Lab: drag size; value, formula, output and "What changed" update | ✅ |
| 4 | Overlap slider updates | Lab: drag overlap; coral highlights and redundant count change | ✅ |
| 5 | Overlap ≤ size − 1 | Set size 5 → overlap max becomes 4; programmatic 99 is clamped to 4 | ✅ |
| 6 | Empty input handled | Lab → Clear: friendly message, all stats 0, no errors | ✅ |
| 7 | Single word handled | Type `Hello` → exactly 1 chunk | ✅ |
| 8 | Very short documents | 1 sentence → 1 chunk + "fits in one chunk" feedback | ✅ |
| 9 | Sentence-based chunking works | 0 mid-sentence cuts unless a sentence exceeds the size; never crosses paragraphs | ✅ |
| 10 | No empty chunks | Unit test across strategies and sizes | ✅ |
| 11 | Statistics accurate | Stored words − redundant words = total words (unit test + UI spot check: 133 + 32 = 9 × 18.3) | ✅ |
| 12 | Overlap highlighted correctly | Coral prefix length = overlap with previous chunk | ✅ |
| 13 | Configuration comparison | Presets (overlap / size / strategy) and manual controls update both sides + explanation | ✅ |
| 14 | Retrieval relevance | All 5 sample questions retrieve the correct handbook rule (unit-tested) | ✅ |
| 15 | Quiz scoring | 6/6 when all correct; retake resets score to 0 | ✅ |
| 16 | Feedback explanations | Shown after every quiz answer, in the Lab, Compare and Challenge | ✅ |
| 17 | Progress tracking | "Done · Next" marks modules; % ring, bar, timeline, map, completion card update; persists after reload | ✅ |
| 18 | Responsive layout | Desktop, tablet (≤960px), phone (≤640px); no horizontal page scroll | ✅ |
| 19 | No console errors | Browser console checked after a full run-through | ✅ |
| 20 | No API keys / backend | Works from `file://` and any static server | ✅ |

### Content integrity
- Every illustrative answer in the RAG simulation is copied word-for-word from `HANDBOOK` in `js/content.js`.
- Every challenge test answer exists verbatim in `CHALLENGE_DOC` (unit-tested).
- Quiz facts were checked against the engine. Example: the 65% rule is 16 words, so 5-word chunks split it into 4 pieces.
