import { test, expect } from '@playwright/test';
import { safeCleanupGame } from './e2e-cleanup';

test.describe('Tutorial Beacons & Hints Flow', () => {
  test.afterEach(async ({ page }) => {
    await safeCleanupGame(page);
  });
  test('renders tutorial beacons, opens popover guidance on click, and cleans up match', async ({ page }) => {
    const testUsername = `Learner_${Math.floor(Math.random() * 10000)}`;
    const matchName = `BeaconMatch_${Date.now()}`;

    await page.goto('/');
    const input = page.locator('input#username[data-hydrated="true"]');
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill(testUsername);
    const enterBtn = page.getByRole('button', { name: /enter lobby/i });
    await expect(enterBtn).toBeEnabled();
    await enterBtn.click();

    // Create match
    const createNewGameBtn = page.getByRole('button', { name: /create new game/i });
    await expect(createNewGameBtn).toBeVisible({ timeout: 10000 });
    await createNewGameBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.getByLabel(/game name/i).fill(matchName);
    await dialog.getByRole('button', { name: /create game/i }).click();

    // Wait for game board
    await expect(page.getByRole('heading', { name: matchName })).toBeVisible({ timeout: 15000 });

    // Look for tutorial beacon button
    const beacon = page.getByTestId('tutorial-beacon-actions-info');
    await expect(beacon).toBeVisible({ timeout: 5000 });

    // Click the beacon
    await beacon.click();

    // Verify popover appears with title
    await expect(page.getByText('The Actions Panel')).toBeVisible();

    // Close popover
    await page.keyboard.press('Escape');
    await expect(page.getByText('The Actions Panel')).not.toBeVisible({ timeout: 5000 });

    // Clean up: Exit and delete the match
    const exitBtn = page.getByTestId('gameboard-exit-btn');
    await expect(exitBtn).toBeVisible();
    await exitBtn.click();

    const confirmLeaveBtn = page.getByRole('button', { name: /confirm & leave|leave match/i });
    await expect(confirmLeaveBtn).toBeVisible({ timeout: 5000 });
    await confirmLeaveBtn.click();

    // Verify returned to lobby
    await expect(page.getByText('Game Lobby')).toBeVisible({ timeout: 10000 });
  });
});
