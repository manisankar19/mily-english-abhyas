#!/usr/bin/env node
'use strict';
// Proves validate.js against fixtures before any real paper relies on it (instruction.md §8).
//   fixtures/good/*.json   must validate with zero errors
//   fixtures/bad/*.json    a patch (`ops`) applied to a good base; must fail with the NAMED error code(s)
//                          `_expect` = the exact set of codes; `_expectAtLeast` = these codes must be present
// Also: CLI behaviour (0 papers, --strict, --skip-source-check, exit codes) and the card reader vs PyYAML.
// No textbook text is committed: the copied-passage fixture is built at run time from source/.text-cache/.
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const ROOT = path.join(__dirname, '..');
const V = require('../validate');
const { loadCard } = require('./lib/card');

let pass = 0, fail = 0;
const rows = [];
function record(ok, name, detail) {
  (ok ? pass++ : fail++);
  rows.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'validator-test-'));
process.on('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* best effort */ } });

// ---- patch machinery -------------------------------------------------------------------------------
function getParent(obj, p) {
  const parts = p.split('/'); let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) { cur = cur[parts[i]]; if (cur === undefined) throw new Error(`patch path not found: ${p}`); }
  return [cur, parts[parts.length - 1]];
}
function allItems(paper) { return paper.sections.flatMap((s) => s.blocks.flatMap((b) => b.items)); }
function applyOps(paper, ops, sourceWindow) {
  const replace = (v) => (typeof v === 'string' ? v.replace('{{SOURCE_WINDOW}}', sourceWindow) : v);
  for (const op of ops) {
    if (op.op === 'set') { const [par, k] = getParent(paper, op.path); par[k] = replace(op.value); }
    else if (op.op === 'delete') { const [par, k] = getParent(paper, op.path); if (Array.isArray(par)) par.splice(parseInt(k, 10), 1); else delete par[k]; }
    else if (op.op === 'setDifficulty') { let n = op.count; for (const it of allItems(paper)) { if (n > 0 && it.difficulty === op.from) { it.difficulty = op.to; n--; } } if (n > 0) throw new Error('setDifficulty: not enough items'); }
    else if (op.op === 'moveSourceChapter') { let n = op.count; for (const it of allItems(paper)) { if (n > 0 && it.sourceChapter === op.from) { it.sourceChapter = op.to; n--; } } if (n > 0) throw new Error('moveSourceChapter: not enough items'); }
    else throw new Error(`unknown op ${op.op}`);
  }
}

// ---- 0. card reader vs PyYAML ------------------------------------------------------------------------
try {
  const js = loadCard(path.join(ROOT, 'PROJECT-CARD.yml'));
  const r = cp.spawnSync('python3', ['-c', 'import yaml,json,sys;print(json.dumps(yaml.safe_load(open(sys.argv[1]))))', path.join(ROOT, 'PROJECT-CARD.yml')], { encoding: 'utf8' });
  if (r.status !== 0) rows.push('SKIP  card reader vs PyYAML — PyYAML not available (dev-time cross-check only)');
  else {
    const sortK = (x) => Array.isArray(x) ? x.map(sortK) : (x && typeof x === 'object') ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sortK(x[k])])) : x;
    record(JSON.stringify(sortK(js)) === JSON.stringify(sortK(JSON.parse(r.stdout))), 'card reader equals PyYAML on PROJECT-CARD.yml');
  }
} catch (e) { record(false, 'card reader', e.message); }

// ---- source cache + context --------------------------------------------------------------------------
let ctx, sourceWindow = '';
try {
  ctx = V.makeContext({});
  V.ensureSourceCache(ROOT);
  const toks = V.normaliseTokens(fs.readFileSync(path.join(ROOT, 'source', '.text-cache', 'desa102.txt'), 'utf8'));
  let start = 200;                                             // 12 tokens with no apostrophe (an apostrophe would trip STRAIGHT_QUOTE too)
  while (toks.slice(start, start + 12).some((t) => t.includes("'"))) start++;
  sourceWindow = toks.slice(start, start + 12).join(' ');
  record(toks.length > 500 && sourceWindow.split(' ').length === 12, 'source cache available; 12-word window taken at run time (not committed)');
} catch (e) { record(false, 'source cache / context', e.message); }

// ---- 1. good fixtures pass -------------------------------------------------------------------------------
const goodDir = path.join(__dirname, '..', 'fixtures', 'good');
const goodFiles = fs.existsSync(goodDir) ? fs.readdirSync(goodDir).filter((f) => f.endsWith('.json')).sort() : [];
record(goodFiles.length >= 3, `good fixtures present (${goodFiles.length})`, goodFiles.join(', '));
for (const f of goodFiles) {
  try {
    const res = V.validatePaperFile(path.join(goodDir, f), ctx);
    record(res.errors.length === 0, `good: ${f} validates clean`, res.errors.slice(0, 3).map((e) => `[${e.code}] ${e.msg}`).join(' | '));
  } catch (e) { record(false, `good: ${f}`, e.message); }
}

// ---- 2. bad fixtures fail with the named error --------------------------------------------------------
const badDir = path.join(__dirname, '..', 'fixtures', 'bad');
const badFiles = fs.existsSync(badDir) ? fs.readdirSync(badDir).filter((f) => f.endsWith('.json')).sort() : [];
record(badFiles.length >= 9, `bad fixtures present (${badFiles.length}; 9 required)`);
for (const f of badFiles) {
  try {
    const spec = JSON.parse(fs.readFileSync(path.join(badDir, f), 'utf8'));
    const paper = JSON.parse(fs.readFileSync(path.join(goodDir, spec._base + '.json'), 'utf8'));
    applyOps(paper, spec.ops, sourceWindow);
    const out = path.join(tmp, f.replace(/\.json$/, '') + '-' + spec._base + '.json');
    fs.writeFileSync(out, JSON.stringify(paper, null, 2));
    const res = V.validatePaperFile(out, ctx);
    const got = [...new Set(res.errors.map((e) => e.code))].sort();
    const exact = spec._expect ? [...spec._expect].sort() : null;
    const atLeast = spec._expectAtLeast || null;
    const ok = exact ? JSON.stringify(got) === JSON.stringify(exact) : atLeast.every((c) => got.includes(c));
    record(ok, `bad: ${f.replace('.json', '')}`, `expected ${exact ? '{' + exact.join(',') + '}' : '⊇{' + atLeast.join(',') + '}'} got {${got.join(',')}}`);
  } catch (e) { record(false, `bad: ${f}`, e.message); }
}

// ---- 3. CLI behaviour ----------------------------------------------------------------------------------------
function cli(args) { return cp.spawnSync('node', [path.join(ROOT, 'validate.js'), ...args], { encoding: 'utf8', cwd: ROOT }); }
const emptyDir = fs.mkdtempSync(path.join(tmp, 'empty-'));
let r = cli(['--data-dir', emptyDir]);
record(r.status === 0 && /0 papers found\./.test(r.stdout), 'CLI: no papers → "0 papers found." and exit 0', `exit ${r.status}`);
r = cli(['--strict', '--data-dir', emptyDir]);
record(r.status === 1 && /MISSING_PAPER/.test(r.stdout), 'CLI: --strict with no papers → exit 1 naming MISSING_PAPER', `exit ${r.status}`);
r = cli([path.join(goodDir, 'standard-ch2.json')]);
record(r.status === 0 && /PASS/.test(r.stdout), 'CLI: a good fixture → PASS, exit 0', `exit ${r.status}`);
const badTotal = path.join(tmp, '01-wrong-total-standard-ch2.json');
r = cli([badTotal]);
record(r.status === 1 && /\[TOTAL_MISMATCH\]/.test(r.stdout), 'CLI: a bad fixture → FAIL, exit 1, error code printed', `exit ${r.status}`);
const copied = fs.readdirSync(tmp).find((f) => f.startsWith('04-copied-passage'));
r = cli(['--skip-source-check', path.join(tmp, copied)]);
record(r.status === 0 && /skip/i.test(r.stdout), 'CLI: --skip-source-check turns the copied-passage check off, and says so', `exit ${r.status}`);
r = cli(['--card', path.join(tmp, 'no-such-card.yml'), path.join(goodDir, 'standard-ch2.json')]);
record(r.status !== 0, 'CLI: an unreadable card fails loudly', `exit ${r.status}`);

// ---- report ------------------------------------------------------------------------------------------------------
console.log(rows.join('\n'));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
