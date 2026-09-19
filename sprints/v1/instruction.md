# Instruction — Class IV English Practice Site (`mily-english-abhyas`)

**Audience:** the coding agent working in this repo.
**Your first job:** read this file and `BLUEPRINT.md` completely, inspect the repo, run the
preflight in §10, then write `sprints/v1/prd.md` per §11 and **stop**. Planning into atomic tasks
happens afterwards with `/prd`, execution with `/dev`, and the sprint closes with `/walkthrough`.

`BLUEPRINT.md` is the governing specification, generalised from the Hindi build. This file adds
what is specific to **English** and what the **Maths build** (`../mily-maths-abhyas`) taught.
Where the two disagree, this file wins; record every disagreement in `prd.md` under
*Deviations from blueprint*.

The owner wants this built **autonomously and to completion**, including deployment. Do not stop
for routine questions. Stop only for the hard stops in §12.

---

## 1. Goal

A static, single-page practice-paper website for Mily (Class IV, Atomic Energy Education Society,
2025-26), covering the **Half-Yearly English portion** — the chapters present in
`source/textbook/`.

Deliverables:

1. **One paper per chapter**, 100 marks each.
2. **One Half-Yearly mock paper** covering the whole portion, 100 marks, modelled on the school's
   own revision papers. (Hindi, EVS and Maths all shipped this; keep parity.)
3. The app: login → chapter list → paper → result, with **Practice mode** (child) and
   **Checking mode** (parent, secret-gated), exactly as `BLUEPRINT.md` §7.
4. Build step, validator, README, and a production deployment on Vercel.

Same look and feel as the Maths site.

---

## 2. Project Card

Write `PROJECT-CARD.yml` at the repo root. Everything marked *verify* comes from `source/`,
never from memory or from the Maths card.

```yaml
subject_code:        english
subject_display:     English
grade:               4
board_or_school:     "Atomic Energy Education Society"
academic_year:       "2025-26"

locale:              en
numerals:            latn
content_language:    English

textbook:            ""           # verify — read the cover or chapter opener
chapters:            0            # verify — MUST equal the files in source/textbook/
extra_papers:        [ { code: hy, title: "Half-Yearly Mock Paper" } ]
sets_per_chapter:    1
total_marks:         100
duration_minutes:    0            # verify — from the school revision paper header

repo_name:           mily-english-abhyas
vercel_project:      mily-english-abhyas
student_login:       { user: "Mily", pass: "2026" }
marking_secret_env:  GANESH_ENGLISH

section_blueprint:   # §5 — derive from source/samples/, then record here
  - { code: A, title: "...", marks: 00 }
```

`GANESH_ENGLISH` must differ from the Hindi, EVS and Maths codes so one site's code cannot unlock
another's.

---

## 3. Source material

The owner places the files; you inspect them and never move, rename or edit them.

```
source/
  textbook/    one file per chapter; chapter number unambiguous in the filename
  samples/     the school's English revision papers and worksheets
  syllabus/    optional — portion circular, marks distribution
```

Intake rules, in addition to `BLUEPRINT.md` §3:

1. Check every PDF for a text layer (`pdftotext`). Where a file is image-only, rasterise it
   (`pdftoppm -r 80 -png`) and read the page images.
2. **Read every sample-paper page as an image**, not only its text layer. Section headings, mark
   allocations and instruction wording often sit in boxes the text layer mangles.
3. Write `source/INTAKE.md`: file inventory, page counts, text layer yes/no, and per chapter —
   the title exactly as printed, the **genre** (story / poem / play / letter / non-fiction), a
   word count, the new vocabulary the chapter introduces, and the grammar points it teaches.
   For each sample paper: the literal section headings, block patterns (e.g. `6 × 1 = 6`) and
   total marks, quoted, not paraphrased.
4. Record which grammar topics the **samples test** but the **chapters do not teach**. Maths hit
   this with lakh/crore and clock-reading; the rule it settled on applies here too — such topics
   are excluded from chapter papers and appear only in the mock (§6.6).

---

## 4. What the Maths build established — reuse, don't re-derive

`../mily-maths-abhyas/` is on this machine. Before designing anything, read:

- `sprints/v1/walkthrough.md` and `sprints/v2/walkthrough.md` — what went wrong and why.
- `validate.js` — the validator's structure; adapt its checks rather than writing from scratch.
- The cross-paper check script used in its Task 12 (find it under `scripts/`).
- `app/`, `build.js`, `vercel.json`, `scripts/e2e.js` — the app shell and tests for v2.

Lessons that transfer directly:

1. **Correct is not the same as age-appropriate.** Maths shipped Euler's-formula items that
   passed every automated check and were Class 8 material. The English equivalent is vocabulary,
   sentence length and abstraction pitched above Class 4. §6.5 guards against it.
2. **Sub-agents reuse the samples.** Maths Task 12 found five near-verbatim reuses of the school
   papers and five mock items that were chapter items with the names swapped. Here the
   duplicate check (§7) runs after **every** paper, not once at the end.
3. **Sub-agents write only their own paper.** A paper sub-agent writes its own
   `app/data/english-*.json` and its own assets — nothing else. It never touches the PRD, card,
   tasks file, schema, validator or check scripts. One sub-agent in the Maths build wrote the PRD
   itself; you then re-read every file a sub-agent claims to have written.
4. **Captions can give answers away.** In Maths, a caption said "with its 6 corners marked" above
   a question asking the child to count the corners. In English the risk is a caption or
   stimulus title that states the answer to a comprehension item. Check every caption against
   its items.
5. **Tag `difficulty` on every item**, and the validator requires it.

---

## 5. Deriving the paper blueprint

Do **not** carry over the Maths four-outcome structure without evidence. Derive the sections from
`source/samples/` per `BLUEPRINT.md` §4, then record them in the card.

Two patterns are plausible, and the samples decide:

- **Outcome-based** — Knowledge · Understanding · Ability to Express · Creative Ability. AEES used
  this shape for Class IV Maths.
- **Skill-based** — Reading · Writing · Grammar & Vocabulary · Literature. The common national
  English pattern, and the blueprint's starting suggestion.

Keep the school's section **order, titles (verbatim) and relative weighting**, scale the marks to
100, and show the scaling arithmetic in `prd.md`. Mirror the school's own block patterns inside
each section (Maths kept `6×1 + 5×2 + …` rather than flattening them — do the same).

Per-paper targets from the blueprint stand: **45–60 scorable items**, mark values 1–5, roughly
40% recall / 40% understanding / 20% application, and an **OR** alternative on each long creative
item, as school papers do.

---

## 6. English-specific content rules

These replace the Maths figure-and-arithmetic rules with passage-and-rubric rules.

### 6.1 Unseen passages must be original — hard rule

The unseen comprehension passage and any unseen poem **MUST be written by you**. Never copy or
closely paraphrase a passage from the textbook, the sample papers, a website or any published
book — this is a copyright requirement, not a style preference.

- Length 100–150 words. Short sentences, concrete nouns, familiar Indian settings.
- Store as `stimulus.kind: "passage"` (or `"poem"`) with the full text in `stimulus.text`, and set
  `"original": true`.
- A poem used as an unseen stimulus must also be original, or verifiably public domain with the
  source recorded in `sourceRef` and `"original": false`.
- `validate.js` **MUST** fail if any 10-word window of a `passage` or `poem` stimulus also appears
  in the extracted text of any file under `source/`.

**Textbook-based questions are different.** Quoting one short line (under 15 words) from the
chapter as the basis of a question is normal exam practice and allowed. Quoting a paragraph is
not. At most one textbook extract per block.

### 6.2 Every judgement item needs a usable rubric

English has far more judgement marking than Maths. For every `long`, `handwriting`, `activity`,
`draw` and creative-writing item, `markingGuide` **MUST** end with a band rubric the parent can
apply without guessing:

> *All three points covered in full sentences — 3; two points — 2; one point — 1. Deduct 1 for
> more than three spelling errors. Maximum 5.*

`validate.js` **MUST** fail if a judgement item's `markingGuide` is missing, shorter than 40
characters, or contains no digit.

### 6.3 One defensible answer — or all of them listed

The English equivalent of a wrong Maths answer is an item with two correct answers, so the parent
marks a correct child wrong.

- `fill-blank`, `one-word` and grammar-transformation items carry `acceptable: [...]` listing
  every answer a Class 4 child could reasonably give that deserves full marks (tense variants,
  synonyms, British/Indian spellings). The primary `answer` is included in the list.
- `validate.js` **MUST** require `acceptable` on every `fill-blank` and `one-word` item.
- MCQ distractors must be clearly wrong to an adult reader. If you can argue for a distractor,
  replace it.
- Avoid items whose answer depends on a convention the chapter never taught.

### 6.4 Notation and presentation

- Blanks are exactly five underscores: `_____`.
- Dialogue in passages uses curly quotes (“ ” ‘ ’); straight quotes appear nowhere in content.
- Spellings follow the textbook's convention (Indian English: *colour*, *practise* as a verb).
- Handwriting items: the text to copy goes in `stimulus.text`; the rubric covers letter formation,
  spacing, neatness and punctuation.
- Dictation / spelling items: the word list goes in `answerPoints`, one word per point, since the
  parent reads the words aloud. Say so in the block `instruction`.
- True/false items say "Write True or False" in the instruction. (Maths missed this on eight
  items and the app had to paper over it.)
- Every `fill-blank` item contains the `_____` blank in `q`.

### 6.5 Age-appropriateness gate

Mechanical checks, recorded with numbers in the walkthrough for every paper:

- Authored passages: average sentence length ≤ 12 words; no sentence over 20 words.
- No authored passage word longer than 3 syllables unless it appears in the chapter or is glossed
  in the question.
- Questions ask "what", "who", "where", "why did X…" — not motive, irony, theme or author intent.

A human reads every question before the sprint closes. State in the walkthrough that these checks
are not a substitute for that.

### 6.6 Chapter papers vs the mock

- A chapter paper draws **only** on its chapter: its text, its vocabulary, its grammar point, plus
  one original unseen passage. Chapters with thin grammar content may reuse the grammar point with
  fresh sentences, but must not import another chapter's grammar.
- The **mock** spreads items across all chapters in rough proportion to their length, reads like a
  fresh sibling of the school's revision papers, and is where topics the samples test but the
  chapters don't teach may appear (1–2 items each, recorded in `prd.md`).
- No item in the mock may be a chapter item with the names or numbers changed.

### 6.7 Figures

English needs few: a picture-composition prompt, a describe-the-scene picture, perhaps a comic
strip for sequencing. Same rules as Maths: original SVG in `app/assets/`, generated or
hand-authored, `currentColor` for strokes so it works in dark mode, viewed by you at 2× before
acceptance. **Never write a question that depends on a picture you have not produced** — rewrite
it as text instead.

---

## 7. Duplicate and reuse detection — from the first paper

Write `scripts/similarity.py` (single owner) that:

1. Extracts the text of every file under `source/` once into `source/.text-cache/` (git-ignored).
2. **Shingle pass (hard fail):** any 6-word shingle shared between an item's `q` or a stimulus and
   the **sample-paper** text is a failure, except an allow-list of generic instruction phrases
   ("fill in the blanks", "answer the following questions") kept in the script.
3. **Semantic pass (warning):** embed every item `q` across all papers with `all-MiniLM-L6-v2` via
   `sentence-transformers` on CPU, cache the vectors as a `.npy` file, and print every cross-paper
   or paper-to-sample pair with cosine ≥ 0.85 for the coordinator to judge. This catches
   "Rani's school has 523 children" against "Preeti's school has 423 pupils", which shingles miss.
4. Exits non-zero on a shingle failure.

**No GPU, no vector database, no Modal, no RAG.** The whole corpus is a few thousand short strings;
this runs in seconds on CPU. If `sentence-transformers` cannot be installed, say so and run the
shingle pass only.

Run `npm run validate && python3 scripts/similarity.py` after every paper.

---

## 8. Sprint plan

| Sprint | Scope | Done when |
|---|---|---|
| **v1 — Content** | Preflight, intake, `INTAKE.md`, derived blueprint, schema (+ `original`, `acceptable`), `validate.js`, `scripts/similarity.py`, **every paper** (one per chapter + mock) | every paper passes `npm run validate`; `similarity.py` clean; every figure viewed; `sprints/v1/walkthrough.md` written; `sprints/v2/instruction.md` drafted |
| **v2 — App & deploy** | App shell (adapted from Maths), both modes, marking, result, print, `build.js` with `GANESH_ENGLISH` hashing, README, Vercel deploy, Playwright e2e on localhost and live | `BLUEPRINT.md` §13 checks 7–26 run in a real headless browser against the live URL |

At the end of v1, write `sprints/v2/instruction.md` yourself, starting from
`../mily-maths-abhyas/sprints/v2/instruction.md` and adjusting for English (fewer figures, longer
text stimuli, rubric display in checking mode).

**Task shape (follow when `/prd` writes `TASKS.md`):**

1. Setup (`package.json`, folder check)
2. Schema + `validate.js` — single owner — proved against a bad fixture (wrong total, missing
   rubric, missing `acceptable`, copied passage) before any real paper relies on it
3. `scripts/similarity.py` — single owner
4. One task per chapter paper — one sub-agent each
5. The mock paper
6. Coordinator cross-paper verification — **not delegated**
7. Walkthrough
8. Draft `sprints/v2/instruction.md`

**Commit after every paper**, so an interrupted or compacted session can resume from `git log`.

---

## 9. Context economy

The Maths coordinator spent ~314K tokens on four papers, mostly re-reading sub-agent output.

- Re-read a paper with `jq` printing only `id`, `q`, `answer`, `marks`, `markingGuide` — never the
  full JSON.
- View each figure once, at 2×.
- Report only failures between tool calls.
- Run papers in batches of two to four per session; the owner will start fresh sessions between
  batches.

---

## 10. Preflight — before writing `prd.md`

Report results at the top of `prd.md`. **Never print a secret value.**

1. Tools: `node -v` (≥ 18), `npm -v`, `jq --version`, `pdftotext -v`, `pdftoppm -v`,
   `rsvg-convert --version`, `python3 -c "import sentence_transformers"`. Install what is
   missing if possible (`pip install --user sentence-transformers`).
2. Count files in `source/textbook/` and `source/samples/` (ignore `.gitkeep`). Both must be
   non-zero; record the counts.
3. `.env.local` has **uncommented** `VERCEL_TOKEN=` and `GANESH_ENGLISH=` lines; `GANESH_ENGLISH`
   is at least 10 characters (count-only check). A short code collided with page text in the
   Maths risk review.
4. Vercel token valid: `GET https://api.vercel.com/v2/user` → 200 (print the HTTP code only).
5. Whether this account already owns a project or hostname `mily-english-abhyas`. If the result is
   ambiguous, plan to accept whatever `*.vercel.app` URL Vercel assigns and report it.
6. `git status` is clean and the source intake is committed.
7. `../mily-maths-abhyas` exists and is readable.

---

## 11. What `prd.md` must contain

1. Preflight results.
2. Problem statement and users (child: practice; parent: checking).
3. Confirmed Project Card and section blueprint, with quoted evidence from the samples.
4. Scope for v1, and explicit out-of-scope (v2 work, plus `BLUEPRINT.md` §15).
5. Per-paper plan: for each chapter, its genre, the text, vocabulary and grammar it contributes,
   and how the items spread across sections; for the mock, the chapter-to-marks allocation and the
   sample-only topics it includes.
6. The unseen-passage plan: one original passage per paper, theme and target length.
7. Figure inventory (likely short).
8. Schema changes versus `BLUEPRINT.md` §5 (`original`, `acceptable`, `difficulty` required).
9. Validator checks — the blueprint's ten, plus §6.1, §6.2, §6.3, §6.4.
10. Acceptance criteria for v1, each testable by a command.
11. Sub-agent write-scope policy.
12. Risks and deviations from the blueprint.

Keep it at the level of *what and why*. The atomic *how* belongs in `TASKS.md`.

---

## 12. Hard stops — the only reasons to pause and ask

- `source/textbook/` or `source/samples/` is empty, or a file is unreadable even as an image.
- The samples show a structure that cannot be scaled to 100 marks without changing the school's
  section titles or order.
- A chapter cannot support a full paper without leaving its own content.
- A step would print, log or commit `VERCEL_TOKEN` or `GANESH_ENGLISH`.

Everything else: decide, record the decision in `prd.md` or the walkthrough, and continue.

---

## 13. Honesty requirements

- Never write "tested" for something you only read. If no browser runs in v2, say so and hand the
  checklist to the owner.
- The walkthrough lists every figure not viewed and every authored passage not run through
  `similarity.py`. The target for both lists is empty.
- The login and the checking gate are deterrents for a nine-year-old, not security. The README
  says so in those words.
