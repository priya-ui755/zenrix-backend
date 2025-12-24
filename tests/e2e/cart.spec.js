const { test, expect } = require('@playwright/test');

// Start server before running tests manually (or use a separate runner). These E2E tests assume the server is running on localhost:3000 and the frontend served from file:// or a simple static server.
const BASE = 'http://localhost:3000';

test.describe('Cart E2E', () => {
  test('Adding product updates navbar count across pages', async ({ page, context }) => {
    // Open index page
    await page.goto('/index.html');
    // Wait for products to load (the site uses #featuredProducts or #productsGrid)
    await page.waitForSelector('#featuredProducts, #productsGrid');

    // Navigate to products and pick first product
    await page.goto('/products.html');
    await page.waitForSelector('#productsGrid');

    // Click the first product to open product detail then click Add to Cart
    const firstProductLink = await page.locator('#productsGrid a').first();
    await firstProductLink.click();
    await page.waitForSelector('#addToCart');
    await page.click('#addToCart');

    // Check navbar cart count on same page (access shadow DOM)
    const count = await page.locator('custom-navbar').evaluate((el) => el.shadowRoot.getElementById('cartCount').textContent);
    expect(Number(count)).toBeGreaterThan(0);

    // Open a second tab and check the count syncs
    const page2 = await context.newPage();
    await page2.goto('/index.html');
    await page2.waitForTimeout(500);
    const count2 = await page2.locator('custom-navbar').evaluate((el) => el.shadowRoot.getElementById('cartCount').textContent);
    expect(Number(count2)).toBeGreaterThan(0);
  });
});