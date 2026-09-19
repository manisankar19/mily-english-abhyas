# Sprint v2 — Interim walkthrough, batch 1 (Tasks 1–6) — mily-english-abhyas

**This is a partial, interim report. Sprint v2 is not finished.** Tasks 7–20 (checking mode, marking, result, print,
`build.js`, README, e2e, deploy) are not started. The final `sprints/v2/walkthrough.md` is written at Task 20. This file
has a different name on purpose: `CLAUDE.md` identifies the current sprint as the one with no `walkthrough.md`, so a
file with that name now would wrongly mark v2 as closed.

Commits: `20ebfb7` (Task 1) · `99276c0` (2) · `1ea9a53` (3) · `24d53c8` (4) · `999c997` (5) · `391b54e` (6). Nothing pushed;
no Vercel command run. Plan: `sprints/v2/prd.md`, `sprints/v2/TASKS.md`.

## Summary

Batch 1 built the practice-mode app: login, a chapter list of seven cards read from `PROJECT-CARD.yml`, and a paper
renderer for every item type and stimulus the 400 v1 items use (passages, poems, copy texts, figures, blanks, newlines
in questions, a deranged `match`). Parity with the Maths site: its `index.html` and `styles.css` were copied and its
`app.js` adapted. There is no build step yet. A committed test harness assembles the page in memory with a throwaway code
and checks it in headless Chromium: **142 checks pass, 0 fail.**

## Architecture overview

```
PROJECT-CARD.yml ──▶ scripts/lib/card.js ─┐  (paper order ch1…ch6, hy; student_login)
app/data/english-*.json (7, frozen) ───────┤
app/assets/english-*.svg (5, frozen) ──────┼──▶ tests/harness.js  (stand-in for build.js, Task 12)
app/ui/en.json (98 strings) ───────────────┤      inlines CSS + JS + 3 JSON <script>s, throwaway hash
app/index.html · styles.css · app.js ──────┘      serves on http://localhost:<random>
                                                          │
                                                          ▼
                                        tests/batch1.e2e.js (Playwright 1.63.0, Chromium)
Browser page:
  #loginView ──▶ #chaptersView (7 cards from papersData.order) ──▶ #paperView (practice mode)
                                                                  └─ #resultView (batch 2)
  embedded: #uiStrings · #papersData {order, login, papers} · #assetsData {path: <svg…>}
```

## Files created or modified

### package.json, package-lock.json
**Purpose:** dev tooling only. `playwright` pinned at exactly `1.63.0` as a devDependency; `dependencies` is `{}`.
Scripts added: `build`, `test:build`, `serve`, `dev`, `e2e` (their target files arrive in batch 3).

### vercel.json, .vercelignore
**Purpose:** deploy configuration, not used yet. `vercel.json` is the Maths file verbatim (`node build.js`, output `dist`,
no-op install). `.vercelignore` excludes `.env*`, `.vercel`, `.claude`, `node_modules`, `dist`, `source/`, `sprints/`,
`fixtures/`, `tests/`, the e2e/test/Python scripts and caches. Checked with `git check-ignore` against every file: it keeps
`validate.js`, `PROJECT-CARD.yml`, `scripts/lib/card.js`, `build.js` and `app/`, which the Vercel build needs.

### app/ui/en.json (98 keys)
**Purpose:** every user-visible string (`BLUEPRINT.md` §6). The Maths set, reworded for English, plus
`stimulus.figureLabel` ("Picture for this question"), `answer.accept`, `answer.acceptBlank` and `answer.pairs` for batch 2.
Batch-2 keys are already here so `app.js` has one string source. Interpolation is `{word}` only.

### SCHEMA.md §8
**Purpose:** now lists the twelve fields that must never reach the practice page (item: `answer`, `acceptable`,
`answerPoints`, `markingGuide`, `difficulty`, `skill`, `chapterSource`, `sourceChapter`; stimulus: `original`,
`sourceRef`, figure `caption`; paper: `sourceRef`). This follows the brief's default for open question Q3.

### app/index.html (118 lines)
**Purpose:** the page shell. It is copied from Maths, with the favicon changed to 📖. It holds the four views, the top bar,
the paper toolbar, the score bar and the `<dialog id="checkDialog">` gate. All text comes from `data-i18n` attributes.
It has no `__SECRET_HASH__`.

### app/styles.css (799 lines)
**Purpose:** theming and layout. It is the Maths stylesheet, with light, dark (system and explicit) tokens on `:root`,
reduced motion, and print and checking-mode rules that Task 10 will review. An English block is added at the end:

```css
.item-text{white-space:pre-line; overflow-wrap:anywhere}      /* newlines inside q */
.stimulus-passage p + p{margin-top:.8em}                      /* one <p> per paragraph */
.poem-line{display:block; padding-left:1.5em; text-indent:-1.5em}  /* wrapped line hangs */
@media print{ .stimulus-poem,.stimulus-copy{break-inside:avoid} .item.type-handwriting{padding-bottom:6cm} }
```

The crest and top-bar emoji changed from 🧮 to 📖.

### app/app.js (537 lines, 34 functions)
**Purpose:** the whole app, adapted from Maths. It covers practice mode only for now.
- `readJson()` reads the three embedded JSON blocks. `AUTH` comes from `papersData.login`, which is the card's
  `student_login`; no credential literal is in `app.js`.
- `t()` / `translate()` throw on a missing key or variable; `fillI18n()` fills static markup.
- `store` wraps `localStorage` in try/catch. Keys are `milyEnglish.session`, `.studentName`, `.scores.<key>`.
- `renderChapters()` makes one card per key in `papersData.order`, showing number (or "HY"), title, marks and progress,
  with no unit names.
- `applyMode()` is the practice-mode visibility table: banner shown; show-all, clear-marks, score bar and result button
  hidden. `checkMode` is an in-memory boolean. It stays false in this batch; the gate is Task 7.
- `renderPaper()`, `renderPaperHead()` (organisation, class, subject, marks, "2 hours" from `durationMinutes`, student),
  `renderBlock()` and `renderItem()` build everything from the paper data, sections in stored order, so a paper shows
  five or seven sections as its data says.
- `renderQuestionText()` builds `q` from text nodes, with `_____` as a non-wrapping `span.blank`.
- `renderTypeBody()`: `mcq` gets an options list with nothing marked. `match` rotates the right column by one:

  ```js
  for (let i = 0; i < n; i++) right.append(el('li', null, it.pairs[(i + 1) % n].right));
  ```

  All other types show the question only.
- `renderStimulus()`: a poem gets one `.poem-line` per source line. A passage gets one `<p>` per blank-line paragraph,
  plus `.stimulus-copy` in a handwriting block. A figure is inline SVG in a `role="img"` wrapper with the generic label.
  It reads only `kind`, `text` and `asset`, never `caption`, `original` or `sourceRef`.
- `stripSvgNames()` (new, see Known limitations): removes `<title>`, `<desc>` and root `role`/`aria-*` from the SVG before
  it is inserted. `namespaceSvgIds()` is kept from Maths.
- Content is set with `textContent`. The one `innerHTML` is the build-time SVG from `app/assets/`, which is trusted
  markup.

### tests/harness.js (72 lines)
**Purpose:** a stand-in for `build.js` until Task 12. It reads the card, loads the papers in card order, collects each
distinct SVG once (strips any XML preamble, checks it starts with `<svg`), and inlines CSS, JS and three JSON blocks. It
escapes `</script` and `<!--` with replacement functions and substitutes a **throwaway** hash. It then serves the page
on `localhost`. It never reads `.env.local` and writes nothing.

### tests/batch1.e2e.js (231 lines)
**Purpose:** the batch-1 acceptance test. See Test coverage. It saves screenshots to `tests/screenshots/`, which is
git-ignored.

### sprints/v2/prd.md, sprints/v2/TASKS.md, .gitignore
prd.md §7 was amended so the element names match what the Maths code really uses (the draft had guessed some), and §5
records the SVG finding. TASKS.md ticks Tasks 1–6 with completion notes. `.gitignore` adds `tests/screenshots/`.

## Data flow

1. Harness (later `build.js`): card → paper list → papers, strings and SVGs → one HTML page with an injected hash.
2. Page boot: `fillI18n()` → login view (or the chapter list, if `milyEnglish.session` is set).
3. Login checks the typed values against `papersData.login`. The chapter list is built from `papersData.order` and the
   saved scores.
4. Clicking a card → `openPaper(key)` → `checkMode = false` → `renderPaper()` renders from data → `applyMode()`.
5. Back, home or logout → `lockAndApply()` → chapter list or login.

## Test coverage

All results below come from runs. "Tested" means run in headless Chromium on `http://localhost` with a throwaway code.

- **`tests/batch1.e2e.js`: 142 checks, 142 pass.**
  - *Static:* every element id in prd.md §7 is in `index.html`; there is a `<dialog>`; `__SECRET_HASH__` appears once in
    `app.js` and not in HTML or CSS; `app.js` uses `milyEnglish.*` only and has no login literal. Every `t('…')` and
    `data-i18n` key exists in `en.json`. **X2 (static, not a browser check):** `app.js` contains none of
    `chapterSource`, `sourceChapter`, `difficulty` or `skill`.
  - *Login and navigation:* fresh load shows login; a wrong password shows the error; the right one shows **7 cards in
    card order** with titles and no unit names; the session survives a reload; logout returns to login.
  - *Per paper (all 7):*
    - every item and every section head renders (X3: code, title and marks equal the data: 5 for Ch 1 and Ch 4, 7 for
      the rest);
    - the header has the organisation, "English", 100 and "2 hours";
    - check 7: none of the paper's answers, `acceptable` variants, mark-split points, marking guides, captions, source
      refs or chapter sources of 12+ characters (excluding any that also appear in question or stimulus text) is in the
      paper view's HTML, and no `data-*`, `class`, `aria-label` or `title` names a hidden field;
    - checks 8/9: banner visible; no answer panel, caption, reveal, marks, score bar or result reachable;
    - X4: poems have one line element per source line, passages one `<p>` per paragraph;
    - check 26: every figure renders larger than 50×50 px, with the generic label and no inner SVG name;
    - newlines in `q` render as line breaks; `match` right columns are deranged; the count of `.blank` spans equals the
      count of `_____`; `mcq` options are listed in order;
    - body text is at least 16 px;
    - check 24: no horizontal scroll at 390 px, in light and in dark.
  - *Figures in dark mode:* stroke colour is light on a dark box. *Check 25:* 0 console errors, 0 warnings, 0 failed
    requests.
- **Looked at by the coordinator (screenshots, once each):** all five figures at 2× on the dark theme (all legible); the
  Ch 1 page at 390 px in dark; the chapter list; the Ch 1 poem; a Ch 5 sequencing item with newlines in `q`; a `match`
  item; a copy text.
- **Pre-existing suites, still green:** `npm run validate` 7/7. `git diff v1-content -- app/data app/assets validate.js`
  is empty.
- **Not tested yet:** everything in checking mode, marking, the result screen, print (checks 10–23, X1, X5); the real
  build; the live URL; WebKit, Firefox and touch devices.

## Security measures

- No secret was read in batch 1 except by the Task 1 preflight, which was count-only. Tests use a random throwaway code
  and fail if it appears in their own output.
- The committed `app.js` keeps the `__SECRET_HASH__` placeholder (once).
- Answer-bearing fields are never read by the practice renderer, and caption-bearing SVG names are stripped. Check 7
  proves both for all 7 papers.
- `.vercelignore` keeps `.env*`, `source/` and `sprints/` out of any future upload.
- semgrep (`p/javascript`, `p/secrets`, metrics off): 3 files scanned (`app.js`, both test files), 0 findings.
  `npm audit`: 0 vulnerabilities.
- The gate itself does not exist yet. Even when built, it is a deterrent for a nine-year-old, not a security boundary.

## Known limitations

1. **Playwright `--with-deps` failed on this host:** it fell back to Ubuntu and called `apt-get` (exit 127). Chromium
   works anyway from the existing cache. **WebKit does not launch** ("Host system is missing dependencies"; glibc 2.34),
   so there is no Safari result, and none is expected this sprint. The manual iPhone/iPad checklist stays planned.
2. **The SVG files carry caption text** in `<title>` (all five) and root `aria-label`/`aria-labelledby` (three). The app
   strips it at render time; the files are unchanged, because content is frozen. A small content task could remove it
   at the source (prd.md §5).
3. **The harness is not the build.** Batch 1 was tested through `tests/harness.js`. `build.js` (Task 12) must reproduce
   the same assembly, and the real code has not been used yet.
4. **`styles.css` already contains the Maths checking-mode, result and print rules.** They are untested here, and
   Task 10 reviews them.
5. **Process deviations:** the coordinator wrote `index.html`, `styles.css` and `app.js` itself instead of using
   `shell`/`js` sub-agents, so single ownership still holds. Commits were made per task, not per batch (`CLAUDE.md` rule
   5). The skill's `data-testid` convention was not adopted; tests use the contract ids and classes, as Maths did.
6. **Open questions Q1–Q5 (prd.md §2) are still unconfirmed by the owner.** Batch 1 follows the defaults: seven cards,
   captions hidden, twelve hidden fields, "2 hours" printed.

## What's next

Batch 2, Tasks 7–11:
- the dialog gate with `crypto.subtle` and `mode.insecure`;
- checking-mode answer panels created on demand: model answer, mark split, marking guide, "Also accept" per blank, true
  `match` pairs, captions after their figure;
- marks, score bar and a result table from `paper.sections`;
- a review of print CSS;
- a batch-2 coordinator check.

Then batch 3 (build, tests, README, local e2e), and batch 4 behind the owner-approval gate (Task 17) before any
`vercel link`, deploy or push.
