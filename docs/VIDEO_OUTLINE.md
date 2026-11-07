# PRISM — Video guide: speak from your own understanding

Live site: https://am-create7754.github.io/Kalvium_task/ · Repo: https://github.com/Am-create7754/Kalvium_task

> **Important:** this is **not a script to read**. Kalvium wants to hear *your* understanding.
> For every part you get **💬 points to cover**: say them in your own words, the way you'd explain to a friend.
> The **🗣 "if you get stuck"** lines are simple examples only. Don't memorise them.

---

## Step 1 — Understand it first (read this 2–3 times, then close it)

If you can explain these six ideas without looking, the video will come out naturally.

**1. What is RAG?**
An AI chatbot doesn't know what's inside *your* college handbook. So before answering, the app first **searches the handbook for the right part**, then gives only that part to the AI to answer from.
*Analogy:* an open-book exam. You don't read the whole book for every question; you flip to the right page.

**2. What is chunking?**
To search a big document, we first **cut it into small pieces** called chunks. The search then picks the best pieces.
*Analogy:* tearing a long notebook into flashcards, so you can pick out the one card you need.

**3. Why does chunking matter so much?**
The search can only return pieces that exist. If a rule like "you need 75% attendance" gets **cut in half** between two pieces, the chatbot only finds half the rule and can give a wrong answer.
*So:* bad cutting = bad answers, no matter how smart the AI is.

**4. Chunk size**
How big each piece is.
- Small pieces = very focused, but they can lose meaning (half a sentence).
- Big pieces = more complete, but they carry extra unrelated stuff.
*Analogy:* cutting a pizza into 50 tiny bites vs 2 huge halves; neither is good to share.

**5. Overlap**
Repeating a few words from the end of one piece at the start of the next, like a bridge, so an idea at the cutting point isn't lost. The cost is that some text gets stored twice.
*Simple math:* if a piece is 20 words and overlap is 4, the next piece starts 16 words later (20 − 4).

**6. Words vs tokens, and keyword vs meaning search**
- AI models don't read words; they read **tokens**, which are small bits of words. Rare words get broken into several tokens. That's why real systems measure chunk size in tokens.
- Keyword search matches **exact words**. "Meaning" search (embeddings) turns text into numbers that capture meaning, so "homework submitted late" can match "late submission penalty" even though the words differ.

---

## Step 2 — Prep before recording (10 minutes)

1. Open the live site → ☰ **Lesson map** → **Reset my progress** (so badges unlock on camera).
2. In **RAG sim**, press **⚡ Load real embedding model** once, so it loads instantly during the video. Then reset progress again.
3. Use Chrome full screen (F11), close other tabs, turn on Do Not Disturb, and use a headphone mic.
4. Do one practice run without recording. Talk freely; don't read.

---

## Step 3 — The video, part by part (about 7 minutes)

### Intro (≈30 sec)
🎬 **Show:** the home page.
💬 **Cover:** your name · what PRISM is (a 45-minute lesson that teaches chunking for RAG) · what you'll talk about.
🗣 *If you get stuck:* "Hi, I'm Amber. I made PRISM, a small online lesson that teaches how AI chatbots read big documents by cutting them into pieces."

### Q1 — Why did you pick this topic? (≈45 sec)
🎬 **Show:** home page, the picture of a document turning into pieces.
💬 **Cover:**
- Lots of AI apps today are "chat with your PDF/notes" apps.
- Everyone talks about the AI part, but nobody sees the cutting step that happens before it.
- That step decides whether the right answer can even be found.
- It's very visual, so it's perfect to learn by playing with it.
- *(Add your own reason too: maybe you've used a PDF chatbot that gave a wrong answer, or you found this topic confusing at first. A personal reason sounds genuine.)*

🗣 *If you get stuck:* "I picked it because it's a hidden step. If the document is cut badly, even a very smart AI gives a bad answer. And it's something you can actually see and play with."

### Q2 — How did you break it down for students? (≈1 min)
🎬 **Show:** the 45-minute timeline, then press **Start learning** and go → through 2–3 pages.
💬 **Cover:**
- One topic per page, so students aren't overloaded.
- It starts with a real problem (a 200-page handbook and one question) before any definitions.
- Order: problem → basic words → the two settings (size and overlap) → play in the Lab → see it in a chatbot → challenge → quiz → real-world uses.
- Each page: a short explanation → see it happen → try it yourself.
- Small things that help: a "Remember" box at the end, one quick question, and hover definitions for hard words.

🗣 *If you get stuck:* "I didn't start with definitions. I started with a problem a student can relate to, and then added one idea per page."

### Q3 — How does it work? The logic (≈1 min 15 sec)
🎬 **Show:** **Size & overlap** page → answer the "Predict first" question → move the size slider → scroll to the token box.
💬 **Cover (use the ideas from Step 1, in your words):**
- What chunk size means: small vs big pieces and the trade-off.
- What overlap means: the bridge idea, plus the "20 − 4 = 16" example.
- Point out the prediction: students guess first, then check by moving the slider (halving the size roughly doubles the number of pieces).
- Tokens: show how a rare word breaks into pieces, and why real systems count tokens.

🗣 *If you get stuck:* "Think of it like cutting a long ribbon. Shorter cuts give you more pieces, but each piece says less. Overlap is when each piece repeats a little of the previous one, so nothing important falls into the gap."

### Q4 — How do the interactive parts help learning? (≈1 min 15 sec)
🎬 **Show:** the **Lab** → Generate → move the sliders → try **Tokens · GPT** → the "Fixed vs sentence" button in the Compare box.
💬 **Cover:**
- Students can paste or upload their own text (PDF, Word…) and cut it themselves.
- The numbers are real: how many pieces, how much text repeats, how many sentences got cut.
- The "What changed" line tells them *why* the result changed, so they learn cause and effect.
- Repeated words are highlighted, so overlap is something you can *see*.
- Compare two settings side by side; there's no "correct" setting, just pros and cons.
- Small game parts (points, badges, the little mascot) keep it fun, but they reward real experiments, not random clicking.

🗣 *If you get stuck:* "Reading about overlap is boring. But when you move a slider and see the repeated words light up, you instantly get it."

### Q5 — How would a student use it to understand and apply? (≈1 min)
🎬 **Show:** **RAG sim** → ask the attendance question → click **Poor: fixed · 8 / 0** (the answer breaks) → back to **Sentence · 40 / 0** → ask the homework question → scroll to step 5 (real model) → **Challenge** page.
💬 **Cover:**
- The student asks the chatbot a question and sees each step: cut → search → pick pieces → answer.
- Be honest: this chatbot doesn't use a real AI to write the answer; it copies the best sentences, so students can see exactly where the answer came from.
- Show bad cutting breaking the answer: that's the "aha" moment.
- Step 5 uses a real AI meaning-search model running in the browser: keyword search picked the wrong rule, the meaning search found the right one.
- Then they apply it: in the challenge they choose settings for a new document, get tested on real questions, and must explain why they chose those settings.

🗣 *If you get stuck:* "Here the student sees that the same question gets a broken answer just because the document was cut badly. That's when it clicks."

### Q6 — Why does this matter in real AI apps? (≈50 sec)
🎬 **Show:** **Real world** page → then the Lab's **Python code** and **Export JSON** buttons.
💬 **Cover:**
- Where this is used: PDF chatbots, college helpdesks, company search, customer support bots, legal/research tools.
- The diagram shows the full journey of a document, and which parts PRISM really does vs only explains.
- Students can download their pieces and get Python code to use the same settings in a real project.

🗣 *If you get stuck:* "Any app where you chat with documents needs this step. PRISM even gives you the code, so you can use it in your own project."

### Closing (≈20 sec)
💬 **Cover:** one-line summary · it runs in any browser with nothing to install · thank them.
🗣 *If you get stuck:* "So PRISM makes a hidden AI step visible and playable. Thanks for watching!"

---

## Step 4 — Practice questions (answer these out loud without notes)

If you can answer these, you truly understand it, and your video will sound natural:
1. In one sentence, what is RAG?
2. Why can't we just give the whole 200-page handbook to the AI?
3. What goes wrong if chunks are too small? Too big?
4. What is overlap, and what does it cost?
5. Why do real systems count tokens instead of words?
6. Why did the "Poor 8/0" setting break the attendance answer?
7. Why did meaning search find the homework rule when keyword search didn't?
8. Why doesn't your lesson say which setting is "best"?

---

## Important things to keep in mind

- **Talk, don't read.** Glance at the points, then speak naturally. Small pauses and "so…" are fine; they sound real.
- **Add your own touch:** a personal reason for the topic, or something *you* found confusing while learning it. Evaluators love that.
- **Be open about AI help (allowed by the brief):** for example, "I used AI tools to help me build and test it, but the design choices and the explanations are mine." Then *prove* it by explaining clearly.
- **Be honest about what's simulated:** the chatbot's answer is copied, not AI-written. The tokenizer and the meaning-search model are real.
- **Go slow:** pause half a second after each click so the page slide finishes.
- **Stay under about 8 minutes.** Skip the badges if you're running long.
- **Don't say:** "the AI writes the answer", "it uses a vector database", or "it works in every language". None of these are true.

## Final submission checklist

- [ ] Watched the video once fully; the voice is clear
- [ ] Live link works on phone and laptop (Ctrl+F5 once)
- [ ] Repo is public: https://github.com/Am-create7754/Kalvium_task
- [ ] Form has the repo link, the live link and the video link, all double-checked (one-shot!)
