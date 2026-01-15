const puppeteer = require('puppeteer');
const fs = require('fs');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/profile.html', { waitUntil: 'networkidle2' });
  await page.evaluate(() => localStorage.setItem('token', 'fake-token'));
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const exists = await page.$('#logoutBtn') !== null;
  const result = { exists };
  if (exists) {
    const styles = await page.evaluate(() => {
      const el = document.getElementById('logoutBtn');
      const cs = window.getComputedStyle(el);
      return {
        tag: el.tagName,
        classList: Array.from(el.classList),
        background: cs.backgroundColor,
        padding: cs.padding,
        border: cs.border,
        borderRadius: cs.borderRadius,
        color: cs.color,
        display: cs.display
      };
    });
    result.styles = styles;
    await page.screenshot({ path: 'tmp/profile-logout.png', fullPage: false });

    // Simulate click and verify logout clears token and redirects
    await page.evaluate(() => localStorage.setItem('token', 'temporary-token'));
    // Scroll into view and click
    await page.evaluate(() => {
      const el = document.getElementById('logoutBtn');
      if (el) { el.scrollIntoView({ block: 'center', inline: 'center' }); el.click(); }
    });
    await new Promise(r => setTimeout(r, 600));
    const tokenAfter = await page.evaluate(() => localStorage.getItem('token'));
    const url = page.url();
    result.logout = { tokenAfter, url };
  }
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();