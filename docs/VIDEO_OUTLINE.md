# Explanation video — suggested outline (≈ 6 minutes)

Record with the site open in a browser. Show while you speak, and keep each part short.

---

### 0:00 – 0:40 · Intro & why this topic
*Show: hero section.*
- "I built ChunkLab, a 45-minute self-paced lesson on **text chunking for RAG**."
- **Why this topic:** almost every "chat with your documents" app uses RAG, and chunking is the step beginners never see but which decides what the AI can find. A great model can't answer from a chunk that cut the answer in half. It's also very visual, so it suits an interactive lesson.

### 0:40 – 1:40 · How I broke the concept down
*Show: timeline bar, then scroll through the module headers.*
- Problem first: a 200-page handbook and one student question (Module 1).
- Then vocabulary in one line each, then **one idea per module**: what a chunk is → size → overlap → tokens vs words.
- A **learn → see → do** pattern: short explanation → live visual from the real engine → the learner controls it.
- Time budget: 45 minutes, split across 9 modules with the core concept and the Lab getting the most time.

### 1:40 – 2:50 · How chunking works (underlying logic)
*Show: Module 3 boundary demo, then the Lab formula line.*
- Fixed-size: with step `S = C − O`, each chunk starts S words after the previous one. Overlap is clamped to C − 1, so the loop always moves forward. It stops when a chunk reaches the end, so there are no empty tail chunks.
- Sentence-based: packs whole sentences up to the limit and never crosses a paragraph.
- Trade-offs: small = focused but loses context; large = context but noise; overlap = continuity but redundancy.
- Production measures **tokens**, not words. My simulator uses words for clarity and says so.

### 2:50 – 4:10 · Interactive elements and how they support learning
*Show: the Lab live.*
- Drag size 20 → 8: chunk count jumps, mid-sentence cuts increase, and the "What changed" line explains it.
- Add overlap: coral highlights show exactly which words repeat, and redundant words are counted.
- Compare panel: "Fixed vs sentence" preset shows the cuts side by side.
- Feedback never says "best", only trade-offs. That is deliberate: real engineers test.

### 4:10 – 5:10 · Connecting to a real RAG app
*Show: RAG simulation.*
- Ask "What is the minimum attendance required?" with **Sentence · 40/0**. Walk through the 4 steps and the extractive answer.
- Switch to **Poor: fixed · 8/0** and ask again. The answer becomes fragments and the warning shows the sentence split across chunks.
- **Bring your own document:** switch to "My own document" and drop `samples/greenleaf_member_guide.pdf`. Point at the extraction report (page numbers removed, hyphenation repaired) — the "text extraction + preprocessing" stage made visible. Ask "How many guests can I bring?"
- Point at the honesty banner: keyword scoring, no embeddings or LLM. Then the "In production RAG" card: embeddings, vector DB, LLM.

### 5:10 – 5:50 · How a student uses it end-to-end
*Show: challenge → quiz → completion card.*
- Challenge: pick settings, run 3 real retrieval tests, write a justification, get feedback on both behaviour and reasoning.
- Quiz: 6 application questions with explanations and retake.
- Progress is saved, and the completion card shows modules done, quiz score and challenge result.

### 5:50 – 6:20 · Real-world relevance & close
*Show: real-world apps + architecture + code.*
- PDF Q&A, university assistants, enterprise search, support bots, legal and research assistants.
- Architecture legend: what's working, simulated, or conceptual in ChunkLab.
- The LangChain snippet shows how learners would do this in a real project.
- Close: "ChunkLab turns an invisible engineering step into something students can see, break, and reason about."
