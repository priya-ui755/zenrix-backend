/**
 * Simple CLI to reindex knowledge by calling the internal reindex logic.
 * Usage: HF_API_KEY is optional; set it if you want Hugging Face embeddings to be created (and set MONGODB_URI if you want DB pages included).
 */
(async ()=>{
  try{
    const r = require('../server/knowledge/reindex');
    console.log('Starting reindex...');
    const res = await r.reindexAll();
    console.log('Reindex complete:', res);
    process.exit(0);
  }catch(err){
    console.error('Reindex failed:', err);
    process.exit(1);
  }
})();
