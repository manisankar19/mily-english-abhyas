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
let allShown = false;   // show-all toggle state (checking mode only)
let gateBusy = false;   // a code check is in flight

/* Figure captions are held in memory, keyed by the .figure-scroll wrapper, and
   reach the DOM only as a p.stimulus-caption while checking mode is on. */
let captionOf = new WeakMap();

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

/* Practice/checking visibility (BLUEPRINT §7.3) with the hidden attribute.
   Practice mode also removes every answer panel and caption and resets show-all;
   checking mode adds a caption after each captioned figure. */
function applyMode() {
  const on = checkMode;
  const modeBtn = $('#checkModeBtn');
  modeBtn.classList.toggle('on', on);
  modeBtn.textContent = on ? t('mode.unlock') : t('mode.lock');
  $('#practiceBanner').hidden = on;
  $('#revealAllBtn').hidden = !on;
  $('#clearMarksBtn').hidden = !on;
  $('#scoreBar').hidden = !on;
  $('#resultBtn').hidden = !on;

  document.querySelectorAll('#paperBody .item-tools, #paperBody .ans-btn, #paperBody .marks-row')
    .forEach(node => { node.hidden = !on; });

  if (on) {
    addCaptions();
    updateScore();
  } else {
    removeCaptions();
    hideAllAnswers();
  }
}

function lockAndApply() {
  checkMode = false;
  applyMode();
}

function addCaptions() {
  document.querySelectorAll('#paperBody .figure-scroll').forEach(wrap => {
    const caption = captionOf.get(wrap);
    if (!caption) return;
    const next = wrap.nextElementSibling;
    if (next && next.classList.contains('stimulus-caption')) return;
    wrap.after(el('p', 'stimulus-caption', t('stimulus.captionTag') + ' ' + caption));
  });
}

function removeCaptions() {
  document.querySelectorAll('.stimulus-caption').forEach(node => node.remove());
}

/* ==================== CHECKING-MODE GATE ==================== */

async function sha256Hex(str) {
  const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Toggling off never re-asks; toggling on always opens the gate.
function onCheckModeClick() {
  if (checkMode) {
    lockAndApply();
    return;
  }
  const dialog = $('#checkDialog');
  $('#checkInput').value = '';
  $('#checkError').hidden = true;
  if (!dialog.open) dialog.showModal();
  $('#checkInput').focus();
}

function showGateError(message) {
  const err = $('#checkError');
  err.textContent = message;
  err.hidden = false;
}

async function onCheckSubmit(e) {
  e.preventDefault();
  if (gateBusy) return;
  const dialog = $('#checkDialog');
  const input = $('#checkInput');

  if (!(window.crypto && window.crypto.subtle)) {
    input.value = '';
    showGateError(t('mode.insecure'));
    return;
  }

  gateBusy = true;
  $('#checkSubmit').disabled = true;
  let match = false;
  try {
    match = (await sha256Hex(input.value.trim())) === SECRET_HASH;
  } catch (err) {
    match = false;
  } finally {
    gateBusy = false;
    $('#checkSubmit').disabled = false;
  }
  if (!dialog.open) return; // closed while hashing: unlock nothing

  if (match) {
    dialog.close();
    checkMode = true;
    applyMode();
  } else {
    showGateError(t('mode.wrongCode'));
    input.value = '';
    input.focus();
  }
}

// Close only for a click on the backdrop: the target is the dialog itself and
// the point lies outside its box (a click on its own padding keeps it open).
function onDialogClick(e) {
  const dialog = $('#checkDialog');
  if (e.target !== dialog) return;
  const r = dialog.getBoundingClientRect();
  const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  if (!inside) closeGate();
}

function closeGate() {
  const dialog = $('#checkDialog');
  if (dialog.open) dialog.close();
  onDialogClose();
}

function onDialogClose() {
  $('#checkInput').value = '';
  $('#checkError').hidden = true;
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
  allShown = false;
  captionOf = new WeakMap();
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

  wrap.append(renderItemTools(it, wrap));
  if (hasMark(it.id)) wrap.classList.add('scored');
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

/* ==================== ANSWERS ==================== */

function renderItemTools(it, wrap) {
  const tools = el('div', 'item-tools');
  tools.hidden = !checkMode;

  const ansBtn = el('button', 'ans-btn', t('answer.show'));
  ansBtn.type = 'button';
  ansBtn.hidden = !checkMode;
  ansBtn.setAttribute('aria-expanded', 'false');
  ansBtn.addEventListener('click', () => toggleAnswer(wrap));
  tools.append(ansBtn);

  tools.append(renderMarksRow(it, wrap));
  return tools;
}

function answerPanelOf(wrap) {
  return wrap.querySelector(':scope > .answer');
}

function answerText(answer) {
  if (Array.isArray(answer)) return answer.map((a, i) => num(i + 1) + '. ' + flatText(a)).join('\n');
  return answer == null ? '' : String(answer);
}

function flatText(v) {
  return Array.isArray(v) ? v.map(flatText).join(' / ') : String(v);
}

/* "Also accept": a flat list is one blank's variants; a list of lists is one
   list per blank (multi-blank), each li prefixed "Blank n:". */
function renderAccept(acceptable) {
  if (!Array.isArray(acceptable) || !acceptable.length) return null;
  const box = el('div', 'ans-accept');
  box.append(el('b', null, t('answer.accept')));
  const list = el('ul');
  if (acceptable.some(Array.isArray)) {
    acceptable.forEach((variants, i) => {
      list.append(el('li', null, t('answer.acceptBlank', { n: num(i + 1) }) + ' ' + flatText(variants)));
    });
  } else {
    list.append(el('li', null, acceptable.map(String).join(' / ')));
  }
  box.append(list);
  return box;
}

/* Answer panels exist only while revealed: created here, removed on hide, on
   re-lock and on every re-render. */
function showAnswer(wrap) {
  if (!checkMode || answerPanelOf(wrap)) return;
  const it = hasOwn(state.itemById, wrap.dataset.itemId) ? state.itemById[wrap.dataset.itemId] : null;
  if (!it) return;

  const panel = el('div', 'answer');
  if (it.answer != null && it.answer !== '') {
    panel.append(el('b', 'ans-tag', t('answer.tag')));
    panel.append(el('div', 'ans-text', answerText(it.answer)));
  }

  if (Array.isArray(it.answerPoints) && it.answerPoints.length) {
    const points = el('div', 'ans-points');
    points.append(el('b', null, t('answer.points')));
    const list = el('ul');
    it.answerPoints.forEach(p => {
      list.append(el('li', null, p.point + ' — ' + t('answer.pointMarks', { marks: num(p.marks) })));
    });
    points.append(list);
    panel.append(points);
  }

  if (it.markingGuide) {
    const guide = el('div', 'ans-guide');
    guide.append(el('b', null, t('answer.guide')));
    guide.append(el('p', null, String(it.markingGuide)));
    panel.append(guide);
  }

  // Any item whose data lists acceptable variants shows them (fill-blank and one-word
  // always do; two Ch 3 short items list one set per sign), so a fair variant is not marked wrong.
  const acc = renderAccept(it.acceptable);
  if (acc) panel.append(acc);

  if (it.type === 'match' && Array.isArray(it.pairs) && it.pairs.length) {
    const pairs = el('div', 'ans-pairs');
    pairs.append(el('b', null, t('answer.pairs')));
    const list = el('ol');
    it.pairs.forEach(p => list.append(el('li', null, p.left + ' — ' + p.right)));
    pairs.append(list);
    panel.append(pairs);
  }

  wrap.querySelector(':scope > .item-tools').after(panel);
  setAnswerButton(wrap, true);
}

function hideAnswer(wrap) {
  const panel = answerPanelOf(wrap);
  if (panel) panel.remove();
  setAnswerButton(wrap, false);
}

function setAnswerButton(wrap, shown) {
  const btn = wrap.querySelector(':scope > .item-tools .ans-btn');
  if (!btn) return;
  btn.textContent = shown ? t('answer.hide') : t('answer.show');
  btn.setAttribute('aria-expanded', shown ? 'true' : 'false');
}

function toggleAnswer(wrap) {
  if (answerPanelOf(wrap)) hideAnswer(wrap); else showAnswer(wrap);
}

function hideAllAnswers() {
  document.querySelectorAll('#paperBody .item').forEach(hideAnswer);
  document.querySelectorAll('.answer').forEach(node => node.remove());
  allShown = false;
  $('#revealAllBtn').textContent = t('answer.showAll');
}

function onRevealAll() {
  if (!checkMode) return;
  if (allShown) {
    hideAllAnswers();
    return;
  }
  document.querySelectorAll('#paperBody .item').forEach(showAnswer);
  allShown = true;
  $('#revealAllBtn').textContent = t('answer.hideAll');
}

/* ==================== MARKS & SCORE ==================== */

function hasMark(id) {
  return hasOwn(state.scores, id) && state.scores[id] != null && Number.isFinite(Number(state.scores[id]));
}

function renderMarksRow(it, wrap) {
  const row = el('div', 'marks-row');
  row.hidden = !checkMode;
  row.append(el('span', null, t('marks.label')));
  const current = hasMark(it.id) ? Number(state.scores[it.id]) : null;
  for (let v = 0; v <= it.marks; v++) {
    const b = el('button', 'mk', num(v));
    b.type = 'button';
    b.dataset.val = String(v);
    if (current === v) b.classList.add('on');
    b.addEventListener('click', () => setMark(it.id, v, row, wrap));
    row.append(b);
  }
  const clear = el('button', 'mk mk-clear');
  clear.type = 'button';
  clear.title = t('marks.clearItem');
  clear.setAttribute('aria-label', t('marks.clearItem'));
  clear.addEventListener('click', () => setMark(it.id, null, row, wrap));
  row.append(clear);
  return row;
}

// Marks are keyed by item id only and written on every change.
function setMark(id, val, row, wrap) {
  if (!checkMode || !state.paper || !hasOwn(state.itemById, id)) return;
  if (val === null) delete state.scores[id];
  else state.scores[id] = val;
  wrap.classList.toggle('scored', val !== null);
  row.querySelectorAll('.mk[data-val]').forEach(b => b.classList.toggle('on', val !== null && Number(b.dataset.val) === val));
  store.set(LS.scores(state.paperKey), state.scores);
  updateScore();
}

function updateScore() {
  const paper = state.paper;
  if (!paper) return;
  const tot = scoreTotals(paper, state.scores);
  $('#sbGot').textContent = num(tot.got);
  $('#sbTotal').textContent = num(paper.totalMarks);
  $('#sbDone').textContent = num(tot.done);
  $('#sbCount').textContent = num(tot.count);
  const pct = paper.totalMarks > 0 ? (tot.got / paper.totalMarks) * 100 : 0;
  $('#sbFill').style.width = Math.max(0, Math.min(100, pct)) + '%';
}

function onClearMarks() {
  if (!checkMode || !state.paper) return;
  if (!window.confirm(t('marks.clearConfirm'))) return;
  store.del(LS.scores(state.paperKey));
  state.scores = {};
  renderPaper(); // stays in checking mode
}

/* ==================== RESULT ==================== */

// Bands apply to the rounded percentage.
function gradeFor(pct) {
  if (pct >= 90) return { grade: t('grade.aplus'), msg: t('grade.aplusMsg') };
  if (pct >= 75) return { grade: t('grade.a'), msg: t('grade.aMsg') };
  if (pct >= 60) return { grade: t('grade.b'), msg: t('grade.bMsg') };
  if (pct >= 40) return { grade: t('grade.c'), msg: t('grade.cMsg') };
  return { grade: t('grade.d'), msg: t('grade.dMsg') };
}

// One decimal; String() of a whole number has no ".0" (87 → "87", 86.5 → "86.5").
function roundPct(got, total) {
  return total > 0 ? Math.round((got / total) * 1000) / 10 : 0;
}

/* Built from paper.sections in stored order: five rows for a five-section
   paper, seven for seven. Titles as stored. */
function renderResult() {
  const paper = state.paper;
  if (!paper || !checkMode) return;

  const tot = scoreTotals(paper, state.scores);
  const pct = roundPct(tot.got, paper.totalMarks);
  const gr = gradeFor(pct);

  const card = el('div', 'result-card');
  card.append(el('h2', 'rc-title', t('result.title')));
  card.append(el('p', 'rc-for', t('result.for', { name: studentName(), title: paperTitle(paper) })));

  const score = el('div', 'rc-score');
  score.append(document.createTextNode(num(tot.got)), el('small', null, ' / ' + num(paper.totalMarks)));
  card.append(score);
  card.append(el('div', 'rc-pct', num(pct) + '%'));
  card.append(el('div', 'rc-grade', gr.grade));
  card.append(el('p', 'rc-note', gr.msg));
  if (tot.done < tot.count) {
    card.append(el('p', 'rc-note warn', t('result.unmarked', { count: num(tot.count - tot.done) })));
  }

  const table = el('table', 'rc-table');
  const thead = el('thead');
  const hr = el('tr');
  [t('result.colSection'), t('result.colTitle'), t('result.colChecked'), t('result.colScore')]
    .forEach(label => hr.append(el('th', null, label)));
  thead.append(hr);
  const tbody = el('tbody');
  paper.sections.forEach(sec => {
    const s = scoreTotals({ sections: [sec] }, state.scores);
    const tr = el('tr');
    tr.dataset.section = sec.code;
    tr.append(
      el('td', null, sec.code),
      el('td', null, sec.title),
      el('td', null, num(s.done) + '/' + num(s.count)),
      el('td', null, num(s.got) + ' / ' + num(sec.marks))
    );
    tbody.append(tr);
  });
  const total = el('tr', 'rc-total');
  total.append(
    el('td', null, ''),
    el('td', null, t('result.total')),
    el('td', null, num(tot.done) + '/' + num(tot.count)),
    el('td', null, num(tot.got) + ' / ' + num(paper.totalMarks))
  );
  tbody.append(total);
  table.append(thead, tbody);
  card.append(table);

  const actions = el('div', 'rc-actions');
  const back = el('button', 'btn btn-ghost', t('result.back'));
  back.type = 'button';
  back.addEventListener('click', () => goto('paper')); // keeps checking mode
  const print = el('button', 'btn btn-ghost', t('result.print'));
  print.type = 'button';
  print.addEventListener('click', () => window.print());
  const home = el('button', 'btn btn-primary', t('result.home'));
  home.type = 'button';
  home.addEventListener('click', goHome); // resets checking mode
  actions.append(back, print, home);
  card.append(actions);

  $('#resultView').replaceChildren(card);
  goto('result');
}

/* ==================== STIMULI ==================== */

function sameStimulus(a, b) {
  if (!a || !b) return false;
  const norm = v => (v == null ? null : v);
  return norm(a.kind) === norm(b.kind) && norm(a.text) === norm(b.text) && norm(a.asset) === norm(b.asset);
}

/* Stimuli render from kind, text and asset. A figure's caption is kept in memory
   (captionOf) and never written to the DOM here: captions appear only in checking mode. */
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
      if (stim.caption) captionOf.set(scroll, String(stim.caption));
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
  $('#revealAllBtn').addEventListener('click', onRevealAll);
  $('#clearMarksBtn').addEventListener('click', onClearMarks);
  $('#resultBtn').addEventListener('click', renderResult);

  const dialog = $('#checkDialog');
  $('#checkModeBtn').addEventListener('click', onCheckModeClick);
  $('#checkForm').addEventListener('submit', onCheckSubmit);
  $('#checkCancel').addEventListener('click', closeGate);
  dialog.addEventListener('click', onDialogClick);
  dialog.addEventListener('close', onDialogClose);

  applyMode();
  if (store.get(LS.session, false) === true) showApp(); else showLogin();
}

boot();
