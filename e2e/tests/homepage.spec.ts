import { test, expect } from '@playwright/test';

test('landing page renders correctly and takes screenshot', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=VetFlow').first()).toBeVisible();
  
  // Wait for animations and typewriter to do some work
  await page.waitForTimeout(3000);
  
  await page.screenshot({ path: 'e2e/screenshots/homepage.png', fullPage: true });
});
