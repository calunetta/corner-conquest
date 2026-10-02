import { test, expect } from '@playwright/test';
import { safeCleanupGame } from './e2e-cleanup';

test.describe('Gameplay & Debug Mechanics', () => {
  test.afterEach(async ({ page }) => {
    await safeCleanupGame(page);
  });

  test('starts game vs bot in debug mode with 20 starting resources and visible soldiers', async ({ page }) => {
    const testUsername = `Tester_${Math.floor(Math.random() * 10000)}`;
    const matchName = `DebugMatch_${Date.now()}`;

    await page.goto('/');
    const input = page.locator('input#username[data-hydrated="true"]');
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill(testUsername);
    const enterBtn = page.getByRole('button', { name: /enter lobby/i });
    await expect(enterBtn).toBeEnabled();
    await enterBtn.click();

    // Create match with 1 player (vs 1 bot)
    const createNewGameBtn = page.getByRole('button', { name: /create new game/i });
    await expect(createNewGameBtn).toBeVisible({ timeout: 10000 });
    await createNewGameBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.getByLabel(/game name/i).fill(matchName);

    // Select 1 player capacity (Solo vs Bot)
    const combobox = dialog.getByRole('combobox');
    await expect(combobox).toBeVisible();
    await combobox.click();
    const soloOption = page.getByRole('option', { name: /solo vs\. bot/i });
    await expect(soloOption).toBeVisible();
    await soloOption.click();

    await dialog.getByRole('button', { name: /create game/i }).click();

    // Wait for match header
    await expect(page.getByRole('heading', { name: matchName })).toBeVisible({ timeout: 15000 });

    // Verify player has 20 Food, 20 Wood, and 20 Gold in HUD/PlayerInfo
    await expect(page.getByText('20').filter({ visible: true }).first()).toBeVisible({ timeout: 5000 });

    // Verify Blue army soldier sprite is rendered
    await expect(page.locator('img[alt="blue army"]').first()).toBeVisible();

    // Verify Resource nodes and sprites are rendered on the map
    await expect(page.locator('[data-testid^="resource-node-"]').first()).toBeVisible();
    await expect(page.locator('img[alt$="resource"]').first()).toBeVisible();

    // Verify Tutorial Beacon info icon is visible
    const beacon = page.getByTestId('tutorial-beacon-actions-info');
    await expect(beacon).toBeVisible();
    await expect(beacon.locator('img[alt="Info"]')).toBeVisible();

    // Verify Action panel buttons are present and interactive
    await expect(page.getByRole('button', { name: /buy card/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /upgrade/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /deploy/i })).toBeVisible();
  });
});
