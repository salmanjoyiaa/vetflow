import { test, expect } from '@playwright/test';

test('landing page renders correctly and takes screenshot', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=ClinixDev').first()).toBeVisible();
  
  await expect(page.locator('text=cinematic clarity')).toBeVisible();
  await page.waitForTimeout(1500);
  
  await page.screenshot({ path: 'e2e/screenshots/homepage.png', fullPage: true });
});
