# Plan: Card-play animation only after the card is used and every dialog/sheet is closed

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] The animation no longer starts on the Use click. It starts when a card-use log entry by the local player appears in `gameState.log`, and only while no dialog, pending step or combat is open.
- [ ] Sabotage / Wealthy / Steal Resource: nothing plays when the dialog opens or is cancelled; it plays after the target is chosen and the dialog has closed.
- [ ] Teleport / Scout: plays after the final step completes (pending action cleared), not at card pick.
- [ ] Combat cards (Overcome, War Chief, Decide Dice Roll): play after the combat dialog closes.
- [ ] Reinforce / Efficient / Master Builder / Extra Move / Productive: play right after the Cards dialog closes (Productive: after its dialog resolves).
- [ ] Mobile: tapping an action in the "more actions" sheet closes the sheet, then the Cards dialog opens; the animation plays after the dialog closes.
- [ ] Reload mid-match and other players' card entries never trigger an animation. A card plays once per turn (Efficient/Reinforce deploy entries do not replay).
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `GameDialogManager` Use handler calls `startCardPlay` before `local_UseCard` | `src/features/game/components/GameDialogManager.tsx:283-287` | Root cause: trigger fires on click. Remove. |
| `useCardPlay()` returns `{ play, startPlay, endPlay }`, `CardPlay = { cardName, playId }` | `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.hook.ts:10-26`, `CardPlayOverlay.types.ts:3-7` | Reused unchanged inside the new trigger hook. |
| `CardPlayOverlay` props `{ play, onFinished }` | `CardPlayOverlay.types.ts:9-13` | Unchanged. |
| Public exports | `src/modules/cards/components/CardPlayOverlay/index.ts:1-3`, `src/modules/cards/index.ts:12-13` | `useCardPlay` export replaced by `useCardPlayTrigger`. Only consumer is GameDialogManager. |
| `StructuredLogEntry` has `turn`, `playerId?: string`, `cardName?: CardName`; `GameState.log: LogEntry[]` (`string | StructuredLogEntry`) | `src/lib/types/game.ts:51,66,91` | Consumption signal. |
| `pushLogEntry` sets `kind:'structured'`, `turn: state.turn`, appends to `state.log` | `src/modules/game-rules/log-entry.ts:6-8` | Log is append-only; no trimming found (grep `log.slice`/`MAX_LOG` in game-rules, game-board: none). |
| Card-use entries with `cardName` | `card-effects.reducer.ts:24,34,42,100`; `card-targeted-effects.reducer.ts:20,47,83,92`; `combat-monster-roll.reducer.ts:60,80,95`; `movement.reducer.ts:68`; `player-actions.reducer.ts:50` | Consumption points. Reinforce/Efficient/MasterBuilder log at activation (`card-effects.reducer.ts:24`); Efficient logs again at deploy (`player-actions.reducer.ts:50`) so dedupe per turn+card is required. Sabotage/Wealthy/Steal/Teleport/Scout/combat log only on resolution. |
| `gameState` from `useGameBoard()` is `gameStateForDisplay = isMyTurn && localGameState ? localGameState : serverGameState` | `src/modules/game-board/game-board.state.hook.ts:19`, `game-board.hook.ts:119` | Confirmed: on my turn the local buffer is shown, so a log entry pushed by a local reducer is visible in the same render batch, no Firestore round-trip. |
| `onAction` applies `handleGameAction` and calls `setLocalGameState(result.state)` synchronously for non-realtime actions | `src/modules/game-board/game-board.actions.hook.ts:62-65` | Entry appears together with the dialog-close dispatches (batched). If not batched, the hold gate covers it. |
| `handleUseCard` opens Sabotage/Wealthy/Steal dialogs and sets `pendingAction` | `src/modules/game-board/game-board.card-actions.hook.ts:56-93` | These keep the gate closed until resolved. |
| `hasActiveDialogOrPendingAction(uiState)` | `src/modules/game-board/game-board.map.ts:4-17`; not exported from `src/modules/game-board/index.ts` | Covers pendingAction, selection/position/abilities/steal/sabotage/wealthy/specialIsland dialogs, cardsPlayerId. Does NOT cover combat, productive, confirmExit, hostLeave. Used by `game-board.hook.ts:61`; must stay unchanged. |
| Combat/productive dialogs are rendered from `gameState.combatState`, `gameState.monsterCombatState`, `gameState.productiveDialogState?.playerId === localPlayer.id` | `GameDialogManager.tsx:98,108,46` | Gate must read them. |
| Resource-gain log hook = precedent for log-driven detection (seed on first render, commit seen length in effect) | `src/modules/game-board/resource-gain-events.hook.ts:10-25` | Same seeding pattern. |
| Mobile sheet state is local to `useMobileActionsBar` (`isSheetOpen`, `onSheetOpenChange`) | `src/modules/hud/components/ActionsPanel/MobileActionsBar.hook.ts:21-30` | Close on action tap. |
| `MobileActionsBar` passes `onActionClick` straight to `MobileActionsSheet` | `MobileActionsBar.tsx:135-144` | Wrap here. |
| `onActionClick: (id: GameAction) => void` | `ActionsPanel.types.ts:31,54` | Handler type. |
| Local player's log id: `localPlayer.playerId` (string) | `GameDialogManager.tsx:74` | Filter. |
| Doc bullet to update | `docs/architecture/special-cards.md:13` | docs-sync. |

## Root cause
- Reproduction: Cards dialog, Use Sabotage. Overlay (z-40, 1100 ms) starts at `GameDialogManager.tsx:285` while `SabotageDialog` (z-50) opens, so it plays hidden; cancelling does not consume the card (`card-effects.reducer.ts:19` defers) yet it already played. Combat cards never go through that handler. Mobile sheet stays open (`MobileActionsBar.tsx:135`) over the animation.
- Cause: trigger tied to the click, not to consumption; no gate on open dialogs; sheet never closes on action tap.

## Decisions
- Trigger = new local-player entry with `cardName` in `gameState.log`, because it is the exact moment the rule engine consumes/activates the card, covers every card (incl. combat) with one rule, and needs no GameState/Firestore change. Local buffer verified as the displayed state, so no delay. Rejected: Use-click trigger (current bug); per-card special cases in `handleUseCard` (many branches, misses combat cards); diffing `player.specialCards` (misses activation-only cards, Reinforce stays in hand).
- Gate = pure boolean `isCardPlayBlocked(uiState, gameState)` from existing state, because uiState already tracks every dialog and pending step. Rejected: DOM `[role=dialog]` MutationObserver (async, tests need real DOM timing, Radix portals/animations flap, observes our own overlay/sheets).
- Sheets are not part of the gate. Instead the actions sheet closes on action tap, because the sheet is only open while the player taps an action, and every card flow starts from such a tap. Rejected: lifting `isSheetOpen` into context (new cross-module state for one case). Residual: the user can manually reopen the actions/log sheet while a play is held; accepted, documented in Risks.
- Hold = queue in the trigger hook; play starts when `!isBlocked && !play`. Several entries queue in order (one play at a time).
- Dedupe key `${entry.turn}:${cardName}` kept in a ref, added when the entry is detected. A card cancelled and re-activated in the same turn will not replay: accepted (rare).
- Seed seen log length on first run so reload never replays; if `log.length` shrinks reset to the new length.
- `useCardPlay` stays as the internal state owner (tests exist); only `useCardPlayTrigger` is exported publicly. No change to overlay visuals, rules, Firestore.
- No new previews, no CLAUDE.md edits.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.types.ts` | edit | add `LoggedCardPlay`, `CardPlayTriggerArgs` | implementer-a |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.map.ts` | edit | add pure `findNewCardPlays` | implementer-a |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.hook.ts` | edit | add `useCardPlayTrigger` (seed, queue, dedupe, gate) | implementer-a |
| `src/modules/cards/components/CardPlayOverlay/index.ts` | edit | export `useCardPlayTrigger` and `CardPlayTriggerArgs`, stop exporting `useCardPlay` | implementer-a |
| `src/modules/cards/index.ts` | edit | line 12-13: export `useCardPlayTrigger` instead of `useCardPlay` | implementer-a |
| `src/modules/game-board/game-board.map.ts` | edit | add `isCardPlayBlocked` (keep `hasActiveDialogOrPendingAction` untouched) | implementer-a |
| `src/modules/game-board/index.ts` | edit | export `isCardPlayBlocked` | implementer-a |
| `src/modules/hud/components/ActionsPanel/MobileActionsBar.hook.ts` | edit | take `onActionClick`, return `onSheetActionClick` (closes sheet, then forwards) | implementer-a |
| `src/modules/hud/components/ActionsPanel/MobileActionsBar.tsx` | edit | pass `onSheetActionClick` to `MobileActionsSheet` (line 142) | implementer-b |
| `src/features/game/components/GameDialogManager.tsx` | edit (legacy wiring) | replace `useCardPlay`/`startCardPlay` with `useCardPlayTrigger`; remove `startCardPlay` call at line 285 | implementer-b |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.map.test.ts` | edit | `findNewCardPlays` cases | tester-a |
| `src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.hook.test.ts` | edit | `useCardPlayTrigger` cases | tester-a |
| `src/modules/game-board/game-board.map.test.ts` | edit | `isCardPlayBlocked` cases | tester-a |
| `src/modules/hud/components/ActionsPanel/MobileActionsBar.hook.test.tsx` | edit | existing calls pass `jest.fn()`; new `onSheetActionClick` cases | tester-a |
| `src/modules/hud/components/ActionsPanel/MobileActionsBar.test.tsx` | edit | tapping a sheet action closes the sheet and calls `onActionClick` | tester-b |
| `docs/architecture/special-cards.md` | edit (line 13 bullet) | new trigger and gate | docs-sync |

Leave: `CardPlayOverlay.tsx`, `.styles.ts`, `.fixtures.ts`, `.preview.tsx`, `CardsDialog` (its `onUseCard` prop is unchanged), `game-board.hook.ts` (`hasActiveDialogOrPendingAction` unchanged). No file is moved/renamed/deleted; `useCardPlay` export removal has one importer (GameDialogManager, same phase).

## Contracts
```ts
// src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.types.ts (add)
import type { CardName } from '@/lib/types';
import type { GameState } from '@/lib/types';

/** A card-use log entry by the local player. */
export interface LoggedCardPlay {
  cardName: CardName;
  turn: number;
}

export interface CardPlayTriggerArgs {
  log: GameState['log'];          // gameState.log (displayed state, local buffer on my turn)
  localPlayerId: string;          // localPlayer.playerId
  /** True while any dialog, pending step or combat is open; a detected play is held until false. */
  isBlocked: boolean;
}

// CardPlayOverlay.map.ts (add)
/** Local player's card-use entries in `log.slice(sinceIndex)`, in log order. Skips string entries,
 *  entries without cardName, and entries by other players. */
export function findNewCardPlays(
  log: GameState['log'],
  sinceIndex: number,
  localPlayerId: string,
): LoggedCardPlay[];

// CardPlayOverlay.hook.ts (add)
/** Seeds on first run (never replays history). Queues new local card-use entries (deduped by
 *  `${turn}:${cardName}`), starts one via useCardPlay().startPlay when !isBlocked and no play is active. */
export function useCardPlayTrigger(args: CardPlayTriggerArgs): {
  play: CardPlay | null;
  endPlay: () => void;
};

// src/modules/game-board/game-board.map.ts (add)
import type { GameState } from '@/lib/types';
export function isCardPlayBlocked(
  uiState: GameBoardUIState,
  gameState: Pick<GameState, 'combatState' | 'monsterCombatState' | 'productiveDialogState'>,
): boolean;
// = hasActiveDialogOrPendingAction(uiState)
//   || uiState.dialogs.confirmExit || uiState.dialogs.hostLeave
//   || !!gameState.combatState || !!gameState.monsterCombatState || !!gameState.productiveDialogState

// MobileActionsBar.hook.ts
import type { GameAction } from '@/lib/types';
export interface MobileActionsBarState {
  // ...existing fields unchanged...
  /** Closes the actions sheet, then forwards the click. */
  onSheetActionClick: (id: GameAction) => void;
}
export function useMobileActionsBar(onActionClick: (id: GameAction) => void): MobileActionsBarState;
```

Hook algorithm (implementer-a, exact):
```
const { play, startPlay, endPlay } = useCardPlay();
const [queue, setQueue] = useState<CardName[]>([]);
const seenLogLength = useRef<number | null>(null);
const queuedKeys = useRef(new Set<string>());

useEffect(() => {                       // deps [log, localPlayerId]
  const seen = seenLogLength.current;
  seenLogLength.current = log.length;
  if (seen === null || log.length <= seen) return;   // first run seeds; shrink/no growth: nothing
  const fresh = findNewCardPlays(log, seen, localPlayerId).filter(({ turn, cardName }) => {
    const key = `${turn}:${cardName}`;
    if (queuedKeys.current.has(key)) return false;
    queuedKeys.current.add(key);
    return true;
  });
  if (fresh.length > 0) setQueue((q) => [...q, ...fresh.map((p) => p.cardName)]);
}, [log, localPlayerId]);

useEffect(() => {                       // deps [queue, isBlocked, play, startPlay]
  if (isBlocked || play || queue.length === 0) return;
  startPlay(queue[0]);
  setQueue((q) => q.slice(1));
}, [queue, isBlocked, play, startPlay]);

return { play, endPlay };
```
Note: `log.length <= seen` after setting `seenLogLength.current = log.length` handles shrink (reset) too.

GameDialogManager wiring (implementer-b):
```tsx
const { play: cardPlay, endPlay: endCardPlay } = useCardPlayTrigger({
  log: gameState.log,
  localPlayerId: localPlayer.playerId,
  isBlocked: isCardPlayBlocked(uiState, gameState),
});
```
Call it where `useCardPlay()` is now (line 32) but it needs `gameState`, `localPlayer`, `uiState` from `useGameBoard()`, so move the call below the `useGameBoard()` destructure (line 43). Import `isCardPlayBlocked` from `@/modules/game-board` (line 28 import). Delete `startCardPlay(cardName);` at line 285; `onUseCard` becomes dispatch + `onLocalAction` only.

MobileActionsBar wiring (implementer-b): destructure `onSheetActionClick` from `useMobileActionsBar(onActionClick)` (line 35) and change line 142 to `onActionClick={onSheetActionClick}`. Row 2 buttons (line 102) keep `onActionClick`.

## Phases
### Phase 1: Log-driven, gated card-play trigger and mobile sheet close
1. Add types to `CardPlayOverlay.types.ts` per Contracts (implementer-a)
2. Add `findNewCardPlays` to `CardPlayOverlay.map.ts` (implementer-a)
3. Add `useCardPlayTrigger` to `CardPlayOverlay.hook.ts` using the exact algorithm; keep `useCardPlay` exported from this file (implementer-a)
4. Update both `index.ts` exports (implementer-a)
5. Add `isCardPlayBlocked` to `game-board.map.ts`; export from `src/modules/game-board/index.ts` (implementer-a)
6. `MobileActionsBar.hook.ts`: new param and `onSheetActionClick = useCallback((id) => { setIsSheetOpen(false); onActionClick(id); }, [onActionClick])` (implementer-a)
7. tester-a: write logic tests (map, hook, game-board map, mobile hook); they fail on missing symbols until 1-6 land, run after
8. Wire `MobileActionsBar.tsx` (implementer-b)
9. Wire `GameDialogManager.tsx` (implementer-b)
10. tester-b: MobileActionsBar view test
11. docs-sync: rewrite the Card-Play Animation bullet in `docs/architecture/special-cards.md:13`
12. Run `npm run typecheck`, `npm run lint`, `npm test`; coordinator runs ui-verify on desktop (Sabotage cancel: no animation; Sabotage confirm: plays after dialog closes; Extra Move: plays after Cards dialog closes) and mobile viewport (sheet closes on Cards tap)

Model escalation: all steps already sonnet via triage Overrides. No further escalation.

## Test plan
- tester-a (logic, first):
  - `findNewCardPlays`: returns `[]` when `sinceIndex >= log.length`; skips string entries; skips entries without `cardName`; skips entries with another `playerId`; returns `{cardName, turn}` in log order for local entries after `sinceIndex`; ignores matching entries before `sinceIndex`.
  - `useCardPlayTrigger` (renderHook with rerender props, entries built with `kind:'structured'`):
    - first render with a log that already contains a local card entry: `play` stays null (seed).
    - appended local entry, `isBlocked:false`: `play` = `{cardName, playId:1}`.
    - appended local entry while `isBlocked:true`: `play` null; rerender `isBlocked:false`: plays.
    - entry by another playerId: no play.
    - same turn + same card appended twice (Efficient activation then deploy): one play only.
    - same card, different turn: second plays after `endPlay`.
    - two different cards appended in one update: first plays, second starts only after `endPlay()`.
    - log shorter than before (shrink) then growing again: no replay of old entries, new local entry plays.
    - `endPlay` clears `play`.
  - `isCardPlayBlocked`: false for `initialUIState` with all three gameState fields null; true for each of: a `hasActiveDialogOrPendingAction` trigger (pendingAction teleport), `confirmExit`, `hostLeave`, `combatState` set, `monsterCombatState` set, `productiveDialogState` `{playerId:0}`. Use the casts already in `game-board.map.test.ts` style; `combatState`/`monsterCombatState` values via `as unknown as GameState['combatState']`.
  - `useMobileActionsBar(onActionClick)`: `onSheetActionClick(id)` sets `isSheetOpen` false after it was opened via `onSheetOpenChange(true)` and calls `onActionClick` once with `id`; `onSheetActionClick` is referentially stable across rerenders with the same `onActionClick`. Update every existing `renderHook(() => useMobileActionsBar())` call AND the `HookTestComponent` helper (`MobileActionsBar.hook.test.tsx:30`) to pass `jest.fn()`.
- tester-b (view and e2e):
  - `MobileActionsBar.test.tsx`: open the sheet via the "more actions" trigger, click a secondary action button; assert `onActionClick` called with that action id and the sheet title "Actions" is gone. Row 2 main action click does not touch the sheet. No e2e (needs a full card flow; coordinator's ui-verify covers it).
  - No GameDialogManager unit test: it needs the full board context; its logic is the tested hook and map.

## Preview states
- None. Timing only; `CardPlayOverlay` previews unchanged.

## Risks
- Cancel then re-activate the same card in the same turn skips the second animation (dedupe key). Accepted.
- User manually opening the actions or log sheet while a play is held: overlay (z-40) may run under the sheet (z-50). Accepted: the actions sheet closes on action tap, and the log sheet is opened by deliberate user action.
- Entry detection assumes the log is append-only; verified no trimming in `src/modules/game-rules` and `src/modules/game-board`. Shrink is handled by reseeding.
- `queuedKeys` grows by at most one key per card per turn; no cleanup needed.
- `onLocalAction(local_UseCard)` throwing (not-your-card, second card in a turn) pushes no log entry, so no animation: correct.

## Review (architect-b)
VERDICT: APPROVED

Verified: every path/symbol in Verified context and File plan exists (cardName log sites, `hasActiveDialogOrPendingAction`, `useCardPlay`, `MobileActionsBar` wiring, `isScout` dispatch at `game-board.tile-click.hook.ts:35`). Old-name grep for `useCardPlay` over src, .claude, docs, scripts: only GameDialogManager, the two index files, the doc bullet at `special-cards.md:13` (in File plan) and older task plans (leave).
- Gate coverage: `isCardPlayBlocked` = every dialog rendered in GameDialogManager except VictoryDialog and ConnectionWarningDialog (game over / connection loss; acceptable, non-blocking). Position, army, attack, monster selection, abilities shop, special island roll, cards, sabotage, wealthy, steal, productive, combat, monster combat, confirmExit, hostLeave and pendingAction are all covered.
- Dedupe: Efficient/Reinforce log at activation (`card-effects.reducer.ts:24`) and at deploy (`player-actions.reducer.ts:50,61`); key `${turn}:${card}` yields one play. Reinforce/Efficient play at activation, not at deploy, and a cancel (`player-cancel-action.reducer.ts:34`, no cardName) does not undo it; consistent with the acceptance criteria and the old click-time behavior.
- Seeding: GameDialogManager reads `gameState.log` unguarded, so gameState is loaded at mount; first-run seed prevents replay on reload. StrictMode double effect is safe (ref persists). Turn-end switch local to server state is safe because keys persist.
- Scout: UseCard with `isScout` is dispatched only after the third tile and pending clear (`game-board.tile-click.hook.ts:33-35`), so the log entry is final-step. Teleport logs on the move. Matches ACs.
- Mobile "close menu then play": sheet closes on action tap, Cards dialog opens, play waits for dialog close. Met. Residual log-sheet case accepted.
- Folded in: `HookTestComponent` helper in the mobile hook test also needs the new argument.
