/* English Practice — Class 4 (Santoor)
   Single-page app: login → chapter list → paper → result.
   Every user-visible string comes from #uiStrings (app/ui/en.json) through t().
   Papers, figures, strings and the card's paper order and login are inlined into
   the page at build time. Adapted from the Maths site (parity, not a redesign). */

'use strict';

/* ==================== CONSTANTS & STATE ==================== */

// sha256 of the checking-mode code, substituted by build.js. Never commit a real hash.
const SECRET_HASH = '__SECRET_HASH__';

const LS = {
  session: 'milyEnglish.session',
  name: 'milyEnglish.studentName',
  scores: key => 'milyEnglish.scores.' + key
};

const BLANK_RUN = /_{3,}/g;       // _____ in question text
const TF_PROMPT = /true or false/i;

/* Checking mode lives in memory only. It is never written to localStorage,
   sessionStorage, a cookie or the URL, so every page load starts in practice. */
let checkMode = false;

const state = {
  paperKey: null,   // e.g. 'ch1' | 'hy'
  paper: null,      // the paper object from #papersData
  itemById: {},     // { [itemId]: item } for the open paper
  scores: {},       // { [itemId]: number } — keyed by item id only
  studentName: ''
};

// Per-instance counter for namespacing SVG ids (see namespaceSvgIds).
let figureInstance = 0;

/* ==================== HELPERS ==================== */

const $ = sel => document.querySelector(sel);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function readJson(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error('missing #' + id);
  return JSON.parse(node.textContent);
}

const store = {
  get(k, fallback) {
    try {
      const v = localStorage.getItem(k);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } }
};

const UI = readJson('uiStrings');
const DATA = readJson('papersData');     // { order: [...keys from the card], login: {user, pass}, papers: { key: paper } }
const ASSETS = readJson('assetsData');   // { 'assets/x.svg': '<svg…>' }

// Student login from the card's student_login. Not a security control (see README).
const AUTH = { user: String(DATA.login.user), pass: String(DATA.login.pass) };

const hasOwn = (obj, k) => Object.prototype.hasOwnProperty.call(obj, k);

/* Looks up a string and fills {placeholders}. Throws on a missing key or var.
   Application code calls t() with a single-quoted literal key; translate() is used only by the
   static data-i18n fill, whose keys the build checks in index.html. */
function translate(key, vars) {
  if (!hasOwn(UI, key)) throw new Error('missing ui string: ' + key);
  return String(UI[key]).replace(/\{(\w+)\}/g, (m, name) => {
    if (!vars || !hasOwn(vars, name)) throw new Error('missing var {' + name + '} for ui string: ' + key);
    return String(vars[name]);
  });
}

function t(key, vars) { return translate(key, vars); }

// Numerals hook: all papers use numerals "latn".
function num(n) { return String(n); }

function fillI18n(root) {
  root.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = translate(node.dataset.i18n); });
  root.querySelectorAll('[data-i18n-placeholder]').forEach(node => { node.setAttribute('placeholder', translate(node.dataset.i18nPlaceholder)); });
  root.querySelectorAll('[data-i18n-aria-label]').forEach(node => { node.setAttribute('aria-label', translate(node.dataset.i18nAriaLabel)); });
  root.querySelectorAll('[data-i18n-title]').forEach(node => { node.setAttribute('title', translate(node.dataset.i18nTitle)); });
  document.title = t('app.title');
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', t('app.description'));
}

/* ==================== PAPERS & SCORES ==================== */

function paperItems(paper) {
  const out = [];
  paper.sections.forEach(sec => sec.blocks.forEach(blk => blk.items.forEach(it => out.push(it))));
  return out;
}

/* Totals for a paper from a { [itemId]: n } map. Only ids that exist in the
   paper count, so marks stored against retired ids are ignored. */
function scoreTotals(paper, scores) {
  let got = 0, done = 0, count = 0;
  paperItems(paper).forEach(it => {
    count++;
    if (scores && hasOwn(scores, it.id) && scores[it.id] != null) {
      const v = Number(scores[it.id]);
      if (Number.isFinite(v)) { got += v; done++; }
    }
  });
  return { got, done, count };
}

function loadScores(key) {
  const s = store.get(LS.scores(key), {});
  return s && typeof s === 'object' && !Array.isArray(s) ? s : {};
}

/* ==================== LOGIN & NAVIGATION ==================== */

function showLogin() {
  $('#appShell').hidden = true;
  $('#loginView').hidden = false;
  $('#loginError').hidden = true;
  $('#passInput').value = '';
  window.scrollTo(0, 0);
  $('#userInput').focus();
}

function showApp() {
  $('#loginView').hidden = true;
  $('#appShell').hidden = false;
  const stored = store.get(LS.name, '');
  state.studentName = typeof stored === 'string' ? stored : '';
  $('#nameInput').value = state.studentName;
  renderChapters();
  goto('chapters');
}

function goto(view) {
  $('#chaptersView').hidden = view !== 'chapters';
  $('#paperView').hidden = view !== 'paper';
  $('#resultView').hidden = view !== 'result';
  window.scrollTo(0, 0);
}

function goHome() {
  lockAndApply();
  renderChapters();
  goto('chapters');
}

function onLoginSubmit(e) {
  e.preventDefault();
  const user = $('#userInput').value.trim();
  const pass = $('#passInput').value;
  if (user.toLowerCase() === AUTH.user.toLowerCase() && pass === AUTH.pass) {
    $('#loginError').hidden = true;
    $('#passInput').value = '';
    store.set(LS.session, true);
    showApp();
  } else {
    $('#loginError').hidden = false;
    $('#passInput').value = '';
    $('#passInput').focus();
  }
}

function logout() {
  store.del(LS.session);
  lockAndApply();
  showLogin();
}

/* ==================== MODE ==================== */

/* Practice-mode visibility (BLUEPRINT §7.3) with the hidden attribute.
   Checking mode, the gate and marking arrive in batch 2 (Tasks 7–9). */
function applyMode() {
  const on = checkMode;
  $('#checkModeBtn').textContent = on ? t('mode.unlock') : t('mode.lock');
  $('#practiceBanner').hidden = on;
  $('#revealAllBtn').hidden = !on;
  $('#clearMarksBtn').hidden = !on;
  $('#scoreBar').hidden = !on;
  $('#resultBtn').hidden = !on;
}

function lockAndApply() {
  checkMode = false;
  applyMode();
}

/* ==================== CHAPTER LIST ==================== */

function studentName() {
  return (state.studentName || '').trim() || t('chapters.defaultName');
}

function paintWho() {
  const name = studentName();
  $('#heroName').textContent = t('chapters.greeting', { name });
  $('#whoLabel').textContent = name;
}

function renderChapters() {
  paintWho();
  const sub = $('#heroSub');
  const first = DATA.papers[DATA.order[0]];
  if (sub && first) sub.textContent = t('chapters.subtitle', { marks: num(first.totalMarks) });

  const grid = $('#chapterGrid');
  grid.replaceChildren();
  let papersChecked = 0, totalGot = 0, totalMarks = 0;

  DATA.order.forEach(key => {
    const paper = DATA.papers[key];
    const tot = scoreTotals(paper, loadScores(key));
    const started = tot.done > 0;
    if (started) { papersChecked++; totalGot += tot.got; totalMarks += paper.totalMarks; }
    const isChapter = paper.chapter != null;

    const card = el('button', 'ch-card');
    card.type = 'button';
    card.dataset.paperKey = key;

    const top = el('div', 'ch-top');
    top.append(el('div', 'ch-num', isChapter ? num(paper.chapter) : t('chapter.mockBadge')));
    const box = el('div');
    box.append(el('div', 'ch-name', paper.title));
    box.append(el('div', 'ch-meta', isChapter
      ? t('chapter.card', { n: num(paper.chapter), marks: num(paper.totalMarks) })
      : t('chapter.cardMock', { marks: num(paper.totalMarks) })));
    top.append(box);
    card.append(top);

    const bar = el('div', 'ch-bar');
    const fill = el('i');
    const pct = paper.totalMarks > 0 ? (tot.got / paper.totalMarks) * 100 : 0;
    fill.style.width = Math.max(0, Math.min(100, pct)) + '%';
    bar.append(fill);
    card.append(bar);

    const status = el('div', 'ch-status');
    if (started) {
      status.append(el('span', 'done', t('chapter.score', { got: num(tot.got), marks: num(paper.totalMarks) })));
      status.append(el('span', null, t('chapter.checked', { count: num(tot.done) })));
    } else {
      status.append(el('span', null, t('chapter.notStarted')));
      status.append(el('span', null, t('chapter.start')));
    }
    card.append(status);

    card.addEventListener('click', () => openPaper(key));
    grid.append(card);
  });

  $('#overallCard').textContent = papersChecked
    ? t('chapters.overall', { count: num(papersChecked), got: num(totalGot), total: num(totalMarks) })
    : t('chapters.overallNone');
}

function onNameInput(e) {
  state.studentName = e.target.value;
  store.set(LS.name, state.studentName);
  paintWho();
}

/* ==================== PAPER ==================== */

function openPaper(key) {
  const paper = hasOwn(DATA.papers, key) ? DATA.papers[key] : null;
  if (!paper) {
    window.alert(t('paper.loadError'));
    return;
  }
  checkMode = false;
  state.paperKey = key;
  state.paper = paper;
  state.scores = loadScores(key);
  renderPaper();
  goto('paper');
}

function paperTitle(paper) {
  return paper.chapter != null
    ? t('paper.titleChapter', { n: num(paper.chapter), title: paper.title })
    : paper.title;
}

/* (Re)builds the whole paper from its data: sections in stored order, so a
   five-section paper shows five and a seven-section paper seven. */
function renderPaper() {
  const paper = state.paper;
  renderPaperHead(paper);

  state.itemById = {};
  paperItems(paper).forEach(it => { state.itemById[it.id] = it; });

  const body = $('#paperBody');
  body.replaceChildren();

  paper.sections.forEach(sec => {
    const secEl = el('section', 'section');
    const head = el('div', 'section-head');
    head.append(el('div', null, t('section.heading', { code: sec.code, title: sec.title })));
    head.append(el('span', null, t('section.marks', { marks: num(sec.marks) })));
    secEl.append(head);

    sec.blocks.forEach(blk => secEl.append(renderBlock(blk)));
    body.append(secEl);
  });

  applyMode();
}

function renderPaperHead(paper) {
  const head = $('#paperHead');
  head.replaceChildren();
  head.append(el('div', 'ph-org', t('paper.org')));
  head.append(el('div', 'ph-sub', t('paper.sub')));
  head.append(el('div', 'ph-title', paperTitle(paper)));
  head.append(el('hr', 'ph-rule'));

  const grid = el('div', 'ph-grid');
  // durationMinutes is an assumed value (v1 prd D4); the README says so.
  const hours = Math.round((paper.durationMinutes / 60) * 100) / 100;
  [
    [t('paper.class'), t('paper.classValue')],
    [t('paper.subject'), t('paper.subjectValue')],
    [t('paper.totalMarks'), num(paper.totalMarks)],
    [t('paper.time'), t('paper.timeValue', { n: num(hours) })],
    [t('paper.student'), studentName()]
  ].forEach(([label, value]) => {
    const cell = el('div');
    cell.append(el('span', null, label), document.createTextNode(' '), el('b', null, value));
    grid.append(cell);
  });
  head.append(grid);
  head.append(el('div', 'ph-note', t('paper.instructions')));
}

function renderBlock(blk) {
  const bEl = el('div', 'block');
  const bh = el('div', 'block-head');
  bh.append(el('div', 'block-num', blk.num || ''));
  bh.append(el('div', 'block-inst', blk.instruction || ''));
  bEl.append(bh);

  // A handwriting block's passage is copy text: set apart, never split in print.
  const isCopy = blk.items.some(it => it.type === 'handwriting');
  if (blk.stimulus) bEl.append(renderStimulus(blk.stimulus, isCopy));

  let prevStimulus = null;
  blk.items.forEach((it, index) => {
    bEl.append(renderItem(it, index, prevStimulus));
    prevStimulus = it.stimulus || null;
  });
  return bEl;
}

/* One item. Everything is keyed by it.id; the derived label is display-only. */
function renderItem(it, index, prevStimulus) {
  const wrap = el('div', 'item type-' + String(it.type || 'unknown').replace(/[^\w-]/g, ''));
  wrap.dataset.itemId = it.id;

  const q = el('div', 'item-q');
  const label = it.label != null && it.label !== ''
    ? it.label
    : t('item.autoLabel', { letter: String.fromCharCode(97 + (index % 26)) });
  q.append(el('div', 'item-label', label));
  q.append(renderQuestionText(it.q));
  q.append(el('div', 'item-marks', t('item.marksBadge', { marks: num(it.marks) })));
  wrap.append(q);

  if (it.stimulus && !sameStimulus(it.stimulus, prevStimulus)) {
    wrap.append(renderStimulus(it.stimulus, it.type === 'handwriting'));
  }

  const typeBody = renderTypeBody(it);
  if (typeBody) wrap.append(typeBody);
  return wrap;
}

/* Question text: newlines kept by CSS (white-space:pre-line); each run of
   underscores becomes a span.blank line that cannot wrap. Text nodes only. */
function renderQuestionText(text) {
  const node = el('div', 'item-text');
  const s = text == null ? '' : String(text);
  let last = 0;
  BLANK_RUN.lastIndex = 0;
  let m;
  while ((m = BLANK_RUN.exec(s)) !== null) {
    if (m.index > last) node.append(document.createTextNode(s.slice(last, m.index)));
    node.append(el('span', 'blank', m[0]));
    last = m.index + m[0].length;
  }
  if (last < s.length) node.append(document.createTextNode(s.slice(last)));
  return node;
}

function renderTypeBody(it) {
  switch (it.type) {
    case 'mcq':
    case 'multi-select': {
      if (!Array.isArray(it.options)) return null;
      const ol = el('ol', 'options');
      it.options.forEach(opt => ol.append(el('li', null, opt)));
      return ol;
    }
    case 'match': {
      if (!Array.isArray(it.pairs) || !it.pairs.length) return null;
      const n = it.pairs.length;
      const box = el('div', 'match');
      const leftCol = el('div');
      leftCol.append(el('div', 'match-head', t('match.leftHead')));
      const left = el('ol', 'match-left');
      it.pairs.forEach(p => left.append(el('li', null, p.left)));
      leftCol.append(left);
      // Pairs are stored in answer order. Deterministic derangement: rotate by one,
      // so no right-hand entry sits level with its partner (n >= 2 by the validator).
      const rightCol = el('div');
      rightCol.append(el('div', 'match-head', t('match.rightHead')));
      const right = el('ol', 'match-right');
      for (let i = 0; i < n; i++) right.append(el('li', null, it.pairs[(i + 1) % n].right));
      rightCol.append(right);
      box.append(leftCol, rightCol);
      return box;
    }
    case 'true-false':
      return TF_PROMPT.test(it.q || '') ? null : el('p', 'tf-hint', t('item.tfHint'));
    default:
      // fill-blank, one-word, short, long, handwriting and any other type: question only.
      return null;
  }
}

/* ==================== STIMULI ==================== */

function sameStimulus(a, b) {
  if (!a || !b) return false;
  const norm = v => (v == null ? null : v);
  return norm(a.kind) === norm(b.kind) && norm(a.text) === norm(b.text) && norm(a.asset) === norm(b.asset);
}

/* Stimuli render from kind, text and asset only. The caption, original and
   sourceRef fields are never read here: captions appear only in checking mode. */
function renderStimulus(stim, isCopy) {
  const text = stim.text == null ? '' : String(stim.text);
  switch (stim.kind) {
    case 'figure': {
      const markup = hasOwn(ASSETS, stim.asset) ? ASSETS[stim.asset] : null;
      if (typeof markup !== 'string') throw new Error('missing asset ' + stim.asset);
      figureInstance++;
      const fig = el('figure', 'stimulus stimulus-figure');
      const scroll = el('div', 'figure-scroll');
      scroll.setAttribute('role', 'img');
      scroll.setAttribute('aria-label', t('stimulus.figureLabel'));
      // Trusted build-time SVG from app/assets (not user input); ids namespaced per instance.
      scroll.innerHTML = namespaceSvgIds(stripSvgNames(markup), '-f' + figureInstance);
      fig.append(scroll);
      return fig;
    }
    case 'poem': {
      // One line element per source line; a blank source line keeps its height.
      const box = el('div', 'stimulus stimulus-poem');
      text.split('\n').forEach(line => box.append(el('span', 'poem-line', line)));
      return box;
    }
    case 'passage': {
      // A blank line starts a paragraph; single line breaks are kept (pre-line).
      const box = el('div', 'stimulus stimulus-passage' + (isCopy ? ' stimulus-copy' : ''));
      text.split(/\n[ \t]*\n/).forEach(para => box.append(el('p', null, para)));
      return box;
    }
    default: {
      // table / data / unknown: kept in columns, scrolling inside its own box.
      const box = el('div', 'stimulus stimulus-' + String(stim.kind || 'text').replace(/[^\w-]/g, ''));
      const scroll = el('div', 'layout-scroll');
      scroll.append(el('pre', null, text));
      box.append(scroll);
      return box;
    }
  }
}

/* Some assets carry their own accessible name (<title>, <desc>, role/aria-* on the
   root), which repeats the caption. The wrapper supplies the generic label, so these
   are removed from the markup before it reaches the DOM (captions: checking mode only). */
function stripSvgNames(markup) {
  return markup
    .replace(/<(title|desc)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/^<svg\b[^>]*>/i, tag => tag.replace(/\s(role|aria-[\w-]+)\s*=\s*("[^"]*"|'[^']*')/gi, '').replace(/^<svg\b/i, '<svg aria-hidden="true" focusable="false"'));
}

/* The same asset can appear several times in a paper, and some assets define
   ids. Suffix every id defined in the markup and every reference to it
   (url(#x), href="#x", xlink:href="#x") so each inserted instance is unique. */
function namespaceSvgIds(markup, suffix) {
  const ids = new Set();
  markup.replace(/\bid\s*=\s*(["'])([^"']+)\1/g, (m, q, id) => { ids.add(id); return m; });
  if (!ids.size) return markup;
  const fix = id => (ids.has(id) ? id + suffix : id);
  return markup
    .replace(/\bid\s*=\s*(["'])([^"']+)\1/g, (m, q, id) => 'id=' + q + fix(id) + q)
    .replace(/url\(\s*(["']?)#([^)"']+)\1\s*\)/g, (m, q, id) => 'url(' + q + '#' + fix(id) + q + ')')
    .replace(/\bhref\s*=\s*(["'])#([^"']+)\1/g, (m, q, id) => 'href=' + q + '#' + fix(id) + q);
}

/* ==================== BOOT ==================== */

function boot() {
  fillI18n(document);

  $('#loginForm').addEventListener('submit', onLoginSubmit);
  $('#logoutBtn').addEventListener('click', logout);
  $('#homeBtn').addEventListener('click', goHome);
  $('#backBtn').addEventListener('click', goHome);
  $('#nameInput').addEventListener('input', onNameInput);
  $('#printBtn').addEventListener('click', () => window.print());

  applyMode();
  if (store.get(LS.session, false) === true) showApp(); else showLogin();
}

boot();
