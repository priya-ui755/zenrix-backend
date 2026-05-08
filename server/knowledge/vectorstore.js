// Vectorstore built from TF-IDF doc freqs as a fallback semantic surface.
// It computes simple cosine similarity between a query term vector and stored
// doc term vectors derived from data/knowledge_tfidf.json.

const TF = require('./tfidf');
let docs = []; // { id, source, vector: {term:weight}, norm }

function buildFromTF(){
  docs = [];
  const index = (TF && TF._rawIndex) ? TF._rawIndex : null;
  // TF module currently exposes data via closure; allow fallback to reloading file
  try{
    // TF already loaded; use internal data by reading file again for stability
    const fs = require('fs');
    const path = require('path');
    const raw = fs.readFileSync(path.join(__dirname,'..','data','knowledge_tfidf.json'),'utf8');
    const json = JSON.parse(raw);
    const entries = json.docs || {};
    for (const id of Object.keys(entries)){
      const doc = entries[id];
      const vec = doc.freqs || {};
      let sumSq = 0;
      for (const t of Object.keys(vec)) sumSq += Math.pow(vec[t],2);
      const norm = Math.sqrt(sumSq) || 1;
      docs.push({ id, source: doc.source || id, vector: vec, norm });
    }
  }catch(e){
    docs = [];
  }
}

function dotQueryDoc(qTerms, doc){
  let s = 0;
  for (const t of Object.keys(qTerms)){
    const dq = qTerms[t] || 0;
    const dv = doc.vector[t] || 0;
    s += dq * dv;
  }
  return s;
}

function buildQueryVector(q){
  // simple tokenization similar to tfidf.tokenize
  const terms = String(q || '').toLowerCase().replace(/["'`.,:;()\[\]{}<>/?\\|@#%^&*=+~!-]/g,' ').split(/\s+/).filter(Boolean);
  const counts = {};
  for (const t of terms) counts[t] = (counts[t] || 0) + 1;
  // apply raw frequency weighting (no idf here) then normalize
  let sumSq = 0;
  for (const t of Object.keys(counts)) sumSq += Math.pow(counts[t],2);
  const norm = Math.sqrt(sumSq) || 1;
  if (norm > 1){
    for (const t of Object.keys(counts)) counts[t] = counts[t] / norm;
  }
  return counts;
}

function searchByQuery(query, topK=4){
  if (!docs || docs.length === 0) buildFromTF();
  const qv = buildQueryVector(query);
  const res = [];
  for (const d of docs){
    const score = dotQueryDoc(qv, d) / (d.norm || 1);
    if (score > 0) res.push({ id: d.id, source: d.source, text: '', score, meta: {} });
  }
  res.sort((a,b)=> b.score - a.score);
  return res.slice(0, topK);
}

function search(embedding, topK=4){
  // If embedding is a string (query), do query search.
  if (typeof embedding === 'string') return searchByQuery(embedding, topK);
  // If an array of numbers given, not implemented — return empty to fallback.
  return [];
}

function getAll(){ return docs.slice(); }
function clearAll(){ docs = []; }

module.exports = { search, searchByQuery, getAll, clearAll, buildFromTF };
