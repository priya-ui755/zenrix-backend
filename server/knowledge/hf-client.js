// Minimal HF client stub. When HF_API_KEY is provided this module could be
// extended to call HuggingFace APIs. For now, it reports unavailable so the
// system will fall back to TF-IDF extractive answers.

function isAvailable(){
  return !!process.env.HF_API_KEY;
}

async function getEmbedding(q){
  throw new Error('HF embedding not implemented in this environment');
}

async function generateAnswer(prompt){
  throw new Error('HF generation not implemented in this environment');
}

module.exports = { isAvailable, getEmbedding, generateAnswer };
