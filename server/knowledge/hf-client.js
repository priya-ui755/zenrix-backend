require('dotenv').config();
const fetch = global.fetch || require('node-fetch');
const HF_API = process.env.HF_API_KEY;
const HF_EMBED_MODEL = process.env.HF_EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';
const HF_RAG_MODEL = process.env.HF_RAG_MODEL || 'google/flan-t5-large';

function isAvailable(){ return !!HF_API; }

if (!HF_API) console.info('ℹ️ Hugging Face not configured — embeddings/generation will be skipped; TF-IDF fallback will be used.');

async function getEmbedding(text){
  // If HF not configured, return null to allow graceful fallback
  if (!HF_API) return null;

  // Try model endpoint first
  const url = `https://api-inference.huggingface.co/models/${HF_EMBED_MODEL}`;
  let res = await fetch(url, {
    method: 'POST', headers: { 'Authorization': `Bearer ${HF_API}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: text })
  });
  if (res.ok){
    const data = await res.json();
    if (Array.isArray(data) && typeof data[0] === 'number') return data;
    if (Array.isArray(data) && data[0] && Array.isArray(data[0].embedding)) return data[0].embedding;
    if (data.embedding && Array.isArray(data.embedding)) return data.embedding;
    // sometimes models return { embeddings: [...] }
    if (data.embeddings && Array.isArray(data.embeddings) && Array.isArray(data.embeddings[0])) return data.embeddings[0];
  }

  // Fallback: try the generic embeddings endpoint
  const embedUrl = 'https://api-inference.huggingface.co/embeddings';
  res = await fetch(embedUrl, {
    method: 'POST', headers: { 'Authorization': `Bearer ${HF_API}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: HF_EMBED_MODEL, input: text })
  });
  if (!res.ok) throw new Error(`Embedding request failed: ${res.status} ${res.statusText}`);
  const data2 = await res.json();
  // Parse variety of shapes
  if (data2.data && Array.isArray(data2.data) && data2.data[0].embedding) return data2.data[0].embedding;
  if (data2.embedding && Array.isArray(data2.embedding)) return data2.embedding;
  if (Array.isArray(data2) && typeof data2[0] === 'number') return data2;
  throw new Error('Unexpected embedding response from HF (fallback)');
}

async function generateAnswer(prompt){
  if (!HF_API) return null; // if HF not configured, return null to let callers fallback
  const url = `https://api-inference.huggingface.co/models/${HF_RAG_MODEL}`;
  const res = await fetch(url, {
    method: 'POST', headers: { 'Authorization': `Bearer ${HF_API}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 256, do_sample: false } })
  });
  if (!res.ok) throw new Error(`Generation request failed: ${res.status} ${res.statusText}`);
  const data = await res.json();
  // HF generation often returns {generated_text: '...'} or an array
  if (typeof data === 'string') return data;
  if (Array.isArray(data) && data[0] && (data[0].generated_text || data[0].text)) return data[0].generated_text || data[0].text;
  if (data.generated_text) return data.generated_text;
  // Fallback: if returned as an array of tokens / strings
  return JSON.stringify(data);
}

module.exports = { getEmbedding, generateAnswer, isAvailable };
