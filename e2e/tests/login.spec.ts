import { test, expect } from '@playwright/test';

test('login page renders correctly, shows credentials, and handles authentication', async ({ page }) => {
  await page.goto('/login');
  
  // Verify basic form elements
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  
  // Capture screenshot of login page
  await page.screenshot({ path: 'e2e/screenshots/login-page.png' });

  // Log in as Clinic Admin
  await page.fill('input[type="email"]', 'admin.a@vetcare.com');
  await page.fill('input[type="password"]', 'password123');
  await page.click('button[type="submit"]');

  // Verify redirect to dashboard
  await expect(page).toHaveURL(/\/dashboard/);
});
