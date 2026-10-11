# Plan: Host never sees a player join the match

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] Host (seat 0, non-bot) sees `players.length` grow live while `gameState.status === 'waiting'`, so "Start Game" unlocks once a second player joins.
- [ ] Turn buffering (local-memory writes during an active turn, `docs/architecture/systems-and-visuals.md:67`) is unchanged once `status === 'playing'`.
- [ ] A regression test reproduces the bug before the fix and passes after.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `isMyTurn` memo | `src/modules/game-board/game-board.engine.hook.ts:83-88` | Root cause: no `status === 'playing'` check, so it's `true` for the host from match creation. |
| `useGameEngine` return shape incl. `isMyTurn` | `src/modules/game-board/game-board.engine.hook.ts:164`, typed `UseGameEngineResult` (`src/modules/game-board/game-board.engine.types.ts`) | Fix changes only this memo's logic, not its signature. |
| Clone-and-freeze effect | `src/modules/game-board/game-board.state.hook.ts:25-31` | Clones `serverGameState` into `localGameState` once `isMyTurn` is true and never re-clones (`!localGameState` guard false after first clone). |
| `gameStateForDisplay` | `src/modules/game-board/game-board.state.hook.ts:18` | `isMyTurn && localGameState ? localGameState : serverGameState` — picks the frozen clone whenever `isMyTurn` is true. |
| `canStartGame` | `src/modules/hud/components/GameBoardHeader/GameBoardHeader.map.ts:13` | `status === 'waiting' && isHost && players.length > 1`; reads the frozen `gameState`, so `players.length` never grows past 1 for the host. |
| `GameBoardStateArgs`, `GameBoardState` | `src/modules/game-board/game-board.hook.types.ts:30-42` | Existing arg/return types for `useGameBoardState`; unchanged by this fix. |
| `GameBoard` renders `ActionsPanel`/dialogs whenever `status !== 'finished'` | `src/features/game/components/GameBoard.tsx:21` | `isMyTurn` already reaches turn-gated UI (`ActionsPanel`, combat/card dialogs — grep confirmed usage in `src/modules/hud/components/ActionsPanel/*`, `src/modules/combat/components/*`) during `'waiting'`, not only during `'playing'`. Gating `isMyTurn` itself, not just the clone effect, also stops those controls from being wrongly live before the match starts. |
| `GameStatus` const + type | `src/lib/types/game.ts:6-11`, re-exported via `src/lib/types/index.ts` | `GameStatus.Playing === 'playing'`. Sibling hooks already import it this way: `src/modules/game-board/game-board.heartbeat.hook.ts:2`, `src/modules/game-board/game-board.staleness.hook.ts:2`. |
| Existing `isMyTurn` tests | `src/modules/game-board/game-board.engine.hook.test.ts:283-344` | `createGameState()` fixture (line ~35) defaults `status: 'playing'`, so these pass unchanged after the fix; new test must explicitly set `status: 'waiting'`. |
| No `game-board.state.hook.test.ts` exists today | checked via `ls src/modules/game-board/*.state.hook*` | New test file, not an edit. |

## Root cause (bugs only)
- Reproduction: host creates a match (seat 0, non-bot, `currentPlayerIndex: 0`, `status: 'waiting'`). `isMyTurn` (`game-board.engine.hook.ts:83-88`) returns `true` because it only checks `currentPlayer.id === localPlayer.id && !currentPlayer.isBot` — no status check. On the next render, `game-board.state.hook.ts:25-31`'s effect sees `isMyTurn: true, serverGameState, !localGameState` and clones `serverGameState` (1 player) into `localGameState`. `gameStateForDisplay` (`game-board.state.hook.ts:18`) then pins to that clone because `isMyTurn` is `true`. The effect's refresh guard (`!localGameState`) is now permanently false, so a second player joining (`serverGameState.players` growing to 2) is never re-cloned. `GameBoardHeader.map.ts:13`'s `canStartGame` reads the frozen `players.length === 1` forever.
- Cause: `isMyTurn` (`game-board.engine.hook.ts:83-88`) has no `gameState.status === 'playing'` gate.

## Decisions
- Fix in `isMyTurn` itself (`game-board.engine.hook.ts`), not only in the clone effect (`game-board.state.hook.ts`), because `isMyTurn` already drives turn-gated controls (`ActionsPanel`, combat/card dialogs) that render whenever `status !== 'finished'` (`GameBoard.tsx:21`) — gating only the clone effect would still leave those controls wrongly live for the host during `'waiting'`.
- Import `GameStatus` from `@/lib/types` and compare `gameState.status === GameStatus.Playing`, matching the convention already used in sibling hooks in this folder (`game-board.heartbeat.hook.ts:2`, `game-board.staleness.hook.ts:2`). Rejected: string literal `'playing'` (works, but inconsistent with the folder's existing pattern).
- No change to `game-board.state.hook.ts`'s clone/freeze logic itself — once `isMyTurn` correctly excludes `'waiting'`, the existing `isMyTurn && localGameState ? localGameState : serverGameState` and the clone effect already do the right thing with no further edit. Rejected: duplicating a status check in the state hook too (would be two sources of truth for the same gate).

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/game-board/game-board.engine.hook.ts` | edit | Gate `isMyTurn` on `gameState.status === GameStatus.Playing` in addition to the existing seat/bot checks | implementer-a (sonnet) |
| `src/modules/game-board/game-board.engine.hook.test.ts` | edit | Add the failing-first regression test for `isMyTurn` during `'waiting'` | tester-a |
| `src/modules/game-board/game-board.state.hook.test.ts` | new | Regression test that `gameStateForDisplay` tracks live `serverGameState` while `isMyTurn` is false, and that the existing buffering clone still happens once `isMyTurn` is true | tester-a |
| `docs/architecture/systems-and-visuals.md` | edit | Narrow the "In-Memory Turn Buffering" bullet (line 67) to state it only applies once `status === 'playing'` | docs-sync |

## Contracts
```ts
// src/modules/game-board/game-board.engine.hook.ts — only this memo's body and deps array change
// (adds `gameState` to the deps array below, since the body now reads `gameState.status`).
// Signature and UseGameEngineResult (game-board.engine.types.ts) are unchanged.
import { GameStatus } from '@/lib/types';

const isMyTurn = useMemo(() => {
  if (!gameState || !currentPlayer || !localPlayer) return false;
  if (gameState.status !== GameStatus.Playing) return false;
  // During a deferred reclaim (reclaimRequested: true), the seat is still isBot until
  // handleEndTurn applies the flip at the turn boundary — must not show live controls until then.
  return currentPlayer.id === localPlayer.id && !currentPlayer.isBot;
}, [gameState, currentPlayer, localPlayer]);
```
No other type, prop or function signature in this task changes. `game-board.state.hook.ts`, `game-board.hook.types.ts`, and `GameBoardHeader.map.ts` are untouched.

## Phases
### Phase 1: gate isMyTurn on match status
1. tester-a: in `game-board.engine.hook.test.ts`, add a test asserting `isMyTurn` is `false` when `status: 'waiting'` even though `currentPlayerIndex` and `localPlayer.id` both point at seat 0 (the host) and the seat is not a bot. Run it and confirm it fails against the current code (`npx jest src/modules/game-board/game-board.engine.hook.test.ts`).
2. implementer-a (sonnet): apply the `isMyTurn` change from the Contracts block in `game-board.engine.hook.ts`. Re-run `npx jest src/modules/game-board/game-board.engine.hook.test.ts` and confirm every test in that file passes, including the new one and the existing `'calculates isMyTurn correctly'` / `'is false during a deferred reclaim'` tests (both use the `createGameState()` fixture's default `status: 'playing'`, so they must still pass unchanged).
3. tester-a: create `game-board.state.hook.test.ts`. Case A: render `useGameBoardState` with `isMyTurn: false` and a `serverGameState` with 1 player; rerender with a `serverGameState` with 2 players (same `isMyTurn: false`); assert `gameStateForDisplay` equals the latest `serverGameState` on each render (never frozen). Case B: render with `isMyTurn: true`; assert `localGameState` becomes a clone of `serverGameState` and `gameStateForDisplay` equals that clone (guards the existing buffering optimization still works once a turn is live).
4. tester-b: no `.tsx`/view file changed by this task (`GameBoardHeader.map.ts` is untouched and its existing `GameBoardHeader.map.test.ts` already covers `canStartGame` with `players.length > 1`). Run `npm test` in full to confirm no other suite broke, and report that explicitly instead of adding new view tests.
5. docs-sync: update `docs/architecture/systems-and-visuals.md:67`'s "In-Memory Turn Buffering" bullet to state the buffering (and the `isMyTurn`-gated local clone) only applies once `gameState.status === 'playing'`, not during `'waiting'`.

Model escalation: step 2 (implementer-a) runs on sonnet per `triage.md` Overrides. All other steps on the default model.

## Test plan
- tester-a (logic, first):
  - `game-board.engine.hook.test.ts`: `isMyTurn` is `false` for the host (seat 0, non-bot, `currentPlayerIndex: 0`) when `status: 'waiting'`.
  - `game-board.engine.hook.test.ts`: existing `'calculates isMyTurn correctly'` and `'is false during a deferred reclaim...'` cases still pass unchanged (status defaults to `'playing'` in `createGameState()`).
  - `game-board.state.hook.test.ts` (new): `gameStateForDisplay` tracks a growing `serverGameState.players` array across rerenders while `isMyTurn` stays `false`.
  - `game-board.state.hook.test.ts` (new): `gameStateForDisplay` still becomes the cloned `localGameState` once `isMyTurn` is `true`, matching the current buffering behavior for active turns.
- tester-b (view and e2e): none planned — no `.tsx`/`.styles.ts` file changes in this task. Run `npm test` full-suite to confirm nothing else regressed; do not add a new spec unless that run surfaces a view-level failure, in which case report it instead of writing around it.

## Preview states
- None — no new or changed component.

## Risks
- Other code may implicitly have relied on `isMyTurn` being `true` during `'waiting'` for the host. Mitigation: `npm test` full-suite run in step 4 catches any other broken suite; grep in Verified context already confirmed the main consumers (`ActionsPanel`, combat/card dialogs) are turn-gated controls that are only correct once `status === 'playing'` anyway.

## Review (architect-b)
VERDICT: APPROVED
- All Verified-context entries checked against the repo and confirmed accurate: `isMyTurn` at `src/modules/game-board/game-board.engine.hook.ts:83-88` (no status check, confirmed), clone effect at `src/modules/game-board/game-board.state.hook.ts:25-31`, `gameStateForDisplay` at line 18, `canStartGame` at `src/modules/hud/components/GameBoardHeader/GameBoardHeader.map.ts:13`, `GameBoard.tsx:21`'s `status !== 'finished'` gate, `GameStatus` const at `src/lib/types/game.ts:6-11` re-exported via `src/lib/types/index.ts:8`, sibling-hook import convention in `game-board.heartbeat.hook.ts:2` and `game-board.staleness.hook.ts:2`, `docs/architecture/systems-and-visuals.md:67`'s "In-Memory Turn Buffering" bullet, and `createGameState()`'s default `status: 'playing'` in `game-board.engine.hook.test.ts:37`. No invented paths.
  - Fix: fixed inline — the Contracts block's header comment contradicted its own code (claimed "deps array shape... unchanged" directly above a deps array that adds `gameState`). Reworded to say the deps array does change and why.
- Design: gating the single `isMyTurn` memo (not duplicating a status check in the state hook) is the right call — it's the one producer that both `game-board.state.hook.ts`'s buffering and the turn-gated UI (`ActionsPanel`, combat/card dialogs, confirmed via grep) already consume, so one gate covers both the reported bug and the dialogs being wrongly live during `'waiting'`. No simpler fix exists: the clone-effect-only alternative considered and correctly rejected in Decisions would leave those dialogs live during `'waiting'`.
  - Traced the actual fix mechanics against `game-board.state.hook.ts`: with `isMyTurn` false throughout `'waiting'`, the clone effect's two branches (`if (isMyTurn && ... && !localGameState)`, `else if (!isMyTurn && localGameState)`) both stay inert since `localGameState` starts and stays `null`, so `gameStateForDisplay` falls through to live `serverGameState` on every render — confirms the fix works without any edit to that file, as the plan claims.
- Scope and contracts are complete for a single implementer (no parallel split needed at tier M); test plan is failing-first per `testing` skill; docs-sync target line is correct; phases are appropriately small (one phase, 5 steps).
- No other blocking findings.
