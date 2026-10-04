# Progress: Migrate game effects to src/modules

Tier: S · Phases: 1

## Phase 1: Migrate TutorialBeacon.tsx and useTurnTimer.ts
- [x] implementation (implementer-a)
- [x] tests (tester-a)
- [x] checks: typecheck, lint, unit tests
- [x] coordinator review (no architect-b at this tier)
- [x] committed: c6759e8

## Log
- 2026-10-04 implementer-a: DONE. `TutorialBeacon` → `src/modules/hud/components/TutorialBeacon/` (view + types + styles + preview + test + index), `useTurnTimer` → `src/modules/game-board/turn-timer.hook.ts`. Repointed 3 call sites (`GameBoard.tsx`, `PlayerInfoBar.tsx`, `game-board.hook.ts`). Deleted old files. `npm run typecheck`/`lint`/`test`/`build` all pass (1462 tests).
- 2026-10-04 tester-a: DONE. Expanded `TutorialBeacon.test.tsx` 5→19 cases; wrote new `turn-timer.hook.test.ts` (23 cases, fake timers). `npm test` → 147 suites / 1499 tests passed. `npm run typecheck`/`lint` pass.
- 2026-10-04 coordinator: reviewed diff, no architect-b at this tier. Updated `docs/README.md` (hud/game-board module descriptions, removed stale "PlayerInfoBar stays at legacy path pending TutorialBeacon migration" note since both its JSX children are now migrated).

## Review (coordinator, no architect-b at tier S)
VERDICT: APPROVED. Both files moved per `component-architecture` conventions (TutorialBeacon as full view/types/styles/preview/test split; turn-timer as a flat hook file matching other game-board hooks). All 3 call sites repointed, old files deleted, no behavior/visual change. Checks: typecheck clean, lint clean, 147 suites/1499 tests passing, production build compiles.

## Checks
- `npm run typecheck` → no errors
- `npm run lint` → no problems
- `npm test` → Test Suites: 147 passed, 147 total; Tests: 1499 passed, 1499 total
- `npm run build` → compiled successfully
