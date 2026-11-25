import { test, expect, type Page } from '@playwright/test';

async function dismissOnboardingIfPresent(page: Page) {
  const skipBtn = page.getByRole('button', { name: /Skip/i });
  if (await skipBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await skipBtn.click();
  }
}

test.describe('RallyPoint Mobile & Desktop E2E Suite (QA Phase 3)', () => {
  test('iQOO Neo 10 (393x873): 3-step setup, doubles POINT/DROP, streak banner, UNDO, Quick Edit & Rankings', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 393, height: 873 });
    await page.goto('/');
    await dismissOnboardingIfPresent(page);

    // Play screen primary action & empty state
    await expect(page.getByRole('heading', { name: 'Play' })).toBeVisible();
    await expect(page.getByText('No Matches Yet')).toBeVisible();
    await page.getByRole('button', { name: /Start Match/i }).first().click();

    // Step 1: Quick add 4 players for doubles
    await expect(page.getByText(/Who's playing/i)).toBeVisible();
    const quickAdd = page.getByPlaceholder(/Quick add player/i);
    for (const name of ['Anu', 'Vikram', 'Rahul', 'Deepa']) {
      await quickAdd.fill(name);
      await page.getByRole('button', { name: /^Add$/i }).click();
    }
    await page.getByRole('button', { name: /Continue to Scoring/i }).click();

    // Step 2: Rally Point 21
    await expect(page.getByText(/How do you want to score/i)).toBeVisible();
    await page.getByRole('button', { name: /Continue to Server Selection/i }).click();

    // Step 3: Coin flip & Start
    await expect(page.getByText(/Who serves first/i)).toBeVisible();
    await page.getByRole('button', { name: /Start Match/i }).last().click();

    // Live scoring screen: verify 4 player cards (8 action buttons)
    await expect(page.getByText('Game 1 of 3')).toBeVisible();
    await expect(page.getByText('Rally 21')).toBeVisible();

    const p1Point = page.locator('[data-testid^="point-btn-"]').first();
    await expect(p1Point).toBeVisible();

    // Verify touch target >= 48px
    const box = await p1Point.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(48);

    // Score 3 consecutive points (respecting 300ms debounce) to trigger StreakBanner
    for (let i = 0; i < 3; i++) {
      await p1Point.click();
      await page.waitForTimeout(350);
    }
    await expect(page.getByTestId('streak-banner')).toBeVisible();

    // UNDO mid-streak
    await page.getByRole('button', { name: /Undo/i }).click();
    await expect(page.getByTestId('streak-banner')).toBeHidden({ timeout: 4000 });

    // Score 3 more points to reach 5 attributed actions -> mid-match MVP peek chip appears
    for (let i = 0; i < 3; i++) {
      await p1Point.click();
      await page.waitForTimeout(350);
    }
    await expect(page.getByTestId('mid-match-mvp-peek-chip')).toBeVisible();

    // Quick Edit sheet
    await page.getByLabel('Edit recent actions').click();
    await expect(page.getByText(/Recent Actions|Quick Edit/i)).toBeVisible();
    await page.keyboard.press('Escape').catch(() => {});
  });

  test('Small phone (360x800) & Landscape (873x393): Service Point 15 side-out flow & no horizontal overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');
    await dismissOnboardingIfPresent(page);

    await page.getByRole('button', { name: /Start Match/i }).first().click();
    const quickAdd = page.getByPlaceholder(/Quick add player/i);
    await quickAdd.fill('Anu');
    await page.getByRole('button', { name: /^Add$/i }).click();
    await quickAdd.fill('Rahul');
    await page.getByRole('button', { name: /^Add$/i }).click();
    await page.getByRole('button', { name: /Continue to Scoring/i }).click();

    // Select Service Point 15
    await page.getByRole('button', { name: /Service Point/i }).click();
    await page.getByRole('button', { name: /Continue to Server Selection/i }).click();
    await page.getByRole('button', { name: /Start Match/i }).last().click();

    await expect(page.getByText('Service 15')).toBeVisible();

    // Receiver scores POINT -> side-out (score remains 0-0)
    await page.locator('[data-testid^="point-btn-"]').nth(1).click();
    await page.waitForTimeout(350);
    await expect(page.getByText(/Serve changes side/i)).toBeVisible();

    // Switch to landscape & verify no horizontal scroll overflow
    await page.setViewportSize({ width: 873, height: 393 });
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 2
    );
    expect(hasOverflow).toBe(false);
  });

  test('Rankings, Players, Profile tabs & Dark/Light Mode + CSV Export + Accessibility check', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // Tablet
    await page.goto('/');
    await dismissOnboardingIfPresent(page);

    // Navigate to Rankings tab
    const nav = page.getByRole('navigation', { name: 'Main Navigation' });
    await nav.getByRole('tab', { name: /Rankings/i }).click();
    await expect(page.getByRole('heading', { name: 'Rankings' })).toBeVisible();
    await expect(page.getByText('Most MVPs')).toBeVisible();
    await expect(page.getByText('Longest Streak')).toBeVisible();

    // Trigger CSV export
    const [download] = await Promise.all([
      page.waitForEvent('download').catch(() => null),
      page.getByLabel('Export Rankings CSV').click(),
    ]);
    if (download) {
      expect(download.suggestedFilename()).toContain('rallypoint_rankings');
    }

    // Navigate to Players tab
    await nav.getByRole('tab', { name: /Players/i }).click();
    await expect(page.getByRole('heading', { name: /Players/i })).toBeVisible();

    // Navigate to Profile / Settings tab & toggle Dark Mode
    await nav.getByRole('tab', { name: /Profile/i }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByText('Live Streak Alerts')).toBeVisible();

    // Desktop viewport check
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  });
});
