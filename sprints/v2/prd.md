# PRD — v2 (Application shell, build & deploy) — mily-english-abhyas

Governing docs, in precedence order: `sprints/v2/instruction.md` (the brief) → `BLUEPRINT.md`. On content
facts (sections, marks, titles) `PROJECT-CARD.yml` and `sprints/v1/prd.md` win over the brief. `CLAUDE.md`
rules 1–8 bind every session and sub-agent. Read for this PRD, in full: the brief, `CLAUDE.md`, `BLUEPRINT.md`,
`sprints/v1/walkthrough.md`, `sprints/v1/HANDOFF.md`, `SCHEMA.md`; `sprints/v1/prd.md` §1 header, §3.6, §8, §12;
`../mily-maths-abhyas/sprints/v2/walkthrough.md` skimmed (how-run, deploy record, decisions, limitations).

**Status: planned.** `TASKS.md` written by `/prd` on the §2 defaults (owner has not ticked Q1–Q5). No application code yet.

---

## 0. Preflight results (brief §6) — run 2026-09-19 by this session

Every check was count-only, presence-only or an HTTP code. No secret was printed.

| # | Check | Result |
|---|---|---|
| 1a | Tools | node v22.23.2, npm 10.9.8, jq 1.8.1, pdftotext 24.08.0, git 2.50.1 — **pass** |
| 1b | v1 closed | `sprints/v1/walkthrough.md` exists; 7 papers present — **pass** |
| 1c | `node validate.js --strict` (full, with source check) | exit **0**, "All 7 paper(s) passed" — **pass**. `npm run test:validator`: 41 passed, 0 failed |
| 1d | Papers (independent `jq` recount) | ch1 54 · ch2 58 · ch3 58 · ch4 54 · ch5 58 · ch6 58 · hy 60 = **400** items; every paper `totalMarks` 100; sections 5/7/7/5/7/7/7 — matches the brief |
| 1e | Types / stimuli / `q` newlines | `short` 156, `fill-blank` 81, `one-word` 56, `mcq` 49, `true-false` 25, `long` 16, `handwriting` 10, `match` 7; stimuli `passage` 22, `poem` 2, `figure` 7; **19** items with a newline in `q`; 5 distinct assets; 16 multi-blank `fill-blank` items — all match the brief |
| 1f | `git status` / tag | clean; **`v1-content` tag exists** (annotated, points at `a645d65` = HEAD). `git diff v1-content -- app/data app/assets validate.js` is empty. This is the diff base for the whole sprint |
| 2 | `.env.local` | `^VERCEL_TOKEN=` 1 · `^GANESH_ENGLISH=` 1 · `^#` 0 · code length **10** · mode **600** — **pass** (was 664 at v1). Only `.env.local.example` is tracked; both its values are empty (length 0) |
| 3 | Vercel token, `GET /v2/user` | **200** — valid |
| 4 | Project / hostname | `GET /v9/projects/mily-english-abhyas` → **404** personal scope, **404** under the account's one team (`mani125slm`); public `https://mily-english-abhyas.vercel.app` → **404**. Ambiguous signature, as at v1 (brief §6.4): the hostname may be free or squatted. Accept whatever Vercel assigns, read it from the project's domains, report it |
| 5 | Playwright | **Not installed in this session — deferred to batch 1** (installing writes `package.json`/`package-lock.json`, which the owner asked me not to start yet). Found: browser cache from the Maths build already on this host (`chromium-1181/1234/1243`, `chromium_headless_shell-*`, `webkit-2359`); Maths pinned `playwright@1.63.0`; glibc **2.34** (WebKit needs 2.35/2.38 → expected not to launch; manual iPhone/iPad checklist planned from the start, §9) |
| 6a | Source check without `source/` | In a `git archive` copy with `source/` deleted: `node validate.js --strict --skip-source-check` exit **0**; without the flag exit **2** (fail-loud, as intended). Copy deleted afterwards; `source/` in the repo untouched |
| 6b | `git remote -v` | **origin exists**: `github.com/manisankar19/mily-english-abhyas` (private — anonymous GitHub API returns 404; `git ls-remote` works with local credentials). Remote `main` = `a645d65` and `v1-content` are **already on origin** (pushed before this session) |
| — | Disk | 18 GB free (72 % used) |

**Hard stops (brief §8): none triggered.**

---

## 1. Goal and scope

Wrap the seven validated v1 papers in the application of `BLUEPRINT.md` §7–§10, with parity to the Maths site
(`../mily-maths-abhyas/app/`, read-only reference):

1. One page, no router: **Login → Chapter list (seven cards) → Paper → Result**.
2. **Practice mode** (default) and **Checking mode** (in-memory, gated by a `<dialog>` and SHA-256 of
   `GANESH_ENGLISH`), with the English additions of brief §3.3 (model answer, mark split, marking guide,
   "Also accept", captions on unlock). Clean print.
3. `build.js` → exactly one `dist/index.html` (brief §4), `scripts/test-build.js` committed, `README.md`,
   `vercel.json`, `.vercelignore`.
4. `scripts/e2e.js` (Playwright, Chromium) covering `BLUEPRINT.md` §13 checks 7–26 plus X1–X5, on localhost and
   on the live URL; expectations read from the **served** page.

**Out of scope:** any content edit (a content bug becomes a note here and its own small content task);
WebKit/Safari automation if it cannot launch; everything in `BLUEPRINT.md` §15.

---

## 2. Open questions from brief §13 — recorded as deviations, **owner to confirm**

Each has the brief's default. I have **not** decided any of them; `/prd` will plan the default unless the owner
says otherwise.

| # | Question | Brief's default | Owner |
|---|---|---|---|
| **Q1** | **Card count.** The request behind the brief said "nine cards" and also "7 papers total". | **Seven cards** (six chapters + the Half-Yearly mock), read from the card's `chapters` and `extra_papers`, never a literal. The card and v1 PRD §3.5/§5 support seven. | ☐ confirm |
| **Q2** | **Captions vs `BLUEPRINT.md` §5.5.** The blueprint wants a caption so a question survives a failed image; Maths and the brief keep captions out of the practice DOM. | **Stricter rule (brief §3.5):** captions are not in the practice DOM, not even as `aria-label`; figures get a generic `aria-label` from `en.json`; captions appear only on unlock, created on demand and removed on re-lock. Revisit if a figure question proves unanswerable without a text fallback. *Consequence:* a screen-reader user in practice mode gets no description of the figure. | ☐ confirm |
| **Q3** | **Child-hidden field list.** `SCHEMA.md` §8 lists eight fields; the brief lists twelve (adds `stimulus.original`, `stimulus.sourceRef`, paper-level `sourceRef`, figure captions). | **Twelve.** Extend `SCHEMA.md` §8 in batch 1 (a doc edit, not a content edit), and the e2e check 7 asserts all twelve. | ☐ confirm |
| **Q4** | **Duration on the paper header.** Maths prints the time; here 120 minutes is an assumption (D4). | **Print it** ("2 hours", from `durationMinutes`) and say in the README that it is assumed. Alternative: omit the time line. | ☐ confirm |
| **Q5** | **Walkthrough file-name case.** `BLUEPRINT.md` says `WALKTHROUGH.md`; `CLAUDE.md` and v1 use lower case. | **Lower case:** `sprints/v2/walkthrough.md`. | ☐ confirm |

---

## 3. Owner decisions that stand (not re-opened)

- **Chapters 1 and 4 have five sections** (A–E, 30/10/20/20/20; v1 D9). The app renders `paper.sections` as data.
- **No full revision paper exists (D1)**: the mock's shape is inferred from three 40-mark worksheets.
- **`duration_minutes: 120` is an assumption (D4)**; README says so (display per Q4).
- **The marking code is unchanged** (10 characters, R1). The owner rotates it later through Vercel's Production
  environment and a redeploy; the build refuses a value under 10 characters and fails on a plaintext collision.

---

## 4. Repository and deploy constraints (owner instruction, this session)

- **origin now exists:** `github.com/manisankar19/mily-english-abhyas`, **private**. Its `main` is at `a645d65`.
- **Do not push** — no `git push` of any branch or tag at any point in this sprint unless the owner says so.
- **Do not run `vercel link`** (nor `vercel deploy`, `vercel env add`, or any Vercel write) **until the owner
  approves it.** Reason, from Maths: `vercel link` connected the GitHub repo automatically, after which a push to
  `main` deploys to production; it also wrote a `VERCEL_OIDC_TOKEN` into `.env.local` and appended to `.gitignore`.
- **Consequence for the brief:** the brief asks for an autonomous deploy (§7 batch 4). That is **superseded**:
  batch 4 begins with an **owner approval gate** — an added hard stop (§8 below). Batches 1–3 (all local) proceed.
- When approved, the deploy follows brief §7 exactly: link with `--scope mani125slm` (the token's one team, if the
  personal scope is not wanted — to be reported), `GANESH_ENGLISH` added to Production on stdin before the first
  deploy, `vercel deploy --prod --yes`, token only in a shell variable, then the `GET /v6/deployments/{id}/files`
  manifest check and `git status` for link side effects. Deployment Protection left at default.

---

## 5. Other deviations and conflicts

- **DV6 — Sprint shape.** `BLUEPRINT.md` §12.1 splits app work into v3 (shell) and v4 (build/deploy); the brief
  does both in v2. The brief wins (content and app are still separate sprints, which is the rule's purpose).
- **DV7 — SVG inlining.** `BLUEPRINT.md` §5.5 says inline assets as `data:` URIs; the brief (§4.3) inlines them as
  `<svg>` elements so `currentColor` follows the theme. Brief wins.
- **DV8 — Caption rule** vs `BLUEPRINT.md` §5.5 — see Q2.
- **DV9 — Playwright install moved** from preflight to batch 1's first step (§0 row 5).
- **DV10 — Deploy gated on owner approval** (§4), against the brief's "autonomous to completion".
- **DV11 — Build reads the card.** Unlike Maths (hard-coded 8 papers / 54 items), `build.js` takes the paper list
  and the mock title from `PROJECT-CARD.yml` via `scripts/lib/card.js`; so `validate.js`, `PROJECT-CARD.yml` and
  `scripts/lib/card.js` must be uploaded (not in `.vercelignore`).
- **Content notes found so far:** none. (Carried from v1, not app bugs: Ch 1 and mock items that refer to "the poem
  in your textbook"; Ch 6 "Braille sign" wording.)

---

## 6. Functional requirements (summary — detail is the brief §3–§5, not repeated)

- **Rendering:** every `type` in §0 row 1e, plus a generic body for any other validator type. `passage`/`poem`
  honour newlines via `textContent` (poem: one line element per source line; passage: blank line = paragraph);
  `q` uses `white-space: pre-line`; blanks `_____` render as a non-wrapping line; ≥ 16 px body text; no
  horizontal page scroll at 390 px; figures inline `<svg>` with `role="img"` and a generic label.
- **`match`:** right column deranged deterministically (rotate by one, as Maths); one marks row per item; true
  pairing shown only in checking mode.
- **Checking mode:** per-item reveal and show-all build panels on demand (model answer, `answerPoints`,
  `markingGuide` labelled as a marking guide, "Also accept" per blank for `fill-blank`/`one-word`, caption after
  its figure) and **remove** them on hide / re-lock. Resets on reload, back, home, another paper, logout.
- **Marks:** `0…item.marks` buttons, `localStorage` per paper by item id (`milyEnglish.*`), score bar, clear.
- **Result:** from `paper.sections` in order — code, title as stored, obtained/marks, unmarked count; total,
  percentage (one decimal, `.0` dropped), grade bands 90/75/60/40, unmarked warning. No hard-coded 7, 25, 100.
- **Never in the practice DOM** (text, attributes, `data-*`, `title`, `aria-label`): the twelve fields of Q3.
  `app.js` never reads `chapterSource`, `sourceChapter`, `difficulty`, `skill` (X2, static check).
- **Strings:** all in `app/ui/en.json`; missing key fails the build, unused key warns. Cards from the card file:
  number, title, marks, marking progress (no unit names). Login from `student_login` (not a security control).
- **Build, secret, README, e2e:** brief §4, §5, §10, §11 as written.

## 7. DOM contract (fixed before batch 1; agents build to these names)

Taken from the Maths `index.html`/`app.js`, renamed only where noted. Additions are marked **new**.

- **Views:** `#loginView`, `#appShell`, `#chaptersView`, `#paperView`, `#resultView`.
- **Login:** `#loginForm`, `#userInput`, `#passInput`, `#loginError`. **Shell:** `#whoLabel`, `#homeBtn`,
  `#logoutBtn`, `#heroName`, `#heroSub`, `#chapterGrid`, `#overallCard`.
- **Paper chrome:** `#paperHead`, `#paperBody`, `#backBtn`, `#printBtn`, `#practiceBanner`, `#checkModeBtn`,
  `#revealAllBtn`, `#clearMarksBtn`, `#resultBtn`; score bar `#scoreBar`, `#sbGot`, `#sbTotal`, `#sbDone`,
  `#sbCount`, `#sbFill`.
- **Gate:** `<dialog id="checkDialog">`, `#checkForm`, `#checkTitle`, `#checkInput`, `#checkError`,
  `#checkSubmit`, `#checkCancel`.
- **Paper body classes** *(amended in Task 3 to the names the Maths code actually uses; the first draft had guessed some)*:
  `.section`, `.section-head`, `.block`, `.block-head`, `.block-num`, `.block-inst`, `.item` (+ `.type-{type}`),
  `.item-q`, `.item-label`, `.item-text` (`pre-line`), `.item-marks`, `.blank`, `ol.options`, `.match`,
  `.match-left`, `.match-right`, `.match-head`, `.tf-hint`, `.stimulus`, `.stimulus-figure` > `.figure-scroll`
  (`role="img"`, own `overflow-x`), **new** `.stimulus-passage` (`p` per paragraph), **new** `.stimulus-poem`
  (`.poem-line` per line), **new** `.stimulus-copy` (handwriting copy text), **new** `.item-generic`. Checking
  mode (batch 2): `.item-tools`, `.ans-btn`, `.answer` (`.ans-tag`, `.ans-text`, `.ans-points`, `.ans-guide`,
  **new** `.ans-accept`, **new** `.ans-pairs`), `.stimulus-caption`, `.marks-row`, `.mk` (`data-val`),
  `.mk-clear`; state classes `.on`, `.scored`. Also `#nameInput` (student name, as Maths).
- **Data hooks:** `data-item-id` (the item id only; ids hold no answer text), `data-val`, `data-paper-key` on
  cards, `data-section` on result rows, `data-i18n*` on static markup. No other `data-*` on content.
- **Embedded data** (from the build, or the test harness before Task 12): `<script type="application/json">`
  with ids `uiStrings`, `papersData` (`{order, login, papers}`, order and login from the card) and `assetsData`.
- **Result:** `#resultView` with a table built from `paper.sections`.

## 8. Hard stops (brief §8, plus one)

Everything in brief §8, **plus: before any `vercel link` / deploy / Vercel write, and before any `git push`,
stop and get the owner's approval (§4).**

## 9. Acceptance criteria

Brief §10 in full (checks 1–26, X1–X5, negative controls), run by `scripts/e2e.js` on localhost and — after the
approved deploy — on the live URL; check 22 is "N/A" live. Full `npm run validate` passes locally before every
deploy and `git diff v1-content -- app/data app/assets validate.js` is empty at every commit. The walkthrough
separates browser-exercised checks from read-only ones, states that there are no Safari/WebKit, Firefox or real
touch-device results if so, and ends with the manual iPhone/iPad checklist of brief §12.

## 10. Plan shape (for `/prd`)

Four batches, one commit each, by file ownership (brief §7): 1 shell + renderer (practice mode) · 2 modes, gate,
marking, result, print · 3 build, `test-build.js`, README, `serve.js`, local e2e · 4 **owner approval gate**, then
link, env var, deploy, live e2e, walkthrough (coordinator only). `app/app.js` has one owner all sprint; no sub-agent
reads `.env.local` or touches a token.

## 11. Risks

- **R1 — Hostname ambiguity** (§0 row 4): the plain `*.vercel.app` name may be taken; accept and report.
- **R2 — WebKit will likely not launch** (glibc 2.34); the child probably uses Safari. Mitigation: owner checklist.
- **R3 — 10-character, name-derived code** could collide with page text; the build's collision check fails the
  build without printing it — reported, never worked around.
- **R4 — Captions hidden from assistive tech** (Q2) — accessibility trade-off accepted by default.
- **R5 — Git integration side effect** of `vercel link` would make a later push to `main` deploy to production
  (§4); README documents it.
- **R6 — Dark-mode figures unverified** (v1 limitation 8); check 26 covers it against the real CSS.

---

## 12. User stories, architecture, dependencies (added by `/prd`)

Overview, goals and out-of-scope are §1; this adds what the `/prd` skill also requires.

**User stories**
- As Mily, I want to sign in and pick a chapter card, so that I get a clean question paper to answer in my workbook.
- As Mily, I want passages and poems laid out like a printed paper on my phone or iPad, so that I can read them without sideways scrolling.
- As the parent, I want to unlock checking mode with a code, so that I can see the model answer, mark split, marking guide and "Also accept" list one question at a time.
- As the parent, I want to tap marks per item and see a section-wise result, so that I know which skills need work.
- As the parent, I want to print a paper with no answers or marking UI, so that Mily can write on it offline.
- As the owner, I want one self-contained file deployed by CLI, with the code only as a hash, so that the deploy cannot half-fail and the code is never committed.

**Architecture**
```
PROJECT-CARD.yml ─┐        app/index.html · styles.css · app.js (__SECRET_HASH__) · ui/en.json
scripts/lib/card.js┤                              │
app/data/*.json ───┼─▶ build.js ─ validate --strict --skip-source-check
app/assets/*.svg ──┘      │ sha256(GANESH_ENGLISH) → hash; inline CSS/JS/JSON/SVG; assert; write last
                          ▼
                    dist/index.html (one file) ──▶ scripts/serve.js (localhost) ──▶ scripts/e2e.js (Chromium)
                          └────────▶ vercel deploy --prod (after owner approval) ──▶ e2e on live URL
Browser: login → chapters (from card) → paper (practice | checking in memory) → result (from paper.sections)
         marks → localStorage milyEnglish.* ; nothing leaves the browser
```

**Dependencies:** v1 closed and tagged `v1-content` (§0); Node ≥ 18; Playwright 1.63.0 with cached Chromium
(dev dependency only; `dependencies` stays `{}`); valid Vercel token (§0 row 3); owner approval for deploy and push (§4).
