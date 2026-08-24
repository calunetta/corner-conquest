import { test, expect } from '@playwright/test';

test.describe('Map Viewport & Pan/Zoom Flow', () => {
  test('renders enlarged map with deterministic rocks, handles zoom in/out/reset, and cleans up', async ({ page }) => {
    const testUsername = `Navigator_${Math.floor(Math.random() * 10000)}`;
    const matchName = `MapTest_${Date.now()}`;

    // 1. Login
    await page.goto('/');
    await page.getByPlaceholder('Your Name').fill(testUsername);
    const enterBtn = page.getByRole('button', { name: /enter lobby/i });
    await expect(enterBtn).toBeEnabled();
    await enterBtn.click();

    // 2. Create game room
    const createNewGameBtn = page.getByRole('button', { name: /create new game/i });
    await expect(createNewGameBtn).toBeVisible({ timeout: 10000 });
    await createNewGameBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.getByLabel(/game name/i).fill(matchName);
    await dialog.getByRole('button', { name: /create game/i }).click();

    // 3. Verify Map Canvas loads
    const mapCanvas = page.getByTestId('map-canvas-container');
    await expect(mapCanvas).toBeVisible({ timeout: 15000 });

    // 4. Verify Decorative Rocks are rendered
    const rocks = page.getByTestId('decorative-rock');
    await expect(rocks.first()).toBeVisible({ timeout: 5000 });
    const rockCount = await rocks.count();
    expect(rockCount).toBeGreaterThan(10);

    // 5. Test Zoom Controls
    const zoomInBtn = page.getByTestId('map-zoom-in');
    const zoomOutBtn = page.getByTestId('map-zoom-out');
    const zoomResetBtn = page.getByTestId('map-zoom-reset');

    await expect(zoomInBtn).toBeVisible();
    await expect(zoomOutBtn).toBeVisible();
    await expect(zoomResetBtn).toBeVisible();

    // Default zoom is 100%
    await expect(zoomResetBtn).toContainText('100%');

    // Click Zoom In
    await zoomInBtn.click();
    await expect(zoomResetBtn).toContainText('115%');

    // Click Zoom Out twice
    await zoomOutBtn.click();
    await expect(zoomResetBtn).toContainText('100%');
    await zoomOutBtn.click();
    await expect(zoomResetBtn).toContainText('85%');

    // Reset Zoom
    await zoomResetBtn.click();
    await expect(zoomResetBtn).toContainText('100%');

    // 6. Clean up: Exit match and return to lobby
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
