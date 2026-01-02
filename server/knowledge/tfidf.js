const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const TF_FILE = path.join(DATA_DIR, 'knowledge_tfidf.json');
const VERSION = 1;

const STOPWORDS = new Set([ 'a','an','and','are','as','at','be','but','by','for','if','in','into','is','it','no','not','of','on','or','such','that','the','their','then','there','these','they','this','to','was','will','with','from','we','you','your','our','i','me','my','have','has' ]);

function normalizeText(text){
  if (!text) return '';
  return text.toString().normalize('NFKC');
}

function tokenize(text){
  const t = normalizeText(text).toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
  return t.split(/\s+/).filter(Boolean).filter(tok => tok.length > 1 && !STOPWORDS.has(tok));
}

function safeWrite(obj){
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(TF_FILE, JSON.stringify(obj, null, 2), 'utf8');
}

function build(docs){
  // docs: [{id, source, text, meta}]
  const N = docs.length;
  const df = {};
  const docTerms = {};

  docs.forEach(d => {
    const terms = tokenize(d.text);
    const freqs = {};
    terms.forEach(t => freqs[t] = (freqs[t]||0)+1);
    docTerms[d.id] = { freqs, len: terms.length, source: d.source, text: d.text, meta: d.meta || {} };
    const seen = new Set();
    Object.keys(freqs).forEach(t => { if (!seen.has(t)){ df[t] = (df[t]||0)+1; seen.add(t); } });
  });

  // idf with smoothing + add-one
  const idf = {};
  Object.keys(df).forEach(t => idf[t] = Math.log((N + 1) / (df[t] + 1)) + 1);

  // Precompute tf-idf vectors (sparse) and norms
  const vectors = {};
  const norms = {};
  Object.entries(docTerms).forEach(([id, d]) => {
    const vec = {};
    Object.entries(d.freqs).forEach(([t,f]) => {
      // log-normalized TF for robustness
      const tf = 1 + Math.log(f);
      vec[t] = tf * (idf[t] || 0);
    });
    // compute norm
    let s = 0;
    Object.values(vec).forEach(v => { s += v*v; });
    vectors[id] = vec;
    norms[id] = s > 0 ? Math.sqrt(s) : 0;
  });

  const store = { version: VERSION, docs: docTerms, idf, vectors, norms, builtAt: new Date().toISOString() };
  safeWrite(store);
  return store;
}

function _read(){
  try{ return JSON.parse(fs.readFileSync(TF_FILE, 'utf8')); } catch(e){ return { version: VERSION, docs: {}, idf: {}, vectors: {}, norms: {} }; }
}

function dotSparse(a,b){
  let s = 0;
  for (const k in a){ if (b[k]) s += a[k]*b[k]; }
  return s;
}

function normSparse(a){ let s=0; for (const k in a){ s += a[k]*a[k]; } return s > 0 ? Math.sqrt(s) : 0; }

function extractSnippet(text, terms, len=180){
  if (!text) return '';
  const low = text.toLowerCase();
  for (const t of terms){
    const idx = low.indexOf(t);
    if (idx !== -1){
      const start = Math.max(0, idx - Math.floor(len/3));
      const snippet = text.slice(start, start + len);
      return (start > 0 ? '... ' : '') + snippet.trim() + (start + len < text.length ? ' ...' : '');
    }
  }
  // fallback to start of text
  return text.slice(0, len) + (text.length > len ? ' ...' : '');
}

function search(query, topK=5, opts = {}){
  // opts: { minScore }
  const store = _read();
  const qterms = tokenize(query);
  if (!qterms.length) return [];
  const qfreq = {};
  qterms.forEach(t => qfreq[t] = (qfreq[t]||0)+1);

  // Build q vector with log-scaling TF and idf
  const qvec = {};
  const qlen = qterms.length;
  qterms.forEach(t => {
    const tf = 1 + Math.log(qfreq[t]);
    qvec[t] = tf * (store.idf[t] || Math.log((Object.keys(store.docs).length + 1) / 1) + 1);
  });

  const qnorm = normSparse(qvec);
  if (!qnorm) return [];

  const scores = [];
  for (const id in store.vectors){
    const v = store.vectors[id];
    const docNorm = store.norms && store.norms[id] ? store.norms[id] : normSparse(v);
    const sim = (docNorm && qnorm) ? dotSparse(v, qvec)/(docNorm*qnorm) : 0;
    scores.push({ id, score: sim, source: store.docs[id].source, text: store.docs[id].text, meta: store.docs[id].meta });
  }
  scores.sort((a,b)=>b.score - a.score);
  const filtered = scores.filter(s => !opts.minScore || s.score >= opts.minScore).slice(0, topK);

  // attach matched terms and snippets
  return filtered.map(res => {
    const matchedTerms = qterms.filter(t => Object.prototype.hasOwnProperty.call(res.text.toLowerCase(), t) || (res.text.toLowerCase().indexOf(t) !== -1));
    const snippet = extractSnippet(res.text, qterms);
    return { id: res.id, score: res.score, source: res.source, text: res.text, meta: res.meta, snippet, matchedTerms };
  });
}

function upsert(doc){
  // doc: { id, source, text, meta }
  const store = _read();
  const d = { freqs: {}, len: 0, source: doc.source, text: doc.text || '', meta: doc.meta || {} };
  const terms = tokenize(doc.text);
  terms.forEach(t => d.freqs[t] = (d.freqs[t]||0)+1);
  d.len = terms.length;
  store.docs = store.docs || {};
  store.docs[doc.id] = d;

  // recompute df and idf globally (simple but safe)
  const df = {};
  const docsArr = Object.values(store.docs);
  docsArr.forEach(dd => { Object.keys(dd.freqs).forEach(t => df[t] = (df[t]||0)+1); });
  const N = docsArr.length;
  store.idf = store.idf || {};
  Object.keys(df).forEach(t => store.idf[t] = Math.log((N + 1) / (df[t] + 1)) + 1);

  // recompute vectors and norms
  store.vectors = store.vectors || {};
  store.norms = store.norms || {};
  Object.entries(store.docs).forEach(([id, dd]) => {
    const vec = {};
    Object.entries(dd.freqs).forEach(([t,f]) => {
      const tf = 1 + Math.log(f);
      vec[t] = tf * (store.idf[t] || 0);
    });
    let s = 0; Object.values(vec).forEach(v => { s += v*v; });
    store.vectors[id] = vec;
    store.norms[id] = s > 0 ? Math.sqrt(s) : 0;
  });

  store.builtAt = new Date().toISOString();
  safeWrite(store);
  return store;
}

function remove(id){
  const store = _read();
  if (!store.docs || !store.docs[id]) return store;
  delete store.docs[id];
  delete store.vectors[id];
  delete store.norms[id];

  // recompute df/idf
  const df = {};
  const docsArr = Object.values(store.docs);
  docsArr.forEach(dd => { Object.keys(dd.freqs).forEach(t => df[t] = (df[t]||0)+1); });
  const N = docsArr.length;
  const idf = {};
  Object.keys(df).forEach(t => idf[t] = Math.log((N + 1) / (df[t] + 1)) + 1);
  store.idf = idf;

  // recompute vectors/norms
  store.vectors = store.vectors || {};
  store.norms = store.norms || {};
  Object.entries(store.docs).forEach(([did, dd]) => {
    const vec = {};
    Object.entries(dd.freqs).forEach(([t,f]) => {
      const tf = 1 + Math.log(f);
      vec[t] = tf * (store.idf[t] || 0);
    });
    let s = 0; Object.values(vec).forEach(v => { s += v*v; });
    store.vectors[did] = vec;
    store.norms[did] = s > 0 ? Math.sqrt(s) : 0;
  });

  store.builtAt = new Date().toISOString();
  safeWrite(store);
  return store;
}

function getStats(){
  const store = _read();
  return {
    version: store.version || VERSION,
    docCount: Object.keys(store.docs || {}).length,
    vocabSize: Object.keys(store.idf || {}).length,
    builtAt: store.builtAt || null
  };
}

module.exports = { build, search, TF_FILE, _read, upsert, remove, getStats };

