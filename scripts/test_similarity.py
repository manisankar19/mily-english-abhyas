#!/usr/bin/env python3
"""Proves scripts/similarity.py against fixtures (TASKS.md Task 3). No sample or textbook text is committed:
the copied-sample and textbook-line fixtures are built at run time from source/.text-cache/."""
import glob, json, os, re, subprocess, sys, tempfile, shutil, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(ROOT, "scripts", "similarity.py")
FX = os.path.join(ROOT, "fixtures", "similarity")
rows, failed = [], 0
tmp = tempfile.mkdtemp(prefix="sim-test-")

def check(ok, name, detail=""):
    global failed
    failed += (not ok)
    rows.append(("PASS  " if ok else "FAIL  ") + name + (("  — " + detail) if detail else ""))

def run(args, cache=None):
    cmd = [sys.executable, SCRIPT, "--cache-dir", cache or os.path.join(tmp, "cache")] + args
    return subprocess.run(cmd, capture_output=True, text=True, cwd=ROOT)

def toks(text):
    text = text.replace("‘", "'").replace("’", "'").replace("“", '"').replace("”", '"').lower()
    return re.findall(r"[a-z0-9]+(?:'[a-z0-9]+)*", text)

def paper_with(q, name):
    p = {"schemaVersion": "2.0", "subject": "english", "chapter": 2, "title": "fixture",
         "sections": [{"code": "A", "title": "Reading", "marks": 1, "blocks": [{"num": "Q.1", "instruction": "Answer the questions.",
         "items": [{"id": "english-c2-s1-b1-i1", "type": "short", "q": q, "marks": 1, "answer": "x", "difficulty": "easy"}]}]}]}
    path = os.path.join(tmp, name); json.dump(p, open(path, "w")); return path

cache_dir = os.path.join(ROOT, "source", ".text-cache")
sample_tokens = {}
for f in glob.glob(os.path.join(cache_dir, "1.1.*.txt")):
    sample_tokens[f] = toks(open(f, encoding="utf-8", errors="ignore").read())
all_sample_shingles = set()
for t in sample_tokens.values():
    all_sample_shingles |= {" ".join(t[i:i+6]) for i in range(len(t) - 5)}

# 1. a sample sentence copied into an item -> non-zero, the shingle is named
st = sample_tokens[sorted(sample_tokens)[1]]            # L-5 worksheet
window = " ".join(st[120:132])
r = run([paper_with("Class question: " + window, "copied-sample.json")])
check(r.returncode == 1 and "SHINGLE" in r.stdout and "english-c2-s1-b1-i1" in r.stdout and window.split()[0] in r.stdout,
      "sample sentence in an item -> exit 1, shingle and item id named", f"exit {r.returncode}")

# 2. a clean fixture -> exit 0, quiet
r = run([os.path.join(FX, "clean.json")])
check(r.returncode == 0 and len(r.stdout.strip().splitlines()) <= 3, "clean fixture -> exit 0 and quiet (<= 3 lines)", f"exit {r.returncode}, {len(r.stdout.strip().splitlines())} lines")

# 3. generic instruction phrases are allow-listed
r = run([os.path.join(FX, "allowlist.json")])
check(r.returncode == 0, "allow-listed generic instruction phrases are not flagged", f"exit {r.returncode}")

# 4. a textbook line that the samples do NOT contain is not a hard failure (only the samples are shingled)
ch = toks(open(os.path.join(cache_dir, "desa102.txt"), encoding="utf-8", errors="ignore").read())
start = next(s for s in range(300, 800) if not any(" ".join(ch[s+j:s+j+6]) in all_sample_shingles for j in range(0, 5)))
r = run([paper_with("Chapter line: " + " ".join(ch[start:start+10]), "textbook-line.json")])
check(r.returncode == 0, "a textbook line the samples do not use is not a hard failure", f"exit {r.returncode}")

# 5. semantic pass: near-paraphrase across a chapter paper and the mock is listed; the 0.82 pair is not
r = run([os.path.join(FX, "semantic-a.json"), os.path.join(FX, "semantic-b-mock.json")])
out = r.stdout
if "sentence-transformers unavailable" in out:
    rows.append("SKIP  semantic pass — sentence-transformers unavailable here")
else:
    listed = "english-c2-s1-b1-i1" in out and "english-chy-s1-b1-i1" in out
    m = re.search(r"(0\.\d\d)\s+english-c", out)
    check(r.returncode == 0 and listed and "mock" in out.lower(), "near-paraphrase (kite pair, mock vs chapter) is listed, exit 0", f"exit {r.returncode}")
    check("english-c2-s1-b1-i2" not in out, "a pair below the 0.85 threshold (~0.82) is not listed")

# 6. vectors are cached: a second run embeds nothing new; cache files are git-ignored
c = os.path.join(tmp, "cache2")
run([os.path.join(FX, "semantic-a.json"), os.path.join(FX, "semantic-b-mock.json")], cache=c)
r2 = run([os.path.join(FX, "semantic-a.json"), os.path.join(FX, "semantic-b-mock.json")], cache=c)
if "sentence-transformers unavailable" not in r2.stdout:
    check(bool(glob.glob(os.path.join(c, "*.npy"))) and re.search(r"embedded 0 new", r2.stdout) is not None,
          "vectors cached as .npy; a second run embeds 0 new", re.sub(r"\s+", " ", r2.stdout.strip().splitlines()[-1]) if r2.stdout.strip() else "")
ignored = [subprocess.run(["git", "check-ignore", "-q", p], cwd=ROOT).returncode == 0
           for p in ("scripts/sim-vectors.npy", "scripts/sim-texts.npy", "source/.text-cache/desa101.txt")]
check(all(ignored), ".npy vector cache and source/.text-cache/ are git-ignored (git check-ignore)", "%d/3 paths ignored" % sum(ignored))

# 7. --no-semantic runs the shingle pass alone
r = run(["--no-semantic", os.path.join(FX, "clean.json")])
check(r.returncode == 0 and "semantic" in r.stdout.lower() and "skipped" in r.stdout.lower(), "--no-semantic: shingle pass only, and it says so", f"exit {r.returncode}")

# 8. no papers -> clean exit
empty = tempfile.mkdtemp(dir=tmp)
r = run(["--data-dir", empty])
check(r.returncode == 0 and "0 papers" in r.stdout, "no papers -> '0 papers found' and exit 0", f"exit {r.returncode}")

shutil.rmtree(tmp, ignore_errors=True)
print("\n".join(rows))
print(f"\n{len([x for x in rows if x.startswith('PASS')])} passed, {failed} failed")
sys.exit(1 if failed else 0)
