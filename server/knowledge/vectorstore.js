const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
const STORE_PATH = path.join(DB_DIR, 'knowledge.json');

function init(){
  if (!fs.existsSync(STORE_PATH)){
    fs.writeFileSync(STORE_PATH, JSON.stringify({ docs: [] }, null, 2), 'utf8');
  }
}

function _read(){
  try{ const raw = fs.readFileSync(STORE_PATH, 'utf8'); return JSON.parse(raw); } catch(e){ return { docs: [] }; }
}
function _write(data){ fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8'); }

function upsert(id, source, text, embedding, meta={}){
  const data = _read();
  const found = data.docs.find(d => d.id === id);
  const entry = { id, source, text, embedding, meta };
  if (found){
    Object.assign(found, entry);
  } else {
    data.docs.push(entry);
  }
  _write(data);
}

function clearAll(){
  _write({ docs: [] });
}

function getAll(){
  const data = _read();
  return data.docs.map(d => ({ id: d.id, source: d.source, text: d.text, embedding: d.embedding, meta: d.meta || {} }));
}

function dot(a,b){ let s=0; for (let i=0;i<a.length;i++) s+=a[i]*b[i]; return s; }
function norm(a){ return Math.sqrt(dot(a,a)); }
function similarity(a,b){ const na=norm(a); const nb=norm(b); if(!na||!nb) return 0; return dot(a,b)/(na*nb); }

function search(embedding, topK=5){
  const rows = getAll();
  const scored = rows.map(r => ({ ...r, score: similarity(embedding, r.embedding || []) }));
  scored.sort((a,b)=>b.score - a.score);
  return scored.slice(0, topK);
}

init();

module.exports = { init, upsert, clearAll, getAll, search };
