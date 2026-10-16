import type { Page } from '@playwright/test';
import { cloneDeep } from 'lodash';
import type { AbilityName, GameState, ResourceType } from '@/lib/types';
import { CardName, GameAction } from '@/lib/types';
import { applyBotCardStrategy } from '../src/modules/game-rules/bot-card-strategy.reducer';
import { applyBotPurchases } from '../src/modules/game-rules/bot-purchases.reducer';
import { applyBotArmyActions } from '../src/modules/game-rules/bot-army-actions.reducer';
import { toLogMessage } from '../src/modules/game-rules/log-entry';
import { parseLogLine, type LogEvent } from '../scripts/balance-simulator/log-parsers';

/** Generous bound for a Firestore round trip or a dialog animation; mirrors reconnect-bot-takeover.spec.ts. */
const SYNC_TIMEOUT_MS = 15000;
/** Short bound for "does this optional dialog appear at all" probes, where absence is the common case. */
const PROBE_TIMEOUT_MS = 2000;

export type BotStep = 'cardStrategy' | 'purchases' | 'armyActions';

export interface BotMove {
  armyId: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

export interface BotPosition {
  armyId: number;
  at: { x: number; y: number };
  resource: ResourceType;
}

/** An army that ended its turn on the same tile as an enemy or monster without moving there this
 *  step — `applyBotArmyActions` (bot-army-actions.reducer.ts:30-43) only ever attacks an army
 *  already co-located with its target, never the tile it is moving onto (see `moves`). */
export interface BotAttack {
  armyId: number;
  at: { x: number; y: number };
}

/**
 * NOTE on deviation from plan.md's Contracts block: that block declares `BotStepResult` as
 * `{ events, moves, state }` with `moves: Array<{ armyId, to }>` (no `from`). Implementing
 * `performUiAction` against that literal shape is not possible:
 * - `performUiAction` must click the army's *current* tile to select it before clicking its
 *   destination (`game-board.tile-click.hook.ts:74-104` selects by reading whichever armies sit
 *   on the clicked tile); without `from`, there is no way to find that tile.
 * - `GameAction.SelectResourcePosition` (bot-army-actions.reducer.ts:55-65) changes
 *   `player.positions`, not `army.position`, and `resource-position.reducer.ts`'s own log line
 *   ("positioned an army on X") matches none of `log-parsers.ts`'s `MATCHERS`, so it is invisible
 *   to both `events` and a position-only `moves` diff. `positions` closes that gap.
 * - `GameAction.InitiateCombat` (bot-army-actions.reducer.ts:30-52) changes neither `Army.position`
 *   nor `player.positions`; only `hasActed` flips and a combat `events` entry appears. `attacks`
 *   names which army did it, since no event carries an army id.
 * This file adds `from` to `BotMove` and the `positions`/`attacks` fields; everything else
 * (`events: LogEvent[]`, `state: GameState`, the `planNextStep`/`performUiAction` signatures)
 * matches the Contracts block exactly. Flagged for architect-b's final review.
 */
export interface BotStepResult {
  /** Every log-producing action this step took (Upgrade, Buy Card, Use Card, etc.). */
  events: LogEvent[];
  moves: BotMove[];
  positions: BotPosition[];
  attacks: BotAttack[];
  /** The resource `Wealthy` granted this step, if any — `log-parsers.ts`'s `wealthyGranted`/
   *  `cardConsumed` events carry no payload, so the UI step needs this to click the matching
   *  `wealthy-resource-<type>` button in `WealthyDialog`. */
  wealthyResource: ResourceType | null;
  /** The state after this step, purely as the oracle for the next step — never written anywhere. */
  state: GameState;
}

const STEP_RUNNERS: Record<BotStep, (state: GameState) => GameState> = {
  cardStrategy: applyBotCardStrategy,
  purchases: applyBotPurchases,
  armyActions: applyBotArmyActions,
};

/** Resource word from `card-targeted-effects.reducer.ts:43`'s exact Wealthy log line. */
function extractWealthyResource(message: string): ResourceType | null {
  const match = message.match(/to gain \d+ (food|wood|gold)\./);
  return (match?.[1] as ResourceType | undefined) ?? null;
}

function diffMoves(before: GameState, after: GameState, seat: number): BotMove[] {
  const beforeArmies = before.players[seat].armies;
  return after.players[seat].armies.flatMap((army) => {
    const prev = beforeArmies.find((a) => a.id === army.id);
    if (!prev || (prev.position.x === army.position.x && prev.position.y === army.position.y)) return [];
    return [{ armyId: army.id, from: { ...prev.position }, to: { ...army.position } }];
  });
}

function diffPositions(before: GameState, after: GameState, seat: number): BotPosition[] {
  const beforeArmyIds = new Set(before.players[seat].positions.map((p) => p.armyId));
  return after.players[seat].positions
    .filter((p) => !beforeArmyIds.has(p.armyId))
    .map((p) => ({ armyId: p.armyId, at: { x: p.x, y: p.y }, resource: p.resource }));
}

/** Every army that newly acted this step without moving or positioning did so by attacking. */
function diffAttacks(before: GameState, after: GameState, seat: number, moves: BotMove[], positions: BotPosition[]): BotAttack[] {
  const actedElsewhere = new Set([...moves.map((m) => m.armyId), ...positions.map((p) => p.armyId)]);
  const beforeArmies = before.players[seat].armies;
  return after.players[seat].armies
    .filter((army) => {
      const prev = beforeArmies.find((a) => a.id === army.id);
      return !!prev && !prev.hasActed && army.hasActed && !actedElsewhere.has(army.id);
    })
    .map((army) => ({ armyId: army.id, at: { ...army.position } }));
}

/** Runs one bot phase against `state` purely in Node; used only to decide what to click next. */
export function planNextStep(state: GameState, seat: number, step: BotStep): BotStepResult {
  const before = state;
  const after = STEP_RUNNERS[step](cloneDeep(state));

  const newMessages = after.log.slice(before.log.length).map(toLogMessage);
  const events = newMessages.flatMap((line) => parseLogLine(line));
  const wealthyResource = newMessages.reduce<ResourceType | null>(
    (found, line) => found ?? extractWealthyResource(line),
    null,
  );

  const moves = diffMoves(before, after, seat);
  const positions = diffPositions(before, after, seat);
  const attacks = diffAttacks(before, after, seat, moves, positions);

  return { events, moves, positions, attacks, wealthyResource, state: after };
}

async function clickTile(page: Page, at: { x: number; y: number }): Promise<void> {
  await page.getByTestId(`island-tile-${at.x}-${at.y}`).click({ timeout: SYNC_TIMEOUT_MS });
}

async function clickActionButton(page: Page, action: GameAction): Promise<void> {
  await page.getByTestId(`action-button-${action}`).click({ timeout: SYNC_TIMEOUT_MS });
}

/** Resolves the `ArmySelectionDialog` (`ArmySelectionDialog.tsx:64-101`) that appears only when
 *  the clicked tile holds more than one of the seat's armies; a no-op otherwise. */
async function selectArmyIfAmbiguous(page: Page, armyId: number): Promise<void> {
  const squadButton = page.locator(`img[alt="Army ${armyId + 1}"]`).locator('xpath=ancestor::button[1]');
  const appeared = await squadButton
    .waitFor({ state: 'visible', timeout: PROBE_TIMEOUT_MS })
    .then(() => true)
    .catch(() => false);
  if (appeared) await squadButton.click({ timeout: SYNC_TIMEOUT_MS });
}

/** Resolves the one combat dialog `GameAction.InitiateCombat` opens: player combat
 *  (`CombatDialog.tsx:117,130`, "Roll for Battle!" then "Confirm Results") or monster combat
 *  (`MonsterAttackScreen.tsx:102`, `MonsterResultsScreen.tsx:122`, "Attack Monster!" then
 *  "Continue"). The bot never uses War Chief/Overcome/Decide Dice Roll, so no extra card step. */
async function resolveCombat(page: Page): Promise<void> {
  const rollButton = page.getByRole('button', { name: 'Roll for Battle!' });
  const attackMonsterButton = page.getByRole('button', { name: 'Attack Monster!' });

  const isPlayerCombat = await rollButton
    .waitFor({ state: 'visible', timeout: SYNC_TIMEOUT_MS })
    .then(() => true)
    .catch(() => false);
  if (isPlayerCombat) {
    await rollButton.click({ timeout: SYNC_TIMEOUT_MS });
    await page.getByRole('button', { name: 'Confirm Results' }).click({ timeout: SYNC_TIMEOUT_MS });
    return;
  }

  const isMonsterCombat = await attackMonsterButton
    .waitFor({ state: 'visible', timeout: SYNC_TIMEOUT_MS })
    .then(() => true)
    .catch(() => false);
  if (isMonsterCombat) {
    await attackMonsterButton.click({ timeout: SYNC_TIMEOUT_MS });
    await page.getByRole('button', { name: 'Continue' }).click({ timeout: SYNC_TIMEOUT_MS });
  }
}

/** Opens the Cards dialog (`action-button-local:show-cards`) and clicks "Use" on `cardName`,
 *  matching `CardsDialog.tsx:48,57-63`'s rendered card title and button. */
async function clickUseCard(page: Page, cardName: CardName): Promise<void> {
  await clickActionButton(page, GameAction.local_ShowCards);
  const dialog = page.getByRole('alertdialog');
  await dialog
    .getByText(cardName, { exact: true })
    .locator('xpath=ancestor::div[.//button][1]')
    .getByRole('button', { name: /use/i })
    .click({ timeout: SYNC_TIMEOUT_MS });
}

async function clickUseWealthyCard(page: Page, resource: ResourceType | null): Promise<void> {
  if (!resource) return; // No gain line was logged; nothing to pick in WealthyDialog.
  await clickUseCard(page, CardName.Wealthy);
  await page.getByTestId(`wealthy-resource-${resource}`).click({ timeout: SYNC_TIMEOUT_MS });
}

/** Opens the Abilities shop (`action-button-local:open-abilities-shop`) and buys `abilityName`,
 *  matching `AbilitiesDialog.map.ts:15,20`'s static titles ("Explorer"/"Collector"). */
async function buyAbility(page: Page, abilityName: AbilityName): Promise<void> {
  await clickActionButton(page, GameAction.local_OpenAbilitiesShop);
  const title = abilityName.charAt(0).toUpperCase() + abilityName.slice(1);
  const dialog = page.getByRole('alertdialog');
  await dialog
    .getByText(title, { exact: true })
    .locator('xpath=ancestor::div[.//button][1]')
    .getByRole('button', { name: /buy/i })
    .click({ timeout: SYNC_TIMEOUT_MS });
}

/** Strategic UseCard plays bot-card-strategy.reducer.ts actually takes unconditionally
 *  (Reinforce, Efficient, MasterBuilder); Wealthy is handled separately via `wealthyResource`. */
const SIMPLE_STRATEGY_CARDS: ReadonlySet<CardName> = new Set([
  CardName.Reinforce,
  CardName.Efficient,
  CardName.MasterBuilder,
]);

async function performEvent(page: Page, event: LogEvent, result: BotStepResult, wealthyHandled: { done: boolean }): Promise<void> {
  switch (event.kind) {
    case 'deployed':
      return clickActionButton(page, GameAction.Deploy);
    case 'upgraded':
      return clickActionButton(page, GameAction.Upgrade);
    case 'cardBought':
      return clickActionButton(page, GameAction.BuyCard);
    case 'abilityBought':
      return buyAbility(page, event.abilityName);
    case 'cardConsumed':
      if (event.cardName === CardName.Wealthy) {
        if (wealthyHandled.done) return;
        wealthyHandled.done = true;
        return clickUseWealthyCard(page, result.wealthyResource);
      }
      if (SIMPLE_STRATEGY_CARDS.has(event.cardName)) return clickUseCard(page, event.cardName);
      return;
    default:
      // Side effect of a move/attack/deploy already clicked (discovery, auto-collect, combat
      // results, etc.) — no separate UI interaction.
      return;
  }
}

/** Performs every UI interaction `result` implies for the acting seat on `page`: each `moves`
 *  entry first (select the origin tile's army, click its destination), then each `positions`
 *  entry (select the army, open Position, pick the resource), then each `attacks` entry (select
 *  the army, open Attack, resolve the combat dialog), then each `events` entry (Deploy/Upgrade/Buy
 *  Card/Use Card/Buy Ability). Throws if an expected locator never appears — a real UI bug the
 *  spec should surface, not swallow.
 *
 *  `seat` isn't read directly: every coordinate in `result` was already computed for that seat by
 *  `planNextStep`, and `ArmySelectionDialog` (`ArmySelectionDialog.tsx:64-101`, scoped to
 *  `localPlayer.armies` on the clicked tile) never mixes in another player's army. Kept in the
 *  signature to match the Contracts block and because the caller always has it on hand. */
export async function performUiAction(page: Page, result: BotStepResult, seat: number): Promise<void> {
  void seat;

  for (const move of result.moves) {
    await clickTile(page, move.from);
    await selectArmyIfAmbiguous(page, move.armyId);
    await clickTile(page, move.to);
  }

  for (const position of result.positions) {
    await clickTile(page, position.at);
    await selectArmyIfAmbiguous(page, position.armyId);
    await clickActionButton(page, GameAction.local_Position);
    await page.getByTestId(`position-resource-btn-${position.resource}`).click({ timeout: SYNC_TIMEOUT_MS });
  }

  for (const attack of result.attacks) {
    await clickTile(page, attack.at);
    await selectArmyIfAmbiguous(page, attack.armyId);
    await clickActionButton(page, GameAction.local_Attack);
    await resolveCombat(page);
  }

  const wealthyHandled = { done: false };
  for (const event of result.events) {
    await performEvent(page, event, result, wealthyHandled);
  }
}
