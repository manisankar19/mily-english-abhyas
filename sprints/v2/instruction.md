# Instruction — Application shell, build & deploy (`mily-english-abhyas` v2)

**Audience:** the coding agent working in this repo.
**Your first job:** read this file, `CLAUDE.md` and `BLUEPRINT.md` completely, re-read
`sprints/v1/prd.md` and `sprints/v1/walkthrough.md` for what v1 actually produced, then write
`sprints/v2/prd.md`. Planning into atomic tasks happens afterwards with `/prd`, execution with `/dev`,
and the sprint closes with `/walkthrough` (lower-case `sprints/v2/walkthrough.md`, as in v1).

`BLUEPRINT.md` is the governing specification. Where it and this file disagree, this file wins, and
you record the disagreement in `sprints/v2/prd.md` under *Deviations from blueprint*. Where this file
disagrees with `PROJECT-CARD.yml` or `sprints/v1/prd.md` on a content fact (sections, marks, titles),
the card and the v1 PRD win; record that too.

The owner wants this built **autonomously and to completion**, including deployment. Do not stop to
ask routine questions. Stop only for the hard stops in §8. `CLAUDE.md` rules 1–8 bind every session
and every sub-agent in this sprint.

## 1. Goal

v1 produced seven validated content papers (six chapter papers plus the Half-Yearly mock, 100 marks
each) and the tools that guard them — no server, no UI, no build step. v2 wraps them in the
application `BLUEPRINT.md` §7–§10 describes:

1. The app shell **Login → Chapter list → Paper → Result**, one page, no router. The chapter list has
   **seven cards**: six chapter papers and the Half-Yearly mock.
2. **Practice mode** (the child, default) and **Checking mode** (the parent, secret-gated via
   `GANESH_ENGLISH`), as `BLUEPRINT.md` §7.3 plus the English additions in §3.3; print gives a clean paper.
3. `build.js` (zero dependencies: validate, hash the code, inline everything into one
   `dist/index.html`), `README.md`, `vercel.json`, and a production deploy by CLI.
4. A Playwright acceptance test of `BLUEPRINT.md` §13 checks 7–26 in a real headless browser, on
   `localhost` and again on the live URL.

Same look, feel and behaviour as the Maths site (`../mily-maths-abhyas/app/`, live at
`https://mily-maths-abhyas.vercel.app`): parity, not a redesign. What differs is the content: long text
stimuli, blanks, rubrics, and section lists that vary by paper.

## 2. What v1 delivered — read this before designing anything

Only settled facts are stated. Anything marked *confirm* is to be confirmed from
`sprints/v1/walkthrough.md` and a `jq` scan of the papers, and recorded in `prd.md`, not assumed.

- **Tooling, committed when this brief was written (2026-09-19):** `PROJECT-CARD.yml`, `SCHEMA.md`,
  `validate.js` (`--strict`, `--skip-source-check`; 41 fixture tests), `scripts/similarity.py`,
  `scripts/readability.py`, `source/INTAKE.md`, `scripts/lib/card.js` (card reader). The Python scripts
  have no role in the app or the build.
- **Papers:** seven, `app/data/english-ch{1..6}.json` and `english-hy.json`, `schemaVersion: "2.0"`,
  100 marks, 45–60 items (*confirm* exact counts; the plan is 54 for Chapters 1 and 4, 58 for the rest).
  The mock has `"chapter": null`, `"paperCode": "hy"` and the card's `extra_papers` title.
- **Section lists differ per paper — data, not code.** Chapters 1 and 4 (thin-poem profile, `prd.md`
  D9) have **five** sections A–E, 30/10/20/20/20. Chapters 2, 3, 5, 6 and the mock have **seven**, A–G,
  25/13/12/19/13/12/6. Titles are stored in title case ("Textual Questions"), not capitals.
- **Item `type`s by design:** `mcq`, `true-false`, `fill-blank` (single or multi-blank), `one-word`,
  `match`, `short`, `long`, `handwriting`; no `numeric`, no `layout` (`validate.js` also accepts
  `multi-select`, `diagram-label`, `draw`, `activity`; *confirm* which the papers use). **Stimuli:**
  `passage` and `poem` (`stimulus.text`, newlines are line breaks), `figure` (`asset` + `caption`),
  probably `table` (*confirm* its layout); a handwriting item's copy text is a `passage`. A stimulus sits
  on a block or an item: render both.
- **Figures:** five by plan, original SVG with `currentColor` in `app/assets/` — street map (Ch 1), road
  signs (Ch 3), park scene (Ch 4), four-panel picture story (Ch 6), mock scene. `prd.md` §7 says "at
  most five": *confirm* the final count, never hard-code it. None has been rendered in a themed page yet;
  check each against your real dark-mode CSS.
- **Never shown to the child** (`SCHEMA.md` §8, extended here): `answer`, `acceptable`, `answerPoints`,
  `markingGuide`, `difficulty`, `skill`, `chapterSource`, `sourceChapter`, `stimulus.original`,
  `stimulus.sourceRef`, paper-level `sourceRef`, and figure captions. Keep them in the data, out of the page.
- **`duration_minutes: 120` is an assumption** (`prd.md` D4; the worksheets print none). The Maths
  header prints its time from `durationMinutes`, so this app does too ("2 hours").
- Reuse `validate.js` as-is. Edit no content: a content bug found while building the UI becomes a note in
  `prd.md` and its own small content task.

## 3. Reuse from the Maths build — and what to rewrite for English

`../mily-maths-abhyas/` is a finished build of the same architecture. Read it, copy and adapt from it,
**never edit it**. **Reuse directly, changing only names** (`GANESH_MATHS`→`GANESH_ENGLISH`,
`milyMaths.*`→`milyEnglish.*`, paper keys `ch1…ch6` and `hy`):
- `vercel.json` verbatim; a `.vercelignore` (§4); the `build.js` skeleton (validator run, secret
  resolution, in-memory placeholder replacement, i18n key check, inlining, output assertions, write-last).
- `index.html`'s screens (`#loginView`, `#appShell`, `#chaptersView`, `#paperView`, `#resultView`, a `<dialog>`
  gate, never `window.prompt`), the paper header (organisation, class, subject, total marks, time, student),
  and `styles.css`'s theming, print and reduced-motion patterns.
- `app.js` mechanics: the `localStorage` helper; checking mode as an **in-memory** boolean reset by reload,
  back, another paper and logout; `crypto.subtle` SHA-256 against the injected hash, with `mode.insecure`;
  marks as `0…item.marks` buttons stored per paper by item id; the deterministic `match` layout (right column
  rotated by one); grade bands 90/75/60/40; percentage to one decimal, trailing `.0` dropped.
- `scripts/serve.js` and the shape of `scripts/e2e.js` (redacted output, no tracing or video, seeded choices).

**Rewrite for English:**

### 3.1 Text stimuli
- `passage` and `poem` render `stimulus.text` with newlines honoured: a poem keeps every line break (one
  line element per source line); a passage starts a paragraph at a blank line and keeps single breaks.
  Use `textContent`, never `innerHTML`, for content. Long lines wrap (`overflow-wrap: anywhere`); no
  horizontal scroll at 390 px; body text at least 16 px.
- **Newlines inside `q`.** Some items carry a list or two sentences to correct inside the question text
  itself — for example a sequencing item with lines (a)–(d), or "(a) … / (b) …" sentences (found while
  reviewing the v1 papers). Render every newline in `q` as a line break (`textContent` plus
  `white-space: pre-line`), not only in stimuli. Options and match cells stay single-line.
- **`match` pairs are stored in answer order** (`pairs[i].left` faces `pairs[i].right`), so the renderer
  **must** derange the right-hand column (Maths rotated it by one); showing the columns as stored would give
  every answer away. The checking-mode panel shows the true pairing.
- Poems and handwriting copy text never break across printed pages; copy text is set apart with writing
  room below it in print. `table` text keeps its columns and scrolls inside its own box. Blanks are the
  literal `_____`, rendered as a visible line that cannot wrap mid-blank.

### 3.2 Item bodies (switch on `item.type`)
`mcq`: an options list, no option marked. `match`: two columns from `pairs`; **one item, one marks row**
(`0…item.marks`); checking mode shows the true pairing. `true-false`, `fill-blank`, `one-word`, `short`,
`long`, `handwriting`: label and question text only. Any other type the validator allows gets a generic
body so nothing crashes; the e2e records which types the papers actually use.

### 3.3 Checking mode (English additions to `BLUEPRINT.md` §7.3)
Per item, behind the per-question reveal and show-all, the panel shows the **model answer**; the **mark
split** (`answerPoints`, one line per point with its marks); the **band rubric** (`markingGuide`, labelled
as a marking guide — English judgement items depend on it); and, for `fill-blank` and `one-word`, an
**"Also accept" list** from `acceptable` so the parent can pass a fair variant (multi-blank: one list per
blank). Figure captions appear on unlock, directly after their figure. In practice mode none of this
exists in the DOM.

### 3.4 The result screen renders the paper's own sections
Build the table from `paper.sections` in order — code, title (as stored, no uppercase transform),
obtained/marks, unmarked count — then total, percentage, grade band and the unmarked warning: five rows
for Chapters 1 and 4, seven for the rest.
**Never hard-code seven sections, 25, 100 or a paper count.** Chapters 1 and 4 are harder by design and
have no Spelling or Handwriting section, so their results are not comparable with the others (README only).

### 3.5 Authoring-only fields stay out of the page
In practice mode the DOM, its attributes (`data-*`, `title`, `aria-label`) and the visible text contain none
of the fields listed in §2. Answer panels and captions are **created on demand and removed** on re-lock,
not merely hidden. A figure is `role="img"` with a generic `aria-label` from `en.json` in practice mode
(Maths used the caption as the label, and a few captions gave the answer to a screen reader). `app.js`
never reads `chapterSource`, `sourceChapter`, `difficulty` or `skill` (§10, X2), the way Maths kept `expr` out.

### 3.6 Strings, keys, credentials
Every user-visible string lives in `app/ui/en.json` (`BLUEPRINT.md` §6; v1 wrote none): a missing key
fails the build, an unused key warns. Papers are keyed from the card (`chapters`, `extra_papers`), never a
literal list. Cards show number, title, marks and marking progress (omit the card's unit names). The
student login comes from the card's `student_login`; it is not a secret or a security control (README).

## 4. Single-file `dist/index.html` — not a split build

**Hard requirement, no exceptions without recording why in `prd.md`.** `node build.js` produces exactly
one file, `dist/index.html`: HTML, CSS, JS, `en.json`, all seven papers and every referenced SVG, inlined
(`BLUEPRINT.md` §8, §14.1). `build.js` must:
1. Run `node validate.js --strict --skip-source-check`, the flag passed **explicitly** (the validator's
   default is fail-loud): check `SOURCE_WINDOW` needs `source/`, which is not uploaded to Vercel. So the
   full check (`npm run validate`, no flag) must pass **locally** before every deploy and be recorded in
   the walkthrough; the build summary says "source check skipped".
2. Read every expectation from `PROJECT-CARD.yml` via `scripts/lib/card.js` (paper list, mock title).
   Maths' `build.js` hard-coded 8 papers and 54 items, which its walkthrough calls a trap. So
   `validate.js`, `scripts/lib/card.js` and `PROJECT-CARD.yml` **must be uploaded**: `.vercelignore`
   excludes `.env*`, `.vercel`, `node_modules`, `dist`, `source/`, `sprints/`, `fixtures/`, `scripts/e2e.js`,
   the Python scripts and caches, `.claude` — never those three.
3. Scan every paper for `stimulus.asset` (block and item level), read each distinct SVG once, check it
   starts with `<svg`, strip any XML preamble, inline it as `<svg>` so `currentColor` follows the theme.
   Fail on a missing asset.
4. Escape `</script` and `<!--` in embedded JSON with valid JSON escapes (`<\/script`, `\u003c!--`); use
   replacement functions, never replacement strings.
5. Assert the output: placeholder gone; exactly one 64-hex hash; no `src`/`href` to a local file; no
   plaintext code anywhere (§5); at most 4 MB (`BLUEPRINT.md` §5.5).
6. Compute in memory, write `dist/` only after every check passes, and print one line: size, papers,
   items, figures (counted from the data), first 12 hash characters, and the source-check note.

The page will be small; if it somehow exceeds 4 MB, minify, never split. The build's failure cases go in a
**committed** `scripts/test-build.js` (`npm run test:build`), run on temporary copies with throwaway codes;
Maths left its 26-case suite as scratch files and listed that as a limitation.

## 5. `GANESH_ENGLISH` — the marking secret

- The env var is exactly `GANESH_ENGLISH` (card), unique to this site. The **committed** `app/app.js`
  keeps `__SECRET_HASH__`, never the hash or the plaintext; `build.js` fails if the placeholder is missing
  or occurs twice (`BLUEPRINT.md` §14.8). Resolution: `process.env`, then `.env.local` only if the
  variable is entirely absent; present-but-empty is an error; hash `sha256(value.trim())`.
- The owner set a value of **exactly 10 characters** (the project minimum, `SETUP.md`) that contains one
  of the words english, ganesh or mily (`prd.md` R1), and will rotate it later through Vercel's environment
  and a redeploy. So `build.js` refuses a value under 10 characters (saying only that it is too short), and
  **fails if the plaintext value occurs anywhere in the assembled page**, without printing it (the Maths
  collision check). Only the owner can change the code, so a collision is a report, never a workaround.
- The value is never printed, logged, committed, or written into the README, `prd.md`, this file or the
  walkthrough; the README does not describe its shape. `e2e.js` redacts it from all output and greps its
  own output directory for it.
- `crypto.subtle` needs `https://` or `http://localhost` (not `file://`): test over `localhost`.
- Be honest in the README, in these words: **this is a deterrent for a nine-year-old, not a security
  boundary. Anyone opening dev-tools on the deployed page can read the answers without the code.**

## 6. Preflight — re-run all of it yourself at the start

Results below were true on 2026-09-19 and are no substitute for your own check. Every check is
count-only, presence-only or an HTTP code; never print a secret.

1. **Tools:** `node -v` (≥ 18; v22 at v1), `npm -v`, `jq`, `pdftotext` (the local source check needs it),
   `git`. **v1 is closed:** `sprints/v1/walkthrough.md` exists and `node validate.js --strict` exits 0 on
   all seven papers *before any application code*; if content drifted, fix it first as a content task.
   `git status` clean, v1's commits intact; note whether the `v1-content` tag exists (else record v1's
   last commit hash to diff against).
2. **`.env.local`:** `grep -c '^VERCEL_TOKEN=' .env.local` → 1; same for `^GANESH_ENGLISH=` → 1;
   `grep -c '^#'` → 0; the code's length via `awk … length()` (expect 10, at least 10); `stat -c %a` → 600
   (664 at v1's preflight). Never `cat` the file or `grep` it without `-c`.
3. **Vercel token:** `GET https://api.vercel.com/v2/user`, token in a shell variable passed on stdin
   (`-H @-`), only the HTTP code captured (`-o /dev/null -w "%{http_code}"`). Expect **200**.
4. **Project and hostname ownership.** At v1: `GET /v9/projects/mily-english-abhyas` → 404 in the personal
   scope and under the account's one team (unowned); public `https://mily-english-abhyas.vercel.app` → 404.
   That signature is **ambiguous** (Hindi's looked the same before its hostname proved squatted, Maths'
   before it proved free). Accept whatever `*.vercel.app` URL Vercel assigns, read it from the project's
   domains rather than guessing, and report it. It cannot block the sprint.
5. **Carry-over 1 — Playwright browsers.** `npm i -D playwright@<exact version>` (`dependencies` stays
   `{}`), then `npx playwright install --with-deps chromium webkit`. Record what `--with-deps` did on this
   Amazon Linux 2023 host; if it cannot install Chromium's libraries, use `dnf` and go on. **WebKit is
   expected not to launch** (in Maths it needed GLIBC 2.35/2.38; AL2023 has 2.34). Try once, record the
   failure, and **plan the manual iPhone/iPad checklist (§12) from the start**: the child likely uses Safari.
6. **Carry-over 2 — the source check on Vercel.** In a temporary copy of the repo without `source/`,
   confirm `node validate.js --strict --skip-source-check` exits 0. Never move or edit anything under
   `source/` in the repo (`CLAUDE.md` rule 2). Note `git remote -v`: `vercel link` may connect a GitHub repo,
   after which a push to `main` deploys to production (Maths). **Do not push.**

## 7. Sprint plan

Four batches, parallelised by file ownership (`BLUEPRINT.md` §12.2), **one commit per batch**. Content and
application stay separate: at every commit `git diff v1-content -- app/data app/assets validate.js` is empty
(or use the recorded v1 hash) and `npm run validate` exits 0. Before batch 1, `prd.md` fixes a **DOM
contract** (ids, classes, `data-*` hooks) so the HTML/CSS and JS agents build to the same names.

| Batch | Work | Owner (each writes only its own files) |
|---|---|---|
| 1 — shell and renderer | preflight, Playwright, `app/ui/en.json`, `package.json`, `.vercelignore`, `vercel.json`; login, chapter list, every type and stimulus in **practice mode** | coordinator ∥ `shell` (`index.html`, `styles.css`) ∥ `js` (`app.js`); `build` may start early |
| 2 — modes, gate, marking, result, print | dialog gate, checking mode (§3.3), marks, score bar, result (§3.4), print CSS | `shell` (CSS) ∥ `js` (`app.js`) ∥ `e2e` starts early |
| 3 — build, README, local e2e | `build.js`, `scripts/test-build.js`, `README.md`, `scripts/serve.js`, `scripts/e2e.js` (adapted from Maths; expectations read from the **served** page); the coordinator runs the real build and local e2e | `build` ∥ `docs` ∥ `e2e` |
| 4 — deploy, live e2e, walkthrough | link, env var, deploy, live e2e, `sprints/v2/walkthrough.md` | **coordinator only** |

- `app/app.js` has one owner all sprint. **No sub-agent reads `.env.local`, touches a token or deploys**;
  they test with throwaway codes. After each one, re-read what it wrote (`CLAUDE.md` rule 3), cross-check CSS
  class names against the HTML/JS, and re-run the checks yourself. Report only failures between steps.
- **Deploy, by CLI, never drag-and-drop:** `vercel link --yes --project mily-english-abhyas --token "$T"`
  (add the team `--scope` the token needs and report it); add `GANESH_ENGLISH` to the **Production**
  environment *before* the first deploy, on stdin with no trailing newline; then `vercel deploy --prod --yes
  --token "$T"`. The token stays in a shell variable, never echoed, unset afterwards.
- `vercel link` had side effects in Maths: it may connect a git remote, write a `VERCEL_OIDC_TOKEN` into
  `.env.local`, and append `.vercel` and `.env*` to `.gitignore`; check `git status` afterwards. Then check
  the deployment's file manifest (`GET /v6/deployments/{id}/files`): **no `.env*`**, no `source/`, no
  `sprints/`; `validate.js`, `PROJECT-CARD.yml` and `scripts/lib/card.js` present. Leave Deployment
  Protection at Vercel's default; if it blocks the production URL, stop (§8).

## 8. Hard stops — the only reasons to pause and ask

- The Vercel token is invalid or revoked.
- Any step that would print, log or commit `VERCEL_TOKEN` or `GANESH_ENGLISH` (for the latter, even its
  hash in a *committed source* file rather than only in `dist/`).
- `node validate.js --strict` fails on a v1 paper, or v1 is not closed (no `walkthrough.md`, or fewer than
  seven papers): a content regression or unfinished sprint, not an app problem.
- The build's plaintext-collision check fires: report to the owner, value unprinted.
- The single-file budget is exceeded after minifying: report the numbers; never split.
- Deployment Protection blocks the production hostname: report; change no setting by any means.
- **No headless browser launches at all** (Chromium as well as WebKit). WebKit alone failing is expected
  and is not a stop. Say so and hand §12 and §10 to the owner.

**Owner decisions already taken, not to be re-opened** (`prd.md` Revision 2, `TASKS.md` header): Chapters 1
and 4 have five sections; there is no full revision paper (D1) and 120 minutes stands as an assumption (D4);
the marking code stands and the owner rotates it later. Everything else, including which hostname Vercel
assigns, is a decision: record it and continue.

## 9. Honesty requirements

- Never write "tested" for something you only read or traced. The walkthrough lists every §10 item exercised
  in a browser versus only read or inferred; the target is checks 7–19 clicked through by a real browser on
  **both** localhost and the live URL.
- Say plainly that **no Safari/WebKit result exists** if WebKit again cannot run, and that Firefox and real
  touch devices were not tested; results are Chromium only.
- Record that the source check ran locally and was skipped on Vercel, and that 120 minutes is an assumption.
  The e2e and readability numbers do not replace a human reading the questions; say who has.

## 10. Acceptance checklist — `BLUEPRINT.md` §13

Run by `scripts/e2e.js` (Playwright, Chromium) on `http://localhost` and on the live URL; expectations
come from the **served page's** embedded JSON, so the live run tests what is deployed. Secret checks print
only booleans and the 12-character hash prefix; a failing check is recorded, not fatal.

**Content** (1–6 are v1's; confirm nothing regressed): every chapter has a paper; every paper totals 100
and every section its declared marks; every item has an answer and every multi-mark item its mark split;
45–60 items; `npm run validate` (full) passes; the textbook spot-check is v1 Task 12's.

**Practice mode (fresh load)**
7. All questions and stimuli render; no answer text is present. The e2e takes from the served JSON every
`answer`, mark-split point, marking guide, `acceptable` variant and caption of 12+ characters that is not
also question, option or stimulus text and asserts none is on the page, and that no `data-*`, `class` or
`aria-label` names an answer, difficulty, skill or chapter source.
8. No reveal, marks, score bar, result or clear-marks control is reachable. 9. The practice banner shows.

**The gate:** 10 the unlock button opens the dialog; Escape, cancel and backdrop-click close it without
unlocking; 11 a wrong code shows an error, clears the field, keeps the dialog open, unlocks nothing; 12 the
correct code reveals the checking UI (typed from memory by the e2e, never printed).

**Checking mode**
13. Per-question reveal shows that item's answer and hides it again, sampling every type in use plus an
`acceptable` list, a multi-blank, a rubric and a figure. 14. Show-all reveals everything; again, hides.
15. Full marks on every item totals exactly 100 for **every** paper (7/7), each section at its own full
marks. 16. The result's section figures equal figures the e2e recomputes from the JSON, for a mixed marking
of Chapter 1 (five sections) and of a seven-section paper.

**Re-locking:** 17 toggling off hides answers and marks and removes revealed panels and captions; 18 back,
home, another paper, reload and logout each return to practice mode; 19 marks entered while unlocked
survive a reload.

**Secret:** 20 view-source has no occurrence of the literal code (the variable name may appear); 21 one
64-hex hash sits where the placeholder was, equal to `sha256(code)`; 22 building with the code unset,
empty, or the placeholder missing exits non-zero and writes nothing, and a control build exits 0 with one
file (build-only: "N/A" on the live URL, and say so).

**Non-functional**
23. Print Chapter 1, a seven-section chapter and the mock with every answer revealed and run `pdftotext`:
passages, poems and questions **are** there; answers, rubric text, "Also accept", captions, "Model answer",
the banner and marking UI are **not**; no poem is split across pages. 24. No horizontal scroll at 390 px,
light and dark, every paper; record the minimum contrast. 25. No JavaScript errors or warnings.
26. Every figure renders non-empty, no failed request, legible in dark mode.

**English additions** (recorded like any other check)
- **X1** Without `crypto.subtle` the gate shows `mode.insecure` and unlocks nothing.
- **X2** *Static, not a browser check, and labelled so:* committed `app/app.js` contains none of
  `chapterSource`, `sourceChapter`, `difficulty`, `skill` (comments included).
- **X3** Paper view and result list exactly the served data's section codes, titles and marks: five for
  Chapters 1 and 4, seven for the others and the mock.
- **X4** A poem renders one line element per source line; a passage keeps its paragraphs; no text stimulus
  scrolls the page sideways. **X5** Checking mode shows rubric, mark split and "Also accept" for sampled
  items; practice mode shows none.
- Negative controls, once, on broken scratch copies: an injected answer or caption → 7; a visible score bar
  → 8; plaintext code in a comment → 20; a zeroed hash → 21; print CSS showing answers → 23; a
  `difficulty` read in `app.js` → X2.

**A live browser click-through of 7–19 MUST be performed before this sprint is called done.** If no browser
can launch, say so and hand the checklist to the owner (`BLUEPRINT.md` §12.4).

## 11. README requirements (`BLUEPRINT.md` §11)

One README at the repo root (`docs` writes it, the coordinator finishes it): what the site is and who uses
it; a **Secrets** table (names and locations, never values); the student login, marked *not a security
control*; the two modes and how to unlock; the verbatim sentence of §5; local build and run with the
`localhost` caveat; test commands; how to edit a question (ids stable, marks still sum, full `npm run
validate`); how to add a chapter (card entry, paper file, validate — no build edits); how to change the code
(Vercel Production variable, redeploy, never a source edit, at least 10 characters); deploy, redeploy,
rollback; the git-integration and Deployment Protection notes; the live URL. It also states the two section
profiles and why Chapters 1 and 4 are not comparable, that **`durationMinutes` is an assumed value**, and
that the full source check runs locally only while the Vercel build skips it explicitly.

## 12. Manual iPhone/iPad checklist — the walkthrough must hand this to the owner

WebKit could not run in the Maths build and is expected not to here. End the walkthrough with this list,
written for the live URL (Safari on iPhone, then iPad in both orientations):
1. Sign in as Mily. The chapter list shows seven cards.
2. Open Chapter 1 (five sections), a seven-section chapter and the mock. Passage and poem are readable, poem
   lines break where they should, and the page does not scroll sideways (a wide figure may scroll in its box).
3. Switch the device to Dark Mode. Text and every figure stay readable.
4. Tap Checking mode; tapping the code box does not zoom the page. A wrong code shows an error; Cancel and a
   tap outside both close the box.
5. Enter the right code. Show one answer on a fill-in item ("Also accept" appears), a short answer (mark
   split), a writing item (marking guide) and a figure item (caption). Hide each.
6. Tap some marks; the score bar updates. See result: Chapter 1 shows five sections. Reload: practice mode,
   no answers or captions; unlock again and the marks are still there.
7. Share → Print (or print preview): no answers, captions, banner or marking buttons.

## 13. Open questions and conflicts found while drafting

Recorded, not papered over; resolve each in `prd.md`.
1. **Card count.** The request behind this brief said "nine cards" and also "7 papers total". The card and
   `prd.md` §3.5/§5 give six chapters plus one mock, so this brief says **seven**.
2. **Captions versus `BLUEPRINT.md` §5.5.** The blueprint wants a caption so a question survives a failed
   image; Maths' rule, and the request behind this brief, keep captions out of the practice DOM. v1 requires
   captions not to state an answer, so exposing one would be safe. Default: the stricter rule (§3.5);
   revisit if a figure question proves unanswerable without a text fallback.
3. **`SCHEMA.md` §8 lists eight child-hidden fields; §2 here lists twelve** (adding `stimulus.original`,
   `stimulus.sourceRef`, paper `sourceRef`, captions). `SCHEMA.md` was not edited; extend it in batch 1.
4. **Duration on the paper header.** Maths prints the time; here it is assumed. Default: print it and say so
   in the README; the owner may prefer to omit it.
5. **File-name case.** `BLUEPRINT.md` says `WALKTHROUGH.md`; `CLAUDE.md` and v1 use lower-case. Lower-case here.
