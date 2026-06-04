import { test, expect } from '@playwright/test';

test('doctor workspace dashboard renders and takes screenshot', async ({ page }) => {
  // Login as Doctor
  await page.goto('/login');
  await page.fill('input[type="email"]', 'doctor.a@vetcare.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/dashboard/);

  // Navigate to Doctor Workspace
  await page.click('a[href="/dashboard/doctors"]');
  await expect(page.locator('text=Attending Doctor Workspace')).toBeVisible();
  
  // Wait for page load
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'e2e/screenshots/dashboard-doctor-overview.png' });
});
