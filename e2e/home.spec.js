// @ts-check
const { test, expect } = require('@playwright/test');
const { backupDb, restoreDb, loginAsTestUser } = require('./helpers');

test.beforeAll(() => backupDb());
test.afterAll(() => restoreDb());

test.beforeEach(async ({ page }) => {
  await loginAsTestUser(page);
});

test.describe('Home Page', () => {
  test('loads and shows app name "conduit"', async ({ page }) => {
    await page.goto('/');
    const brand = page.locator('.navbar-brand');
    await expect(brand).toBeVisible();
    await expect(brand).toHaveText('conduit');
  });

  test('global feed tab is visible and shows articles', async ({ page }) => {
    await page.goto('/');
    const globalFeedTab = page.locator('.feed-toggle .nav-link', { hasText: 'Global Feed' });
    await expect(globalFeedTab).toBeVisible();

    // Click Global Feed to ensure it's the active tab
    await globalFeedTab.click();

    // Should show at least one article preview
    const articles = page.locator('.article-preview h1');
    await expect(articles.first()).toBeVisible();
    const count = await articles.count();
    expect(count).toBeGreaterThan(0);
  });

  test('tags sidebar loads and displays tags', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toBeVisible();
    await expect(sidebar.locator('p')).toHaveText('Popular Tags');

    const tags = sidebar.locator('.tag-list a.tag-pill');
    await expect(tags.first()).toBeVisible();
    const tagCount = await tags.count();
    expect(tagCount).toBeGreaterThan(0);
  });
});
