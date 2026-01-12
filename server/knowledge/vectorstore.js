// Minimal vectorstore placeholder. Full semantic search requires embeddings which are
// not available in this lightweight implementation. This implementation keeps an
// in-memory list and provides search(), getAll(), clearAll().

let store = [];

function search(embedding, topK=4){
  // No-op: without embeddings we return empty array so callers fallback to TF-IDF
  return [];
}

function getAll(){
  return store.slice();
}

function clearAll(){
  store = [];
}

module.exports = { search, getAll, clearAll };
