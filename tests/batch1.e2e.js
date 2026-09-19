'use strict';
/* v2 batch 1 (Tasks 3–6): practice-mode shell and renderer, in real headless Chromium.
   Run: node tests/batch1.e2e.js   Screenshots: tests/screenshots/task6-*.png
   Uses a throwaway marking code; never reads .env.local. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright');
const { assemble, serve } = require('./harness.js');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(__dirname, 'screenshots');
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); };

const HIDDEN_ITEM = ['answer', 'acceptable', 'answerPoints', 'markingGuide', 'difficulty', 'skill', 'chapterSource', 'sourceChapter'];

function walkItems(paper, fn) {
  paper.sections.forEach((sec, si) => sec.blocks.forEach(b => b.items.forEach(it => fn(it, b, sec, si))));
}
const flat = v => Array.isArray(v) ? v.flatMap(flat) : (v == null ? [] : [String(v)]);

function secretStrings(paper) {
  const allowed = [];
  const secret = [];
  const stimAllowed = s => { if (s && s.text) allowed.push(s.text); };
  const stimSecret = s => { if (s) { secret.push(...flat(s.caption), ...flat(s.sourceRef)); } };
  allowed.push(paper.title);
  secret.push(...flat(paper.sourceRef));
  paper.sections.forEach(sec => {
    allowed.push(sec.title);
    sec.blocks.forEach(b => {
      allowed.push(b.instruction || '');
      stimAllowed(b.stimulus); stimSecret(b.stimulus);
      b.items.forEach(it => {
        allowed.push(it.q || '', ...flat(it.options), ...(it.pairs || []).flatMap(p => [p.left, p.right]));
        stimAllowed(it.stimulus); stimSecret(it.stimulus);
        secret.push(...flat(it.answer), ...flat(it.acceptable), ...(it.answerPoints || []).map(p => p.point),
          ...flat(it.markingGuide), ...flat(it.chapterSource), ...flat(typeof it.sourceChapter === 'string' ? it.sourceChapter : null));
      });
    });
  });
  const allowedText = allowed.join('\n');
  return [...new Set(secret)].filter(s => s.length >= 12 && !allowedText.includes(s));
}

(async () => {
  // ---------- static checks ----------
  const html = fs.readFileSync(path.join(ROOT, 'app/index.html'), 'utf8');
  const ids = ['loginView', 'appShell', 'chaptersView', 'paperView', 'resultView', 'loginForm', 'userInput', 'passInput',
    'loginError', 'whoLabel', 'homeBtn', 'logoutBtn', 'heroName', 'heroSub', 'nameInput', 'chapterGrid', 'overallCard',
    'paperHead', 'paperBody', 'backBtn', 'printBtn', 'practiceBanner', 'checkModeBtn', 'revealAllBtn', 'clearMarksBtn',
    'resultBtn', 'scoreBar', 'sbGot', 'sbTotal', 'sbDone', 'sbCount', 'sbFill', 'checkDialog', 'checkForm', 'checkTitle',
    'checkInput', 'checkError', 'checkSubmit', 'checkCancel'];
  const missing = ids.filter(id => !html.includes('id="' + id + '"'));
  check('T3 index.html has every contract id', !missing.length, missing.join(' '));
  check('T3 <dialog id="checkDialog">', /<dialog id="checkDialog"/.test(html));
  check('T3 no secret placeholder in index.html/styles.css',
    !html.includes('__SECRET_HASH__') && !fs.readFileSync(path.join(ROOT, 'app/styles.css'), 'utf8').includes('__SECRET_HASH__'));

  const js = fs.existsSync(path.join(ROOT, 'app/app.js')) ? fs.readFileSync(path.join(ROOT, 'app/app.js'), 'utf8') : '';
  check('T4 app.js: __SECRET_HASH__ exactly once', js.split('__SECRET_HASH__').length === 2);
  const banned = ['chapterSource', 'sourceChapter', 'difficulty', 'skill'].filter(w => js.includes(w));
  check('X2 (static) app.js never names chapterSource/sourceChapter/difficulty/skill', js && !banned.length, banned.join(' '));
  check('T4 app.js uses milyEnglish.* storage keys only', js.includes("'milyEnglish.") && !/milyMaths/.test(js));
  check('T4 no hard-coded login in app.js', !/'2026'/.test(js));

  const ui = JSON.parse(fs.readFileSync(path.join(ROOT, 'app/ui/en.json'), 'utf8'));
  const used = new Set([...js.matchAll(/\bt\('([\w.]+)'/g)].map(m => m[1])
    .concat([...html.matchAll(/data-i18n(?:-[a-z]+)?="([\w.]+)"/g)].map(m => m[1])));
  const missingKeys = [...used].filter(k => !(k in ui));
  check('T2 every used string key exists in en.json', !missingKeys.length, missingKeys.join(' '));

  // ---------- browser ----------
  const code = 'throwaway-' + crypto.randomBytes(8).toString('hex');
  const { html: page0, data, card } = assemble(code);
  const srv = await serve(page0);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  const consoleProblems = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') consoleProblems.push(m.type() + ': ' + m.text()); });
  page.on('pageerror', e => consoleProblems.push('pageerror: ' + e.message));
  page.on('requestfailed', r => consoleProblems.push('requestfailed: ' + r.url()));

  try {
    await page.goto(srv.url);
    await page.screenshot({ path: path.join(SHOTS, 'task6-01-login.png') });
    check('T4 login view shown on fresh load', await page.isVisible('#loginView'));
    await page.fill('#userInput', card.student_login.user);
    await page.fill('#passInput', 'wrong');
    await page.click('#loginForm button[type=submit]');
    check('T4 wrong password shows error', await page.isVisible('#loginError'));
    await page.fill('#passInput', String(card.student_login.pass));
    await page.click('#loginForm button[type=submit]');
    await page.waitForSelector('#chaptersView:not([hidden])', { timeout: 3000 }).catch(() => {});
    await page.screenshot({ path: path.join(SHOTS, 'task6-02-chapters.png'), fullPage: true });

    const cards = await page.$$eval('#chapterGrid [data-paper-key]', els => els.map(e => ({ key: e.dataset.paperKey, text: e.innerText })));
    check('T4 cards = papers from the card (' + data.order.length + ')', cards.length === data.order.length &&
      cards.every((c, i) => c.key === data.order[i]), cards.map(c => c.key).join(','));
    const titlesOk = cards.every(c => c.text.includes(data.papers[c.key].title));
    const unitLeak = cards.some(c => /Unit \d/.test(c.text));
    check('T4 cards show titles, no unit names', titlesOk && !unitLeak);

    await page.reload();
    check('T4 session persists across reload', await page.isVisible('#chaptersView'));

    for (const key of data.order) {
      const paper = data.papers[key];
      await page.click('#chapterGrid [data-paper-key="' + key + '"]');
      await page.waitForSelector('#paperView:not([hidden])');
      const n = { items: 0 }; walkItems(paper, () => n.items++);
      const got = await page.$$eval('#paperBody .item', els => els.length);
      check(key + ' renders every item (' + n.items + ')', got === n.items, 'got ' + got);
      const heads = await page.$$eval('#paperBody .section-head', els => els.map(e => e.innerText));
      check(key + ' X3 section heads = data (' + paper.sections.length + ')', heads.length === paper.sections.length &&
        paper.sections.every((s, i) => heads[i].includes(s.code) && heads[i].includes(s.title) && heads[i].includes(String(s.marks))), heads.join(' | '));
      const headText = await page.innerText('#paperHead');
      check(key + ' header: org, class, subject, marks, time, student', ['Atomic Energy Education Society', 'English', '100', '2 hours'].every(s => headText.includes(s)), headText.replace(/\s+/g, ' ').slice(0, 160));

      // hidden fields: text and attributes
      const bodyHtml = await page.$eval('#paperView', e => e.outerHTML);
      const leaks = secretStrings(paper).filter(s => bodyHtml.includes(s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')) || bodyHtml.includes(s));
      check(key + ' 7: no answer/guide/accept/caption/sourceRef text in DOM', !leaks.length, leaks.slice(0, 3).join(' || '));
      const badAttrs = await page.$$eval('#paperView *', els => els.flatMap(e => [...e.attributes]
        .filter(a => /^(data-|class$|aria-label$|title$)/.test(a.name) && /answer|accept|difficulty|skill|chaptersource|sourcechapter|caption|markingguide|sourceref|easy|medium|hard/i.test(a.name + '=' + a.value))
        .map(a => a.name + '=' + a.value)));
      check(key + ' 7: no data-/class/aria-label/title names a hidden field', !badAttrs.length, [...new Set(badAttrs)].slice(0, 5).join(' '));
      const ariaFig = await page.$$eval('#paperBody .figure-scroll', els => els.map(e => [e.getAttribute('role'), e.getAttribute('aria-label')]));
      check(key + ' figures: role=img + generic label', ariaFig.every(([r, l]) => r === 'img' && l === 'Picture for this question'), JSON.stringify(ariaFig));

      // practice mode
      const practice = await page.evaluate(() => ({
        banner: !document.getElementById('practiceBanner').hidden,
        answers: document.querySelectorAll('.answer, .stimulus-caption').length,
        reachable: [...document.querySelectorAll('#revealAllBtn,#clearMarksBtn,#scoreBar,#resultBtn,.ans-btn,.marks-row,.mk')]
          .filter(e => e.offsetParent !== null || (e.id === 'scoreBar' && !e.hidden)).length
      }));
      check(key + ' 8/9: banner on; no answers, reveal, marks, score bar, result', practice.banner && !practice.answers && !practice.reachable, JSON.stringify(practice));

      // stimuli
      const stimChecks = await page.evaluate(() => ({
        poems: [...document.querySelectorAll('#paperBody .stimulus-poem')].map(p => p.querySelectorAll('.poem-line').length),
        passages: [...document.querySelectorAll('#paperBody .stimulus-passage')].map(p => p.querySelectorAll('p').length),
        figs: [...document.querySelectorAll('#paperBody .figure-scroll svg')].map(s => { const r = s.getBoundingClientRect(); return r.width > 50 && r.height > 50; })
      }));
      const expPoems = [], expPass = [];
      let expFigs = 0;
      const seeStim = s => {
        if (!s) return;
        if (s.kind === 'poem') expPoems.push(s.text.split('\n').length);
        if (s.kind === 'passage') expPass.push(s.text.split(/\n\s*\n/).length);
        if (s.kind === 'figure') expFigs++;
      };
      paper.sections.forEach(sec => sec.blocks.forEach(b => { seeStim(b.stimulus); b.items.forEach(it => seeStim(it.stimulus)); }));
      check(key + ' X4 poem: one line element per source line', JSON.stringify(stimChecks.poems) === JSON.stringify(expPoems), JSON.stringify([stimChecks.poems, expPoems]));
      check(key + ' X4 passage: one <p> per paragraph', JSON.stringify(stimChecks.passages) === JSON.stringify(expPass), JSON.stringify([stimChecks.passages, expPass]));
      check(key + ' 26 figures render non-empty (' + expFigs + ')', stimChecks.figs.length === expFigs && stimChecks.figs.every(Boolean), JSON.stringify(stimChecks.figs));

      // q newlines, match derangement, blanks
      const qs = [];
      walkItems(paper, it => qs.push(it));
      const dom = await page.$$eval('#paperBody .item', els => els.map(e => ({
        id: e.dataset.itemId,
        text: (e.querySelector('.item-text') || {}).innerText || '',
        right: [...e.querySelectorAll('.match-right li')].map(li => li.textContent),
        opts: [...e.querySelectorAll('ol.options li')].map(li => li.textContent),
        blanks: e.querySelectorAll('.item-text .blank').length
      })));
      const byId = Object.fromEntries(dom.map(d => [d.id, d]));
      const nlBad = qs.filter(it => it.q.includes('\n') && !(byId[it.id] && byId[it.id].text.split('\n').length >= it.q.split('\n').length)).map(it => it.id);
      check(key + ' q newlines rendered as line breaks', !nlBad.length, nlBad.join(' '));
      const matchBad = qs.filter(it => it.type === 'match').filter(it => {
        const r = byId[it.id].right;
        return r.length !== it.pairs.length || r.some((txt, i) => txt === it.pairs[i].right);
      }).map(it => it.id);
      check(key + ' match: right column deranged', !matchBad.length, matchBad.join(' '));
      const blankBad = qs.filter(it => (it.q.match(/_____/g) || []).length !== byId[it.id].blanks).map(it => it.id);
      check(key + ' blanks rendered as .blank', !blankBad.length, blankBad.join(' '));
      const mcqBad = qs.filter(it => it.type === 'mcq' && JSON.stringify(byId[it.id].opts) !== JSON.stringify(it.options)).map(it => it.id);
      check(key + ' mcq options listed, none marked', !mcqBad.length, mcqBad.join(' '));

      const minFont = await page.$$eval('#paperBody .item-text, #paperBody .stimulus-passage, #paperBody .stimulus-poem',
        els => Math.min(...els.map(e => parseFloat(getComputedStyle(e).fontSize))));
      check(key + ' body text >= 16px', minFont >= 16, String(minFont));

      // 390 px, light and dark
      for (const scheme of ['light', 'dark']) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.emulateMedia({ colorScheme: scheme });
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        check(key + ' 24 no horizontal scroll at 390px (' + scheme + ')', over <= 0, 'overflow ' + over + 'px');
        if (key === 'ch1' || key === 'ch3' || key === 'hy') {
          await page.screenshot({ path: path.join(SHOTS, 'task6-03-' + key + '-390-' + scheme + '.png'), fullPage: false });
        }
      }
      await page.setViewportSize({ width: 1100, height: 900 });
      await page.emulateMedia({ colorScheme: 'light' });
      await page.click('#backBtn');
      await page.waitForSelector('#chaptersView:not([hidden])');
    }

    // figures in dark mode: stroke colour follows the theme
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.click('#chapterGrid [data-paper-key="ch1"]');
    const figColour = await page.$eval('#paperBody .figure-scroll svg', s => [getComputedStyle(s).color, getComputedStyle(s.closest('.stimulus-figure')).backgroundColor]);
    check('26 dark mode: figure currentColor is light on a dark box', /rgb\((2[0-9]{2}), (2[0-9]{2})/.test(figColour[0]), figColour.join(' on '));
    const fig = await page.$('#paperBody .stimulus-figure');
    await fig.screenshot({ path: path.join(SHOTS, 'task6-04-ch1-figure-dark.png') });
    await page.emulateMedia({ colorScheme: 'light' });

    await page.click('#logoutBtn');
    check('T4 logout returns to login', await page.isVisible('#loginView'));
    check('25 no console errors/warnings/failed requests', !consoleProblems.length, consoleProblems.slice(0, 5).join(' || '));
  } catch (e) {
    check('run completed without exception', false, e.message.split('\n')[0]);
  } finally {
    await browser.close();
    srv.close();
  }

  const failed = results.filter(r => !r.ok);
  results.forEach(r => { if (!r.ok || process.argv.includes('-v')) console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok || !r.detail ? '' : '  — ' + r.detail)); });
  const out = results.map(r => JSON.stringify(r)).join('\n');
  if (out.includes(code)) { console.log('FAIL throwaway code leaked into output'); process.exit(1); }
  console.log(results.length - failed.length + ' passed, ' + failed.length + ' failed');
  process.exit(failed.length ? 1 : 0);
})();
