# PRISM — Testing checklist

Automated: `node tests/engine.test.js` → **35 tests passed**. `node tests/python_parity.js` → **30/30** generated-Python combinations identical to the JS engine.
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

### Bring-your-own-document checks
| # | Check | How to verify | Result |
|---|---|---|---|
| 21 | TXT upload | `samples/photosynthesis_notes.txt`: 105 words, wrapped lines joined | ✅ |
| 22 | HTML upload | `samples/return_policy.html`: script, nav and footer removed; headings kept as sentences | ✅ |
| 23 | DOCX upload | `samples/sunrise_cafe_faq.docx`: 134 words, chunked in the Lab | ✅ |
| 24 | PDF upload | `samples/greenleaf_member_guide.pdf`: 2 pages, 2 page numbers removed, 1 hyphen repaired, 6 paragraphs rebuilt | ✅ |
| 25 | Drag & drop | Dropping a file on the Lab editor or the RAG "Choose a document" card loads it | ✅ |
| 26 | RAG on own document | Guests / printing / deposit / weekend-hours questions retrieve the right sentences; "Poor 8/0" fragments them | ✅ |
| 27 | Suggested topics | Chips are generated from the document's most frequent keywords | ✅ |
| 28 | Error handling | `.xyz` → "Unsupported file type"; asking with no document → prompt to load one; empty paste → warning | ✅ |
| 29 | Use Lab text / back to sample | Lab text loads into RAG; switching back restores the 5 sample questions | ✅ |
| 30 | Large documents | 50,000-word cap with notice; Lab shows the first 200 chunk cards and the first 4,000 map words; stats include everything | ✅ |

### Language & error checks
| # | Check | How to verify | Result |
|---|---|---|---|
| 39 | Hindi document | `samples/hostel_notice_hindi.txt`: 5 chunks, 0 mid-sentence cuts; library / books / gate questions retrieve the right sentence; topic chips shown in Hindi | ✅ |
| 40 | Accents | "cafe" finds "café" | ✅ |
| 41 | Password-protected PDF | `tests/fixtures/locked.pdf` → clear "password-protected" message | ✅ |
| 42 | Damaged PDF | `tests/fixtures/broken.pdf` → "does not look like a valid PDF" message | ✅ |

### Depth features
| # | Check | How to verify | Result |
|---|---|---|---|
| 43 | Real tokenizer | Size & Overlap meter loads cl100k_base on scroll; "condonation" splits into several tokens | ✅ |
| 44 | Token chunking | Lab → Tokens · GPT: 156 tokens for the 133-word sample, exact windows, token pills, mid-word cut counter, Token Tamer badge | ✅ |
| 45 | Real semantic search | Load model (~7 s on broadband); 4 paraphrase questions; keyword vs semantic columns; "homework penalty" retrieves the late-submission rule semantically | ✅ |
| 46 | Predict → check | 3 predictions; answers computed by the engine (e.g. 24→12 words: 6 → 11 chunks) | ✅ |
| 47 | Quick checks + recaps | 5 modules end with a Remember card and a question; feedback and +5 XP on first correct answer | ✅ |
| 48 | Glossary | First mention of 9 terms gets a definition on hover, focus or tap | ✅ |
| 49 | Export | JSON download with settings, stats and chunk offsets; Python panel updates with the settings | ✅ |
| 50 | Resume + cheat sheet | Returning learner sees "Continue →"; cheat sheet prints as a single page | ✅ |

### Play layer checks
| # | Check | How to verify | Result |
|---|---|---|---|
| 31 | Mascot | Greets each module once, shows a new tip when tapped, reacts with the right mood (sad on wrong answers, happy on right ones, shocked on fragmentation) | ✅ |
| 32 | Badges | Earned only by the matching action; each shows a pop-up once; the shelf in the lesson map and completion card updates | ✅ |
| 33 | XP & levels | +20 per module, +10 per first-time correct quiz answer (no farming on retake), +25 per badge; level-up pop-up | ✅ |
| 34 | Animations | Paragraph slices into cards, pipeline play visits all 7 stages, score bars for every chunk, count-up stats | ✅ |
| 35 | Celebration | Completing every module: Champion badge, confetti rain, mascot cheer | ✅ |
| 36 | Calm mode | Toggle removes the mascot and all keyframe animation; the preference persists; reduced-motion users start in calm mode | ✅ |
| 37 | Reset | "Reset my progress" also resets XP and badges | ✅ |
| 38 | Mobile | Top bar (XP, progress, menu) fits at 375px; mascot shrinks | ✅ |

### Content integrity
- Every illustrative answer in the RAG simulation is copied word-for-word from `HANDBOOK` in `js/content.js`.
- Every challenge test answer exists verbatim in `CHALLENGE_DOC` (unit-tested).
- Quiz facts were checked against the engine. Example: the 65% rule is 16 words, so 5-word chunks split it into 4 pieces.
