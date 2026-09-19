'use strict';
/* build.js — assemble the single-file site dist/index.html (sprint v2, Task 12).
   Everything is read from PROJECT-CARD.yml (paper list, login) and app/. Zero dependencies.
   Computes the whole page in memory and writes dist/ only after every check passes.
   The marking code (GANESH_ENGLISH) is never printed; only its sha256 is embedded. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { loadCard } = require('./scripts/lib/card.js');

const PLACEHOLDER = '__SECRET_HASH__';
const MAX_BYTES = 4 * 1024 * 1024;
const MIN_CODE = 10;
const ENV_KEY = 'GANESH_ENGLISH';

class BuildError extends Error {}
const fail = (msg) => { throw new BuildError(msg); };

function paperList(card) {
  const keys = (card.chapter_list || []).map(c => ({ key: 'ch' + c.n, file: 'english-ch' + c.n + '.json' }));
  (card.extra_papers || []).forEach(x => keys.push({ key: x.code, file: 'english-' + x.code + '.json' }));
  if (!keys.length) fail('the card lists no papers');
  return keys;
}

// Parse a .env file's text; returns undefined when the key is absent.
function readEnvFileValue(text, key) {
  let found;
  text.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m || m[1] !== key) return;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"') && v.length >= 2) || (v.startsWith("'") && v.endsWith("'") && v.length >= 2)) v = v.slice(1, -1);
    found = v;
  });
  return found;
}

// Resolve the code: process.env first; .env.local only if the key is entirely absent from env.
function resolveCode(env, root) {
  let value;
  if (Object.prototype.hasOwnProperty.call(env, ENV_KEY)) {
    value = env[ENV_KEY];
  } else {
    const f = path.join(root, '.env.local');
    if (fs.existsSync(f)) value = readEnvFileValue(fs.readFileSync(f, 'utf8'), ENV_KEY);
    if (value === undefined) fail(ENV_KEY + ' is not set (environment or .env.local)');
  }
  const code = String(value).trim();
  if (code === '') fail(ENV_KEY + ' is present but empty');
  if (code.length < MIN_CODE) fail(ENV_KEY + ' is too short');
  return code;
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function forEachStimulus(papers, fn) {
  Object.values(papers).forEach(p => (p.sections || []).forEach(sec => (sec.blocks || []).forEach(b => {
    if (b.stimulus) fn(b.stimulus);
    (b.items || []).forEach(it => { if (it.stimulus) fn(it.stimulus); });
  })));
}

function collectAssets(papers, appDir) {
  const out = {};
  forEachStimulus(papers, s => {
    if (!s.asset || Object.prototype.hasOwnProperty.call(out, s.asset)) return;
    const file = path.resolve(appDir, s.asset);
    if (!file.startsWith(appDir + path.sep)) fail('asset path escapes app/: ' + s.asset);
    if (!fs.existsSync(file)) fail('missing asset: ' + s.asset);
    let svg = fs.readFileSync(file, 'utf8');
    svg = svg.replace(/^﻿?(\s*<\?xml[^>]*\?>)?(\s*<!DOCTYPE[^>]*>)?\s*/i, '');
    if (!svg.startsWith('<svg')) fail('not an svg (must start with <svg): ' + s.asset);
    out[s.asset] = svg;
  });
  return out;
}

function countItems(papers) {
  let n = 0;
  Object.values(papers).forEach(p => (p.sections || []).forEach(sec => (sec.blocks || []).forEach(b => { n += (b.items || []).length; })));
  return n;
}

const escapeJson = (s) => s.replace(/<\/script/gi, () => '<\\/script').replace(/<!--/g, () => '\\u003c!--');
const jsonScript = (id, obj) => '<script type="application/json" id="' + id + '">' + escapeJson(JSON.stringify(obj)) + '</script>';
const escapeJs = (s) => s.replace(/<\/script/gi, () => '<\\/script').replace(/<!--/g, () => '<\\!--');

// i18n: every t('key') in app.js and data-i18n* key in index.html must exist in en.json.
function checkI18n(js, html, ui) {
  const used = new Set();
  for (const m of js.matchAll(/\bt\(\s*'([A-Za-z][\w-]*(?:\.[\w-]+)+)'/g)) used.add(m[1]);
  for (const m of html.matchAll(/\sdata-i18n(?:-[a-z-]+)?="([^"]+)"/g)) used.add(m[1]);
  const missing = [...used].filter(k => !Object.prototype.hasOwnProperty.call(ui, k));
  if (missing.length) fail('en.json is missing key(s): ' + missing.join(', '));
  // Keys may also be built dynamically; unused is a warning only.
  const unused = Object.keys(ui).filter(k => !used.has(k) && !js.includes(k));
  return { used: used.size, unused };
}

function assemble({ root, code }) {
  const appDir = path.join(root, 'app');
  const card = loadCard(path.join(root, 'PROJECT-CARD.yml'));
  const list = paperList(card);
  const papers = {};
  list.forEach(p => {
    const f = path.join(appDir, 'data', p.file);
    if (!fs.existsSync(f)) fail('missing paper: ' + p.file);
    papers[p.key] = JSON.parse(fs.readFileSync(f, 'utf8'));
  });
  const data = { order: list.map(p => p.key), login: card.student_login, papers };
  const ui = JSON.parse(fs.readFileSync(path.join(appDir, 'ui', 'en.json'), 'utf8'));
  const assets = collectAssets(papers, appDir);
  const hash = sha256(code);

  const rawJs = fs.readFileSync(path.join(appDir, 'app.js'), 'utf8');
  const count = rawJs.split(PLACEHOLDER).length - 1;
  if (count !== 1) fail('app/app.js must contain ' + PLACEHOLDER + ' exactly once (found ' + count + ')');
  const js = rawJs.replace(PLACEHOLDER, () => hash);
  const css = fs.readFileSync(path.join(appDir, 'styles.css'), 'utf8');
  const indexHtml = fs.readFileSync(path.join(appDir, 'index.html'), 'utf8');
  const i18n = checkI18n(rawJs, indexHtml, ui);

  const cssTag = '<link rel="stylesheet" href="styles.css">';
  const jsTag = '<script src="app.js"></script>';
  if (indexHtml.split(cssTag).length !== 2) fail('index.html must contain the stylesheet link exactly once');
  if (indexHtml.split(jsTag).length !== 2) fail('index.html must contain the app.js script tag exactly once');
  let html = indexHtml.replace(cssTag, () => '<style>\n' + css.replace(/<\/style/gi, () => '<\\/style') + '\n</style>');
  html = html.replace(jsTag, () => [jsonScript('uiStrings', ui), jsonScript('papersData', data),
    jsonScript('assetsData', assets), '<script>\n' + escapeJs(js) + '\n</script>'].join('\n'));

  checkOutput(html, hash, code);
  return {
    html, hash, warnings: i18n.unused.length ? ['unused en.json key(s): ' + i18n.unused.join(', ')] : [],
    stats: { bytes: Buffer.byteLength(html, 'utf8'), papers: list.length, items: countItems(papers), figures: Object.keys(assets).length },
  };
}

function checkOutput(html, hash, code) {
  if (html.includes(PLACEHOLDER)) fail('placeholder left in the built page');
  const hexes = html.match(/(?<![0-9a-fA-F])[0-9a-f]{64}(?![0-9a-fA-F])/g) || [];
  if (hexes.length !== 1 || hexes[0] !== hash) fail('expected exactly one 64-hex string equal to the hash (found ' + hexes.length + ')');
  for (const m of html.matchAll(/\s(?:src|href)\s*=\s*["']?([^"'\s>]+)/gi)) {
    if (!/^(https:\/\/|data:|#)/i.test(m[1])) fail('local file reference in built page: ' + m[1]);
  }
  if (html.includes(code)) fail('the marking code appears in the built page');
  const bytes = Buffer.byteLength(html, 'utf8');
  if (bytes > MAX_BYTES) fail('built page is ' + bytes + ' bytes, over the 4 MB limit');
}

function runValidator(root) {
  try {
    execFileSync(process.execPath, [path.join(root, 'validate.js'), '--strict', '--skip-source-check'], { cwd: root, stdio: 'inherit' });
  } catch (e) {
    fail('validator failed: node validate.js --strict --skip-source-check');
  }
}

function build({ root = __dirname, env = process.env } = {}) {
  runValidator(root);
  const code = resolveCode(env, root);
  const out = assemble({ root, code });
  const dist = path.join(root, 'dist');
  fs.mkdirSync(dist, { recursive: true });
  const tmp = path.join(dist, '.index.html.tmp');
  fs.writeFileSync(tmp, out.html);
  fs.renameSync(tmp, path.join(dist, 'index.html'));
  return out;
}

if (require.main === module) {
  try {
    const out = build();
    out.warnings.forEach(w => console.warn('warning: ' + w));
    const s = out.stats;
    console.log('build ok: dist/index.html ' + (s.bytes / 1024).toFixed(1) + ' KB, ' + s.papers + ' papers, ' + s.items +
      ' items, ' + s.figures + ' figures, hash ' + out.hash.slice(0, 12) + '…, source check skipped');
  } catch (e) {
    console.error('build failed: ' + (e instanceof BuildError ? e.message : (e && e.message) || String(e)));
    process.exit(1);
  }
}

module.exports = { build, assemble, resolveCode, readEnvFileValue, collectAssets, checkI18n, checkOutput, paperList, countItems, escapeJson, sha256, BuildError };
