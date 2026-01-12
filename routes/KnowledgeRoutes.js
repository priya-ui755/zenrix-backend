const express = require('express');
const router = express.Router();
const vectorstore = require('../server/knowledge/vectorstore') || require('../knowledge/vectorstore');
const hf = require('../server/knowledge/hf-client') || require('../knowledge/hf-client');
const { reindexAll } = require('../server/knowledge/reindex') || require('../knowledge/reindex');
const tfidf = require('../server/knowledge/tfidf');
const { requireAdmin } = require('../middleware/auth');

// POST /api/knowledge/query
// body: { q: string, topK?: number, useLLM?: boolean }
router.post('/query', async (req,res,next) => {
  try{
    const q = (req.body && req.body.q) || req.query.q || '';
    const topK = parseInt(req.body.topK || req.query.topK || 4, 10);
    const useLLM = !!req.body.useLLM;
    if (!q) return res.status(400).json({ success:false, error: 'Missing query (q)' });

    // Prefer HF embedding when available; otherwise use TF-IDF fallback
    let snippets = [];
    if (hf.isAvailable()){
      try{
        const emb = await hf.getEmbedding(q);
        if (emb && Array.isArray(emb)){
          const hits = vectorstore.search(emb, topK);
          snippets = hits.map(h=> ({ id: h.id, source: h.source, text: h.text, score: h.score, meta: h.meta, snippet: h.snippet || (h.text ? h.text.slice(0,300) : ''), matchedTerms: h.matchedTerms || [] }));
        } else {
          // Embedding not produced; fallback to vectorstore query or TF-IDF
          const hits = vectorstore.search(q, topK);
          if (hits && hits.length) {
            snippets = hits.map(h=> ({ id: h.id, source: h.source, text: h.text || '', score: h.score, meta: h.meta, snippet: h.snippet || '', matchedTerms: h.matchedTerms || [] }));
          } else {
            const tfhits = tfidf.search(q, topK);
            snippets = tfhits.map(h=> ({ id: h.id, source: h.source, text: h.text, score: h.score, meta: h.meta, snippet: h.snippet || (h.text ? h.text.slice(0,300) : ''), matchedTerms: h.matchedTerms || [] }));
          }
        }
      }catch(err){
        console.warn('Embedding failed, falling back to TF-IDF:', err.message);
        const hits = tfidf.search(q, topK);
        snippets = hits.map(h=> ({ id: h.id, source: h.source, text: h.text, score: h.score, meta: h.meta, snippet: h.snippet || (h.text ? h.text.slice(0,300) : ''), matchedTerms: h.matchedTerms || [] }));
      }
    } else {
      // HF not available: use vectorstore.query fallback (TF-IDF-based similarity)
      const hits = vectorstore.search(q, topK);
      if (hits && hits.length){
        snippets = hits.map(h=> ({ id: h.id, source: h.source, text: h.text || '', score: h.score, meta: h.meta }));
      } else {
        const tfhits = tfidf.search(q, topK);
        snippets = tfhits.map(h=> ({ id: h.id, source: h.source, text: h.text, score: h.score, meta: h.meta }));
      }
    }

    if (useLLM){
      // If HF generation is available, synthesize; otherwise return snippets
      try{
        if (hf.isAvailable()){
          const ctx = snippets.map((s,i)=> `Context ${i+1} (source: ${s.source}):\n${s.text}`).join('\n\n');
          const prompt = `You are an assistant for the Zenrix website. Use the following context snippets and answer the user question concisely and accurately. If the context doesn't have the answer, be honest and recommend contacting support@zenrix.com.np.\n\n${ctx}\n\nQuestion: ${q}\n\nAnswer:`;
          try{
            const answer = await hf.generateAnswer(prompt);
            if (answer) return res.json({ success: true, answer, snippets });
            // else fallthrough to extractive fallback
          }catch(genErr){
            console.warn('LLM generation failed:', genErr.message);
            // fall back to extractive below
          }
        }

        // No HF available or generation failed — return extractive snippet answer
        if (!snippets.length) return res.json({ success:true, answer: null, snippets });
        const top = snippets[0];
        const brief = top.text.length > 600 ? top.text.slice(0,600) + '...' : top.text;
        const answer = `Based on our documentation (source: ${top.source}): ${brief}\n\nIf you need more details, contact support@zenrix.com.np.`;
        return res.json({ success: true, answer, snippets });
      }catch(err){
        console.warn('LLM generation failed:', err.message);
        return res.json({ success:true, answer: null, snippets, warning: 'LLM generation failed' });
      }
    }

    return res.json({ success:true, snippets });
  }catch(err){
    next(err);
  }
});

// POST /api/knowledge/reindex  (admin only) - starts async job
router.post('/reindex', requireAdmin, async (req,res,next)=>{
  try{
    const manager = require('../server/knowledge/reindexManager');
    const result = await manager.startJob();
    if (result.alreadyRunning) return res.json({ success:false, error: 'Another reindex job is already running', jobId: result.jobId });
    return res.json({ success:true, jobId: result.jobId });
  }catch(err){ next(err); }
});

// GET /api/knowledge/reindex/:jobId  (admin only) - job status
router.get('/reindex/:jobId', requireAdmin, async (req,res,next)=>{
  try{
    const manager = require('../server/knowledge/reindexManager');
    const j = manager.getJob(req.params.jobId);
    if (!j) return res.status(404).json({ success:false, error: 'Job not found' });
    res.json({ success:true, job: j });
  }catch(err){ next(err); }
});

// GET /api/knowledge/reindex/logs  (admin only)
router.get('/reindex/logs', requireAdmin, async (req,res,next)=>{
  try{
    const manager = require('../server/knowledge/reindexManager');
    const jobs = manager.listJobs(50);
    res.json({ success:true, jobs });
  }catch(err){ next(err); }
});

// GET /api/knowledge/status  (admin only) — reports HF status and TF‑IDF stats
router.get('/status', requireAdmin, async (req,res,next)=>{
  try{
    const tf = tfidf.getStats();
    const vectorCount = (vectorstore.getAll && typeof vectorstore.getAll === 'function') ? vectorstore.getAll().length : null;
    const hfAvailable = hf.isAvailable ? hf.isAvailable() : !!process.env.HF_API_KEY;
    res.json({ success:true, hfAvailable, tfidf: tf, vectorCount });
  }catch(err){ next(err); }
});

// POST /api/knowledge/clear-vectors  (admin only) — clear semantic vector store (HF embeddings)
router.post('/clear-vectors', requireAdmin, async (req,res,next)=>{
  try{
    if (vectorstore.clearAll) vectorstore.clearAll();
    const vectorCount = (vectorstore.getAll && typeof vectorstore.getAll === 'function') ? vectorstore.getAll().length : 0;
    res.json({ success:true, vectorCount });
  }catch(err){ next(err); }
});

module.exports = router;
