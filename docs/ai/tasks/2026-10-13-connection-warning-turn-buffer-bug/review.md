# Final review: Connection warning dialog reads a frozen lastSeenAt during the player's own turn, phase 1/1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no errors.
- `npx eslint` on all 6 touched files (`game-board.types.ts`, `game-board.hook.ts`, `game-board.hook.types.ts`, `ConnectionWarningDialog.hook.ts`, `ConnectionWarningDialog.hook.test.ts`, `TileBoats.fixtures.ts`): no output, no warnings.
- `npx jest src/modules/game-board/components/ConnectionWarningDialog/ConnectionWarningDialog.hook.test.ts src/modules/map/components/TileBoats`: `Test Suites: 24 passed, 24 total` / `Tests: 386 passed, 386 total`.
- `npx jest src/modules/game-board/components/ConnectionWarningDialog` (includes the `.test.tsx` view suite): `Test Suites: 2 failed, 16 passed, 18 total` / `Tests: 32 failed, 234 passed, 266 total`. Traced every failure's stack trace: all resolve `react`/`react-dom`/`@testing-library/react` from `.claude/worktrees/inspiring-kare-ee7f7f/node_modules/...` instead of the repo root's `node_modules`, i.e. duplicate React module instances pulled in by a stray worktree checkout — not caused by this change. `ConnectionWarningDialogView`'s props (`ConnectionWarningViewModel`) are untouched by this fix, and the plan correctly scoped tester-b to "no view test needed." Pre-existing, unrelated to this diff; same class of issue the coordinator's log already flagged.
- No ui-verify run: no visual/props change (plan's Preview states section: none).

## Plan adherence
- "During the local player's own turn, dialog does not open while real heartbeats are landing": met. `ConnectionWarningDialog.hook.ts` now reads `livePlayer.lastSeenAt`/`livePlayer.isBot` from `serverGameState.players.find(...)` instead of the turn-buffered `localPlayer`. New test "stays closed ... when gameState's buffered lastSeenAt is stale but serverGameState's live lastSeenAt is fresh" passes.
- "onDismiss closes the dialog once the forced heartbeat lands": met. New test "onDismiss closes the dialog once serverGameState's lastSeenAt advances, even though the buffered gameState's lastSeenAt never changes" passes.
- "No change to withSyncedSeatManagement's exclusion / thresholds / other context consumers": verified — `git diff` shows no edit to `game-board.state.map.ts`, `game-board.state.hook.ts`'s threshold constants untouched; the only other `GameBoardContextType` consumers affected are the ones adding the new required field (`TileBoats.fixtures.ts`), not changing behavior.
- File plan followed exactly: `game-board.types.ts` (new field), `game-board.hook.ts` (contextValue + deps), `game-board.hook.types.ts` (doc-comment 15→16), `ConnectionWarningDialog.hook.ts` (live lookup), `ConnectionWarningDialog.hook.test.ts` (mock + 2 new cases), `TileBoats.fixtures.ts` (fixture field), `systems-and-visuals.md` §6.14 (docs). Contracts block matches the real diff field-for-field.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `src/modules/game-board/game-board.types.ts:67` | This file's working-tree diff also removes the `SET_POSSIBLE_MOVES` action and the `possibleMoves` field from `SET_SELECTED_ARMY`. Confirmed via `docs/ai/tasks/2026-10-13-bot-ui-position-stall/progress.md` this belongs to a different, still-blocked task (tester-b reported BLOCKER there), not this one — this task's plan only calls for adding `serverGameState: GameState`. Not a defect in this task's work, but the coordinator must stage only the `serverGameState` hunk of this file (e.g. `git add -p`) when committing this task, so the unrelated and unfinished `bot-ui-position-stall` change isn't swept into this commit. | coordinator | Not blocking this task's approval; blocks a clean commit if ignored. |

## Docs
- `docs-sync`: ran. `docs/architecture/systems-and-visuals.md` §6.14 rewritten to state the dialog reads `lastSeenAt`/`isBot` via a `playerId` lookup in the live `serverGameState`, while `status` stays sourced from the (possibly buffered) `gameState`, with a cross-reference to §6.10's turn-buffering bullet. Verified the paragraph's content matches the implementation.

## Progress.md
Ticked: final review (architect-b). `committed: <hash>` left for the coordinator.
