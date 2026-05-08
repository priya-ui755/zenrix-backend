const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', '..', 'data', 'feature_flags.json');

let flags = { knowledge: true };

function load(){
  try{ flags = JSON.parse(fs.readFileSync(FILE,'utf8')); }catch(e){ flags = { knowledge: true }; }
}
function save(){
  try{ fs.writeFileSync(FILE, JSON.stringify(flags, null, 2)); }catch(e){}
}

function isKnowledgeEnabled(){
  return !!flags.knowledge;
}

function setKnowledgeEnabled(enabled){
  flags.knowledge = !!enabled;
  save();
}

// init
load();

module.exports = { isKnowledgeEnabled, setKnowledgeEnabled, load, save };
