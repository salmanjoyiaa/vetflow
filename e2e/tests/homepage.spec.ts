import { test, expect } from '@playwright/test';

test('landing page renders correctly and takes screenshot', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('text=ClinixDev').first()).toBeVisible();
  
  await expect(page.locator('text=cinematic clarity')).toBeVisible();
  await page.waitForTimeout(1000);
  
  // Smoothly scroll down the page to trigger all scroll-reveal animations
  await page.evaluate(async () => {
    const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
    const scrollHeight = document.body.scrollHeight;
    const viewportHeight = window.innerHeight;
    let currentPosition = 0;
    
    while (currentPosition < scrollHeight) {
      window.scrollTo(0, currentPosition);
      currentPosition += viewportHeight / 2; // scroll in half-viewport steps
      await delay(50); // small delay to let animations trigger
    }
    
    // Scroll back to top so the page returns to its start state
    window.scrollTo(0, 0);
  });
  
  // Wait a short moment for final layouts to settle
  await page.waitForTimeout(1000);
  
  // Set class to collapse sticky scroll showcase height for clean static page screenshots
  await page.evaluate(() => {
    document.documentElement.classList.add('screenshotting');
  });
  
  await page.screenshot({ path: 'e2e/screenshots/homepage.png', fullPage: true });
});

