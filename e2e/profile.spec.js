// @ts-check
const { test, expect } = require('@playwright/test');
const { backupDb, restoreDb, loginAsTestUser } = require('./helpers');

test.beforeAll(() => backupDb());
test.afterAll(() => restoreDb());

test.beforeEach(async ({ page }) => {
  await loginAsTestUser(page);
});

test.describe('Profile Page', () => {
  test('displays profile info for a user', async ({ page }) => {
    await page.goto('/#!/@golfcalifornia');

    // Username is displayed
    const username = page.locator('.profile-page .user-info h4');
    await expect(username).toBeVisible();
    await expect(username).toHaveText('golfcalifornia');

    // Bio is displayed
    const bio = page.locator('.profile-page .user-info p');
    await expect(bio).toHaveText('Covering the best golf courses across California.');
  });

  test('My Articles tab shows articles by the user', async ({ page }) => {
    await page.goto('/#!/@golfcalifornia');

    // "My Articles" tab should be visible
    const myArticlesTab = page.locator('.articles-toggle .nav-link', { hasText: 'My Articles' });
    await expect(myArticlesTab).toBeVisible();

    // Should show articles
    const articles = page.locator('.article-preview h1');
    await expect(articles.first()).toBeVisible();
    const count = await articles.count();
    expect(count).toBeGreaterThan(0);
  });
});
