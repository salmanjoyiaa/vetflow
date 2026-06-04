import { test, expect } from '@playwright/test';

test('receptionist dashboard renders and takes screenshot', async ({ page }) => {
  // Login as Receptionist
  await page.goto('/login');
  await page.fill('input[type="email"]', 'receptionist.a@vetcare.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);

  // Wait for page load
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'e2e/screenshots/dashboard-receptionist-overview.png' });
});
