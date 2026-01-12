const fs = require('fs');
const path = require('path');
const { reindexAll } = require('./reindex');

const JOBS_FILE = path.join(__dirname, '..', '..', 'data', 'reindex_jobs.json');
let jobs = {};

function loadJobs(){
  try{ jobs = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8')); }catch(e){ jobs = {}; }
}
function saveJobs(){
  try{ fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2)); }catch(e){}
}

async function startJob(){
  const jobId = String(Date.now());
  if (Object.values(jobs).some(j=> j.status === 'running')){
    return { alreadyRunning: true, jobId: Object.keys(jobs).find(k=> jobs[k].status === 'running') };
  }
  jobs[jobId] = { id: jobId, status: 'running', startedAt: new Date().toISOString() };
  saveJobs();

  (async ()=>{
    try{
      const res = await reindexAll();
      jobs[jobId].status = 'done';
      jobs[jobId].result = res;
      jobs[jobId].finishedAt = new Date().toISOString();
    }catch(err){
      jobs[jobId].status = 'failed';
      jobs[jobId].error = err.message;
      jobs[jobId].finishedAt = new Date().toISOString();
    } finally { saveJobs(); }
  })();

  return { alreadyRunning: false, jobId };
}

function getJob(id){ return jobs[id] || null; }
function listJobs(limit=50){ return Object.values(jobs).slice(0, limit).sort((a,b)=> b.startedAt.localeCompare(a.startedAt)); }

// Init
loadJobs();

module.exports = { startJob, getJob, listJobs };
