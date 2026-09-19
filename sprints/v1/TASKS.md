# Sprint v1 — Tasks (Content) — mily-english-abhyas

## Status: In progress (3 of 14 tasks complete). Tasks written 2026-09-19. Owner-confirmed 2026-09-19: five sections for Ch 1/Ch 4 (Spelling folded into Vocabulary, Handwriting not carried); marking secret stands, owner rotates later via Vercel env.

Source of truth: `sprints/v1/prd.md` (Revision 2) — final. This file breaks it into atomic
execution tasks; it does not re-derive scope, blueprint, schema or content plan. A task below that
conflicts with `prd.md` is wrong and defers to it. `sprints/v1/instruction.md` §6 (content rules)
and §7 (reuse detection) apply to every paper task; CLAUDE.md rules apply to every task.

**Deliberate deviations from the generic `/prd` skill defaults** (recorded, not silent):

- The skill asks for ≤ 10 tasks of 5–10 minutes each, a `PRD.md`, and a "security and testing belong
  in later sprints" split. This project's own governance overrides it: `instruction.md` §8 fixes the
  task shape (setup · schema+validator · similarity · **one task per chapter paper** · mock ·
  coordinator verification · walkthrough · v2 brief), and `BLUEPRINT.md` §12.2 says to parallelise by
  file ownership, not task count. A fact-checked, 54-item, 100-mark paper is an hours-long task, so
  there are **14 tasks sized to the real unit of work**. The validator's proof against bad fixtures
  is part of Task 2 because `instruction.md` §8 requires it before any paper relies on the validator.
- No `PRD.md` was written: `prd.md` exists and was declared final. (The skill's uppercase name would
  create a second file beside it.)

**Ownership rule (CLAUDE.md rule 3, `prd.md` §11).** A paper sub-agent writes **only** its own
`app/data/english-*.json` and its own `app/assets/english-*.svg`. It never writes the PRD, card,
this file, `SCHEMA.md`, `validate.js`, the scripts, fixtures, any other paper, or anything under
`source/`; it reports such needs back. The coordinator re-reads every file a sub-agent claims to
have written and re-runs the checks itself.

**Session plan** (`instruction.md` §9 — batches of 2–4, fresh session between; rule 7 — stop where
told). After each batch: commit, report **only failures** and the task list state, then stop.

| Session | Tasks | Stops after |
|---|---|---|
| S1 — tooling | 1, 2, 3, 4 | Task 4 committed |
| S2 — papers | 5, 6, 7 (Ch 1, 2, 3) | Task 7 committed |
| S3 — papers | 8, 9, 10 (Ch 4, 5, 6) | Task 10 committed |
| S4 — mock | 11 | Task 11 committed |
| S5 — verify (fresh session) | 12, 13, 14 | Task 14 committed; owner reads papers, tags `v1-content` |

**Hard stops** (`instruction.md` §12 — the only reasons to pause and ask): empty or unreadable
`source/` inputs; a structure that cannot scale to 100 marks without changing school titles/order; a
chapter that cannot support its paper from its own material (the **capacity gate**, Tasks 1, 5, 8);
any step that would print, log or commit `VERCEL_TOKEN` or `GANESH_ENGLISH`. Everything else: decide,
record in the walkthrough, continue.

---

- [x] Task 1: Project setup, Project Card and `source/INTAKE.md` (P0) — coordinator, single owner
  - **Depends on:** owner has run `bash setup.sh` (git repository exists, `BLUEPRINT.md` at repo root).
    Step 0 checks this; if not, **stop and ask the owner to run it** — it is safe now (token in
    git-ignored `.env.local`, template blank). Do not `git init` around it.
  - Steps: (0) `git rev-parse --is-inside-work-tree`, `test -f BLUEPRINT.md`, and
    `git ls-files | grep -c '^\.env\.local$'` → 0 (count only). (1) `package.json`: `name`,
    `private`, **no dependencies**, scripts `validate` (`node validate.js`), `similarity`
    (`python3 scripts/similarity.py`), `readability` (`python3 scripts/readability.py`), `check`
    (`npm run validate && python3 scripts/similarity.py`). (2) `PROJECT-CARD.yml` exactly per `prd.md`
    §3.5, including `paper_overrides` and the `ASSUMED` comment on `duration_minutes: 120`.
    (3) `source/INTAKE.md` per `instruction.md` §3 — see acceptance. (4) Commit.
  - Acceptance: `PROJECT-CARD.yml` parses; `chapters: 6` equals `ls source/textbook/*.pdf | wc -l`;
    section marks sum to 100 for the default and for `ch1`/`ch4`. `INTAKE.md` covers **all 9 files**:
    inventory (pages, text layer yes/no); per chapter the title as printed, genre, word count of the
    reading text, new vocabulary, grammar points; per sample the literal section headings, block
    patterns and total marks, **quoted**; the seven sample-only topics of `prd.md` §5.2 each
    confirmed absent from the six chapter texts (grep evidence); and, for **Ch 1 and Ch 4**, the
    prompt-and-word inventory with a PASS/FAIL against the `prd.md` §5.0 thresholds (B ≥ 8 distinct
    prompts; C ≥ 6 tasks and ≥ 10 words; D ≥ 1 grammar point with ≥ 8 item formats; E ≥ 20 distinct
    usable words — each word confirmed present in the chapter text and Class 4-appropriate).
  - **Capacity gate:** any FAIL for Ch 1 or Ch 4 is the §12 stop. Report it; do not lower a section's
    marks or pad from outside the chapter; Tasks 5 and 8 do not start.
  - Files: `package.json`, `PROJECT-CARD.yml`, `source/INTAKE.md` (the one file under `source/`
    allowed to be generated; nothing else there is touched)
  - Completed: 2026-09-19 — coordinator, no sub-agent. Acceptance checks written first (3 red), then
    green: 28/28 (`package.json` no deps; card parses, `chapters` 6 = 6 files, default and `ch1`/`ch4`
    sections sum to 100; INTAKE covers all 9 files). `source/.text-cache/` created (git-ignored).
    **Capacity gate: PASS for Ch 1 and Ch 4 — no §12 stop.** Ch 1: B 13/8, C 10/6, D 8 formats,
    E 23/20. Ch 4: B 9/8, C 7/6, D 9 formats/8, E 21/20 — a margin of exactly one on every threshold;
    Vocabulary rests on three gloss-dependent words (*trifled, halves, balm*): rejecting one leaves
    margin 0, rejecting two **fails** the threshold (see `INTAKE.md` §5). Security scan: nothing to
    scan yet (no code; no dependencies, so no lockfile for `npm audit`; `semgrep --config auto` refuses
    to run with metrics off) — semgrep runs with a named pack from Task 2.

- [x] Task 2: Schema + `validate.js`, proved against bad fixtures (P0) — single owner, no sub-agent
  - **Step 0 — mandatory, before any code (owner instruction):** read in full
    `../mily-maths-abhyas/validate.js`, `../mily-maths-abhyas/sprints/v1/walkthrough.md` **and**
    `../mily-maths-abhyas/sprints/v2/walkthrough.md`. Record what was carried over, dropped, and
    why, as short notes under this task before editing anything. (`prd.md` D8, criterion 18.)
  - Steps: write `SCHEMA.md` (the author-facing schema: `BLUEPRINT.md` §5 plus `prd.md` §8 —
    `stimulus.original`, `acceptable`, required `difficulty`, mock `sourceChapter`, thin-poem
    `chapterSource`, `paper_overrides`, integer marks, curly typography, id patterns). Adapt
    `validate.js`: zero dependencies; the blueprint's ten checks plus checks 11–16 of `prd.md` §9;
    reads section profiles and `paper_overrides` from `PROJECT-CARD.yml`. Check 11 (10-word window
    vs the text of **every** file under `source/`) reads `source/.text-cache/<basename>.txt`, and
    creates any missing entry itself with `pdftotext` (Task 3 reuses the same cache and file naming).
    CLI: `node validate.js [files…]` defaults to `app/data/english-*.json`; with no papers it
    reports "0 papers found" and exits 0; `--strict` additionally requires exactly the seven expected
    papers. Test harness `scripts/test-validator.js` (`npm run test:validator`).
  - Acceptance: `node scripts/test-validator.js` passes: one **good** standard fixture and one
    **good** thin-poem fixture validate; each **bad** fixture fails with its *named* error — at
    minimum: wrong paper total · judgement item without a usable `markingGuide` · `fill-blank`
    without `acceptable` · a passage containing a 10-word window taken from a source file (built at
    run time from the cache — no textbook text is committed) · a straight quote · thin paper with
    hard < 35 % · thin paper missing `chapterSource` · thin paper with wrong section marks · mock
    with a per-chapter mark mismatch. Step 0 notes are present.
  - Files: `validate.js`, `SCHEMA.md`, `scripts/test-validator.js`, `fixtures/good/*.json`,
    `fixtures/bad/*.json`, `package.json` (adds `test:validator`)
  - **Step 0 notes (read first, in full: Maths `validate.js` 311 lines, Maths v1 walkthrough, Maths v2
    walkthrough).** *Carried over:* zero-dependency Node; `validatePaper` collects **all** errors; PASS/FAIL
    per file and exit 1; `0 papers found.` exit 0; the whole-document placeholder scan; `difficulty` required
    from day one (Maths retrofitted it after Ch 4 shipped untagged); stimulus checks at **block and item**
    level (Maths added item level late); `answerPoints` must sum to `marks`; mock = `chapter: null` +
    `paperCode`. *Dropped:* the `expr` evaluator, `layout` stimuli, `Rs` and fraction-glyph checks, the exact
    54-item and per-section item counts (the blueprint's 45–60 replaces them). *Changed because of the v2
    walkthrough:* Maths' `build.js` ran `validate.js` unchanged and hard-coded 8 papers and 54 items, which its
    own limitations section calls a maintenance trap — so every expectation here (sections, marks, chapter
    titles, mock title, mock allocation, expected paper list for `--strict`) is read from `PROJECT-CARD.yml`.
    Its `.vercelignore` excludes `source/`, so check 11 cannot run in a Vercel build: it fails loudly by
    default and has an explicit `--skip-source-check` (carried into the v2 brief, Task 14). Its `expr` field
    was kept out of the page and proved by a static check; `SCHEMA.md` §8 lists the English authoring-only
    fields for the same treatment. *Not added:* a mechanical "was this taught?" check (the Maths Euler bug) —
    curriculum fidelity stays by hand (PRD §9); a caption-gives-answer check stays a Task 12 by-hand step.
  - Completed: 2026-09-19 — coordinator, no sub-agent. **`node scripts/test-validator.js`: 41 passed, 0
    failed** (harness written first and confirmed red; then green): card reader equals PyYAML; 3 good fixtures
    (standard 58 items, thin 54 items / 21 hard, mock 58 items) validate clean; **28 bad fixtures** each fail
    with the *named* error — the 9 required (wrong total · missing rubric · missing `acceptable` · copied
    passage · straight quote · thin hard < 35 % · thin missing `chapterSource` · thin wrong section marks · mock
    allocation mismatch) plus 19 extras covering the rest of the blueprint's ten checks and §6 rules; 6 CLI
    checks (0 papers, `--strict`, exit codes, `--skip-source-check`, unreadable card). **Mutation check:**
    disabling each of 5 checks in turn turned exactly its own fixture red; file restored byte-identical.
    Semgrep (`p/javascript` + `p/secrets`, metrics off): 104 rules, 5 files, 0 findings. `npm audit`: no
    dependencies, no lockfile, nothing to audit. **One bug found and fixed by the tests:** the blank-length rule
    flagged an *id* containing an underscore; it now skips `id` and `asset` fields.
    **Deviations from the task as written (all recorded in `prd.md`):** added `scripts/lib/card.js` (a
    YAML-subset reader — Node has no YAML parser and there are no runtime dependencies), `fixtures/make-good.js`
    (deterministic generator) and 19 extra bad fixtures; added `hard_cap_pct` and `mock_allocation` to
    `PROJECT-CARD.yml`; mock ids are `english-chy-…` (PRD §8 said `english-hy-…`, which broke the blueprint
    pattern); mock `sourceChapter` also allows `"general-unseen"` / `"general-sample-only"`.

- [x] Task 3: `scripts/similarity.py` (P0) — single owner, no sub-agent
  - Steps: extract text of every file under `source/` once into `source/.text-cache/` (reusing Task
    2's `<basename>.txt` naming; skip files whose cache is newer). **Shingle pass (hard fail):** any
    6-word shingle shared between an item's `q` or a stimulus and the **sample** text, except an
    allow-list of generic instruction phrases kept in the script (not chapter lines — `prd.md` R3).
    **Semantic pass (warning):** `all-MiniLM-L6-v2` on CPU, vectors cached as a `.npy` under
    `scripts/`, print every cross-paper and paper-to-sample pair with cosine ≥ 0.85, mock-against-
    chapters pairs listed first (`prd.md` §5.1). Exit non-zero on a shingle failure only. If
    `sentence-transformers` cannot load, say so and run the shingle pass alone.
  - Acceptance: run against a fixture containing a sample sentence → exit non-zero, and the shingle
    is named; against a clean fixture → exit 0; a known near-paraphrase pair prints in the semantic
    list; `.npy` and `.text-cache/` are git-ignored (`git check-ignore`); the script is quiet on a
    clean corpus. `pip` state recorded (CPU torch, `sentence-transformers 5.1.2`).
  - Files: `scripts/similarity.py`, `fixtures/similarity/*.json`
  - Completed: 2026-09-19 — coordinator, no sub-agent. Test written first (9 of 10 red), then green:
    **`python3 scripts/test_similarity.py`: 10 passed, 0 failed.** Covers: a sample sentence lifted into an
    item → exit 1 with the shingle and item id named; clean fixture → exit 0 in 3 lines; generic instruction
    phrases allow-listed; a textbook line the samples do not use is **not** a hard failure (only samples are
    shingled); the kite near-paraphrase (0.96, mock vs chapter) is listed while the 0.82 pair is not at the
    0.85 threshold; vectors cached as `.npy` and a second run embeds 0 new; `.npy` and `.text-cache/`
    git-ignored (3/3 paths); `--no-semantic`; no papers → exit 0. The sample-copy and textbook-line fixtures
    are built at run time from the cache — no source text is committed. **Mutation check:** disabling the
    shingle match, the allow-list masking, the threshold and the exit code (one at a time) each turned exactly
    its own test red; file restored byte-identical. Semgrep (`p/python` + `p/secrets`, metrics off): 187
    rules, 2 files, 0 findings. Environment: CPU torch 2.8.0+cpu, sentence-transformers 5.1.2, numpy 2.0.2
    (installed with `pip install --user` during preflight). The shingle pass also checks block `instruction`
    text, not only `q` and stimuli (the Maths reuse found in a shared instruction line), with the allow-list
    masking generic wording. Semantic sample segments are split on sentence ends and newlines (≥ 4 words).

- [ ] Task 4: `scripts/readability.py` — the §6.5 age gate (P0) — single owner, no sub-agent
  - Steps: for a paper, print per-authored-text numbers (A1/A2 stimuli, handwriting copy text):
    words, sentences, **average sentence length**, **longest sentence**, words of > 3 syllables not
    found in that chapter's cached text and not glossed in the item's `q`. For every item's `q`,
    flag stems asking about theme, moral, author or poet intent, irony, or "why do you think".
    Print the paper's difficulty mix (easy/medium/hard, % of items and of marks) for `prd.md`
    criterion 16. Exit non-zero on: average > 12, any sentence > 20, or any stem flag. Syllable
    flags print for human judgement and fail unless glossed. Runs over **every** item, hard or not.
  - Acceptance: fixture with a 24-word sentence → non-zero; fixture with "What is the theme of the
    poem?" → non-zero; clean fixture → 0; output is compact enough to paste into the walkthrough.
  - Files: `scripts/readability.py`, `fixtures/readability/*.json`

- [ ] Task 5: Chapter 1 paper — Together We Can (P0) — one sub-agent; **thin-poem profile**
  - Follow **Protocol P** (below). Profile: A 30 · B 10 · C 20 · D 20 · E 20 (`prd.md` §3.6, §5.0);
    54 items; `hard` ≥ 35 % of items (target ~39 %); `chapterSource` on every non-A item.
  - Content: A1 original unseen passage, watering turns in a school garden (110–150 words); A2 original
    8-line poem, a relay race at sunset. D: prepositions of place (*behind, between, near, in front
    of*) on figure F1, and future with *will* — nothing else. E: collective nouns and teamwork words;
    `acceptable` lists both *bunch* and *bouquet* for "of flowers". Quote hazards: avoid poem lines
    or questions the samples used.
  - **Capacity gate:** if the sub-agent cannot reach 45 items and each section's marks from the
    chapter plus the two original A texts, it stops and reports — no padding, no lowered marks.
  - Acceptance: Protocol P; `jq '[.sections[].marks]'` → `[30,10,20,20,20]`; hard-share and
    `chapterSource` checks pass; coordinator hand-audits 10 `hard` tags; F1 viewed at 2×.
  - Files: `app/data/english-ch1.json`, `app/assets/english-ch1-map.svg`

- [ ] Task 6: Chapter 2 paper — The Tinkling Bells (P0) — one sub-agent; standard profile
  - Follow **Protocol P**. Standard seven sections 25/13/12/19/13/12/6, 58 items, 40/40/20.
  - Content: A1 original unseen passage, a boy finds a neighbour's cricket ball and returns it (~130
    words); A2 original ~70-word text on three kites (comparison). D: comparative and superlative
    adjectives (*-er / -est, than*) only. E may use opposites (Ch 2 teaches them). Do not reuse the
    story's plot beats with new names in A-section texts. No figure.
  - Acceptance: Protocol P; sections `[25,13,12,19,13,12,6]`.
  - Files: `app/data/english-ch2.json`

- [ ] Task 7: Chapter 3 paper — Be Smart, Be Safe (P0) — one sub-agent; standard profile
  - Follow **Protocol P**. Standard profile.
  - Content: A1 original unseen passage, a rainy morning at a bus stop (~120 words); A2 original
    ~75-word note on kitchen safety at home. D: countable / uncountable nouns; C may include a
    letter task. E: *pedestrian, footpath, reflective, distract*. Figure F2: four original road-sign
    icons; the caption must not say what any sign means. **Overlap hazard:** Poem-3 is this chapter's
    own worksheet (its safe/unsafe classification, its banana/biscuit/curd list, its "five sentences
    about the given picture") — use different examples and wording. Plurals, articles and odd-one-out
    are sample-only: excluded here.
  - Acceptance: Protocol P; sections `[25,13,12,19,13,12,6]`; F2 viewed at 2× and its caption
    checked against its items.
  - Files: `app/data/english-ch3.json`, `app/assets/english-ch3-signs.svg`

- [ ] Task 8: Chapter 4 paper — One Thing at a Time (P0) — one sub-agent; **thin-poem profile**
  - Follow **Protocol P**. Profile as Task 5 (A 30 · B 10 · C 20 · D 20 · E 20; 54 items; hard ≥ 35 %;
    `chapterSource` on every non-A item).
  - Content: A1 original unseen passage, a grandfather mends watches one at a time (125–150 words);
    A2 original 8-line poem, a child's morning routine. D: *is/are* + action word + *-ing* in eight
    formats, plus a.m./p.m. usage. E: the 21 words inventoried in Task 1 (*trifled, halves* glossed in
    the question). Figure F3: an original park scene; the caption must not name the actions. Avoid
    L-5's verbatim "How do you feel after finishing a task that you have done well?"
  - **Capacity gate — the narrowest in the sprint** (Vocabulary margin: 1 word; one grammar point
    across 11 items). If it cannot fill its sections from its own chapter, **stop and report; do not
    pad.**
  - Acceptance: Protocol P; sections `[30,10,20,20,20]`; hard-share and `chapterSource` checks;
    10 `hard` tags hand-audited; F3 viewed at 2×.
  - Files: `app/data/english-ch4.json`, `app/assets/english-ch4-park.svg`

- [ ] Task 9: Chapter 5 paper — The Old Stag (P0) — one sub-agent; standard profile
  - Follow **Protocol P**. Standard profile.
  - Content: A1 original unseen passage, a mango tree on a hill road shared by a village (~130 words);
    A2 original ~75-word text on a village pond and its fish. D: adverbs of manner and describing
    words. **Overlap hazard — heaviest of any paper:** L-5 is this chapter's worksheet and quotes
    its lines ("Get well soon, dear stag!", "The grass is so tender and nice"), its "circle the
    adverb" items, and the "My best friend's name is …" frame. Use none of them; frame Section C
    differently (a pet, or a helper). Pronouns, *-ness*, synonyms and irregular past are sample-only:
    excluded here.
  - Acceptance: Protocol P; sections `[25,13,12,19,13,12,6]`.
  - Files: `app/data/english-ch5.json`

- [ ] Task 10: Chapter 6 paper — Braille (P0) — one sub-agent; standard profile
  - Follow **Protocol P**. Standard profile.
  - Content: A1 original unseen passage, a girl's diary of a hill-train journey (~130 words); A2
    original ~80-word market scene told in the past continuous. D: past continuous (*was/were* +
    *-ing*) only. E: *blacksmith, blind, pincushions, invented* plus *institute, simplify, affect,
    nearby*. Figure F4: an original four-panel picture story; the caption must not tell the story.
    **Overlap hazard:** L-6 is this chapter's worksheet ("Cows are grazing in the field", "I am
    writing in my notebook", the Minam handwriting text, the "Sueccses" spelling) — use none.
  - Acceptance: Protocol P; sections `[25,13,12,19,13,12,6]`; F4 viewed at 2× and its caption
    checked against its items.
  - Files: `app/data/english-ch6.json`, `app/assets/english-ch6-story.svg`

- [ ] Task 11: Half-Yearly mock — `english-hy` (P0) — one sub-agent; standard profile
  - Follow **Protocol P**. Standard seven sections, 58 items, 40/40/20; `sourceChapter` on **every**
    item.
  - Content: allocation per `prd.md` §5.1 — chapter-attributed marks **10 / 19 / 12 / 10 / 14 / 14**
    for Ch 1–6, unseen A1 (13 marks, original, a monsoon picnic in a park, ~140 words), and 8 marks
    of the seven sample-only topics (plural nouns 2 marks; articles, personal pronouns, synonyms,
    *-ness*, irregular simple past, odd-one-out 1 mark each) — the **only** paper where they appear.
    A2 is an original text linked to one chapter (choose it here; it counts toward that chapter).
    Figure F5: an original picture-composition scene for C1's OR alternative. **No item may be a
    chapter item with names or objects swapped** (Maths found five). It draws on Ch 1 and Ch 4 in the
    standard, not the thin, profile.
  - Acceptance: Protocol P; `jq` sums of `marks` by `sourceChapter` = 10/19/12/10/14/14; the
    semantic pass of `similarity.py` run mock-against-chapters, every pair ≥ 0.85 judged and logged;
    F5 viewed at 2×.
  - Files: `app/data/english-hy.json`, `app/assets/english-hy-scene.svg`

- [ ] Task 12: Coordinator cross-paper verification (P0) — **fresh session; not delegated**
  - Steps (small scripts or `jq`, not a sub-agent): `node validate.js --strict`; `python3
    scripts/similarity.py` and a written judgement on every semantic pair ≥ 0.85; the readability
    table for all seven papers; a difficulty-mix table for all seven (Ch 1 and Ch 4 skewed, the
    rest 40/40/20-ish; a hand-audit of 10 `hard` tags for each of Ch 1 and Ch 4 if not already
    recorded); notation consistency (blanks `_____`, no straight quotes, "Write True or False",
    Indian-English spellings); a red-flag vocabulary scan across every item; every caption checked
    against its items; a spot-check of ten questions per paper against its chapter
    (`BLUEPRINT.md` §13.6); count-only secret scan (`git grep -c` for the token prefix and the marking
    code → 0). Fix defects in the owning paper (never by editing another agent's output blindly) and
    re-run.
  - Acceptance: every check above passes or is recorded as a known limitation; every fix has its own
    commit; a table of all seven papers' totals, item counts and section marks equals `prd.md`.
  - Files: none new (fixes go to the owning paper JSON)

- [ ] Task 13: `sprints/v1/walkthrough.md` (P0) — coordinator (use the `/walkthrough` skill, **lower-case filename**)
  - Must contain, per `instruction.md` §13 and `prd.md`: what was built and files changed; the
    readability and difficulty numbers for every paper; every figure **not viewed** and every authored
    passage **not run through `similarity.py`** (target: both empty); the capacity-gate outcome for
    Ch 1 and Ch 4; verification results; **known limitations stated plainly** — D1 (no revision
    paper), the assumed `duration_minutes`, curriculum fidelity checked by hand only, the thin-poem
    deviation D9, and that readability numbers are **not** a substitute for a human reading every
    question (state who has and has not read them; the owner's read of `SETUP.md` §6 is pending
    until the owner says otherwise); what is next.
  - Acceptance: file exists; no claim of "tested" for anything only read; lists match the actual run.
  - Files: `sprints/v1/walkthrough.md`

- [ ] Task 14: Draft `sprints/v2/instruction.md` (P0) — coordinator
  - Steps: start from `../mily-maths-abhyas/sprints/v2/instruction.md` and adjust for English: fewer
    figures (five, inline SVG), longer text stimuli, **rubric display in checking mode**, results that
    render **per-paper section lists** (Ch 1 and Ch 4 have five sections, `prd.md` D9), the assumed
    duration, the marking-code checks (length 10 is the minimum — re-check against the built page;
    the code may not appear in it), the hostname ownership note, and the honest "deterrent, not a
    security boundary" README wording.
  - Acceptance: the file exists, states its own preflight and hard stops, and does not contradict
    `prd.md` or `BLUEPRINT.md`.
  - Files: `sprints/v2/instruction.md`

---

## Protocol P — every paper task (Tasks 5–11)

1. **Preconditions.** Earlier tasks `[x]`; `git status` clean; `node scripts/test-validator.js` passes.
2. **Spawn one sub-agent** with a brief that says: read `SCHEMA.md`, `PROJECT-CARD.yml`, the chapter's
   section of `source/INTAKE.md`, the cached chapter text under `source/.text-cache/`, `prd.md` §3–§6
   and §8, and `instruction.md` §6; write **only** the files named in the task; do not run `git`, do
   not touch the token, `.env.local`, PRD, card, tasks, schema, validator or scripts; write every
   A-section text yourself (original, never paraphrased from the chapter, the samples or the web);
   tag `difficulty` on every item; give every judgement item a band rubric (≥ 40 characters, with a
   digit); give every `fill-blank` and `one-word` an `acceptable` list; blanks are exactly `_____`;
   curly quotes and apostrophes only; report needs for other files back instead of editing them.
3. **Re-read with `jq`**, printing only `id`, `marks`, `q`, `answer`, `markingGuide` — never the full JSON.
4. **Run** `npm run validate && python3 scripts/similarity.py`, then
   `python3 scripts/readability.py app/data/english-chN.json`. All must pass.
5. **View each figure once, at 2×** (`rsvg-convert -z 2`, output to the scratchpad), and check its
   caption against the items that use it. A question that depends on a picture that was not produced
   is rewritten as text.
6. **Send back or fix** anything that fails, then repeat step 4. Report only failures between steps.
7. **Tick the box, then commit** — one commit per paper, message `Task N: <paper>`, ending with the
   attribution line. Never tick a task before its checks have passed.
