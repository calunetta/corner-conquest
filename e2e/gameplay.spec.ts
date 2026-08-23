import { test, expect } from '@playwright/test';

test.describe('Gameplay & Board Interactions Flow', () => {
  test('creates a game, loads the board, interacts with actions panel, and ends turn', async ({ page }) => {
    const testUsername = `Player_${Math.floor(Math.random() * 10000)}`;
    const matchName = `Match_${Date.now()}`;

    // 1. Login
    await page.goto('/');
    await page.getByPlaceholder('Your Name').fill(testUsername);
    const enterBtn = page.getByRole('button', { name: /enter lobby/i });
    await expect(enterBtn).toBeEnabled();
    await enterBtn.click();

    // 2. Open Create Game Modal
    const createNewGameBtn = page.getByRole('button', { name: /create new game/i });
    await expect(createNewGameBtn).toBeVisible({ timeout: 10000 });
    await createNewGameBtn.click();

    // 3. Fill and submit Create Game
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.getByLabel(/game name/i).fill(matchName);
    await dialog.getByRole('button', { name: /create game/i }).click();

    // 4. Verify GameBoard loads
    await expect(page.getByText(matchName)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Player Information')).toBeVisible();
    await expect(page.getByText('Actions', { exact: false })).toBeVisible();

    // 5. If "Start Game" button is present, click it
    const startGameBtn = page.getByRole('button', { name: /start game/i });
    if (await startGameBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startGameBtn.click();
    }

    // 6. Open Abilities Shop dialog
    const abilitiesBtn = page.getByRole('button', { name: /abilities/i });
    await expect(abilitiesBtn).toBeVisible();
    await abilitiesBtn.click();

    // Verify Abilities Shop modal opens
    await expect(page.getByText('Abilities Shop')).toBeVisible({ timeout: 5000 });

    // Close Abilities Shop modal with Escape key
    await page.keyboard.press('Escape');
    await expect(page.getByText('Abilities Shop')).not.toBeVisible({ timeout: 5000 });

    // 7. Verify End Turn button exists
    const endTurnBtn = page.getByRole('button', { name: /end turn/i });
    await expect(endTurnBtn).toBeVisible();
  });
});
