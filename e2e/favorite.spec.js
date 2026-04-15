// @ts-check
const { test, expect } = require('@playwright/test');
const { backupDb, restoreDb, loginAsTestUser } = require('./helpers');

test.beforeAll(() => backupDb());
test.afterAll(() => restoreDb());

test.beforeEach(async ({ page }) => {
  await loginAsTestUser(page);
});

test.describe('Favorite/Unfavorite', () => {
  test('clicking the favorite button updates the count', async ({ page }) => {
    await page.goto('/');

    // Wait for articles to render
    const firstFavBtn = page.locator('.article-preview favorite-btn button').first();
    await expect(firstFavBtn).toBeVisible();

    // Get the initial count text
    const initialText = (await firstFavBtn.textContent()).trim();
    const initialCount = parseInt(initialText, 10);

    // Click the favorite button and wait for the API response
    const favResponse = page.waitForResponse((resp) =>
      resp.url().includes('/favorite') && (resp.status() === 200 || resp.status() === 201)
    );
    await firstFavBtn.click();
    await favResponse;

    // The count should have incremented
    await expect(firstFavBtn).toHaveText(String(initialCount + 1));
  });
});
