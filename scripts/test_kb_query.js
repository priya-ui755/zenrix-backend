// Simple KB smoke test
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

(async ()=>{
  try{
    const res = await fetch('http://localhost:3000/api/knowledge/query',{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({q: 'local setup', topK:3})});
    const j = await res.json();
    console.log('KB query status:', j && j.success ? 'OK' : 'FAIL');
    console.log(JSON.stringify(j, null, 2).slice(0, 2000));
    process.exit(j && j.success ? 0 : 2);
  }catch(e){
    console.error('KB test error:', e.message); process.exit(3);
  }
})();