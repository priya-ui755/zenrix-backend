require('dotenv').config();
const fs = require('fs');
const path = require('path');
const hf = require('./hf-client');
const vectorstore = require('./vectorstore');
const Page = require('../../models/Page');

function stripHtml(html){
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g,' ').trim();
}

function chunkText(text, size=800){
  const chunks = [];
  let i=0;
  while (i<text.length){
    let chunk = text.slice(i, i+size);
    // try to extend to sentence end
    const last = chunk.lastIndexOf('. ');
    if (last > Math.floor(size*0.6)) chunk = text.slice(i, i+last+1);
    chunks.push(chunk.trim());
    i += chunk.length;
  }
  return chunks.filter(Boolean);
}

async function reindexAll(opts = {}){
  // opts: { progress: function({ processed, total, id, message }) }
  const progress = typeof opts.progress === 'function' ? opts.progress : ()=>{};

  vectorstore.clearAll();
  const docs = [];

  // Index markdown/readme files
  const rootFiles = ['README.md','SETUP.md','OAUTH_SETUP.md','README_DOCKER.md'];
  for (const f of rootFiles){
    const p = path.join(__dirname, '..', '..', f);
    if (fs.existsSync(p)){
      const text = fs.readFileSync(p, 'utf8');
      const chunks = chunkText(text);
      chunks.forEach((c, idx)=> docs.push({ id: `file:${f}:${idx}`, source: f, text: c }));
    }
  }

  // Index frontend HTML pages (stripped)
  const frontDir = path.join(__dirname, '..', '..', 'Frontend');
  const files = fs.readdirSync(frontDir).filter(x=>x.endsWith('.html'));
  for (const f of files){
    const p = path.join(frontDir, f);
    const html = fs.readFileSync(p, 'utf8');
    const txt = stripHtml(html);
    const chunks = chunkText(txt);
    chunks.forEach((c, idx)=> docs.push({ id: `page:${f}:${idx}`, source: `/frontend/${f}`, text: c }));
  }

  // Index pages from DB (Page model)
  if (process.env.MONGODB_URI) {
    const mongoose = require('mongoose');
    try {
      await mongoose.connect(process.env.MONGODB_URI, { connectTimeoutMS: 5000 });
      const pages = await Page.find().lean();
      for (const pg of pages){
        const text = (pg.content || pg.body || pg.html || pg.metaDescription || '').toString();
        const chunks = chunkText(text + '\n' + (pg.title||''));
        chunks.forEach((c,idx)=> docs.push({ id: `db:page:${pg._id}:${idx}`, source: `db:page:${pg._id}`, text: c, meta: { title: pg.title } }));
      }
      await mongoose.disconnect();
    } catch (err){
      console.warn('Could not fetch pages from DB:', err.message);
    }
  } else {
    console.warn('MONGODB_URI not set; skipping DB pages.');
  }

  // Embed and insert (if HF available) — also collect docs for TF-IDF
  const collected = [];
  let hfWarned = false;
  let i = 0;
  const total = docs.length;
  for (const doc of docs){
    i++;
    collected.push({ id: doc.id, source: doc.source, text: doc.text, meta: doc.meta || {} });
    progress({ processed: i, total, id: doc.id, message: 'indexed chunk' });

    if (!hf.isAvailable()){
      if (!hfWarned){ console.info('ℹ️ Hugging Face not configured — skipping embeddings and vectorstore population. TF-IDF will be built as fallback.'); hfWarned = true; }
      continue;
    }

    try{
      const emb = await hf.getEmbedding(doc.text);
      if (emb && Array.isArray(emb)){
        vectorstore.upsert(doc.id, doc.source, doc.text, emb, doc.meta || {});
        progress({ processed: i, total, id: doc.id, message: 'embedded' });
      } else {
        // embedding returned null or unexpected; skip
        progress({ processed: i, total, id: doc.id, message: 'no embedding' });
        console.warn('Embedding not produced for', doc.id);
      }
    } catch (err){
      progress({ processed: i, total, id: doc.id, message: `embed failed: ${err.message}` });
      console.warn('Embed failed for', doc.id, err.message);
    }
  }

  // Build TF-IDF fallback index (free offline)
  try{
    progress({ processed: total, total, id: null, message: 'building tfidf' });
    const tf = require('./tfidf');
    tf.build(collected);
    progress({ processed: total, total, id: null, message: 'tfidf built' });
  }catch(e){ progress({ processed: total, total, id: null, message: `tfidf build failed: ${e.message}` }); console.warn('TF-IDF build failed:', e.message); }

  return { success: true, count: docs.length };
}

module.exports = { reindexAll };
