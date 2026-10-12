import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { safeCleanupGame } from './e2e-cleanup';

/** Generous bound for Firestore round trips and the bot's turn animation; never a fixed sleep. */
const SYNC_TIMEOUT_MS = 15000;

async function enterLobby(page: Page, username: string): Promise<void> {
  await page.goto('/');
  const input = page.locator('input#username[data-hydrated="true"]');
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.fill(username);
  const enterLobbyBtn = page.getByRole('button', { name: /enter lobby/i });
  await expect(enterLobbyBtn).toBeEnabled();
  await enterLobbyBtn.click();
  await expect(page.getByText('Game Lobby')).toBeVisible({ timeout: 10000 });
}

async function openNewMatchInLobby(host: Page, matchName: string): Promise<void> {
  await host.getByRole('button', { name: /create new game/i }).click();
  const dialog = host.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await host.getByLabel(/game name/i).fill(matchName);
  await dialog.getByRole('button', { name: /2 players/i }).click();
  await dialog.getByRole('button', { name: /create game/i }).click();
}

async function joinOpenMatchInLobby(guest: Page, matchName: string): Promise<void> {
  const matchRow = guest.getByRole('heading', { name: matchName, exact: true }).locator('xpath=ancestor::div[.//button][1]');
  await expect(matchRow).toBeVisible({ timeout: SYNC_TIMEOUT_MS });
  await matchRow.getByRole('button', { name: 'Join', exact: true }).click();
}

test.describe('Reconnect takes over a departed seat with a bot', () => {
  let hostContext: BrowserContext | null = null;
  let guestContext: BrowserContext | null = null;
  let hostPage: Page | null = null;
  let guestPage: Page | null = null;

  test.afterEach(async () => {
    if (hostPage) await safeCleanupGame(hostPage);
    if (guestPage) await safeCleanupGame(guestPage);
    await guestContext?.close();
    await hostContext?.close();
    hostContext = null;
    guestContext = null;
    hostPage = null;
    guestPage = null;
  });

  test('a departed player sees only the rejoin option, and reclaiming hands the seat back', async ({ browser }: { browser: Browser }) => {
    // Two browser contexts and two full lobby flows add up to more than the suite's
    // default 30s on a slower CI runner.
    test.setTimeout(60000);
    const stamp = Date.now();
    const hostName = `Host_${stamp}`;
    const guestName = `Guest_${stamp}`;
    const matchName = `Reconnect_${stamp}`;

    hostContext = await browser.newContext();
    guestContext = await browser.newContext();
    hostPage = await hostContext.newPage();
    guestPage = await guestContext.newPage();

    // Two-player match: host creates, guest joins, host starts.
    await enterLobby(hostPage, hostName);
    await openNewMatchInLobby(hostPage, matchName);
    await expect(hostPage.getByRole('heading', { name: matchName })).toBeVisible({ timeout: SYNC_TIMEOUT_MS });

    await enterLobby(guestPage, guestName);
    await joinOpenMatchInLobby(guestPage, matchName);
    await expect(guestPage.getByRole('heading', { name: matchName })).toBeVisible({ timeout: SYNC_TIMEOUT_MS });

    await expect(hostPage.getByRole('button', { name: 'Start Game' })).toBeVisible({ timeout: SYNC_TIMEOUT_MS });
    await hostPage.getByRole('button', { name: 'Start Game' }).click();
    const hostEndTurn = hostPage.getByTestId('actions-panel-end-turn');
    await expect(hostPage.getByText('Your Turn')).toBeVisible({ timeout: SYNC_TIMEOUT_MS });

    // Hand the turn to the guest, then the guest leaves during its own turn.
    await expect(hostEndTurn).toBeEnabled();
    await hostEndTurn.click();
    await expect(guestPage.getByText('Your Turn')).toBeVisible({ timeout: SYNC_TIMEOUT_MS });

    await guestPage.getByTestId('gameboard-exit-btn').click();
    await guestPage.getByRole('button', { name: 'Leave Match' }).click();

    // The guest's lobby offers only the rejoin option for this match.
    await expect(guestPage.getByRole('heading', { name: matchName })).toBeVisible({ timeout: SYNC_TIMEOUT_MS });
    await expect(guestPage.getByRole('button', { name: 'Resume Command' })).toBeEnabled();
    await expect(guestPage.getByRole('button', { name: /create new game/i })).toHaveCount(0);
    await expect(guestPage.getByText('Active Conquest Rooms')).toHaveCount(0);

    // The bot takes the departed seat's turn on the host's client, then control returns to the host.
    await expect(hostPage.getByText(`${guestName}'s Turn`)).toBeVisible({ timeout: SYNC_TIMEOUT_MS });
    await expect(hostPage.getByText('Your Turn')).toBeVisible({ timeout: SYNC_TIMEOUT_MS });

    // Reclaim while it's the host's turn: the seat flips immediately and the guest is back in the match.
    await guestPage.getByRole('button', { name: 'Resume Command' }).click();
    await expect(guestPage.getByRole('heading', { name: matchName })).toBeVisible({ timeout: SYNC_TIMEOUT_MS });
    await expect(guestPage.getByTestId('gameboard-exit-btn')).toBeVisible({ timeout: SYNC_TIMEOUT_MS });

    // The match continues: the host ends its turn and the reclaimed guest gets control.
    await expect(hostEndTurn).toBeEnabled();
    await hostEndTurn.click();
    await expect(guestPage.getByText('Your Turn')).toBeVisible({ timeout: SYNC_TIMEOUT_MS });
  });
});
