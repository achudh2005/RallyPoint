import { test, expect } from '@playwright/test';

test.describe('RallyPoint Match Lifecycle E2E', () => {
  test('creates match, scores points, undos, and completes game', async ({ page }) => {
    await page.goto('/');

    // Check setup screen
    await expect(page.locator('text=RallyPoint')).toBeVisible();

    // Select Best of 1 for fast e2e completion
    await page.locator('text=Bo1').click();

    // Start match
    await page.locator('button:has-text("Start Match")').click();

    // Verify on scoring screen
    await expect(page.locator('text=GAME 1')).toBeVisible();
    await expect(page.locator('text=Best of 1')).toBeVisible();

    // Tap Left Side button to score 1-0
    const leftTarget = page.locator('[data-testid="tap-left-side"]');
    const rightTarget = page.locator('[data-testid="tap-right-side"]');

    await leftTarget.click();
    await expect(leftTarget.locator('text=1')).toBeVisible();

    // Tap Undo
    await page.locator('button:has-text("Undo")').click();
    await expect(leftTarget.locator('text=0')).toBeVisible();

    // Score 21 points for Left side to finish the match
    for (let i = 0; i < 21; i++) {
      await leftTarget.click();
    }

    // Match should be completed and summary displayed
    await expect(page.locator('text=Match Winner')).toBeVisible();
    await expect(page.locator('button:has-text("New Match")')).toBeVisible();
  });
});
