# source/INTAKE.md — Class IV English intake (Task 1)

Generated 2026-09-19 by Task 1 of `sprints/v1/TASKS.md`. Evidence base for `PROJECT-CARD.yml` and
`sprints/v1/prd.md`. Nothing under `source/` other than this file and `source/.text-cache/`
(git-ignored) was created or changed.

**How this was produced.** `pdftotext <file> "source/.text-cache/<name>.txt"` for all nine PDFs
(plain reading-order mode); counts by `pdfinfo`, `pdfimages -list`, `wc -w` and small Python scripts
over the cache. Every one of the 12 sample pages was **also read as a page image** (`pdftoppm -r 80`)
during the PRD preflight; the images added only the two pictures in Poem-3. Textbook figures are
**not** in any text layer, so nothing below depends on them.

Word counts exclude the PDF footer timestamps (`13-Mar-25 11:58:56 AM`, 3 words per opener page).

---

## 1. File inventory

| File | Pages | Text layer | Text-layer words | Embedded images |
|---|---|---|---|---|
| `textbook/desa101.pdf` | 8 | yes | 870 | 100 |
| `textbook/desa102.pdf` | 16 | yes | 2151 | 297 |
| `textbook/desa103.pdf` | 10 | yes | 1115 | 95 |
| `textbook/desa104.pdf` | 8 | yes | 751 | 76 |
| `textbook/desa105.pdf` | 12 | yes | 1325 | 119 |
| `textbook/desa106.pdf` | 12 | yes | 1428 | 117 |
| `samples/1.1.1 IV ENGL-6 WS.pdf` | 4 | yes | 552 | 1 |
| `samples/1.1.2 IV ENG L-5 WS.pdf` | 4 | yes | 834 | 1 |
| `samples/1.1.3 IV ENG POEM-3 WS.pdf` | 4 | yes | 729 | 6 |

`source/syllabus/` holds only `.gitkeep`: **no portion circular and no marks-distribution document**.
`source/textbook/` has 6 files → `chapters: 6` in the card. No file is image-only; none needed OCR.
The textbook is *Santoor, Grade 4* — every page footer reads "Santoor Grade 4"; there is no cover in
`source/`. Files are named `desa101`–`desa106` (not `chNN-`); chapter numbers are taken from the printed
openers, and agree with the lesson numbers the samples name.

---

## 2. Chapters

Titles are exactly as printed on the chapter opener. "Reading text" = the passage or poem between
"Let us Read/Recite" and "Let us Think", footers excluded.

| Ch | File | Title (as printed) | Unit | Genre | Pages | Reading text |
|---|---|---|---|---|---|---|
| 1 | desa101 | **Together We Can** | Unit 1: My Land | poem ("Let us Recite", 10 lines) + activities | 8 | 64 words |
| 2 | desa102 | **The Tinkling Bells** | Unit 1: My Land | story (honesty) | 16 | 638 words |
| 3 | desa103 | **Be Smart, Be Safe** (subtitle "Road safety tips for little feet") | Unit 1: My Land | letter from the traffic police + six rules (non-fiction) | 10 | 325 words |
| 4 | desa104 | **One Thing at a Time** | Unit 2: My Beautiful World | poem (16 lines, four rhyming stanzas) + activities | 8 | 68 words |
| 5 | desa105 | **The Old Stag** | Unit 2: My Beautiful World | story, "Adapted from The Panchatantra" | 12 | 397 words |
| 6 | desa106 | **Braille** | Unit 2: My Beautiful World | non-fiction / biography (Louis Braille); ends with "Self Assessment 1" | 12 | 298 words |

**New vocabulary and grammar, as the chapters present them**

| Ch | New vocabulary | Grammar / language points taught |
|---|---|---|
| 1 | collective nouns from the box: *choir, pack, grove, herd, swarm, bunch, bouquet* (+ *bundle*, done for the child); *unity, traditions, festivals, languages*; honeybee/ant facts (*communicate, nectar, colony, signals, defend*). No "New Words" box | prepositions of place — *behind, between, near, in front of* ("Let us Learn B"); future with *will* (note to the teacher, "Let us Write"); collective nouns ("Let us Learn A") |
| 2 | no "New Words" box; *tinkling, shopkeeper, mischievous, consoled, honest, praised, reward, whispered*; the word-search values *calm, honest, loyal, respect, courage, truth, fair, kind, peace* | comparative and superlative adjectives, *-er / -est*, *than* ("Let us Learn B"); opposites ("Let us Learn C": beautiful/ugly, reward/punishment, buy/sell, whispered/shouted); sequencing events ("Let us Listen") |
| 3 | **New Words:** *pedestrian, footpath, reflective, distract*; *zebra crossing, traffic lights* | countable vs uncountable nouns ("Let us Write"); writing a letter; identifying road-sign symbols; safe/unsafe classification |
| 4 | "Let us Learn A" matches **might, useful, moments**; *trifled, halves* occur in the poem, unglossed | *is / are* + action word + *-ing* ("Let us Speak" table); silent *l* ("Let us Listen": calm, palm, calf, chalk, talk, balm…); a.m./p.m. (note to the teacher); writing a daily routine |
| 5 | **New Words:** *lush, stag, hillock, tender, sheltering, recovery*; describing words (*lush forest, tender grass, healthy food…*) | adverbs of manner (*warmly, slowly, quickly*); describing words; the note to the teacher says only "revise the concept of personal pronouns" |
| 6 | **New Words:** *blacksmith, blind, pincushions, invented*; also in the text *institute, simplified, affected, nearby* | past continuous, *was / were* + *-ing* ("Let us Write C"); consonant cluster *spl* ("Let us Listen"); the note says only "revise the simple past tense" |

---

## 3. Sample papers

`source/samples/` holds **three single-lesson monthly worksheets of 40 marks each, and no full
revision paper.** All three are headed "Atomic Energy Education Society — Worksheet (2025-26)", Class IV,
English, Marks 40. **None prints a duration.**

| Sample | Printed month / portion | Literal section headings (as printed) | Marks |
|---|---|---|---|
| `1.1.1 IV ENGL-6 WS` | "Month : August" · "Lesson 6 (Braille)" | `SECTION-A (READING) 10M` · `SECTION-B (TEXTUAL QUESTIONS) 5M` · `SECTION-C (CREATIVE WRITING) 5M` · `SECTION-D (GRAMMAR) 7M` · `SECTION-E (VOCABULARY) 5M` · `SECTION-F (SPELLING) 5M` · `SECTION-G(HANDWRITING) 3M` | 10+5+5+7+5+5+3 = 40 |
| `1.1.2 IV ENG L-5 WS` | "Month : July" · "Lesson 5 .The Old Stag" | `Section –A Reading Comprehension (10M)` · `Section-B Textual Question( 5M)` · `Section-C Creative writing ( 5M)` · `Section-D Grammar( 8M)` · `Section-E Vocabulary ( 5M)` · `Section-F Spelling ( 5M)` · `Section-G Handwriting ( 2M)` | 10+5+5+8+5+5+2 = 40 |
| `1.1.3 IV ENG POEM-3 WS` | "Month: June 2025" · "3 Be Smart, Be Safe" | `SECTION-A (READING)` · `SECTION -B (WRITING)` · `SECTION -C (VOCABULARY)` · `SECTION D (TEXT BOOK BASED QUESTIONS)` | 10+10+10+10 = 40 |

**Block patterns, quoted**

- **L-6.** A: five one-mark questions (`1M` each), "Answer the following in one word from the passage. `3M`",
  "Write the past tense of the following words from the passage. `2M`". B: `1M · 2M · 2M`.
  C: "Write 5 sentences about Braille script." D: "D1 … `3M`", "D2. Convert the following sentences into the
  past tense. `2M`", "D3. Use appropriate helping verbs. `2M`". E: "Match the words with their meanings. `5M`".
  F: "Circle the correct spelling. `2M`" + "Rearrange the jumbled letter to meaningful words. `3M`".
  G: "Write the following lines in neat handwriting. `3M`".
- **L-5.** A: two passage blocks, each "`(5M)`" — one unseen, one a textbook paragraph. B: "Who said the following
  sentence? `(1M)`" + "Answer the following questions. `(4M)`". C: "Write about your best friend and complete the
  paragraph. `(5M)`". D: six numbered blocks, `(1M)` ×5 + `(3M)`. E: "Match … `(3M)`" + "Write the opposite word. `(2M)`".
  F: "Rearrange the jumbled letters … `(3M)`" + "Circle the correct spelling. `(2M)`". G: "Write the passage in a good handwriting."
- **Poem-3.** A: "I) … `(5 Marks)`" five MCQs, "II) … `(5 Marks)`" four short answers + two True/False.
  B: "Classify and tick … `(2Marks)`", "Write five sentences about the given picture `(5 Marks)`", "Make sentences `(3 Marks)`".
  C: "Classify … as C and U `(2 ½ Marks)`", "Write the plural … `(2 ½ Marks)`", "Circle the odd one out `(2 Marks)`",
  "Complete … using suitable an article and noun `(3 Marks)`". D: "Answer the following questions: `(2x5=10 Marks)`".

**Observations that matter downstream**

- **Structure.** L-5 and L-6 share one seven-section order; Poem-3 (the earliest, June) has four. They disagree on D (7 vs 8),
  G (3 vs 2) and Textual (5 vs 10 in Poem-3). Half-marks (`2 ½`) appear in Poem-3 only.
- **`POEM-3` is mis-filed:** its content is Chapter 3, a letter and rule list, not a poem.
- **No sample covers Chapters 1, 2 or 4.**
- **The samples reuse the textbook.** Share of each sample's 10-word windows also found verbatim in the textbook:
  L-6 12 % (59 of 493), L-5 3 % (23 of 735), Poem-3 7 % (48 of 654). L-6's Section A passage is Chapter 6's opening
  paragraph; L-5's B passage is Chapter 5's opening paragraph; Poem-3's A-II is Chapter 3's rules.
- **The "tiny seed" passage is shared** by L-5 (A) and Poem-3 (A-I): 73 common 10-word windows. It is **off limits** for our papers.
- 6-word shingles common to a sample and the textbook: L-6 67, L-5 56, Poem-3 94 — the reason a short textbook quote can trip the
  shingle hard-fail (prd R3). Quoted lines the samples already use include "Get well soon, dear stag!" and "The grass is so tender and nice."
- L-6's header prints "Total No. of printed pages: 05" though the file has 4 pages (a header quirk; the file is 4 pages).
- The samples contain their own slips ("Capaitn / Sueccses" spelling options, "bids" for *birds*). Not our concern; our papers are proofread.
- Poem-3's two pictures (a street scene; four road-sign symbols) are image-only — absent from the text layer.

---

## 4. Sample-only topics — tested by the samples, not taught by the six chapters

Searched the six chapter texts (`grep -i`, whole-word where sensible). A topic is *not taught* if the chapters never present it as a rule or exercise.

| Topic | Sample that tests it | Hits in chapter text | Verdict |
|---|---|---|---|
| Plural nouns (cat/box/baby/man/tomato) | Poem-3 C-II | 1 — Ch 3 says uncountable nouns "do not have a plural form" | **not taught** (mock only) |
| Articles *a / an / the* | Poem-3 C-IV | 0 | **not taught** |
| Personal pronouns (he/she/his/we/her/it) | L-5 D-6 | 2 — both are one Ch 5 teacher note: "revise the concept of personal pronouns" | **not taught** (revision note only) |
| Synonyms ("similar word which means the same") | L-5 A-3 | 0 | **not taught** (Ch 2 teaches opposites only) |
| Suffix *-ness* | L-5 D-5 | 7 — all are ordinary words (*togetherness, sweetness, kindness, illness, blindness*), never a rule | **not taught** |
| Simple past, irregular verbs (feel→felt, grow→grew, fall→fell) | L-5 A-4, D-4 | the verbs occur in Ch 2 and Ch 5 stories; Ch 6 note: "revise the simple past tense" | **not taught** as a rule |
| Odd one out | Poem-3 C-III | 0 | **a format, not taught** |

All seven go to the mock only (1 item each; plurals 2 marks), per `prd.md` §5.2. Chapter papers exclude them.

---

## 5. Ch 1 and Ch 4 capacity inventory — the §12 gate

Thresholds from `prd.md` §5.0 / `TASKS.md` Task 1: **B** ≥ 8 distinct prompts · **C** ≥ 6 tasks and ≥ 10 words · **D** ≥ 1
grammar point with ≥ 8 item formats · **E** ≥ 20 distinct usable words. A word is *usable* if it is present in the chapter
text (checked below with a whole-word count) and can be tested at Class 4 level, with at most a gloss in the question.

### Ch 1 — Together We Can

| Sec | Supply (source in the chapter) | Count | Threshold | Result |
|---|---|---|---|---|
| B | "Let us Think" A1–A2, B1–B4 (6); poem line-pair meanings: helping/never fall, teamwork/overcome, win-or-lose/share, joined hands/goal near, together we shine (5); honeybee and ant facts, "Know You Do" (2) | **13** | ≥ 8 | PASS (+5) |
| C | "Let us Speak" favourite food and festival (1); "Let us Write" A1–A5, what X is doing and will do next (5); "Let us Think" B2, B3, B4 (3); "Let us Do" symbol of togetherness (1) = **10 tasks**. Make-sentence words: ≥ 15 of the 23 below | **10 tasks / ≥ 15 words** | ≥ 6 / ≥ 10 | PASS (+4 / +5) |
| D | prepositions of place (4 words, on the map); future with *will*. Formats: fill from box · choose from brackets · read the map and write · correct a wrong sentence · present→future · complete with *will* · unscramble · write what you will do next | **2 points, 8 formats** | ≥ 1 point, ≥ 8 formats | PASS |
| E | 23 words, all present in the chapter text: *bundle, herd, pack, bunch, bouquet, grove, swarm, choir; unity, traditions, festivals, languages, bond, trust, cheer, share, overcome, teamwork, communicate, nectar, colony, signals, defend* (counts 1–3 each; none occurs in the three samples) | **23** | ≥ 20 | PASS (+3) |

Note for the paper: the textbook accepts either *bunch* or *bouquet* "of flowers", so `acceptable` must list both.

**CAPACITY GATE — Ch 1: PASS** on every threshold.

### Ch 4 — One Thing at a Time

| Sec | Supply (source in the chapter) | Count | Threshold | Result |
|---|---|---|---|---|
| B | "Let us Think" A1–A4 and B (5): focus on one thing; list rhyme words; how you feel after finishing a task; things you do to stay calm and focused; what you like doing in your free time; the four stanzas (4): work-and-play; "things done by halves"; "one thing at a time … done well"; "moments … trifled away" | **9** | ≥ 8 | PASS (+1) |
| C | "Let us Write" routine table and paragraph (2); "Let us Speak" describe the picture (1); "Let us Do" B holiday activities (1); "Let us Think" A3, A4 (2); "Let us Think" B (1) = **7 tasks**. Make-sentence words: ≥ 12 (e.g. *might, useful, moments, calm, routine, recess, playground, periods, chalk, talk, palm, calf*) | **7 tasks / ≥ 12 words** | ≥ 6 / ≥ 10 | PASS (+1 / +2) |
| D | one point, *is/are* + action word + *-ing*. Formats: choose *is/are* · add *-ing* · rewrite singular↔plural · unscramble · spot-and-correct · compose from a who–is/are–doing-what table · build from a picture · pick the correct sentence · complete with your own action. (a.m./p.m. usage is a separate ninth-plus item type and is **not** counted) | **1 point, 9 formats** | ≥ 1 point, ≥ 8 formats | PASS (+1) |
| E | 21 words, all present in the chapter text (below) | **21** | ≥ 20 | **PASS (+1)** |

**The 21 Ch 4 words** (count in chapter / count in the three samples): *might* 3/1 · *useful* 2/0 · *moments* 2/0 ·
***trifled*** 1/0 · ***halves*** 2/0 · *play* 7/2 · *way* 1/0 · *right* 2/1 · *well* 2/4 · *tell* 2/0 · *away* 1/1 · *calm* 2/0 ·
*palm* 1/0 · *calf* 1/0 · *chalk* 1/0 · *talk* 1/0 · ***balm*** 1/0 · *routine* 4/0 · *recess* 1/0 · *periods* 2/0 · *playground* 1/0.
All 21 are present in the chapter; none is absent.

**Three words are gloss-dependent or spelling-only** (bold above). The book glosses *might, useful, moments* only.
- ***trifled*** and ***halves*** (poem lines 14 and 7) are unglossed in the book, so any item must gloss them in the question.
- ***balm*** appears only in the silent-*l* listening list; its meaning is not taught, so it may be used for **spelling only**.

**Sensitivity of the E verdict:** the 21 count already includes those three. Rejecting **one** of them leaves 20 (still PASS, margin
0); rejecting **two** leaves 19 and the threshold **fails**. The judgement that they are usable is mine; the owner's human read can
overturn it.

Two further cautions for the Ch 4 paper: the rhyme words are very basic, so they suit E3 (rhyme pairs) rather than E1/E2; and *might* and
*well* also occur in the samples (L-5 E asks the child to match "Might" to a meaning and to write the opposite of "well-"), which the
semantic pass may flag.

**CAPACITY GATE — Ch 4: PASS, with a margin of exactly one on every threshold** (B 9 vs 8, C 7 vs 6, D 9 vs 8, E 21 vs 20).
It is the narrowest pass the plan allows, and its Vocabulary result rests on three words whose usability is a judgement.

**Overall: no §12 stop. Tasks 5 and 8 may start.**

---

## 6. Caveats

- Extracted text loses the pictures, the word-search grid, the map and the speech-bubble layout; papers must not depend on them.
- The plain-mode extraction was used for the cache (reading order); the `-layout` mode interleaves the two-column pages.
- Reading-text counts, genre calls, "usable" judgements and the sample-only verdicts are **my reading**, checked by the greps above,
  not machine-verified against a curriculum. Curriculum fidelity stays a by-hand check throughout the sprint.
