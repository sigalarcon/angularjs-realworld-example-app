// @ts-check
const { test, expect } = require('@playwright/test');
const { backupDb, restoreDb, loginAsTestUser } = require('./helpers');

test.beforeAll(() => backupDb());
test.afterAll(() => restoreDb());

test.beforeEach(async ({ page }) => {
  await loginAsTestUser(page);
});

test.describe('User Settings', () => {
  test('settings form is pre-populated with current user data', async ({ page }) => {
    await page.goto('/#!/settings');
    await expect(page.locator('.settings-page')).toBeVisible();

    // Username should be pre-populated
    const usernameInput = page.locator('input[placeholder="Username"]');
    await expect(usernameInput).toHaveValue('Maeve_Horseman');

    // Email should be pre-populated
    const emailInput = page.locator('input[placeholder="Email"]');
    await expect(emailInput).toHaveValue('maeve@example.com');
  });

  test('can update bio and navigate to profile', async ({ page }) => {
    await page.goto('/#!/settings');
    await expect(page.locator('.settings-page')).toBeVisible();

    // Update bio
    const bioTextarea = page.locator('textarea[placeholder="Short bio about you"]');
    await bioTextarea.fill('E2E test bio update');

    // Submit
    const updateResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/user') && resp.request().method() === 'PUT'
    );
    await page.locator('button[type="submit"]', { hasText: 'Update Settings' }).click();
    await updateResponse;

    // Should navigate to profile page
    await expect(page.locator('.profile-page')).toBeVisible();
  });
});
