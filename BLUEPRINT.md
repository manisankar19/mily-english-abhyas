# Chapter Exam Practice Site — Generalised Blueprint

A reusable specification for building a **chapter-wise practice-paper website** for any
school subject. Derived from the Class IV Hindi site (हिंदी अभ्यास), which went through
two sprints to production; every rule here exists because something in that build either
worked well enough to keep or went wrong and cost a sprint.

Use it for EVS first, then Maths, then English. Anything genuinely subject-specific
belongs in the **Project Card** (§2) — the rest of the document should not need editing.

---

## 0. How to use this document

1. Copy this file into the new repo as `BLUEPRINT.md`.
2. Fill in the **Project Card** (§2). That is the only part you write by hand.
3. Drop the source material into `source/` (§3).
4. Hand the repo to the agent: *"Read BLUEPRINT.md and the Project Card. Use `/prd` to
   plan and write `sprints/vN/TASKS.md`, then `/dev` to execute, then `/walkthrough`."*
5. Content generation (§4–5) and application build (§7–10) are **separate sprints**.
   Do not let one sprint do both — see §12.1.

Conventions in this document: **MUST** = acceptance criteria will test it.
**SHOULD** = deviate only with a recorded reason. **MAY** = free choice.

---

## 1. What these sites are

A single-page, fully static website that gives a child chapter-wise practice papers,
and gives whoever checks the work a controlled way to see the answer key.

The defining constraints, which shape everything else:

- **The child writes on paper.** The site is not an answer-entry system. It displays a
  question paper; the answers go into a physical workbook. This is deliberate — the
  point of the exercise is handwriting, spelling and working-out, not clicking.
- **Marking is human judgement.** No auto-grading. A person compares the workbook with
  the model answer and decides the mark. So model answers are written *for a human
  marker*, and every multi-mark question says how its marks break down.
- **The answer key is the sensitive part.** A child must not be able to read the answer
  while writing. This is the whole reason the app has modes (§7.3).
- **No server, no database, no accounts.** One static HTML file. It must work on a
  patchy home connection, on a phone, and ideally offline once loaded.

If a proposed feature breaks one of those four, it is out of scope by default.

---

## 2. Project Card — fill this in per subject

```yaml
subject_code:        evs                 # slug: evs | maths | english | hindi
subject_display:     EVS                 # shown in the UI
grade:               4
board_or_school:     "Parmanu Urja Shikshan Sansthan"   # printed on the paper header
academic_year:       "2025-26"

locale:              en                  # en | hi — drives ALL UI strings
numerals:            latn                # latn (1,2,3) | deva (१,२,३)
content_language:    English             # the language questions are written in

chapters:            9                   # derived from source/, not guessed
sets_per_chapter:    1                   # 1 = one fixed paper; 2 = Set A / Set B
total_marks:         100                 # per paper
duration_minutes:    120

repo_name:           mily-evs-abhyas
vercel_project:      mily-evs-abhyas
student_login:       { user: "Mily", pass: "2026" }
marking_secret_env:  GANESH_EVS          # env var name; value never committed

section_blueprint:   # see §4 — set AFTER reading the sample papers, not before
  - { code: A, title: "...", marks: 00 }
```

Rules:

- `chapters` **MUST** be counted from the files actually present in `source/`, and the
  agent **MUST** stop and report if the count disagrees with the card.
- `total_marks` **MUST** be met exactly by every paper. Not approximately.
- `marking_secret_env` **MUST** be unique per site, so one site's code does not unlock
  another's.

---

## 3. Source intake

```
source/
  textbook/        one file per chapter, named so the chapter number is unambiguous
  samples/         real question papers / worksheets from the school
  syllabus/        optional — marks distribution, exam pattern circulars
```

Requirements:

1. The agent **MUST** read **every** file in `source/samples/` before designing
   anything. The school's own paper is the specification for tone, section order,
   instruction wording and mark weighting. Invented formats are rejected.
2. The agent **MUST** read the textbook chapter it is writing a paper for. Questions
   must be answerable from that chapter.
3. **PDF text extraction is unreliable.** In the Hindi build, extracted Devanagari came
   out with displaced matras and scrambled glyph order. The agent **MUST NOT** copy
   extracted text into a paper without reading it for sense and retyping it correctly.
   This applies to any non-Latin script, to mathematical notation, and to anything that
   came out of a two-column or boxed layout.
4. If the source is a scanned image PDF, say so and ask for a text version rather than
   guessing.

---

## 4. Designing the paper blueprint

Before a single question is written, produce a **section blueprint**: the list of
sections, their titles, and their marks, summing to `total_marks`. Write it into the
Project Card. Every chapter's paper then follows it identically.

How to derive it:

1. Take the section structure of the school's sample paper.
2. Scale the marks proportionally to `total_marks`.
3. Adjust for the subject's own realities (a Maths paper has no comprehension passage;
   an English paper has no numerical working).
4. Keep 5–8 sections. Fewer reads as a worksheet; more is unwieldy on a phone.

Worked example — the Hindi site, scaled from an 80-mark school worksheet to 100:

| Section | Title | Marks |
|---|---|---|
| क | पठन पर आधारित प्रश्न | 20 |
| ख | पाठ्यपुस्तक पर आधारित प्रश्न | 22 |
| ग | रचनात्मक लेखन | 15 |
| घ | शब्द भंडार | 13 |
| ङ | व्याकरण | 20 |
| च | वर्तनी | 5 |
| छ | सुलेख | 5 |

Starting points for the next three subjects — **confirm against the real sample papers
before using**:

- **EVS** — Objective (MCQ / true-false / fill-in) · Match the following · One-word and
  very short answers · Short answers · Long answers and reasoning · Diagram labelling ·
  Observation and activity questions · Value/application questions.
- **Maths** — Objective · Mental maths and quick computation · Computation with working ·
  Word problems · Geometry and measurement · Data handling · Reasoning/puzzle.
- **English** — Unseen comprehension · Textbook comprehension · Vocabulary · Grammar ·
  Creative writing · Spelling and dictation · Handwriting.

Per-question rules:

- 45–60 scorable items per paper. Fewer makes each mark too coarse for fair partial
  credit; more is exhausting at this age.
- Mark values **SHOULD** stay in 1–5. Anything larger hides too much judgement in one
  number.
- Mix difficulty: roughly 40% recall, 40% understanding, 20% application.
- Include an "or" alternative (`अथवा` / "OR") on long creative questions, as school
  papers do.

---

## 5. Question schema

This is the part worth getting right once. Everything downstream — the renderer, the
validator, the marking UI, future subjects — depends on it.

One JSON file per paper: `app/data/{subject}-ch{N}{-setX}.json`.

### 5.1 Paper object

```jsonc
{
  "schemaVersion": "2.0",
  "subject": "evs",
  "subjectDisplay": "EVS",
  "grade": 4,
  "chapter": 3,
  "set": "A",                       // omit when sets_per_chapter is 1
  "locale": "en",
  "numerals": "latn",
  "title": "Plants Around Us",      // chapter title, in content language
  "subtitle": "EVS — Class 4 — Chapter 3",
  "sourceRef": "NCERT Looking Around, Class 4, Ch. 3",
  "totalMarks": 100,
  "durationMinutes": 120,
  "sections": [ /* §5.2 */ ]
}
```

### 5.2 Section and block

A **section** is a marked division of the paper. A **block** is one numbered question,
which may carry a shared stimulus (a passage, a table, a figure) and one or more
scorable **items** under it.

```jsonc
{
  "code": "A",
  "title": "Objective questions",
  "marks": 20,
  "blocks": [
    {
      "num": "Q.1",
      "instruction": "Choose the correct option and write it in your answer book.",
      "stimulus": {                       // optional
        "kind": "figure",                 // passage | poem | table | figure | data
        "text": null,
        "caption": "Parts of a plant",
        "asset": "assets/plant-parts.svg" // see §5.5
      },
      "items": [ /* §5.3 */ ]
    }
  ]
}
```

### 5.3 Item — the scorable unit

Every item is one row in the marking UI: one question, one model answer, one mark input.

```jsonc
{
  "id": "evs-c3-s1-b1-i1",     // stable, unique within the paper — see §5.6
  "label": "(a)",              // optional display label
  "type": "mcq",               // §5.4
  "q": "Which part of the plant makes food?",
  "options": ["Root", "Stem", "Leaf", "Flower"],   // type-dependent
  "marks": 1,
  "answer": "Leaf",            // the model answer, shown to the checker
  "answerPoints": [            // for multi-mark items — how the marks break down
    { "point": "Leaf", "marks": 1 }
  ],
  "markingGuide": null,        // free text for judgement-based items
  "skill": "plant-parts",      // optional tag, for later analytics
  "difficulty": "easy"         // easy | medium | hard
}
```

**`answer` is written for a human marker, not a machine.** For anything above 1 mark it
**MUST** make the mark split explicit, so the checker can award partial credit
consistently. This was the single most useful thing in the Hindi build.

### 5.4 Item types

| `type` | Extra fields | Notes |
|---|---|---|
| `mcq` | `options` (3–4) | `answer` **MUST** be exactly one of `options`. |
| `multi-select` | `options`, `answer` as array | State in `q` how many to pick. |
| `true-false` | — | `answer` is `"True"` or `"False"`, plus a reason if it carries 2 marks. |
| `fill-blank` | `blanks` (count) | Use `____` in `q`. One mark per blank unless stated. |
| `match` | `pairs: [{left, right}]` | Renderer shows two shuffled columns; `answer` lists the correct pairing. |
| `one-word` | — | 1 mark, single word or phrase. |
| `short` | — | 2–3 marks, 2–3 sentences. `answerPoints` **MUST** list the expected points. |
| `long` | — | 4–5 marks. `answerPoints` **MUST** be present. |
| `numeric` | `unit`, `acceptable[]`, `workingRequired` | Maths. Mark the working, not only the result — put the steps in `answerPoints`. |
| `diagram-label` | `stimulus.asset`, `labels[]` | 1 mark per correct label. |
| `draw` | — | Judgement-based. `markingGuide` **MUST** be present. |
| `handwriting` | — | Copy-the-passage. `markingGuide` carries the rubric. |
| `activity` | — | Observation/do-at-home. `markingGuide` describes what a good response shows. |

For every judgement-based type (`draw`, `handwriting`, `activity`, and any `long`), the
model answer **MUST** end with a rubric the marker can apply, e.g.
*"Letters clear and evenly spaced — 5; mostly neat with some uneven letters — 3;
difficult to read — 1."*

### 5.5 Assets

Hindi needed no pictures. EVS and Maths will.

- Assets live in `app/assets/` and are referenced by relative path.
- **SVG is strongly preferred.** It scales, stays sharp on a phone, prints cleanly, and
  costs a fraction of a PNG.
- The build **MUST** inline every referenced asset as a `data:` URI, so the deployed page
  stays a single self-contained file (§8).
- The finished page **SHOULD** stay under 4 MB. If assets push past that, reduce them —
  do not split the page into multiple files.
- Any asset **MUST** carry a text `caption`, so a question is still answerable if the
  image fails to render.
- **Do not write a question that depends on an image you have not actually produced.**
  In the Hindi build, picture-based questions were rewritten as topic-based ones for
  exactly this reason. If there is no asset, rewrite the question.

### 5.6 Item ids

`{subject}-c{chapter}-s{section}-b{block}-i{item}`, e.g. `evs-c3-s1-b1-i1`.

Ids **MUST** be stable across edits, because saved marks are keyed by them. Renumbering
questions silently reassigns a child's marks to the wrong questions. If a question is
removed, retire its id; do not reuse it.

### 5.7 Validation — `npm run validate`

A zero-dependency Node script, run in CI and as part of the build. The build **MUST**
fail if any check fails:

1. Valid UTF-8 JSON; `schemaVersion` recognised.
2. Every section's `marks` equals the sum of its items' `marks`.
3. The paper total equals `totalMarks` exactly.
4. Item ids unique within the paper and matching the §5.6 pattern.
5. Every item has a non-empty `q` and a non-empty `answer`.
6. Items above 1 mark have `answerPoints` or `markingGuide`.
7. `mcq` answers appear in `options`; `options` has 3–4 entries.
8. Every referenced asset exists on disk.
9. Item count is within 45–60.
10. No `TODO`, `TBD`, `lorem`, or empty-bracket placeholder anywhere in the content.

---

## 6. UI strings and localisation

All interface text lives in `app/ui/{locale}.json`. **No user-visible string may be
hard-coded in the JavaScript.** This is what makes the same codebase serve a Hindi site
and an English one.

```jsonc
{
  "app.title": "EVS Practice",
  "login.heading": "EVS Practice",
  "login.user": "Username",
  "login.pass": "Password",
  "login.submit": "Sign in",
  "login.error": "Wrong username or password.",
  "chapters.greeting": "Hello, {name}!",
  "chapters.subtitle": "Pick a chapter. Each paper is {marks} marks.",
  "chapter.card": "Chapter {n} · {kind} · {marks} marks",
  "paper.instructions": "Write all your answers in your answer book. …",
  "paper.practiceBanner": "Practice mode — answers and marks appear only at checking time.",
  "paper.print": "Print question paper",
  "paper.back": "All chapters",
  "mode.lock": "Checking mode",
  "mode.unlock": "Exit checking mode",
  "mode.dialogTitle": "Checking mode",
  "mode.dialogSub": "Enter the secret code to see answers and enter marks.",
  "mode.wrongCode": "Wrong code. Please try again.",
  "mode.insecure": "Open this page over https so the code can be checked.",
  "answer.show": "Show answer",
  "answer.hide": "Hide answer",
  "answer.tag": "Model answer",
  "marks.label": "Marks given:",
  "marks.clear": "Clear marks",
  "score.obtained": "Score",
  "score.checked": "Questions checked",
  "result.button": "See result",
  "result.title": "Result",
  "grade.aplus": "A+ · Excellent",
  "…": "…"
}
```

Rules:

- Number formatting goes through one helper driven by `numerals`. Hindi renders `१००`,
  English renders `100`. Never hard-code a digit into a string.
- `{name}`, `{n}`, `{marks}` are the only interpolation syntax.
- A missing key **MUST** fail the build, not render as blank or as the raw key.

---

## 7. Application behaviour

### 7.1 Screens

`Login → Chapter list → Paper → Result`, in one page, no router, no URLs that reveal
state.

### 7.2 Login

A single shared credential from the Project Card, checked in the browser.

**This is not a security control and the README MUST say so plainly.** It keeps the page
tidy and gives the child a sense of occasion. It protects nothing. Do not build anything
on top of it that assumes otherwise.

Session may persist in `localStorage` so the child does not retype it daily.

### 7.3 The two modes — the core feature

**Practice mode is the default and is what the child uses.**

| Element | Practice | Checking |
|---|---|---|
| Questions, stimuli, per-question mark values | visible | visible |
| Per-question *Show answer* button | **hidden** | visible |
| *Show all answers* | **hidden** | visible |
| Marks buttons | **hidden** | visible |
| *Clear marks* | **hidden** | visible |
| Score bar | **hidden** | visible |
| *See result* | **hidden** | visible |
| Practice banner | visible | hidden |
| Back, Print | visible | visible |

Requirements:

1. Hidden means **removed from the accessibility tree and not clickable** — `hidden`, or
   `display:none`. Not dimmed, not `opacity`, not merely scrolled out of view.
2. Entering checking mode **MUST** require the secret code, via an in-page `<dialog>`.
   Not `window.prompt`.
3. Wrong code: clear message, field cleared, dialog stays open, nothing unlocks. No
   attempt limit is needed.
4. The unlock button toggles back to practice without re-asking for the code.
5. **Checking mode MUST live in memory only** — never `localStorage`, `sessionStorage`,
   a cookie, a query string, or a URL fragment. It **MUST** reset on: page reload,
   returning to the chapter list, opening another chapter, and logout. Revealed answers
   collapse when it resets.
6. Per-question reveal belongs **in checking mode**, not removed entirely. The checker
   works through the workbook one question at a time and wants one answer at a time.

### 7.4 Marking and results

- One mark input per item, `0…item.marks`, as buttons (they are large, touch-friendly,
  and make the maximum visible). A clear control resets an item to unmarked.
- Marks persist per chapter in `localStorage`, keyed by item id, and survive reload and
  mode changes.
- A running total shows score and how many items have been checked.
- The result screen shows section-wise obtained/total, percentage, a grade band, and a
  warning if some items are still unmarked.
- Marks never leave the browser. If cross-device history is ever wanted, that is a
  server feature and a separate decision.

### 7.5 Printing

`Print` **MUST** produce the question paper **without** answers, without the practice
banner, without any dialog, and without the marking UI — a clean paper the child can
write on. Leave vertical space under each question. Avoid breaking a block across pages.

### 7.6 Presentation

- Responsive to ~390 px with no horizontal scrolling. Wide tables and figures get their
  own `overflow-x` container.
- Light and dark themes via CSS custom properties, covering all three states: explicit
  light, explicit dark, and unset (system). Define every token in the base `:root`.
- Body text at least 16 px; question text is the largest thing on the page after
  headings. This is for a nine-year-old.
- Web fonts **MUST** have a real fallback stack — the page must stay legible if the font
  CDN is blocked.
- Respect `prefers-reduced-motion`.

---

## 8. Architecture and repo layout

The pattern that survived two sprints: **source split for editability, deployed as one
self-contained file.**

```
repo-root/
  BLUEPRINT.md            this document
  README.md               §11 — one README, at the root, and only one
  PROJECT-CARD.yml        §2
  package.json            scripts: build, validate, dev
  build.js                §9
  validate.js             §5.7
  vercel.json             at the ROOT — buildCommand, outputDirectory, no-op install
  .gitignore              .env.local, dist/, node_modules/, .vercel/
  .env.local              git-ignored: deploy token + marking secret for local builds
  source/                 §3 — the material the papers were written from
  app/
    index.html            page shell, keeps the __SECRET_HASH__ placeholder
    styles.css
    app.js
    ui/en.json
    data/*.json           one file per paper
    assets/*.svg
  dist/                   build output, git-ignored, one file
  sprints/vN/TASKS.md     §12
  sprints/vN/WALKTHROUGH.md
```

Why this shape:

- **Split source** keeps a paper editable. A 260 KB single file is miserable to diff, and
  a bad merge in it is unrecoverable.
- **Single-file output** removes a whole class of deployment failure. The first Hindi
  deployment shipped `index.html` without `styles.css` and `app.js`; the page rendered
  unstyled and the login form did nothing. One file cannot be partially uploaded.
- **No framework, no runtime dependencies.** The only build step is the one in §9.
  Do not add React, a bundler, or Tailwind to a page like this.

---

## 9. Build step and the marking secret

`node build.js` **MUST**:

1. Resolve the secret from `process.env[marking_secret_env]`, falling back to
   `.env.local` **only if the key is entirely absent**. A key that is present but empty
   is an error, not a reason to fall back to a stale local value.
2. **Fail loudly** — non-zero exit, nothing written to `dist/` — if the secret is unset
   or empty, if the `__SECRET_HASH__` placeholder is missing from the committed source,
   if validation (§5.7) fails, or if a referenced asset is missing.
3. Compute `sha256(secret.trim())` and substitute it for the placeholder.
4. Inline `styles.css`, `app.js`, `ui/{locale}.json`, every paper JSON, and every asset
   into one `dist/index.html`.
5. Print a one-line summary: output size, paper count, item count, and the first 12
   characters of the hash.

Secret handling rules:

- The plaintext secret **MUST NOT** appear in the repo or in anything served to the
  browser. Only the hash ships.
- The **committed source keeps the placeholder.** If a build ever writes the hash back
  into the tracked file, the next build has nothing to replace and must fail — which is
  why check 2 exists.
- Changing the code means changing the Vercel environment variable and redeploying.
  Never a source edit.
- Verification in the browser uses `crypto.subtle`, which **requires a secure context**.
  It works on `https://` and on `http://localhost`; it does **not** work from `file://`
  or from a bare IP over plain HTTP. Handle its absence with the `mode.insecure` message
  rather than a thrown error — and test locally over `localhost`, not by double-clicking
  the file.

**Be honest about what this is.** The answers are embedded in the page, so anyone who
opens dev-tools can read them without the code. It stops a nine-year-old. It is not a
security boundary, and the README **MUST** say so in those words. Making it airtight
means moving answers behind a server API — a deliberate future decision, not a quiet
assumption.

---

## 10. Deployment

Vercel, static, with the build step from §9. `vercel.json` at the repo root carries
`buildCommand`, `outputDirectory: "dist"` and a no-op `installCommand`, so deployment
needs no dashboard configuration beyond the environment variable.

### 10.1 Preflight — do this before planning, not after

The v1 sprint lost most of its time to two assumptions that were wrong. Check both up
front and report before proceeding:

1. **Is the token valid?** `GET /v2/user`. A token can be revoked and still look fine
   sitting in `.env.local`.
2. **Does this token's account actually own the target project and domain?** A project
   name only has to be unique *per account*. If the intended `*.vercel.app` hostname is
   held by a different account, Vercel will happily create a same-named project and
   silently assign a different URL — which is how the Hindi site ended up on
   `mily-hindi-abhyas-nu.vercel.app` while the old broken build kept serving on the
   original address. Confirm ownership, or agree the new URL with the user, **before**
   deploying.
3. **Does the repo contain what the brief says it contains?** In v1 the brief described a
   file that did not exist. Inspect first; if reality and brief disagree, stop and report
   rather than improvising.

### 10.2 Deploy

**Always deploy by CLI or git integration, never by browser drag-and-drop.** The
drag-and-drop upload is what dropped files in the original Hindi deployment.

```bash
export DEPLOY_TOKEN=$(grep '^VERCEL_TOKEN=' .env.local | cut -d= -f2-)
npx vercel link --yes --project <vercel_project> --token "$DEPLOY_TOKEN"   # once
npx vercel deploy --prod --yes --token "$DEPLOY_TOKEN"
```

The token is read into a shell variable and **MUST NOT** be echoed, logged, or written
into a walkthrough. Confirm `.env.local` is absent from the deployment's uploaded file
manifest.

---

## 11. README requirements

One README, at the repo root. If an older README elsewhere now contradicts it, **delete
the old one** — two contradictory READMEs are worse than one.

It **MUST** contain:

- What the site is and who uses it.
- A **Secrets** table: every credential, its name, where the value lives, what it
  controls. Document the marking secret's *variable name and location*, not its value —
  the README is committed, and writing the value there undoes the hashing.
- The student login, marked plainly as **not a security control**.
- The two modes, and how a checker unlocks checking mode.
- The honest "deterrent, not a security boundary" note from §9.
- Local build and run, including the `crypto.subtle`/localhost caveat.
- How to edit a question, and the rule that marks must still sum correctly.
- How to add a chapter.
- Deploy, redeploy, and rollback.

---

## 12. Sprint workflow

### 12.1 Sprint shape

Each sprint: `/prd` → `sprints/vN/TASKS.md` → `/dev` → `/walkthrough`.

Keep **content generation** and **application work** in separate sprints. They fail
differently: content needs subject judgement and careful proofreading, application work
needs testing. A sprint that does both does neither well.

A sensible sequence for a new subject:

| Sprint | Scope |
|---|---|
| v1 | Intake, section blueprint, schema, one complete sample paper, validator |
| v2 | Remaining chapters' papers |
| v3 | Application shell, both modes, marking, result, print |
| v4 | Build step, secret, deploy, README |

### 12.2 Parallelism

Parallelise by **file ownership**, not by task count. Two agents editing one file will
clobber each other — in the Hindi v2 sprint, three logically separate tasks that all
touched `app.js` were deliberately merged into one sequential agent for this reason.

Good parallel batch: one agent per chapter paper (separate JSON files). One agent for
HTML, one for CSS, one for the README.

Never parallel: multiple agents on the same source file; anything touching the deploy
token or production. Keep those under direct control.

### 12.3 Verify, don't trust the report

After a subagent finishes, **read the file it claims to have written.** Cross-check
between agents — that the class names the CSS agent used are the ones the HTML agent
actually wrote. Recompute claimed numbers independently (mark totals from the JSON, a
hash with a second tool). A confident summary is not evidence.

### 12.4 Walkthrough

Every sprint ends with `sprints/vN/WALKTHROUGH.md`: summary, architecture, files changed
and why, data flow, verification results, **known limitations**, and what's next.

State plainly what was *not* verified. Both Hindi walkthroughs recorded that no browser
click-through happened because no browser tool was available — that honesty is the
point. Never let "traced the code by hand" be written up as "tested".

---

## 13. Acceptance criteria

A generic checklist. Run it against the deployed URL, or locally over `http://localhost`.

**Content**

1. Every chapter in `source/` has a paper.
2. Every paper totals exactly `total_marks`; every section totals its declared marks.
3. Every item has a model answer; every multi-mark item explains its mark split.
4. Item count within 45–60 per paper.
5. `npm run validate` passes with no warnings.
6. Spot-check ten questions per paper against the textbook chapter: answerable, factually
   correct, age-appropriate, correctly spelled.

**Practice mode (fresh load)**

7. All questions and stimuli render; no answer text is present in the visible page.
8. No reveal buttons, no marks buttons, no score bar, no result button, no clear-marks.
9. The practice banner is visible.

**The gate**

10. The unlock button opens the dialog; Escape, cancel and backdrop-click all close it
    without unlocking.
11. A wrong code shows an error and unlocks nothing.
12. The correct code reveals the checking UI.

**Checking mode**

13. Per-question reveal shows the right answer for that question, and hides again.
14. Show-all reveals every answer; pressing it again hides them.
15. Full marks on every item totals exactly `total_marks`.
16. The result screen shows correct section-wise figures.

**Re-locking**

17. Toggling off hides answers and marks and collapses revealed answers.
18. Leaving the paper, opening another chapter, and reloading all return to practice mode.
19. Marks entered while unlocked survive a reload.

**Secret**

20. View-source of the deployed page contains no occurrence of the literal code. The
    variable *name* may appear in a comment; the value must not.
21. A 64-character hex hash is present where the placeholder was.
22. Building with the secret unset exits non-zero and writes no output.

**Non-functional**

23. Print produces the paper without answers, banner, dialog or marking UI.
24. No horizontal scrolling at 390 px; readable in light and dark.
25. No JavaScript errors in the console.
26. Every asset renders; no broken images.

**A live browser click-through of 7–19 MUST be performed before a sprint is called done.**
If no browser tool is available, say so explicitly and hand the checklist to the user —
do not quietly downgrade it to code reading.

---

## 14. Pitfalls — every one of these actually happened

1. **Browser drag-and-drop dropped files.** `index.html` deployed alone; `styles.css` and
   `app.js` 404'd; the page rendered as unstyled black text and the login form reloaded
   the page with a trailing `?` instead of logging in. Deploy by CLI. Ship one file.
2. **The `?` in the URL was the diagnostic.** A login form that submits and reloads means
   the JavaScript never loaded. Worth remembering as a symptom.
3. **A Vercel project name is not a domain.** Same name, different account, different
   URL — silently. Check ownership before deploying (§10.1).
4. **A token in `.env.local` can be dead.** Validate it before planning around it.
5. **The brief can be wrong about the repo.** Inspect first; report mismatches instead of
   improvising a fix.
6. **PDF extraction mangles non-Latin scripts.** Retype; never paste extracted text into
   a paper unread.
7. **`crypto.subtle` is undefined on `file://`.** Test over `localhost`.
8. **A build that writes the hash into the tracked source breaks the next build.** Keep
   the placeholder; make the build refuse if it is gone.
9. **Hiding only the answer text is not enough.** If the buttons remain in the DOM and
   clickable, the gate is decorative.
10. **Persisted unlock state defeats the feature.** Memory only.
11. **Renumbering questions reassigns saved marks.** Ids must be stable.
12. **Env vars do not reach a static page.** Without a build step, `process.env` is
    meaningless in a plain HTML file. This is precisely why §9 exists.
13. **Two READMEs will contradict each other.** Keep one.

---

## 15. Out of scope — and what each would cost

Deliberately excluded. Revisit only with a clear reason.

- **Server-side answers.** The only way to make the gate airtight. Costs the offline
  guarantee and the zero-infrastructure property.
- **Per-child accounts and cross-device history.** Needs a backend and a privacy
  decision about storing a child's performance data.
- **Auto-grading.** Defeats the purpose: the judgement is the teaching.
- **A question bank with randomised papers.** Papers are deliberately fixed so a child
  can retake the same one and see improvement.
- **Analytics.** The `skill` and `difficulty` tags in §5.3 exist so this stays possible
  later without a schema migration.
