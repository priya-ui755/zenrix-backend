const fs = require('fs');
const path = require('path');

function diagnosticsEnabled() {
  return (process.env.E2E_DIAGNOSTICS || '').toLowerCase() === 'true';
}

function ensureTmpDir() {
  const d = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

function writeDiagnosticFile(name, content) {
  if (!diagnosticsEnabled()) return false;
  try {
    const d = ensureTmpDir();
    fs.writeFileSync(path.join(d, name), content);
    return true;
  } catch (err) {
    console.warn('Could not write diagnostic file', err);
    return false;
  }
}

function writeDiagnosticJson(name, obj) {
  return writeDiagnosticFile(name, JSON.stringify(obj, null, 2));
}

module.exports = {
  diagnosticsEnabled,
  writeDiagnosticFile,
  writeDiagnosticJson,
  ensureTmpDir
};
