#!/usr/bin/env node
'use strict';
/* mily-english-abhyas — acceptance test (sprints/v2/instruction.md §10: checks 7–26, X1–X5).
 *
 *   node scripts/e2e.js --url <url> [--out <dir>] [--browser chromium] [--only 7,8,X1]
 *   node scripts/e2e.js                     local: serves dist/ with scripts/serve.js
 *   node scripts/e2e.js --url <url> --negative   runs the negative controls on scratch copies
 *
 * Every expectation comes from the SERVED page's embedded JSON (#papersData, #uiStrings,
 * #assetsData), never from app/data, so a live run tests what is deployed.
 *
 * The marking code comes from process.env.GANESH_ENGLISH only (this script never reads .env.local).
 * It is held in memory, typed into the gate, and redacted from every printed line, the log and
 * report.json. At the end the output directory is searched for it and the run fails if found.
 * No tracing, no video, no screenshot while the gate is open.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SECRET_ENV = 'GANESH_ENGLISH';
const MIN_CONTRAST = 4.5;
const FUNC_VIEWPORT = { width: 1200, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const SECTION_PROFILE = { ch1: 5, ch4: 5 }; // brief §10 X3: five for Ch 1 and 4, seven for the others

/* ==================== output & redaction ==================== */

const redactValues = [];
function addRedaction(v) {
  if (typeof v !== 'string') return;
  for (const x of [v, v.trim()]) if (x && !redactValues.includes(x)) redactValues.push(x);
  redactValues.sort((a, b) => b.length - a.length);
}
function redact(text) {
  let s = String(text);
  for (const v of redactValues) s = s.split(v).join('[REDACTED]');
  return s;
}
let logFile = null;
function say(line) {
  const s = redact(line);
  process.stdout.write(s + '\n');
  if (logFile) fs.appendFileSync(logFile, s + '\n');
}
const errText = (e) => redact((e && (e.message || String(e))) || String(e)).split('\n')[0];
process.on('unhandledRejection', (e) => { process.stderr.write('ERROR (unhandled): ' + errText(e) + '\n'); process.exitCode = 1; });

/* ==================== checks ==================== */

const TITLES = {
  7: 'questions/stimuli render; no hidden text or naming attributes in practice DOM',
  8: 'no reveal, marks, score bar, result or clear control reachable in practice',
  9: 'practice banner shows',
  10: 'gate opens; Escape, cancel, backdrop close it without unlocking',
  11: 'wrong code: error, field cleared, dialog open, nothing unlocked',
  12: 'correct code (from env, never printed) reveals checking UI',
  13: 'per-question reveal/hide shows the data\'s answer (sampled types)',
  14: 'show-all reveals everything; again hides',
  15: 'full marks on every item = totalMarks for every paper, each section full',
  16: 'mixed seeded marking: result rows, total, percentage, grade recomputed',
  17: 'toggling off hides answers, marks, panels and captions',
  18: 'back, home, another paper, result-home, reload, logout return to practice',
  19: 'marks entered while unlocked survive a reload',
  20: 'page source has no occurrence of the code',
  21: 'exactly one 64-hex string in source, = sha256(code)',
  22: 'build refuses unset/empty code and missing placeholder; control builds one file',
  23: 'print: content present; answers, rubric, captions, banner, marking UI absent; poems unsplit',
  24: 'no horizontal scroll at 390 px, light and dark; minimum contrast',
  25: 'no console errors/warnings or failed requests over the run',
  26: 'figures non-empty, no failed request, light stroke in dark mode',
  X1: 'without crypto.subtle the gate shows mode.insecure and unlocks nothing',
  X2: '(static, not a browser check) app/app.js names no chapterSource/sourceChapter/difficulty/skill',
  X3: 'paper view and result list the served sections (5 for ch1/ch4, 7 others)',
  X4: 'poem one line element per line; passage paragraphs; no sideways scroll',
  X5: 'checking mode shows rubric, mark split, Also accept; practice shows none',
};
const ORDER = ['7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', 'X1', 'X2', 'X3', 'X4', 'X5'];

class Check {
  constructor(id) { this.id = id; this.n = 0; this.fails = []; this.notes = []; this.na = null; }
  ok(cond, detail) { this.n++; if (!cond) this.fails.push(detail || 'failed'); return !!cond; }
  note(s) { this.notes.push(s); }
  status() { return this.fails.length ? 'FAIL' : (this.na && !this.n ? 'N/A' : (this.n ? 'PASS' : 'NOT RUN')); }
}

/* ==================== helpers ==================== */

const norm = (s) => String(s == null ? '' : s).normalize('NFKC').replace(/\s+/g, ' ').trim();
const squash = (s) => norm(String(s == null ? '' : s).normalize('NFKC').replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
  .replace(/[^\p{L}\p{N}\s.,:;'"!?()\-—–/]/gu, ' '));
const flat = (v) => Array.isArray(v) ? v.flatMap(flat) : (v == null ? [] : [String(v)]);
const short = (s, n = 70) => { const t = norm(s); return t.length > n ? t.slice(0, n) + '…' : t; };
const sel = (id) => '[data-item-id=' + JSON.stringify(String(id)) + ']';

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const seedOf = (s) => crypto.createHash('sha256').update(String(s)).digest().readUInt32LE(0);
const tpl = (ui, key, vars = {}) => String(ui[key] == null ? '' : ui[key]).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

function extractJson(html, id) {
  const re = new RegExp('<script type="application/json" id="' + id + '">([\\s\\S]*?)</script>');
  const m = re.exec(html);
  if (!m) throw new Error('served page has no #' + id);
  return JSON.parse(m[1]);
}

function items(paper) {
  const out = [];
  paper.sections.forEach((sec) => sec.blocks.forEach((b) => b.items.forEach((it) => out.push({ it, sec, b }))));
  return out;
}
function stimuli(paper) {
  const out = [];
  paper.sections.forEach((sec) => sec.blocks.forEach((b) => {
    if (b.stimulus) out.push(b.stimulus);
    b.items.forEach((it) => { if (it.stimulus) out.push(it.stimulus); });
  }));
  return out;
}

/* Strings that must never reach the practice DOM: answers, mark-split points, marking guides,
   acceptable variants, captions, sourceRefs, chapterSource — 12+ chars and not also shown text. */
function secretStrings(paper) {
  const allowed = [paper.title, paper.subtitle];
  const secret = [...flat(paper.sourceRef)];
  const seeStim = (s) => {
    if (!s) return;
    allowed.push(s.text || '');
    secret.push(...flat(s.caption), ...flat(s.sourceRef));
  };
  paper.sections.forEach((sec) => {
    allowed.push(sec.title);
    sec.blocks.forEach((b) => {
      allowed.push(b.instruction || '');
      seeStim(b.stimulus);
      b.items.forEach((it) => {
        allowed.push(it.q || '', ...flat(it.options), ...(it.pairs || []).flatMap((p) => [p.left, p.right]));
        seeStim(it.stimulus);
        secret.push(...flat(it.answer), ...flat(it.acceptable), ...(it.answerPoints || []).map((p) => p.point),
          ...flat(it.markingGuide), ...flat(it.chapterSource), ...flat(typeof it.sourceChapter === 'string' ? it.sourceChapter : null));
      });
    });
  });
  const allowedText = norm(allowed.join('\n'));
  return [...new Set(secret.map(norm))].filter((s) => s.length >= 12 && !allowedText.includes(s));
}

function answerText(answer) {
  const f = (v) => (Array.isArray(v) ? v.map(f).join(' / ') : String(v));
  if (Array.isArray(answer)) return answer.map((a, i) => (i + 1) + '. ' + f(a)).join('\n');
  return answer == null ? '' : String(answer);
}
const gradeKey = (pct) => (pct >= 90 ? 'aplus' : pct >= 75 ? 'a' : pct >= 60 ? 'b' : pct >= 40 ? 'c' : 'd');

/* ---------- in-page probes (run in the browser) ---------- */

function probeState() {
  const vis = (e) => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
  const rv = document.getElementById('resultView');
  return {
    banner: vis(document.getElementById('practiceBanner')),
    bannerText: (document.getElementById('practiceBanner') || {}).textContent || '',
    on: document.getElementById('checkModeBtn').classList.contains('on'),
    answers: document.querySelectorAll('.answer').length,
    captions: document.querySelectorAll('.stimulus-caption').length,
    rubric: document.querySelectorAll('.ans-guide,.ans-points,.ans-accept,.ans-pairs').length,
    reachable: [...document.querySelectorAll('#revealAllBtn,#clearMarksBtn,#scoreBar,#resultBtn,.item-tools,.ans-btn,.marks-row,.mk')]
      .filter(vis).map((e) => e.id || e.className).slice(0, 4),
    result: vis(rv) && rv.textContent.trim().length > 0,
    marked: document.querySelectorAll('.mk.on').length,
  };
}
const isPractice = (s) => s.banner && !s.on && !s.answers && !s.captions && !s.rubric && !s.reachable.length && !s.result;

function probeDom() {
  const clone = document.body.cloneNode(true);
  clone.querySelectorAll('script,style,template').forEach((n) => n.remove());
  const attrs = [];
  const bad = [];
  document.body.querySelectorAll('*').forEach((e) => {
    if (e.closest('script,style')) return;
    for (const a of e.attributes) {
      if (a.name.startsWith('data-i18n')) continue;
      attrs.push(a.value);
      if (/^(data-|class$|aria-label$|title$)/.test(a.name) &&
        /answer|accept|difficulty|skill|chaptersource|sourcechapter|caption|markingguide|sourceref/i.test(a.name + '=' + a.value)) bad.push(a.name + '=' + a.value);
    }
  });
  return { text: clone.textContent, attrs: attrs.join('\n'), bad: [...new Set(bad)].slice(0, 5) };
}

function probeLayout() {
  const parse = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (e) => { for (let n = e; n; n = n.parentElement) { const c = parse(getComputedStyle(n).backgroundColor); if (c && c.a > 0.5) return c; } return { r: 255, g: 255, b: 255 }; };
  let min = 99; let where = '';
  document.querySelectorAll('#paperBody .item-text, #paperBody .stimulus-passage p, #paperBody .poem-line, #paperBody .block-inst, #paperBody ol.options li, #paperBody .section-head, #paperHead, #practiceBanner').forEach((e) => {
    if (!e.getClientRects().length) return;
    const fg = parse(getComputedStyle(e).color); if (!fg) return;
    const L1 = lum(fg); const L2 = lum(bgOf(e));
    const r = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    if (r < min) { min = r; where = e.className || e.id; }
  });
  const stimOver = [...document.querySelectorAll('#paperBody .stimulus-passage, #paperBody .stimulus-poem, #paperBody .stimulus-copy')]
    .filter((e) => e.scrollWidth > e.clientWidth + 1).length;
  return { over: document.documentElement.scrollWidth - document.documentElement.clientWidth, min, where, stimOver };
}

function probeStimuli() {
  const svgs = [...document.querySelectorAll('#paperBody .figure-scroll svg')];
  const lum = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c || ''); if (!m) return -1; const p = m[1].split(/[\s,/]+/).map(Number); return (0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]) / 255; };
  return {
    poems: [...document.querySelectorAll('#paperBody .stimulus-poem')].map((p) => p.querySelectorAll('.poem-line').length),
    passages: [...document.querySelectorAll('#paperBody .stimulus-passage')].map((p) => p.querySelectorAll('p').length),
    figs: svgs.map((s) => { const r = s.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), shapes: s.querySelectorAll('path,line,rect,circle,ellipse,polygon,polyline,text').length, lum: lum(getComputedStyle(s).color) }; }),
    items: document.querySelectorAll('#paperBody .item').length,
    heads: [...document.querySelectorAll('#paperBody .section-head')].map((e) => e.textContent),
  };
}

function probeResult() {
  const q = (s) => { const e = document.querySelector('#resultView ' + s); return e ? e.textContent.trim() : null; };
  return {
    rows: [...document.querySelectorAll('#resultView .rc-table tr[data-section]')].map((tr) => ({ code: tr.dataset.section, cells: [...tr.cells].map((c) => c.textContent.trim()) })),
    total: [...(document.querySelector('#resultView .rc-table tr.rc-total') || { cells: [] }).cells].map((c) => c.textContent.trim()),
    score: q('.rc-score'), pct: q('.rc-pct'), grade: q('.rc-grade'),
    notes: [...document.querySelectorAll('#resultView .rc-note')].map((e) => e.textContent.trim()),
  };
}

/* ==================== the suite ==================== */

async function runSuite(base, opts) {
  const checks = {};
  ORDER.forEach((id) => { checks[id] = new Check(id); });
  const want = (...ids) => !opts.only || ids.some((id) => opts.only.has(String(id)));
  const code = opts.code;
  const t0 = Date.now();
  const progress = (s) => { if (!opts.quiet) say(`  [${((Date.now() - t0) / 1000).toFixed(0)}s] ${s}`); };

  // ---------- served page model (raw source) ----------
  const resp = await fetch(base, { cache: 'no-store' });
  const rawHtml = await resp.text();
  if (resp.status !== 200) throw new Error('GET ' + base + ' → HTTP ' + resp.status);
  const ui = extractJson(rawHtml, 'uiStrings');
  const data = extractJson(rawHtml, 'papersData');
  extractJson(rawHtml, 'assetsData');
  const order = data.order;
  const papers = data.papers;
  order.forEach((k) => { if (!/^[\w-]+$/.test(k)) throw new Error('unexpected paper key'); });
  const sevenKey = order.find((k) => papers[k].sections.length === 7);
  const mockKey = order.find((k) => !/^ch\d+$/.test(k)) || order[order.length - 1];
  const itemTotal = order.reduce((n, k) => n + items(papers[k]).length, 0);
  progress(`served data: ${order.length} papers (${order.join(', ')}), ${itemTotal} items`);

  // ---------- 20 / 21: source ----------
  if (want(20)) {
    checks[20].ok(!rawHtml.includes(code) && !rawHtml.includes(code.trim()), 'literal code found in page source');
    checks[20].note('code in source: ' + rawHtml.includes(code.trim()));
  }
  if (want(21)) {
    const hexes = rawHtml.match(/(?<![0-9a-fA-F])[0-9a-f]{64}(?![0-9a-fA-F])/g) || [];
    const expect = crypto.createHash('sha256').update(code.trim()).digest('hex');
    checks[21].ok(hexes.length === 1, hexes.length + ' 64-hex strings');
    checks[21].ok(hexes[0] === expect, 'hash does not equal sha256(code)');
    checks[21].ok(!rawHtml.includes('__SECRET_HASH__'), 'placeholder still present');
    checks[21].note('hash prefix ' + (hexes[0] || '').slice(0, 12) + ', matches: ' + (hexes[0] === expect));
  }

  // ---------- browser ----------
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true });
  const problems = [];
  let scen = 'setup';
  const contexts = [];
  async function newPage(initScript) {
    const ctx = await browser.newContext({ viewport: FUNC_VIEWPORT });
    contexts.push(ctx);
    ctx.setDefaultTimeout(10000);
    if (initScript) await ctx.addInitScript(initScript);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push(scen + ' pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(scen + ' console.' + m.type() + ': ' + m.text()); });
    page.on('requestfailed', (r) => problems.push(scen + ' requestfailed: ' + r.url() + ' ' + ((r.failure() || {}).errorText || '')));
    page.on('response', (r) => { if (r.status() >= 400) problems.push(scen + ' HTTP ' + r.status() + ': ' + r.url()); });
    page.on('dialog', (d) => d.accept().catch(() => {}));
    return page;
  }
  async function login(page) {
    await page.goto(base);
    await page.waitForSelector('#loginView:not([hidden]), #chaptersView:not([hidden])', { state: 'attached' });
    if (await page.isVisible('#loginView')) {
      await page.fill('#userInput', String(data.login.user));
      await page.fill('#passInput', String(data.login.pass));
      await page.click('#loginForm [type=submit]');
    }
    await page.waitForSelector('#chaptersView:not([hidden])');
  }
  async function openPaper(page, key) {
    if (!(await page.isVisible('#chaptersView'))) {
      if (await page.isVisible('#loginView')) await login(page);
      else await page.click('#homeBtn');
    }
    await page.click(`#chapterGrid [data-paper-key="${key}"]`);
    await page.waitForSelector('#paperView:not([hidden])');
  }
  async function unlock(page) {
    await page.click('#checkModeBtn');
    await page.waitForSelector('#checkDialog[open]');
    await page.fill('#checkInput', code);
    await page.click('#checkSubmit');
    try { await page.waitForSelector('#checkModeBtn.on', { timeout: 5000 }); return true; } catch (e) { return false; }
  }
  const state = (page) => page.evaluate(probeState);
  const guard = async (ids, name, fn) => {
    if (!want(...ids)) return;
    scen = name;
    progress(name);
    try { await fn(); } catch (e) { ids.forEach((id) => checks[id].ok(false, name + ' threw: ' + errText(e))); }
  };

  try {
    // ---------- practice pass: 7, 8, 9, 24, 26, X3, X4, X5 (practice half) ----------
    await guard([7, 8, 9, 24, 26, 'X3', 'X4', 'X5'], 'practice pass (every paper)', async () => {
      const page = await newPage();
      await login(page);
      let minContrast = { v: 99, where: '' };
      for (const key of order) {
        const paper = papers[key];
        await openPaper(page, key);
        const all = items(paper);
        const st = await page.evaluate(probeStimuli);
        const dom = await page.evaluate(probeDom);
        const text = norm(dom.text);

        // 7: rendering
        checks[7].ok(st.items === all.length, `${key}: ${st.items}/${all.length} items rendered`);
        const missingQ = all.filter(({ it }) => (it.q || '').split(/_{3,}/).map(norm).filter(Boolean).some((seg) => !text.includes(seg))).map(({ it }) => it.id);
        checks[7].ok(!missingQ.length, `${key}: question text missing for ${missingQ.slice(0, 3).join(' ')}`);
        const missingOpt = all.filter(({ it }) => [...flat(it.options), ...(it.pairs || []).flatMap((p) => [p.left, p.right])].some((o) => !text.includes(norm(o)))).map(({ it }) => it.id);
        checks[7].ok(!missingOpt.length, `${key}: options/pairs missing for ${missingOpt.slice(0, 3).join(' ')}`);
        const stims = stimuli(paper);
        const missingStim = stims.filter((s) => s.text && s.text.split('\n').map(norm).filter(Boolean).some((l) => !text.includes(l)));
        checks[7].ok(!missingStim.length, `${key}: stimulus text missing (${missingStim.length})`);
        const expFigs = stims.filter((s) => s.kind === 'figure').length;
        checks[7].ok(st.figs.length === expFigs, `${key}: ${st.figs.length}/${expFigs} figures`);
        // 7: hidden text and attributes
        const leaks = secretStrings(paper).filter((s) => text.includes(s) || dom.attrs.includes(s));
        checks[7].ok(!leaks.length, `${key}: hidden text in practice DOM: "${short(leaks[0] || '', 50)}" (${leaks.length})`);
        checks[7].ok(!dom.bad.length, `${key}: attribute names a hidden field: ${dom.bad.join(' ')}`);

        // 8 / 9 / X5 practice half
        const s = await state(page);
        checks[8].ok(!s.reachable.length && !s.answers && !s.captions && !s.result && !s.marked, `${key}: reachable in practice: ${JSON.stringify(s.reachable)} answers=${s.answers} captions=${s.captions}`);
        checks[9].ok(s.banner && norm(s.bannerText) === norm(ui['paper.practiceBanner']), `${key}: banner visible=${s.banner}`);
        const labels = ['answer.guide', 'answer.points', 'answer.accept', 'answer.tag'].map((k) => norm(ui[k]));
        const shown = labels.filter((l) => text.includes(l));
        checks.X5.ok(!s.rubric && !shown.length, `${key}: practice shows rubric/labels ${shown.join(', ')}`);

        // X3 paper view
        const heads = st.heads.map(norm);
        const secOk = heads.length === paper.sections.length && paper.sections.every((sec, i) => heads[i].includes(norm(sec.code)) && heads[i].includes(norm(sec.title)) && heads[i].includes(String(sec.marks)));
        checks.X3.ok(secOk, `${key}: section heads ${heads.length} vs data ${paper.sections.length}`);
        const profile = SECTION_PROFILE[key] || 7;
        checks.X3.ok(paper.sections.length === profile, `${key}: served ${paper.sections.length} sections, brief expects ${profile}`);

        // X4
        const expPoems = stims.filter((x) => x.kind === 'poem').map((x) => x.text.split('\n').length);
        const expPass = stims.filter((x) => x.kind === 'passage').map((x) => x.text.split(/\n\s*\n/).length);
        checks.X4.ok(JSON.stringify(st.poems) === JSON.stringify(expPoems), `${key}: poem lines ${JSON.stringify(st.poems)} vs ${JSON.stringify(expPoems)}`);
        checks.X4.ok(JSON.stringify(st.passages) === JSON.stringify(expPass), `${key}: passage paragraphs ${JSON.stringify(st.passages)} vs ${JSON.stringify(expPass)}`);

        // 26 light
        checks[26].ok(st.figs.every((f) => f.w > 20 && f.h > 20 && f.shapes > 0), `${key}: empty figure ${JSON.stringify(st.figs.filter((f) => !(f.w > 20 && f.h > 20 && f.shapes > 0)))}`);

        // 24 + X4 sideways, at 390 px light and dark
        for (const scheme of ['light', 'dark']) {
          await page.setViewportSize(MOBILE_VIEWPORT);
          await page.emulateMedia({ colorScheme: scheme });
          const lay = await page.evaluate(probeLayout);
          checks[24].ok(lay.over <= 0, `${key} ${scheme}: horizontal overflow ${lay.over}px`);
          checks.X4.ok(lay.stimOver === 0 && lay.over <= 0, `${key} ${scheme}: text stimulus scrolls sideways (${lay.stimOver})`);
          if (lay.min < minContrast.v) minContrast = { v: lay.min, where: `${key} ${scheme} .${lay.where}` };
          if (scheme === 'dark') {
            const d = await page.evaluate(probeStimuli);
            checks[26].ok(d.figs.every((f) => f.lum > 0.6), `${key}: dark-mode figure stroke not light (${d.figs.map((f) => f.lum.toFixed(2)).join(',')})`);
          }
        }
        await page.setViewportSize(FUNC_VIEWPORT);
        await page.emulateMedia({ colorScheme: 'light' });
        await page.click('#backBtn');
        await page.waitForSelector('#chaptersView:not([hidden])');
      }
      checks[24].ok(minContrast.v >= MIN_CONTRAST, `minimum contrast ${minContrast.v.toFixed(2)} < ${MIN_CONTRAST} at ${minContrast.where}`);
      checks[24].note(`min contrast ${minContrast.v.toFixed(2)}:1 (${minContrast.where})`);
      checks[7].note(`${order.length} papers, ${itemTotal} items`);
    });

    // ---------- gate: 10, 11, 12, 14, 17 on ch1 ----------
    const firstKey = order[0];
    await guard([10, 11, 12, 14, 17], 'gate + show-all + re-lock (' + firstKey + ')', async () => {
      const page = await newPage();
      await login(page);
      await openPaper(page, firstKey);
      const locked = async () => { const s = await state(page); return !s.on && s.banner && !s.reachable.length; };
      const isOpen = () => page.evaluate(() => document.getElementById('checkDialog').open);
      // 10
      await page.click('#checkModeBtn');
      checks[10].ok(await isOpen(), 'unlock button does not open the dialog');
      await page.fill('#checkInput', code);
      await page.keyboard.press('Escape');
      checks[10].ok(!(await isOpen()) && (await locked()), 'Escape: dialog open or unlocked');
      await page.click('#checkModeBtn');
      await page.fill('#checkInput', code);
      await page.click('#checkCancel');
      checks[10].ok(!(await isOpen()) && (await locked()), 'cancel: dialog open or unlocked');
      await page.click('#checkModeBtn');
      await page.fill('#checkInput', code);
      await page.mouse.click(5, 5);
      await page.waitForTimeout(150);
      checks[10].ok(!(await isOpen()) && (await locked()), 'backdrop: dialog open or unlocked');
      // 11
      await page.click('#checkModeBtn');
      await page.fill('#checkInput', 'not-the-code-' + crypto.randomBytes(3).toString('hex'));
      await page.click('#checkSubmit');
      await page.waitForSelector('#checkError:not([hidden])', { timeout: 3000 }).catch(() => {});
      const err = await page.evaluate(() => ({ vis: !document.getElementById('checkError').hidden, text: document.getElementById('checkError').textContent, val: document.getElementById('checkInput').value, open: document.getElementById('checkDialog').open }));
      checks[11].ok(err.vis && norm(err.text) === norm(ui['mode.wrongCode']), 'wrong code: no mode.wrongCode error');
      checks[11].ok(err.val === '', 'wrong code: field not cleared');
      checks[11].ok(err.open, 'wrong code: dialog closed');
      checks[11].ok(!(await state(page)).on && !(await page.isVisible('#revealAllBtn')), 'wrong code unlocked something');
      await page.click('#checkCancel');
      // 12
      const ok = await unlock(page);
      const s = await state(page);
      checks[12].ok(ok && !(await isOpen()), 'correct code did not unlock');
      checks[12].ok(!s.banner && (await page.isVisible('#revealAllBtn')) && (await page.isVisible('#scoreBar')) && (await page.locator('#paperBody .ans-btn').first().isVisible()) && (await page.locator('#paperBody .mk').first().isVisible()),
        'checking UI not visible after unlock');
      checks[12].note('code typed from ' + SECRET_ENV + ' (not printed)');
      // 14
      const paper = papers[firstKey];
      const n = items(paper).length;
      const nCap = stimuli(paper).filter((x) => x.kind === 'figure' && x.caption).length;
      checks[14].ok((await page.$$eval('#paperBody .stimulus-caption', (e) => e.length)) === nCap, 'captions in checking mode != captioned figures');
      await page.click('#revealAllBtn');
      const shownN = await page.$$eval('#paperBody .item > .answer', (e) => e.length);
      checks[14].ok(shownN === n, `show-all revealed ${shownN}/${n}`);
      await page.click('#revealAllBtn');
      checks[14].ok((await page.$$eval('.answer', (e) => e.length)) === 0, 'show-all again did not hide');
      // 17
      await page.click('#revealAllBtn');
      await page.click(`#paperBody .item .mk[data-val="1"]`);
      await page.click('#checkModeBtn');
      const s17 = await state(page);
      checks[17].ok(isPractice(s17), 'after toggling off: ' + JSON.stringify({ ...s17, bannerText: undefined }));
      checks[17].ok(!(await page.isVisible('#scoreBar')), 'score bar still visible');
    });

    // ---------- 13 + X5: sampled per-question reveal ----------
    await guard([13, 'X5'], 'per-question reveal (sampled)', async () => {
      const samples = new Map(); // id -> {key, it, why}
      const add = (why, pred) => {
        for (const key of order) for (const { it } of items(papers[key])) if (pred(it)) { if (!samples.has(it.id)) samples.set(it.id, { key, it, why: [] }); samples.get(it.id).why.push(why); return; }
        checks[13].note('no item for sample "' + why + '"');
      };
      const types = [...new Set(order.flatMap((k) => items(papers[k]).map(({ it }) => it.type)))];
      types.forEach((ty) => add('type ' + ty, (it) => it.type === ty));
      add('acceptable', (it) => (it.type === 'fill-blank' || it.type === 'one-word') && Array.isArray(it.acceptable) && it.acceptable.length);
      add('multi-blank', (it) => Array.isArray(it.answer) && (it.blanks || 0) > 1);
      add('markingGuide', (it) => !!it.markingGuide);
      add('answerPoints', (it) => Array.isArray(it.answerPoints) && it.answerPoints.length);
      const capKey = order.find((k) => stimuli(papers[k]).some((x) => x.kind === 'figure' && x.caption));
      const byKey = {};
      samples.forEach((v) => { (byKey[v.key] = byKey[v.key] || []).push(v); });
      if (capKey) byKey[capKey] = byKey[capKey] || [];
      const page = await newPage();
      await login(page);
      for (const key of Object.keys(byKey)) {
        await openPaper(page, key);
        checks[13].ok(await unlock(page), key + ': unlock failed');
        if (key === capKey) {
          const caps = stimuli(papers[key]).filter((x) => x.kind === 'figure' && x.caption).map((x) => norm(tpl(ui, 'stimulus.captionTag') + ' ' + x.caption));
          const got = (await page.$$eval('#paperBody .figure-scroll + .stimulus-caption', (e) => e.map((x) => x.textContent))).map(norm);
          checks[13].ok(caps.every((c) => got.includes(c)), key + ': figure caption text != data');
        }
        for (const { it, why } of byKey[key]) {
          const box = page.locator('#paperBody ' + sel(it.id));
          await box.locator('.ans-btn').click();
          const p = await box.evaluate((w) => {
            const a = w.querySelector(':scope > .answer');
            if (!a) return null;
            const q = (s) => a.querySelector(s);
            return {
              after: !!(a.previousElementSibling && a.previousElementSibling.classList.contains('item-tools')),
              text: q('.ans-text') ? q('.ans-text').textContent : null,
              points: [...a.querySelectorAll('.ans-points li')].map((l) => l.textContent),
              guide: q('.ans-guide p') ? q('.ans-guide p').textContent : null,
              accept: [...a.querySelectorAll('.ans-accept li')].map((l) => l.textContent),
              pairs: [...a.querySelectorAll('.ans-pairs li')].map((l) => l.textContent),
              expanded: w.querySelector('.ans-btn').getAttribute('aria-expanded'),
            };
          });
          const tag = `${it.id} [${why.join(', ')}]`;
          if (!checks[13].ok(p, tag + ': no .answer panel after reveal')) continue;
          checks[13].ok(p.after && p.expanded === 'true', tag + ': panel not after .item-tools or aria-expanded not true');
          if (it.answer != null && it.answer !== '') checks[13].ok(norm(p.text) === norm(answerText(it.answer)), tag + ': answer text != data');
          if (it.answerPoints && it.answerPoints.length) {
            checks.X5.ok(p.points.length === it.answerPoints.length && it.answerPoints.every((pt, i) => norm(p.points[i]).includes(norm(pt.point)) && p.points[i].includes(String(pt.marks))), tag + ': mark split != data');
          }
          if (it.markingGuide) checks.X5.ok(norm(p.guide) === norm(it.markingGuide), tag + ': marking guide != data');
          if ((it.type === 'fill-blank' || it.type === 'one-word') && Array.isArray(it.acceptable) && it.acceptable.length) {
            const multi = it.acceptable.some(Array.isArray);
            const want2 = multi ? it.acceptable.length : 1;
            checks.X5.ok(p.accept.length === want2 && (multi ? it.acceptable.every((vs, i) => flat(vs).every((v) => p.accept[i].includes(v))) : flat(it.acceptable).every((v) => p.accept[0].includes(v))), tag + ': Also accept != data');
          }
          if (it.type === 'match') checks[13].ok(p.pairs.length === it.pairs.length && it.pairs.every((pr, i) => p.pairs[i].includes(pr.left) && p.pairs[i].includes(pr.right)), tag + ': pairs != data');
          await box.locator('.ans-btn').click();
          checks[13].ok((await box.locator(':scope > .answer').count()) === 0, tag + ': hide did not remove the panel');
        }
        await page.click('#checkModeBtn');
      }
      checks[13].note(`${samples.size} sampled items, types: ${types.join(', ')}`);
    });

    // ---------- 15: full marks, every paper ----------
    await guard([15, 'X3'], 'full marks, every paper', async () => {
      const page = await newPage();
      await login(page);
      for (const key of order) {
        const paper = papers[key];
        await openPaper(page, key);
        if (!checks[15].ok(await unlock(page), key + ': unlock failed')) continue;
        const maxes = await page.evaluate(() => [...document.querySelectorAll('#paperBody .item')].map((w) => {
          const bs = [...w.querySelectorAll('.mk[data-val]')];
          const b = bs[bs.length - 1];
          if (b) b.click();
          return { id: w.dataset.itemId, max: b ? Number(b.dataset.val) : -1, n: bs.length };
        }));
        const byId = Object.fromEntries(items(paper).map(({ it }) => [it.id, it]));
        const badMax = maxes.filter((m) => !byId[m.id] || m.max !== byId[m.id].marks || m.n !== byId[m.id].marks + 1);
        checks[15].ok(!badMax.length, `${key}: marks buttons != 0..marks for ${badMax.slice(0, 3).map((m) => m.id).join(' ')}`);
        const sb = await page.evaluate(() => [document.getElementById('sbGot').textContent, document.getElementById('sbTotal').textContent].map((s) => s.trim()));
        checks[15].ok(sb[0] === String(paper.totalMarks) && sb[1] === String(paper.totalMarks), `${key}: score bar ${sb.join('/')} vs ${paper.totalMarks}`);
        const sum = paper.sections.reduce((n, s) => n + s.marks, 0);
        checks[15].ok(sum === paper.totalMarks, `${key}: section marks sum ${sum} != totalMarks`);
        await page.click('#resultBtn');
        await page.waitForSelector('#resultView .result-card');
        const r = await page.evaluate(probeResult);
        const rowsOk = r.rows.length === paper.sections.length && paper.sections.every((sec, i) => r.rows[i].code === sec.code && r.rows[i].cells[3] === `${sec.marks} / ${sec.marks}`);
        checks[15].ok(rowsOk, `${key}: result rows not at full section marks: ${JSON.stringify(r.rows.map((x) => x.cells[3]))}`);
        checks[15].ok(r.total[3] === `${paper.totalMarks} / ${paper.totalMarks}` && r.pct === '100%', `${key}: total ${r.total[3]} pct ${r.pct}`);
        checks.X3.ok(r.rows.length === paper.sections.length && paper.sections.every((sec, i) => r.rows[i].code === sec.code && r.rows[i].cells[1] === sec.title), `${key}: result rows != served sections`);
        await page.click('#homeBtn');
      }
      checks[15].note(`${order.length}/${order.length} papers at full marks`);
    });

    // ---------- 16: mixed seeded marking ----------
    await guard([16], 'mixed seeded marking', async () => {
      const page = await newPage();
      await login(page);
      for (const key of [...new Set([order.find((k) => papers[k].sections.length === 5) || order[0], sevenKey].filter(Boolean))]) {
        const paper = papers[key];
        await openPaper(page, key);
        if (!checks[16].ok(await unlock(page), key + ': unlock failed')) continue;
        const rnd = mulberry32(seedOf('mily-english-e2e-16-' + key));
        const given = {};
        for (const { it } of items(paper)) {
          if (rnd() < 0.12) continue;
          const v = Math.floor(rnd() * (it.marks + 1));
          given[it.id] = v;
          await page.click(`#paperBody ${sel(it.id)} .mk[data-val="${v}"]`);
        }
        let got = 0; let done = 0; let count = 0;
        const rows = paper.sections.map((sec) => {
          let g = 0; let d = 0; let c = 0;
          sec.blocks.forEach((b) => b.items.forEach((it) => { c++; if (it.id in given) { d++; g += given[it.id]; } }));
          got += g; done += d; count += c;
          return [sec.code, sec.title, `${d}/${c}`, `${g} / ${sec.marks}`];
        });
        const sbGot = await page.textContent('#sbGot');
        checks[16].ok(sbGot.trim() === String(got), `${key}: score bar ${sbGot} vs ${got}`);
        await page.click('#resultBtn');
        await page.waitForSelector('#resultView .result-card');
        const r = await page.evaluate(probeResult);
        checks[16].ok(JSON.stringify(r.rows.map((x) => x.cells)) === JSON.stringify(rows), `${key}: result rows != recomputed (${JSON.stringify(r.rows.map((x) => x.cells[3]))})`);
        checks[16].ok(JSON.stringify(r.total.slice(2)) === JSON.stringify([`${done}/${count}`, `${got} / ${paper.totalMarks}`]), `${key}: total row ${JSON.stringify(r.total)}`);
        const pct = Math.round((got / paper.totalMarks) * 1000) / 10;
        checks[16].ok(r.pct === `${pct}%` && !/\.0%$/.test(r.pct), `${key}: pct ${r.pct} vs ${pct}%`);
        checks[16].ok(norm(r.grade) === norm(ui['grade.' + gradeKey(pct)]), `${key}: grade ${r.grade} vs band ${gradeKey(pct)}`);
        checks[16].ok(norm(r.score).startsWith(String(got)), `${key}: score ${r.score}`);
        const warn = norm(tpl(ui, 'result.unmarked', { count: count - done }));
        checks[16].ok(done < count ? r.notes.map(norm).includes(warn) : !r.notes.map(norm).some((x) => x.includes('not marked')), `${key}: unmarked warning wrong`);
        checks[16].note(`${key}: ${got}/${paper.totalMarks} = ${pct}% ${gradeKey(pct)}, ${count - done} unmarked`);
        await page.click('#homeBtn');
      }
    });

    // ---------- 18: every exit returns to practice ----------
    await guard([18], 'exits return to practice', async () => {
      const page = await newPage();
      await login(page);
      const other = order[1] || order[0];
      const armed = async (key) => { await openPaper(page, key); const ok = await unlock(page); await page.click('#revealAllBtn'); return ok; };
      const verify = async (name, key) => { await openPaper(page, key); const s = await state(page); checks[18].ok(isPractice(s), name + ': not practice ' + JSON.stringify({ on: s.on, a: s.answers, r: s.reachable })); await page.click('#backBtn'); };
      await armed(firstKey); await page.click('#backBtn'); await verify('back', firstKey);
      await armed(firstKey); await page.click('#backBtn'); await verify('another paper', other);
      await armed(firstKey); await page.click('#homeBtn'); await verify('home', firstKey);
      await armed(firstKey); await page.click('#resultBtn'); await page.waitForSelector('#resultView .result-card');
      await page.click('#resultView .rc-actions button:last-child'); await verify('result → home', firstKey);
      await armed(firstKey); await page.reload(); await page.waitForSelector('#chaptersView:not([hidden]), #loginView:not([hidden])');
      if (await page.isVisible('#loginView')) await login(page);
      await verify('reload', firstKey);
      await armed(firstKey); await page.click('#logoutBtn');
      checks[18].ok(await page.isVisible('#loginView'), 'logout did not show login');
      await login(page); await verify('logout', firstKey);
    });

    // ---------- 19: marks survive reload ----------
    await guard([19], 'marks survive reload', async () => {
      const page = await newPage();
      await login(page);
      await openPaper(page, firstKey);
      await unlock(page);
      const picks = items(papers[firstKey]).slice(0, 4).map(({ it }, i) => ({ id: it.id, v: Math.min(it.marks, i % 2 ? 1 : it.marks) }));
      for (const p of picks) await page.click(`#paperBody ${sel(p.id)} .mk[data-val="${p.v}"]`);
      await page.reload();
      await page.waitForSelector('#chaptersView:not([hidden]), #loginView:not([hidden])');
      await openPaper(page, firstKey);
      checks[19].ok(isPractice(await state(page)), 'after reload not in practice');
      await unlock(page);
      const on = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#paperBody .item')].map((w) => [w.dataset.itemId, (w.querySelector('.mk.on') || { dataset: {} }).dataset.val])));
      checks[19].ok(picks.every((p) => on[p.id] === String(p.v)), 'marks lost: ' + JSON.stringify(picks.map((p) => [p.v, on[p.id]])));
      const sum = picks.reduce((n, p) => n + p.v, 0);
      checks[19].ok((await page.textContent('#sbGot')).trim() === String(sum), 'score bar after reload != ' + sum);
    });

    // ---------- 23: print ----------
    await guard([23], 'print to PDF', async () => {
      const page = await newPage();
      await login(page);
      for (const key of [...new Set([order[0], sevenKey, mockKey].filter(Boolean))]) {
        const paper = papers[key];
        await openPaper(page, key);
        await unlock(page);
        await page.click('#revealAllBtn');
        const pdfFile = path.join(opts.outDir, `print-${key}.pdf`);
        await page.pdf({ path: pdfFile, format: 'A4', printBackground: true });
        const pt = spawnSync('pdftotext', ['-raw', '-enc', 'UTF-8', pdfFile, '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
        if (!checks[23].ok(pt.status === 0, key + ': pdftotext failed')) continue;
        const pages = pt.stdout.split('\f').map(squash);
        const all = pages.join(' ');
        const stims = stimuli(paper);
        // present
        const present = [];
        stims.filter((s) => s.kind === 'passage').forEach((s) => s.text.split(/\n\s*\n/).forEach((p) => present.push(squash(p).slice(0, 60))));
        stims.filter((s) => s.kind === 'poem').forEach((s) => s.text.split('\n').forEach((l) => present.push(squash(l))));
        items(paper).forEach(({ it }) => (it.q || '').split(/_{3,}|\n/).map(squash).filter((x) => x.length >= 8).forEach((x) => present.push(x.slice(0, 50))));
        const missing = present.filter((x) => x && !all.includes(x));
        checks[23].ok(!missing.length, `${key}: ${missing.length}/${present.length} content strings missing in print, e.g. "${short(missing[0] || '', 50)}"`);
        // absent
        const secrets = secretStrings(paper).map(squash).filter((x) => x.length >= 12 && all.includes(x));
        checks[23].ok(!secrets.length, `${key}: hidden text printed: "${short(secrets[0] || '', 50)}" (${secrets.length})`);
        const uiAbsent = ['answer.tag', 'answer.accept', 'answer.guide', 'answer.points', 'stimulus.captionTag', 'paper.practiceBanner', 'marks.label', 'answer.show', 'answer.hide', 'answer.hideAll', 'answer.showAll', 'mode.unlock', 'mode.lock', 'marks.clear', 'result.button', 'score.checked'];
        const printedUi = uiAbsent.filter((k) => { const l = squash(ui[k]); return l.length >= 4 && all.includes(l); });
        checks[23].ok(!printedUi.length, `${key}: UI text printed: ${printedUi.join(', ')}`);
        // poems unsplit
        stims.filter((s) => s.kind === 'poem').forEach((s, i) => {
          const lines = s.text.split('\n').map(squash).filter((l) => l.length >= 3);
          const one = pages.some((pg) => lines.every((l) => pg.includes(l)));
          checks[23].ok(one, `${key}: poem ${i + 1} split across pages`);
        });
        checks[23].note(`${key}: ${pages.filter(Boolean).length} pages`);
        await page.click('#checkModeBtn');
      }
    });

    // ---------- X1: no crypto.subtle ----------
    await guard(['X1'], 'no crypto.subtle', async () => {
      const page = await newPage(() => {
        try { Object.defineProperty(Crypto.prototype, 'subtle', { get() { return undefined; }, configurable: true }); } catch (e) { /* ignore */ }
      });
      await login(page);
      await openPaper(page, firstKey);
      checks.X1.ok(await page.evaluate(() => !(window.crypto && window.crypto.subtle)), 'crypto.subtle still present');
      await page.click('#checkModeBtn');
      await page.fill('#checkInput', code);
      await page.click('#checkSubmit');
      await page.waitForTimeout(400);
      const e = await page.evaluate(() => ({ vis: !document.getElementById('checkError').hidden, text: document.getElementById('checkError').textContent }));
      checks.X1.ok(e.vis && norm(e.text) === norm(ui['mode.insecure']), 'mode.insecure not shown');
      await page.click('#checkCancel');
      checks.X1.ok(isPractice(await state(page)), 'something unlocked without crypto.subtle');
    });
  } finally {
    scen = 'teardown';
    for (const c of contexts) await c.close().catch(() => {});
    await browser.close();
  }

  // ---------- 25 / 26 requests ----------
  if (!opts.only || want(25)) {
    checks[25].ok(!problems.length, `${problems.length} problem(s): ${short(problems[0] || '', 120)}`);
  }
  if (want(26)) {
    const failedReq = problems.filter((p) => /requestfailed|HTTP \d/.test(p));
    checks[26].ok(!failedReq.length, 'failed request: ' + short(failedReq[0] || '', 100));
  }

  // ---------- 22: build-only ----------
  if (want(22)) buildChecks(base, checks[22], opts);

  // ---------- X2: static ----------
  if (want('X2')) {
    const appJs = opts.appJs || path.join(ROOT, 'app', 'app.js');
    if (!fs.existsSync(appJs)) checks.X2.na = 'app/app.js not present locally';
    else {
      const js = fs.readFileSync(appJs, 'utf8');
      const found = ['chapterSource', 'sourceChapter', 'difficulty', 'skill'].filter((w) => js.includes(w));
      checks.X2.ok(!found.length, 'app.js names ' + found.join(', '));
      checks.X2.note('static read of ' + path.relative(ROOT, appJs));
    }
  }
  return checks;
}

/* ---------- 22: build refusals on a temp copy ---------- */
function buildChecks(base, c, opts) {
  const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(base);
  if (!local || !fs.existsSync(path.join(ROOT, 'build.js'))) { c.na = local ? 'no build.js' : 'live URL (build-only check)'; return; }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mily-english-e2e-build-'));
  const skip = new Set(['.git', 'node_modules', 'dist', 'source', 'sprints', 'tests', '.vercel', '.claude', 'fixtures']);
  try {
    fs.cpSync(ROOT, tmp, {
      recursive: true,
      filter: (src) => { const rel = path.relative(ROOT, src); const top = rel.split(path.sep)[0]; return !skip.has(top) && !/^\.env/.test(path.basename(src)) && !rel.includes('__pycache__') && !/\.npy$/.test(src); },
    });
    if (fs.existsSync(path.join(ROOT, 'node_modules'))) fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(tmp, 'node_modules'), 'dir');
    const throwaway = 'e2e-english-' + crypto.randomBytes(6).toString('hex');
    addRedaction(throwaway);
    const baseEnv = { ...process.env };
    delete baseEnv[SECRET_ENV];
    const run = (env) => {
      fs.rmSync(path.join(tmp, 'dist'), { recursive: true, force: true });
      const r = spawnSync(process.execPath, ['build.js'], { cwd: tmp, env, encoding: 'utf8', timeout: 120000 });
      const files = fs.existsSync(path.join(tmp, 'dist')) ? fs.readdirSync(path.join(tmp, 'dist')) : [];
      return { status: r.status, files };
    };
    const unset = run(baseEnv);
    c.ok(unset.status !== 0 && !unset.files.length, `code unset: exit ${unset.status}, dist ${unset.files.length} file(s)`);
    const empty = run({ ...baseEnv, [SECRET_ENV]: '' });
    c.ok(empty.status !== 0 && !empty.files.length, `code empty: exit ${empty.status}, dist ${empty.files.length} file(s)`);
    const appJs = path.join(tmp, 'app', 'app.js');
    const orig = fs.readFileSync(appJs, 'utf8');
    fs.writeFileSync(appJs, orig.split('__SECRET_HASH__').join('__NO_PLACEHOLDER__'));
    const noPh = run({ ...baseEnv, [SECRET_ENV]: throwaway });
    c.ok(noPh.status !== 0 && !noPh.files.length, `placeholder missing: exit ${noPh.status}, dist ${noPh.files.length} file(s)`);
    fs.writeFileSync(appJs, orig);
    const ctl = run({ ...baseEnv, [SECRET_ENV]: throwaway });
    c.ok(ctl.status === 0 && ctl.files.length === 1 && ctl.files[0] === 'index.html', `control build: exit ${ctl.status}, dist ${JSON.stringify(ctl.files)}`);
    c.note(`unset ${unset.status}, empty ${empty.status}, no-placeholder ${noPh.status}, control ${ctl.status}/${ctl.files.length} file`);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/* ==================== reporting ==================== */

function report(checks, header) {
  if (header) say(header);
  let fails = 0;
  for (const id of ORDER) {
    const c = checks[id];
    const st = c.status();
    if (st === 'NOT RUN') continue;
    if (st === 'FAIL') fails++;
    const detail = st === 'FAIL' ? c.fails.slice(0, 4).join(' | ') + (c.fails.length > 4 ? ` (+${c.fails.length - 4} more)` : '')
      : st === 'N/A' ? c.na : c.notes.join('; ');
    say(`${st.padEnd(4)} ${id.padEnd(3)} ${TITLES[id]}${detail ? ' — ' + short(detail, 400) : ''}`);
  }
  return fails;
}

function selfGrep(dir, code) {
  const hits = [];
  const needle = Buffer.from(code.trim());
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (fs.readFileSync(p).includes(needle)) hits.push(e.name);
  });
  walk(dir);
  return hits;
}

/* ==================== negative controls ==================== */

async function runNegative(base, opts) {
  const html = await (await fetch(base, { cache: 'no-store' })).text();
  const data = extractJson(html, 'papersData');
  const first = data.papers[data.order[0]];
  const answers = new Set(items(first).flatMap(({ it }) => flat(it.answer)).map(norm));
  const leak = secretStrings(first).find((s) => answers.has(s)) || secretStrings(first)[0];
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const beforeBody = (h, ins) => { const i = h.lastIndexOf('</body>'); return h.slice(0, i) + ins + h.slice(i); };
  const inHead = (h, ins) => h.replace('</head>', () => ins + '</head>');
  const hashRe = /(?<![0-9a-fA-F])[0-9a-f]{64}(?![0-9a-fA-F])/;
  const controls = [
    { check: '7', what: 'injected answer text', page: beforeBody(html, '<p>' + esc(leak || 'x') + '</p>') },
    { check: '8', what: 'visible score bar', page: inHead(html, '<style>#scoreBar{display:block!important;visibility:visible!important;min-height:8px}</style>') },
    { check: '20', what: 'plaintext code in a comment', page: beforeBody(html, '<!-- ' + opts.code + ' -->') },
    { check: '21', what: 'zeroed hash', page: html.replace(hashRe, () => '0'.repeat(64)) },
    { check: '23', what: 'print CSS showing answers', page: inHead(html, '<style>@media print{html body #paperBody .item > .answer, html body #paperBody .item > .answer *{display:block!important;visibility:visible!important}}</style>') },
    { check: 'X2', what: 'difficulty read in app.js', appJs: true },
  ];
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'mily-english-e2e-neg-'));
  const serve = require(path.join(__dirname, 'serve.js'));
  let bad = 0;
  try {
    for (const ctl of controls) {
      const dir = path.join(scratch, 'c' + ctl.check);
      fs.mkdirSync(dir);
      let url = base;
      let srv = null;
      const o = { ...opts, only: new Set([ctl.check]), quiet: true };
      if (ctl.page) {
        fs.writeFileSync(path.join(dir, 'index.html'), ctl.page);
        srv = await serve.start({ port: 0, root: dir });
        url = srv.url;
      }
      if (ctl.appJs) {
        const src = path.join(ROOT, 'app', 'app.js');
        o.appJs = path.join(dir, 'app.js');
        fs.writeFileSync(o.appJs, (fs.existsSync(src) ? fs.readFileSync(src, 'utf8') : '') + '\nvoid (DATA.papers && DATA.papers.difficulty);\n');
      }
      let st;
      let why = '';
      try {
        const checks = await runSuite(url, o);
        st = checks[ctl.check].status();
        why = checks[ctl.check].fails[0] || '';
      } catch (e) { st = 'ERROR'; why = errText(e); } finally { if (srv) await srv.close(); }
      const red = st === 'FAIL';
      if (!red) bad++;
      say(`${red ? 'PASS' : 'FAIL'} negative control → check ${ctl.check} (${ctl.what}): check turned ${st}${why ? ' — ' + short(why, 120) : ''}`);
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
  return bad;
}

/* ==================== main ==================== */

function parseArgs(argv) {
  const o = { url: null, out: null, browser: 'chromium', only: null, negative: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => { if (i + 1 >= argv.length) throw new Error('missing value for ' + a); return argv[++i]; };
    if (a === '--url') o.url = next();
    else if (a === '--out') o.out = next();
    else if (a === '--browser') o.browser = next();
    else if (a === '--only') o.only = new Set(next().split(',').map((s) => s.trim().toUpperCase()).filter(Boolean));
    else if (a === '--negative') o.negative = true;
    else if (a === '--help' || a === '-h') o.help = true;
    else throw new Error('unknown argument ' + a);
  }
  if (o.browser !== 'chromium') throw new Error('--browser: only chromium is supported');
  if (o.url) {
    const u = new URL(o.url);
    if (!/^https?:$/.test(u.protocol)) throw new Error('--url must be http(s)');
    o.url = u.origin + u.pathname.replace(/\/?$/, '/');
  }
  return o;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { say('usage: node scripts/e2e.js --url <url> [--out dir] [--browser chromium] [--only 7,8,X1] [--negative]'); return 0; }
  const code = process.env[SECRET_ENV];
  if (typeof code !== 'string' || !code.trim()) {
    process.stderr.write(`ERROR: ${SECRET_ENV} is not set in the environment (this script never reads .env.local).\n`);
    return 2;
  }
  addRedaction(code);
  opts.code = code.trim();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  opts.outDir = path.resolve(opts.out || path.join(os.tmpdir(), 'mily-english-e2e-' + stamp));
  fs.mkdirSync(opts.outDir, { recursive: true });
  logFile = path.join(opts.outDir, 'e2e.log');
  fs.writeFileSync(logFile, '');

  let server = null;
  if (!opts.url) {
    if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) { process.stderr.write('ERROR: dist/index.html not found; run node build.js or pass --url.\n'); return 2; }
    server = await require(path.join(__dirname, 'serve.js')).start({ port: 0 });
    opts.url = server.url;
  }
  const { chromium } = require('playwright');
  say(`mily-english-abhyas e2e · ${opts.negative ? 'negative controls' : 'acceptance'} · ${opts.url} · chromium · playwright ${require('playwright/package.json').version} · ${new Date().toISOString()}`);
  say(`out: ${opts.outDir}`);
  void chromium;

  let failures = 0;
  try {
    if (opts.negative) {
      failures = await runNegative(opts.url, opts);
      say(`negative controls: ${6 - failures}/6 turned their check red`);
    } else {
      const checks = await runSuite(opts.url, opts);
      failures = report(checks, '---- results (Chromium only) ----');
      const counts = { PASS: 0, FAIL: 0, 'N/A': 0 };
      ORDER.forEach((id) => { const s = checks[id].status(); if (s in counts) counts[s]++; });
      fs.writeFileSync(path.join(opts.outDir, 'report.json'), redact(JSON.stringify(ORDER.map((id) => ({ id, status: checks[id].status(), fails: checks[id].fails, notes: checks[id].notes, na: checks[id].na })), null, 1)));
      say(`summary: ${counts.PASS} pass, ${counts.FAIL} fail, ${counts['N/A']} n/a`);
    }
  } finally {
    if (server) await server.close();
  }
  const hits = selfGrep(opts.outDir, opts.code);
  say(`${hits.length ? 'FAIL' : 'PASS'} redaction self-grep of ${opts.outDir}: ${hits.length ? 'code found in ' + hits.join(', ') : 'code not found'}`);
  return failures || hits.length ? 1 : 0;
}

main().then((rc) => { process.exitCode = rc; }, (e) => { process.stderr.write('ERROR: ' + errText(e) + '\n'); process.exitCode = 1; });
