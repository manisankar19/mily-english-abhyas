# CLAUDE.md — standing rules for every session in this repo

This file is loaded automatically at the start of every session, so these rules hold even
after `/clear` or in a fresh session. The detailed specification is in `BLUEPRINT.md` and
`sprints/vN/instruction.md`.

## Where you are

- Repo: Class IV English practice-paper site for Mily (`mily-english-abhyas`).
- Reference build on this machine: `../mily-maths-abhyas` (same architecture, finished).
- Current sprint: the highest-numbered `sprints/vN/` that has an `instruction.md` but no
  `walkthrough.md`.

## Resuming work

At the start of a session, find out what is already done: `git log --oneline | head -15` and
the checkboxes in the current `sprints/vN/TASKS.md`. Never redo committed work. Read the PRD and
tasks file for the current sprint; read `BLUEPRINT.md` only for the sections a task needs.

## Rules that always apply

1. **Secrets.** Never print, log, echo or commit `VERCEL_TOKEN` or `GANESH_ENGLISH`. Check them
   with count-only or presence-only commands. `.env.local` is git-ignored and stays that way.
2. **Source is read-only.** Never move, rename or edit anything under `source/` except the files
   you generate there (`INTAKE.md`, `.text-cache/`).
3. **Sub-agent write scope.** A sub-agent writes only the files its task assigns (one paper JSON
   plus its assets). It never writes PRD, card, tasks, schema, validator or scripts. After every
   sub-agent, re-read what it wrote and re-run the checks yourself.
4. **Checks after every paper:** `npm run validate && python3 scripts/similarity.py`.
5. **Commit after every paper or task**, with a message naming the task number, so an interrupted
   session can resume from `git log`.
6. **Context economy.** Inspect papers with `jq` (only `id`, `q`, `answer`, `marks`,
   `markingGuide`), view each figure once at 2×, and report only failures between steps.
7. **Stop where the prompt says to stop.** Do not start the next batch unasked.
8. **Honesty.** "Tested" means run. If something was only read, say so.
