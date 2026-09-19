'use strict';
/* v2 batch 2 (Tasks 7–9): gate, checking mode, answer panels, captions, marks, score bar, result.
   Run: node tests/batch2.e2e.js   Screenshots: tests/screenshots/task7-*, task8-*, task9-*.png
   Uses a random throwaway marking code; never reads .env.local. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');
const { assemble, serve } = require('./harness.js');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(__dirname, 'screenshots');
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); };

const items = paper => paper.sections.flatMap(s => s.blocks.flatMap(b => b.items));
const flat = v => Array.isArray(v) ? v.flatMap(flat) : (v == null ? [] : [String(v)]);
const pctStr = (got, total) => String(Math.round((got / total) * 1000) / 10);

(async () => {
  const js = fs.readFileSync(path.join(ROOT, 'app/app.js'), 'utf8');
  check('static: __SECRET_HASH__ exactly once', js.split('__SECRET_HASH__').length === 2);
  const banned = ['chapterSource', 'sourceChapter', 'difficulty', 'skill'].filter(w => js.includes(w));
  check('static X2: no banned field names', !banned.length, banned.join(' '));
  check('static: one innerHTML (trusted SVG)', (js.match(/\.innerHTML\s*=/g) || []).length === 1);
  const ui = JSON.parse(fs.readFileSync(path.join(ROOT, 'app/ui/en.json'), 'utf8'));
  const missingKeys = [...js.matchAll(/\bt\('([\w.]+)'/g)].map(m => m[1]).filter(k => !(k in ui));
  check('static: every t() key exists', !missingKeys.length, missingKeys.join(' '));

  const code = 'throwaway-' + crypto.randomBytes(8).toString('hex');
  const { html, data, card } = assemble(code);
  const srv = await serve(html);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') problems.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('dialog', d => d.accept());

  const login = async p => {
    await p.goto(srv.url);
    await p.fill('#userInput', card.student_login.user);
    await p.fill('#passInput', String(card.student_login.pass));
    await p.click('#loginForm button[type=submit]');
    await p.waitForSelector('#chaptersView:not([hidden])');
  };
  const open = async (p, key) => {
    await p.click('#chapterGrid [data-paper-key="' + key + '"]');
    await p.waitForSelector('#paperView:not([hidden])');
  };
  const dialogOpen = p => p.$eval('#checkDialog', d => d.open);
  const unlock = async (p, c) => {
    await p.click('#checkModeBtn');
    await p.fill('#checkInput', c);
    await p.click('#checkSubmit');
    await p.waitForTimeout(150);
  };
  const isPractice = p => p.evaluate(() => ({
    on: document.getElementById('checkModeBtn').classList.contains('on'),
    banner: !document.getElementById('practiceBanner').hidden,
    panels: document.querySelectorAll('.answer, .stimulus-caption').length,
    shown: [...document.querySelectorAll('#revealAllBtn,#clearMarksBtn,#scoreBar,#resultBtn,.item-tools,.marks-row,.ans-btn')].filter(e => !e.hidden).length
  }));
  const practiceOk = s => !s.on && s.banner && !s.panels && !s.shown;

  try {
    await login(page);
    await open(page, 'ch1');

    // ---------- Task 7: gate ----------
    await page.click('#checkModeBtn');
    check('T7 button opens modal dialog', await dialogOpen(page) && await page.$eval('#checkDialog', d => d.matches(':modal')));
    await page.screenshot({ path: path.join(SHOTS, 'task7-01-gate.png') });
    await page.keyboard.press('Escape');
    check('T7 Escape closes, practice stays', !(await dialogOpen(page)) && practiceOk(await isPractice(page)));
    await page.click('#checkModeBtn');
    await page.click('#checkCancel');
    check('T7 Cancel closes, practice stays', !(await dialogOpen(page)) && practiceOk(await isPractice(page)));
    await page.click('#checkModeBtn');
    await page.mouse.click(5, 5);
    check('T7 backdrop click closes, practice stays', !(await dialogOpen(page)) && practiceOk(await isPractice(page)));
    await page.click('#checkModeBtn');
    await page.fill('#checkInput', 'wrong-code');
    await page.click('#checkSubmit');
    await page.waitForTimeout(150);
    const wrong = await page.evaluate(() => ({ open: document.getElementById('checkDialog').open, err: document.getElementById('checkError'), v: document.getElementById('checkInput').value }))
      .catch(() => null);
    const errText = await page.$eval('#checkError', e => e.hidden ? '' : e.textContent);
    check('T7 wrong code: error, field cleared, dialog open, locked', wrong && wrong.open && wrong.v === '' && errText === ui['mode.wrongCode'] && practiceOk(await isPractice(page)), errText);
    await page.screenshot({ path: path.join(SHOTS, 'task7-02-wrong.png') });
    await page.fill('#checkInput', '  ' + code + '  ');
    await page.click('#checkSubmit');
    await page.waitForTimeout(150);
    const unlocked = await isPractice(page);
    check('T7 right code (trimmed) unlocks', !(await dialogOpen(page)) && unlocked.on && !unlocked.banner && unlocked.shown > 0, JSON.stringify(unlocked));
    check('T7 checking mode not persisted', await page.evaluate(() => !JSON.stringify(localStorage).includes('check') && !sessionStorage.length && !document.cookie && !location.hash && !location.search));
    await page.screenshot({ path: path.join(SHOTS, 'task7-03-unlocked.png') });
    await page.click('#checkModeBtn');
    check('T7 toggle off does not re-ask', !(await dialogOpen(page)) && practiceOk(await isPractice(page)));

    // X1: no crypto.subtle
    const ctx2 = await browser.newContext();
    await ctx2.addInitScript(() => { try { Object.defineProperty(window.crypto, 'subtle', { value: undefined, configurable: true }); } catch (e) { /* ignore */ } try { delete Crypto.prototype.subtle; } catch (e) { /* ignore */ } });
    const p2 = await ctx2.newPage();
    await login(p2);
    await open(p2, 'ch1');
    check('X1 crypto.subtle removed in test context', await p2.evaluate(() => !(window.crypto && window.crypto.subtle)));
    await unlock(p2, code);
    const insecure = await p2.$eval('#checkError', e => e.hidden ? '' : e.textContent);
    check('X1 insecure context: mode.insecure shown, nothing unlocks', insecure === ui['mode.insecure'] && practiceOk(await isPractice(p2)), insecure);
    await p2.screenshot({ path: path.join(SHOTS, 'task7-04-insecure.png') });
    await ctx2.close();

    // ---------- Task 8: answer panels & captions ----------
    // Pick one item of each type (and a multi-blank fill-blank, and a figure caption) across papers.
    const want = ['short', 'fill-blank', 'multi-blank', 'one-word', 'mcq', 'true-false', 'long', 'handwriting', 'match'];
    const picks = {};
    for (const key of data.order) {
      items(data.papers[key]).forEach(it => {
        const kind = it.type === 'fill-blank' && Array.isArray(it.answer) ? 'multi-blank' : it.type;
        if (want.includes(kind) && !picks[kind]) picks[kind] = { key, it };
      });
    }
    check('T8 fixture: every type found', want.every(k => picks[k]), want.filter(k => !picks[k]).join(' '));
    for (const kind of want) {
      if (!picks[kind]) continue;
      const { key, it } = picks[kind];
      await page.click('#homeBtn');
      await open(page, key);
      await unlock(page, code);
      const sel = '#paperBody .item[data-item-id="' + it.id + '"]';
      await page.click(sel + ' .ans-btn');
      const panel = await page.$eval(sel, w => {
        const a = w.querySelector(':scope > .answer');
        if (!a) return null;
        return {
          afterTools: a.previousElementSibling && a.previousElementSibling.classList.contains('item-tools'),
          expanded: w.querySelector('.ans-btn').getAttribute('aria-expanded'),
          order: [...a.children].map(c => c.className),
          text: (a.querySelector('.ans-text') || {}).textContent || '',
          points: [...a.querySelectorAll('.ans-points li')].map(l => l.textContent),
          guideB: (a.querySelector('.ans-guide b') || {}).textContent,
          guide: (a.querySelector('.ans-guide p') || {}).textContent,
          accept: [...a.querySelectorAll('.ans-accept li')].map(l => l.textContent),
          pairs: [...a.querySelectorAll('.ans-pairs li')].map(l => l.textContent)
        };
      });
      const exp = ['ans-tag', 'ans-text'];
      if (it.answerPoints && it.answerPoints.length) exp.push('ans-points');
      if (it.markingGuide) exp.push('ans-guide');
      if ((it.type === 'fill-blank' || it.type === 'one-word') && it.acceptable && it.acceptable.length) exp.push('ans-accept');
      if (it.type === 'match') exp.push('ans-pairs');
      let ok = panel && panel.afterTools && panel.expanded === 'true' && JSON.stringify(panel.order) === JSON.stringify(exp);
      if (ok && Array.isArray(it.answer)) ok = it.answer.every((a, i) => panel.text.includes((i + 1) + '. ' + flat(a).join(' / ')));
      else if (ok) ok = panel.text === String(it.answer);
      if (ok && it.answerPoints) ok = it.answerPoints.every((p, i) => panel.points[i] === p.point + ' — ' + p.marks + ' mark(s)');
      if (ok && it.markingGuide) ok = panel.guideB === ui['answer.guide'] && panel.guide === it.markingGuide;
      if (ok && exp.includes('ans-accept')) {
        ok = it.acceptable.some(Array.isArray)
          ? panel.accept.length === it.acceptable.length && it.acceptable.every((v, i) => panel.accept[i] === 'Blank ' + (i + 1) + ': ' + flat(v).join(' / '))
          : panel.accept.length === 1 && panel.accept[0] === it.acceptable.join(' / ');
      }
      if (ok && it.type === 'match') ok = JSON.stringify(panel.pairs) === JSON.stringify(it.pairs.map(p => p.left + ' — ' + p.right));
      check('T8 reveal ' + kind + ' (' + key + ' ' + it.id + ')', ok, JSON.stringify(panel).slice(0, 300));
      if (kind === 'multi-blank' || kind === 'match' || kind === 'long') {
        await (await page.$(sel)).screenshot({ path: path.join(SHOTS, 'task8-0' + (want.indexOf(kind)) + '-' + kind + '.png') });
      }
      await page.click(sel + ' .ans-btn');
      check('T8 hide ' + kind + ' removes panel', await page.$eval(sel, w => !w.querySelector('.answer') && w.querySelector('.ans-btn').getAttribute('aria-expanded') === 'false'));
    }

    // captions + show-all / hide-all on a paper with a figure caption
    const capKey = data.order.find(k => data.papers[k].sections.some(s => s.blocks.some(b => (b.stimulus && b.stimulus.caption) || b.items.some(i => i.stimulus && i.stimulus.caption))));
    await page.click('#homeBtn');
    await open(page, capKey);
    const capPractice = await page.$$eval('.stimulus-caption', e => e.length);
    await unlock(page, code);
    const caps = await page.$$eval('#paperBody .stimulus-caption', els => els.map(e => ({ after: e.previousElementSibling && e.previousElementSibling.classList.contains('figure-scroll'), inFig: e.parentElement.tagName === 'FIGURE', text: e.textContent })));
    const expCaps = [];
    data.papers[capKey].sections.forEach(s => s.blocks.forEach(b => { if (b.stimulus && b.stimulus.caption) expCaps.push(b.stimulus.caption); b.items.forEach(i => { if (i.stimulus && i.stimulus.caption) expCaps.push(i.stimulus.caption); }); }));
    check('T8 captions: none in practice, after figure in checking (' + capKey + ')', capPractice === 0 && caps.length >= 1 && caps.every(c => c.after && c.inFig && c.text.startsWith(ui['stimulus.captionTag'] + ' ')) && expCaps.every(c => caps.some(x => x.text.endsWith(c))), JSON.stringify(caps).slice(0, 200));
    const labels = await page.$$eval('#paperBody .figure-scroll', els => els.map(e => e.getAttribute('aria-label')));
    check('T8 figure aria-label stays generic in checking mode', labels.every(l => l === ui['stimulus.figureLabel']));
    const attrLeak = await page.evaluate(caps => [...document.querySelectorAll('#paperView *')].some(e => [...e.attributes].some(a => caps.some(c => a.value.includes(c)))), expCaps);
    check('T8 caption never in an attribute', !attrLeak);
    await (await page.$('#paperBody .stimulus-figure')).screenshot({ path: path.join(SHOTS, 'task8-10-caption.png') });

    await page.click('#revealAllBtn');
    const nItems = items(data.papers[capKey]).length;
    const all = await page.evaluate(() => ({ a: document.querySelectorAll('#paperBody .answer').length, b: document.getElementById('revealAllBtn').textContent }));
    check('T8 show-all: one panel per item', all.a === nItems && all.b === ui['answer.hideAll'], JSON.stringify(all));
    await page.screenshot({ path: path.join(SHOTS, 'task8-11-show-all.png') });
    await page.click('#revealAllBtn');
    check('T8 hide-all removes every panel', await page.evaluate(t => !document.querySelectorAll('.answer').length && document.getElementById('revealAllBtn').textContent === t, ui['answer.showAll']));
    await page.click('#revealAllBtn');
    await page.click('#checkModeBtn');
    check('T8 re-lock removes every .answer and .stimulus-caption', practiceOk(await isPractice(page)));

    // resets: back, home, other paper, reload, logout
    const resets = {
      back: async () => { await page.click('#backBtn'); await open(page, 'ch1'); },
      home: async () => { await page.click('#homeBtn'); await open(page, 'ch1'); },
      otherPaper: async () => { await page.click('#homeBtn'); await open(page, 'ch2'); },
      reload: async () => { await page.reload(); await open(page, 'ch1'); },
      logout: async () => { await page.click('#logoutBtn'); await login(page); await open(page, 'ch1'); }
    };
    await page.click('#homeBtn');
    await open(page, 'ch1');
    for (const [name, fn] of Object.entries(resets)) {
      await unlock(page, code);
      await page.click('#revealAllBtn');
      await fn();
      check('T7 ' + name + ' returns to practice', practiceOk(await isPractice(page)));
      if (await page.isVisible('#chaptersView')) await open(page, 'ch1');
    }

    // ---------- Task 9: marks, score bar, result ----------
    for (const key of data.order) {
      const paper = data.papers[key];
      await page.click('#homeBtn');
      await open(page, key);
      await unlock(page, code);
      await page.evaluate(() => document.querySelectorAll('#paperBody .item').forEach(w => {
        const bs = w.querySelectorAll('.mk[data-val]'); bs[bs.length - 1].click();
      }));
      const n = items(paper).length;
      const sb = await page.evaluate(() => ['sbGot', 'sbTotal', 'sbDone', 'sbCount'].map(i => document.getElementById(i).textContent).concat(document.getElementById('sbFill').style.width));
      check('T9 ' + key + ' full marks score bar', JSON.stringify(sb) === JSON.stringify([String(paper.totalMarks), String(paper.totalMarks), String(n), String(n), '100%']), sb.join(','));
      check('T9 ' + key + ' all items .scored', await page.$$eval('#paperBody .item.scored', e => e.length) === n);
      await page.click('#resultBtn');
      const r = await page.evaluate(() => ({
        pct: document.querySelector('.rc-pct').textContent,
        grade: document.querySelector('.rc-grade').textContent,
        warn: document.querySelectorAll('.rc-note.warn').length,
        rows: [...document.querySelectorAll('.rc-table tr[data-section]')].map(tr => [tr.dataset.section, ...[...tr.cells].map(c => c.textContent)])
      }));
      const expRows = paper.sections.map(s => { const c = s.blocks.flatMap(b => b.items).length; return [s.code, s.code, s.title, c + '/' + c, s.marks + ' / ' + s.marks]; });
      check('T9 ' + key + ' result 100%, A+, rows = sections (' + paper.sections.length + ')', r.pct === '100%' && r.grade === ui['grade.aplus'] && !r.warn && JSON.stringify(r.rows) === JSON.stringify(expRows), JSON.stringify(r).slice(0, 300));
      if (key === 'ch3') await page.screenshot({ path: path.join(SHOTS, 'task9-01-result-full-' + key + '.png'), fullPage: true });
      await page.click('.rc-actions .btn-ghost');
      check('T9 ' + key + ' result back keeps checking mode', await page.isVisible('#paperView') && (await isPractice(page)).on);
    }

    // mixed marking of ch1 and ch2
    for (const key of ['ch1', 'ch2']) {
      const paper = data.papers[key];
      await page.click('#homeBtn');
      await open(page, key);
      await unlock(page, code);
      await page.click('#clearMarksBtn');
      check('T9 ' + key + ' clear marks empties storage', await page.evaluate(k => !localStorage.getItem('milyEnglish.scores.' + k) && !document.querySelector('.item.scored'), key));
      const marks = {};
      const its = items(paper);
      its.forEach((it, i) => { if (i % 5 !== 4) marks[it.id] = (i * 7) % (it.marks + 1); });
      for (const [id, v] of Object.entries(marks)) await page.click('#paperBody .item[data-item-id="' + id + '"] .mk[data-val="' + v + '"]');
      // one set-then-clear
      const cid = its[0].id;
      await page.click('#paperBody .item[data-item-id="' + cid + '"] .mk[data-val="0"]');
      await page.click('#paperBody .item[data-item-id="' + cid + '"] .mk-clear');
      delete marks[cid];
      const stored = await page.evaluate(k => JSON.parse(localStorage.getItem('milyEnglish.scores.' + k)), key);
      check('T9 ' + key + ' storage keyed by item id', JSON.stringify(Object.keys(stored).sort()) === JSON.stringify(Object.keys(marks).sort()) && Object.entries(marks).every(([id, v]) => stored[id] === v));
      await page.click('#resultBtn');
      const got = Object.values(marks).reduce((a, b) => a + b, 0);
      const pct = pctStr(got, paper.totalMarks);
      const pv = Number(pct);
      const grade = pv >= 90 ? 'grade.aplus' : pv >= 75 ? 'grade.a' : pv >= 60 ? 'grade.b' : pv >= 40 ? 'grade.c' : 'grade.d';
      const r = await page.evaluate(() => ({
        pct: document.querySelector('.rc-pct').textContent,
        grade: document.querySelector('.rc-grade').textContent,
        warn: (document.querySelector('.rc-note.warn') || {}).textContent,
        rows: [...document.querySelectorAll('.rc-table tbody tr')].map(tr => [...tr.cells].map(c => c.textContent))
      }));
      const exp = paper.sections.map(s => {
        const si = s.blocks.flatMap(b => b.items);
        const d = si.filter(i => i.id in marks);
        return [s.code, s.title, d.length + '/' + si.length, d.reduce((a, i) => a + marks[i.id], 0) + ' / ' + s.marks];
      });
      exp.push(['', ui['result.total'], Object.keys(marks).length + '/' + its.length, got + ' / ' + paper.totalMarks]);
      const unm = its.length - Object.keys(marks).length;
      check('T9 ' + key + ' mixed result = recomputed from JSON (' + got + ', ' + pct + '%)', r.pct === pct + '%' && r.grade === ui[grade] &&
        r.warn === ui['result.unmarked'].replace('{count}', unm) && JSON.stringify(r.rows) === JSON.stringify(exp), JSON.stringify(r).slice(0, 400));
      await page.screenshot({ path: path.join(SHOTS, 'task9-02-result-mixed-' + key + '.png'), fullPage: true });
      await page.click('.rc-actions .btn-primary');
      check('T9 ' + key + ' result home resets checking mode', await page.isVisible('#chaptersView') && !(await page.$eval('#checkModeBtn', b => b.classList.contains('on'))));
      marks.__key = key; picks['mixed-' + key] = marks;
    }
    await page.reload();
    const cardText = await page.$eval('#chapterGrid [data-paper-key="ch1"]', e => e.innerText);
    const m1 = picks['mixed-ch1']; delete m1.__key;
    const g1 = Object.values(m1).reduce((a, b) => a + b, 0);
    check('T9 marks survive reload (card shows score)', cardText.includes('Score ' + g1 + '/' + data.papers.ch1.totalMarks), cardText.replace(/\s+/g, ' '));
    await open(page, 'ch1');
    await unlock(page, code);
    const onCount = await page.$$eval('#paperBody .mk.on', e => e.length);
    check('T9 marks restored on buttons after reload', onCount === Object.keys(m1).length, onCount + ' vs ' + Object.keys(m1).length);
    await page.screenshot({ path: path.join(SHOTS, 'task9-03-marks-reloaded.png') });

    check('0 console errors/warnings', !problems.length, problems.slice(0, 5).join(' || '));
  } catch (e) {
    check('run completed without exception', false, e.message.split('\n')[0]);
  } finally {
    await browser.close();
    srv.close();
  }

  const failed = results.filter(r => !r.ok);
  results.forEach(r => { if (!r.ok || process.argv.includes('-v')) console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok || !r.detail ? '' : '  — ' + r.detail)); });
  if (results.map(r => JSON.stringify(r)).join('\n').includes(code)) { console.log('FAIL throwaway code leaked into output'); process.exit(1); }
  console.log(results.length - failed.length + ' passed, ' + failed.length + ' failed');
  process.exit(failed.length ? 1 : 0);
})();
