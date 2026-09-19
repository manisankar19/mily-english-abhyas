# HANDOFF — sprint v1 (English content)

State at handoff: **Tasks 1–4 done and committed** (`git log --oneline`); **no paper exists**; next is **Task 5** (Ch 1, session S2).
This file holds only what git and the docs do not tell a fresh coordinator. Rules are in `CLAUDE.md`, the plan in `prd.md` and `TASKS.md`.

## 1. Ch 4 passes the capacity gate by one word

`source/INTAKE.md` §5. Ch 4 clears every threshold by exactly one (B 9 vs 8, C 7 vs 6, D 9 vs 8, **E 21 vs 20**).
Three of its 21 Vocabulary words are shaky:

- ***trifled*, *halves*** — unglossed in the book, so any question must gloss them **in the question itself**.
- ***balm*** — its meaning is not taught; **spelling items only**.

Rejecting one leaves 20 (margin 0, still a pass). **Rejecting two leaves 19 and triggers the §12 stop:** report it, do not pad.
Before Task 8 starts, re-read that word list; if you doubt any word, count it out.

## 2. Ch 1 and Ch 4: thin-poem rule (owner-confirmed 2026-09-19)

100 marks must come from **the chapter's own material plus one original unseen passage** (with its original chapter-linked A2 text).
**No off-chapter padding, and never lower a section's marks to fit.** If a paper cannot reach 45 items and each section's marks that
way, that is the **§12 stop**: the sub-agent stops and reports. Five sections, 30/10/20/20/20 (Spelling folded into Vocabulary,
Handwriting not carried), hard 35–50 %, `chapterSource` on every item (`prd.md` §3.6, §5.0; `SCHEMA.md` §6).

## 3. `similarity.py` has not yet run on a real paper

Its tests pass on fixtures only. The first live run is in **S2** (Task 5). Treat first-run output as material for **judgement**:

- Semantic pairs (≥ 0.85) are warnings — judge each and log it; they never fail the run.
- A shingle hit exits 1 by design, but read it before reacting. Some are legitimate short textbook quotes that the samples also
  use (`prd.md` R3): choose a different line. **Do not loosen the script or widen the allow-list just to get a green run.**

## 4. v2 parking lot (carry into `sprints/v2/instruction.md`, Task 14)

- **`--skip-source-check`.** `source/` is not uploaded to Vercel, so `validate.js` check `SOURCE_WINDOW` cannot run in a Vercel build.
  The build must pass that flag explicitly (default is fail-loud), and the content must be source-checked locally before deploy.
- **Playwright browsers in the preflight:** install with `--with-deps`. In the Maths build WebKit could not launch on this host
  (Amazon Linux 2023, glibc 2.34 vs the 2.35/2.38 it needs), so there were no Safari results; plan for that from the start.
- Also for v2: `GANESH_ENGLISH` is exactly 10 characters and name-derived (owner rotates later via Vercel env); the app must
  render per-paper section lists (Ch 1 and Ch 4 have five sections).

## Not in git

- `.env.local` (real `VERCEL_TOKEN` and `GANESH_ENGLISH`, mode 600, untracked). Never print either value.
- `source/.text-cache/` and `scripts/*.npy` are git-ignored and regenerate on demand.
- Python packages were installed with `pip install --user` (CPU `torch 2.8.0+cpu`, `sentence-transformers 5.1.2`); a new machine needs them for the semantic pass.
- Run before trusting any tool: `npm run test:validator && npm run test:similarity && npm run test:readability`
  (41 + 10 + 14 passing at handoff).
