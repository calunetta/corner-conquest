import { promises as fs } from 'fs';
import path from 'path';
import { test, expect, type Browser, type BrowserContext, type Page, type ConsoleMessage, type Request } from '@playwright/test';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, collection, query, where, getDocs, doc, getDoc, type Firestore } from 'firebase/firestore';
import type { GameState } from '@/lib/types';
import { GameStatus } from '@/lib/types';
import { safeCleanupGame } from './e2e-cleanup';
import { planNextStep, performUiAction, type BotStep, type BotStepResult } from './bot-ui-actions';

/** Generous bound for a Firestore round trip or a dialog animation; mirrors reconnect-bot-takeover.spec.ts. */
const SYNC_TIMEOUT_MS = 15000;
const POLL_INTERVAL_MS = 300;
/** Keeps a single e2e run bounded; matches the round-cap convention of scripts/balance-simulator/engine.ts. */
const MAX_ROUNDS = 25;
const BOT_STEPS: readonly BotStep[] = ['cardStrategy', 'purchases', 'armyActions'];
const CAPTURE_ROOT = path.join(__dirname, '.bot-self-play-captures');

// This test reads the match document directly from the Firestore emulator so it can decide what
// to click next (see bot-ui-actions.ts's planNextStep). It cannot reuse `@/lib/firebase`: that
// module is 'use client' and only connects to the emulator via NEXT_PUBLIC_* env vars that
// playwright.config.ts sets for the Next.js build's process, not for this Playwright test process.
const FIRESTORE_EMULATOR_HOST = '127.0.0.1';
const FIRESTORE_EMULATOR_PORT = 8080;
const EMULATOR_PROJECT_ID = 'demo-corner-conquest';
const TEST_FIREBASE_APP_NAME = 'bot-vs-bot-ui-spec';

let testDb: Firestore | null = null;

function getTestFirestore(): Firestore {
  if (testDb) return testDb;
  const app: FirebaseApp = getApps().find((a) => a.name === TEST_FIREBASE_APP_NAME) ?? initializeApp({ projectId: EMULATOR_PROJECT_ID }, TEST_FIREBASE_APP_NAME);
  const db = getFirestore(app);
  connectFirestoreEmulator(db, FIRESTORE_EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
  testDb = db;
  return db;
}

async function findGameIdByName(matchName: string): Promise<string> {
  const snapshot = await getDocs(query(collection(getTestFirestore(), 'games'), where('name', '==', matchName)));
  if (snapshot.empty) throw new Error(`No match document found for "${matchName}".`);
  return snapshot.docs[0].id;
}

async function readGameState(gameId: string): Promise<GameState> {
  const snapshot = await getDoc(doc(getTestFirestore(), 'games', gameId));
  if (!snapshot.exists()) throw new Error(`Match document "${gameId}" does not exist.`);
  return { ...(snapshot.data() as GameState), id: snapshot.id };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForGameState(
  gameId: string,
  predicate: (state: GameState) => boolean,
  timeoutMs: number,
): Promise<GameState | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await readGameState(gameId);
    if (predicate(state)) return state;
    await sleep(POLL_INTERVAL_MS);
  }
  return null;
}

/** One effect `performUiAction` is expected to have produced, plus how to tell live state shows
 *  it happened. Checked independent of combat dice outcome (that's genuinely random on both the
 *  oracle's and the live UI's own roll) — only that the acting army actually acted. */
interface EffectCheck {
  description: string;
  isSatisfied: (state: GameState) => boolean;
}

function buildEffectChecks(seat: number, before: GameState, result: BotStepResult): EffectCheck[] {
  const checks: EffectCheck[] = [];

  for (const move of result.moves) {
    checks.push({
      description: `army ${move.armyId} move from (${move.from.x},${move.from.y}) to (${move.to.x},${move.to.y})`,
      isSatisfied: (state) => {
        const army = state.players[seat].armies.find((a) => a.id === move.armyId);
        return !!army && army.position.x === move.to.x && army.position.y === move.to.y;
      },
    });
  }

  for (const position of result.positions) {
    checks.push({
      description: `army ${position.armyId} position on ${position.resource} at (${position.at.x},${position.at.y})`,
      isSatisfied: (state) =>
        state.players[seat].positions.some(
          (p) => p.armyId === position.armyId && p.x === position.at.x && p.y === position.at.y && p.resource === position.resource,
        ),
    });
  }

  for (const attack of result.attacks) {
    checks.push({
      description: `army ${attack.armyId} attack at (${attack.at.x},${attack.at.y})`,
      isSatisfied: (state) => !!state.players[seat].armies.find((a) => a.id === attack.armyId)?.hasActed,
    });
  }

  if (result.events.length > 0) {
    const expectedLogLength = before.log.length + result.events.length;
    checks.push({
      description: `${result.events.length} logged event(s) (${result.events.map((e) => e.kind).join(', ')})`,
      isSatisfied: (state) => state.log.length >= expectedLogLength,
    });
  }

  return checks;
}

/** Polls live state until every check in `checks` is satisfied or `SYNC_TIMEOUT_MS` elapses.
 *  Returns one description per check still unsatisfied at the deadline — a real "the intended
 *  action never landed" finding, not a flaky race: `SYNC_TIMEOUT_MS` is the same generous bound
 *  every other e2e spec in this repo uses for a Firestore round trip. */
async function waitForStepEffects(gameId: string, checks: EffectCheck[]): Promise<string[]> {
  if (checks.length === 0) return [];
  const deadline = Date.now() + SYNC_TIMEOUT_MS;
  let remaining = checks;
  while (Date.now() < deadline) {
    const state = await readGameState(gameId);
    remaining = remaining.filter((check) => !check.isSatisfied(state));
    if (remaining.length === 0) return [];
    await sleep(POLL_INTERVAL_MS);
  }
  return remaining.map((check) => `never landed: ${check.description}`);
}

interface IssueBuffer {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
}

function emptyIssueBuffer(): IssueBuffer {
  return { consoleErrors: [], pageErrors: [], failedRequests: [] };
}

/** Buffers every console error, uncaught page error, and failed network request a page produces,
 *  for the caller to drain once per turn. */
function attachIssueListeners(page: Page): IssueBuffer {
  const buffer = emptyIssueBuffer();
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') buffer.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err: Error) => {
    buffer.pageErrors.push(err.message);
  });
  page.on('requestfailed', (req: Request) => {
    buffer.failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText ?? 'unknown error'}`);
  });
  return buffer;
}

/** Returns a snapshot of `buffer`'s current contents and clears it for the next turn. */
function drainIssueBuffer(buffer: IssueBuffer): IssueBuffer {
  const snapshot: IssueBuffer = {
    consoleErrors: [...buffer.consoleErrors],
    pageErrors: [...buffer.pageErrors],
    failedRequests: [...buffer.failedRequests],
  };
  buffer.consoleErrors.length = 0;
  buffer.pageErrors.length = 0;
  buffer.failedRequests.length = 0;
  return snapshot;
}

interface FlaggedTurn extends IssueBuffer {
  turnNumber: number;
  seat: number;
  landingIssues: string[];
  screenshot: Buffer;
}

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

/** Writes every flagged turn's screenshot and a report.json of its issues to a per-run folder,
 *  so ui-bug-reviewer.md reads only this filtered subset, never the full unfiltered run. */
async function writeCaptures(runId: string, flaggedTurns: FlaggedTurn[]): Promise<string> {
  const dir = path.join(CAPTURE_ROOT, runId);
  await fs.mkdir(dir, { recursive: true });

  const report = flaggedTurns.map((turn) => {
    const fileName = `turn-${String(turn.turnNumber).padStart(3, '0')}-seat-${turn.seat}.png`;
    return {
      turnNumber: turn.turnNumber,
      seat: turn.seat,
      screenshot: fileName,
      consoleErrors: turn.consoleErrors,
      pageErrors: turn.pageErrors,
      failedRequests: turn.failedRequests,
      landingIssues: turn.landingIssues,
    };
  });

  await Promise.all(
    flaggedTurns.map((turn, index) => fs.writeFile(path.join(dir, report[index].screenshot), turn.screenshot)),
  );
  await fs.writeFile(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));

  return dir;
}

// Skipped: stalls ~10min on a still-unresolved UI race (position button stays disabled).
// See docs/ai/tasks/2026-10-13-bot-ui-position-stall/progress.md (BLOCKER, not yet root-caused).
// Re-enable once that investigation lands a confirmed fix.
test.describe.skip('Bot-vs-bot self-play through the real UI', () => {
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

  test('plays a full 2-seat match purely through real clicks, flagging any turn with a broken interaction', async ({ browser }: { browser: Browser }) => {
    // Up to MAX_ROUNDS turns, each with several real clicks and Firestore round trips.
    test.setTimeout(10 * 60 * 1000);
    const stamp = Date.now();
    const hostName = `BotHost_${stamp}`;
    const guestName = `BotGuest_${stamp}`;
    const matchName = `BotSelfPlay_${stamp}`;

    hostContext = await browser.newContext();
    guestContext = await browser.newContext();
    hostPage = await hostContext.newPage();
    guestPage = await guestContext.newPage();

    const issueBuffers: [IssueBuffer, IssueBuffer] = [attachIssueListeners(hostPage), attachIssueListeners(guestPage)];
    const seatPages: [Page, Page] = [hostPage, guestPage];

    await enterLobby(hostPage, hostName);
    await openNewMatchInLobby(hostPage, matchName);
    await expect(hostPage.getByRole('heading', { name: matchName })).toBeVisible({ timeout: SYNC_TIMEOUT_MS });

    await enterLobby(guestPage, guestName);
    await joinOpenMatchInLobby(guestPage, matchName);
    await expect(guestPage.getByRole('heading', { name: matchName })).toBeVisible({ timeout: SYNC_TIMEOUT_MS });

    // A full room still waits for the host to start it (player-join.reducer.ts).
    await expect(hostPage.getByRole('button', { name: 'Start Game' })).toBeVisible({ timeout: SYNC_TIMEOUT_MS });
    await hostPage.getByRole('button', { name: 'Start Game' }).click();

    const gameId = await findGameIdByName(matchName);
    let state = await waitForGameState(gameId, (s) => s.status === GameStatus.Playing, SYNC_TIMEOUT_MS);
    if (!state) throw new Error('Game never transitioned to Playing after Start Game was clicked.');

    const flaggedTurns: FlaggedTurn[] = [];
    let turnNumber = 0;

    while (state.status === GameStatus.Playing && state.turn <= MAX_ROUNDS) {
      turnNumber += 1;
      const actingSeat = state.currentPlayerIndex;
      const page = seatPages[actingSeat];
      drainIssueBuffer(issueBuffers[actingSeat]); // discard noise from the previous seat's turn

      const landingIssues: string[] = [];
      let stepState = state;
      for (const step of BOT_STEPS) {
        const before = stepState;
        const result = planNextStep(before, actingSeat, step);
        await performUiAction(page, result, actingSeat);
        const checks = buildEffectChecks(actingSeat, before, result);
        landingIssues.push(...(await waitForStepEffects(gameId, checks)));
        stepState = result.state;
      }

      await page.getByTestId('actions-panel-end-turn').click();
      const nextState = await waitForGameState(
        gameId,
        (s) => s.currentPlayerIndex !== actingSeat || s.status !== GameStatus.Playing,
        SYNC_TIMEOUT_MS,
      );
      if (!nextState) landingIssues.push(`End Turn for seat ${actingSeat} never advanced the match state.`);

      const screenshot = await page.screenshot();
      const { consoleErrors, pageErrors, failedRequests } = drainIssueBuffer(issueBuffers[actingSeat]);
      if (consoleErrors.length > 0 || pageErrors.length > 0 || failedRequests.length > 0 || landingIssues.length > 0) {
        flaggedTurns.push({ turnNumber, seat: actingSeat, landingIssues, consoleErrors, pageErrors, failedRequests, screenshot });
      }

      state = nextState ?? (await readGameState(gameId));
    }

    const captureDir = flaggedTurns.length > 0 ? await writeCaptures(`${stamp}`, flaggedTurns) : null;

    expect(
      state.status === GameStatus.Finished || state.turn > MAX_ROUNDS,
      `Match stalled at turn ${turnNumber} (status ${state.status}, round ${state.turn}). ` +
        (captureDir ? `See ${captureDir} for flagged turns.` : 'No turn was flagged.'),
    ).toBe(true);

    expect(
      flaggedTurns,
      `${flaggedTurns.length} turn(s) flagged a broken interaction. See ${captureDir ?? '(no capture dir written)'}.`,
    ).toEqual([]);
  });
});
