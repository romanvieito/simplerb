import { test, expect } from '@playwright/test';

test.describe('Auth redirect (dev bypass)', () => {
  test('sign-in redirects to dashboard', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('sign-up redirects to dashboard', async ({ page }) => {
    await page.goto('/sign-up');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    await expect(page).toHaveURL(/\/dashboard$/);
  });
});


