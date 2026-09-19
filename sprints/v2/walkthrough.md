# Sprint v2 — Walkthrough (Application shell, build & deploy) — mily-english-abhyas

**Status: all 20 tasks in `sprints/v2/TASKS.md` are ticked.**
- **Live site:** https://mily-english-abhyas.vercel.app
- **Verification:** Chromium only; there is no Safari result.
- **Open item:** the git-triggered redeploy is blocked by Vercel (see Known limitations 1).
- **Filename:** lower case, as in v1 (prd.md Q5).
- **Interim report:** `sprints/v2/walkthrough-batch1.md` covers batch 1 (Tasks 1–6) in more detail. This file covers the
  whole sprint.

## Summary

v2 turned the seven validated v1 papers into the site that `BLUEPRINT.md` §7–§10 describes:
- **Screens:** one page, Login → Chapter list (seven cards from the card) → Paper → Result.
- **Modes:** practice mode for the child, and checking mode for the parent behind a SHA-256 code gate.
- **Checking mode additions for English:** model answer, mark split, marking guide, an "Also accept" list per blank, the
  true match pairs, and figure captions shown only after unlocking.
- **Build:** `build.js` inlines everything into one 293 KB `dist/index.html`.
- **Deploy:** by CLI to Vercel.

A Playwright suite runs the `BLUEPRINT.md` §13 checks. It passed on localhost (24/24) and on the live URL (23/23, plus
one build-only check marked N/A).

## Architecture overview

```
PROJECT-CARD.yml ──▶ scripts/lib/card.js ─┐  paper order (ch1…ch6, hy), student_login
app/data/english-*.json (7, frozen) ───────┤
app/assets/english-*.svg (5, frozen) ──────┤
app/ui/en.json (98 strings) ───────────────┼──▶ build.js
app/index.html · styles.css · app.js ──────┘    1 validate.js --strict --skip-source-check
   (app.js keeps __SECRET_HASH__)               2 GANESH_ENGLISH: env, else .env.local if absent; ≥10 chars
                                                3 sha256 → placeholder; inline CSS/JS/JSON/SVG
                                                4 assert: 1 hash, no local src/href, no plaintext code, ≤4 MB
                                                5 write dist/index.html last (temp file + rename)
                                                        │
             ┌──────────────────────────────────────────┴──────────────┐
             ▼                                                         ▼
  scripts/serve.js (127.0.0.1) ──▶ scripts/e2e.js       vercel deploy --prod (CLI, team mani125slm)
                                   (Chromium, reads the   └▶ Vercel runs node build.js with the
                                    served page's JSON)       Production GANESH_ENGLISH
                                                           └▶ https://mily-english-abhyas.vercel.app
Browser: #loginView → #chaptersView → #paperView (practice | checking, in memory) → #resultView
         marks → localStorage milyEnglish.scores.<paper>; nothing leaves the browser
```

## How the work was run

| Batch | Tasks | Who wrote the files | Commits |
|---|---|---|---|
| 1: shell and renderer | 1–6 | coordinator (all files) | `20ebfb7`…`391b54e` |
| 2: modes, gate, marking, result, print | 7–11 | `js` agent (`app.js`) ∥ `shell` agent (`styles.css`); coordinator did Task 11 | `f558766`, `7ab3a8d`, `2101ab7` |
| 3: build, README, local e2e | 12–16 | `build` agent (`build.js`, `test-build.js`) ∥ `docs` agent (`README.md`) ∥ `e2e` agent (`serve.js`, `e2e.js`); coordinator did Task 16 | `ad0bd4e`, `41cbde0`, `0684df4`, `2353cfc`, `440a3d0` |
| 4: deploy, live e2e, walkthrough | 17–20 | coordinator only | `f1ff366`, `5b15c0c`, `4e43a58`, this commit |

- **Batches 2 and 3 ran as five parallel agents**, split by file ownership. Before they started, the coordinator fixed the
  checking-mode, gate and result element names in `prd.md` §7, so the CSS, JS and e2e agents built to the same names.
- **No agent read `.env.local`, touched a token, committed, pushed or deployed.** All of them tested with throwaway codes.
- **The coordinator re-checked every agent's work.** It re-read each agent's diff, re-ran each agent's tests and semgrep,
  and changed two things:
  - "Also accept" is now shown for any item with `acceptable` data. Two Ch 3 `short` road-sign items have it, and the
    agent's fill-blank/one-word rule would have hidden their accepted variants from the parent.
  - Every build failure case now also asserts its own error message.
- **Deviations from the plan:**
  - Commits were made per task (`CLAUDE.md` rule 5), not one per batch.
  - The coordinator wrote batch 1 itself.
  - Tasks 7–9 went into one commit, because they were one file written in one pass.

## Files created or modified

### app/app.js (948 lines)
**Purpose:** the whole app, adapted from the Maths site.
- **Practice mode (batch 1):**
  - `readJson()` reads `#uiStrings`, `#papersData` (`{order, login, papers}`) and `#assetsData`.
  - Login comes from the card, so `app.js` has no credential literal.
  - `renderChapters()` draws one card per key in the card's order.
  - `renderPaper()`, `renderBlock()`, `renderItem()` and `renderStimulus()` draw every section, block and item from the
    data. A poem gets one `.poem-line` per source line. A passage gets one `<p>` per blank-line paragraph, and a
    handwriting copy text is marked `.stimulus-copy`. Newlines in `q` are kept (`pre-line`) and `_____` becomes
    `span.blank`.
  - A `match` item rotates its right-hand column by one, because the pairs are stored in answer order.
  - `stripSvgNames()` removes an SVG's `<title>`, `<desc>` and root `role`/`aria-*` before inserting it. Four assets
    carry their caption text there (prd.md §5).
- **Checking mode (batch 2):**
  - **Gate:** `onCheckModeClick()` / `onCheckSubmit()` open a `showModal()` dialog and compare
    `sha256(input.trim())` with the injected hash. They guard against double submits, and show `mode.insecure` when
    `crypto.subtle` is missing.
  - **Mode:** `checkMode` is an in-memory boolean. `lockAndApply()` resets it on back, home, another paper and logout,
    and a reload resets it too.
  - **Answers:** `showAnswer()` creates `div.answer` (model answer, mark split, marking guide, "Also accept", true pairs)
    and `hideAnswer()` removes it.
  - **Captions:** `addCaptions()` / `removeCaptions()` create and remove `p.stimulus-caption`. The caption text comes from
    a `WeakMap` filled at render time and is never put in an attribute.
- **Marks and result:**
  - `renderMarksRow()`, `setMark()` and `updateScore()` handle the marks buttons, keyed by item id in `localStorage`.
  - `renderResult()` builds one `tr[data-section]` per `paper.sections` entry, then a total row. The percentage is
    rounded to one decimal with a trailing `.0` dropped, and the grade uses bands 90/75/60/40 on that rounded value.

  ```js
  const pct = paper.totalMarks > 0 ? Math.round((tot.got / paper.totalMarks) * 1000) / 10 : 0;  // 87.0 → "87"
  ```
- **What `app.js` never contains:** a hard-coded 7 sections, 25, 100 or paper count; the words `chapterSource`,
  `sourceChapter`, `difficulty` or `skill` (X2). It has exactly one `innerHTML`, for the trusted build-time SVG.

### app/index.html (118), app/styles.css (821), app/ui/en.json (98 keys)
- **`index.html`:** Maths parity, with a 📖 icon.
- **`styles.css`:** the Maths tokens for light, dark and system themes, plus reduced motion and print, with English
  additions:
  - newlines in `q` kept, with `overflow-wrap:anywhere`;
  - passage, poem (hanging indent) and copy-text boxes;
  - `.ans-accept` and `.ans-pairs`;
  - a result table that wraps at 390 px;
  - a print block that hides every checking-mode element in any mode and keeps poems and copy text on one page.
- **`en.json`:** holds every user-visible string.

### build.js (185) and scripts/test-build.js (135)
- **`build.js`:** follows brief §4–§5 exactly; see the diagram. It has zero dependencies, reads the card and exports
  its functions.
- **`test-build.js` (`npm run test:build`):** 15 cases, each on a temporary copy of the repo with throwaway codes.
  - **Failure cases:** code unset, empty, whitespace only or under 10 characters; an empty `.env.local` value;
    placeholder missing or doubled; missing asset; invalid paper; missing string key; the code colliding with the page.
    Each asserts a non-zero exit, no `dist/`, no code in the output, and its own error message.
  - **Success cases:** `</script` and `<!--` escaping; the `.env.local` fallback; env over `.env.local`; a control build
    with one file and one hash equal to sha256(code).

### scripts/serve.js (112) and scripts/e2e.js (931)
- **`serve.js`:** zero dependencies, listens on `127.0.0.1` only, refuses path traversal.
- **`e2e.js`:**
  - **Usage:** `--url`, or none to serve `dist/`; also `--out` and `--negative`.
  - **Expectations** come only from the served page's embedded JSON, so a live run tests what is deployed.
  - **The code** is read from `process.env.GANESH_ENGLISH` only. Output is redacted, and the script searches its own
    output folder for the code at the end.
  - **Check 22** copies the repo without `.env*`.
  - **Check 23** prints to PDF and reads it with `pdftotext -raw`.

### tests/harness.js (72), tests/batch1.e2e.js (231), tests/batch2.e2e.js (313)
The batch-level suites (see the interim report). `harness.js` assembles the page in memory the same way `build.js`
does, but with a throwaway hash.

### README.md (155), SCHEMA.md §8, vercel.json, .vercelignore, package.json, .gitignore
- **README:** every item the brief §11 requires, including the verbatim deterrent sentence, the live URL, and that a push
  to `main` deploys.
- **`SCHEMA.md` §8:** lists twelve child-hidden fields.
- **`vercel.json`:** copied from Maths.
- **`.vercelignore`:** keeps `.env*`, `source/`, `sprints/`, `fixtures/`, `tests/` and the e2e/test/Python scripts out
  of the upload, and keeps `validate.js`, `PROJECT-CARD.yml` and `scripts/lib/card.js` in.
- **`package.json`:** `playwright` 1.63.0 as a dev dependency; `dependencies` is `{}`.
- **`.gitignore`:** `vercel link` appended `.vercel` and `.env*`.

## Data flow

1. **Build:** card → paper list → papers, strings and SVGs → one HTML page. The Production `GANESH_ENGLISH` becomes a
   hash; the plaintext never enters the page.
2. **Boot:** strings are filled in → login, or the chapter list if a session is stored.
3. **Cards → paper:** `openPaper()` sets `checkMode = false` and renders the paper from data. Captions are held in memory
   only.
4. **Unlock:** the dialog → SHA-256 of the typed code → compared with the injected hash → `checkMode = true` → tools,
   captions and the score bar appear. Reveals create answer panels on demand.
5. **Marks:** `localStorage` under `milyEnglish.scores.<paper>` → score bar → result table built from `paper.sections`.
6. **Back, home, another paper, logout or reload** → practice mode. Panels and captions are removed.

## Verification — every result below comes from a run

**Which §10 checks were exercised in a browser (Chromium, Playwright 1.63.0).** Localhost used `dist/` built with the
**real** code (Task 16). The live URL is https://mily-english-abhyas.vercel.app (Task 19).

| Check | Local | Live | Notes |
|---|---|---|---|
| 1–6 content | ✓ | — | full `npm run validate` (with source check) 7/7 locally; not a browser check |
| 7 no answer text/attributes in practice DOM | ✓ | ✓ | 7 papers, 400 items |
| 8, 9 practice controls hidden, banner | ✓ | ✓ | |
| 10, 11, 12 gate | ✓ | ✓ | code typed from env, never printed |
| 13, 14 reveal / show-all | ✓ | ✓ | 10 sampled items, all 8 types in use, Also accept, multi-blank, rubric, caption |
| 15 full marks = 100 on 7/7 papers | ✓ | ✓ | every section at its marks |
| 16 mixed marking vs recomputed | ✓ | ✓ | ch1 (5 sections) 54 %, ch2 (7 sections) 45 % |
| 17, 18, 19 re-locking, marks persist | ✓ | ✓ | back, home, other paper, result-home, reload, logout |
| 20, 21 no plaintext; one hash = sha256(code) | ✓ | ✓ | hash prefix `ea048e95c2a1` |
| 22 build refusals | ✓ | N/A | build-only; also `test:build` 15/15 |
| 23 print | ✓ | ✓ | ch1, ch2, mock with every answer revealed; poems not split |
| 24 390 px, light and dark | ✓ | ✓ | minimum contrast 5.60:1 (ch1 practice banner, light) |
| 25 no console errors/warnings | ✓ | ✓ | |
| 26 figures | ✓ | ✓ | all five also viewed at 2× on the dark theme by the coordinator |
| X1 no `crypto.subtle` | ✓ | ✓ | |
| X2 no authoring fields in `app.js` | static | static | a file read, **not** a browser check |
| X3, X4, X5 | ✓ | ✓ | 5 sections for ch1/ch4, 7 for the rest; poem lines, paragraphs; rubric and Also accept |

**Other checks:**
- **Test suites:** `tests/batch1.e2e.js` 142/142 and `tests/batch2.e2e.js` 83/83; `test:validator` 41/41;
  `test:build` 15/15.
- **Negative controls** (`--negative`, run on scratch copies): 6/6 turned their check red.
  - **Caveat:** the check-23 control went red through a click timeout on the broken page, not by finding answer text in
    the PDF, so that control proves less than it looks. The real check 23 passes, and the coordinator separately printed
    Ch 1, Ch 3 and the mock with every answer revealed: `pdftotext` found 0 answer, rubric, "Also accept", caption or
    marking strings.
- **Secret checks (count-only):**
  - The code occurs 0 times in `dist/`, in the live page source, in the e2e output folders, in tracked files, and in the
    full git history.
  - `VERCEL_TOKEN` and `VERCEL_OIDC_TOKEN` also occur 0 times in the history.
  - The page's single 64-hex string equals the hash recomputed with `sha256sum`.
  - **The live page is byte-identical to the local build** (299,990 bytes).
- **Deploy manifest** (`/v6/deployments/{id}/files`): 35 files. No `.env*`, PDFs, or test, e2e or Python scripts.
  `source/`, `sprints/`, `fixtures/` and `tests/` appear only as empty directory entries. `validate.js`,
  `PROJECT-CARD.yml`, `scripts/lib/card.js` and `build.js` are present.
- **semgrep** (`p/javascript`, `p/secrets`, metrics off) on every new JS file: 0 findings. **`npm audit`**: 0.
- **Content frozen:** `git diff v1-content -- app/data app/assets validate.js` is empty at every commit.

**Not verified:** Safari/WebKit, Firefox, real touch devices, screen readers. No human has clicked through the live site
yet (that is the checklist below). **No human has read the papers yet** (v1 limitation 1 still stands).

## Deploy record

- **Link:** `vercel link --yes --project mily-english-abhyas --scope mani125slm` (team scope, as Maths) **created the
  project.** Side effects, all expected:
  1. It connected the GitHub repo `manisankar19/mily-english-abhyas` (private).
  2. It wrote `VERCEL_OIDC_TOKEN` into `.env.local`, which stays git-ignored with mode 600.
  3. It appended `.vercel` and `.env*` to `.gitignore`.
- **Environment:** `GANESH_ENGLISH` was added to **Production** (Secret) on stdin with no trailing newline, before the
  first deploy.
- **Deployment:** `dpl_BppANQtsez2MaHTezb3S5exJnqhL`, READY, production. The Vercel build log shows
  `All 7 paper(s) passed validation` and then
  `build ok: dist/index.html 293.0 KB, 7 papers, 400 items, 5 figures, hash ea048e95c2a1…, source check skipped`.
- **Hostname**, read from the project's domains API: **`https://mily-english-abhyas.vercel.app`**, the plain name.
  Deployment Protection was left at its default and does not block the production host (HTTP 200).
- **Push** (owner-approved): `git push origin main`, `a645d65..4e43a58`, 21 commits. It was made after a count-only scan
  of the whole history for all three secret values (0 each).
- **The git-triggered deployment of that push (`dpl_5q5z7QnZmtnV1U5A3QuQm7d1x7Jo`) is BLOCKED** with
  `COMMIT_AUTHOR_REQUIRED` (see Known limitations 1). Production still serves the CLI deployment above, which is the
  same code.

## Decisions and deviations made during the sprint

- **Open questions Q1–Q5 (prd.md §2)** were built on the brief's defaults, and the owner has not changed them: seven
  cards; captions out of the practice DOM; twelve hidden fields; "2 hours" printed; lower-case walkthrough.
- **prd.md §7** was amended to the element names the Maths code really uses, and extended with the checking-mode
  contract before batch 2.
- **SVG accessible names** are stripped at render time rather than edited in the assets, because content is frozen.
- **The Playwright install moved into Task 1.** `--with-deps` failed on this host because it tried `apt-get`. Chromium
  ran from the existing cache, so no `dnf` pass was needed.
- **Commits per task**; the coordinator wrote batch 1; Tasks 7–9 were one commit.
- **`build.js` escaping:** `<!--` in inlined JS becomes `<\!--`, which is only safe inside strings or comments. None
  exists in `app.js`.

## Known limitations

1. **Pushes to `main` do not deploy yet.** Vercel blocks the git deployment with `COMMIT_AUTHOR_REQUIRED`, because the
   commits are authored by this machine's default identity (`EC2 Default User <…@….ec2.internal>`), which Vercel cannot
   match to the team.
   - **Options:** set `git config user.name` / `user.email` to your GitHub identity for future commits, or keep deploying
     by CLI.
   - Rewriting the authors of already-pushed history would need a force push and was not done.
2. **No Safari/WebKit result.** WebKit cannot launch on this host (glibc 2.34), and the child most likely uses Safari.
   Firefox and touch devices were not tested either. Use the checklist below.
3. **The answers are in the page.** This is a deterrent for a nine-year-old, not a security boundary: anyone opening
   dev-tools can read the answers without the code (README). The login is not a security control.
4. **Captions are hidden from assistive technology in practice mode** (Q2): a screen-reader user hears only
   "Picture for this question".
5. **The SVG files still carry `<title>`/`aria-*` text equal to their captions.** It is stripped at render time. An
   optional content task could remove it from the files.
6. **The two Ch 3 sign items label their accepted variants "Blank 1/2"** where "Part" would read better.
7. **The check-23 negative control is weak** (see Verification). The unused-key warning in the build is loose.
   `build.js`'s own missing-asset check is defence in depth, because the validator catches that case first.
8. **Marks live in one browser's `localStorage`**, with no sync or backup.
9. **Carried from v1:** `durationMinutes` 120 is an assumption (D4). There is no full revision paper, so the mock's
   shape is inferred (D1). Ch 1 and Ch 4 results are not comparable with the others (five sections). **No human has
   read the papers.**
10. **The marking code is 10 characters.** The owner rotates it later: change the Vercel Production variable and
    redeploy.

## What's next

1. **The owner runs the iPhone/iPad checklist below** and reads the papers (v1's outstanding gate).
2. **Decide the git identity** so pushes to `main` deploy, or keep CLI deploys (limitation 1).
3. **Rotate `GANESH_ENGLISH`** when convenient: Vercel Production variable, redeploy, update `.env.local`.
4. **Optional small tasks:**
   - a content task to drop `<title>`/`aria-*` from the SVGs;
   - "Part n" labels for non-blank `acceptable` lists;
   - a stronger check-23 negative control;
   - wiring `npm run e2e` into a pre-deploy step.

## Manual iPhone/iPad checklist for the owner

WebKit could not run here. Please check these in Safari at **https://mily-english-abhyas.vercel.app**, first on an
iPhone, then on an iPad in both orientations:

1. Sign in as Mily. The chapter list shows seven cards.
2. Open Chapter 1 (five sections), a seven-section chapter and the mock.
   - The passage and poem are readable, and poem lines break where they should.
   - The page does not scroll sideways (a wide figure may scroll inside its box).
3. Switch the device to Dark Mode. Text and every figure stay readable.
4. Tap Checking mode.
   - Tapping the code box does not zoom the page.
   - A wrong code shows an error.
   - Cancel and a tap outside both close the box.
5. Enter the right code, then show one answer on each of these. Hide each again.
   - a fill-in item: "Also accept" appears;
   - a short answer: the mark split appears;
   - a writing item: the marking guide appears;
   - a figure item: the caption appears.
6. Tap some marks.
   - The score bar updates.
   - See result: Chapter 1 shows five sections.
   - Reload: the page is back in practice mode, with no answers or captions.
   - Unlock again: the marks are still there.
7. Share → Print (or print preview): no answers, captions, banner or marking buttons.
