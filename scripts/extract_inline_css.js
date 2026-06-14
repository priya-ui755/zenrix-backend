const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'Frontend', 'admin-dashboard.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Extract the inline <style> block
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) {
  console.log('No inline <style> found');
  process.exit(0);
}

const cssContent = styleMatch[1].trim();
const cssPath = path.join(__dirname, '..', 'Frontend', 'css', 'admin-dashboard-extras.css');
fs.writeFileSync(cssPath, cssContent);

console.log('Extracted', cssContent.length, 'chars to Frontend/css/admin-dashboard-extras.css');

// Replace the inline <style> with a link to the external file
html = html.replace(
  /<style>[\s\S]*?<\/style>/,
  `<link rel="stylesheet" href="/css/admin-dashboard-extras.css">`
);

fs.writeFileSync(htmlPath, html);
console.log('Updated admin-dashboard.html to reference external CSS');