#!/usr/bin/env python3
"""Age-appropriateness gate (instruction.md section 6.5), as numbers. Run on every paper, hard items included:

    python3 scripts/readability.py [paper.json ...]          (default: app/data/*.json)

Per authored passage / poem stimulus: words, sentences, AVERAGE and LONGEST sentence, and words of more than 3
syllables that are neither in the chapter's own text nor glossed in a question. Per item `q`: stems that ask about
theme, moral, author or poet intent, irony, or "why do you think". Also prints the easy/medium/hard mix.

Exit 1 when a paper has: an average sentence length over 12 words, any sentence over 20 words, a stem flag, or an
unglossed long word. These are NOT a substitute for a human reading every question (the walkthrough says so).
"""
import argparse
import glob
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from similarity import ROOT, TEXT_CACHE, extract_source, tokens  # noqa: E402  (shared extraction and word rule)

AVG_MAX, SENT_MAX, SYLLABLE_MAX = 12, 20, 3

# Question stems beyond Class 4 (instruction.md 6.5): motive, irony, theme, author intent.
STEM_FLAGS = [
    r"\btheme\b", r"\bmoral\b", r"\bauthor\b", r"\bpoet\b", r"\bwriter\b", r"\birony\b", r"\bironic\b",
    r"\bsymbol(?:ism|ise|ize|ic|s)?\b", r"\bfigurative\b", r"\bmetaphor\b", r"\bsimile\b", r"\bintention\b",
    r"\bwhy do you think\b", r"\bmessage of the (?:poem|story|chapter|lesson)\b", r"\bpurpose of the (?:poem|story|writer|author)\b",
]
STEM_RE = re.compile("|".join(STEM_FLAGS), re.I)


def syllables(word):
    """Heuristic vowel-group count (good enough to flag > 3; a human still reads every word)."""
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 0
    if len(w) <= 3:
        return 1
    w = re.sub(r"(?:[^laeiouy]es|ed|[^laeiouy]e)$", "", w)
    w = re.sub(r"^y", "", w)
    return max(1, len(re.findall(r"[aeiouy]{1,2}", w)))


def sentences(text, kind):
    """A poem is measured line by line; prose splits at . ! ? unless a lower-case speech tag follows."""
    if kind == "poem":
        units = text.split("\n")
    else:
        units = re.split(r"(?<=[.!?])[\"”’')]*\s+(?=[A-Z“\"‘'(0-9])|\n+", text)
    return [u.strip() for u in units if tokens(u)]


def load_card():
    r = subprocess.run(["node", "-e", "console.log(JSON.stringify(require('./scripts/lib/card').loadCard('PROJECT-CARD.yml')))"],
                       capture_output=True, text=True, cwd=ROOT)
    if r.returncode != 0:
        print("ERROR: cannot read PROJECT-CARD.yml: " + r.stderr.strip()[:200], file=sys.stderr)
        sys.exit(2)
    return json.loads(r.stdout)


_chapter_cache = {}


def chapter_words(chapter, card):
    """Words of the chapter's own extracted text (the mock, chapter null, may use any chapter's words)."""
    key = chapter
    if key not in _chapter_cache:
        if chapter is None:
            files = [c["file"] for c in card.get("chapter_list", [])]
        else:
            files = [card["chapter_list"][chapter - 1]["file"]]
        words = set()
        for f in files:
            path = os.path.join(TEXT_CACHE, f + ".txt")
            if os.path.exists(path):
                with open(path, encoding="utf-8", errors="ignore") as fh:
                    words |= set(tokens(fh.read()))
        _chapter_cache[key] = words
    return _chapter_cache[key]


def glossed(word, block):
    for it in block.get("items", []):
        q = it.get("q") or ""
        if word in tokens(q) and ("(" in q or "means" in q.lower() or "“" in q):
            return True
    return False


def pct(n, d):
    return int(round(100.0 * n / d)) if d else 0


def analyse(path, card):
    with open(path, encoding="utf-8") as f:
        paper = json.load(f)
    chapter = paper.get("chapter")
    known = chapter_words(chapter, card)
    override = (card.get("paper_overrides") or {}).get("ch%s" % chapter) if chapter else None
    label = ("mock" if chapter is None else "ch%s" % chapter) + (", thin-poem" if override else "")
    lines, problems, n_items = [], [], 0
    mix_items, mix_marks = {"easy": 0, "medium": 0, "hard": 0}, {"easy": 0, "medium": 0, "hard": 0}
    stem_flags = 0
    for s in paper.get("sections", []):
        for b in s.get("blocks", []):
            st = b.get("stimulus")
            if isinstance(st, dict) and st.get("kind") in ("passage", "poem") and st.get("text"):
                sents = sentences(st["text"], st["kind"])
                lens = [len(tokens(x)) for x in sents]
                words = sum(lens)
                avg = (float(words) / len(lens)) if lens else 0.0
                longest = max(lens) if lens else 0
                longw = sorted({w for w in tokens(st["text"]) if w.isalpha() and syllables(w) > SYLLABLE_MAX and w not in known and not glossed(w, b)})
                lines.append("  %s %-7s words %d  sentences %d  avg %.1f  max %d  long words: %s"
                             % (b.get("num"), st["kind"], words, len(lens), avg, longest, ", ".join(longw) if longw else "none"))
                if avg > AVG_MAX:
                    problems.append("%s: average sentence length %.1f > %d" % (b.get("num"), avg, AVG_MAX))
                if longest > SENT_MAX:
                    problems.append("%s: a sentence of %d words > %d" % (b.get("num"), longest, SENT_MAX))
                for w in longw:
                    problems.append("%s: '%s' has more than %d syllables, is not in the chapter and is not glossed" % (b.get("num"), w, SYLLABLE_MAX))
            for it in b.get("items", []):
                n_items += 1
                d = it.get("difficulty")
                if d in mix_items:
                    mix_items[d] += 1
                    mix_marks[d] += it.get("marks") or 0
                m = STEM_RE.search(it.get("q") or "")
                if m:
                    stem_flags += 1
                    problems.append("%s: stem flag \"%s\" (theme, moral, author or poet intent, irony or motive is above Class 4): %s"
                                    % (it.get("id"), m.group(0).lower(), (it.get("q") or "")[:60]))
    total_marks = sum(mix_marks.values())
    out = ["%s [%s] %d items" % (os.path.basename(path), label, n_items)] + lines
    out.append("  stems: %d flagged" % stem_flags)
    out.append("  difficulty  items: easy %d%% medium %d%% hard %d%%  |  marks: easy %d%% medium %d%% hard %d%%"
               % (pct(mix_items["easy"], n_items), pct(mix_items["medium"], n_items), pct(mix_items["hard"], n_items),
                  pct(mix_marks["easy"], total_marks), pct(mix_marks["medium"], total_marks), pct(mix_marks["hard"], total_marks)))
    out.append("  RESULT " + ("FAIL" if problems else "PASS"))
    for p in problems:
        out.append("    - " + p)
    return out, bool(problems)


def main():
    ap = argparse.ArgumentParser(description="Age-appropriateness numbers for papers (instruction.md 6.5).")
    ap.add_argument("papers", nargs="*")
    ap.add_argument("--data-dir", default=os.path.join(ROOT, "app", "data"))
    a = ap.parse_args()
    paths = a.papers or sorted(glob.glob(os.path.join(a.data_dir, "*.json")))
    if not paths:
        print("0 papers found.")
        return 0
    extract_source()                                   # makes sure the chapter text cache exists
    card = load_card()
    failed = False
    for p in paths:
        lines, bad = analyse(p, card)
        print("\n".join(lines))
        failed = failed or bad
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
