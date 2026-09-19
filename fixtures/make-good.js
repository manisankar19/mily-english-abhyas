#!/usr/bin/env node
'use strict';
// Deterministic generator for the GOOD validator fixtures in fixtures/good/.
//   standard-ch2.json  a 7-section standard-profile chapter paper (58 items, 100 marks)
//   thin-ch1.json      a 5-section thin-poem-profile paper (54 items, 100 marks, 21 hard)
//   mock-hy.json       a standard-profile mock with `sourceChapter` on every item
// All text is synthetic and original — nothing here is taken from source/. Section titles, marks, chapter
// titles and the mock allocation are read from PROJECT-CARD.yml, so the fixtures cannot drift from it.
// Regenerate with:  node fixtures/make-good.js
const fs = require('fs');
const path = require('path');
const { loadCard } = require('../scripts/lib/card');

const card = loadCard(path.join(__dirname, '..', 'PROJECT-CARD.yml'));
const OUT = path.join(__dirname, 'good');

const TEXT = {
  A1: 'Rina has a small red kite. She flies it on the hill every Sunday. The wind is strong today, so the kite goes very high. Her brother Amit holds the string while she runs. They laugh and clap. When the sun sets, they roll up the string and walk home together.',
  A2: 'The pond behind the school is quiet in the morning. Two ducks swim slowly across it. A boy drops crumbs near the edge. The ducks come closer and eat them.',
  POEM: 'Little drops of morning dew\nSparkle on the grass so new\nBirds wake up and start to sing\nWelcome to a day of spring',
  COPY1: 'On Sunday morning Rina wore her yellow dress. She packed two apples and a bottle of water for the hill.',
  COPY2: 'The ducks swam across the pond. Amit clapped his hands and smiled.',
};
const passage = (text) => ({ kind: 'passage', text, original: true });
const poem = (text) => ({ kind: 'poem', text, original: true });

// item spec: [type, marks, difficulty]   type may be 'fill-blank:N' for an N-blank fill-blank item
const STANDARD = [
  { blocks: [
    { instr: 'Read the passage and answer the questions.', stim: passage(TEXT.A1), items: [
      ['mcq', 1, 'easy'], ['mcq', 1, 'easy'], ['mcq', 1, 'medium'], ['short', 2, 'medium'], ['short', 2, 'hard'],
      ['true-false', 1, 'easy'], ['true-false', 1, 'medium'], ['one-word', 1, 'easy'], ['one-word', 1, 'easy'],
      ['one-word', 1, 'medium'], ['one-word', 1, 'medium']] },
    { instr: 'Read the text and answer the questions.', stim: passage(TEXT.A2), items: [
      ['short', 2, 'medium'], ['short', 2, 'medium'], ['short', 2, 'medium'], ['fill-blank', 1, 'easy'], ['fill-blank', 1, 'easy'],
      ['fill-blank', 1, 'easy'], ['true-false', 1, 'medium'], ['true-false', 1, 'medium'], ['true-false', 1, 'medium']] }] },
  { blocks: [
    { instr: 'Give the answer in one word.', items: [['one-word', 1, 'easy'], ['one-word', 1, 'easy'], ['one-word', 1, 'medium']] },
    { instr: 'Answer the following questions.', items: [['short', 2, 'medium'], ['short', 2, 'medium'], ['short', 2, 'medium'], ['short', 2, 'hard'], ['short', 2, 'hard']] }] },
  { blocks: [
    { instr: 'Write five sentences. OR write about your favourite game.', items: [['long', 5, 'hard']] },
    { instr: 'Complete the paragraph.', items: [['long', 4, 'medium']] },
    { instr: 'Make a sentence with each word.', items: [['short', 1, 'medium'], ['short', 1, 'medium'], ['short', 1, 'easy']] }] },
  { blocks: [
    { instr: 'Fill in the blanks.', items: [['fill-blank', 1, 'easy'], ['fill-blank', 1, 'easy'], ['fill-blank', 1, 'easy'], ['fill-blank', 1, 'medium'], ['fill-blank', 1, 'medium']] },
    { instr: 'Rewrite the sentences as directed.', items: [['short', 2, 'medium'], ['short', 2, 'medium'], ['short', 2, 'hard']] },
    { instr: 'Do as directed.', items: [['short', 2, 'medium'], ['short', 2, 'medium'], ['short', 2, 'hard'], ['short', 2, 'hard']] }] },
  { blocks: [
    { instr: 'Match the words with their meanings.', items: [['match', 5, 'medium']] },
    { instr: 'Fill in the blanks with the words from the box.', items: [['fill-blank:2', 2, 'easy'], ['fill-blank:2', 2, 'medium']] },
    { instr: 'Answer in one line.', items: [['short', 2, 'medium'], ['short', 2, 'hard']] }] },
  { blocks: [
    { instr: 'Circle the correct spelling.', items: [['mcq', 2, 'easy'], ['mcq', 2, 'easy'], ['mcq', 2, 'medium']] },
    { instr: 'Rearrange the jumbled letters to make a word.', items: [['one-word', 2, 'medium'], ['one-word', 2, 'medium'], ['one-word', 2, 'hard']] }] },
  { blocks: [
    { instr: 'Write the following lines in neat handwriting.', stim: passage(TEXT.COPY1), items: [['handwriting', 3, 'medium']] },
    { instr: 'Write the following lines in neat handwriting.', stim: passage(TEXT.COPY2), items: [['handwriting', 3, 'medium']] }] },
];

const THIN = [
  { blocks: [
    { instr: 'Read the passage and answer the questions.', stim: passage(TEXT.A1), items: [
      ['mcq', 1, 'easy'], ['mcq', 1, 'easy'], ['mcq', 1, 'medium'], ['short', 2, 'medium'], ['short', 2, 'hard'], ['short', 2, 'hard'],
      ['true-false', 1, 'easy'], ['true-false', 1, 'medium'], ['one-word', 1, 'easy'], ['one-word', 1, 'medium'], ['short', 3, 'hard']] },
    { instr: 'Read the poem and answer the questions.', stim: poem(TEXT.POEM), items: [
      ['short', 2, 'medium'], ['short', 2, 'hard'], ['short', 2, 'medium'], ['fill-blank', 1, 'easy'], ['fill-blank', 1, 'easy'],
      ['fill-blank', 1, 'medium'], ['mcq', 1, 'easy'], ['mcq', 1, 'medium'], ['short', 3, 'hard']] }] },
  { blocks: [
    { instr: 'Answer the following questions.', items: [['short', 2, 'easy'], ['short', 2, 'medium'], ['short', 2, 'hard'], ['short', 2, 'hard'], ['short', 2, 'hard']] }] },
  { blocks: [
    { instr: 'Write five sentences about a team you know. OR write about a game you played.', items: [['long', 5, 'hard']] },
    { instr: 'Complete the paragraph about your favourite festival.', items: [['long', 5, 'hard']] },
    { instr: 'Write what will happen next.', items: [['long', 5, 'hard']] },
    { instr: 'Make a sentence with each word.', items: [['short', 1, 'medium'], ['short', 1, 'medium'], ['short', 1, 'medium'], ['short', 1, 'medium'], ['short', 1, 'hard']] }] },
  { blocks: [
    { instr: 'Fill in the blanks.', items: [['fill-blank', 1, 'easy'], ['fill-blank', 1, 'easy'], ['fill-blank', 1, 'easy'], ['fill-blank', 1, 'medium'], ['fill-blank', 1, 'medium'], ['fill-blank', 1, 'hard']] },
    { instr: 'Rewrite the sentences as directed.', items: [['short', 2, 'hard'], ['short', 2, 'hard'], ['short', 2, 'hard']] },
    { instr: 'Write four sentences using the rule.', items: [['short', 4, 'hard'], ['short', 4, 'hard']] }] },
  { blocks: [
    { instr: 'Match the words with their meanings.', items: [['match', 5, 'medium']] },
    { instr: 'Fill in the blanks with the words from the box.', items: [['fill-blank', 1, 'easy'], ['fill-blank', 1, 'easy'], ['fill-blank', 1, 'medium'], ['fill-blank', 1, 'medium']] },
    { instr: 'Answer in one line.', items: [['short', 2, 'medium'], ['short', 2, 'hard']] },
    { instr: 'Circle the correct spelling.', items: [['mcq', 2, 'easy'], ['mcq', 2, 'hard']] },
    { instr: 'Rearrange the jumbled letters to make three words.', items: [['fill-blank:3', 3, 'hard']] }] },
];

function makeItem(type, marks, difficulty, n) {
  const base = String(type).split(':')[0];
  const blanks = type.includes(':') ? parseInt(type.split(':')[1], 10) : 1;
  const it = { id: null, type: base, q: '', marks, answer: '', difficulty };
  const points = (k) => Array.from({ length: marks }, (_, i) => ({ point: `Fixture point ${i + 1}`, marks: 1 })).slice(0, k || marks);
  switch (base) {
    case 'mcq':
      it.q = `Fixture question ${n}: which option is correct?`; it.options = ['Option one', 'Option two', 'Option three']; it.answer = 'Option one'; break;
    case 'true-false':
      it.q = `Fixture statement ${n} is about the text.`; it.answer = 'True'; break;
    case 'one-word':
      it.q = `Fixture question ${n}: give one word.`; it.answer = 'word'; it.acceptable = ['word', 'term']; break;
    case 'fill-blank':
      if (blanks === 1) { it.q = `Fixture sentence ${n} has a _____ here.`; it.blanks = 1; it.answer = 'gap'; it.acceptable = ['gap', 'space']; }
      else {
        it.q = `Fixture sentence ${n} has ${Array.from({ length: blanks }, () => '_____').join(' and ')} here.`; it.blanks = blanks;
        it.answer = Array.from({ length: blanks }, (_, i) => `gap${i + 1}`); it.acceptable = it.answer.map((a) => [a, `${a}s`]);
      }
      break;
    case 'match':
      it.q = `Fixture question ${n}: match the words with their meanings.`;
      it.pairs = Array.from({ length: 5 }, (_, i) => ({ left: `Word ${i + 1}`, right: `Meaning ${i + 1}` }));
      it.answer = 'Word 1-Meaning 1; Word 2-Meaning 2; Word 3-Meaning 3; Word 4-Meaning 4; Word 5-Meaning 5'; break;
    case 'short':
      it.q = `Fixture question ${n}: answer in full sentences.`; it.answer = `Fixture model answer ${n}.`; break;
    case 'long':
      it.q = `Fixture task ${n}: write in full sentences.`; it.answer = `A clear, well-written response covering the task, item ${n}.`;
      it.markingGuide = `Award 1 mark for each of ${marks} clear points in full sentences. Deduct 1 for more than three spelling errors. Maximum ${marks}.`; break;
    case 'handwriting':
      it.q = 'Write the passage in neat handwriting.'; it.answer = 'A neat, evenly spaced copy with correct punctuation.';
      it.markingGuide = `Letters well formed and evenly spaced — ${marks}; mostly neat with a few uneven letters — 2; hard to read — 1. Maximum ${marks}.`; break;
    default: throw new Error(`fixture generator: unhandled type ${base}`);
  }
  if (marks > 1 && base !== 'handwriting') it.answerPoints = points();
  it.skill = 'fixture';
  return it;
}

function build({ profile, chapter, mock }) {
  const spec = profile === 'thin' ? THIN : STANDARD;
  const blueprint = profile === 'thin' ? card.paper_overrides.ch1.section_blueprint : card.section_blueprint;
  const token = mock ? 'chy' : `c${chapter}`;
  let n = 0, q = 0;
  const sections = spec.map((sec, si) => ({
    code: blueprint[si].code, title: blueprint[si].title, marks: blueprint[si].marks,
    blocks: sec.blocks.map((b, bi) => {
      const items = b.items.map(([type, marks, diff], ii) => {
        n++;
        const it = makeItem(type, marks, diff, n);
        it.id = `${card.subject_code}-${token}-s${si + 1}-b${bi + 1}-i${ii + 1}`;
        // instruction.md 6.2: every creative-writing item carries a usable band rubric
        if (blueprint[si].title === 'Creative Writing' && !it.markingGuide) {
          it.markingGuide = `Complete sentence with a capital letter and a full stop, using the word correctly — ${marks}; otherwise — 0.`;
        }
        return it;
      });
      q++;
      const hasTf = items.some((i) => i.type === 'true-false');
      const block = { num: `Q.${q}`, instruction: hasTf ? `${b.instr} Write True or False for the true-false questions.` : b.instr };
      if (b.stim) block.stimulus = JSON.parse(JSON.stringify(b.stim));
      block.items = items;
      return block;
    }),
  }));
  const paper = {
    schemaVersion: '2.0', subject: card.subject_code, subjectDisplay: card.subject_display, grade: card.grade,
    chapter: mock ? null : chapter, ...(mock ? { paperCode: card.extra_papers[0].code } : {}),
    locale: card.locale, numerals: card.numerals,
    title: mock ? card.extra_papers[0].title : card.chapter_list[chapter - 1].title,
    subtitle: mock ? 'English — Class 4 — Half-Yearly Mock' : `English — Class 4 — Chapter ${chapter}`,
    sourceRef: mock ? 'Santoor Grade 4, Chapters 1–6' : `Santoor Grade 4, Ch. ${chapter}`,
    totalMarks: card.total_marks, durationMinutes: card.duration_minutes, sections,
  };
  if (profile === 'thin') {
    for (const sec of sections) for (const b of sec.blocks) b.items.forEach((it, ii) => {
      it.chapterSource = sec.code === 'A' ? (b.num === 'Q.1' ? 'original-A1' : 'original-A2') : `fixture chapter source ${ii + 1}`;
    });
  }
  return paper;
}

// Mock: assign `sourceChapter` so per-key marks equal card.mock_allocation exactly (backtracking bin packing).
function assignMockSources(paper) {
  const alloc = card.mock_allocation;
  const flat = [];
  paper.sections.forEach((s, si) => s.blocks.forEach((b, bi) => b.items.forEach((it) => flat.push({ it, si, bi }))));
  const rest = [];
  let sampleOnly = 0;
  for (const f of flat) {
    if (f.si === 0 && f.bi === 0) f.it.sourceChapter = 'general-unseen';                            // A1
    else if (f.si === 1 && f.bi === 0) { f.it.sourceChapter = 'general-sample-only'; sampleOnly += f.it.marks; } // B1: 3 x 1
    else if (f.si === 3 && f.bi === 0) { f.it.sourceChapter = 'general-sample-only'; sampleOnly += f.it.marks; } // D1: 5 x 1
    else rest.push(f.it);
  }
  const unseen = flat.filter((f) => f.it.sourceChapter === 'general-unseen').reduce((a, f) => a + f.it.marks, 0);
  if (unseen !== alloc.general_unseen || sampleOnly !== alloc.general_sample_only) throw new Error(`mock general pools ${unseen}/${sampleOnly} != card`);
  const keys = Object.keys(alloc.chapters);
  const remaining = keys.map((k) => alloc.chapters[k]);
  const order = rest.slice().sort((a, b) => b.marks - a.marks);
  const chosen = new Array(order.length);
  (function dfs(i) {
    if (i === order.length) return remaining.every((r) => r === 0);
    const seen = new Set();
    for (let b = 0; b < remaining.length; b++) {
      if (remaining[b] < order[i].marks || seen.has(remaining[b])) continue;
      seen.add(remaining[b]);
      remaining[b] -= order[i].marks; chosen[i] = b;
      if (dfs(i + 1)) return true;
      remaining[b] += order[i].marks;
    }
    return false;
  })(0) || (() => { throw new Error('mock allocation cannot be packed'); })();
  order.forEach((it, i) => { it.sourceChapter = parseInt(keys[chosen[i]], 10); });
}

function write(name, paper) {
  fs.mkdirSync(OUT, { recursive: true });
  const items = paper.sections.reduce((a, s) => a + s.blocks.reduce((b, bl) => b + bl.items.length, 0), 0);
  const marks = paper.sections.reduce((a, s) => a + s.blocks.reduce((b, bl) => b + bl.items.reduce((c, it) => c + it.marks, 0), 0), 0);
  fs.writeFileSync(path.join(OUT, name), JSON.stringify(paper, null, 2) + '\n');
  console.log(`wrote fixtures/good/${name}: ${items} items, ${marks} marks, sections [${paper.sections.map((s) => s.marks).join(',')}]`);
}

write('standard-ch2.json', build({ profile: 'standard', chapter: 2 }));
write('thin-ch1.json', build({ profile: 'thin', chapter: 1 }));
const mock = build({ profile: 'standard', mock: true });
assignMockSources(mock);
write('mock-hy.json', mock);
