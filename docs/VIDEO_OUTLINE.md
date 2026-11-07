# PRISM — Explanation video script (≈ 7 minutes)

Live site: https://am-create7754.github.io/Kalvium_task/ · Repo: https://github.com/Am-create7754/Kalvium_task

**How to use this:** each part has **🎬 what to show** and **🎙 what to say**. Don't read word-for-word. Glance, then say it in your own words. The six questions Kalvium asks are marked **Q1–Q6**.

---

## Before you press record (10 minutes of prep)

1. **Fresh state:** open the live site → ☰ **Lesson map** → **Reset my progress**. XP starts at 0, so badges unlock on camera.
2. **Warm the AI model:** go to **RAG sim**, ask any question, and press **⚡ Load real embedding model** once. The browser caches it, so it loads in about 1 second during the recording. Then reset progress again.
3. **Screen:** Chrome, full screen (F11), zoom 100–110%, 1920×1080 if possible. Close other tabs and turn on *Do Not Disturb*.
4. **Mode:** keep **Play mode** on (the mascot and transitions look good on video).
5. **Audio:** quiet room and a headphone mic; do a 10-second test first.
6. **Have open:** this script on your phone or a second screen.

---

## 0:00–0:30 · Intro

🎬 Hero page: the PRISM logo, headline and floating chunk cards.

🎙 "Hi, I'm Amber. This is **PRISM — an Interactive Chunk Playground**, a 45-minute self-paced lesson I built for Kalvium's Instructional Designer role. It teaches **text chunking and document processing for RAG**. In the next few minutes I'll explain why I picked this topic, how I broke it down, how it works, and how a student actually learns with it."

---

## 0:30–1:15 · Q1 — Why this topic?

🎬 Stay on the hero; point at the handbook → chunks illustration.

🎙 "Almost every 'chat with your documents' product, like PDF assistants, college chatbots and company search, is built on **RAG**: Retrieval-Augmented Generation. Students learn about the LLM part, but there's an invisible step **before** that which decides whether the AI can find the answer at all: **chunking**. If chunking cuts an answer in half, even the best model can only find half an answer.

I chose it for three reasons: it's **foundational** for anyone building AI apps, beginners almost never see it, and it's very **visual and experimental**. You can literally watch a document being cut, which makes it perfect for an interactive lesson."

---

## 1:15–2:15 · Q2 — How I broke down the concept

🎬 Scroll down to **"Your 45-minute journey"** (the timeline), then press **Start learning** and move through 2–3 pages with the → arrow.

🎙 "I designed it like a course player: **one idea per page**, nine modules, 45 minutes in total. You can see the time budget right here.

The structure follows a simple path: **problem → concept → mechanics → practice → application**.
- It starts with a **problem**, not a definition: a 200-page handbook and one student question.
- Then the **four words** you need: document, text extraction, chunk, chunking, each explained in one line.
- Then the two dials that control everything: **chunk size and overlap**, which get the most time.
- Then a **Lab** to experiment, a **RAG simulation** to see the impact, a **challenge**, a **quiz**, and finally **real-world applications**.

Every module follows **learn → see → do**: a short explanation, a live visual made by the real engine, then something the student controls. Each module ends with a **'Remember' card** and a quick check question, and any jargon like *context window* or *embedding* shows a definition on hover."

🎬 Hover a dotted underlined word (e.g. *context window*) to show the tooltip.

---

## 2:15–3:30 · Q3 — How the concept works (the logic)

🎬 Open **Size & overlap**. Answer the **🔮 Predict first** question (pick "twice as many"), then drag the size slider down.

🎙 "Here's the core logic. **Chunk size** is how much text goes in each piece, and **overlap** is how much text repeats between neighbouring pieces. Before playing, the student **predicts**: if I halve the chunk size, how many chunks will I get? The answer is computed live by the engine: **6 chunks become 11**. Then they verify it with the slider. That predict-then-check step is deliberate, because it makes learning stick.

Small chunks are focused but lose context; large chunks keep context but add noise. Overlap is a bridge: each new chunk starts **S = C − O** words after the previous one, so text near a boundary appears in two chunks, at the cost of storing some text twice."

🎬 Scroll to the **token meter**, where words split into coloured token blocks.

🎙 "One important technical point: models don't count **words**, they count **tokens**. This box uses the **real GPT tokenizer, cl100k_base**. You can see a rare word like *condonation* split into pieces. That's why production systems measure chunk size in tokens."

---

## 3:30–4:45 · Q4 — How the interactive elements support learning

🎬 Go to **Lab**. Press **Generate chunks**. Drag size and overlap. Click **Tokens · GPT**. Then click the **Fixed vs sentence** preset in the Compare box.

🎙 "The **Chunking Lab** is the heart of PRISM. Students edit or upload any text, including PDF, Word and HTML, and every number they see is computed from the real output: chunk count, redundant words, and how many chunks are **cut mid-sentence**.

When I change a dial, the **'What changed'** line explains the cause and effect. Overlapping words are highlighted in coral, so overlap becomes something you can see instead of an abstract idea.

In **token mode**, chunks are exact windows of real GPT tokens. You can see the tokens, and PRISM even counts chunks **cut mid-word**, a real weakness of token windows.

The **Compare** panel puts two configurations side by side: fixed-size cuts sentences, while sentence-based keeps them whole but sizes vary. The feedback **never says one setting is 'best'**. It explains trade-offs, because that's how real engineers think."

🎬 Point briefly at the XP counter / a badge pop-up.

🎙 "There's also a light game layer: XP, badges and a mascot. Badges reward **meaningful experiments**, like using overlap or finding a broken answer, not just clicks. And there's a Calm mode that turns all motion off for accessibility."

---

## 4:45–5:50 · Q5 — How a student uses it to understand and apply

🎬 Go to **RAG sim**. Click **"What is the minimum attendance required?"**. Show the steps and the answer. Then click the **Poor: fixed · 8 / 0** preset.

🎙 "Now the student connects chunking to a real AI app. They ask the campus assistant a question and watch every stage: chunking, keywords, scoring, retrieval and the answer. It's clearly labelled as a simulation; the answer is extracted, not written by an LLM.

Watch what happens with **bad chunking**: with tiny 8-word chunks, the attendance rule is **split across chunks**, and PRISM flags *'Chunking fragmented the answer.'* That's the 'aha' moment: chunking decides answer quality."

🎬 Click **Sentence · 40 / 0** again, then ask **"Is there a penalty for handing in homework after the due date?"** → scroll to **step 5** → the semantic answer.

🎙 "And here's something real: step 5 loads a **real embedding model**, all-MiniLM-L6-v2, running entirely in the browser. For this question, keyword search wrongly picks the **library fine** rule, but semantic search finds the **late submission penalty**, because it matches **meaning**, not words. That shows students exactly why production RAG uses embeddings."

🎬 Go to **Challenge**: pick Sentences, size 25, overlap 0 → **Generate & test** (3 green ticks) → type one line of reasoning → **Check my answer**.

🎙 "Then they **apply** it: in the challenge, they choose settings for a new policy document, three real student questions are tested automatically, and they must **explain their reasoning**. The feedback evaluates both the results and the reasoning. There's no single correct answer, just like real work. Finally, a 6-question quiz checks understanding with an explanation for every answer."

---

## 5:50–6:40 · Q6 — Real-world relevance

🎬 Open **Real world**. Show the 5 application cards and the architecture flow. Then go back to the Lab and click **{ } Python code** and **⬇ Export JSON**.

🎙 "Chunking is inside every document AI product: PDF Q&A, university assistants like this one, enterprise search, customer support bots, and legal and research tools. This diagram shows the full pipeline, and it's honest about what's real in PRISM, what's simulated, and what's only explained.

And students can take it straight into a real project: **Export JSON** gives the chunks in the format a pipeline stores, and **Python code** generates runnable code for their exact settings. I tested that generated Python against PRISM's engine, and it produces **identical chunks in all 30 test cases**."

---

## 6:40–7:10 · Close

🎬 Lesson map (shows progress and badges), then back to the hero.

🎙 "To sum up: PRISM turns an invisible engineering step into something students can **see, break, and reason about**, in 45 minutes, with no installs, no logins and no API keys. Everything runs in the browser, the core logic has 35 automated tests, and it's live on GitHub Pages. Thank you for watching!"

---

## Important things to keep in mind

- **Answer all six questions explicitly.** Using the words "why I chose", "how I broke it down", "the underlying logic", etc. helps evaluators tick their boxes.
- **Be honest about the simulation.** Say clearly that the RAG answer is extracted, not written by an LLM; this shows technical integrity. The embedding model and tokenizer *are* real.
- **Show, don't list.** Every claim should be on screen while you say it.
- **Explain the instructional design, not just the features:** problem-first, one idea per page, learn → see → do, predict → check, retrieval practice, trade-offs not verdicts.
- **Speak slowly and move the mouse slowly.** Pause half a second after each click so the transition finishes.
- **Keep it under ~8 minutes.** Cut the badge or Hindi bits if you run long.
- **Numbers you can quote safely:** 45 minutes · 9 modules · 133 words = 156 real tokens · 6 → 11 chunks when size halves · 12 badges · 35 unit tests · 30/30 Python parity · 23 MB embedding model with 384-number vectors.
- **Things to avoid saying:** "the AI writes the answer" (it doesn't), "uses a vector database" (it's an in-memory comparison), "works for every language" (spaceless languages like Chinese aren't supported).

## Final submission checklist

- [ ] Video recorded, watched once end-to-end, audio clear
- [ ] Live link opens on phone and laptop (hard refresh with Ctrl+F5)
- [ ] GitHub repo is **public**: https://github.com/Am-create7754/Kalvium_task
- [ ] Form: repo link + live link + video link, all double-checked (the form is one-shot)
