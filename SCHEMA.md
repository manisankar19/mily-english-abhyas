# SCHEMA.md — paper format for mily-english-abhyas

For anyone writing or editing `app/data/english-*.json`. It is `BLUEPRINT.md` §5 plus the English rules of
`sprints/v1/instruction.md` §6 and `sprints/v1/prd.md` §8. **`validate.js` is the authority**: if this file and the
validator disagree, the validator wins and this file is wrong. Every error prints as `[CODE] message`; the codes
appear below in `code` style.

```bash
npm run validate                 # every app/data/*.json         (exit 1 on any error)
node validate.js app/data/english-ch2.json
node validate.js --strict        # also requires all seven papers
npm run test:validator           # proves the validator against fixtures/ (run before trusting it)
```

## 1. Files, ids, profiles

| Paper | File | `chapter` | Item id |
|---|---|---|---|
| Chapter N (1–6) | `app/data/english-chN.json` | `N` | `english-cN-s{section}-b{block}-i{item}` |
| Half-Yearly mock | `app/data/english-hy.json` | `null`, with `"paperCode": "hy"` | `english-chy-s{section}-b{block}-i{item}` |

- `s` is the **1-based position of the section** (`s1` = first section). `b` and `i` are 1-based positions. `ID_PATTERN`, `DUP_ID`.
- **Ids are stable.** Saved marks are keyed by id. Never renumber; if an item is removed, retire its id, never reuse it.
- **Section profile** comes from `PROJECT-CARD.yml`: `section_blueprint` (seven sections, 25/13/12/19/13/12/6) for Ch 2, 3, 5, 6 and the
  mock; `paper_overrides.ch1` / `.ch4` (five sections, 30/10/20/20/20) for the thin-poem papers. Code, title, order and marks must
  match (`SECTION_PROFILE`); each section's declared `marks` must equal the sum of its items (`SECTION_SUM`).
- Every paper: `totalMarks` 100 (`TOTAL_MISMATCH`), **45–60 items** (`ITEM_COUNT`), `durationMinutes` from the card, `title` equal to
  the card's chapter title or mock title (`TITLE_MISMATCH`).

## 2. Paper object

```jsonc
{
  "schemaVersion": "2.0", "subject": "english", "subjectDisplay": "English", "grade": 4,
  "chapter": 5,                       // or null for the mock, plus "paperCode": "hy"
  "locale": "en", "numerals": "latn",
  "title": "The Old Stag",            // exactly the card's chapter_list title (mock: extra_papers title)
  "subtitle": "English — Class 4 — Chapter 5",
  "sourceRef": "Santoor Grade 4, Ch. 5",
  "totalMarks": 100, "durationMinutes": 120,
  "sections": [ { "code": "A", "title": "Reading", "marks": 25, "blocks": [ … ] } ]
}
```

A **block** is one numbered question and may carry a shared `stimulus`; it holds the scorable **items**.

```jsonc
{ "num": "Q.1", "instruction": "Read the passage and answer the questions.",   // both required (BLOCK_FIELDS)
  "stimulus": { "kind": "passage", "text": "…", "original": true },            // optional
  "items": [ … ] }
```

## 3. Stimulus

`kind` is `passage | poem | table | figure | data` (`STIMULUS_KIND`). It may sit on the block or on an item.

- **`passage` / `poem`** need `text` and `"original": true|false` (`ORIGINAL_REQUIRED`).
  - A passage **must** be `original: true` — you wrote it. Never copy or closely paraphrase the textbook, the sample papers, a website or a book.
  - A poem may be `original: false` only with a public-domain `sourceRef` (`SOURCE_REF`).
  - **`SOURCE_WINDOW`:** any 10-word run of an original passage or poem that also occurs in the extracted text of any file under `source/` fails.
  - A handwriting item's copy text is a `passage` stimulus (so it is checked too).
- **`figure`** (or any stimulus with an `asset`): `"asset": "assets/english-chN-….svg"` must exist under `app/` (`ASSET_MISSING`) and carry a
  non-empty `"caption"` (`ASSET_CAPTION`). **A caption must never state the answer to an item that uses the figure.** Never write a question that
  depends on a picture that has not been produced.

## 4. Item

```jsonc
{ "id": "english-c5-s2-b1-i1", "type": "one-word", "q": "Who said …?", "marks": 1,
  "answer": "the deer", "acceptable": ["the deer", "deer"],
  "difficulty": "easy",                                   // required on every item (DIFFICULTY)
  "answerPoints": [ { "point": "…", "marks": 1 } ],       // sums to marks (ANSWER_POINTS_SUM)
  "markingGuide": "…", "skill": "…" }
```

- `q` and `answer` non-empty (`ITEM_FIELDS`). **Marks are integers 1–5** (`MARKS_RANGE`); an item above 1 mark needs `answerPoints` or `markingGuide` (`MARKS_GUIDE`).
- `answer` is written for a **human marker**; for anything above 1 mark it makes the mark split explicit.
- `difficulty`: `easy | medium | hard`. Standard papers aim for 40/40/20. **Hard means a harder task, never harder language** (see §6).

| `type` | Required extras | Checks |
|---|---|---|
| `mcq` | `options` (3–4) | `answer` is exactly one option (`MCQ_OPTIONS`, `MCQ_ANSWER`). Distractors must be clearly wrong to an adult. |
| `multi-select` | `options` (3–4), `answer` array | every answer is an option |
| `true-false` | — | `answer` starts `True` or `False` (`TF_ANSWER`); the **block** instruction says "True or False" (`TF_INSTRUCTION`) |
| `fill-blank` | `q` contains `_____`; optional `blanks` | exactly five underscores (`FILL_BLANK_NO_BLANK`, `BLANKS_COUNT`); needs `acceptable` |
| `one-word` | — | needs `acceptable` |
| `match` | `pairs: [{left,right}]` (≥ 2) | one item, one mark input; `answerPoints` for the split (`MATCH_PAIRS`) |
| `short`, `long` | — | `answerPoints` for the expected points |
| `handwriting`, `draw`, `activity` | — | judgement items (below) |
| `diagram-label` | `labels` | only if a figure exists |

**`acceptable` (instruction §6.3)** lists every answer a Class 4 child could reasonably give that deserves full marks: tense variants, synonyms,
British/Indian spelling. The primary `answer` is in the list (`ACCEPTABLE_MISSING`, `ACCEPTABLE_ANSWER`). For a multi-blank item, `answer` is an
array and `acceptable` an **array of arrays**, one list per blank. If two answers are correct, list both — otherwise the parent marks a correct child wrong.

**Judgement items (instruction §6.2).** Every `long`, `handwriting`, `activity`, `draw` item **and every item in the "Creative Writing" section**
needs a `markingGuide` of **at least 40 characters that contains a digit**, ending in a band rubric the parent can apply without guessing
(`JUDGEMENT_GUIDE`), e.g. *"All three points in full sentences — 3; two points — 2; one point — 1. Deduct 1 for more than three spelling errors. Maximum 5."*

## 5. Notation

- Blanks are **exactly five underscores**, `_____` (`BLANK_LEN`). Everything else containing underscores is wrong.
- **No straight quotes anywhere in content** — curly `“ ” ‘ ’`, and apostrophes are `’` (`STRAIGHT_QUOTE`).
- No `TODO`, `TBD`, `lorem` or empty brackets (`PLACEHOLDER`).
- Indian English spellings, following the textbook (*colour*, *practise* as a verb). Dictation items, if ever used, put one word per `answerPoints` entry.

## 6. Thin-poem papers (Ch 1 and Ch 4 only — `prd.md` §3.6)

- Five sections, **30/10/20/20/20**; Spelling is folded into Vocabulary, Handwriting is not carried.
- **`chapterSource`** on every item: Section A items say `original-A1` or `original-A2`; every other item names the place in the chapter it
  draws on, e.g. `"Let us Learn B"` (`CHAPTER_SOURCE`). If a section cannot be filled from the chapter, **stop and report; do not pad.**
- **`hard` is 35–50 % of items** (`HARD_FLOOR`, `HARD_CAP`). Allowed ways to be hard: a two-part answer from two places in the text · applying the
  chapter's rule to a sentence the child composes · spot-and-correct · sequencing · three or more points in own words · a two-step rewrite inside
  the chapter's grammar point. **Forbidden:** rarer vocabulary, idiom, longer sentences, untaught grammar, "why do you think" questions about motive,
  theme or the poet's purpose. Every item still passes `scripts/readability.py`.

## 7. The mock (`english-hy.json`)

Standard seven sections. Every item carries **`sourceChapter`**: an integer 1–6, or `"general-unseen"` (the original unseen passage) or
`"general-sample-only"` (the seven topics the samples test but the chapters do not teach). Marks per key must equal `mock_allocation` in the card:
10/19/12/10/14/14 by chapter, 13 unseen, 8 sample-only (`MOCK_SOURCE`, `MOCK_ALLOCATION`). No item may be a chapter item with names or objects swapped.

## 8. Fields that must never reach the child in practice mode (for v2)

`answer`, `acceptable`, `answerPoints`, `markingGuide`, `difficulty`, `skill`, `chapterSource`, `sourceChapter`. (Maths kept an authoring-only field, `expr`, out of
the page and proved it with a static check; do the same.) In practice mode only the question, options, match columns, stimuli and mark values are visible.

## 9. Not checked by the validator (still your job)

Curriculum fidelity (was this taught in the chapter?), that a figure's caption does not give away an answer, factual correctness, age-appropriateness
(`scripts/readability.py` gives numbers; a human reads every question), and near-duplicates across papers (`scripts/similarity.py`).
