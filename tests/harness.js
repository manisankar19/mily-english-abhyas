'use strict';
/* Test harness for v2 batches 1–2, before build.js exists (Task 12).
   Assembles one page in memory from app/ the way the build will (inline CSS, JS,
   strings, card-ordered papers, SVG markup) with a THROWAWAY hash, and serves it
   on localhost. Never reads .env.local. Writes nothing. */
const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { loadCard } = require('../scripts/lib/card.js');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'app');

function paperList(card) {
  const keys = card.chapter_list.map(c => ({ key: 'ch' + c.n, file: 'english-ch' + c.n + '.json' }));
  (card.extra_papers || []).forEach(x => keys.push({ key: x.code, file: 'english-' + x.code + '.json' }));
  return keys;
}

function collectAssets(papers) {
  const out = {};
  const visit = s => {
    if (s && s.asset && !out[s.asset]) {
      let svg = fs.readFileSync(path.join(APP, s.asset), 'utf8');
      svg = svg.replace(/^﻿?(\s*<\?xml[^>]*\?>)?(\s*<!DOCTYPE[^>]*>)?\s*/i, '');
      if (!svg.startsWith('<svg')) throw new Error('not an svg: ' + s.asset);
      out[s.asset] = svg;
    }
  };
  Object.values(papers).forEach(p => p.sections.forEach(sec => sec.blocks.forEach(b => {
    visit(b.stimulus);
    b.items.forEach(it => visit(it.stimulus));
  })));
  return out;
}

const jsonScript = (id, obj) => '<script type="application/json" id="' + id + '">' +
  JSON.stringify(obj).replace(/<\/script/gi, () => '<\\/script').replace(/<!--/g, () => '\\u003c!--') + '</script>';

function assemble(code) {
  const card = loadCard(path.join(ROOT, 'PROJECT-CARD.yml'));
  const list = paperList(card);
  const papers = {};
  list.forEach(p => { papers[p.key] = JSON.parse(fs.readFileSync(path.join(APP, 'data', p.file), 'utf8')); });
  const data = { order: list.map(p => p.key), login: card.student_login, papers };
  const ui = JSON.parse(fs.readFileSync(path.join(APP, 'ui', 'en.json'), 'utf8'));
  const hash = crypto.createHash('sha256').update(code.trim()).digest('hex');
  const css = fs.readFileSync(path.join(APP, 'styles.css'), 'utf8');
  const jsPath = path.join(APP, 'app.js');
  const js = fs.existsSync(jsPath) ? fs.readFileSync(jsPath, 'utf8').replace('__SECRET_HASH__', () => hash) : '';
  let html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
  html = html.replace('<link rel="stylesheet" href="styles.css">', () => '<style>\n' + css + '\n</style>');
  html = html.replace('<script src="app.js"></script>', () =>
    [jsonScript('uiStrings', ui), jsonScript('papersData', data), jsonScript('assetsData', collectAssets(papers)),
      '<script>\n' + js.replace(/<\/script/gi, () => '<\\/script') + '\n</script>'].join('\n'));
  return { html, data, ui, card };
}

function serve(html) {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        res.end(html);
      } else { res.writeHead(404); res.end(); }
    });
    srv.listen(0, '127.0.0.1', () => resolve({ url: 'http://localhost:' + srv.address().port + '/', close: () => srv.close() }));
  });
}

module.exports = { assemble, serve, paperList };
