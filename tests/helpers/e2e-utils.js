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

async function writeDiagnosticScreenshot(name, page) {
  if (!diagnosticsEnabled()) return false;
  try {
    const d = ensureTmpDir();
    const p = path.join(d, name);
    await page.screenshot({ path: p, fullPage: true });
    return true;
  } catch (err) {
    console.warn('Could not write diagnostic screenshot', err);
    return false;
  }
}

async function startTracing(context) {
  if (!diagnosticsEnabled()) return false;
  try {
    await context.tracing.start({ screenshots: true, snapshots: true });
    return true;
  } catch (err) {
    console.warn('Could not start tracing', err);
    return false;
  }
}

async function stopTracing(name, context) {
  if (!diagnosticsEnabled()) return false;
  try {
    const d = ensureTmpDir();
    const p = path.join(d, name);
    await context.tracing.stop({ path: p });
    return true;
  } catch (err) {
    console.warn('Could not stop tracing', err);
    return false;
  }
}

module.exports = {
  diagnosticsEnabled,
  writeDiagnosticFile,
  writeDiagnosticJson,
  ensureTmpDir,
  writeDiagnosticScreenshot,
  startTracing,
  stopTracing
};
