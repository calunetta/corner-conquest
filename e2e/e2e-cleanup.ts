import { Page } from '@playwright/test';

/**
 * Universal E2E Test Teardown:
 * Ensures that no matter what (whether a test passes, fails, or throws an assertion timeout),
 * any active modal dialog is closed and any active game board is exited and dismantled from Firestore.
 */
export async function safeCleanupGame(page: Page): Promise<void> {
  try {
    // 1. If on the GameBoard, click the exit button and confirm leave
    const exitBtn = page.getByTestId('gameboard-exit-btn');
    if (await exitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await exitBtn.click().catch(() => {});

      const confirmLeaveBtn = page.getByRole('button', { name: /confirm & leave|leave match/i });
      if (await confirmLeaveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmLeaveBtn.click().catch(() => {});
      }

      const confirmExitNonHost = page.getByRole('button', { name: /leave game/i });
      if (await confirmExitNonHost.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmExitNonHost.click().catch(() => {});
      }

      // Allow Firestore transaction to finalize room cleanup
      await page.waitForTimeout(800);
    }

    // 2. Dismiss any lingering modal dialog (Create Game, Abilities, Combat, etc.)
    const openDialog = page.getByRole('dialog');
    if (await openDialog.isVisible({ timeout: 500 }).catch(() => false)) {
      const cancelBtn = openDialog.getByRole('button', { name: /cancel|close/i }).first();
      if (await cancelBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await cancelBtn.click().catch(() => {});
      } else {
        await page.keyboard.press('Escape').catch(() => {});
      }
      await page.waitForTimeout(300);
    }
  } catch (err) {
    console.warn('safeCleanupGame encountered non-fatal error:', err);
  }
}
