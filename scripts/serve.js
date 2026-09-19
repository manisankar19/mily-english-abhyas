#!/usr/bin/env node
'use strict';
/* Zero-dependency static server for the built site (sprint v2, Task 15).
 *
 *   node scripts/serve.js [port] [--root <dir>]   default root dist/, port 0 = random; prints the URL
 *   require('./scripts/serve.js').start({ port: 0, root }) → Promise<{ url, close }>
 *
 * Binds 127.0.0.1 only. `/` serves index.html; other paths map to files under the root.
 * No directory listing; any path that resolves outside the root is refused (403).
 * Files are read on every request, so a rebuild is picked up without a restart.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = '127.0.0.1';
const DEFAULT_ROOT = path.join(__dirname, '..', 'dist');
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

function send(res, status, type, body, headOnly) {
  res.writeHead(status, {
    'content-type': type,
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  });
  res.end(headOnly ? undefined : body);
}

function handler(root) {
  return (req, res) => {
    const headOnly = req.method === 'HEAD';
    if (req.method !== 'GET' && !headOnly) return send(res, 405, 'text/plain; charset=utf-8', 'Method not allowed\n', headOnly);
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
    } catch (e) {
      return send(res, 400, 'text/plain; charset=utf-8', 'Bad request\n', headOnly);
    }
    if (pathname.includes('\0') || pathname.split(/[\\/]/).includes('..')) {
      return send(res, 403, 'text/plain; charset=utf-8', 'Forbidden\n', headOnly);
    }
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) {
      return send(res, 403, 'text/plain; charset=utf-8', 'Forbidden\n', headOnly);
    }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) return send(res, 404, 'text/plain; charset=utf-8', 'Not found\n', headOnly);
      fs.readFile(file, (err2, body) => {
        if (err2) return send(res, 404, 'text/plain; charset=utf-8', 'Not found\n', headOnly);
        send(res, 200, TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', body, headOnly);
      });
    });
  };
}

function start({ port = 0, root = DEFAULT_ROOT } = {}) {
  const absRoot = path.resolve(root);
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler(absRoot));
    server.once('error', reject);
    server.listen(port, HOST, () => {
      server.removeListener('error', reject);
      const url = `http://localhost:${server.address().port}/`;
      const close = () => new Promise((done) => {
        if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
        server.close(() => done());
      });
      resolve({ url, close });
    });
  });
}

module.exports = { start };

if (require.main === module) {
  const args = process.argv.slice(2);
  let port = 0;
  let root = DEFAULT_ROOT;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root') root = args[++i];
    else if (/^\d+$/.test(args[i])) port = Number(args[i]);
    else {
      process.stderr.write(`usage: node scripts/serve.js [port] [--root dir]\n`);
      process.exit(1);
    }
  }
  if (port > 65535 || !root) {
    process.stderr.write('ERROR: invalid port or root\n');
    process.exit(1);
  }
  if (!fs.existsSync(path.join(root, 'index.html'))) {
    process.stderr.write(`WARNING: ${path.join(root, 'index.html')} not found (run node build.js)\n`);
  }
  start({ port, root }).then(
    ({ url }) => process.stdout.write(`${url}\n`),
    (err) => { process.stderr.write(`ERROR: ${err.message}\n`); process.exit(1); }
  );
}
