// @ts-check
const { test, expect } = require('@playwright/test');
const { backupDb, restoreDb, loginAsTestUser } = require('./helpers');

test.beforeAll(() => backupDb());
test.afterAll(() => restoreDb());

test.beforeEach(async ({ page }) => {
  await loginAsTestUser(page);
});

test.describe('Article Creation', () => {
  test('can create a new article and see it', async ({ page }) => {
    const uniqueTitle = `Test Article ${Date.now()}`;

    await page.goto('/#!/editor/');
    await expect(page.locator('.editor-page')).toBeVisible();

    // Fill in article form
    await page.locator('input[placeholder="Article Title"]').fill(uniqueTitle);
    await page.locator('input[placeholder="What\'s this article about?"]').fill('A test description');
    await page.locator('textarea[placeholder="Write your article (in markdown)"]').fill('This is the body of the test article.');

    // Add a tag by typing and pressing Enter
    const tagInput = page.locator('input[placeholder="Enter tags"]');
    await tagInput.fill('e2e-test');
    await tagInput.press('Enter');

    // Verify the tag appears in the tag list
    const tagPill = page.locator('.tag-list .tag-pill', { hasText: 'e2e-test' });
    await expect(tagPill).toBeVisible();

    // Submit the article
    const publishResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/articles') && resp.request().method() === 'POST'
    );
    await page.locator('button', { hasText: 'Publish Article' }).click();
    await publishResponse;

    // Should redirect to the new article page
    const articleTitle = page.locator('.article-page .banner h1');
    await expect(articleTitle).toBeVisible();
    await expect(articleTitle).toHaveText(uniqueTitle);
  });
});

test.describe('Article Deletion', () => {
  test('can delete an article via API and verify it is removed', async ({ page }) => {
    // Create an article via API
    const uniqueTitle = `Delete Me ${Date.now()}`;
    const createResp = await page.request.post('http://localhost:3000/api/articles', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Token maeve-static-jwt-token-2026'
      },
      data: {
        article: {
          title: uniqueTitle,
          description: 'To be deleted',
          body: 'This article will be deleted.',
          tagList: []
        }
      }
    });
    expect(createResp.status()).toBe(201);
    const { article } = await createResp.json();
    const slug = article.slug;

    // Verify the article exists by navigating to it
    await page.goto(`/#!/article/${slug}`);
    await expect(page.locator('.article-page .banner h1')).toHaveText(uniqueTitle);

    // Delete the article via API (the UI delete button has a known rendering bug
    // where canModify is checked in the constructor before bindings are available)
    const deleteResp = await page.request.delete(`http://localhost:3000/api/articles/${slug}`, {
      headers: {
        'Authorization': 'Token maeve-static-jwt-token-2026'
      }
    });
    expect(deleteResp.status()).toBe(200);

    // Verify the article no longer exists via API
    const getResp = await page.request.get(`http://localhost:3000/api/articles/${slug}`);
    expect(getResp.status()).toBe(404);
  });
});
