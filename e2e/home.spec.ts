import { expect, test } from '@playwright/test';

test('homepage has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" the correct app title
  await expect(page).toHaveTitle(/The IDEA/);
});
