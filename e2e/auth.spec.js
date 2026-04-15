// @ts-check
const { test, expect } = require('@playwright/test');
const { backupDb, restoreDb } = require('./helpers');

test.beforeAll(() => backupDb());
test.afterAll(() => restoreDb());

test.describe('Authentication', () => {
  test('can log in with test user credentials', async ({ page }) => {
    // Navigate to the app first to get localStorage populated
    await page.goto('/');
    // Wait for app to initialize
    await expect(page.locator('.navbar-brand')).toBeVisible();

    // Clear the token and navigate to login
    await page.evaluate(() => {
      localStorage.removeItem('jwtToken');
    });

    await page.goto('/#!/login');
    await expect(page.locator('.auth-page')).toBeVisible();

    // Fill in login form
    await page.locator('input[placeholder="Email"]').fill('maeve@example.com');
    await page.locator('input[placeholder="Password"]').fill('password123');

    // Submit the form and wait for the login API response
    const loginResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/users/login') && resp.status() === 200
    );
    await page.locator('button[type="submit"]').click();
    await loginResponse;

    // Should show the username in the nav after redirect
    const profileLink = page.locator('.navbar .nav-link', { hasText: 'Maeve_Horseman' });
    await expect(profileLink).toBeVisible();
  });
});
