#!/usr/bin/env bash
# One-time setup for mily-english-abhyas. Run from inside the repo folder:  bash setup.sh
set -euo pipefail
cd "$(dirname "$0")"

MATHS=../mily-maths-abhyas

# 1. Blueprint: the same file the Maths build used
if [ ! -f BLUEPRINT.md ]; then
  if [ -f "$MATHS/BLUEPRINT.md" ]; then
    cp "$MATHS/BLUEPRINT.md" BLUEPRINT.md && echo "OK  BLUEPRINT.md copied from $MATHS"
  else
    echo "MISSING  BLUEPRINT.md — copy it into this folder by hand, then re-run"; exit 1
  fi
fi

# 2. Secrets file, private, never committed
if [ ! -f .env.local ]; then
  cp .env.local.example .env.local
  echo "OK  .env.local created — fill in VERCEL_TOKEN and GANESH_ENGLISH (10+ chars)"
fi
chmod 600 .env.local
if [ -f "$MATHS/.env.local" ] && ! grep -q '^VERCEL_TOKEN=.' .env.local; then
  grep '^VERCEL_TOKEN=' "$MATHS/.env.local" > /tmp/.vt.$$ || true
  if [ -s /tmp/.vt.$$ ]; then
    sed -i '/^VERCEL_TOKEN=/d' .env.local && cat /tmp/.vt.$$ >> .env.local
    echo "OK  VERCEL_TOKEN reused from the Maths repo"
  fi
  rm -f /tmp/.vt.$$
fi

# 3. Git
[ -d .git ] || git init -q
git add -A
git diff --cached --quiet || git commit -qm "Scaffold: blueprint, v1 instruction, CLAUDE.md, folders"

# 4. Status
echo
echo "textbook files: $(find source/textbook -type f ! -name .gitkeep | wc -l)"
echo "sample files:   $(find source/samples  -type f ! -name .gitkeep | wc -l)"
grep -q '^VERCEL_TOKEN=.'           .env.local && echo "OK  VERCEL_TOKEN set"     || echo "TODO  VERCEL_TOKEN"
grep -q '^GANESH_ENGLISH=.\{10,\}'  .env.local && echo "OK  GANESH_ENGLISH set"   || echo "TODO  GANESH_ENGLISH (10+ chars)"
git log --oneline | head -3
