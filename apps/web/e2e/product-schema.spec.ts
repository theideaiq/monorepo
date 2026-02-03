import { test, expect } from '@playwright/test';

test('Product page has JSON-LD schema', async ({ page }) => {
  await page.goto('/en/product/logitech-g-pro-x-superlight');

  // Verify page loaded - use a more loose selector if needed, or specific to H1
  await expect(page.locator('h1')).toContainText('Logitech G Pro X Superlight');

  // Find all json-ld scripts
  const scripts = page.locator('script[type="application/ld+json"]');
  const count = await scripts.count();
  console.log(`Found ${count} JSON-LD scripts`);

  let found = false;
  for (let i = 0; i < count; i++) {
    const text = await scripts.nth(i).textContent();
    console.log(`Script ${i}:`, text);
    if (text && text.includes('"@type":"Product"')) {
        found = true;
        const schema = JSON.parse(text);
        expect(schema.name).toBe('Logitech G Pro X Superlight');
        expect(schema.offers.price).toBe(150000);
        expect(schema.aggregateRating.reviewCount).toBe(124);
    }
  }
  expect(found).toBeTruthy();
});
