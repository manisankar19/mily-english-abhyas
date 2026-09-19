'use strict';
/* scripts/test-build.js — build.js failure and success cases (sprint v2, Task 13).
   Every case runs on a fresh temporary copy of the repo with THROWAWAY codes. Never reads the
   real .env.local and never prints a code. Exit non-zero if any case fails. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const BASE = path.join(process.env.TMPDIR || (fs.existsSync('/tmp/claude-' + process.getuid()) ? '/tmp/claude-' + process.getuid() : os.tmpdir()), 'build-tests');
const CODE = 'throwaway-' + crypto.randomBytes(6).toString('hex');
const OTHER = 'throwaway-other-' + crypto.randomBytes(4).toString('hex');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

function copy(src, dst) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const f of fs.readdirSync(src)) copy(path.join(src, f), path.join(dst, f));
  } else fs.copyFileSync(src, dst);
}

let seq = 0;
function freshCopy() {
  fs.mkdirSync(BASE, { recursive: true });
  const dir = fs.mkdtempSync(path.join(BASE, 'case' + (++seq) + '-'));
  for (const f of ['app', 'validate.js', 'PROJECT-CARD.yml', path.join('scripts', 'lib'), 'build.js', 'package.json']) {
    copy(path.join(ROOT, f), path.join(dir, f));
  }
  return dir;
}

function run(dir, envCode) {
  const env = { ...process.env };
  delete env.GANESH_ENGLISH;
  if (envCode !== undefined) env.GANESH_ENGLISH = envCode;
  const r = spawnSync(process.execPath, ['build.js'], { cwd: dir, env, encoding: 'utf8' });
  return { status: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

const edit = (dir, rel, fn) => { const f = path.join(dir, rel); fs.writeFileSync(f, fn(fs.readFileSync(f, 'utf8'))); };
const editJson = (dir, rel, fn) => edit(dir, rel, t => { const o = JSON.parse(t); fn(o); return JSON.stringify(o, null, 2) + '\n'; });
const firstPaper = (dir) => path.join('app', 'data', fs.readdirSync(path.join(dir, 'app', 'data')).filter(f => f.endsWith('.json')).sort()[0]);
function paperWithAsset(dir) {
  for (const f of fs.readdirSync(path.join(dir, 'app', 'data')).sort()) {
    if (fs.readFileSync(path.join(dir, 'app', 'data', f), 'utf8').includes('"asset"')) return path.join('app', 'data', f);
  }
  throw new Error('no paper with an asset');
}
const distFiles = (dir) => fs.existsSync(path.join(dir, 'dist')) ? fs.readdirSync(path.join(dir, 'dist')) : [];

// A failing case: non-zero exit, no dist/ written, and no code in the output.
function expectFail(setup, envCode, reason) {
  return () => {
    const dir = freshCopy();
    setup(dir);
    const r = run(dir, envCode);
    if (r.status === 0) return 'exited 0';
    if (distFiles(dir).length) return 'dist/ was written';
    if (r.out.includes(CODE) || r.out.includes(OTHER)) return 'output contains a code';
    if (reason && !r.out.includes(reason)) return 'failed for another reason (expected "' + reason + '")';
    return null;
  };
}
function expectOk(setup, envCode, check) {
  return () => {
    const dir = freshCopy();
    setup(dir);
    const r = run(dir, envCode);
    if (r.status !== 0) return 'exit ' + r.status + ': ' + r.out.split('\n').filter(Boolean).slice(-1)[0];
    if (r.out.includes(CODE) || r.out.includes(OTHER)) return 'output contains a code';
    const files = distFiles(dir);
    if (files.length !== 1 || files[0] !== 'index.html') return 'dist/ holds ' + JSON.stringify(files);
    const html = fs.readFileSync(path.join(dir, 'dist', 'index.html'), 'utf8');
    return check(html, r.out);
  };
}
const oneHash = (code) => (html) => {
  const h = html.match(/(?<![0-9a-fA-F])[0-9a-f]{64}(?![0-9a-fA-F])/g) || [];
  if (h.length !== 1 || h[0] !== sha(code)) return 'expected one hash equal to sha256(code), found ' + h.length;
  if (html.includes(CODE) || html.includes(OTHER)) return 'plaintext code in page';
  return null;
};
const writeEnvLocal = (value) => (dir) => fs.writeFileSync(path.join(dir, '.env.local'), 'GANESH_ENGLISH=' + value + '\n');
const noop = () => {};

const cases = [
  ['code unset (no env, no .env.local)', expectFail(noop, undefined, 'is not set')],
  ['empty in env', expectFail(writeEnvLocal(CODE), '', 'present but empty')],
  ['whitespace-only in env', expectFail(noop, '   \t ', 'present but empty')],
  ['shorter than 10 characters', expectFail(noop, 'short-123', 'too short')],
  ['env absent, .env.local empty value', expectFail(writeEnvLocal(''), undefined, 'present but empty')],
  ['placeholder missing', expectFail(d => edit(d, 'app/app.js', t => t.replace('__SECRET_HASH__', 'nohash')), CODE, 'exactly once')],
  ['placeholder twice', expectFail(d => edit(d, 'app/app.js', t => t + '\n// __SECRET_HASH__\n'), CODE, 'exactly once')],
  ['missing asset', expectFail(d => {
    const p = paperWithAsset(d);
    const a = fs.readFileSync(path.join(d, p), 'utf8').match(/"asset"\s*:\s*"([^"]+)"/)[1];
    fs.unlinkSync(path.join(d, 'app', a));
  }, CODE, 'validator failed')],
  ['invalid paper (marks changed)', expectFail(d => editJson(d, firstPaper(d), o => { o.sections[0].blocks[0].items[0].marks += 7; }), CODE, 'validator failed')],
  ['missing en.json key', expectFail(d => editJson(d, 'app/ui/en.json', o => { delete o['login.heading']; }), CODE, 'missing key')],
  ['plaintext code collides with page', expectFail(d => edit(d, 'app/app.js', t => t + '\n// ' + CODE + '\n'), CODE, 'appears in the built page')],
  ['</script and <!-- in data are escaped', expectOk(d => editJson(d, firstPaper(d), o => {
    o.sections[0].blocks[0].items[0].q += ' </script><!-- x';
  }), CODE, (html) => {
    const m = html.match(/<script type="application\/json" id="papersData">([\s\S]*?)<\/script>/);
    if (!m) return 'papersData script not found';
    if (/<\/script/i.test(m[1]) || m[1].includes('<!--')) return 'raw </script or <!-- inside JSON';
    if (!m[1].includes('<\\/script>\\u003c!-- x')) return 'escaped text not found';
    const obj = JSON.parse(m[1]);
    if (!JSON.stringify(obj).includes('</script><!-- x')) return 'escaped JSON does not round-trip';
    return oneHash(CODE)(html);
  })],
  ['.env.local fallback when env var absent', expectOk(writeEnvLocal(OTHER), undefined, oneHash(OTHER))],
  ['env var wins over .env.local', expectOk(writeEnvLocal(OTHER), CODE, oneHash(CODE))],
  ['control build', expectOk(noop, CODE, (html, out) => {
    const e = oneHash(CODE)(html); if (e) return e;
    if (!/source check skipped/.test(out)) return 'summary line lacks "source check skipped"';
    if (Buffer.byteLength(html) > 4 * 1024 * 1024) return 'over 4 MB';
    return null;
  })],
];

let failed = 0;
for (const [name, fn] of cases) {
  let err;
  try { err = fn(); } catch (e) { err = 'threw: ' + e.message; }
  if (err) { failed++; console.log('FAIL ' + name + ' — ' + String(err).split(CODE).join('[code]').split(OTHER).join('[code]')); }
  else console.log('PASS ' + name);
}
fs.rmSync(BASE, { recursive: true, force: true });
console.log((cases.length - failed) + '/' + cases.length + ' passed');
process.exit(failed ? 1 : 0);
