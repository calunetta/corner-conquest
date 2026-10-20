# Plan: Card-play animation rules (combat cards off, Teleport/Scout on select) + live card-play sandbox

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] Overcome, War Chief and Decide Dice Roll log entries never start the card animation.
- [ ] Teleport and Scout start the animation as soon as the Use click succeeds (pending action set), while the map-targeting step is still pending. The later log entry (teleport move, third scout tile) does not replay it (same turn + card).
- [ ] A Use that fails (toast error, no pending action) plays nothing.
- [ ] Sabotage / Wealthy / Steal Resource, Extra Move, Reinforce, Efficient, Master Builder, Productive behave exactly as after commit 0e2aa34.
- [ ] A dev-only sandbox at `/testbed/testbed-card-play-sandbox` (states Desktop, Mobile) lets the user click through: Extra Move, Sabotage (confirm and cancel), Wealthy, Steal Resource, Teleport, Scout, a combat card (no animation), mobile actions sheet closing on tap. It uses the real `CardsDialog`, `SabotageDialog`, `WealthyDialog`, `StealResourceDialog`, `CardPlayOverlay`, `useCardPlayTrigger`, `isCardPlayBlocked`, `gameBoardReducer`, `MobileActionsBar`. Only game state and log are fake; no Firestore.
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `useCardPlayTrigger({ log, localPlayerId, isBlocked })` returns `{ play, endPlay }`; seed effect + queue effect; `queuedKeys` ref of `${turn}:${cardName}` | `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.hook.ts:35-67` | Extended with selection-time enqueue. |
| `findNewCardPlays(log, sinceIndex, localPlayerId)` | `CardPlayOverlay.map.ts:19-30` | Add combat-card exclusion. |
| `CardPlayTriggerArgs`, `LoggedCardPlay`, `CardPlay` | `CardPlayOverlay.types.ts:3-37` | Add `SelectionPlay`, optional `selectionPlay` arg. |
| Public exports | `CardPlayOverlay/index.ts:1-3`; `src/modules/cards/index.ts:12-13` | Add `toSelectionPlay`, `SelectionPlay`. |
| `CardName` const (`Overcome`, `WarChief`, `DecideDiceRoll`, `Teleport`, `Scout`, ...) | `src/lib/types/cards.ts:1-17` | Card sets. |
| `PendingAction = teleport \| scout \| extra-move \| null` (`scout` has `count`, `scoutedTiles`) | `src/lib/types/dialogs.ts:60-64` | Selection-time detection and gate. |
| `isCardPlayBlocked(uiState, gameState)` uses `hasActiveDialogOrPendingAction` (blocks on any `pendingAction`) | `src/modules/game-board/game-board.map.ts:4-28` | Must ignore teleport/scout pending. `hasActiveDialogOrPendingAction` stays unchanged (also used by `game-board.hook.ts`). |
| `handleUseCard`: Teleport sets pending `teleport` and returns; Scout/Sabotage/Wealthy/Steal set pending `cardName.toLowerCase().replace(/ /g,'-')` (runtime types not in the union) + open dialog; errors toast and set nothing | `src/modules/game-board/game-board.card-actions.hook.ts:56-93` | Pending action = proof the Use succeeded. Sandbox mirrors this. |
| Teleport logs on the move; Scout logs after third tile; combat cards log in `combat-monster-roll.reducer.ts:60,80,95` | `movement.reducer.ts:68`, `card-effects.reducer.ts:36-42` | Dedupe and exclusion rationale. |
| `GameDialogManager` calls `useCardPlayTrigger`; Use handler closes dialog then `onLocalAction(local_UseCard)` | `src/features/game/components/GameDialogManager.tsx:45-49,282-288` | Only legacy wiring edit. `uiState.pendingAction` and `gameState.turn` are in scope there. |
| `gameBoardReducer(state, action)`, `initialUIState`, `GameBoardUIAction` (`TOGGLE_CARDS_DIALOG`, `SET_PENDING_ACTION`, `SET_SABOTAGE_DIALOG`, `SET_WEALTHY_DIALOG`, `SET_STEAL_RESOURCE_DIALOG`) | `src/modules/game-board/game-board.reducer.ts:9`, `game-board.types.ts:41-80`, `game-board/index.ts:1,3,4-9` | Sandbox UI state, real reducer. |
| Dialog props: `CardsDialogProps {player,onClose,onUseCard,canUseCards}`; `SabotageDialogProps {players,onSabotage,onClose}`; `WealthyDialogProps {onSelectResource,onClose}`; `StealResourceDialogProps {players,onSteal,onClose}` | `CardsDialog.types.ts:3-8`, `SabotageDialog.types.ts:3-7`, `WealthyDialog.types.ts:3-6`, `StealResourceDialog.types.ts:3-7`; all exported from `src/modules/cards/index.ts:1-7` | Sandbox renders them as GameDialogManager does. |
| `CardsDialog` usability: `USABLE_CARDS` excludes Overcome, War Chief, Decide Dice Roll, Productive; `canUseCardAbility` false once `actionsThisTurn` has `GameAction.UseCard` | `src/modules/game-rules/card-data.ts:29-39`, `CardsDialog.map.ts:21-26` | Combat cards need a separate sandbox button. Consumed card must set `actionsThisTurn`. |
| `MobileActionsBar(props: ActionsPanelViewProps)`; `useMobileActionsBar(onActionClick)` closes sheet in `onSheetActionClick`; "More Actions" button `data-testid="actions-panel-more-actions"`; Log button reads board context | `src/modules/hud/components/ActionsPanel/MobileActionsBar.tsx:17-45`, `MobileActionsBar.hook.ts:40-46`, `MobileSheetTriggers.tsx` | Sandbox mobile state; needs board context wrapper. |
| `myTurnNoSelection` fixture (secondary actions include `GameAction.local_ShowCards`) | `src/modules/hud/components/ActionsPanel/ActionsPanel.fixtures.ts:4-87` | Mobile bar props. |
| `WithEventLogBoard`, `emptyEventLogGameState` | `src/modules/hud/components/ActionsPanel/MobileEventLogSheet.preview.tsx:33,36` | Board context for the mobile bar (precedent: `MobileActionsBar.preview.tsx:13-16`). |
| `buildPlayer(overrides)` | `src/modules/map/board-context.fixtures.ts:12` | Reused for sandbox players (DRY). |
| Overlay status region `role="status"` text `You played <card>.` | `CardPlayOverlay.tsx:13-15`, `CardPlayOverlay.map.ts:13-15` | Test assertion handle. |
| Overlay duration 1100 ms (`CARD_PLAY_DURATION_MS`) | `CardPlayOverlay.map.ts:4` | Fake-timer tests. |
| Testbed registry + `ComponentPreview { slug,title,group,states }` | `src/testbed/registry.ts`, `src/testbed/testbed.types.ts` | Register preview. |
| ESLint: boundary and `legacyUi` rules apply only to `src/modules/**`; `max-lines` 150 applies to `src/testbed` | `eslint.config.mjs:41-64,70` | Testbed code may deep-import `@/modules/*/...`; each file under 150 lines. |
| Doc bullet | `docs/architecture/special-cards.md:13` | docs-sync. |

No move, rename or delete: no old-path grep needed. No CLAUDE.md edit. No `LEGACY_PATHS` change.

## Decisions
- Combat exclusion lives in `findNewCardPlays` (const `NO_PLAY_CARDS`), because every log-driven play passes through it. Rejected: filter in the hook (logic belongs in the pure map).
- Selection-time trigger = `pendingAction` of type `teleport` or `scout`, because the pending action exists only after the Use succeeded (a failed Use plays nothing) and is plain `uiState`. Rejected: calling a `startPlay` from the Use click (plays on failed Use, brings back the click-trigger design of the earlier bug); new `GameState` field (no state change allowed).
- `useCardPlayTrigger` gets optional `selectionPlay: SelectionPlay | null`; the hook depends on its primitives (`cardName`, `turn`), never the object (lessons-learned, "Hooks & effects"). It enqueues once, writing the `${turn}:${cardName}` key into `queuedKeys`, so the later log entry is filtered by the existing dedupe. Rejected: separate second hook (would duplicate queue and key set).
- Gate: `isCardPlayBlocked` ignores `pendingAction` when its `type` is `teleport` or `scout`, by evaluating `hasActiveDialogOrPendingAction({ ...uiState, pendingAction: null })`. Any other pending type (`extra-move`, runtime `sabotage`, `wealthy`, `steal-resource`) and every dialog still block. A dialog opened during Teleport (army selection) holds the play until closed; accepted.
- Sandbox location `src/testbed/components/CardPlaySandbox/`, because the testbed folder holds interactive dev tools with `.preview.tsx` and is outside module lint boundaries, so it can import real components deep. Rejected: `src/modules/cards/...` (would make cards import hud/game-board; a dev tool is not module API); a new route (registry already gives a page, sidebar entry and dev-tool gating).
- Sandbox state: `useReducer(gameBoardReducer, initialUIState)` for UI (real reducer, real gate) plus a small pure `sandboxGameReducer` for fake turn, hand, log. Multi-step cards (Teleport, Scout, Sabotage, Wealthy, Steal Resource) consume the card on `handleResolveCard`; `handleCancelCard` only clears pending and dialogs. This mirrors the real reducers (they log only on resolution). Rejected: running real `handleGameAction` (needs a full map and settings for Teleport and Scout).
- Combat cards cannot be used from the Cards dialog (not in `USABLE_CARDS`), so the sandbox has one button per combat card that appends the log entry the real reducer would.
- Single hook, one view plus one dialogs sub-view, `variant: 'desktop' | 'mobile'` prop; the preview wraps the mobile state in `WithEventLogBoard`. Rejected: two components (duplicated dialogs).
- No new `GameState`, Firestore, or rules change.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.types.ts` | edit | add `SelectionPlay`; optional `selectionPlay` in `CardPlayTriggerArgs` | implementer-a |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.map.ts` | edit | `NO_PLAY_CARDS`, `SELECTION_PLAY_PENDING_TYPES`, skip combat cards in `findNewCardPlays`, add `toSelectionPlay` | implementer-a |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.hook.ts` | edit | selection-time enqueue effect in `useCardPlayTrigger` | implementer-a |
| `src/modules/cards/components/CardPlayOverlay/index.ts` | edit | export `toSelectionPlay`, type `SelectionPlay` | implementer-a |
| `src/modules/cards/index.ts` | edit | export `toSelectionPlay`, type `SelectionPlay` | implementer-a |
| `src/modules/game-board/game-board.map.ts` | edit | `isCardPlayBlocked` ignores teleport/scout pending | implementer-a |
| `src/features/game/components/GameDialogManager.tsx` | edit (legacy wiring) | pass `selectionPlay: toSelectionPlay(uiState.pendingAction, gameState.turn)` to `useCardPlayTrigger`; import `toSelectionPlay` from `@/modules/cards` | implementer-b |
| `src/testbed/components/CardPlaySandbox/CardPlaySandbox.types.ts` | new | state, action, hook-return, props types | implementer-a |
| `src/testbed/components/CardPlaySandbox/CardPlaySandbox.fixtures.ts` | new | local player id, opponents, starting hand | implementer-a |
| `src/testbed/components/CardPlaySandbox/CardPlaySandbox.map.ts` | new | pure: `toSandboxPlayer`, `toCardUseLogEntry`, `toPendingActionForCard`, `toFollowUpDialogAction` | implementer-a |
| `src/testbed/components/CardPlaySandbox/CardPlaySandbox.reducer.ts` | new | pure `sandboxGameReducer` (fake turn, hand, log) | implementer-a |
| `src/testbed/components/CardPlaySandbox/CardPlaySandbox.hook.ts` | new | `useCardPlaySandbox`: UI reducer, game reducer, real trigger, handlers | implementer-a |
| `src/testbed/components/CardPlaySandbox/CardPlaySandbox.styles.ts` | new | class strings | implementer-b |
| `src/testbed/components/CardPlaySandbox/CardPlaySandboxDialogs.tsx` | new | real dialogs + overlay from hook state | implementer-b |
| `src/testbed/components/CardPlaySandbox/CardPlaySandbox.tsx` | new | controls, status panel, log list; renders dialogs | implementer-b |
| `src/testbed/components/CardPlaySandbox/index.ts` | new | `export { CardPlaySandbox }` and props type | implementer-a |
| `src/testbed/components/CardPlaySandbox/CardPlaySandbox.preview.tsx` | new | `cardPlaySandboxPreview` (states Desktop, Mobile) | preview-a |
| `src/testbed/registry.ts` | edit | import and append `cardPlaySandboxPreview` (after `gameBoardSandboxPreview`) | preview-a |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.map.test.ts` | edit | exclusion, `toSelectionPlay` | tester-a |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.hook.test.ts` | edit | selection-time cases | tester-a |
| `src/modules/game-board/game-board.map.test.ts` | edit | gate cases | tester-a |
| `src/testbed/components/CardPlaySandbox/CardPlaySandbox.map.test.ts` | new | map cases | tester-a |
| `src/testbed/components/CardPlaySandbox/CardPlaySandbox.reducer.test.ts` | new | reducer cases | tester-a |
| `src/testbed/components/CardPlaySandbox/CardPlaySandbox.hook.test.ts` | new | flow cases with real trigger | tester-a |
| `src/testbed/components/CardPlaySandbox/CardPlaySandbox.test.tsx` | new | view click-through cases | tester-b |
| `docs/architecture/special-cards.md` | edit (line 13 bullet) | exclusion, selection-time play, gate exception, sandbox slug | docs-sync |

Leave unchanged: `CardPlayOverlay.tsx`, `.styles.ts`, `.fixtures.ts`, `.preview.tsx`, `CardsDialog*`, `game-board.card-actions.hook.ts`, `game-board.hook.ts`, `MobileActionsBar*`. If `CardPlaySandbox.tsx` plus dialogs exceed 150 lines, move the status/log block into `CardPlaySandboxStatus.tsx` (implementer-b); tell the coordinator.

## Contracts
```ts
// ---- src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.types.ts (add) ----
/** A card whose play starts when it is selected, before its targeting step ends. */
export interface SelectionPlay {
  cardName: CardName;
  /** gameState.turn at selection; with cardName it is the dedupe key. */
  turn: number;
}
// CardPlayTriggerArgs gains:
//   /** Teleport/Scout pending action: play now, not after the last target. Omit or null for none. */
//   selectionPlay?: SelectionPlay | null;

// ---- CardPlayOverlay.map.ts (add) ----
import type { PendingAction } from '@/lib/types/dialogs';
/** Combat cards never play the animation. */
export const NO_PLAY_CARDS: readonly CardName[] = [CardName.Overcome, CardName.WarChief, CardName.DecideDiceRoll];
export function toSelectionPlay(pendingAction: PendingAction, turn: number): SelectionPlay | null;
// returns { cardName: pendingAction.cardName, turn } when pendingAction?.type is 'teleport' or 'scout'; else null.
// findNewCardPlays: additionally `continue` when NO_PLAY_CARDS.includes(entry.cardName).
// Import CardName as a value (`import { CardName } from '@/lib/types'`), SelectionPlay from './CardPlayOverlay.types'.

// ---- CardPlayOverlay.hook.ts: inside useCardPlayTrigger, after the log effect, before the start effect ----
// const selectionCard = selectionPlay?.cardName ?? null;
// const selectionTurn = selectionPlay?.turn ?? null;
// useEffect(() => {
//   if (selectionCard === null || selectionTurn === null) return;
//   const key = `${selectionTurn}:${selectionCard}`;
//   if (queuedKeys.current.has(key)) return;
//   queuedKeys.current.add(key);
//   setQueue((current) => [...current, selectionCard]);
// }, [selectionCard, selectionTurn]);
// Destructure `selectionPlay` from the args. Return shape unchanged.

// ---- game-board.map.ts ----
// isCardPlayBlocked signature unchanged. New first lines of the body:
//   const type = uiState.pendingAction?.type;
//   const isMapTargeting = type === 'teleport' || type === 'scout';
//   const dialogState = isMapTargeting ? { ...uiState, pendingAction: null } : uiState;
//   if (hasActiveDialogOrPendingAction(dialogState)) return true;   // replaces the current first check
// Rest unchanged.

// ---- cards/index.ts and CardPlayOverlay/index.ts ----
// export { CardPlayOverlay, useCardPlayTrigger, toSelectionPlay } from ...
// export type { CardPlay, CardPlayOverlayProps, CardPlayTriggerArgs, SelectionPlay } from ...

// ---- GameDialogManager.tsx ----
// useCardPlayTrigger({ log, localPlayerId, isBlocked, selectionPlay: toSelectionPlay(uiState.pendingAction, gameState.turn) })

// ================= Sandbox: src/testbed/components/CardPlaySandbox/ =================

// ---- CardPlaySandbox.types.ts ----
import type { CardName, LogEntry, Player, ResourceType } from '@/lib/types';
import type { GameBoardUIState } from '@/modules/game-board';
import type { CardPlay } from '@/modules/cards';

export type SandboxVariant = 'desktop' | 'mobile';
export interface CardPlaySandboxProps { variant: SandboxVariant }

/** Fake match state: no Firestore, no map. */
export interface SandboxGame {
  turn: number;
  /** Cards in hand; a duplicate is one entry per copy. */
  cards: CardName[];
  /** True after a card was consumed this turn (mirrors actionsThisTurn including GameAction.UseCard). */
  hasUsedCard: boolean;
  log: LogEntry[];
}
export type SandboxGameAction =
  | { type: 'use-card'; cardName: CardName }         // consume one copy, hasUsedCard = true, append card-use log entry
  | { type: 'log-combat-card'; cardName: CardName }  // append entry only; hand and hasUsedCard unchanged
  | { type: 'next-turn' };                           // turn + 1, hand = starting hand, hasUsedCard = false, log kept

export interface CardPlaySandboxState {
  localPlayer: Player;
  opponents: Player[];
  uiState: GameBoardUIState;
  game: SandboxGame;
  /** Result of the real isCardPlayBlocked for the current uiState. */
  isBlocked: boolean;
  play: CardPlay | null;
  endPlay: () => void;
  handleOpenCards: () => void;
  handleCloseCards: () => void;
  /** Mirrors GameDialogManager: closes the Cards dialog, then runs the card's first step. */
  handleUseCard: (cardName: CardName) => void;
  /** Sabotage / Wealthy / Steal Resource target chosen, or Teleport / Scout finished: consume card, clear pending and dialogs. */
  handleResolveCard: () => void;
  /** Sabotage / Wealthy / Steal Resource dialog closed, or Teleport / Scout cancelled: clear pending and dialogs, card stays in hand. */
  handleCancelCard: () => void;
  handleLogCombatCard: (cardName: CardName) => void;
  handleNextTurn: () => void;
}

// ---- CardPlaySandbox.fixtures.ts ----
export const SANDBOX_LOCAL_PLAYER_ID = 'p-local';        // Player.playerId of the local player; Player.id is 0
export const SANDBOX_STARTING_HAND: CardName[];          // [ExtraMove, Sabotage, Wealthy, StealResource, Teleport, Scout, Reinforce]
export const SANDBOX_COMBAT_CARDS: CardName[];           // [Overcome, WarChief, DecideDiceRoll]
export const SANDBOX_OPPONENTS: Player[];                // two players, ids 1 and 2, playerIds 'p-red','p-blue'... built with buildPlayer from '@/modules/map/board-context.fixtures', resources e.g. { food: 3, wood: 3, gold: 3 }
export const SANDBOX_INITIAL_GAME: SandboxGame;          // { turn: 1, cards: SANDBOX_STARTING_HAND, hasUsedCard: false, log: [] }

// ---- CardPlaySandbox.map.ts ----
import type { GameBoardUIAction } from '@/modules/game-board';
import type { PendingAction } from '@/lib/types/dialogs';
import type { StructuredLogEntry } from '@/lib/types';
export function toSandboxPlayer(cards: CardName[], hasUsedCard: boolean): Player;
// buildPlayer({ id: 0, playerId: SANDBOX_LOCAL_PLAYER_ID, name: 'You', specialCards: cards,
//   actionsThisTurn: hasUsedCard ? [GameAction.UseCard] : [] })
export function toCardUseLogEntry(cardName: CardName, turn: number): StructuredLogEntry;
// { kind: 'structured', turn, category: 'cards', message: `You used '${cardName}'.`, playerId: SANDBOX_LOCAL_PLAYER_ID, cardName }
export function toPendingActionForCard(cardName: CardName): PendingAction;
// Teleport -> { type: 'teleport', cardName }
// Scout -> { type: 'scout', cardName, count: 3, scoutedTiles: [] }
// Sabotage / Wealthy / Steal Resource -> same runtime shape as game-board.card-actions.hook.ts:
//   { type: cardName.toLowerCase().replace(/ /g, '-'), cardName } as unknown as PendingAction  (comment: runtime types missing from the union, as in the real hook)
// every other card -> null
export function toFollowUpDialogAction(cardName: CardName): GameBoardUIAction | null;
// Sabotage -> { type: 'SET_SABOTAGE_DIALOG', state: { isOpen: true } }
// Wealthy -> { type: 'SET_WEALTHY_DIALOG', state: { isOpen: true } }
// Steal Resource -> { type: 'SET_STEAL_RESOURCE_DIALOG', state: { isOpen: true } }
// everything else -> null

// ---- CardPlaySandbox.reducer.ts ----
export function sandboxGameReducer(game: SandboxGame, action: SandboxGameAction): SandboxGame;
// pure; 'use-card' removes exactly one copy (first index); never mutates input.

// ---- CardPlaySandbox.hook.ts ----
export function useCardPlaySandbox(): CardPlaySandboxState;
// - const [uiState, dispatchUi] = useReducer(gameBoardReducer, initialUIState)   (from '@/modules/game-board')
// - const [game, dispatchGame] = useReducer(sandboxGameReducer, SANDBOX_INITIAL_GAME)
// - const NO_COMBAT = { combatState: null, monsterCombatState: null, productiveDialogState: null } (module const)
// - isBlocked = isCardPlayBlocked(uiState, NO_COMBAT)
// - { play, endPlay } = useCardPlayTrigger({ log: game.log, localPlayerId: SANDBOX_LOCAL_PLAYER_ID, isBlocked,
//       selectionPlay: toSelectionPlay(uiState.pendingAction, game.turn) })
// - handleOpenCards: dispatchUi({ type: 'TOGGLE_CARDS_DIALOG', playerId: 0 })
// - handleCloseCards: dispatchUi({ type: 'TOGGLE_CARDS_DIALOG', playerId: null })
// - handleUseCard(cardName): dispatchUi TOGGLE_CARDS_DIALOG null; pending = toPendingActionForCard(cardName);
//     if pending: dispatchUi SET_PENDING_ACTION; followUp = toFollowUpDialogAction(cardName), if non-null dispatchUi(followUp); return.
//     else dispatchGame({ type: 'use-card', cardName }).
//   Teleport: pending only. Scout: pending only (no dialog). Immediate cards (Extra Move, Reinforce, ...): log at once.
// - handleResolveCard: cardName = uiState.pendingAction?.cardName; if undefined return;
//     dispatchGame use-card; clearPendingStep().
// - handleCancelCard: clearPendingStep().
// - clearPendingStep(): dispatchUi SET_SABOTAGE_DIALOG null, SET_WEALTHY_DIALOG null, SET_STEAL_RESOURCE_DIALOG null, SET_PENDING_ACTION null.
//   All dispatches of one handler run in the same event handler, so React batches them (log entry and dialog close in one render).
// - handleLogCombatCard: dispatchGame log-combat-card. handleNextTurn: dispatchGame next-turn, then clearPendingStep().
// - localPlayer = useMemo(() => toSandboxPlayer(game.cards, game.hasUsedCard), [game.cards, game.hasUsedCard])
// - Wrap handlers in useCallback.

// ---- CardPlaySandbox.tsx / CardPlaySandboxDialogs.tsx ----
export function CardPlaySandbox({ variant }: CardPlaySandboxProps): JSX.Element;      // calls useCardPlaySandbox()
export function CardPlaySandboxDialogs({ state }: { state: CardPlaySandboxState }): JSX.Element;
// Dialogs (same wiring as GameDialogManager.tsx:240-296):
//  - uiState.dialogs.cardsPlayerId !== null -> <CardsDialog player={state.localPlayer} onClose={state.handleCloseCards}
//      onUseCard={state.handleUseCard} canUseCards />
//  - dialogs.sabotage?.isOpen -> <SabotageDialog players={state.opponents} onSabotage={() => state.handleResolveCard()} onClose={state.handleCancelCard} />
//  - dialogs.wealthy?.isOpen -> <WealthyDialog onSelectResource={() => state.handleResolveCard()} onClose={state.handleCancelCard} />
//  - dialogs.stealResource?.isOpen -> <StealResourceDialog players={state.opponents} onSteal={() => state.handleResolveCard()} onClose={state.handleCancelCard} />
//  - always <CardPlayOverlay play={state.play} onFinished={state.endPlay} />
// CardPlaySandbox layout (all classes from CardPlaySandbox.styles.ts, theme tokens only):
//  - Intro line per variant. Desktop: Button "Cards" (data-testid "sandbox-open-cards") -> handleOpenCards.
//    Mobile: <MobileActionsBar {...myTurnNoSelection} onActionClick={(id) => id === GameAction.local_ShowCards && state.handleOpenCards()} />
//    (imports: MobileActionsBar from '@/modules/hud/components/ActionsPanel/MobileActionsBar', myTurnNoSelection from '.../ActionsPanel.fixtures').
//  - Status block: "Turn N", "Animation gate: blocked | open" (data-testid "sandbox-gate"), "Pending step: <cardName> | none".
//  - Map-step block, shown only when uiState.pendingAction?.type is 'teleport' or 'scout':
//      Button "Finish {cardName}" (data-testid "sandbox-finish-step") -> handleResolveCard; Button "Cancel" -> handleCancelCard.
//  - Combat block: one Button per SANDBOX_COMBAT_CARDS, label `Log ${cardName}` -> handleLogCombatCard.
//  - Button "Next turn" -> handleNextTurn.
//  - Log list (ul, data-testid "sandbox-log"): one li per game.log entry, text = entry.message (structured only), empty state "No log entries yet."
```

## Phases
### Phase 1: Rules, selection-time play and sandbox
1. (implementer-a) `CardPlayOverlay.types.ts`: add `SelectionPlay`; add optional `selectionPlay` to `CardPlayTriggerArgs` with the doc comment from Contracts.
2. (implementer-a) `CardPlayOverlay.map.ts`: add `NO_PLAY_CARDS`, `toSelectionPlay`; in `findNewCardPlays` skip `NO_PLAY_CARDS`. Keep existing exports and behavior otherwise.
3. (implementer-a) `CardPlayOverlay.hook.ts`: add the selection effect exactly as in Contracts; destructure `selectionPlay`; update the hook's doc comment (one line). Run `npx jest src/modules/cards/components/CardPlayOverlay`; existing tests must still pass.
4. (implementer-a) `CardPlayOverlay/index.ts` and `src/modules/cards/index.ts`: export `toSelectionPlay`, `SelectionPlay`.
5. (implementer-a) `game-board.map.ts`: `isCardPlayBlocked` change from Contracts. `hasActiveDialogOrPendingAction` untouched.
6. (implementer-b) `GameDialogManager.tsx`: import `toSelectionPlay` from `@/modules/cards` (existing import block, line 18-28), pass `selectionPlay` at line 45-49. No other edit.
7. (implementer-a) Sandbox logic files in this order: `.types.ts`, `.fixtures.ts`, `.map.ts`, `.reducer.ts`, `.hook.ts`, `index.ts`. Each under 150 lines. `.types.ts` imports only types.
8. (implementer-b) Sandbox view files: `.styles.ts`, `CardPlaySandboxDialogs.tsx`, `CardPlaySandbox.tsx` (`'use client'`). Named exports. No class strings in tsx.
9. (tester-a) Logic tests (see Test plan); run them, then `npm test`.
10. (tester-b) `CardPlaySandbox.test.tsx`.
11. (preview-a) `CardPlaySandbox.preview.tsx` and registry edit. Slug `testbed-card-play-sandbox`, title `Card play sandbox`, group `Cards`. States: `Desktop` renders `<div className="relative min-h-[600px] p-4"><CardPlaySandbox variant="desktop" /></div>`; `Mobile (narrow the window below 768px for the compact card)` renders `<WithEventLogBoard gameState={emptyEventLogGameState}><div className="relative min-h-[600px] p-4"><CardPlaySandbox variant="mobile" /></div></WithEventLogBoard>`. Confirm the mobile breakpoint in `src/modules/shared/use-is-mobile.ts` before writing the title. Keep the preview file under 150 lines; run `npx jest src/testbed`.
12. (docs-sync) Update the bullet at `docs/architecture/special-cards.md:13`.
13. (coordinator, ui-verify) `npm run dev`, open `http://localhost:9002/testbed/testbed-card-play-sandbox`, click through the flows in "Preview states".
14. Checks: `npm run typecheck`, `npm run lint`, `npm test`.

Model escalation: none needed beyond triage overrides (all builders already claude-sonnet-5-5).

## Test plan
- tester-a (logic, first):
  - `CardPlayOverlay.map.test.ts`: `findNewCardPlays` returns nothing for entries with cardName Overcome, War Chief, Decide Dice Roll, and still returns Teleport, Extra Move; `toSelectionPlay` returns `{cardName:'Teleport', turn:3}` for pending teleport, `{cardName:'Scout', turn}` for scout, null for `extra-move`, null for `null`, null for a runtime `sabotage` pending cast.
  - `CardPlayOverlay.hook.test.ts` (`useCardPlayTrigger`, use `renderHook` with `rerender`): (a) `selectionPlay` Teleport turn 2 with `isBlocked=false` starts a play for Teleport with no log change; (b) same with `isBlocked=true` waits, then starts when `isBlocked` flips to false; (c) after (a), a log entry `{cardName:'Teleport', turn:2, playerId: local}` does not start a second play (finish first play with `endPlay`, rerender with the log, assert `play` stays null); (d) same card, turn 3 selection plays again; (e) rerendering with a new `selectionPlay` object of the same card and turn does not enqueue again; (f) a log entry for Overcome by the local player never starts a play; (g) Scout selection then its log entry in same turn: one play only; (h) selection key survives `selectionPlay` going null then the same value again (no replay).
  - `game-board.map.test.ts` (`isCardPlayBlocked`): pending teleport only -> false; pending scout only -> false; pending teleport + `dialogs.armySelection` set -> true; pending teleport + `dialogs.cardsPlayerId: 0` -> true; pending `extra-move` -> true; pending `{type:'sabotage',cardName:'Sabotage'}` cast `as unknown as PendingAction` -> true; existing cases unchanged; `hasActiveDialogOrPendingAction` still true for pending teleport (guards that it was not changed).
  - `CardPlaySandbox.map.test.ts`: `toSandboxPlayer` sets `specialCards` and `actionsThisTurn` (`[GameAction.UseCard]` only when used); `toCardUseLogEntry` shape; `toPendingActionForCard` for Teleport, Scout (count 3, scoutedTiles []), Sabotage (`type 'sabotage'`), Steal Resource (`type 'steal-resource'`), Extra Move -> null; `toFollowUpDialogAction` three dialogs and null for Teleport.
  - `CardPlaySandbox.reducer.test.ts`: `use-card` removes one copy of a duplicated card, sets `hasUsedCard`, appends entry with turn; `log-combat-card` leaves cards and `hasUsedCard`; `next-turn` increments turn, restores hand, clears `hasUsedCard`, keeps log; input never mutated.
  - `CardPlaySandbox.hook.test.ts` (`renderHook(useCardPlaySandbox)`, matchMedia mock as in `CardPlayOverlay.hook.test.ts`): Extra Move: `handleOpenCards`, `handleUseCard('Extra Move')` -> `play.cardName === 'Extra Move'`, `uiState.dialogs.cardsPlayerId === null`; Sabotage: after `handleUseCard('Sabotage')` `dialogs.sabotage.isOpen` true, `isBlocked` true, `play` null; `handleCancelCard` -> no play, card still in `localPlayer.specialCards`, `isBlocked` false; second `handleUseCard('Sabotage')` then `handleResolveCard` -> play Sabotage, card consumed; Teleport: `handleUseCard('Teleport')` -> `isBlocked` false and `play.cardName === 'Teleport'` while `uiState.pendingAction.type === 'teleport'`; `handleResolveCard` afterwards -> after `endPlay`, `play` stays null; Combat: `handleLogCombatCard('Overcome')` -> `play` null; `handleNextTurn` restores hand and increments turn.
- tester-b (view and e2e; no e2e): `CardPlaySandbox.test.tsx` with RTL, `jest.useFakeTimers`, matchMedia mock. Desktop: click `sandbox-open-cards` -> Cards dialog open -> click "Use Extra Move" -> `getByRole('status')` has text "You played Extra Move."; advance 1100 ms -> text empty. Sabotage: Use Sabotage -> Sabotage dialog visible, status empty, `sandbox-gate` text "blocked"; close dialog -> status empty, gate "open", log empty; reopen Cards, Use Sabotage, pick a target -> status "You played Sabotage." Teleport: Use Teleport -> status "You played Teleport." while `sandbox-finish-step` is visible; advance 1100 ms; click `sandbox-finish-step` -> status stays empty. Combat: click "Log Overcome" -> log shows an entry, status stays empty after advancing 1100 ms. Wealthy and Steal Resource: one happy path each (status after confirm). Mobile: render `<WithEventLogBoard gameState={emptyEventLogGameState}><CardPlaySandbox variant="mobile" /></WithEventLogBoard>`; click `actions-panel-more-actions`, click the Cards action in the sheet -> sheet closed (no longer in the document) and Cards dialog open. Read the secondary action label in `ActionsPanel.fixtures.ts:77-87` first. Query labels from the real components; do not guess.

## Preview states
- Card play sandbox: `Desktop` and `Mobile` as in Phase 1 step 11 (no fixtures beyond `CardPlaySandbox.fixtures.ts`).
- Manual click-through checklist for ui-verify (record result in the report):
  1. Desktop: Cards, Use Extra Move: card animation plays after dialog closes.
  2. Next turn. Cards, Use Sabotage: no animation; Cancel: none; Use again, pick target: animation.
  3. Next turn. Wealthy, Steal Resource: animation only after confirming.
  4. Next turn. Use Teleport: animation immediately, "Pending step: Teleport" visible; Finish: no second animation.
  5. Next turn. Same for Scout.
  6. Log Overcome / War Chief / Decide Dice Roll: no animation.
  7. Mobile state: More Actions, tap Cards: sheet closes, Cards dialog opens.

## Risks
- Cancel then re-use the same card in the same turn does not replay (same dedupe key). Accepted by the user, documented in `special-cards.md`.
- A manually reopened Log/actions sheet may cover a waiting play. Accepted by the user.
- `useIsMobile` follows the real window width; the overlay's compact card in the Mobile state needs a narrow window. Stated in the state's title.
- `isCardPlayBlocked` now ignores teleport/scout pending but real Teleport opens army selection dialogs; the play waits for them to close. Accepted.
- Sandbox imports `MobileActionsBar` and `WithEventLogBoard` by deep path (testbed is outside lint boundaries; precedent `MobileActionsBar.preview.tsx`). If lint rejects, report it; do not move code into modules.
- Adding the optional arg keeps old callers valid (no signature break). `isCardPlayBlocked` signature unchanged.

## Review (architect-b)
VERDICT: APPROVED
- Verified: every path and symbol in Verified context and File plan exists (hook, map, types, index, game-board.map, GameDialogManager lines 45-49, testbed registry, buildPlayer, WithEventLogBoard, MobileActionsBar, fixtures, dialog props, reducer actions). No move/rename/delete, so no old-path grep needed.
- Verified behavior: real `handleUseCard` (card-effects.reducer.ts:10-47) logs nothing for Scout/Sabotage/Wealthy/Steal at Use, Teleport logs only on move (movement.reducer.ts:68); so the pending-action selection trigger and the dedupe key are sound. Sabotage/Wealthy/Steal pending types are runtime-only and stay blocked by the new gate.
- Verified lint: boundary rules apply to `src/modules/**` only; `src/testbed` gets max-lines 150 only; test files exempt from max-lines. registry.test.ts constraints (unique kebab slug, unique state names) are met.
- Non-blocking notes: (1) Sandbox consumes Reinforce on use while the real reducer defers consumption; harmless for the click-through. (2) Mobile bar is fixed-position; check in ui-verify that it does not cover the sandbox controls.
