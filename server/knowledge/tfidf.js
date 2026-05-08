const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'knowledge_tfidf.json');
let index = { version: 1, docs: {} };

function load() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    index = JSON.parse(raw);
  } catch (e) {
    index = { version: 1, docs: {} };
  }
}

function tokenize(s){
  return String(s || '')
    .toLowerCase()
    .replace(/["'`.,:;()\[\]{}<>/?\\|@#%^&*=+~!-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function search(q, topK=4){
  if (!q) return [];
  const terms = tokenize(q);
  const results = [];
  for (const id of Object.keys(index.docs || {})){
    const doc = index.docs[id];
    let score = 0;
    const matched = [];
    for (const t of terms){
      const f = doc.freqs && doc.freqs[t] ? doc.freqs[t] : 0;
      if (f > 0) matched.push(t);
      score += f;
    }
    if (doc.len && doc.len > 0) score = score / Math.max(1, doc.len);
    if (score > 0){
      results.push({ id, source: doc.source || id, text: doc.text || '', score, meta: doc.meta || {}, matchedTerms: matched });
    }
  }
  results.sort((a,b)=> b.score - a.score);
  return results.slice(0, topK);
}

function getStats(){
  const docs = index.docs || {};
  const count = Object.keys(docs).length;
  let totalLen = 0;
  for (const id of Object.keys(docs)) totalLen += docs[id].len || 0;
  return { docCount: count, avgLen: count ? (totalLen / count) : 0 };
}

// Load on require
load();

module.exports = { search, getStats, load };
