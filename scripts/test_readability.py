#!/usr/bin/env python3
"""Proves scripts/readability.py against fixtures (TASKS.md Task 4)."""
import json, os, re, subprocess, sys, tempfile, shutil
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(ROOT, "scripts", "readability.py")
FX = os.path.join(ROOT, "fixtures", "readability")
sys.path.insert(0, os.path.join(ROOT, "scripts"))
rows, failed = [], 0
tmp = tempfile.mkdtemp(prefix="read-test-")

def check(ok, name, detail=""):
    global failed
    failed += (not ok)
    rows.append(("PASS  " if ok else "FAIL  ") + name + (("  — " + detail) if detail else ""))

def run(*paths):
    return subprocess.run([sys.executable, SCRIPT, *paths], capture_output=True, text=True, cwd=ROOT)

def fx(n): return os.path.join(FX, n + ".json")

r = run(fx("clean"))
check(r.returncode == 0 and "FAIL" not in r.stdout and re.search(r"avg\s+5\.5", r.stdout) is not None, "clean fixture -> exit 0, avg 5.5 words reported", f"exit {r.returncode}")
check(r.returncode == 0 and re.search(r"easy\s+\d+%.*medium\s+\d+%.*hard\s+\d+%", r.stdout, re.S) is not None, "prints the easy/medium/hard mix (items and marks)")
check(len(r.stdout.strip().splitlines()) <= 8, "output is compact enough to paste into the walkthrough", f"{len(r.stdout.strip().splitlines())} lines")

r = run(fx("long-sentence"))
check(r.returncode == 1 and re.search(r"max\s+26", r.stdout) is not None and "20" in r.stdout, "a 26-word sentence -> exit 1, longest sentence reported", f"exit {r.returncode}")
r = run(fx("high-average"))
check(r.returncode == 1 and re.search(r"avg\s+16\.5", r.stdout) is not None, "average sentence length 16.5 (> 12) -> exit 1", f"exit {r.returncode}")
r = run(fx("theme-stem"))
check(r.returncode == 1 and "theme" in r.stdout.lower(), "\"What is the theme of the poem?\" -> exit 1, stem flagged", f"exit {r.returncode}")
r = run(fx("why-do-you-think"))
check(r.returncode == 1 and "why do you think" in r.stdout.lower(), "\"Why do you think ...\" -> exit 1, stem flagged", f"exit {r.returncode}")
r = run(fx("hard-word"))
check(r.returncode == 1 and "extraordinary" in r.stdout, "a > 3-syllable word not in the chapter and not glossed -> exit 1, word named", f"exit {r.returncode}")
r = run(fx("hard-word-glossed"))
check(r.returncode == 0, "the same word glossed in the question -> exit 0", f"exit {r.returncode}")

# a > 3-syllable word taken from the chapter's own text is excused (built at run time from the cache)
import readability as R
ch = open(os.path.join(ROOT, "source", ".text-cache", "desa102.txt"), encoding="utf-8", errors="ignore").read()
cand = sorted({t for t in R.tokens(ch) if t.isalpha() and R.syllables(t) > 3})
if cand:
    word = cand[0]
    p = json.load(open(fx("clean")))
    p["sections"][0]["blocks"][0]["stimulus"]["text"] = f"The kite was {word}. It was red and very big. Rina was proud."
    path = os.path.join(tmp, "chapter-word.json"); json.dump(p, open(path, "w"))
    r = run(path)
    check(r.returncode == 0, f"a long word taken from the chapter's own text ('{word}') is excused", f"exit {r.returncode}")
    p["chapter"] = 5                                             # same word, but Chapter 5's text does not contain it
    path5 = os.path.join(tmp, "other-chapter-word.json"); json.dump(p, open(path5, "w"))
    if word not in R.tokens(open(os.path.join(ROOT, "source", ".text-cache", "desa105.txt"), encoding="utf-8", errors="ignore").read()):
        r = run(path5)
        check(r.returncode == 1 and word in r.stdout, "the same word is NOT excused in a paper whose chapter does not contain it", f"exit {r.returncode}")
else:
    rows.append("SKIP  chapter-word exemption — no >3-syllable word found in Chapter 2 text")

r = run(fx("poem-lines"))
check(r.returncode == 0 and re.search(r"poem\s+words\s+\d+\s+sentences\s+8", r.stdout) is not None, "a poem is measured line by line (8 lines -> 8 units), exit 0", f"exit {r.returncode}")
r = run(fx("speech-tag"))
check(r.returncode == 0 and re.search(r"sentences\s+3\b", r.stdout) is not None, "a speech tag after a quotation (“...!” said Rina.) stays in its sentence: 3 sentences, not the naive 4", "; ".join(l.strip() for l in r.stdout.splitlines() if "passage" in l))

empty = tempfile.mkdtemp(dir=tmp)
r = subprocess.run([sys.executable, SCRIPT, "--data-dir", empty], capture_output=True, text=True, cwd=ROOT)
check(r.returncode == 0 and "0 papers" in r.stdout, "no papers -> '0 papers found' and exit 0", f"exit {r.returncode}")

shutil.rmtree(tmp, ignore_errors=True)
print("\n".join(rows))
print(f"\n{len([x for x in rows if x.startswith('PASS')])} passed, {failed} failed")
sys.exit(1 if failed else 0)
