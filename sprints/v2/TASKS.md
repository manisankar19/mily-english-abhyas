# Sprint v2 — Tasks (Application shell, build & deploy) — mily-english-abhyas

## Status: Not started. Tasks written 2026-09-19.

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

- [ ] Task 2: UI strings `app/ui/en.json` and `SCHEMA.md` §8 extension (P0)
  - Acceptance: every user-visible string for all screens, both modes, gate, answer panel (model answer, mark split, marking guide, "Also accept"), result and grades, generic figure label, `mode.insecure`; `{name}/{n}/{marks}` interpolation only; `SCHEMA.md` §8 lists the twelve child-hidden fields (Q3). No content file touched.
  - Files: app/ui/en.json, SCHEMA.md

- [ ] Task 3: `index.html` + `styles.css` — shell, login, chapter list, paper chrome (agent `shell`) (P0)
  - Acceptance: the prd.md §7 ids and classes exist; `<dialog id="checkDialog">`; light/dark/system tokens on `:root`; ≥ 16 px body; reduced-motion; `__SECRET_HASH__` not in these files; no external asset except a font with fallback.
  - Files: app/index.html, app/styles.css

- [ ] Task 4: `app.js` — login, chapter cards from the card data, navigation, storage helper (agent `js`) (P0)
  - Acceptance: login from `student_login`; seven cards built from the embedded card (`chapters` + `extra_papers`) showing number, title, marks, progress; home/back/logout; `milyEnglish.*` keys; strings only from `en.json`; `__SECRET_HASH__` occurs exactly once.
  - Files: app/app.js

- [ ] Task 5: `app.js` — paper renderer for every type and stimulus (agent `js`) (P0)
  - Acceptance: header (organisation, class, subject, marks, "2 hours", student); sections from `paper.sections`; `passage` paragraphs, `poem` one `.poem-line` per line, `q` newlines honoured, `_____` as `.blank`, inline figures with generic `aria-label` and no caption; `mcq`, `match` (right column rotated by one), all other types generic; `textContent` only for content; never reads `chapterSource`, `sourceChapter`, `difficulty`, `skill`.
  - Files: app/app.js

- [ ] Task 6: Coordinator check and batch-1 commit (P0)
  - Acceptance: a dev harness page loads all seven papers in Chromium on localhost with 0 console errors; no hidden field (prd Q3) in DOM/attributes; no horizontal scroll at 390 px; CSS class names cross-checked against HTML/JS; content diff empty; commit "v2 batch 1: Tasks 1–6".
  - Files: (none new; commit)

## Batch 2 — modes, gate, marking, result, print

- [ ] Task 7: `app.js` — gate and checking mode (P0)
  - Acceptance: dialog opens from `#checkModeBtn`; Escape/cancel/backdrop close without unlocking; wrong code → error, field cleared, dialog open; `crypto.subtle` SHA-256 vs injected hash; `mode.insecure` when unavailable; in-memory boolean reset by reload, back, home, other paper, logout; toggle off without re-asking.
  - Files: app/app.js

- [ ] Task 8: `app.js` — answer panels and captions on demand (P0)
  - Acceptance: per-item reveal and show-all build `.answer-panel` (model answer, `answerPoints` lines, `markingGuide` labelled, "Also accept" per blank for `fill-blank`/`one-word`, true `match` pairing) and captions after their figure; hide/re-lock **removes** them; none exist in practice mode.
  - Files: app/app.js

- [ ] Task 9: `app.js` — marks, score bar, clear, result screen (P0)
  - Acceptance: `0…marks` buttons per item stored by id per paper; score bar and checked count; clear marks; result table from `paper.sections` (code, stored title, obtained/marks, unmarked), total, percentage (1 dp, `.0` dropped), bands 90/75/60/40, unmarked warning; nothing hard-coded to 7 sections or 100.
  - Files: app/app.js

- [ ] Task 10: `styles.css` — checking UI, result, print (agent `shell`) (P0)
  - Acceptance: styles for panels, marks rows, score bar, result; print hides banner, dialog, marking UI, panels and captions, keeps poems and copy text unbroken with writing room; dark-mode figures legible via `currentColor`.
  - Files: app/styles.css

- [ ] Task 11: Coordinator check and batch-2 commit (P0)
  - Acceptance: in Chromium with a throwaway hash: gate cases, reveal/hide on one item of each type in use, full marks = 100 on Ch 1 and one seven-section paper, print preview free of answers; content diff empty; commit "v2 batch 2: Tasks 7–11".
  - Files: (commit)

## Batch 3 — build, README, local e2e

- [ ] Task 12: `build.js` (agent `build`) (P0)
  - Acceptance: brief §4 steps 1–6 and §5 exactly — validator with explicit `--skip-source-check`; card-driven paper list; secret resolution (env, then `.env.local` only if absent; empty = error; < 10 chars refused); placeholder exactly once; SVGs inlined as `<svg>`; JSON escaping by replacement functions; asserts (one 64-hex hash, no local `src`/`href`, no plaintext code, ≤ 4 MB); write last; one-line summary with "source check skipped".
  - Files: build.js

- [ ] Task 13: `scripts/test-build.js` — committed build failure suite (agent `build`) (P0)
  - Acceptance: `npm run test:build` runs on temp copies with throwaway codes: unset, empty, short, placeholder missing/doubled, missing asset, invalid paper, plaintext collision, `</script` in data — each exits non-zero and writes nothing; a control build exits 0 with one file.
  - Files: scripts/test-build.js

- [ ] Task 14: `README.md` (agent `docs`) (P0)
  - Acceptance: every brief §11 item, including the verbatim deterrent sentence, Secrets table without values or shape, login "not a security control", two section profiles, assumed duration, source check local-only, git-integration and Deployment Protection notes; live URL left as a placeholder for Task 19.
  - Files: README.md

- [ ] Task 15: `scripts/serve.js` and `scripts/e2e.js` (agent `e2e`) (P0)
  - Acceptance: e2e covers brief §10 checks 7–26 and X1, X3–X5 against a URL argument, expectations from the served page's JSON; secret redacted from all output (self-grep); prints PASS/FAIL per check; X2 as a labelled static check; negative controls runnable on scratch copies.
  - Files: scripts/serve.js, scripts/e2e.js

- [ ] Task 16: Coordinator real build + local e2e, batch-3 commit (P0)
  - Acceptance: full `npm run validate` passes; `npm run build` with the real code succeeds (summary line recorded, hash prefix only); `npm run test:build` green; local e2e all pass on Chromium (failures fixed or recorded); negative controls each turn their check red; commit "v2 batch 3: Tasks 12–16".
  - Files: (commit)

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
