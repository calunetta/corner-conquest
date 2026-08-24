import { test, expect } from '@playwright/test';
import { safeCleanupGame } from './e2e-cleanup';

test.describe('Authentication & Lobby Flow', () => {
  test.afterEach(async ({ page }) => {
    await safeCleanupGame(page);
  });
  test('allows a user to log in and access the lobby', async ({ page }) => {
    const testUsername = `User_${Math.floor(Math.random() * 10000)}`;

    await page.goto('/');

    // Verify Login card is present
    await expect(page.getByText('Welcome to Corner Conquest')).toBeVisible();
    const input = page.getByPlaceholder('Your Name');
    await expect(input).toBeVisible();

    // Fill in username
    await input.fill(testUsername);

    // Click Enter Lobby
    const enterLobbyBtn = page.getByRole('button', { name: /enter lobby/i });
    await expect(enterLobbyBtn).toBeEnabled();
    await enterLobbyBtn.click();

    // Verify Lobby is reached
    await expect(page.getByText('Game Lobby')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /create new game/i })).toBeVisible();
    await expect(page.getByText(`Welcome, ${testUsername}!`)).toBeVisible();
  });

  test('allows a user to open Create Game dialog', async ({ page }) => {
    const testUsername = `Host_${Math.floor(Math.random() * 10000)}`;

    await page.goto('/');
    await page.getByPlaceholder('Your Name').fill(testUsername);
    const enterLobbyBtn = page.getByRole('button', { name: /enter lobby/i });
    await expect(enterLobbyBtn).toBeEnabled();
    await enterLobbyBtn.click();

    // Open create game dialog
    const createBtn = page.getByRole('button', { name: /create new game/i });
    await expect(createBtn).toBeVisible({ timeout: 10000 });
    await createBtn.click();

    // Verify dialog fields
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByLabel(/game name/i)).toBeVisible();
    await expect(dialog.getByRole('button', { name: /create game/i })).toBeVisible();
  });
});
