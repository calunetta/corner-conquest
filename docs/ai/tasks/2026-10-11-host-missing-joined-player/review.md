# Final review: Host never sees a player join the match, phase 1/1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no output (exit 0).
- `npx eslint src/modules/game-board/game-board.engine.hook.ts src/modules/game-board/game-board.engine.hook.test.ts src/modules/game-board/game-board.state.hook.ts src/modules/game-board/game-board.state.hook.test.ts`: no output, clean. (`npm run lint` repo-wide surfaces ~15.5k pre-existing errors, all under `.claude/worktrees/inspiring-kare-ee7f7f/` — an untracked stale worktree, not part of this task's diff; none of its errors are in a path this task touches.)
- `npx jest src/modules/game-board`: `Test Suites: 13 passed, 13 total` / `Tests: 205 passed, 205 total`.
- `npx jest --testPathIgnorePatterns='/node_modules/' '/e2e/' 'firestore.rules.test.ts' 'src/features/game/context/__tests__/test-utils/' '.agents/' '.claude/worktrees/'` (repo-wide, excluding the stale worktree): `Test Suites: 192 passed, 192 total` / `Tests: 2271 passed, 2271 total`. Matches tester-b's reported 2271/2271. Confirmed by running `npm test` unfiltered first: it drags in the worktree's own `e2e/` and `src/` copies (including a broken `playwright-core` require) and fails 578/4427 — none of those failures touch this task's files, all live under `.claude/worktrees/inspiring-kare-ee7f7f/`. The exclusion testers used is legitimate, not a cover for a real regression.
- ui-verify: not run — no `.tsx`/view/preview file in the File plan or the actual diff (confirmed by `git status`/`git diff`); plan's "Preview states: None" is accurate.

## Plan adherence
- Acceptance criterion 1 (host sees `players.length` grow live while `'waiting'`): met. `game-board.engine.hook.ts:85-86` gates `isMyTurn` false whenever `gameState.status !== GameStatus.Playing`; with `isMyTurn` false throughout `'waiting'`, `game-board.state.hook.ts`'s clone effect (lines 25-31, unedited as planned) never populates `localGameState`, so `gameStateForDisplay` (line 18) falls through to live `serverGameState` on every render. Covered by `game-board.state.hook.test.ts:56-71` (`'tracks each new serverGameState live...'`, asserts `gameStateForDisplay` updates from 1 to 2 players across a rerender).
- Acceptance criterion 2 (turn buffering unchanged once `'playing'`): met. `game-board.state.hook.test.ts:75-99` cover both the clone-on-turn-start and clear-on-turn-end paths with `status: 'playing'`; `game-board.engine.hook.test.ts` existing cases (`'calculates isMyTurn correctly'`, `'is false during a deferred reclaim...'`) use the fixture's default `status: 'playing'` and still pass.
- Acceptance criterion 3 (regression test fails before, passes after): met per `progress.md` log — tester-a added the failing-first test, implementer-a's fix turned it green; re-verified in this session (205/205 including the three new `isMyTurn` cases in `game-board.engine.hook.test.ts:346-411` and both `game-board.state.hook.test.ts` cases).

## Diff vs plan
- `src/modules/game-board/game-board.engine.hook.ts`: matches the plan's Contracts block exactly — `GameStatus` import added, `if (gameState.status !== GameStatus.Playing) return false;` inserted, deps array becomes `[gameState, currentPlayer, localPlayer]`. No other line changed.
- `src/modules/game-board/game-board.engine.hook.test.ts`: three new tests (`'is false for the host while the match is waiting...'`, `'is false for the host once the match is finished'`, `'becomes true for the host when the match moves from waiting to playing...'`) — the first two are exactly tester-a's planned case; the finished-state and waiting-to-playing-transition cases are a reasonable addition beyond the plan's minimum, not scope creep (they test the same `isMyTurn` memo the plan already put in scope).
- `src/modules/game-board/game-board.state.hook.test.ts`: new file, matches the plan's Test plan Case A and Case B precisely (`describe('when it is not the local player turn')` / `describe('when it is the local player turn')`).
- `docs/architecture/systems-and-visuals.md`: the "In-Memory Turn Buffering" bullet at line 67 is edited in place, now states the buffering only applies while `status === 'playing'` and `isMyTurn`, names the gating hook and the clone site, and adds a sentence that the lobby always shows live `serverGameState`. Matches the plan's docs-sync instruction; no other doc line touched.
- No file outside the plan's File plan was touched (`git status` confirms only these four tracked files plus the new test file and the task-folder files already accounted for).

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|

None.

## Docs
- `docs-sync`: ran, updated `docs/architecture/systems-and-visuals.md` §6.10 ("Hook Architecture & Firestore Economics" → "In-Memory Turn Buffering" bullet, line 67).
