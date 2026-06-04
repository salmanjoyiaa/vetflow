import { test, expect } from '@playwright/test';

test.describe('Super Admin Platform Console E2E & Visuals', () => {
  test.beforeEach(async ({ page }) => {
    // Log in as Super Admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'superadmin@vetflow.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/super-admin\/dashboard/);
  });

  test('capture super admin dashboard and organizations screen', async ({ page }) => {
    // 1. Dashboard telemetry console
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/super-admin-dashboard.png' });

    // 2. Organization tenants list
    await page.click('a[href="/super-admin/organizations"]');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/super-admin-organizations.png' });
  });
});
