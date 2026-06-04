import { test, expect } from '@playwright/test';

test.describe('Clinic Admin Dashboard E2E & Visuals', () => {
  test.beforeEach(async ({ page }) => {
    // Perform login first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin.a@vetcare.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('capture all dashboard administration screens', async ({ page }) => {
    // 1. Overview Dashboard
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/dashboard-admin-overview.png' });

    // 2. Appointments
    await page.click('a[href="/dashboard/appointments"]');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/dashboard-admin-appointments.png' });

    // 3. Walk-ins Queue
    await page.click('a[href="/dashboard/walk-ins"]');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/dashboard-admin-walk-ins.png' });

    // 4. Customers List
    await page.click('a[href="/dashboard/customers"]');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/dashboard-admin-customers.png' });

    // 5. Pets Registry
    await page.click('a[href="/dashboard/pets"]');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/dashboard-admin-pets.png' });

    // 6. Inventory
    await page.click('a[href="/dashboard/inventory"]');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/dashboard-admin-inventory.png' });

    // 7. Invoices
    await page.click('a[href="/dashboard/invoices"]');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/dashboard-admin-invoices.png' });

    // 8. Prescriptions
    await page.click('a[href="/dashboard/prescriptions"]');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/dashboard-admin-prescriptions.png' });

    // 9. Staff Management
    await page.click('a[href="/dashboard/staff"]');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/dashboard-admin-staff.png' });

    // 10. Reports & Analytics
    await page.click('a[href="/dashboard/reports"]');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/dashboard-admin-reports.png' });

    // 11. Branch Settings
    await page.click('a[href="/dashboard/branches"]');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/dashboard-admin-branches.png' });

    // 12. App Settings
    await page.click('a[href="/dashboard/settings"]');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/screenshots/dashboard-admin-settings.png' });
  });
});
