# English Practice · Class 4 (mily-english-abhyas)

A static practice-paper site for Mily's Class 4 English (*Santoor, Grade 4*, Atomic Energy
Education Society, 2025-26). It holds seven fixed question papers: one per chapter for
Chapters 1–6, plus a Half-Yearly mock paper covering Chapters 1–6. Each paper is worth
100 marks. Mily writes her answers on paper; a parent marks them using the site.

**Live site:** <to be filled at deploy, Task 19> — Vercel project `mily-english-abhyas`.

Who uses it:

- **The child** reads a paper in **practice mode** (the default) on a phone, tablet or printout
  and writes the answers in a notebook. No answers, captions, marking buttons or score are shown.
- **The parent** unlocks **checking mode** with a code, reveals model answers and marking
  guides, taps marks for each question and sees a section-wise result.

There is no server and no database. The source lives under `app/`; `build.js` bundles the HTML,
CSS, JS, UI strings (`app/ui/en.json`), all seven papers and every referenced SVG figure into one
self-contained `dist/index.html`. That one file is what gets deployed.

---

## Secrets

| Name | Where the value lives | What it controls |
|---|---|---|
| `VERCEL_TOKEN` | `.env.local` at the repo root (git-ignored) | CLI deploys to the Vercel project `mily-english-abhyas` |
| `GANESH_ENGLISH` | The Vercel project's environment variables (**Production**), and `.env.local` for local builds | The checking-mode unlock code. The build embeds only its **SHA-256 hash** in the page; the plain value is never written to `app/`, `dist/` or git. |

This README gives names and locations only. **Never write either value here or anywhere else in
the repo**, and never print or log it. `.gitignore` and `.vercelignore` keep `.env*` out of git
and out of deploy uploads.

### Student login (not a security control)

The login screen expects the user `Mily` and the password `2026` (from `PROJECT-CARD.yml`,
`student_login`). The check runs only in the browser. **This is not a security control** — it
only stops the page opening straight onto the chapter list.

## The two modes

- **Practice mode** is what every visit starts in, including after a reload.
- **Checking mode**: tap *Checking mode*, type the code, confirm. The page hashes what you typed
  (SHA-256, in the browser) and compares it with the hash baked in at build time. A wrong code
  shows an error; Cancel or a tap outside closes the box. Once unlocked you can show/hide each
  answer, tap marks, watch the score bar and open the section-wise result.

This is a deterrent for a nine-year-old, not a security boundary. Anyone opening dev-tools on the deployed page can read the answers without the code.

Marks are stored only in **this browser's `localStorage`**. They do not sync between devices,
and clearing site data erases them.

## The papers

| Papers | Sections | Marks per section |
|---|---|---|
| Chapters 2, 3, 5, 6 and the Half-Yearly mock | Seven: A Reading, B Textual Questions, C Creative Writing, D Grammar, E Vocabulary, F Spelling, G Handwriting | 25 / 13 / 12 / 19 / 13 / 12 / 6 |
| Chapters 1 and 4 | Five: A Reading, B Textual Questions, C Creative Writing, D Grammar, E Vocabulary | 30 / 10 / 20 / 20 / 20 |

Chapters 1 and 4 are thin poem chapters, so their papers use a harder mix of questions and have
no Spelling or Handwriting section. **Their results are not comparable with the other papers.**

`durationMinutes` is 120 (shown as "2 hours"). This is an **assumed value** — the school
worksheets print no duration.

## Build and run locally

Needs Node 18 or later. Run `npm install` once (Playwright is the only dev dependency).

```bash
npm run build      # validate (source check skipped), then write dist/index.html
npm run dev        # build, then serve dist/ on localhost
node scripts/serve.js   # serve an existing build
```

Open the `http://localhost:<port>` address that `serve.js` prints. **Do not open
`dist/index.html` via `file://`**: the code check uses `crypto.subtle`, which browsers allow only
on `https://` or `http://localhost`.

The build reads `GANESH_ENGLISH` from the environment, falling back to `.env.local` only if the
variable is absent. It fails if the value is empty or shorter than 10 characters, if the value
appears anywhere in the assembled page, if a referenced figure is missing, or if the page exceeds
4 MB.

## Tests

```bash
npm run validate              # full content check, including the source check (needs source/)
npm run test:validator        # validator's own test suite
npm run test:build            # build failure cases, run on temporary copies with throwaway codes
npm run e2e                   # Playwright (Chromium) end-to-end checks against localhost
node scripts/e2e.js --url https://<live-host>   # the same checks against the live site
```

Optional content tools (Python): `python3 scripts/similarity.py` (near-duplicate questions) and
`python3 scripts/readability.py`, with their tests `npm run test:similarity` and
`npm run test:readability`.

**Source check.** The full `npm run validate` checks questions against the textbook text in
`source/`, so it runs **locally only**. `source/` is not uploaded to Vercel, so the Vercel build
runs `validate.js --strict --skip-source-check` with the flag passed explicitly, and says
"source check skipped". Run the full `npm run validate` locally before every deploy.

**No Safari/WebKit automated test exists.** WebKit does not run on this build machine. Use the
manual iPhone/iPad checklist in the sprint walkthrough (`sprints/v2/walkthrough.md`).

## Editing content

### Edit a question

1. Edit the paper in `app/data/`. Keep every question `id` unchanged (saved marks are keyed by id).
2. Keep the marks summing correctly: each section to its blueprint total, the paper to 100.
3. Run the full `npm run validate` locally (it includes the source check), then
   `python3 scripts/similarity.py`.
4. Rebuild and redeploy.

### Add a chapter

1. Add an entry to `chapter_list` in `PROJECT-CARD.yml` (and update `chapters`).
2. Add the paper file in `app/data/`, following `SCHEMA.md`.
3. Run `npm run validate`.

No edit to `build.js` is needed: it reads the paper list from the card via `scripts/lib/card.js`.

### Change the checking code

1. In the Vercel dashboard → project `mily-english-abhyas` → Settings → Environment Variables,
   change `GANESH_ENGLISH` for **Production**. Use at least 10 characters.
2. Redeploy (below). The new hash is baked in at build time.

Never put the code in the source. The build refuses values shorter than 10 characters and fails
if the code appears anywhere in the page. Update your local `.env.local` too if you build locally.

## Deploy, redeploy and rollback

**Deployment is done only with the owner's approval.** Deploy by CLI, keeping the token in a
shell variable only (never echoed, unset afterwards):

```bash
vercel deploy --prod --yes --token "$T"
unset T
```

Redeploy is the same command. To roll back:

```bash
vercel rollback <deployment-url-or-id> --token "$T"
```

or, in the Vercel dashboard → Deployments, promote a previous deployment to production.

- **Git integration:** after `vercel link`, the project may be connected to the git remote, and a
  push to `main` may then deploy to production.
- **Deployment Protection** is left at Vercel's default.
