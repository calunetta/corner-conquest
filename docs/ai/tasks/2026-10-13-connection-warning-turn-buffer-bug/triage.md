# Triage: Connection warning dialog reads a frozen lastSeenAt during the player's own turn

Request: Fix two bugs reported by the user: the connection-lost warning dialog shows up even while the player is actively playing during their own turn, and the "I'm back" button appears to do nothing.
Type: bug
Tier: M
Pipeline: architect-a architect-b tester-a implementer-a implementer-b tester-b docs-sync architect-b:final-review
Overrides: implementer-a=sonnet
Phases: 1

## Why this tier
- Root cause already found and verified by reading the code directly (not guessed), so architect-a's job is to confirm it and decide the exact contract, not search for it from scratch:
  - `src/modules/game-board/game-board.state.hook.ts:20`: while `isMyTurn` is true, `gameStateForDisplay = localGameState`, a `cloneDeep(serverGameState)` snapshot taken once at turn start (`game-board.state.hook.ts:30-32`).
  - `withSyncedSeatManagement` (`game-board.state.map.ts`, added in commit `5d82f0a`, landed 2026-10-13, one day after the connection-warning-dialog feature shipped in `c4f9014`/`a030e17`) re-syncs `isBot`/`isVacant`/`lastSeenAt`/`reclaimRequested` into the buffer for **every seat except the local player's own** (`game-board.state.hook.ts:36-37`, by design — to avoid clobbering the local player's own in-flight optimistic turn state).
  - `GameBoardContextType` (`game-board.types.ts:85-112`) exposes only `gameState: gameStateForDisplay` — the possibly-buffered state — with no raw/live `serverGameState` field at all.
  - `ConnectionWarningDialog.hook.ts:35` reads `localPlayer.lastSeenAt` via `useGameBoard()`, which during the player's own turn is the frozen buffered value, not the live Firestore value the automatic heartbeat (`useHeartbeat`, every 15s) and the forced "I'm back" write (`writeHeartbeat`) both actually update.
  - Consequence 1 (false positive): during the player's own turn, their buffered `lastSeenAt` never advances, so ~25s (`WARNING_THRESHOLD_MS`) after turn start the dialog opens regardless of real activity.
  - Consequence 2 ("I'm back" does nothing): the button's forced `writeHeartbeat` call succeeds against the live document, but the dialog's `isOpen` is computed from the buffered `lastSeenAt`, which that write never touches — so the dialog can never close during the player's own turn.
- Risk signal: yes — this is a multiplayer-sync/Firestore-timing interaction between two independently-shipped features (`a030e17` connection warning, `5d82f0a` turn buffer), not a simple one-file typo. The fix must not reopen the bug `5d82f0a` itself fixed (out-of-band seat changes invisible to the turn-holder) or regress the optimistic-update protection the buffer exists for.
- No visible-UI signal beyond existing states: this is a correctness fix to when the dialog opens/closes, not a new state, copy, or interaction — no `ui-designer` stage needed.
- Bug ordering per the tier table: `tester-a` runs right after the architects to write the failing reproduction test (the dialog incorrectly opening/staying open during the player's own turn) before `implementer-a`/`implementer-b` fix it.

## Scope
- In: giving `ConnectionWarningDialog` (and only the presence/heartbeat check, not general game logic) access to the live, unbuffered `lastSeenAt`/`isBot`/`status` for the local player, so both the auto-open and the "I'm back" close work correctly regardless of whose turn it is. Likely shape: expose `serverGameState` (already a prop into `useGameBoardProvider`, `game-board.hook.ts:17`) on `GameBoardContextType`, and have the dialog's hook look its own player up there by `playerId` rather than trusting the context's (possibly buffered) `localPlayer`/`gameState` — architect-a's call to confirm/refine.
- In: a regression test proving the dialog does NOT open during the player's own turn when real heartbeats are landing, and DOES close (via the "I'm back" path) during the player's own turn once a forced heartbeat succeeds.
- In: updating `docs/architecture/systems-and-visuals.md` §6.14 if the fix changes which state the dialog reads from (currently undocumented which `gameState` the hook reads).
- Out: no change to `withSyncedSeatManagement`'s own behavior or the turn-buffer's exclusion of the local seat for game-logic fields — that exclusion is correct and intentional for everything except this one presence check.
- Out: no change to `WARNING_THRESHOLD_MS`, `STALE_THRESHOLD_MS`, `STALENESS_CHECK_INTERVAL_MS`, or `HEARTBEAT_INTERVAL_MS`.

## Open questions
- None — root cause is verified against the actual code, not hypothesized; architect-a confirms and designs the exact fix.
