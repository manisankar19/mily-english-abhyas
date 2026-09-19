#!/usr/bin/env node
'use strict';
// Zero-dependency paper validator for mily-english-abhyas.
// BLUEPRINT.md §5.7's ten checks + instruction.md §6 (original passages, rubrics, acceptable answers, notation)
// + prd.md §3.6 / §9 (per-paper section profiles, thin-poem difficulty floor and chapterSource ledger, mock allocation).
// Adapted from ../mily-maths-abhyas/validate.js: same skeleton (collect ALL errors, PASS/FAIL per file, exit 1),
// but every expectation (sections, marks, chapters, mock allocation) is read from PROJECT-CARD.yml, not hard-coded.
//
//   node validate.js [files…]              default: app/data/*.json  ("0 papers found." and exit 0 when there are none)
//   --strict                               also require every paper the card implies (ch1…chN + extra papers)
//   --skip-source-check                    skip check SOURCE_WINDOW. For builds where source/ is not present (e.g. Vercel);
//                                          the default is to run it, and to fail loudly if source text cannot be extracted.
//   --data-dir <dir>  --card <file>        override the paper directory / project card (used by the test harness)
// Every error is printed as  [CODE] message  so fixtures can assert the NAMED error.
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { loadCard } = require('./scripts/lib/card');

const ROOT = __dirname;
const SUPPORTED_SCHEMA_VERSIONS = ['2.0'];
const ITEM_MIN = 45, ITEM_MAX = 60, MARKS_MAX = 5, WINDOW = 10;
const TYPES = ['mcq', 'multi-select', 'true-false', 'fill-blank', 'match', 'one-word', 'short', 'long', 'diagram-label', 'draw', 'handwriting', 'activity'];
const STIMULUS_KINDS = ['passage', 'poem', 'table', 'figure', 'data'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];
const JUDGEMENT_TYPES = ['long', 'handwriting', 'activity', 'draw'];
const GENERAL_TAGS = ['general-unseen', 'general-sample-only'];
const REQUIRED_TOP = ['schemaVersion', 'subject', 'subjectDisplay', 'grade', 'locale', 'numerals', 'title', 'subtitle', 'sourceRef', 'totalMarks', 'durationMinutes', 'sections'];
const PLACEHOLDER_RE = /\b(TODO|TBD|lorem)\b/i;
const EMPTY_BRACKET_RE = /\[\s*\]|\{\s*\}/;
const EXACT_BLANK_RE = /(?<!_)_{5}(?!_)/g;

// ---- source text (check SOURCE_WINDOW) -----------------------------------------------------------------------------
// Words = letters/digits with internal apostrophes; curly quotes folded to straight. scripts/similarity.py uses the same rule.
function normaliseTokens(text) {
  return (String(text).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').toLowerCase().match(/[a-z0-9]+(?:'[a-z0-9]+)*/g)) || [];
}

function walkFiles(dir, out) {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.')) continue;                       // .gitkeep, .text-cache, dotfiles
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walkFiles(full, out); else out.push(full);
  }
  return out;
}

// Extract the text of every file under source/ once into source/.text-cache/<name>.txt (shared with scripts/similarity.py).
function ensureSourceCache(root) {
  const src = path.join(root, 'source');
  if (!fs.existsSync(src)) throw new Error('SOURCE_CACHE: source/ directory not found (use --skip-source-check only where source/ is intentionally absent)');
  const cache = path.join(src, '.text-cache');
  fs.mkdirSync(cache, { recursive: true });
  let count = 0;
  const notes = [];
  for (const f of walkFiles(src, [])) {
    const rel = path.relative(root, f);
    if (path.basename(f) === 'INTAKE.md') continue;             // our own generated notes, not source material
    const ext = path.extname(f).toLowerCase();
    const out = path.join(cache, path.basename(f, path.extname(f)) + '.txt');
    if (ext === '.pdf') {
      if (!fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(f).mtimeMs) {
        const r = cp.spawnSync('pdftotext', [f, out], { encoding: 'utf8' });
        if (r.error || r.status !== 0) throw new Error(`SOURCE_CACHE: pdftotext failed for ${rel}: ${r.error ? r.error.message : r.stderr}`);
      }
      count++;
    } else if (ext === '.txt' || ext === '.md') {
      fs.copyFileSync(f, out); count++;
    } else notes.push(`unsupported source file type not checked: ${rel}`);
  }
  if (count === 0) throw new Error('SOURCE_CACHE: no extractable files under source/');
  return { cache, notes };
}

function loadSourceWindows(ctx) {
  if (ctx._windows) return ctx._windows;
  const { cache, notes } = ensureSourceCache(ctx.root);
  notes.forEach((n) => ctx.notes.push(n));
  const set = new Set();
  for (const f of fs.readdirSync(cache).filter((x) => x.endsWith('.txt'))) {
    const toks = normaliseTokens(fs.readFileSync(path.join(cache, f), 'utf8'));
    for (let i = 0; i + WINDOW <= toks.length; i++) set.add(toks.slice(i, i + WINDOW).join(' '));
  }
  ctx._windows = set;
  return set;
}

function findSourceWindow(text, ctx) {
  const set = loadSourceWindows(ctx);
  const toks = normaliseTokens(text);
  for (let i = 0; i + WINDOW <= toks.length; i++) {
    const w = toks.slice(i, i + WINDOW);
    if (set.has(w.join(' '))) return w.slice(0, 6).join(' ') + ' …';
  }
  return null;
}

function makeContext(opts) {
  const root = opts.root || ROOT;
  const card = loadCard(opts.cardPath || path.join(root, 'PROJECT-CARD.yml'));
  return { root, appDir: path.join(root, 'app'), dataDir: path.resolve(opts.dataDir || path.join(root, 'app', 'data')), card, skipSource: !!opts.skipSource, notes: [], _windows: null };
}

// ---- helpers ---------------------------------------------------------------------------------------------------------
function collectStrings(node, out, p) {
  if (typeof node === 'string') out.push({ s: node, p });
  else if (Array.isArray(node)) node.forEach((n, i) => collectStrings(n, out, `${p}[${i}]`));
  else if (node && typeof node === 'object') Object.entries(node).forEach(([k, v]) => collectStrings(v, out, p ? `${p}.${k}` : k));
}
const nonEmpty = (v) => (typeof v === 'string' ? v.trim() !== '' : Array.isArray(v) ? v.length > 0 : (v && typeof v === 'object') ? Object.keys(v).length > 0 : false);
const ci = (s) => String(s).trim().toLowerCase();
const snippet = (s) => (String(s).length > 60 ? String(s).slice(0, 57) + '…' : String(s));

// ---- one paper -------------------------------------------------------------------------------------------------------------
function validatePaperObject(paper, ctx, opts) {
  const card = ctx.card;
  const errors = [];
  const err = (code, msg) => errors.push({ code, msg });

  for (const f of REQUIRED_TOP) if (paper[f] === undefined || paper[f] === null || paper[f] === '') err('TOP_FIELD', `missing required top-level field: ${f}`);
  if (!SUPPORTED_SCHEMA_VERSIONS.includes(paper.schemaVersion)) err('SCHEMA_VERSION', `unrecognised schemaVersion ${JSON.stringify(paper.schemaVersion)}`);
  const same = (field, want) => { if (paper[field] !== undefined && paper[field] !== want) err('CARD_MISMATCH', `${field} is ${JSON.stringify(paper[field])}, the card says ${JSON.stringify(want)}`); };
  same('subject', card.subject_code); same('subjectDisplay', card.subject_display); same('grade', card.grade);
  same('locale', card.locale); same('numerals', card.numerals); same('durationMinutes', card.duration_minutes);

  // Which paper is this?  chapter N, or the mock (chapter: null + paperCode)
  const isMock = paper.chapter === null;
  let chapter = null, blueprint = card.section_blueprint, override = null;
  if (isMock) {
    const extra = (card.extra_papers || []).find((e) => e.code === paper.paperCode);
    if (!extra) err('MOCK_META', `mock paper (chapter: null) needs a paperCode from the card's extra_papers, got ${JSON.stringify(paper.paperCode)}`);
    else if (paper.title !== extra.title) err('TITLE_MISMATCH', `title ${JSON.stringify(paper.title)} != card title ${JSON.stringify(extra.title)}`);
  } else if (Number.isInteger(paper.chapter) && paper.chapter >= 1 && paper.chapter <= card.chapters) {
    chapter = paper.chapter;
    const want = (card.chapter_list || [])[chapter - 1];
    if (want && paper.title !== want.title) err('TITLE_MISMATCH', `title ${JSON.stringify(paper.title)} != chapter ${chapter} title ${JSON.stringify(want.title)}`);
    override = (card.paper_overrides || {})[`ch${chapter}`] || null;
    if (override) blueprint = override.section_blueprint;
  } else err('CHAPTER', `chapter must be an integer 1-${card.chapters}, or null for the mock; got ${JSON.stringify(paper.chapter)}`);

  if (opts && opts.file && path.dirname(path.resolve(opts.file)) === ctx.dataDir && (isMock ? paper.paperCode : chapter)) {
    const want = isMock ? `${card.subject_code}-${paper.paperCode}.json` : `${card.subject_code}-ch${chapter}.json`;
    if (path.basename(opts.file) !== want) err('FILE_NAME', `file is ${path.basename(opts.file)}, expected ${want}`);
  }

  const sections = Array.isArray(paper.sections) ? paper.sections : [];
  if (sections.length !== blueprint.length) err('SECTION_PROFILE', `paper has ${sections.length} sections, the profile has ${blueprint.length}`);
  const idRe = new RegExp(`^${card.subject_code}-c(\\d+|hy)-s(\\d+)-b(\\d+)-i(\\d+)$`);
  const chapterToken = isMock ? 'hy' : String(chapter);
  const seenIds = new Set();
  const allItems = [];
  let total = 0, invalidSources = 0;
  const skipSource = ctx.skipSource;
  if (skipSource && !ctx.notes.includes('SOURCE_WINDOW check skipped (--skip-source-check)')) ctx.notes.push('SOURCE_WINDOW check skipped (--skip-source-check)');

  function checkStimulus(stim, label) {
    if (!stim || typeof stim !== 'object') return;
    if (!STIMULUS_KINDS.includes(stim.kind)) err('STIMULUS_KIND', `${label}: unknown stimulus.kind ${JSON.stringify(stim.kind)}`);
    if (stim.kind === 'passage' || stim.kind === 'poem') {
      if (!nonEmpty(stim.text)) err('STIMULUS_KIND', `${label}: ${stim.kind} stimulus has no text`);
      if (typeof stim.original !== 'boolean') err('ORIGINAL_REQUIRED', `${label}: ${stim.kind} stimulus must set original true/false`);
      else if (stim.kind === 'passage' && stim.original === false) err('ORIGINAL_REQUIRED', `${label}: an unseen or copy passage must be original (instruction.md 6.1)`);
      else if (stim.kind === 'poem' && stim.original === false && !nonEmpty(stim.sourceRef)) err('SOURCE_REF', `${label}: a non-original poem needs a public-domain sourceRef`);
      if (stim.original === true && nonEmpty(stim.text) && !skipSource) {
        const hit = findSourceWindow(stim.text, ctx);
        if (hit) err('SOURCE_WINDOW', `${label}: a ${WINDOW}-word window also occurs in the source material ("${hit}")`);
      }
    }
    if (stim.asset) {
      if (!fs.existsSync(path.join(ctx.appDir, stim.asset))) err('ASSET_MISSING', `${label}: referenced asset not found: ${stim.asset}`);
      if (!nonEmpty(stim.caption)) err('ASSET_CAPTION', `${label}: an asset must carry a text caption`);
    } else if (stim.kind === 'figure') err('ASSET_MISSING', `${label}: figure stimulus has no asset`);
  }

  sections.forEach((section, si) => {
    const exp = blueprint[si];
    if (exp) {
      if (section.code !== exp.code) err('SECTION_PROFILE', `section ${si + 1}: code ${JSON.stringify(section.code)}, profile says ${exp.code}`);
      if (section.title !== exp.title) err('SECTION_PROFILE', `section ${section.code}: title ${JSON.stringify(section.title)}, profile says ${JSON.stringify(exp.title)}`);
      if (section.marks !== exp.marks) err('SECTION_PROFILE', `section ${section.code}: declared ${section.marks} marks, profile says ${exp.marks}`);
    }
    const isCreative = (exp ? exp.title : section.title) === 'Creative Writing';
    let sectionSum = 0;
    const blocks = Array.isArray(section.blocks) ? section.blocks : [];
    blocks.forEach((block) => {
      if (!nonEmpty(block.num)) err('BLOCK_FIELDS', `section ${section.code}: a block has no num`);
      if (!nonEmpty(block.instruction)) err('BLOCK_FIELDS', `block ${block.num}: missing instruction`);
      checkStimulus(block.stimulus, `Block ${block.num}`);
      const items = Array.isArray(block.items) ? block.items : [];
      if (items.some((i) => i && i.type === 'true-false') && !/true or false/i.test(block.instruction || '')) {
        err('TF_INSTRUCTION', `block ${block.num}: has true-false items but the instruction does not say "True or False"`);
      }
      for (const item of items) {
        allItems.push(item);
        const id = item.id;
        const L = `Item ${id || '(no id)'}`;
        checkStimulus(item.stimulus, L);
        if (!id) err('ID_PATTERN', `item in block ${block.num}: missing id`);
        else {
          if (seenIds.has(id)) err('DUP_ID', `duplicate item id: ${id}`);
          seenIds.add(id);
          const m = idRe.exec(id);
          if (!m) err('ID_PATTERN', `${L}: id does not match ${card.subject_code}-c{chapter}-s{section}-b{block}-i{item}`);
          else {
            if (m[1] !== chapterToken) err('ID_PATTERN', `${L}: chapter token c${m[1]} but this paper is c${chapterToken}`);
            if (parseInt(m[2], 10) !== si + 1) err('ID_PATTERN', `${L}: section number s${m[2]} but the item sits in section ${si + 1}`);
          }
        }
        if (!nonEmpty(item.q)) err('ITEM_FIELDS', `${L}: missing/empty q`);
        if (!nonEmpty(item.answer)) err('ITEM_FIELDS', `${L}: missing/empty answer`);
        if (!DIFFICULTIES.includes(item.difficulty)) err('DIFFICULTY', `${L}: missing/invalid difficulty (easy, medium or hard)`);
        if (!TYPES.includes(item.type)) err('TYPE', `${L}: unknown type ${JSON.stringify(item.type)}`);

        if (!Number.isInteger(item.marks) || item.marks < 1 || item.marks > MARKS_MAX) err('MARKS_RANGE', `${L}: marks must be an integer 1-${MARKS_MAX}, got ${JSON.stringify(item.marks)}`);
        else {
          sectionSum += item.marks; total += item.marks;
          if (item.marks > 1 && !nonEmpty(item.answerPoints) && !nonEmpty(item.markingGuide)) err('MARKS_GUIDE', `${L}: ${item.marks} marks but no answerPoints or markingGuide`);
          if (Array.isArray(item.answerPoints) && item.answerPoints.length) {
            const sum = item.answerPoints.reduce((a, p) => a + (p && p.marks || 0), 0);
            if (sum !== item.marks) err('ANSWER_POINTS_SUM', `${L}: answerPoints sum to ${sum}, the item is worth ${item.marks}`);
          }
        }

        if (item.type === 'mcq' || item.type === 'multi-select') {
          if (!Array.isArray(item.options) || item.options.length < 3 || item.options.length > 4) err('MCQ_OPTIONS', `${L}: needs 3-4 options`);
          else if (item.type === 'mcq' && !item.options.includes(item.answer)) err('MCQ_ANSWER', `${L}: answer is not one of the options`);
          else if (item.type === 'multi-select' && !(Array.isArray(item.answer) && item.answer.length && item.answer.every((a) => item.options.includes(a)))) err('MCQ_ANSWER', `${L}: every answer must be one of the options`);
        }
        if (item.type === 'match' && !(Array.isArray(item.pairs) && item.pairs.length >= 2 && item.pairs.every((p) => p && nonEmpty(p.left) && nonEmpty(p.right)))) err('MATCH_PAIRS', `${L}: match items need pairs [{left,right}] (at least 2)`);
        if (item.type === 'true-false' && !/^(True|False)\b/.test(String(item.answer))) err('TF_ANSWER', `${L}: answer must start with True or False`);

        if (item.type === 'fill-blank' || item.type === 'one-word') {
          const acc = item.acceptable;
          if (!Array.isArray(acc) || acc.length === 0) err('ACCEPTABLE_MISSING', `${L}: ${item.type} needs an acceptable list`);
          else if (Array.isArray(item.answer)) {
            const ok = acc.length === item.answer.length && acc.every((a, i) => Array.isArray(a) && a.some((x) => ci(x) === ci(item.answer[i])));
            if (!ok) err('ACCEPTABLE_ANSWER', `${L}: for a multi-blank item, acceptable must be one list per blank, each containing that blank's answer`);
          } else if (!acc.some((x) => typeof x === 'string' && ci(x) === ci(item.answer))) err('ACCEPTABLE_ANSWER', `${L}: acceptable must include the primary answer`);
        }
        if (item.type === 'fill-blank' && nonEmpty(item.q)) {
          const found = (String(item.q).match(EXACT_BLANK_RE) || []).length;
          if (found === 0) err('FILL_BLANK_NO_BLANK', `${L}: q has no blank of exactly five underscores`);
          else if (Number.isInteger(item.blanks) && item.blanks !== found) err('BLANKS_COUNT', `${L}: blanks is ${item.blanks} but q has ${found} blank(s)`);
        }
        if (JUDGEMENT_TYPES.includes(item.type) || isCreative) {
          const g = item.markingGuide;
          if (typeof g !== 'string' || g.trim().length < 40 || !/\d/.test(g)) err('JUDGEMENT_GUIDE', `${L}: a judgement item needs a markingGuide of at least 40 characters that contains a digit (a band rubric)`);
        }

        if (override && override.require_chapter_source) {
          const src = item.chapterSource;
          if (section.code === 'A') { if (src !== 'original-A1' && src !== 'original-A2') err('CHAPTER_SOURCE', `${L}: Section A items must say original-A1 or original-A2`); }
          else if (!nonEmpty(src)) err('CHAPTER_SOURCE', `${L}: chapterSource (the place in the chapter this draws on) is required`);
        }
        if (isMock) {
          const s = item.sourceChapter;
          if (!(Number.isInteger(s) && s >= 1 && s <= card.chapters) && !GENERAL_TAGS.includes(s)) { invalidSources++; err('MOCK_SOURCE', `${L}: sourceChapter must be 1-${card.chapters} or one of ${GENERAL_TAGS.join(', ')}; got ${JSON.stringify(s)}`); }
        }
      }
    });
    if (typeof section.marks !== 'number') err('SECTION_SUM', `section ${section.code}: marks is not a number`);
    else if (section.marks !== sectionSum) err('SECTION_SUM', `section ${section.code}: declared ${section.marks} marks, items sum to ${sectionSum}`);
  });

  // paper total, item count
  if (paper.totalMarks !== card.total_marks) err('TOTAL_MISMATCH', `paper declares totalMarks ${paper.totalMarks}, the card requires ${card.total_marks}`);
  else if (total !== paper.totalMarks) err('TOTAL_MISMATCH', `items sum to ${total}, the paper declares ${paper.totalMarks}`);
  if (allItems.length < ITEM_MIN || allItems.length > ITEM_MAX) err('ITEM_COUNT', `paper has ${allItems.length} items, expected ${ITEM_MIN}-${ITEM_MAX}`);

  // thin-poem profile: difficulty floor and cap
  if (override && override.hard_floor_pct !== undefined) {
    const hard = allItems.filter((i) => i.difficulty === 'hard').length;
    const pct = allItems.length ? (100 * hard) / allItems.length : 0;
    if (pct < override.hard_floor_pct) err('HARD_FLOOR', `${hard} of ${allItems.length} items are hard (${pct.toFixed(1)} %), the floor is ${override.hard_floor_pct} %`);
    if (override.hard_cap_pct !== undefined && pct > override.hard_cap_pct) err('HARD_CAP', `${hard} of ${allItems.length} items are hard (${pct.toFixed(1)} %), the cap is ${override.hard_cap_pct} %`);
  }

  // mock: marks by sourceChapter must equal the card's allocation
  if (isMock && !invalidSources && card.mock_allocation) {
    const a = card.mock_allocation;
    const got = {};
    for (const i of allItems) if (Number.isInteger(i.marks)) got[i.sourceChapter] = (got[i.sourceChapter] || 0) + i.marks;
    const want = { ...a.chapters, 'general-unseen': a.general_unseen, 'general-sample-only': a.general_sample_only };
    for (const k of Object.keys(want)) if ((got[k] || 0) !== want[k]) err('MOCK_ALLOCATION', `sourceChapter ${k}: ${got[k] || 0} marks, the card allocates ${want[k]}`);
  }

  // whole-document notation and placeholder scan
  const strings = [];
  collectStrings(paper, strings, '');
  for (const { s, p } of strings) {
    if (PLACEHOLDER_RE.test(s)) err('PLACEHOLDER', `placeholder text: "${snippet(s)}"`);
    if (EMPTY_BRACKET_RE.test(s)) err('PLACEHOLDER', `empty-bracket placeholder: "${snippet(s)}"`);
    if (/["']/.test(s)) err('STRAIGHT_QUOTE', `straight quote in content (use “ ” ‘ ’): "${snippet(s)}"`);
    if (/\.(id|asset)$/.test(p)) continue;                    // identifiers and asset paths are not content: an ill-formed id is ID_PATTERN's job
    for (const run of (s.match(/_+/g) || [])) if (run.length !== 5) { err('BLANK_LEN', `a blank must be exactly five underscores, found ${run.length}: "${snippet(s)}"`); break; }
  }
  return errors;
}

function validatePaperFile(filePath, ctx) {
  let paper;
  try { paper = JSON.parse(fs.readFileSync(filePath, 'utf8')); }
  catch (e) { return { file: filePath, errors: [{ code: 'JSON_INVALID', msg: `invalid JSON: ${e.message}` }] }; }
  return { file: filePath, errors: validatePaperObject(paper, ctx, { file: filePath }) };
}

// ---- CLI ----------------------------------------------------------------------------------------------------------------------------
function parseArgs(argv) {
  const o = { files: [], strict: false, skipSource: false, dataDir: null, cardPath: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--strict') o.strict = true;
    else if (a === '--skip-source-check') o.skipSource = true;
    else if (a === '--data-dir') o.dataDir = argv[++i];
    else if (a === '--card') o.cardPath = argv[++i];
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else o.files.push(a);
  }
  return o;
}

function main() {
  let opts, ctx;
  try { opts = parseArgs(process.argv.slice(2)); ctx = makeContext(opts); }
  catch (e) { console.error(`ERROR: ${e.message}`); process.exit(2); }

  const dir = ctx.dataDir;
  let files = opts.files.length ? opts.files.map((f) => path.resolve(f))
    : (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => path.join(dir, f)).sort() : []);

  const globalErrors = [];
  if (opts.strict) {
    const want = [];
    for (let n = 1; n <= ctx.card.chapters; n++) want.push(`${ctx.card.subject_code}-ch${n}.json`);
    for (const e of ctx.card.extra_papers || []) want.push(`${ctx.card.subject_code}-${e.code}.json`);
    const have = new Set(files.map((f) => path.basename(f)));
    for (const w of want) if (!have.has(w)) globalErrors.push({ code: 'MISSING_PAPER', msg: `--strict: expected paper ${w} was not found` });
  }
  if (files.length === 0 && globalErrors.length === 0) { console.log('0 papers found.'); process.exit(0); }

  let anyErrors = globalErrors.length > 0;
  for (const file of files) {
    let result;
    try { result = validatePaperFile(file, ctx); }
    catch (e) { console.error(`ERROR: ${e.message}`); process.exit(2); }
    const rel = path.relative(process.cwd(), file);
    if (result.errors.length === 0) console.log(`PASS  ${rel}`);
    else { anyErrors = true; console.log(`FAIL  ${rel}`); for (const e of result.errors) console.log(`      - [${e.code}] ${e.msg}`); }
  }
  for (const e of globalErrors) console.log(`FAIL  [${e.code}] ${e.msg}`);
  for (const n of ctx.notes) console.log(`NOTE  ${n}`);
  console.log('');
  console.log(anyErrors ? `Validation FAILED (${files.length} paper(s) checked).` : `All ${files.length} paper(s) passed validation.`);
  process.exit(anyErrors ? 1 : 0);
}

module.exports = { makeContext, validatePaperFile, validatePaperObject, ensureSourceCache, normaliseTokens };
if (require.main === module) main();
