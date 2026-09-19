# PRD — v1 (Content) — mily-english-abhyas

Governing docs: `sprints/v1/instruction.md` (wins on conflict) and `BLUEPRINT.md`. Evidence base:
the nine PDFs under `source/` (all read; the 12 sample pages read **as images** as well as text).
This PRD covers v1 (content) only — schema, validator, `similarity.py`, six chapter papers and the
Half-Yearly mock. **No paper has been written.** `TASKS.md` comes next via `/prd`.

Date of preflight: 2026-09-19. Nothing under `source/` was changed; `source/INTAKE.md` and
`source/.text-cache/` do **not exist yet** (INTAKE is Task 1 — see §4).

**Revision 2 (owner decisions, same day).** (1) Chapters 1 and 4 get a *thin-poem profile*: still
100 marks, five sections in multiples of ten, a harder difficulty mix, and a capacity gate — §3.6,
§5.0, deviation **D9**. (2) No full revision paper will be supplied: **D1 and
`duration_minutes: 120` stand as accepted assumptions**, not open questions. (3) `VERCEL_TOKEN` and
`GANESH_ENGLISH` are now real values (§1 rows 3–4). (4) At Task 2 the Maths `validate.js` and both
Maths walkthroughs are read *before* the validator is adapted (D8).

---

## 1. Preflight results (instruction.md §10)

| # | Check | Result |
|---|---|---|
| 1 | Tools | `node v22.23.2` (≥18 ✓), `npm 10.9.8`, `jq 1.8.1`, `pdftotext 24.08.0`, `pdftoppm 24.08.0`, `rsvg-convert 2.59.2`, `python3 3.9.25`. `sentence_transformers` and `torch` were **missing**; installed for the user (`pip install --user`, CPU-only torch wheel to protect a 92%-full disk) → `sentence-transformers 5.1.2`, and `all-MiniLM-L6-v2` loaded and encoded on CPU (`MODEL_OK (1, 384)`). Disk free afterwards ≈ 3.7 GB. So the semantic pass of §7 is available. |
| 2 | Source counts | `source/textbook/`: **6** PDFs (`desa101`–`desa106`). `source/samples/`: **3** PDFs. `source/syllabus/`: **0** (optional). Both required folders non-zero → no hard stop. |
| 3 | `.env.local` | **Re-checked 05:26 after the owner set real values.** Exactly one uncommented `VERCEL_TOKEN=` and one `GANESH_ENGLISH=` line. `GANESH_ENGLISH` length **10** (≥10 ✓, but exactly at the minimum); it is **no longer the earlier placeholder**, differs from the Maths code (hash comparison, boolean only), and occurs in no repo file. **Could not compare against Hindi or EVS** — neither repo holds such a key on this machine. Two residual notes (§12 R1–R2): the value still contains one of the words *english / ganesh / mily*, and the file mode is still `664` (`setup.sh` sets `600`). Values never printed. |
| 4 | Vercel token | Re-checked with the new value: `GET /v2/user` → **HTTP 200**. |
| 5 | Project / hostname | `GET /v9/projects/mily-english-abhyas` → **404** in personal scope and **404** under the account's one team → not owned, name free. `https://mily-english-abhyas.vercel.app` → 404 `DEPLOYMENT_NOT_FOUND`. The account already holds `mily-hindi-abhyas`, `mily-maths-abhyas` and seven `mily-evs-*` projects. **Ambiguous** (Maths recorded the same 404 signature as a squatted hostname), so per instruction.md §10.5: accept whatever `*.vercel.app` URL Vercel assigns and report it. |
| 6 | `git status` clean, intake committed | **FAIL.** This directory is **not a git repository** (no `.git`), and `source/INTAKE.md` is not written. `setup.sh` has not been run. Consequence: CLAUDE.md rule 5 (commit after every task) cannot be followed until the owner runs `bash setup.sh`. It is safe to run now — the token is in git-ignored `.env.local` and `.env.local.example` is blank. |
| 7 | `../mily-maths-abhyas` | Exists and readable. |

**Additional finding — `BLUEPRINT.md` is not in this repo.** `setup.sh` (not yet run) is what copies it
in. I read the Maths copy (`../mily-maths-abhyas/BLUEPRINT.md`, 730 lines, md5 `3820ea3d…`) in full;
`setup.sh` copies exactly that file. Every "`BLUEPRINT.md` §n" below refers to it.

**Additional finding — secret exposure in this session.** Early on, a `cat` of `.env.local.example`
displayed a full-length `VERCEL_TOKEN` and the `GANESH_ENGLISH` placeholder in the session output
(the owner had pasted values into the template). The owner has since moved them to `.env.local`,
blanked the template, and — per the latest message — set real values. Neither current value is
written in any file I created. The token *seen in the transcript* is the one that was in the
template; if the owner's "real" token is the same one, rotating it is still advisable (owner's call).

**Hard-stop check (instruction.md §12):** none triggered. The closest calls are Chapter 4 and
Chapter 1 (thin). Revision 2 replaces the earlier qualitative judgement with a per-section
**capacity check** (§5.0) and a build-time **stop gate** (§11); both papers pass on the evidence
available now, Ch 4 by the narrowest margin.

---

## 2. Problem statement and users

Mily (Class IV, Atomic Energy Education Society, 2025-26) needs English practice papers for the
Half-Yearly portion, in the same format and feel as the Maths site.

- **Child (practice mode):** reads a paper on screen or in print and writes in a physical workbook.
  Sees questions and mark values only. English is judgement-heavy, so the child also copies
  passages for handwriting and writes sentences and short paragraphs.
- **Parent (checking mode, secret-gated):** compares the workbook with the model answer and awards
  marks. For every judgement item the parent needs a **band rubric** (instruction §6.2), because
  English marking is otherwise guesswork.

v1 delivers the *content*: six chapter papers (100 marks each) + one Half-Yearly mock (100 marks),
plus the schema, validator and reuse-detector that guard it. v2 delivers the app and deployment.

---

## 3. Confirmed Project Card and section blueprint

### 3.1 Evidence — what the three samples actually are

`source/samples/` holds **three single-lesson monthly worksheets of 40 marks each, and no full
revision paper.** The file names are `1.1.1 IV ENGL-6 WS`, `1.1.2 IV ENG L-5 WS`,
`1.1.3 IV ENG POEM-3 WS`. All three are headed "Atomic Energy Education Society — Worksheet
(2025-26)", Class IV, English, **Marks 40**; none prints a duration.

| Sample | Month / portion (as printed) | Section headings, verbatim | Marks |
|---|---|---|---|
| **L-6** | August · "Lesson 6 (Braille)" | `SECTION-A (READING) 10M` · `SECTION-B (TEXTUAL QUESTIONS) 5M` · `SECTION-C (CREATIVE WRITING) 5M` · `SECTION-D (GRAMMAR) 7M` · `SECTION-E (VOCABULARY) 5M` · `SECTION-F (SPELLING) 5M` · `SECTION-G(HANDWRITING) 3M` | 10+5+5+7+5+5+3 = **40** |
| **L-5** | July · "Lesson 5 .The Old Stag" | `Section –A Reading Comprehension (10M)` · `Section-B Textual Question( 5M)` · `Section-C Creative writing ( 5M)` · `Section-D Grammar( 8M)` · `Section-E Vocabulary ( 5M)` · `Section-F Spelling ( 5M)` · `Section-G Handwriting ( 2M)` | 10+5+5+8+5+5+2 = **40** |
| **Poem-3** | June 2025 · "3 Be Smart, Be Safe" | `SECTION-A (READING)` (I 5 + II 5 Marks) · `SECTION -B (WRITING)` (2 + 5 + 3) · `SECTION -C (VOCABULARY)` (2½ + 2½ + 2 + 3) · `SECTION D (TEXT BOOK BASED QUESTIONS)` (`2x5=10 Marks`) | 10+10+10+10 = **40** |

Block patterns quoted from the samples:

- **L-6 A:** `1) … 1M` ×5 (wh- questions) + "one word from the passage `3M`" + "past tense `2M`".
  **B:** `1M · 2M · 2M`. **C:** "Write 5 sentences about Braille script." **D:** `D1 … 3M`, `D2 … 2M`,
  `D3 … 2M`. **E:** "Match … `5M`". **F:** "Circle the correct spelling `2M`" + "Rearrange the jumbled
  letter `3M`". **G:** "Write the following lines in neat handwriting `3M`".
- **L-5 A:** two 5M passages (one unseen, one a textbook paragraph), each with a five-part "Q1".
  **B:** "Who said …" `(1M)` + "Answer the following questions `(4M)`". **C:** "Write about your best
  friend and complete the paragraph `(5M)`". **D:** six numbered blocks `1M ×5 + 3M`.
- **Poem-3 A:** five MCQs `(5 Marks)` + four short answers and two True/False `(5 Marks)`. **B:** classify
  safe/unsafe `(2Marks)`, "Write five sentences about the given picture `(5 Marks)`", "Make sentences
  `(3 Marks)`". **C:** countable/uncountable `2½`, plurals `2½`, odd one out `2`, articles `3`.

Page images and text layers agreed everywhere; the images added only the **two pictures in Poem-3**
(a street scene for "five sentences about the given picture"; a row of road-sign symbols).

### 3.2 Decision (§5): **skill-based**, seven sections, A–G

Not outcome-based: no sample uses Knowledge / Understanding / Ability to Express / Creative Ability.
Two of three samples (L-5, L-6 — the two most recent months) share one seven-section order; Poem-3
(the earliest, June) is a coarser four-section sheet whose content maps onto the same seven.
Keep the **order and relative weighting** of L-5/L-6, with titles **verbatim from L-6** (the latest
sheet; upper-case in print, stored in title case):

| Code | Title | Scaled marks |
|---|---|---|
| A | Reading | 25 |
| B | Textual Questions | 13 |
| C | Creative Writing | 12 |
| D | Grammar | 19 |
| E | Vocabulary | 13 |
| F | Spelling | 12 |
| G | Handwriting | 6 |
| | **Total** | **100** |

### 3.3 Scaling arithmetic (40 → 100, factor 2.5)

L-5 and L-6 differ in D (8 vs 7) and G (2 vs 3); take the mean, multiply by 2.5, round to integers:

| | A | B | C | D | E | F | G | Σ |
|---|---|---|---|---|---|---|---|---|
| L-6 (/40) | 10 | 5 | 5 | 7 | 5 | 5 | 3 | 40 |
| L-5 (/40) | 10 | 5 | 5 | 8 | 5 | 5 | 2 | 40 |
| mean (/40) | 10 | 5 | 5 | 7.5 | 5 | 5 | 2.5 | 40 |
| × 2.5 (raw) | 25.00 | 12.50 | 12.50 | 18.75 | 12.50 | 12.50 | 6.25 | 100 |
| floor | 25 | 12 | 12 | 18 | 12 | 12 | 6 | 97 |

Three points remain (largest-remainder rounding): D (.75) takes one. **B, C, E, F, tie at .50**, leaves
two: they go to **B and E**, because Poem-3 — the only sample that disagrees — weights *Textual*
(10/40) and *Vocabulary* (10/40) double the others. Result **25 · 13 · 12 · 19 · 13 · 12 · 6 = 100**.
This tie-break is a judgement call, recorded as D2; the owner may overrule it before Task 5 (the
first paper).

### 3.4 Block patterns — school → ours

A literal mirror is impossible: L-6 has ~32 scorable parts in 40 marks, so ×2.5 gives ~80 items
against the blueprint's 45–60 cap. Rule adopted: **keep the school's blocks, their order and their
question types; scale marks per block; compress same-type sub-parts (a, b, c) into one multi-part
item or raise the mark per item.** Integer marks throughout (the school's `2½` is not carried over).

| Sec | Block → marks (item type × count) | Items |
|---|---|---|
| **A 25** | **A1** unseen original passage, 13 marks: `mcq` 3×1 + `short` 2×2 + `true-false` 2×1 + `one-word` (from the passage) 4×1 (11 items). **A2** chapter-linked original text, 12 marks — a passage, or an 8-line poem for the two poem chapters: `short` 3×2 + `fill-blank` 3×1 + `true-false`/`mcq` 3×1 (9 items) | 20 |
| **B 13** | B1 "Who said / Name any two" `one-word` 3×1 · B2 "Answer the following" `short`/`long` 5×2 (one is a "Think and discuss" opinion item with a rubric) | 8 |
| **C 12** | C1 "Write five sentences about …" 5 (**with an OR**, one alternative may be a picture prompt) · C2 "Complete the paragraph / dialogue / letter" 4 · C3 "Make sentences" 3×1 | 5 |
| **D 19** | D1 fill-blank / choose from brackets 5×1 · D2 convert / rewrite 3×2 · D3 do-as-directed (circle, underline, helping verb) 4×2 — **chapter's grammar point only** | 12 |
| **E 13** | E1 `match` 1 item × 5 · E2 opposites / word-in-context 2×2 · E3 odd-one-out / use-the-word 2×2 | 5 |
| **F 12** | F1 "Circle the correct spelling" 3×2 · F2 "Rearrange the jumbled letters" 3×2 (words from the chapter) | 6 |
| **G 6** | G1, G2 "Write the following lines in neat handwriting" 2×3 (original copy text, `handwriting` type) | 2 |
| | **Totals** | **58** |

Item budget: 58 sits inside 45–60 with two spare, so **if a paper overshoots, merge same-type parts
into a multi-part item rather than delete a block.**

Difficulty target 40 / 40 / 20 (recall / understanding / application) by `difficulty` easy / medium / hard.

### 3.5 Project Card (to be written as `PROJECT-CARD.yml` in Task 1)

```yaml
subject_code:        english
subject_display:     English
grade:               4
board_or_school:     "Atomic Energy Education Society"
academic_year:       "2025-26"
locale:              en
numerals:            latn
content_language:    English
textbook:            "Santoor, Grade 4 (English)"   # confirmed: every page footer reads "Santoor Grade 4"; no cover in source/
chapters:            6                                # confirmed: 6 files, desa101–desa106, all titles read
extra_papers:        [ { code: hy, title: "Half-Yearly Mock Paper (Chapters 1–6)" } ]
sets_per_chapter:    1
total_marks:         100
duration_minutes:    120   # ASSUMED — NOT in source (worksheets print none). Owner to confirm. See D4.
repo_name:           mily-english-abhyas
vercel_project:      mily-english-abhyas
student_login:       { user: "Mily", pass: "2026" }
marking_secret_env:  GANESH_ENGLISH
section_blueprint:   # §3.2–3.3
  - { code: A, title: "Reading",           marks: 25 }
  - { code: B, title: "Textual Questions", marks: 13 }
  - { code: C, title: "Creative Writing",  marks: 12 }
  - { code: D, title: "Grammar",           marks: 19 }
  - { code: E, title: "Vocabulary",        marks: 13 }
  - { code: F, title: "Spelling",          marks: 12 }
  - { code: G, title: "Handwriting",       marks: 6 }
paper_overrides:     # §3.6 — Ch 1 and Ch 4 only; every other paper uses section_blueprint above
  ch1: &thin_poem
    profile: thin-poem
    section_blueprint:
      - { code: A, title: "Reading",           marks: 30 }
      - { code: B, title: "Textual Questions", marks: 10 }
      - { code: C, title: "Creative Writing",  marks: 20 }
      - { code: D, title: "Grammar",           marks: 20 }
      - { code: E, title: "Vocabulary",        marks: 20 }
    difficulty_target: { easy: 20, medium: 40, hard: 40 }   # % of items; standard papers use 40/40/20
    hard_floor_pct: 35                                       # validator: hard items ≥ 35 % of items
    require_chapter_source: true                             # §3.6 capacity ledger
  ch4: *thin_poem
chapter_list:        # titles as printed on each chapter opener
  - { n: 1, file: desa101, title: "Together We Can",        unit: "Unit 1: My Land" }
  - { n: 2, file: desa102, title: "The Tinkling Bells",     unit: "Unit 1: My Land" }
  - { n: 3, file: desa103, title: "Be Smart, Be Safe",      unit: "Unit 1: My Land" }
  - { n: 4, file: desa104, title: "One Thing at a Time",    unit: "Unit 2: My Beautiful World" }
  - { n: 5, file: desa105, title: "The Old Stag",           unit: "Unit 2: My Beautiful World" }
  - { n: 6, file: desa106, title: "Braille",                unit: "Unit 2: My Beautiful World" }
```

Chapter numbers come from the printed openers, not the file names. They agree with the samples'
own lesson numbers (Lesson 3 Be Smart Be Safe, 5 The Old Stag, 6 Braille). `chapters: 6` equals
the file count, so no stop-and-report.

### 3.6 Thin-poem profile — Chapters 1 and 4 (owner decision, Revision 2)

**Why.** Ch 1 and Ch 4 are built on a 64-word and a 68-word poem. The standard 58-item, seven-section
paper would need ~13 marks of Textual questions and a full Spelling and Handwriting section from
that thin base, or padding from outside the chapter. Instead these two papers stay at **100 marks,
45–60 items**, but the marks move to the sections whose material is *not* limited by poem length:
the original unseen text(s), Grammar, Vocabulary and Creative Writing. Section marks are multiples
of ten.

**Section marks** (verbatim titles and the standard order are kept; F and G are not carried):

| Code | Title | Standard | **Thin-poem** |
|---|---|---|---|
| A | Reading | 25 | **30** |
| B | Textual Questions | 13 | **10** |
| C | Creative Writing | 12 | **20** |
| D | Grammar | 19 | **20** |
| E | Vocabulary | 13 | **20** |
| F | Spelling | 12 | — (folded into E) |
| G | Handwriting | 6 | — (not carried) |
| | | 100 | **100** |

**Why five sections and not seven.** Seven sections in multiples of ten need at least 10 each — 70
marks — leaving three tens to share. The owner asked to weight four sections at once (unseen
passage, grammar, vocabulary, writing), and seven floors of ten make that arithmetically
impossible. Dropping F and G is the only way to weight all four, and the school's own Poem-3
worksheet carries neither. Spelling practice survives inside Vocabulary (E4, E5 below); **handwriting
practice is not carried in these two papers.** *(Owner-confirmed 2026-09-19.)* The rejected
seven-section alternative was **A 20 · B 10 · C 20 · D 20 · E 10 · F 10 · G 10** (Vocabulary not
weighted above the floor).

**Block patterns** (same for both papers; contents in §5.0). Marks by block, item type × count:

| Sec | Marks | Blocks | Items |
|---|---|---|---|
| **A** | 30 | **A1** unseen original passage (110–150 words) 16: `mcq` 3×1 + `short` 3×2 + `true-false` 2×1 + `one-word` 2×1 + one 3-mark two-part item. **A2** original chapter-linked 8-line poem 14: `short` 3×2 + `fill-blank` 3×1 + `mcq` 2×1 + one 3-mark two-part item | 20 (11 + 9) |
| **B** | 10 | B1 "Answer the following" `short` 5×2, on the chapter's own poem and activities | 5 |
| **C** | 20 | C1 "Write five sentences about …" 5 (**OR**) · C2 guided paragraph 5 · C3 scenario / picture writing 5 · C4 "Make sentences" 5×1 | 8 |
| **D** | 20 | D1 fill-blank / choose from brackets 6×1 · D2 convert / rewrite 3×2 · D3 application 2×4 — the chapter's own grammar point(s) only | 11 |
| **E** | 20 | E1 `match` 1×5 · E2 word-box fill 4×1 · E3 word pairs (rhymes / groups from the chapter) 2×2 · E4 "Circle the correct spelling" 2×2 · E5 "Rearrange the jumbled letters" 1×3 | 10 |
| | **100** | | **54** |

Arithmetic: A 16+14 = 30 (items 3+3+2+2+1 = 11, and 3+3+2+1 = 9); B 5×2 = 10; C 5+5+5+5×1 = 20;
D 6+6+8 = 20; E 5+4+4+4+3 = 20; total 100 marks, **54 items** (inside 45–60). Marks per item stay 1–5.

**Difficulty mix — skewed harder.** Standard papers target 40/40/20 (easy/medium/hard). These two
target **20/40/40**, with a validator floor of **hard ≥ 35 % of items** (about 19 of 54) and a cap of
50 %. The purpose is a stronger student who finds the standard papers easy.

**Hard means a harder *task*, never harder *language*.** Every item — hard ones included — must pass
the §6.5 checks: authored passages average ≤ 12 words a sentence with none over 20; no authored
word over 3 syllables unless the chapter uses it or the question glosses it; questions ask *what /
who / where / why did X*, never motive, irony, theme or author intent.

| Allowed levers for `hard` | Forbidden |
|---|---|
| a two-part answer drawing on two places in the text | rarer vocabulary, or idiom / figurative language beyond the chapter |
| applying the chapter's rule to a sentence the child composes | longer or more complex sentences than §6.5 allows |
| spot-and-correct a wrong sentence | any grammar, tense or word-form the chapter does not teach |
| sequencing four or five events or steps | "why do you think …" questions about motive, theme or the poet's purpose |
| writing three or more points in own words, with a band rubric | inference that needs knowledge outside the text and chapter |
| a two-step rewrite that stays inside the chapter's grammar point | |

The coordinator audits ten `hard` tags per paper by hand (the Maths build's tags drifted), and the
readability script (Task 4) runs over **every** item, hard or not.

**Capacity gate (the §12 stop).** With `require_chapter_source: true`, every item outside Section A
carries `chapterSource` — the place in the chapter it draws on (e.g. `Let us Learn B`,
`poem l.5`). Section A items say `original-A1` or `original-A2`. **If a paper cannot reach 45 items
and every section's marks from the chapter's own material plus its original A texts, the author
stops and reports — it does not pad with off-chapter content, and it does not lower a section's marks
to fit.** That is the §12 hard stop "a chapter cannot support a full paper without leaving its own
content". §5.0 shows that the capacity check passes on the evidence available now.

---

## 4. Scope

**In scope for v1**

1. `source/INTAKE.md` per instruction §3 (inventory, pages, text layer, per-chapter title / genre /
   word count / new vocabulary / grammar points, sample headings and block patterns quoted, and the
   sample-only-topic list of §5.2 below, and — for Ch 1 and Ch 4 — the **prompt and word inventory**
   that §5.0's capacity check depends on). `source/.text-cache/` (generated by `similarity.py`).
2. `PROJECT-CARD.yml`, `package.json` (`validate` script), folder check.
3. Schema additions (§8) and `validate.js`, proved against bad fixtures (the five named in §10 plus
   four for the thin-poem and mock checks) before any paper relies on it.
4. `scripts/similarity.py` (shingle pass hard-fail, semantic pass warning, cached `.npy`).
5. Six chapter papers + one mock: `app/data/english-ch1.json` … `english-ch6.json`, `english-hy.json`.
6. Original figures in `app/assets/` (§7), each viewed once at 2×.
7. Coordinator cross-paper verification (not delegated), `sprints/v1/walkthrough.md`, and a drafted
   `sprints/v2/instruction.md` adapted from the Maths v2 brief (fewer figures, longer text stimuli,
   rubric display in checking mode).

**Out of scope for v1** — all v2 work (app shell, both modes, marking UI, result, print, `build.js`,
`GANESH_ENGLISH` hashing, README, Vercel deploy, Playwright) and `BLUEPRINT.md` §15: server-side
answers, per-child accounts, auto-grading, randomised question banks, analytics. No `ui/en.json`.

---

## 5. Per-paper plan

All six chapters have a text layer; the pages are figure-heavy (100–297 embedded images each), so
**figures in the textbook are not in the extracted text** — papers must not depend on textbook
pictures. Page counts are the "length" measure used below (extracted word counts include
word-search letters and activity boilerplate, so they overstate Chapter 2).

Chapters **2, 3, 5 and 6** follow §3.4 exactly: A1 = original unseen passage; A2 = original
chapter-linked text; B built on the chapter's "Let us Think" ideas (re-worded); C on its "Let us
Write" ideas (re-framed); D on its one grammar point; E on its "New Words" and the vocabulary the
text uses; F on words from the chapter; G on original copy text. **Chapters 1 and 4 use the
thin-poem profile of §3.6** and are planned in §5.0.

| Ch | Title · genre · pages | Text | Vocabulary the chapter supplies | Grammar the chapter teaches |
|---|---|---|---|---|
| 1 | **Together We Can** · poem (10 lines, 64 words, "Let us Recite") + activities · 8 pp | teamwork, unity | collective nouns (herd, swarm, pack, bunch, bouquet, choir, grove); team, bond, trust, cheer, unity | prepositions of place (behind, between, near, in front of); simple future with *will* |
| 2 | **The Tinkling Bells** · story (honesty) · 16 pp | Chinna, the lost money, the fruit-seller's extra change | tinkling, shopkeeper, mischievous, consoled, honest, praised, reward, whispered; value words (calm, honest, loyal, respect, courage, truth, fair, kind, peace) | comparative and superlative adjectives (-er/-est, *than*); opposites; sequencing events |
| 3 | **Be Smart, Be Safe** · letter + six road-safety rules (non-fiction) · 10 pp | traffic police letter, Rules 1–6 | **New Words:** pedestrian, footpath, reflective, distract; zebra crossing, traffic lights | countable vs uncountable nouns; letter writing |
| 4 | **One Thing at a Time** · poem (16 lines, 68 words, rhyming) + activities · 8 pp | focus, work and play | might, useful, moments (glossed in the book) | *is/are* + action word + *-ing*; silent *l* (calm, palm…); a.m./p.m. |
| 5 | **The Old Stag** · story (Panchatantra, "adapted") · 12 pp | greed vs sharing | **New Words:** lush, stag, hillock, tender, sheltering, recovery; describing words | adverbs of manner (-ly); describing words |
| 6 | **Braille** · non-fiction / biography (Louis Braille) · 12 pp | Braille, "Night Writing" | **New Words:** blacksmith, blind, pincushions, invented; institute, simplify, affect, nearby | past continuous (*was/were* + *-ing*) |

**Notes that shape the papers**

- **Poem chapters (1, 4) are the thin ones** (8 pp each; 64 and 68 words of poem). They use the
  **thin-poem profile** (§3.6): five sections, 30/10/20/20/20, harder mix, capacity gate. They carry
  their weight through the two original texts, the chapter's grammar re-used with fresh sentences
  (allowed by instruction §6.6), the vocabulary and the writing tasks. A2 for these two is an
  **original 8-line poem** (`stimulus.kind: "poem"`, `original: true`). Ch 4 is the highest-risk
  paper (§5.0, §12 R5).
- **Ch 3 is not a poem** despite the sample being filed `POEM-3`. It is a letter and a rule list.
- **Chapters 1, 2 and 4 have no sample worksheet.** Their item styles are extrapolated from the
  L-5/L-6 pattern. Nothing in the samples shows how the school treats a poem lesson (§12 R6).
- **The school samples are not free of the textbook.** L-6's Section A passage and L-5's B passage are
  the chapter's own paragraphs, and 3–12% of each sample's 10-word windows occur verbatim in the
  textbook. Our A1 and A2 must be **original**, so this is a deliberate difference from the school.
- **Quote hazard (§12 R3).** A textbook line under 15 words is a legitimate `q` basis (§6.1), but the
  samples already use several (e.g. "Get well soon, dear stag!"; "Why should you hold an adult's hand
  while crossing the road?"). Such a `q` would trip the 6-word shingle hard-fail. Choose different lines.

### 5.0 Chapters 1 and 4 — thin-poem plans (§3.6 profile: A 30 · B 10 · C 20 · D 20 · E 20)

Both papers: 100 marks, 54 items, hard target ~21 of 54 (≈ 39 %; floor 35 %). Indicative hard slots:
A 5 (the two 3-mark two-part items and three inference shorts), B 3, C 4, D 6, E 3. Every item outside
Section A carries `chapterSource`. Counts in the capacity table are **my reading of the chapter text**;
Task 1 (`INTAKE.md`) must list the actual prompts and words for these two chapters, and Tasks for
Ch 1 and Ch 4 begin only if that list clears the thresholds in the last column.

**Ch 1 — Together We Can** (poem, 10 lines)

| Block | Draws on (chapter's own material) | Note |
|---|---|---|
| A1 / A2 | original unseen passage "watering turns in the school garden" (~120–150 words); original 8-line poem, a relay race at sunset | both original (§6); A2 mirrors the chapter's *genre and theme*, never its lines |
| B 5×2 | the 10 poem lines (line-pair meanings: helping, "win or lose … share", "each hand joined, the goal is near"); "Let us Think" A1–A2, B1–B4; the honeybee and ant facts | quote at most one line under 15 words per block, and not a line the samples used |
| C | "Let us Speak" (favourite food and festival, on an original frame); "Let us Write" (what is X doing, what will happen next — re-set as written scenarios, no textbook picture); "Let us Think" B3–B4 (a game you lost; uniting two disagreeing teammates — a hard 5-mark item); "Let us Do" (a symbol of togetherness) | |
| D | prepositions of place — *behind, between, near, in front of* — on original map F1 (6×1); future with *will* (3×2); two 4-mark applications (compose, correct) | two grammar points, fresh sentences (§6.6); no other preposition, no other tense |
| E | collective nouns (bundle, herd, pack, bunch, bouquet, grove, swarm, choir); teamwork words from the poem and activities | **`acceptable` must list both *bunch* and *bouquet* for "of flowers"** — the textbook accepts either |

**Ch 4 — One Thing at a Time** (poem, 16 lines, four rhyming stanzas)

| Block | Draws on | Note |
|---|---|---|
| A1 / A2 | original unseen passage "a grandfather mends watches one at a time" (~125–150 words); original 8-line poem, a child's morning routine | both original; the chapter's poem is not reproduced |
| B 5×2 | the four stanzas (work and play; "things done by halves"; "one thing at a time … done well"; "moments … trifled away" — glossed in the question); "Let us Think" A1–A4, B | avoid "How do you feel after finishing a task that you have done well?" — L-5 uses it verbatim (R3) |
| C | "My Routine" (table, then paragraph, on an original frame); "Let us Speak" picture on original park scene F3 (who — is/are — doing what); "Let us Do" holiday activities; a task finished well, re-worded | |
| D | *is/are* + action word + *-ing* (choose, add *-ing*, rewrite, scramble, spot-and-correct, compose from a who–is/are–doing-what table); a.m./p.m. usage | **one grammar point** carries 11 items — legal under §6.6, but the tightest section |
| E | *might, useful, moments* (chapter-glossed); *trifled, halves* (poem — glossed in the question); the poem's rhyme pairs; the silent-*l* words from "Let us Listen" (calm, palm, calf, chalk, talk, balm); routine words (routine, recess, period, playground) | E4 circle-spelling on the silent-*l* words; **narrowest margin in either paper** |

**Capacity check** — slots each paper must fill vs. prompts or words the chapter's own material supplies:

| Section | Slots | Ch 1 supplies | Ch 4 supplies | Threshold to proceed |
|---|---|---|---|---|
| B | 5 questions | ≥ 13 (6 "Let us Think", 5 line-pair meanings, 2 facts) | ≥ 9 (5 "Let us Think", 4 stanzas) | ≥ 8 distinct prompts |
| C | 3 tasks + 5 make-sentence words | ≥ 10 tasks (1 + 5 + 3 + 1); ≥ 15 words | ≥ 7 tasks (2 + 1 + 1 + 2 + 1); ≥ 12 words | ≥ 6 tasks, ≥ 10 words |
| D | 11 items | 2 grammar points | **1 grammar point** + a.m./p.m. | ≥ 1 point with ≥ 8 distinct item formats |
| E | ~20 word uses | 23 distinct words (8 collective nouns + 15) | **21 distinct words** (5 + 6 rhyme + 6 silent-*l* + 4), reuse across meaning and spelling allowed | ≥ 20 distinct words |
| **Verdict** | | **passes**, margin 3 words | **passes, margin 1 word** — the paper most likely to trip the stop | |

Ch 4 clears the thresholds only narrowly. That is not the §12 stop, because 21 ≥ 20 and the D formats
number eight; but if `INTAKE.md` finds even one of the listed words unusable (ambiguous, above
Class 4, or not in the chapter), Ch 4 fails the threshold and **that is the stop**: report it, do not
top up from outside the chapter.

### 5.1 Half-Yearly mock — chapter-to-marks allocation

Same seven-section blueprint as the chapter papers (there is no Half-Yearly model to copy — §12 D1).
Allocation by **page count**, over the marks that are attributable to a chapter:

| Pool | Marks | Note |
|---|---|---|
| General — unseen passage A1 | 13 | original, chapter-agnostic |
| General — sample-only topics (§5.2) | 8 | 7 topics × 1 item; plurals carries 2 marks |
| Chapter-attributed | **79** | split below |

Pages 8 / 16 / 10 / 8 / 12 / 12 (total 66) → ×79/66 = 9.58 / 19.15 / 11.97 / 9.58 / 14.36 / 14.36 →
largest-remainder rounding:

| Chapter | Pages | Marks |
|---|---|---|
| 1 Together We Can | 8 | 10 |
| 2 The Tinkling Bells | 16 | 19 |
| 3 Be Smart, Be Safe | 10 | 12 |
| 4 One Thing at a Time | 8 | 10 |
| 5 The Old Stag | 12 | 14 |
| 6 Braille | 12 | 14 |
| *(general, unseen A1)* | — | 13 |
| *(general, sample-only)* | — | 8 |
| **Total** | 66 | **100** |

Each mock item carries `sourceChapter` (§8), so this table is checkable with `jq`. The mock's A2
is an original text linked to one chapter (counts toward that chapter's marks). The mock is a fresh
sibling, not a remix: **no item may be a chapter item with names or objects swapped**, and the
semantic pass of `similarity.py` is run mock-against-chapters specifically for that.

### 5.2 Sample-only topics — tested by the samples, **not** taught by the six chapters

Excluded from every chapter paper; appear only in the mock (1 item each):

| Topic | Where the samples test it | Chapter position |
|---|---|---|
| Plural nouns (cat/box/baby/man/tomato) | Poem-3 C-II | not taught |
| Articles *a / an / the* | Poem-3 C-IV | not taught |
| Personal pronouns (he/she/his/we/her/it) | L-5 D-6 | Ch 5 note says only "revise" |
| Synonyms ("similar word which means the same") | L-5 A-3 | not taught (Ch 2 teaches opposites only) |
| Suffix *-ness* | L-5 D-5 | not taught |
| Simple past of irregular verbs (feel→felt, grow→grew, fall→fell) | L-5 A-4, D-4 | Ch 6 note says only "revise" |
| Odd one out | Poem-3 C-III | a format, not taught |

This list is provisional until INTAKE.md confirms each against the chapter text.

---

## 6. Unseen-passage plan (instruction §6.1)

One **A1 unseen passage per paper**, written by me, original (`"original": true`), 100–150 words,
short sentences, concrete nouns, Indian settings, avg sentence ≤ 12 words, none over 20. The
school's own "tiny seed" passage (shared by L-5 and Poem-3; 73 common 10-word windows) is **off
limits**, as are all textbook and sample passages. Plus one **A2 chapter-linked original text**
(60–90 words, or an 8-line poem for Ch 1 and 4). Themes are chosen to differ from the chapter's plot.

| Paper | A1 unseen (theme, ~length) | A2 chapter-linked original |
|---|---|---|
| Ch 1 | Class IV children take turns watering the school garden in the holidays · ~120 w | poem: a relay race at sunset · 8 lines |
| Ch 2 | A boy finds a neighbour's cricket ball and returns it · ~130 w | three kites of different heights (comparison) · ~70 w |
| Ch 3 | A rainy morning at a bus stop (queueing, umbrellas) · ~120 w | a note on kitchen safety at home (countable/uncountable nouns) · ~75 w |
| Ch 4 | A grandfather mends watches one at a time · ~125 w | poem: a child's morning routine · 8 lines |
| Ch 5 | A mango tree on a hill road shared by a village · ~130 w | a village pond and its fish (using resources wisely; adverbs) · ~75 w |
| Ch 6 | A girl's diary of a hill-train journey · ~130 w | a busy market scene told in the past continuous · ~80 w |
| Mock | A monsoon picnic in a park · ~140 w | linked to one chapter (chosen in Task 11) · ~80 w |

Handwriting copy texts (G) and the C-block paragraph frames are also original. The school's
"My best friend's name is … studies in class IV … wants to be a …" frame appears in L-5 **and** the
textbook (Ch 5) — do not reuse it; frame Ch 5's paragraph differently (e.g. a pet, or a helper).

Mechanical readability (§6.5) is recorded per paper with numbers in the walkthrough; a human reads
every question before the sprint closes, and the checks are not a substitute for that.

---

## 7. Figure inventory

English needs few. Every figure is original SVG in `app/assets/`, `currentColor` strokes, a text
`caption` that does **not** state an answer, viewed by me at 2× before acceptance. A question that
depends on a figure I have not produced is rewritten as text.

| # | File | Used by | What | Caption must not say |
|---|---|---|---|---|
| F1 | `english-ch1-map.svg` | Ch 1 D | small street map (bank, school, post office, hospital, bookstore, park) for place prepositions | where anything is relative to anything else |
| F2 | `english-ch3-signs.svg` | Ch 3 E/B | four road-sign icons for "write what the sign means" | what any sign means |
| F3 | `english-ch4-park.svg` | Ch 4 C | park scene, several people doing different things (*is/are + -ing*) | the actions |
| F4 | `english-ch6-story.svg` | Ch 6 D/C | four-panel picture story for past-continuous sentences | what happens in each panel |
| F5 | `english-hy-scene.svg` | Mock C1 (OR) | picture-composition scene | the events depicted |

At most five figures; the count drops if a paper is written without its picture item. The
walkthrough must list any figure not viewed (target: none).

---

## 8. Schema changes versus `BLUEPRINT.md` §5

Base is the blueprint's schema 2.0 and the Maths adaptations. Additions:

1. **`stimulus.original`** (boolean) — required on `passage` and `poem` stimuli. `true` for all mine.
   A poem may be `false` only with a public-domain `sourceRef`.
2. **`acceptable`** — required on every `fill-blank` and `one-word` item; array of accepted strings
   including the primary `answer`. For a multi-blank item, an **array of arrays**, one per blank.
3. **`difficulty`** — `easy | medium | hard`, **required** on every item (optional in the blueprint).
4. **`sourceChapter`** (integer 1–6) — required on every item of `english-hy` only; drives §5.1.
5. **`stimulus.kind`** already allows `passage | poem`; a `handwriting` item's copy text lives in
   `stimulus.text` (instruction §6.4). A dictation/spelling item, if any, puts one word per
   `answerPoints` entry. (The samples test neither dictation nor cursive; not planned.)
6. **Integer `marks`** everywhere; each paper `totalMarks: 100`, `durationMinutes` from the card.
7. **Item ids:** `english-c{n}-s{section}-b{block}-i{item}` (chapter papers) and
   `english-hy-s{section}-b{block}-i{item}` (mock); `s1…s7` = sections A…G.
8. **Curly typography:** blanks are exactly `_____`; **no straight `"` or `'` anywhere in content**
   (apostrophes are `’`), which the validator enforces.
9. **`chapterSource`** (string) — required on every item **outside Section A** in papers whose card
   entry has `require_chapter_source: true` (Ch 1, Ch 4): the place in the chapter the item draws on.
   Section A items in those papers carry `original-A1` or `original-A2`. This is the capacity ledger
   of §3.6, checkable by machine.
10. **Per-paper section profile** — `PROJECT-CARD.yml` gains `paper_overrides` (§3.5). A paper's
    `sections` must match its override when one exists, else the top-level `section_blueprint`.
    Section codes for the thin-poem papers are `A–E`; item ids use `s1…s5`.

`match` stays a single multi-mark item (one row in the marking UI, `pairs`), so E1 costs one item.
Multi-part same-type parts (D-blocks, one-word-from-passage) may be one item with `blanks: n`.

---

## 9. Validator checks (`npm run validate`, zero dependencies)

The blueprint's ten (§5.7): valid UTF-8 JSON and known `schemaVersion`; section marks = Σ items;
paper total = `totalMarks` exactly; ids unique and matching the pattern; non-empty `q` and
`answer`; items > 1 mark have `answerPoints` or `markingGuide`; `mcq` answers ∈ `options` and 3–4
options; referenced assets exist; **45–60 items**; no `TODO`/`TBD`/`lorem`/empty-bracket text.
Plus, from instruction §6:

11. **§6.1** — any 10-word window of a `passage` or `poem` stimulus that also occurs in the extracted
    text of **any file under `source/`** fails. `stimulus.original` present; `original:true` ⇒ no
    hit, `original:false` ⇒ `sourceRef` set.
12. **§6.2** — every `long`, `handwriting`, `activity`, `draw` and creative-writing item has a
    `markingGuide` that is ≥ 40 characters and contains a digit.
13. **§6.3** — `acceptable` present on every `fill-blank`/`one-word`, containing the `answer`.
14. **§6.4** — every `fill-blank` `q` contains `_____`; no straight quotes; every `true-false`
    instruction contains "True or False".
15. Section codes/titles/marks equal the card's `section_blueprint` in order — **or the paper's
    `paper_overrides` profile** (Ch 1, Ch 4: 30/10/20/20/20); `difficulty` present;
    `sourceChapter` on every mock item and the mock's per-chapter marks equal §5.1.
16. **Thin-poem papers only** (`paper_overrides`): `hard` items are ≥ `hard_floor_pct` (35 %) and
    ≤ 50 % of items; `chapterSource` present on every item outside Section A; Section A items say
    `original-A1` / `original-A2`.

Readability (avg sentence ≤ 12 words, none > 20, no > 3-syllable word unless in the chapter or
glossed, question stems limited to what / who / where / why-did-X) is **not** in `validate.js`: it is
a separate single-owner script (Task 4) so it can run over every item and print numbers for the
walkthrough.

Curriculum fidelity ("was this method taught in the chapter?") stays **by hand** — the Maths
Euler's-formula bug passed every automated check. That is stated in the walkthrough as a limitation.

---

## 10. Acceptance criteria for v1 (each testable by a command)

| # | Criterion | Command / evidence |
|---|---|---|
| 1 | Seven papers exist | `ls app/data/english-*.json \| wc -l` → 7 |
| 2 | Validator passes on all | `npm run validate` exits 0 |
| 3 | Validator rejects each bad fixture with the *named* error: wrong total, missing rubric, missing `acceptable`, copied passage, straight quote — **plus** thin paper with hard < 35 %, thin paper missing `chapterSource`, thin paper with wrong section marks, mock with a per-chapter mismatch; good standard and good thin fixtures pass | `node scripts/test-validator.js` (Task 2) exits 0 |
| 4 | Every paper totals 100; section marks equal the card (Ch 1 and Ch 4: their `paper_overrides` profile 30/10/20/20/20) | `jq '[.sections[].marks]\|add'` → 100; `jq '[.sections[].marks]'` → `[30,10,20,20,20]` for `english-ch1` and `english-ch4`; validator |
| 5 | Item count 45–60 per paper | `jq '[.sections[].blocks[].items[]]\|length'` |
| 6 | Reuse check clean | `python3 scripts/similarity.py` exits 0; every semantic pair ≥ 0.85 listed in walkthrough with a judgement |
| 7 | Mock allocation matches §5.1 | `jq` sum of `marks` by `sourceChapter` = 10/19/12/10/14/14 |
| 8 | Every passage/poem stimulus `original:true`; none from the samples or textbook | validator check 11 |
| 9 | Readability numbers recorded per paper (avg sentence ≤ 12, max ≤ 20, no >3-syllable word unless glossed) | script output pasted into walkthrough |
| 10 | Every figure exists and was viewed | `ls app/assets`; walkthrough list of "viewed / not viewed" (target: none unviewed) |
| 11 | Every paper's items human-read | walkthrough states it, and the limits of §9 |
| 12 | One commit per paper/task | `git log --oneline` |
| 13 | No secret in the repo | `git grep -c` for the token prefix and for the marking code → 0 (count only) |
| 14 | Card and INTAKE complete | `PROJECT-CARD.yml` parses; `source/INTAKE.md` covers all 9 files |
| 15 | v2 brief drafted | `sprints/v2/instruction.md` exists; `sprints/v1/walkthrough.md` exists |
| 16 | Ch 1 and Ch 4 are harder, by task not by language | `jq '[.. \| objects \| select(.difficulty?=="hard")] \| length'` ≥ 19 of the paper's items (35 %) and ≤ 27 (50 %); the readability script (criterion 9) covers **every** item; walkthrough records the hand audit of 10 `hard` tags per paper |
| 17 | Ch 1 and Ch 4 stay inside their chapter | every item outside Section A has a non-empty `chapterSource`; the `INTAKE.md` inventory clears the §5.0 thresholds **before** either paper is written (else stop and report — §12) |
| 18 | Maths validator read before adaptation | Task 2 log shows `../mily-maths-abhyas/validate.js` and both Maths walkthroughs read first |

---

## 11. Sub-agent write-scope policy

- A paper sub-agent writes **only** its `app/data/english-*.json` and its own assets. It never
  writes the PRD, card, `TASKS.md`, schema, `validate.js`, `similarity.py`, other papers, or anything
  under `source/`.
- The coordinator (this session) re-reads every file a sub-agent claims to have written, using `jq`
  to print only `id`, `q`, `answer`, `marks`, `markingGuide`, and re-runs
  `npm run validate && python3 scripts/similarity.py` after **every** paper.
- Schema + `validate.js` and `similarity.py` are single-owner tasks, each proved before papers use them.
- Sub-agents are told to check their own chapter's text for what is actually taught, and that the
  A-section texts must be original (never paraphrased from the chapter, the samples or the web).
- **Ch 1 and Ch 4 sub-agents get two extra instructions.** (a) The capacity gate of §3.6: if the
  paper cannot reach 45 items and each section's marks from the chapter's own material plus the two
  original A texts, **stop and report — do not pad, do not lower a section's marks.** (b) The
  hardness rule of §3.6: `hard` means a harder task, never harder language; every item still passes
  §6.5. The coordinator audits ten `hard` tags per paper by hand and re-runs the readability script.
- No sub-agent touches `.env.local`, tokens or deployment. Cross-paper verification is not delegated.

---

## 12. Risks and deviations from the blueprint

### Deviations

- **D1 — The blueprint is derived from a weaker base than the instruction assumes.** The instruction
  expects a "school revision paper" to model the mock and to supply the section blueprint. `source/`
  has **three 40-mark, single-lesson monthly worksheets** and no Half-Yearly paper. Consequences:
  (a) the section blueprint is derived from worksheets, and the samples disagree (7 vs 4 sections;
  D 7 vs 8; G 3 vs 2; Textual 5 vs 10); (b) the mock is modelled on those worksheets, not on a
  revision paper, so its shape is *inferred*; (c) the real Half-Yearly may look different.
  **Owner decision (Revision 2): no full revision paper will be supplied, so D1 stands as a recorded,
  accepted assumption** and is not re-opened. The walkthrough repeats it as a known limitation.
- **D2 — Rounding tie-break** (§3.3): the two leftover marks go to Textual and Vocabulary, following
  Poem-3. A different tie-break is a card edit; do it before Task 5 (the first paper).
- **D3 — Two Reading blocks (A1 + A2)**, where the instruction says "one original unseen passage per
  paper". The samples use two passage blocks (L-5, Poem-3), and 25 marks on one 100–150-word
  passage would overload it. A2 is original and chapter-linked, so §6.1 still holds.
- **D4 — `duration_minutes: 120` is assumed.** Maths confirmed its 180 from a printed "Duration : 3
  Hours"; no English sample prints one. **Owner decision (Revision 2): 120 stands as a recorded
  assumption.** The card keeps the `ASSUMED` comment so the README and v2 can say so.
- **D5 — Integer marks and multi-part items.** The school prints `2½`; we do not. Sub-parts are
  compressed to meet the 45–60 cap (§3.4).
- **D6 — Section titles differ between L-5 and L-6** ("Reading Comprehension" vs "Reading"; "Textual
  Question" vs "Textual Questions"). We follow L-6 (§3.2).
- **D7 — `BLUEPRINT.md` is read from the Maths repo**, not this one (§1).
- **D8 — Instruction §4 names a Maths "Task 12" cross-paper script under `scripts/`;** none exists
  there (only `e2e.js`, `serve.js`, `figures/`). `similarity.py` is written fresh. For this PRD I
  read the Maths v1 PRD's mock section and v1 walkthrough (fixes, Task 12, limitations); I did
  **not** read the v2 walkthrough or `validate.js`. **Owner instruction (Revision 2): at Task 2, read
  `../mily-maths-abhyas/validate.js` and *both* Maths walkthroughs (`sprints/v1/walkthrough.md`,
  `sprints/v2/walkthrough.md`) in full before adapting the validator.** It is Task 2's first step
  and acceptance criterion 18.
- **D9 — Thin-poem profile for Ch 1 and Ch 4 (owner decision, Revision 2).** These two papers depart
  from the blueprint in five ways, all recorded in §3.6 and §5.0:
  (a) **five sections, not seven** — Spelling and Handwriting are not carried; marks are
  **A 30 · B 10 · C 20 · D 20 · E 20** (multiples of ten), against the standard 25/13/12/19/13/12/6.
  This is a *judgement call*: multiples of ten across seven sections cannot weight four sections,
  so the choice was between five sections and seven with a 10-mark floor each (the alternative in
  §3.6). **Owner-confirmed 2026-09-19: five sections; Spelling folded into Vocabulary; Handwriting
  not carried on these two papers;**
  (b) **Reading is 30 marks from two short original texts** — the largest Reading weight in the set;
  (c) **harder difficulty mix**, 20/40/40 with a validator floor of 35 % `hard`, against the
  standard 40/40/20 — for a stronger student, with hardness confined to the *task* (§3.6 lever
  table) and every item held to the §6.5 age gates;
  (d) **`chapterSource` ledger**, required on every non-A item, so the "no off-chapter padding" rule
  is checkable; (e) **a capacity gate that is the §12 stop** if the chapter cannot fill its sections.
  Consequences: section-wise results for Ch 1 and Ch 4 are not comparable with the other four
  chapter papers (no F or G; A is heavier); v2's result screen must render per-paper section lists,
  which the data-driven design already allows (`sections` is an array); the mock keeps the
  seven-section standard and is unaffected.

### Risks

- **R1 — Marking code strength (partly resolved).** The owner replaced the placeholder with a real
  value: it differs from the Maths code and occurs in no repo file. Residual: it is **exactly 10
  characters** (the minimum — the Maths risk review saw a short code collide with page text, so v2
  must still check the code against the built page) and it **contains one of the words *english*,
  *ganesh* or *mily***, which a child who reads the README could guess. The gate is a deterrent for
  a nine-year-old, not security; the owner may still prefer a longer, unrelated code.
- **R2 — `.env.local` mode is 664.** `setup.sh` sets 600; run it or `chmod 600 .env.local`.
- **R3 — Shingle rule vs textbook-quote rule.** §6.1 allows quoting < 15 words of the chapter; §7
  fails any 6-word shingle shared with the sample text; the samples themselves quote the chapter.
  Result: some legitimate quotes will fail. Mitigation: pick lines the samples did not use; the
  allow-list holds only generic instruction phrases (not chapter lines).
- **R4 — Judgement-heavy marking.** Section C, G and the long B items depend entirely on rubrics.
  Mitigation: validator check 12, human read of every rubric.
- **R5 — Thin chapters.** Ch 4 (8 pp, 68-word poem) and Ch 1 (8 pp, 64-word poem) are the
  nearest to the §12 hard stop "a chapter cannot support a full paper". Revision 2 turns this from a
  judgement into a check (§5.0): both pass, **Ch 1 by 3 words, Ch 4 by 1 word** on the Vocabulary
  capacity, and Ch 4's Grammar rests on a single point across 11 items. If `INTAKE.md` or authoring
  shows either paper cannot reach 45 items and each section's marks from its own chapter plus its
  original A texts, **that is the §12 stop: report and do not pad.**
- **R5a — Harder does not mean above-Class-4.** Raising `hard` to ≥ 35 % invites drift toward rarer
  words, longer sentences and abstract "why do you think" questions, the very slip the Maths build
  made. Guards: the §3.6 lever table, the readability script over every item, the hand audit of ten
  `hard` tags per paper, and a human read of every question. The numbers are not a substitute for it.
- **R5b — Repetition in the Ch 4 Grammar section.** Eleven items on one grammar point can read as
  drill. Mitigation: eight distinct item formats (choose, add *-ing*, rewrite, scramble,
  spot-and-correct, compose, build from a table, a.m./p.m.).
- **R6 — No sample covers a poem lesson or Ch 1, 2, 4.** "POEM-3" is mis-filed (content is Ch 3).
  The poem-chapter format is extrapolated from L-5/L-6.
- **R7 — Age-appropriateness slips through automation** (Maths lesson). Mitigated by §6.5 numbers
  plus a human read; I state in the walkthrough that the numbers are not a substitute.
- **R8 — Answer-giving captions/stimuli** (Maths lesson): every caption checked against its items.
- **R9 — Ownership of the Vercel hostname is unconfirmed** (§1 check 5). Accept the assigned URL and
  report it; do not let a same-named project on another account silently take the address.
- **R10 — Textbook PDFs are large (36 MB) and figure-heavy.** `.text-cache/` avoids re-extracting;
  `source/` is committed by `setup.sh`, which is fine but grows the repo.
- **R11 — Disk at ~92 % full** (now ~3.7 GB free). The cached `.npy` and figures are small; do not
  add anything large.
