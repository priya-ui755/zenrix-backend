const fs = require('fs');
const path = require('path');
const { reindexAll } = require('./reindex');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const JOBS_FILE = path.join(DATA_DIR, 'reindex_jobs.json');

function _readJobs(){
  try{ return JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8')); }catch(e){ return { jobs: [] }; }
}
function _writeJobs(obj){ if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(JOBS_FILE, JSON.stringify(obj, null, 2), 'utf8'); }

function _save(jobs){ _writeJobs({ jobs }); }

function listJobs(limit = 20){
  const obj = _readJobs();
  const jobs = obj.jobs || [];
  return jobs.slice().reverse().slice(0, limit);
}

function getJob(id){
  const obj = _readJobs();
  return (obj.jobs || []).find(j => j.id === id) || null;
}

async function startJob(){
  // don't start if a job is already running
  const current = ( _readJobs().jobs || [] ).find(j => j.status === 'running');
  if (current) return { alreadyRunning: true, jobId: current.id };

  const job = {
    id: `job_${Date.now()}`,
    status: 'running',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    processed: 0,
    total: 0,
    logs: []
  };

  const obj = _readJobs(); obj.jobs = obj.jobs || []; obj.jobs.push(job); _save(obj.jobs);

  // run in background
  (async ()=>{
    try{
      await reindexAll({ progress: (p)=>{
        job.processed = p.processed || job.processed;
        job.total = p.total || job.total;
        job.updatedAt = new Date().toISOString();
        const entry = `[${new Date().toISOString()}] ${p.message || ''} ${p.id ? `(${p.id})` : ''}`;
        job.logs = job.logs || [];
        job.logs.push(entry);
        // keep logs bounded
        if (job.logs.length > 200) job.logs.shift();
        _save(obj.jobs);
      } });
      job.status = 'completed';
      job.updatedAt = new Date().toISOString();
      job.logs.push(`[${new Date().toISOString()}] completed`);
      _save(obj.jobs);
    }catch(err){
      job.status = 'failed';
      job.updatedAt = new Date().toISOString();
      job.error = err.message;
      job.logs.push(`[${new Date().toISOString()}] error: ${err.message}`);
      _save(obj.jobs);
    }
  })();

  return { jobId: job.id };
}

module.exports = { startJob, getJob, listJobs };
