import { test, expect } from '@playwright/test';
import { safeCleanupGame } from './e2e-cleanup';

test.describe('Map Viewport & Pan/Zoom Flow', () => {
  test.afterEach(async ({ page }) => {
    await safeCleanupGame(page);
  });
  test('renders desktop map with 85% starting zoom and deterministic rocks, handles zoom in/out/reset, and cleans up', async ({ page }) => {
    const testUsername = `Navigator_${Math.floor(Math.random() * 10000)}`;
    const matchName = `MapTest_${Date.now()}`;

    // 1. Login
    await page.goto('/');
    const input = page.locator('input#username[data-hydrated="true"]');
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill(testUsername);
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

    // Starting default zoom is 85%
    await expect(zoomResetBtn).toContainText('85%');

    // Click Zoom In to 100% and 115% (max desktop zoom)
    await zoomInBtn.click();
    await expect(zoomResetBtn).toContainText('100%');
    await zoomInBtn.click();
    await expect(zoomResetBtn).toContainText('115%');

    // Click Zoom Out to 100% and 85% (min desktop zoom)
    await zoomOutBtn.click();
    await expect(zoomResetBtn).toContainText('100%');
    await zoomOutBtn.click();
    await expect(zoomResetBtn).toContainText('85%');
    await zoomOutBtn.click();
    await expect(zoomResetBtn).toContainText('85%');

    // Reset Zoom (restores to 85%)
    await zoomResetBtn.click();
    await expect(zoomResetBtn).toContainText('85%');

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

  test('renders entire archipelago on mobile viewport without clipping corners', async ({ page }) => {
    // Set mobile viewport (iPhone 13 / Modern Smartphone: 390x844)
    await page.setViewportSize({ width: 390, height: 844 });

    const testUsername = `Mobile_${Math.floor(Math.random() * 10000)}`;
    const matchName = `MobileMap_${Date.now()}`;

    // Login & Enter
    await page.goto('/');
    const input = page.locator('input#username[data-hydrated="true"]');
    await expect(input).toBeVisible({ timeout: 10000 });
    await input.fill(testUsername);
    const enterBtn = page.getByRole('button', { name: /enter lobby/i });
    await expect(enterBtn).toBeEnabled();
    await enterBtn.click();

    // Create game room
    const createNewGameBtn = page.getByRole('button', { name: /create new game/i });
    await expect(createNewGameBtn).toBeVisible({ timeout: 10000 });
    await createNewGameBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.getByLabel(/game name/i).fill(matchName);
    await dialog.getByRole('button', { name: /create game/i }).click();

    // Verify Map Canvas loads
    const mapCanvas = page.getByTestId('map-canvas-container');
    await expect(mapCanvas).toBeVisible({ timeout: 15000 });

    // Verify all 4 corner bases are rendered and present in DOM
    const cornerTL = page.getByLabel(/Island at 0, 0/i).or(page.getByRole('button', { name: /Island at 0, 0/i }));
    const cornerTR = page.getByLabel(/Island at 4, 0/i).or(page.getByRole('button', { name: /Island at 4, 0/i }));
    const cornerBL = page.getByLabel(/Island at 0, 4/i).or(page.getByRole('button', { name: /Island at 0, 4/i }));
    const cornerBR = page.getByLabel(/Island at 4, 4/i).or(page.getByRole('button', { name: /Island at 4, 4/i }));

    await expect(cornerTL).toBeVisible();
    await expect(cornerTR).toBeVisible();
    await expect(cornerBL).toBeVisible();
    await expect(cornerBR).toBeVisible();

    // Clean up
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
