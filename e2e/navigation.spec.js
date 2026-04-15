// @ts-check
const { test, expect } = require('@playwright/test');
const { backupDb, restoreDb, loginAsTestUser } = require('./helpers');

test.beforeAll(() => backupDb());
test.afterAll(() => restoreDb());

test.beforeEach(async ({ page }) => {
  await loginAsTestUser(page);
});

test.describe('Navigation', () => {
  test('header shows correct nav links for authenticated user', async ({ page }) => {
    await page.goto('/');

    // The authenticated nav should have: Home, New Article, Settings, Profile
    const authNav = page.locator('ul[show-authed="true"]');
    await expect(authNav).toBeVisible();

    await expect(authNav.locator('.nav-link', { hasText: 'Home' })).toBeVisible();
    await expect(authNav.locator('.nav-link', { hasText: 'New Article' })).toBeVisible();
    await expect(authNav.locator('.nav-link', { hasText: 'Settings' })).toBeVisible();
    await expect(authNav.locator('.nav-link', { hasText: 'Maeve_Horseman' })).toBeVisible();
  });

  test('clicking New Article navigates to editor', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('ul[show-authed="true"]')).toBeVisible();

    await page.locator('ul[show-authed="true"] .nav-link', { hasText: 'New Article' }).click();
    await expect(page.locator('.editor-page')).toBeVisible();
  });

  test('clicking Settings navigates to settings page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('ul[show-authed="true"]')).toBeVisible();

    await page.locator('ul[show-authed="true"] .nav-link', { hasText: 'Settings' }).click();
    await expect(page.locator('.settings-page')).toBeVisible();
  });

  test('clicking profile link navigates to profile page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('ul[show-authed="true"]')).toBeVisible();

    await page.locator('ul[show-authed="true"] .nav-link', { hasText: 'Maeve_Horseman' }).click();
    await expect(page.locator('.profile-page')).toBeVisible();
  });
});
