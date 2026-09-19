#!/usr/bin/env python3
"""Reuse detector (instruction.md section 7). Run after EVERY paper:  npm run validate && python3 scripts/similarity.py

1. Extracts the text of every file under source/ once into source/.text-cache/<name>.txt (shared with validate.js).
2. SHINGLE PASS (hard fail): any 6-word shingle shared between an item's `q`, a block `instruction`, or a stimulus
   text and the SAMPLE-paper text is a failure. Generic instruction phrases in ALLOW_LIST are masked out first.
   Only the samples are shingled: quoting a short textbook line is normal exam practice (instruction.md 6.1).
3. SEMANTIC PASS (warning): every item `q` is embedded with all-MiniLM-L6-v2 on CPU (sentence-transformers); vectors are
   cached as .npy; every cross-paper and paper-to-sample pair with cosine >= 0.85 is printed for the coordinator to judge
   (mock-against-chapters first). This catches "Rani's school has 523 children" vs "Preeti's school has 423 pupils".
4. Exit 1 on a shingle failure ONLY. If sentence-transformers cannot load, it says so and runs the shingle pass alone.

No GPU, no vector database, no Modal, no RAG: the whole corpus is a few thousand short strings.
"""
import argparse
import glob
import json
import os
import re
import shutil
import subprocess
import sys
import warnings

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "source")
TEXT_CACHE = os.path.join(SOURCE, ".text-cache")
SHINGLE = 6
THRESHOLD = 0.85
MODEL = "all-MiniLM-L6-v2"
SEP = "§"          # masks an allow-listed phrase so no shingle can include or span it
MAX_PAIRS = 200

# Generic instruction phrases the school's papers and ours both legitimately use. Deliberately NOT chapter lines
# (prd.md R3): only wording that carries no question content is exempt.
ALLOW_LIST = [
    "answer the following questions", "answer the following question", "answer the questions",
    "read the passage and answer the questions", "read the passage and answer the questions below",
    "read the given passage attentively and answer the following questions",
    "read the passage attentively and answer the following questions",
    "fill in the blanks", "fill in the blanks with the correct word", "fill in the blanks using the words from the box",
    "fill in the blanks with suitable describing words", "choose the correct word from the bracket and fill in the blanks",
    "choose the correct option", "choose the correct option and write it in your answer book",
    "write true or false", "write true or false against each statement",
    "circle the correct spelling", "match the words with their meanings", "match the word with their meaning",
    "rearrange the jumbled letters to make meaningful words", "rearrange the jumbled letters to make a meaningful word",
    "write the following lines in neat handwriting", "write the passage in good handwriting",
    "complete the following sentences", "do as directed", "write five sentences about",
    "write the opposite word", "write the past tense of", "tick the correct word and fill in the blanks",
    "give one word from the passage",
]


def tokens(text):
    """Words = letters/digits with internal apostrophes, curly quotes folded, lower-cased (same rule as validate.js)."""
    text = text.replace("‘", "'").replace("’", "'").replace("“", '"').replace("”", '"').lower()
    return re.findall(r"[a-z0-9]+(?:'[a-z0-9]+)*", text)


_ALLOWED = sorted((tokens(p) for p in ALLOW_LIST), key=len, reverse=True)


def mask(toks):
    out, i = [], 0
    while i < len(toks):
        for p in _ALLOWED:
            if toks[i:i + len(p)] == p:
                out.append(SEP)
                i += len(p)
                break
        else:
            out.append(toks[i])
            i += 1
    return out


def shingles(toks):
    return [" ".join(toks[i:i + SHINGLE]) for i in range(len(toks) - SHINGLE + 1) if SEP not in toks[i:i + SHINGLE]]


# ---- source text -------------------------------------------------------------------------------------------------------------
def die(msg, code=2):
    print("ERROR: " + msg, file=sys.stderr)
    sys.exit(code)


def extract_source():
    """Cache the text of every file under source/ (once). Returns [(kind, cache_path)] with kind 'sample' or 'other'."""
    if not os.path.isdir(SOURCE):
        die("source/ directory not found")
    os.makedirs(TEXT_CACHE, exist_ok=True)
    found = []
    for dirpath, dirnames, filenames in os.walk(SOURCE):
        dirnames[:] = sorted(d for d in dirnames if not d.startswith("."))
        for name in sorted(filenames):
            if name.startswith(".") or name == "INTAKE.md":
                continue
            path = os.path.join(dirpath, name)
            base, ext = os.path.splitext(name)
            out = os.path.join(TEXT_CACHE, base + ".txt")
            if ext.lower() == ".pdf":
                if not os.path.exists(out) or os.path.getmtime(out) < os.path.getmtime(path):
                    r = subprocess.run(["pdftotext", path, out], capture_output=True, text=True)
                    if r.returncode != 0:
                        die("pdftotext failed for %s: %s" % (os.path.relpath(path, ROOT), r.stderr.strip()))
            elif ext.lower() in (".txt", ".md"):
                shutil.copyfile(path, out)
            else:
                print("NOTE  unsupported source file type not checked: " + os.path.relpath(path, ROOT), file=sys.stderr)
                continue
            kind = "sample" if os.path.relpath(path, SOURCE).split(os.sep)[0] == "samples" else "other"
            found.append((kind, out))
    if not found:
        die("no extractable files under source/")
    return found


def read(path):
    with open(path, encoding="utf-8", errors="ignore") as f:
        return f.read()


# ---- papers ------------------------------------------------------------------------------------------------------------------
def load_papers(paths):
    papers = []
    for p in paths:
        try:
            with open(p, encoding="utf-8") as f:
                d = json.load(f)
        except Exception as e:
            die("cannot read %s: %s" % (p, e))
        label = os.path.basename(p)
        mock = d.get("chapter") is None
        texts, items = [], []           # texts: (id, field, text); items: (id, q)
        for s in d.get("sections", []):
            for b in s.get("blocks", []):
                bid = "block " + str(b.get("num"))
                if b.get("instruction"):
                    texts.append((bid, "instruction", b["instruction"]))
                if isinstance(b.get("stimulus"), dict) and b["stimulus"].get("text"):
                    texts.append((bid, "stimulus", b["stimulus"]["text"]))
                for it in b.get("items", []):
                    iid = it.get("id", "(no id)")
                    if it.get("q"):
                        texts.append((iid, "q", it["q"]))
                        items.append((iid, it["q"]))
                    if isinstance(it.get("stimulus"), dict) and it["stimulus"].get("text"):
                        texts.append((iid, "stimulus", it["stimulus"]["text"]))
        papers.append({"label": label, "mock": mock, "texts": texts, "items": items})
    return papers


# ---- shingle pass ------------------------------------------------------------------------------------------------------------
def shingle_pass(papers, sample_files):
    index = {}
    for path in sample_files:
        for sh in shingles(mask(tokens(read(path)))):
            index.setdefault(sh, os.path.splitext(os.path.basename(path))[0])
    failures, n_texts = [], 0
    for p in papers:
        for iid, field, text in p["texts"]:
            n_texts += 1
            hits = []
            for sh in shingles(mask(tokens(text))):
                if sh in index:
                    hits.append(sh)
            if hits:
                failures.append((p["label"], iid, field, hits[0], len(hits), index[hits[0]]))
    n_items = sum(len(p["items"]) for p in papers)
    print("shingle pass: %d item(s), %d text(s) checked against %d sample file(s): %d failure(s)"
          % (n_items, n_texts, len(sample_files), len(failures)))
    for label, iid, field, sh, n, src in failures:
        print('  SHINGLE  %s  %s  [%s]  "%s"  (%d shared shingle(s); sample %s)' % (label, iid, field, sh, n, src))
    return failures


# ---- semantic pass -----------------------------------------------------------------------------------------------------------
def sample_segments(sample_files):
    segs = []
    for path in sample_files:
        name = os.path.splitext(os.path.basename(path))[0]
        for part in re.split(r"(?<=[.?!])\s+|\n+", read(path)):
            part = " ".join(part.split())
            if len(tokens(part)) >= 4 and re.search(r"[A-Za-z]{3}", part):
                segs.append((name, part))
    return segs


def semantic_pass(papers, sample_files, cache_dir, threshold):
    try:
        warnings.filterwarnings("ignore")
        os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
        os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
        import numpy as np
        from sentence_transformers import SentenceTransformer
        try:
            import transformers
            transformers.logging.set_verbosity_error()
        except Exception:
            pass
        model = SentenceTransformer(MODEL, device="cpu")
    except Exception as e:                                   # missing package, no cached model and no network, ...
        print("semantic pass skipped: sentence-transformers unavailable (%s); shingle pass only" % str(e).splitlines()[0][:80])
        return

    items = [(p["label"], p["mock"], iid, q) for p in papers for iid, q in p["items"] if len(tokens(q)) >= 4]
    segs = sample_segments(sample_files)
    texts = sorted({q for _, _, _, q in items} | {t for _, t in segs})
    os.makedirs(cache_dir, exist_ok=True)
    vp, tp = os.path.join(cache_dir, "sim-vectors.npy"), os.path.join(cache_dir, "sim-texts.npy")
    have = {}
    if os.path.exists(vp) and os.path.exists(tp):
        try:
            old_t, old_v = np.load(tp, allow_pickle=False), np.load(vp, allow_pickle=False)
            if old_v.shape[0] == len(old_t):
                have = {str(t): old_v[i] for i, t in enumerate(old_t)}
        except Exception:
            have = {}
    new = [t for t in texts if t not in have]
    if new:
        vecs = model.encode(new, batch_size=64, normalize_embeddings=True, show_progress_bar=False)
        for t, v in zip(new, vecs):
            have[t] = v
    mat = np.array([have[t] for t in texts], dtype="float32")
    np.save(vp, mat)
    np.save(tp, np.array(texts))
    row = {t: i for i, t in enumerate(texts)}
    print("semantic pass: embedded %d new (%d cached), model %s on CPU" % (len(new), len(texts) - len(new), MODEL))

    A = np.array([mat[row[q]] for _, _, _, q in items], dtype="float32") if items else np.zeros((0, mat.shape[1]), dtype="float32")
    groups = {"mock vs chapter": [], "chapter vs chapter": [], "paper vs sample": []}
    if len(items):
        sim = A @ A.T
        for i in range(len(items)):
            for j in range(i + 1, len(items)):
                if items[i][0] != items[j][0] and sim[i, j] >= threshold:
                    key = "mock vs chapter" if items[i][1] != items[j][1] else "chapter vs chapter"
                    groups[key].append((float(sim[i, j]), items[i], items[j]))
        if segs:
            S = np.array([mat[row[t]] for _, t in segs], dtype="float32")
            cross = A @ S.T
            for i in range(len(items)):
                for j in range(len(segs)):
                    if cross[i, j] >= threshold:
                        groups["paper vs sample"].append((float(cross[i, j]), items[i], ("sample " + segs[j][0], None, None, segs[j][1])))
    total = sum(len(v) for v in groups.values())
    print("semantic pass: %d pair(s) >= %.2f for the coordinator to judge" % (total, threshold))
    shown = 0
    for name in ("mock vs chapter", "chapter vs chapter", "paper vs sample"):
        pairs = sorted(groups[name], key=lambda x: -x[0])
        if not pairs:
            continue
        print("  -- %s (%d)" % (name, len(pairs)))
        for sc, a, b in pairs:
            if shown >= MAX_PAIRS:
                break
            shown += 1
            print("  %.2f  %s [%s]  %s" % (sc, a[2], a[0] + (" (mock)" if a[1] else ""), a[3][:110]))
            print("        ~ %s [%s]  %s" % (b[2] if b[2] else "", b[0] + (" (mock)" if b[1] else ""), b[3][:110]))


def main():
    ap = argparse.ArgumentParser(description="Shingle and semantic reuse detection.")
    ap.add_argument("papers", nargs="*", help="paper JSON files (default: app/data/*.json)")
    ap.add_argument("--data-dir", default=os.path.join(ROOT, "app", "data"))
    ap.add_argument("--cache-dir", default=os.path.join(ROOT, "scripts"), help="where the .npy vector cache lives")
    ap.add_argument("--threshold", type=float, default=THRESHOLD)
    ap.add_argument("--no-semantic", action="store_true", help="run the shingle pass only")
    a = ap.parse_args()

    paths = a.papers or sorted(glob.glob(os.path.join(a.data_dir, "*.json")))
    if not paths:
        print("0 papers found.")
        return 0
    source = extract_source()
    samples = [p for k, p in source if k == "sample"]
    if not samples:
        die("no sample-paper text under source/samples/ to compare against")
    papers = load_papers(paths)
    failures = shingle_pass(papers, samples)
    if a.no_semantic:
        print("semantic pass skipped (--no-semantic)")
    else:
        semantic_pass(papers, samples, a.cache_dir, a.threshold)
    if failures:
        print("FAILED: %d shingle failure(s). Rewrite the text; do not lift the school's wording." % len(failures))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
