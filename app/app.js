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

function renderPaper() {
  $('#paperBody').replaceChildren();
  applyMode();
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
