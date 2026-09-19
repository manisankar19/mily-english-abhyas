# Sprint v2 — Tasks (Application shell, build & deploy) — mily-english-abhyas

## Status: Tasks 1–16 done 2026-09-19 (batches 1–3); stopped at Task 17, the owner-approval gate. Tasks written 2026-09-19.

Source of truth: `sprints/v2/prd.md` (with `sprints/v2/instruction.md`, which wins over `BLUEPRINT.md`). A task
that conflicts with `prd.md` is wrong and defers to it. `CLAUDE.md` rules 1–8 apply to every task.

**Planned on the brief's defaults for prd.md §2 Q1–Q5** (seven cards; captions out of the practice DOM; twelve
hidden fields; print "2 hours"; lower-case walkthrough). The owner has not ticked them; if any changes, the
affected tasks are marked here before `/dev` reaches them.

**Deliberate deviations from the generic `/prd` skill defaults:** as in v1, the file stays lower-case `prd.md`
(no second `PRD.md`), and there are 20 tasks, sized to real units of work grouped into the brief's four batches,
rather than ≤ 10 five-minute tasks. Testing and security are in this sprint because the brief requires them.

**Standing rules for every task**
- **Content frozen:** at every commit `git diff v1-content -- app/data app/assets validate.js` is empty and
  `npm run validate` exits 0. A content bug becomes a note in `prd.md` §5 and its own small content task.
- **Ownership:** `app/app.js` has one owner (`js`) all sprint; `shell` owns `index.html`/`styles.css`; each agent
  writes only its listed files, builds to the prd.md §7 DOM contract, and tests with **throwaway codes**. No
  sub-agent reads `.env.local`, touches a token, pushes or deploys. The coordinator re-reads every file and
  re-runs the checks after each agent.
- **Hard stops:** brief §8, plus prd.md §8 — **no `git push`, `vercel link`, deploy or Vercel write without the
  owner's approval.**
- One commit per batch (task numbers in the message); report only failures between steps.

---

## Batch 1 — shell and renderer (practice mode)

- [x] Task 1: Project setup — Playwright and repo plumbing (P0)
  - Acceptance: `npm i -D playwright@1.63.0` (`dependencies` stays `{}`); `npx playwright install --with-deps chromium webkit` run and its outcome recorded (what `--with-deps` did on AL2023; WebKit launch tried once, failure recorded); a Chromium headless launch succeeds (else brief §8 stop); `.vercelignore` per brief §4.2 (never excludes `validate.js`, `PROJECT-CARD.yml`, `scripts/lib/card.js`); `vercel.json` copied from Maths; `package.json` scripts `build`, `test:build`, `serve`, `e2e` added.
  - Files: package.json, package-lock.json, .vercelignore, vercel.json
  - Completed: 2026-09-19 — playwright 1.63.0 pinned as devDependency, `dependencies` `{}`, npm audit 0. `--with-deps` failed (exit 1): Playwright fell back to ubuntu24.04 and called `apt-get` (not on AL2023, exit 127); no `dnf` pass needed because Chromium launched headless from the existing cache (`chromium-1243`). WebKit launch tried once: FAIL, "Host system is missing dependencies" (glibc 2.34 host) — expected, not a stop. `.vercelignore` verified with `git check-ignore`: excludes `.env*`, `source/`, `sprints/`, `fixtures/`, test/e2e/python scripts; keeps `validate.js`, `PROJECT-CARD.yml`, `scripts/lib/card.js`, `app/`.

- [x] Task 2: UI strings `app/ui/en.json` and `SCHEMA.md` §8 extension (P0)
  - Acceptance: every user-visible string for all screens, both modes, gate, answer panel (model answer, mark split, marking guide, "Also accept"), result and grades, generic figure label, `mode.insecure`; `{name}/{n}/{marks}` interpolation only; `SCHEMA.md` §8 lists the twelve child-hidden fields (Q3). No content file touched.
  - Files: app/ui/en.json, SCHEMA.md
  - Completed: 2026-09-19 — en.json with 98 keys (Maths set adapted to English, plus `stimulus.figureLabel`, `answer.accept`, `answer.acceptBlank`, `answer.pairs`); keys for batch-2 screens included now so `app.js` has one string source. Interpolation uses only the `{word}` syntax (Maths' variable names: code, count, got, letter, marks, name, n, title, total). `SCHEMA.md` §8 now lists the twelve fields. The key-check test runs in Task 6 (every `t()`/`data-i18n` key exists).

- [x] Task 3: `index.html` + `styles.css` — shell, login, chapter list, paper chrome (agent `shell`) (P0)
  - Acceptance: the prd.md §7 ids and classes exist; `<dialog id="checkDialog">`; light/dark/system tokens on `:root`; ≥ 16 px body; reduced-motion; `__SECRET_HASH__` not in these files; no external asset except a font with fallback.
  - Files: app/index.html, app/styles.css
  - Completed: 2026-09-19 — done by the coordinator, not a `shell` sub-agent (copying and adapting two files was faster than briefing one; `app.js` is also written by the coordinator, so single ownership holds). `index.html` copied from Maths (icon changed; strings via `data-i18n`); `styles.css` copied whole (tokens light/dark/system, reduced motion, print, and the Maths checking-mode/result rules, which Task 10 will review) plus an English block: `.item-text` `pre-line` + `overflow-wrap:anywhere`, `.stimulus-passage`, `.stimulus-poem`/`.poem-line`, `.stimulus-copy`, print rules keeping poems and copy text unbroken. prd.md §7 amended to the real class names. Test harness `tests/harness.js` + `tests/batch1.e2e.js` written first; its Task 3 static checks pass.

- [x] Task 4: `app.js` — login, chapter cards from the card data, navigation, storage helper (agent `js`) (P0)
  - Acceptance: login from `student_login`; seven cards built from the embedded card (`chapters` + `extra_papers`) showing number, title, marks, progress; home/back/logout; `milyEnglish.*` keys; strings only from `en.json`; `__SECRET_HASH__` occurs exactly once.
  - Files: app/app.js
  - Completed: 2026-09-19 — coordinator-written (see Task 3 note). Adapted from Maths `app.js`: login now reads `papersData.login` (from the card's `student_login`, no literal in `app.js`); cards iterate `papersData.order` (card `chapter_list` + `extra_papers`); `milyEnglish.*` keys. `tests/batch1.e2e.js` T4/T2/X2 checks pass in Chromium (7 cards in card order with titles, no unit names; wrong password error; session survives reload; logout).

- [x] Task 5: `app.js` — paper renderer for every type and stimulus (agent `js`) (P0)
  - Acceptance: header (organisation, class, subject, marks, "2 hours", student); sections from `paper.sections`; `passage` paragraphs, `poem` one `.poem-line` per line, `q` newlines honoured, `_____` as `.blank`, inline figures with generic `aria-label` and no caption; `mcq`, `match` (right column rotated by one), all other types generic; `textContent` only for content; never reads `chapterSource`, `sourceChapter`, `difficulty`, `skill`.
  - Files: app/app.js
  - Completed: 2026-09-19 — renderer adapted from Maths: header with "2 hours" from `durationMinutes`; sections, blocks and items from data; `passage` → one `<p>` per blank-line paragraph (`pre-line` inside), `poem` → one `.poem-line` per source line, handwriting copy text gets `.stimulus-copy`; `q` newlines via `pre-line`; `_____` → `.blank`; `mcq` options; `match` right column rotated by one; everything else question-only. Figures: inline SVG, generic `aria-label`, captions never read; **found** that four SVGs carry `<title>`/`aria-label` text equal to their captions — stripped at render (`stripSvgNames`), recorded in prd.md §5. `tests/batch1.e2e.js`: 142 passed, 0 failed. All five figures viewed once at 2× on the dark theme: legible. semgrep (p/javascript, p/secrets): 3 files, 0 findings; npm audit 0.

- [x] Task 6: Coordinator check and batch-1 commit (P0)
  - Acceptance: a dev harness page loads all seven papers in Chromium on localhost with 0 console errors; no hidden field (prd Q3) in DOM/attributes; no horizontal scroll at 390 px; CSS class names cross-checked against HTML/JS; content diff empty; commit "v2 batch 1: Tasks 1–6".
  - Files: (none new; commit)
  - Completed: 2026-09-19 — `node tests/batch1.e2e.js` (Chromium, localhost, throwaway code): 142 passed, 0 failed — all 7 papers render every item and section, 0 console errors/warnings/failed requests, no hidden-field text or attribute in the practice DOM, no horizontal scroll at 390 px light and dark, body text ≥ 16 px. CSS/JS/HTML class cross-check: every class `app.js` creates has CSS; `.view`, `.paper-body`, `.hero-sub` are unstyled hooks (as in Maths). Viewed at 390 px: chapter list, ch1 poem, a ch5 item with newlines in `q`, a `match` item, a copy text. `npm run validate` 7/7; content diff vs `v1-content` empty. **Deviation:** committed once per task (CLAUDE.md rule 5), not once per batch.

## Batch 2 — modes, gate, marking, result, print

- [x] Task 7: `app.js` — gate and checking mode (P0)
  - Acceptance: dialog opens from `#checkModeBtn`; Escape/cancel/backdrop close without unlocking; wrong code → error, field cleared, dialog open; `crypto.subtle` SHA-256 vs injected hash; `mode.insecure` when unavailable; in-memory boolean reset by reload, back, home, other paper, logout; toggle off without re-asking.
  - Files: app/app.js
  - Completed: 2026-09-19 — `js` sub-agent. `showModal` gate; Escape/cancel/backdrop close without unlocking (a click on the dialog's own padding does not); wrong code clears and keeps the dialog; SHA-256 via `crypto.subtle`, `mode.insecure` without it (X1 tested by removing `crypto.subtle`); double-submit guard; in-memory `checkMode` reset by reload/back/home/other paper/logout. `tests/batch2.e2e.js` covers every gate case.

- [x] Task 8: `app.js` — answer panels and captions on demand (P0)
  - Acceptance: per-item reveal and show-all build `.answer-panel` (model answer, `answerPoints` lines, `markingGuide` labelled, "Also accept" per blank for `fill-blank`/`one-word`, true `match` pairing) and captions after their figure; hide/re-lock **removes** them; none exist in practice mode.
  - Files: app/app.js
  - Completed: 2026-09-19 — `js` sub-agent + one coordinator change. `.answer` created after `.item-tools`, removed on hide/re-lock/re-render: model answer (arrays as numbered lines), mark split, marking guide, Also accept (one line per blank), true match pairs; captions from a render-time WeakMap, never in an attribute, created on unlock after the figure and removed on re-lock. **Coordinator change:** "Also accept" now shows for *any* item with `acceptable` data — two Ch 3 `short` road-sign items (`english-c3-s5-b3-i1/-i2`) carry one list per sign that the fill-blank/one-word rule would have hidden from the parent (checked in Chromium). They are labelled "Blank 1/2"; "Part" would read better (minor).

- [x] Task 9: `app.js` — marks, score bar, clear, result screen (P0)
  - Acceptance: `0…marks` buttons per item stored by id per paper; score bar and checked count; clear marks; result table from `paper.sections` (code, stored title, obtained/marks, unmarked), total, percentage (1 dp, `.0` dropped), bands 90/75/60/40, unmarked warning; nothing hard-coded to 7 sections or 100.
  - Files: app/app.js
  - Completed: 2026-09-19 — `js` sub-agent. Marks `0…marks` + clear per item, stored by id per paper; score bar; clear-all with confirm; result from `paper.sections` (`tr[data-section]`, stored titles), total row, 1-dp percentage with `.0` dropped, bands on the rounded value, unmarked warning as `p.rc-note.warn` (existing CSS). batch2 test: full marks = 100 and A+ on all 7 papers with every section full; mixed marking of ch1 (5 sections) and ch2 (7) equals numbers recomputed from JSON; marks survive reload. `tests/batch2.e2e.js` 83/83, `tests/batch1.e2e.js` 142/142, semgrep 0. Tasks 7–9 committed together (one file, one pass).

- [x] Task 10: `styles.css` — checking UI, result, print (agent `shell`) (P0)
  - Acceptance: styles for panels, marks rows, score bar, result; print hides banner, dialog, marking UI, panels and captions, keeps poems and copy text unbroken with writing room; dark-mode figures legible via `currentColor`.
  - Files: app/styles.css
  - Completed: 2026-09-19 — `shell` sub-agent (+24/−2 lines, reviewed by the coordinator): `.ans-accept`/`.ans-pairs` styles, shared small-caps labels, `overflow-wrap:anywhere` on answer parts and result cells, `.item-generic` raised to 16 px, print rules hiding every checking-mode class (and `dialog`) in any mode, room under copy text, figures black on white in print. Agent verified on a static contract fixture (outside the repo): no overflow at 390 px light/dark, `pdftotext` of print shows questions/poem/copy text and none of the answer/caption/marking text. Real-paper print (check 23) is verified at Task 16.

- [x] Task 11: Coordinator check and batch-2 commit (P0)
  - Acceptance: in Chromium with a throwaway hash: gate cases, reveal/hide on one item of each type in use, full marks = 100 on Ch 1 and one seven-section paper, print preview free of answers; content diff empty; commit "v2 batch 2: Tasks 7–11".
  - Files: (commit)
  - Completed: 2026-09-19 — coordinator re-ran `tests/batch1.e2e.js` (142/142) and `tests/batch2.e2e.js` (83/83) in Chromium with throwaway codes; checked the Ch 3 sign items' Also accept by hand in the browser; viewed the agent's multi-blank panel, caption and ch1 result screenshots. Print with **every answer revealed** in checking mode, Ch 1 / Ch 3 / mock → PDF → `pdftotext`: 0 hits for Model answer, Also accept, Marking guide, Figure description, Practice mode, Marks given, Hide answer; section heads and Q.1 present; the Ch 1 poem lands whole on one page. `npm run validate` 7/7, content diff empty.

## Batch 3 — build, README, local e2e

- [x] Task 12: `build.js` (agent `build`) (P0)
  - Acceptance: brief §4 steps 1–6 and §5 exactly — validator with explicit `--skip-source-check`; card-driven paper list; secret resolution (env, then `.env.local` only if absent; empty = error; < 10 chars refused); placeholder exactly once; SVGs inlined as `<svg>`; JSON escaping by replacement functions; asserts (one 64-hex hash, no local `src`/`href`, no plaintext code, ≤ 4 MB); write last; one-line summary with "source check skipped".
  - Files: build.js
  - Completed: 2026-09-19 — `build` sub-agent (185 lines, zero deps); coordinator reviewed secret resolution, validator flag, collision check and write-last (temp file + rename). Same page structure as `tests/harness.js`; card-driven; exports its functions. Throwaway build: `292.8 KB, 7 papers, 400 items, 5 figures, … source check skipped`. semgrep 0. Note: `<!--` in inlined JS becomes `<\!--` (safe only in strings/comments; none in app.js); unused-key warning is loose.

- [x] Task 13: `scripts/test-build.js` — committed build failure suite (agent `build`) (P0)
  - Acceptance: `npm run test:build` runs on temp copies with throwaway codes: unset, empty, short, placeholder missing/doubled, missing asset, invalid paper, plaintext collision, `</script` in data — each exits non-zero and writes nothing; a control build exits 0 with one file.
  - Files: scripts/test-build.js
  - Completed: 2026-09-19 — `build` sub-agent; 15 cases on temp copies with throwaway codes (11 failure, 4 success incl. `</script`/`<!--` escaping, `.env.local` fallback, env precedence, control build = one file, one hash = sha256(code)). Coordinator tightened every failure case to also assert its own error message (the agent had flagged that gap): 15/15 pass. The missing-asset case is caught by the validator first, so `build.js`'s own asset check is defence in depth, not separately tested.

- [x] Task 14: `README.md` (agent `docs`) (P0)
  - Acceptance: every brief §11 item, including the verbatim deterrent sentence, Secrets table without values or shape, login "not a security control", two section profiles, assumed duration, source check local-only, git-integration and Deployment Protection notes; live URL left as a placeholder for Task 19.
  - Files: README.md
  - Completed: 2026-09-19 — `docs` sub-agent (154 lines); coordinator read it in full: every §11 item present, the deterrent sentence verbatim once (grep), no value or shape of the code (only "at least 10 characters"). Live URL is a placeholder until Task 19; commands are re-checked against the final `serve.js`/`e2e.js` at Task 16.

- [x] Task 15: `scripts/serve.js` and `scripts/e2e.js` (agent `e2e`) (P0)
  - Acceptance: e2e covers brief §10 checks 7–26 and X1, X3–X5 against a URL argument, expectations from the served page's JSON; secret redacted from all output (self-grep); prints PASS/FAIL per check; X2 as a labelled static check; negative controls runnable on scratch copies.
  - Files: scripts/serve.js, scripts/e2e.js
  - Completed: 2026-09-19 — `e2e` sub-agent. `serve.js` (112 lines, 127.0.0.1 only, traversal refused). `e2e.js` (931 lines): checks 7–26 + X1–X5 from the served page's JSON; code from `process.env` only, all output redacted, self-grep of its output dir; check 22 copies the repo without `.env*`. Agent run on a harness page (throwaway code): 24/24 pass, min contrast 5.60:1; `--negative`: all 6 controls turned their check red. Check 23 uses `pdftotext -raw` (layout mode split a sentence around a blank). semgrep 0 (re-run by coordinator).

- [x] Task 16: Coordinator real build + local e2e, batch-3 commit (P0)
  - Acceptance: full `npm run validate` passes; `npm run build` with the real code succeeds (summary line recorded, hash prefix only); `npm run test:build` green; local e2e all pass on Chromium (failures fixed or recorded); negative controls each turn their check red; commit "v2 batch 3: Tasks 12–16".
  - Files: (commit)
  - Completed: 2026-09-19 — coordinator, with the **real** code (loaded into a shell variable from `.env.local` inside the command, never echoed). Full `npm run validate` (with source check) 7/7; `test:validator` 41/41; `test:build` 15/15. `node build.js` (via the `.env.local` fallback): `293.0 KB, 7 papers, 400 items, 5 figures, hash ea048e95c2a1…, source check skipped` — the plaintext-collision check passed (no hard stop). `node scripts/e2e.js` against `dist/` on localhost, Chromium: **24/24 PASS** (7–26, X1–X5; X2 static; 22 run on a temp copy without `.env*`), min contrast 5.60:1, redaction self-grep clean. Independent: code occurs 0× in `dist/`, 0× in e2e output, 0× in tracked files; `sha256sum` hash found once; one 64-hex string. `--negative` (throwaway code): 6/6 controls turned their check red — **but the check-23 control turned red through a click timeout on the broken page, not by detecting answer text in the PDF**, so that control is weaker than it looks (check 23 itself passes on the real page with every answer revealed, and Task 11 verified the same by hand). batch1 142/142, batch2 83/83. Content diff empty.

## Batch 4 — deploy, live e2e, walkthrough (coordinator only)

- [ ] Task 17: **Owner approval gate** (P0)
  - Acceptance: stop and report local results; proceed only after the owner approves `vercel link` / deploy (and says whether to push).
  - Files: —

- [ ] Task 18: Link, env var, production deploy (P0)
  - Acceptance: `vercel link` (scope reported); `GANESH_ENGLISH` added to Production on stdin without newline before the first deploy; `vercel deploy --prod --yes`; token only in a shell variable, unset after; `git status` side effects recorded; `/v6/deployments/{id}/files` has no `.env*`, `source/`, `sprints/`, and has `validate.js`, `PROJECT-CARD.yml`, `scripts/lib/card.js`; hostname read from the project's domains.
  - Files: (possibly .gitignore by `vercel link`)

- [ ] Task 19: Live e2e and README URL (P0)
  - Acceptance: e2e against the live URL (check 22 N/A); Deployment Protection not blocking (else stop); README carries the live URL; commit.
  - Files: README.md

- [ ] Task 20: `sprints/v2/walkthrough.md` (P0)
  - Acceptance: browser-tested vs read-only per check; Chromium-only, no Safari/WebKit/Firefox/touch results stated; source check local-only; 120 minutes assumed; deploy record; limitations; ends with the brief §12 iPhone/iPad checklist; commit.
  - Files: sprints/v2/walkthrough.md
