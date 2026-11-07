# PRISM — Full speaking script (plain language, about 7 minutes)

Written fresh in simple, everyday English, the way you'd explain it to a friend. Nothing here is copied from any article or course.

**To make it 100% yours:**
- Fill in every **✍️** line with your own words or experience.
- Change any sentence that doesn't sound like you. Swap words, shorten things, add your own examples.
- Read it 2–3 times, then record looking at the points, **not reading line by line**.
- 🎬 = what to show on screen while you say it.

---

## 1. Intro (≈30 sec)

🎬 Home page.

"Hi, I'm Amber.

This is **PRISM**. I call it an interactive chunk playground. It's a small online lesson, around 45 minutes, that teaches one thing: how AI chatbots read big documents by **cutting them into small pieces**.

In this video I'll tell you why I picked this topic, how I broke it down, how it actually works, and how a student would learn with it."

---

## 2. Why I picked this topic (≈45 sec)

🎬 Stay on the home page. Point at the document turning into small cards.

"Nowadays there are so many apps where you upload a PDF or your notes and just chat with them. Behind most of these apps there's something called **RAG**.

Usually, when people learn about these apps, they only talk about the AI model. But there's a step that happens **before** the AI even sees anything, and almost nobody talks about it. That step is **chunking**: cutting the document into pieces.

And this step is really important. If the document is cut badly, the right answer can get split into two halves. Then even a very smart AI can only find half the answer.

✍️ *[Add your own reason here, e.g. "I've used a PDF chatbot that gave me a half-wrong answer, and I wanted to understand why," or "When I first learned RAG, this part confused me the most."]*

I also picked it because it's something you can actually **see**. You can watch a document getting cut. So it's perfect for learning by playing, not just reading."

---

## 3. How I broke it down (≈1 min)

🎬 Scroll to the "45-minute journey" bar. Then press **Start learning** and go → through 2–3 pages.

"I made it like a course player: **one topic per page**, so a beginner isn't overloaded. There are nine small modules, and you can see how many minutes each one takes, adding up to 45.

I didn't start with definitions, because definitions are boring when you don't know why you need them. So I start with a **problem**: a college has a 200-page handbook, and a student asks the chatbot, 'What attendance do I need for exams?' How does the chatbot find that one line?

Once the student cares about that problem, I bring in the basic words, then the two main settings, chunk size and overlap. After that they **play** in the Lab, see it working in a chatbot, do a challenge, take a quiz, and finally see where this is used in real life.

On every page I follow the same pattern: explain a little, **show** it happening, then let the student **try** it.

And at the end of each page there's a small 'Remember' box with the main points, plus one quick question. Hard words like *context window* have a little dotted line. You just hover over them and the meaning pops up."

🎬 Hover over a dotted word.

---

## 4. How it works: the logic (≈1 min 15 sec)

🎬 Open **Size & overlap**. Answer the **Predict first** question, then move the size slider.

"So, two settings control everything.

The first is **chunk size**, which means how big each piece is. If the pieces are very small, each one is focused, but it might cut a sentence in half and lose the meaning. If the pieces are very big, nothing gets cut, but each piece also carries a lot of extra stuff that has nothing to do with the question. It's like cutting a pizza into fifty tiny bites, or into just two huge halves. Neither one is right.

Before students move the slider, I ask them to **guess** first: 'If I make the pieces half the size, how many pieces will I get?' Then they move the slider and check. Here it goes from 6 pieces to 11, so roughly double. Guessing first makes you think, so you remember it better.

The second setting is **overlap**. It means repeating a few words from the end of one piece at the start of the next one, like a small bridge. So if something important is sitting right at the cutting point, it still shows up fully in at least one piece. The cost is that some text gets stored twice.

There's simple math behind it: if each piece is 20 words and the overlap is 4, the next piece starts 16 words later."

🎬 Scroll to the token box with coloured blocks.

"One more thing. AI models don't actually read **words**; they read **tokens**, which are small bits of words. This box uses a real GPT tokenizer. Look: a normal word is one block, but a rare word like 'condonation' breaks into a few pieces. That's why real apps measure chunk size in tokens, not words."

---

## 5. How the interactive parts help learning (≈1 min 15 sec)

🎬 Go to the **Lab**. Press Generate. Move the sliders. Click **Tokens · GPT**. Then click **Fixed vs sentence** in the Compare box.

"This is the **Lab**, my favourite part.

Students can type, paste, or even upload their own PDF or Word file, and cut it themselves. All the numbers here are real: how many pieces there are, how many words got repeated, and how many pieces got cut in the middle of a sentence.

When I change a setting, this line tells me **what changed and why**. So students don't just see the result, they understand the cause.

The repeated words light up in orange. Reading about overlap is boring, but when you move the slider and *see* the repeated words light up, you get it instantly.

In token mode, you can even see how the text looks to the AI, and the pieces sometimes cut a word in half. That shows why real tools try to cut at sentence endings.

Here I can compare two settings side by side. And notice, I never say 'this setting is the best', because there is no single best. It depends on the document and the questions people ask. I wanted students to think about pros and cons, like a real engineer would.

There's also a small game side: points, badges and this little character, Chunky. ✍️ *[say why you added it in your words, e.g. "to keep it fun for beginners"]*. But the badges are for real experiments, like trying overlap or finding a broken answer, not for random clicking. And if someone finds the animations distracting, there's a Calm mode that turns them off."

---

## 6. How a student uses it to understand and apply (≈1 min)

🎬 Go to **RAG sim**. Click the attendance question. Then click **Poor: fixed · 8 / 0**.

"Now let's see it in a chatbot. The student asks, 'What is the minimum attendance required?' and can see every step: the handbook gets cut, the question becomes keywords, each piece gets a score, the best pieces are picked, and an answer comes out.

To be honest about it: this chatbot doesn't use a real AI to *write* the answer. It just picks the best sentences from the pieces, so the student can see exactly where the answer came from.

Now watch. If I cut the handbook into tiny 8-word pieces… the answer breaks. The attendance rule got split across pieces, and the app even warns about it. For me, this is the main 'aha' moment: **how you cut the document decides how good the answer is.**"

🎬 Click **Sentence · 40 / 0**, ask the homework question, scroll to step 5.

"Step 5 is something real. It loads an actual AI model that understands **meaning**, and it runs right inside the browser. I ask, 'Is there a penalty for handing in homework after the due date?' The keyword search picked the library-fine rule, because the words matched. The meaning search found the late-submission rule, because the *idea* matched. That's why real apps search by meaning."

🎬 Go to **Challenge**: choose settings → Generate & test → type a reason → Check.

"Then the student **applies** it. In the challenge they get a new document, choose their own settings, and the app tests them with three real questions. They also have to write **why** they chose those settings, and the feedback looks at their reasoning too, not just the result. After that there's a short quiz where every answer comes with an explanation."

---

## 7. Why it matters in real AI apps (≈50 sec)

🎬 Go to **Real world**. Then in the Lab, click **Python code** and **Export JSON**.

"Where is this used? Pretty much anywhere you chat with documents: PDF chatbots, college helpdesks like the one in this lesson, company search tools, customer support bots, legal and research assistants.

This diagram shows the whole journey of a document in such an app, and it clearly marks what PRISM really does and what it only explains.

And students can take this into a real project. They can download their pieces, and get Python code with the exact same settings they chose. I tested that code, and it gives exactly the same pieces as the website."

---

## 8. Closing (≈20 sec)

🎬 Home page.

"So that's PRISM. It takes a step that's usually hidden inside AI apps and makes it something you can see, break, and fix yourself. It runs in any browser, with nothing to install.

✍️ *[Optional, honest line: "I used AI tools to help me build and test it, but the design and how I explain it are my own."]*

Thank you for watching!"

---

## Make sure it sounds like you

- Change at least a few sentences into how *you* normally talk. Short sentences, "so", "basically", "see here" are all fine.
- Fill in all three ✍️ lines; they're the most personal and convincing parts.
- Don't rush. Pause after each click so the page finishes sliding.
- If you forget a line, explain the idea in any words. Understanding matters more than exact sentences.
