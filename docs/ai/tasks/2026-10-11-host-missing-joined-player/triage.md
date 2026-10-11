# Triage: Host never sees a player join the match

Request: When a player creates a match and another player joins, the host never sees the joining player appear, so the match cannot start.
Type: bug
Tier: M
Pipeline: architect-a architect-b tester-a implementer-a tester-b docs-sync architect-b:final-review
Overrides: implementer-a=sonnet
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Root cause already located by investigation (Explore agent, this session): `src/modules/game-board/game-board.engine.hook.ts:83-88` (`isMyTurn`) and `src/modules/game-board/game-board.state.hook.ts:17-31` (local-state freeze effect).
- `isMyTurn` has no `gameState.status === 'playing'` check. The host is always seat 0 and non-bot, so `isMyTurn` is `true` from match creation onward, including during `GameStatus.Waiting`.
- Because `isMyTurn` is true, `game-board.state.hook.ts` clones `serverGameState` into `localGameState` once at mount and never refreshes it (refresh guard requires `!localGameState`, already false after the first clone). `gameStateForDisplay` stays pinned to that stale one-player snapshot for the host.
- Every consumer of `GameBoardContext.gameState` reads the frozen value, notably `src/modules/hud/components/GameBoardHeader/GameBoardHeader.map.ts:13` (`canStartGame = status === 'waiting' && isHost && players.length > 1`) — `players.length` never updates past 1 for the host, so "Start Game" never unlocks.
- The join write itself is correct: `src/modules/lobby/services/lobby.service.ts:77-110` (`joinOpenGame`) transactionally appends the player to `games/{gameId}.players[]` via `src/modules/game-rules/player-join.reducer.ts`, and the host's Firestore subscription (`game-board.engine.service.ts` via `game-board.engine.hook.ts:37-56`) does receive the updated snapshot — the bug is purely in client-side state derivation (`localGameState` vs `serverGameState`), not in Firestore paths or security rules.
- This is a client-state bug in `src/modules/game-board` (not a one-file tweak): fixing it correctly means gating the in-turn optimistic-buffering optimization (documented intentional behavior, `docs/architecture/systems-and-visuals.md:67`, "In-Memory Turn Buffering") so it only applies once `status === 'playing'`, without breaking that optimization for actual turns. Needs an architect pass to pick the exact gating point (in `isMyTurn` itself vs. in the state hook) and a tester to capture the regression before it's fixed.
- Documented behavior is affected (`docs/architecture/systems-and-visuals.md:67` describes the local buffering mechanism) — `docs-sync` is mandatory per project rules even though this is a bug fix, since the fix narrows that documented mechanism's scope.
- Not user-visible beyond the lobby/start-game screen already covered by this flow — no new UI, so no `ui-designer-*` or `preview-*` stages needed.
- Not a gameplay/balance change — no `game-designer-*` stages needed.

## Scope
- In: gate the local optimistic-state buffering (`isMyTurn` and/or the clone effect in `game-board.state.hook.ts`) so the host's displayed `gameState` tracks live `serverGameState` while `status === 'waiting'`, and only switches to the buffered `localGameState` once `status === 'playing'`.
- In: a failing regression test reproducing "host does not see joined player / Start Game stays disabled" before the fix, made to pass after.
- In: update `docs/architecture/systems-and-visuals.md`'s "In-Memory Turn Buffering" section to state the buffering only applies once the match is `playing`.
- Out: any change to the join-write transaction, Firestore security rules, or the lobby's open-games list (`src/modules/lobby/*`) — those are already correct per investigation.
- Out: any change to turn-buffering behavior during actual gameplay (`status === 'playing'`).

## Open questions
- none
