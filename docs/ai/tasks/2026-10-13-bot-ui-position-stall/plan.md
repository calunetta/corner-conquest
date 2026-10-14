# Plan: bot-vs-bot-ui.spec.ts stalls on the Position action button

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] `e2e/bot-vs-bot-ui.spec.ts` no longer stalls on `clickActionButton(page, GameAction.local_Position)`; a full `npm run test:e2e -- e2e/bot-vs-bot-ui.spec.ts` run passes.
- [ ] A fast (non-e2e) failing test exists before the fix, reproducing the stale-`possibleMoves` window, and passes after.
- [ ] No behavior change to `possibleMoves` highlighting or move/attack clicks outside the fixed race.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `clickActionButton`, positions loop | `e2e/bot-ui-actions.ts:133-135,260-265` | The exact call that hangs; selects the tile/army, then clicks `local_Position`. |
| `selectArmyIfAmbiguous` | `e2e/bot-ui-actions.ts:139-146` | Only resolves the multi-army dialog; no-ops and does nothing if `selectedArmy` is already `null`. |
| `getDisabledReason`, `toActionsPanelData`/`canPosition` | `src/modules/hud/components/ActionsPanel/ActionsPanel.disabledReasons.ts:70-77`, `ActionsPanel.map.ts:29-35,56-63` | `local_Position`'s `disabled` is `!isMyTurn \|\| isCardActionInProgress \|\| hasArmyActed \|\| !canPosition`; `canPosition` requires `selectedArmy` truthy. |
| `useActionsPanel` | `src/modules/hud/components/ActionsPanel/ActionsPanel.hook.ts:7-16` | Feeds `selectedArmy`/`gameState`/`isMyTurn` from `useGameBoard()` straight into the map above — no local staleness here. |
| `isArmyEligibleToPosition`, `findAvailableResourceSpot` | `src/modules/game-rules/army-position-eligibility.ts:5-23` | The bot's own eligibility check; confirmed equivalent to `canPosition` modulo `hasActed` (pre-filtered by the reducer's `unactedArmies`), so not the divergence. |
| `applyBotArmyActions` | `src/modules/game-rules/bot-army-actions.reducer.ts:15-128` | Each loop executes exactly one action for one army, highest priority first, until no unacted army has one left — so a single `armyActions` step legitimately produces several `positions`/`moves`/`attacks` entries for different armies. |
| `handleSelectResourceForPosition` | `src/modules/game-rules/resource-position.reducer.ts:5-55` | Sets `selectedArmy.hasActed = true` (line 46) in the normal (non-extra-move) path — confirmed the bot never grants itself Extra Move (`src/modules/game-rules/bot-card-strategy.reducer.ts:19-54` never plays `CardName.ExtraMove`), so this path, not the Extra-Move exception (lines 37-44), is what every bot position goes through. |
| `GameDialogManager`'s `PositionDialog.onSelect` | `src/features/game/components/GameDialogManager.tsx:143-151` | Dispatches `SelectResourcePosition` and closes the dialog, but never dispatches `SET_SELECTED_ARMY: null` — the acting army stays selected after it positions. |
| `useTileClick` | `src/modules/game-board/game-board.tile-click.hook.ts:74-83` | `if (selectedArmy && isPossibleMove)` treats a click on any tile in `uiState.possibleMoves` as "move the selected army," before falling through to the re-selection branch (lines 84-104); on taking that branch it unconditionally dispatches `SET_SELECTED_ARMY: null` (line 80). |
| `getPossibleMoves` | `src/modules/game-rules/movement.reducer.ts:9-42` | Returns `[]` only when `army.hasActed && !player.hasExtraMove` (line 13); radius 2 (`MOVE_RADIUS`, line 6), so most same-island tiles are "possible moves" for an army that hasn't acted. |
| `useGameBoardState`'s possible-moves effect | `src/modules/game-board/game-board.state.hook.ts:45-49,58-66` | `selectedArmy` is a `useMemo` (45-49); `possibleMoves` is **not** — it's written by a separate `useEffect` (58-66) that dispatches `SET_POSSIBLE_MOVES` after the render that produced the new `selectedArmy`/`gameStateForDisplay` commits. |
| `gameBoardReducer`, `SET_POSSIBLE_MOVES`/`SET_SELECTED_ARMY` | `src/modules/game-board/game-board.reducer.ts:10-20`, `src/modules/game-board/game-board.types.ts:67-68` | Confirms `possibleMoves` is reducer state, updated only on dispatch, not re-derived at render time. |
| `GameBoardUIState.possibleMoves` consumer | `src/modules/map/components/IslandTile/IslandTile.map.ts:13,21` | Reads `possibleMoves` straight off `uiState` for tile highlighting — the field must keep existing on `uiState` after the fix. |
| `useGameBoardActions` | `src/modules/game-board/game-board.actions.hook.ts:14-69` | `SelectResourcePosition` is not in `realTimeActions` (42-52), so it goes through the plain `setLocalGameState(result.state)` path (60-65) — a genuine new state object, so `gameStateForDisplay` does change reference, but only on the next render, one tick ahead of the effect above. |
| `GameBoardContext.test.ts` | `src/features/game/context/__tests__/GameBoardContext.test.ts:27-36` | Existing characterization test asserts `SET_SELECTED_ARMY` sets `possibleMoves` from the action payload — breaks once that's removed from the reducer. |

## Root cause (bugs only)
- Reproduction: not yet captured as a fast test; tester-a's job (Phase 1, step 2) is to turn this trace into a failing unit test before any fix lands, per the triage's "must be confirmed with a live run, not assumed" (`triage.md:15,23`).
- Cause: `uiState.possibleMoves` is reducer state set by a `useEffect` one render behind `selectedArmy`/`gameStateForDisplay` (`game-board.state.hook.ts:58-66`), instead of being derived synchronously in the same render. After a bot army positions (normal path: `hasActed` flips true in the same `setLocalGameState` call, `resource-position.reducer.ts:46`), that army stays selected (`GameDialogManager.tsx:143-151` never deselects) and, for the window before the effect's dispatch commits, `uiState.possibleMoves` still holds that army's pre-action move list (radius 2, `movement.reducer.ts:22-36`). `performUiAction`'s positions loop (`e2e/bot-ui-actions.ts:260-265`) immediately clicks the next army's tile with no wait; if that tile falls inside the stale list, `useTileClick` (`game-board.tile-click.hook.ts:74-83`) misreads the click as "move the already-acted army" instead of "select the next army," executes that move, and unconditionally clears `selectedArmyId` (line 80). `selectArmyIfAmbiguous` (`e2e/bot-ui-actions.ts:139-146`) is a no-op (no dialog ever opened), so the following `clickActionButton(GameAction.local_Position)` has no selected army; `canPosition` (`ActionsPanel.map.ts:29-35`) requires one, so the button is disabled for the rest of the run — the exact symptom.

## Decisions
- Fix at the source: make `possibleMoves` a synchronous `useMemo` in `useGameBoardState`, merged into the returned `uiState`, instead of effect+dispatch. Because this removes the stale-render window entirely for every caller (human play included, not just the bot e2e), rather than papering over it in the e2e helper or in `useTileClick`. Rejected: adding a wait/retry in `e2e/bot-ui-actions.ts` between clicks (treats the e2e symptom, leaves the same one-render staleness exploitable by a fast human click or a future bot step). Rejected: special-casing `useTileClick` to re-check eligibility before treating a click as a move (duplicates the already-duplicated `getPossibleMoves` logic instead of fixing its one true owner).
- Remove `SET_POSSIBLE_MOVES` and the `possibleMoves` field on `SET_SELECTED_ARMY`'s action from `GameBoardUIAction` (`game-board.types.ts:67-68`) and their reducer cases (`game-board.reducer.ts:10-20`). Because nothing dispatches them with that intent any more (grep confirmed: no caller passes `possibleMoves` to `SET_SELECTED_ARMY`, and only the hook itself dispatched `SET_POSSIBLE_MOVES`); leaving them would be dead code implying `possibleMoves` is still reducer-owned. `GameBoardUIState.possibleMoves` and `initialUIState.possibleMoves: []` stay (IslandTile.map.ts still reads the field off `uiState`); only how it's populated changes.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/game-board/game-board.state.hook.ts` | edit | Replace the possible-moves `useEffect` with a synchronous `useMemo`; merge it into the returned `uiState`. | implementer-a |
| `src/modules/game-board/game-board.types.ts` | edit | Drop `SET_POSSIBLE_MOVES` and the `possibleMoves?` field on `SET_SELECTED_ARMY` from `GameBoardUIAction`. Keep `GameBoardUIState.possibleMoves` and `initialUIState.possibleMoves: []` unchanged. | implementer-a |
| `src/modules/game-board/game-board.reducer.ts` | edit | Drop the `SET_POSSIBLE_MOVES` case; `SET_SELECTED_ARMY` only sets `selectedArmyId`. | implementer-a |
| `src/modules/game-board/game-board.state.hook.test.ts` | edit | Failing-first repro: prove today's effect-based `possibleMoves` lags `selectedArmy` by one extra flush; prove the fix updates both in the same act(). | tester-a (repro), tester-b (full coverage) |
| `src/features/game/context/__tests__/GameBoardContext.test.ts` | edit | Update the `SET_SELECTED_ARMY` characterization test: it no longer takes or sets `possibleMoves`. | tester-b |

implementer-b: no owned files this phase — the fix is confined to hook/reducer/type logic, no `.tsx`/`.styles.ts`/legacy wiring changes. Confirm with architect-b before skipping.

## Contracts
```ts
// src/modules/game-board/game-board.state.hook.ts
// `possibleMoves` moves from effect-dispatched reducer state to a render-time derivation, closing
// the one-render-cycle window where it could lag `selectedArmy`/`gameStateForDisplay`.
import { getPossibleMoves } from '@/modules/game-rules';
// ...existing imports, existing localGameState/selectedArmy/gameStateForDisplay logic unchanged...

export function useGameBoardState(args: GameBoardStateArgs): GameBoardState {
  // ...unchanged: uiState/dispatch via useReducer, localGameState effect, localPlayer memo,
  // selectedArmy memo (lines 45-49 today), RESET_TURN_UI effect...

  // REMOVE the existing effect at game-board.state.hook.ts:58-66 (the one dispatching
  // SET_POSSIBLE_MOVES) and replace it with:
  const possibleMoves = useMemo<{ x: number; y: number }[]>(() => {
    if (!selectedArmy || !gameStateForDisplay || !isMyTurn) return [];
    return getPossibleMoves(gameStateForDisplay, selectedArmy);
  }, [selectedArmy, gameStateForDisplay, isMyTurn]);

  const uiStateForDisplay = useMemo<GameBoardUIState>(
    () => ({ ...uiState, possibleMoves }),
    [uiState, possibleMoves],
  );

  return {
    uiState: uiStateForDisplay, // was: uiState
    dispatch,
    localGameState,
    setLocalGameState,
    gameStateForDisplay,
    localPlayer,
    selectedArmy,
  };
}
```

```ts
// src/modules/game-board/game-board.types.ts
// GameBoardUIState and initialUIState: unchanged (possibleMoves field stays).
export type GameBoardUIAction =
  | { type: 'SET_SELECTED_ARMY'; armyId: number | null } // `possibleMoves?` field removed
  // 'SET_POSSIBLE_MOVES' variant removed entirely
  | { type: 'SET_PENDING_ACTION'; pendingAction: PendingAction }
  | { type: 'SET_PERFORMING_ACTION'; isPerforming: boolean }
  | { type: 'SET_EXITING'; isExiting: boolean }
  | { type: 'TOGGLE_CARDS_DIALOG'; playerId: number | null }
  | { type: 'SET_ABILITIES_SHOP_OPEN'; open: boolean }
  | { type: 'SET_ARMY_SELECTION_DIALOG'; state: ArmySelectionDialogState }
  | { type: 'SET_ATTACK_SELECTION_DIALOG'; state: AttackSelectionDialogState | null }
  | { type: 'SET_MONSTER_SELECTION_DIALOG'; state: MonsterSelectionDialogState | null }
  | { type: 'SET_POSITION_DIALOG'; state: PositionDialogState }
  | { type: 'SET_SABOTAGE_DIALOG'; state: SabotageDialogState }
  | { type: 'SET_WEALTHY_DIALOG'; state: WealthyDialogState }
  | { type: 'SET_STEAL_RESOURCE_DIALOG'; state: StealResourceDialogState }
  | { type: 'SET_SPECIAL_ISLAND_ROLL_DIALOG'; state: SpecialIslandRollDialogState }
  | { type: 'SET_CONFIRM_EXIT_DIALOG'; open: boolean }
  | { type: 'SET_HOST_LEAVE_DIALOG'; open: boolean }
  | { type: 'RESET_TURN_UI' };
```

```ts
// src/modules/game-board/game-board.reducer.ts
case 'SET_SELECTED_ARMY':
  return { ...state, selectedArmyId: action.armyId }; // possibleMoves override removed
// 'SET_POSSIBLE_MOVES' case removed entirely (falls through to `default: return state`)
```

## Phases
### Phase 1: Root-cause fix and regression coverage
1. tester-a: in `game-board.state.hook.test.ts`, extend `createGameState`/`createPlayer` fixtures with the minimal `map`, `settings.gridSize`, `baseTiles` and an `armies` entry `getPossibleMoves` needs (today's fixtures only cover `players`/`currentPlayerIndex`/`status` per the file's own comment at line 34 — too bare for this). Write a failing test: select an army, then `rerender()` with a `serverGameState` where that army's `hasActed` is now `true` (simulating the post-position state) — assert `result.current.uiState.possibleMoves` is `[]` **in that same `act()`**, with no extra `rerender()`/flush needed to clear it. Run it, confirm it fails against the current effect-based code (quote the failure). (sonnet)
2. implementer-a: apply the `game-board.state.hook.ts`, `game-board.types.ts`, `game-board.reducer.ts` edits from Contracts. (sonnet)
3. tester-a: confirm the Phase-1-step-1 test now passes.
4. tester-b: update `GameBoardContext.test.ts`'s `SET_SELECTED_ARMY` test (drop the `possibleMoves` payload/assertion); add one more `game-board.state.hook.test.ts` case covering deselection (`selectedArmy` → `null`: `possibleMoves` → `[]`) and one covering a fresh, unacted selection still returning the real move list (not an empty list by accident of the refactor).
5. implementer-a/implementer-b: run `npm run typecheck` and `npm run lint` on every file touched (not scoped to `src/modules/game-board`); fix any fallout.
6. Checks: `npm test`, then one real `npm run test:e2e -- e2e/bot-vs-bot-ui.spec.ts` full run (quote pass/fail and duration; this is the actual regression surface per triage's Scope).
7. docs-sync: only if this changes documented behavior — `docs/architecture/structure-and-state.md` if it documents `possibleMoves` as reducer-owned UI state; otherwise report "no change needed" with the file checked.
8. Commit: `fix(game-board): derive possibleMoves synchronously instead of one render behind selectedArmy`.

Model escalation: step 1 (sonnet, per triage Overrides — building a correct failing repro from a trace, not a mechanical edit) and the implementer-a edit (step 2, sonnet per triage Overrides).

## Test plan
- tester-a (logic, first):
  - `game-board.state.hook.test.ts`: the failing-first repro from Phase 1 step 1 (stale `possibleMoves` survives a `hasActed` flip without an extra flush).
- tester-b (broader coverage):
  - `game-board.state.hook.test.ts`: deselection clears `possibleMoves`; a newly selected, unacted army gets its real (non-empty, radius-2) move list; `isMyTurn` false forces `possibleMoves` to `[]` regardless of `selectedArmy`.
  - `GameBoardContext.test.ts`: `SET_SELECTED_ARMY` sets only `selectedArmyId`, no `possibleMoves` payload accepted.
  - e2e: full `npm run test:e2e -- e2e/bot-vs-bot-ui.spec.ts` run (the real regression surface named in `triage.md:19`) — not a new spec, the existing one must pass end to end.

## Preview states
None — no view files change.

## Risks
- The staleness window may not be the only path to this symptom (triage.md:15 names a second hypothesis: a real bot-planning/UI-enablement disagreement). If tester-a's repro (Phase 1 step 1) does NOT reproduce a real lag against current code, stop and report back to architect-b before implementing this fix — the root cause would be unconfirmed and this plan's Contracts would not apply.
- `getPossibleMoves` is expensive-ish (loops `MOVE_RADIUS` tiles) and now runs on every render where `selectedArmy`/`gameStateForDisplay`/`isMyTurn` change instead of once per effect; same frequency as before in practice (the effect's own dependency array was identical), so no new perf concern.

## Review (architect-b)
VERDICT: APPROVED

Verified every cited symbol/path against the real files: `game-board.state.hook.ts:1-77` (useEffect at 58-66 + SET_POSSIBLE_MOVES dispatch, matches), `game-board.tile-click.hook.ts:74-83` (isPossibleMove branch at 74-75, unconditional `SET_SELECTED_ARMY: null` at 80), `game-board.types.ts:66-68` (optional `possibleMoves?` on SET_SELECTED_ARMY, separate SET_POSSIBLE_MOVES variant), `game-board.reducer.ts:10-20`, `ActionsPanel.disabledReasons.ts:70-77` and `ActionsPanel.map.ts:29-35,56-63` (`canPosition` requires `selectedArmy`), `army-position-eligibility.ts:5-23`, `bot-army-actions.reducer.ts:15-28`, `resource-position.reducer.ts:5-55` (line 46 `selectedArmy.hasActed = true` in the non-Extra-Move path), `GameDialogManager.tsx:146-151` (PositionDialog `onSelect` never dispatches a deselect), `movement.reducer.ts:9-42` (radius 2, `hasActed` short-circuit at line 13), `IslandTile.map.ts:13,21` reads `possibleMoves` off `uiState`, `GameBoardContext.test.ts:27-36` (today's SET_SELECTED_ARMY test passes a `possibleMoves` payload — breaks under the contract as planned, correctly flagged for tester-b), `e2e/bot-ui-actions.ts:133-135,139-146,260-265` (clickActionButton, selectArmyIfAmbiguous no-op, the positions loop with no wait between clicks), `game-board.actions.hook.ts:14-69` (`SelectResourcePosition` not in `realTimeActions`, goes through plain `setLocalGameState`). No invented path or symbol found. Repo-wide grep for `SET_POSSIBLE_MOVES` and `possibleMoves` turned up one file not in the File plan, `game-board.local-actions.hook.test.ts:33` — it only initializes a fixture's `possibleMoves: []` field, doesn't dispatch or assert SET_SELECTED_ARMY's removed payload, so it needs no edit; leave as is. `docs/architecture/structure-and-state.md:33,131` documents `gameBoardReducer` as owning `possibleMoves` — this goes stale under the fix and is correctly routed to docs-sync in Phase 1 step 7.

Item 1 (implementer-b with zero owned files): acceptable. The File plan's note under the table says so explicitly, not a silent drop — the actual fix is confined to a hook, a reducer and a type union with no `.tsx`/`.styles.ts` change (confirmed above: no view file reads anything other than the already-unchanged `GameBoardUIState.possibleMoves` field), so there is nothing for implementer-b to own this phase. The coordinator skips that step when it has no work, same as `docs-sync`'s conditional step 7.

Item 2 (root cause from code reading, not yet confirmed by a failing test): acceptable at this stage, by design of this plan's own Phase 1 ordering and this pipeline's placement of tester-a right after architect-b. Phase 1 step 1 has tester-a build the failing-first repro and run it against today's code *before* implementer-a touches anything (step 2), matching skill `testing`'s "Bugs" rule (write the test, run it, confirm it fails for the stated reason, then fix). The plan's Risks section already states the fallback: if tester-a's repro does not reproduce a real lag against current code, stop and report back to architect-b before implementing, rather than silently proceeding on an unconfirmed cause. That is the correct gate; approving the plan now does not approve the fix without that confirmation.

No other findings. Design is the right one: fixing the one-render staleness at its source (`useMemo` instead of effect+dispatch) removes the race for every caller, not just the e2e helper, and the rejected alternatives (wait/retry in the e2e helper, re-validating in `useTileClick`) are correctly rejected as symptom patches. File plan and contracts are consistent with each other and with the codebase.
