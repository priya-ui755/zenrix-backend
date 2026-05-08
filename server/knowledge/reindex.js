const fs = require('fs');
const path = require('path');
const TF = require('../../server/knowledge/tfidf');

// Very small reindex implementation: if there is a source `data/knowledge.json` with
// docs we would (re)generate `data/knowledge_tfidf.json`. For now, this function
// acts as a no-op that reloads tfidf index from disk.

async function reindexAll(){
  // In a full implementation we'd parse sources and compute freqs/len etc.
  // Here we simply reload the TF-IDF data file if present.
  TF.load();
  return { success: true, reindexed: true };
}

module.exports = { reindexAll };
