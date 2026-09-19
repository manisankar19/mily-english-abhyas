'use strict';
// Zero-dependency reader for PROJECT-CARD.yml.
//
// Node has no built-in YAML parser and this repo has no runtime dependencies, so this reads the small
// YAML SUBSET the card uses, and nothing else:
//   - `# comments` (outside quotes), blank lines, two-space (or any consistent) indentation
//   - block mappings   `key: value`   and nested block mappings
//   - block sequences  `- item`       (item = flow map, flow sequence or scalar)
//   - flow mappings    `{ a: 1, b: "x" }`   and flow sequences   `[ a, b ]`
//   - scalars: "double" and 'single' quoted, integers, floats, true/false, null/~, plain strings
//   - anchors on a mapping value `key: &name` (block follows) and aliases `key: *name`
// Anything else throws. scripts/test-validator.js cross-checks this reader against PyYAML on the real card.

const fs = require('fs');

function stripComment(line) {
  let dq = false, sq = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && !sq) dq = !dq;
    else if (c === "'" && !dq) sq = !sq;
    else if (c === '#' && !dq && !sq && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
  }
  return line;
}

function resolveScalar(s) {
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  if (/^-?\d+\.\d+$/.test(s)) return parseFloat(s);
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  return s;
}

function parseYaml(text) {
  const anchors = {};
  const lines = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const c = stripComment(raw);
    if (c.trim() === '') return;
    if (/^\s*\t/.test(c)) throw new Error(`line ${i + 1}: tab indentation is not supported`);
    lines.push({ indent: c.match(/^ */)[0].length, content: c.trim(), no: i + 1 });
  });
  let pos = 0;

  const clone = (v) => JSON.parse(JSON.stringify(v));
  const skipWs = (p) => { while (p.i < p.s.length && /\s/.test(p.s[p.i])) p.i++; };

  function parseDQ(p) {
    p.i++; let out = '';
    while (p.i < p.s.length && p.s[p.i] !== '"') {
      if (p.s[p.i] === '\\') {
        const n = p.s[p.i + 1]; p.i += 2;
        if (n === 'n') out += '\n'; else if (n === 't') out += '\t';
        else if (n === 'u') { out += String.fromCharCode(parseInt(p.s.slice(p.i, p.i + 4), 16)); p.i += 4; }
        else out += n;
      } else out += p.s[p.i++];
    }
    if (p.s[p.i] !== '"') throw new Error('unterminated double-quoted string');
    p.i++; return out;
  }
  function parseSQ(p) {
    p.i++; let out = '';
    while (p.i < p.s.length) {
      if (p.s[p.i] === "'") { if (p.s[p.i + 1] === "'") { out += "'"; p.i += 2; continue; } break; }
      out += p.s[p.i++];
    }
    if (p.s[p.i] !== "'") throw new Error('unterminated single-quoted string');
    p.i++; return out;
  }
  function parsePlain(p, inFlow) {
    const start = p.i;
    while (p.i < p.s.length && !(inFlow && /[,\]}]/.test(p.s[p.i]))) p.i++;
    return resolveScalar(p.s.slice(start, p.i).trim());
  }
  function parseFlowValue(p, inFlow) {
    skipWs(p);
    const c = p.s[p.i];
    if (c === '{') return parseFlowMap(p);
    if (c === '[') return parseFlowSeq(p);
    if (c === '"') return parseDQ(p);
    if (c === "'") return parseSQ(p);
    return parsePlain(p, inFlow);
  }
  function parseFlowMap(p) {
    p.i++; const obj = {};
    for (;;) {
      skipWs(p);
      if (p.s[p.i] === '}') { p.i++; return obj; }
      let key;
      if (p.s[p.i] === '"') key = parseDQ(p); else if (p.s[p.i] === "'") key = parseSQ(p);
      else { const st = p.i; while (p.i < p.s.length && p.s[p.i] !== ':') p.i++; key = p.s.slice(st, p.i).trim(); }
      skipWs(p);
      if (p.s[p.i] !== ':') throw new Error(`expected ':' after key "${key}"`);
      p.i++;
      obj[key] = parseFlowValue(p, true);
      skipWs(p);
      if (p.s[p.i] === ',') p.i++; else if (p.s[p.i] !== '}') throw new Error(`expected ',' or '}' near "${p.s.slice(p.i, p.i + 12)}"`);
    }
  }
  function parseFlowSeq(p) {
    p.i++; const arr = [];
    for (;;) {
      skipWs(p);
      if (p.s[p.i] === ']') { p.i++; return arr; }
      arr.push(parseFlowValue(p, true));
      skipWs(p);
      if (p.s[p.i] === ',') p.i++; else if (p.s[p.i] !== ']') throw new Error(`expected ',' or ']' near "${p.s.slice(p.i, p.i + 12)}"`);
    }
  }
  function parseInline(s, no) {
    const p = { s, i: 0 };
    let v;
    try { v = parseFlowValue(p, false); skipWs(p); } catch (e) { throw new Error(`line ${no}: ${e.message}`); }
    if (p.i < p.s.length) throw new Error(`line ${no}: unexpected trailing text "${p.s.slice(p.i, p.i + 20)}"`);
    return v;
  }

  function parseBlock(indent) {
    const c = lines[pos].content;
    return (c === '-' || c.startsWith('- ')) ? parseSeq(indent) : parseMap(indent);
  }
  function parseMap(indent) {
    const obj = {};
    while (pos < lines.length && lines[pos].indent === indent && !(lines[pos].content === '-' || lines[pos].content.startsWith('- '))) {
      const { content, no } = lines[pos];
      const m = content.match(/^([^:\s][^:]*?):(?:\s+(.*))?$/);
      if (!m) throw new Error(`line ${no}: expected "key: value"`);
      pos++;
      const key = m[1].trim();
      let rest = (m[2] || '').trim();
      let anchor = null;
      if (rest.startsWith('&')) { const sp = rest.search(/\s|$/); anchor = rest.slice(1, sp); rest = rest.slice(sp).trim(); }
      let val;
      if (rest === '') val = (pos < lines.length && lines[pos].indent > indent) ? parseBlock(lines[pos].indent) : null;
      else if (rest.startsWith('*')) {
        const name = rest.slice(1).trim();
        if (!Object.prototype.hasOwnProperty.call(anchors, name)) throw new Error(`line ${no}: unknown alias *${name}`);
        val = clone(anchors[name]);
      } else val = parseInline(rest, no);
      if (anchor) anchors[anchor] = val;
      obj[key] = val;
    }
    return obj;
  }
  function parseSeq(indent) {
    const arr = [];
    while (pos < lines.length && lines[pos].indent === indent && (lines[pos].content === '-' || lines[pos].content.startsWith('- '))) {
      const { content, no } = lines[pos];
      pos++;
      const rest = content.slice(1).trim();
      if (rest === '') arr.push((pos < lines.length && lines[pos].indent > indent) ? parseBlock(lines[pos].indent) : null);
      else arr.push(parseInline(rest, no));
    }
    return arr;
  }

  if (!lines.length) return {};
  const result = parseBlock(lines[0].indent);
  if (pos < lines.length) throw new Error(`line ${lines[pos].no}: unexpected indentation or content`);
  return result;
}

function loadCard(cardPath) {
  let text;
  try { text = fs.readFileSync(cardPath, 'utf8'); } catch (e) { throw new Error(`cannot read ${cardPath}: ${e.message}`); }
  try { return parseYaml(text); } catch (e) { throw new Error(`cannot parse ${cardPath}: ${e.message}`); }
}

module.exports = { parseYaml, loadCard };
