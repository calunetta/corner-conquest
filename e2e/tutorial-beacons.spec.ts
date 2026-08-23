import { test, expect } from '@playwright/test';

test.describe('Tutorial Beacons & Hints Flow', () => {
  test('renders tutorial beacons and opens popover guidance on click', async ({ page }) => {
    const testUsername = `Learner_${Math.floor(Math.random() * 10000)}`;
    const matchName = `BeaconMatch_${Date.now()}`;

    await page.goto('/');
    await page.getByPlaceholder('Your Name').fill(testUsername);
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
    await expect(page.getByText(matchName)).toBeVisible({ timeout: 15000 });

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
  });
});
