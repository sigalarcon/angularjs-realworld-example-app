// @ts-check
const { test, expect } = require('@playwright/test');
const { backupDb, restoreDb, loginAsTestUser } = require('./helpers');

test.beforeAll(() => backupDb());
test.afterAll(() => restoreDb());

test.beforeEach(async ({ page }) => {
  await loginAsTestUser(page);
});

test.describe('Article Viewing', () => {
  test('clicking an article preview navigates to article detail page', async ({ page }) => {
    await page.goto('/');

    // Wait for articles to render
    const firstArticleTitle = page.locator('.article-preview h1').first();
    await expect(firstArticleTitle).toBeVisible();
    const titleText = (await firstArticleTitle.textContent()).trim();

    // Click the "Read more..." link on the first article
    const previewLink = page.locator('.article-preview .preview-link').first();
    await previewLink.click();

    // Should navigate to the article page
    const articlePageTitle = page.locator('.article-page .banner h1');
    await expect(articlePageTitle).toBeVisible();
    await expect(articlePageTitle).toHaveText(titleText);
  });

  test('article page shows title, body content, and author info', async ({ page }) => {
    // Navigate directly to a known article
    await page.goto('/#!/article/pebble-beach-golf-links');

    // Title
    const title = page.locator('.article-page .banner h1');
    await expect(title).toBeVisible();
    await expect(title).toHaveText('Pebble Beach Golf Links: Where the Ocean Meets the Fairway');

    // Body content
    const body = page.locator('.article-content');
    await expect(body).toBeVisible();

    // Author info
    const authorInfo = page.locator('.article-meta').first();
    await expect(authorInfo).toBeVisible();
  });
});
