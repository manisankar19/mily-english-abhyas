# Owner setup — mily-english-abhyas

This file is for you, not the agent. The site's real README is written by the agent in v2.

## Folder layout

```
mily/
  mily-maths-abhyas/            finished reference build (already on the server)
  mily-english-abhyas/          ← this folder
    CLAUDE.md                   standing rules, auto-loaded in every agent session
    BLUEPRINT.md                copied from the Maths repo by setup.sh
    SETUP.md                    this file
    setup.sh                    one-time setup
    .env.local.example          template; setup.sh turns it into .env.local
    .gitignore
    source/
      textbook/                 ← English chapter PDFs go here
      samples/                  ← school English papers / worksheets go here
      syllabus/                 ← optional: half-yearly portion circular
    sprints/
      v1/instruction.md         content sprint brief (agent writes prd.md, TASKS.md, walkthrough.md here)
      v2/                       agent writes instruction.md here at the end of v1
    app/{data,assets,ui}/       agent fills these
    scripts/                    agent fills this
```

Created later by the agent: `PROJECT-CARD.yml`, `package.json`, `validate.js`, `build.js`,
`vercel.json`, `README.md`, `app/*`, `dist/` (git-ignored).

## 1. Put the folder on the server

Drag `mily-english-abhyas/` into `.../home-application/mily/` in VS Code's Explorer, next to
`mily-maths-abhyas/`.

## 2. Add the source files

Name chapter files so the number is unambiguous — prefix `chNN-`:

```
source/textbook/ch01-<title>.pdf
source/textbook/ch02-<title>.pdf
...
source/samples/revision-paper-A.pdf
source/samples/revision-paper-B.pdf
source/samples/ws-<lessons>.pdf
```

Add only the **half-yearly portion** chapters. Every file in `textbook/` becomes a paper.

## 3. Run setup once

```bash
cd /home/ec2-user/research/projects/home-application/mily/mily-english-abhyas
bash setup.sh
```

It copies `BLUEPRINT.md`, creates `.env.local` (reusing the Maths `VERCEL_TOKEN`), runs
`git init`, and commits. Then set the checking code:

```bash
nano .env.local        # GANESH_ENGLISH=<10+ characters, different from the Maths code>
bash setup.sh          # re-run: should print OK for both secrets and non-zero file counts
```

## 4. Agent sessions

Start with `tmux new -s english`, then `claude`.

| Step | Prompt |
|---|---|
| PRD | *Read `sprints/v1/instruction.md` and `BLUEPRINT.md`. Run the preflight in §10, then write `sprints/v1/prd.md` per §11. Stop.* |
| Review | Read `prd.md` yourself — especially the section blueprint and deviations. Reply with corrections. |
| Plan | `/prd` → `sprints/v1/TASKS.md` |
| Build | `/dev` **tasks 1–3 only**, then commit and stop. Then papers in batches of 2–4. |
| Verify | `/dev` the cross-paper verification task in a **fresh session**. |
| Close | `/walkthrough`, then `git tag v1-content` |
| v2 | Fresh session: *Read `sprints/v2/instruction.md` …* then `/prd`, `/dev` in 4 batches, `/walkthrough`. |

Because `CLAUDE.md` loads automatically, a fresh session only needs:
*"Run `/dev` for tasks X–Y, then commit and stop."*

## 5. Checks after every batch

```bash
git log --oneline | head -3
npm run validate && python3 scripts/similarity.py
git status --short                 # should be empty
```

## 6. Before closing v1 — read the papers yourself

```bash
for f in app/data/english-*.json; do
  echo "===== $f"
  jq -r '.sections[] | .code as $s | .blocks[] | .items[] | "\($s) [\(.marks)] \(.q)"' "$f"
done | less
```

Look for vocabulary above Class 4, questions with two right answers, and anything that feels
copied from the school papers. Fifteen minutes here catches what the validator cannot.
