# Final review: Stop heartbeat writes from colliding with game-state writes, phase 1/2

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: fails, but every error is scoped exactly to Phase 2's untouched consumer files (`ConnectionWarningDialog.hook.ts`/`.hook.test.ts`, `game-board.staleness.hook.ts`/`.hook.test.ts`, `game-board.state.hook.test.ts`, `game-board.state.map.ts`/`.map.test.ts`, `TileBoats.test.tsx`, `TileResources.test.tsx`) — all `Property 'lastSeenAt' does not exist on type 'Player'` / `'lastSeenAt' does not exist in type 'Partial<Player>'`. None of these are Phase 1-owned files. This matches plan.md's explicit prediction in Phase 1 step 6.
- `npm run lint` (scoped to the 11 Phase 1 files, `npx eslint <files> --max-warnings 0`): `✖ 2 problems (0 errors, 2 warnings)` — both warnings are "File ignored because of a matching ignore pattern" for `src/lib/types/player.ts` and `game.ts` (legacy-path ESLint exemption, pre-existing). Zero errors. (Full-repo `npm run lint` surfaces ~23.5k pre-existing errors from `.claude/worktrees/*`, untracked stale checkouts from unrelated prior tasks, not part of this diff or the File plan — confirmed via `git status --porcelain .claude/worktrees` returning nothing, i.e. untracked/ignored by git.)
- `npm test` scoped to `src/` only, excluding the untracked `.claude/worktrees` pollution (`npx jest --roots='<rootDir>/src' --testPathIgnorePatterns='/node_modules/' --testPathIgnorePatterns='/\.claude/' --testPathIgnorePatterns='src/features/game/context/__tests__/test-utils/'`): `Test Suites: 201 passed, 201 total` / `Tests: 2611 passed, 2611 total`. The Phase 2 type errors above are TS-only (jest uses babel, no type-check), so they don't fail at runtime yet — consistent with "expected, temporary red state" called out in plan.md.
- Also ran the 4 files named in plan.md Phase 1 step 6 directly: `npx jest src/modules/game-board/services/game-board.engine.service.test.ts src/modules/game-rules/services/player-exit.service.test.ts src/modules/game-board/game-board.engine.hook.test.ts src/modules/game-board/game-board.heartbeat.hook.test.ts` → `Tests: 696 passed, 696 total`.
- ui-verify: not applicable — no `.tsx`/`.styles.ts` changes in this phase (plan.md "Preview states: None"), confirmed by `git diff --stat` showing no view files touched.

## Plan adherence
Diffed every Phase 1 file plan entry against `git diff` and the Contracts section in plan.md:
- `src/lib/types/player.ts`: `lastSeenAt` field and its doc comment removed — matches.
- `src/lib/types/game.ts`: `heartbeats: Partial<Record<number, number>>` added with the exact doc comment from the Contracts block — matches.
- `src/modules/game-board/services/game-board.engine.service.ts`: `writeHeartbeat` rewritten as `updateDoc(gameDocRef, { [\`heartbeats.${playerIndex}\`]: Date.now() })`; `runTransaction` import dropped — matches the Contracts block byte-for-byte.
- `src/modules/game-rules/game-setup.reducer.ts`: `heartbeats: {}` added to the `initializeGame` literal — matches.
- `src/modules/game-rules/player-factory.ts`: `lastSeenAt: null` removed from `createPlayer` — matches.
- `src/modules/game-rules/services/player-exit.service.ts`: `convertSeatToBot` now does `delete state.heartbeats[playerIndex]` instead of `seat.lastSeenAt = null` — matches the Contracts block exactly.
- `src/modules/hud/components/PlayerInfo/PlayerInfo.fixtures.ts`: `lastSeenAt: null` removed from `samplePlayer` — matches.
- `game-board.engine.service.test.ts`: `writeHeartbeat` describe block rewritten for the `updateDoc` call shape, asserts `runTransaction` is never called (dropped the mock/import), asserts `setDoc` is never called, keeps a rejection-propagation test — matches and is a faithful behavioral translation, not weakened (drops cases that no longer apply, e.g. "document doesn't exist" and "index out of range", because a single-field-path `updateDoc` has no document-shape awareness to test).
- `player-exit.service.test.ts`: all 3 `lastSeenAt`-based assertions converted to `heartbeats`; a new test "leaves other seats' heartbeat entries untouched when one seat is converted" was added, matching the Test plan's explicit "leaves other seats' entries untouched" requirement.
- `game-board.engine.hook.test.ts` / `game-board.heartbeat.hook.test.ts`: mechanical `lastSeenAt: null` removal from fixtures, no assertion changes — matches.

Acceptance criteria (plan.md lines 7-11), scoped to what Phase 1 covers:
- `writeHeartbeat` is a single-field-path `updateDoc`, no `runTransaction` — met (`game-board.engine.service.ts`).
- `lastSeenAt` removed from `Player`, `GameState.heartbeats` added — met.
- Staleness/connection-warning/turn-buffer-sync/`convertSeatToBot` behavior preserved — `convertSeatToBot`'s clearing behavior is met and tested in this phase; staleness/connection-warning/turn-buffer-sync consumers are explicitly Phase 2 scope, correctly not yet touched.
- typecheck/lint/test passing — lint and the Phase-1-scoped tests pass; typecheck is in the plan-acknowledged temporary red state until Phase 2.
- docs-sync — scheduled for Phase 2, not yet due.

## Findings
No findings in the Phase 1 File plan scope.

One out-of-scope item, not a Phase 1 defect: `e2e/bot-vs-bot-ui.spec.ts` is modified in the working tree (un-skips `test.describe('Bot-vs-bot self-play through the real UI', ...)`, removing a `.skip` and its explanatory comment referencing a separate unresolved task `docs/ai/tasks/2026-10-13-bot-ui-position-stall`). This change predates this task (present in the session's initial `git status` before any heartbeat-fix work started) and is not in plan.md's File plan. It must not be swept into this task's Phase 1 commit — stage only the 12 files plan.md lists as Phase 1 owners.

## Docs
- `docs-sync`: not needed yet — scheduled for Phase 2 (`docs/architecture/systems-and-visuals.md`), which only makes sense once the consumer-facing behavior (staleness, connection warning, seat sync) is updated in Phase 2.
