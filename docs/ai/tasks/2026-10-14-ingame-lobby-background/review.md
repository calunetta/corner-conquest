# Final review: In-game lobby-style background + toggle, phase 1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no errors.
- `npm run lint` (full repo): fails, but entirely on pre-existing noise unrelated to this task — `.claude/worktrees/**` (other sandboxes' full repo copies, not excluded by `IGNORED_PATHS`) and stale `.next` build artifacts nested inside those worktrees. Scoped instead: `npx eslint src/modules/shared/sky-gradient.ts src/modules/shared/board-background-store.ts src/modules/shared/use-board-background.ts src/modules/shared/board-background-store.test.ts src/modules/shared/use-board-background.test.ts src/modules/shared/index.ts src/modules/lobby/components/LobbyBackground/LobbyBackground.styles.ts --max-warnings 0` → no output, clean.
- `npm test` (full repo): same worktree-noise problem, plus pre-existing unrelated failures in `src/modules/map/components/{TileResources,TileOccupants,TileForest}` and `src/modules/map/island-tile-slots.test.ts` (uncommitted changes from a different in-progress task per `git status`, not touched by this plan). Scoped instead: `npx jest src/modules/shared src/modules/lobby/components/LobbyBackground` → `Test Suites: 83 passed, 83 total`, `Tests: 779 passed, 779 total`.
- ui-verify: not applicable to phase 1 — no view changes (store/hook/constant only); the toggle UI lands in phase 2.

## Plan adherence
Phase 1 is groundwork only; none of the 6 top-level acceptance criteria are meant to be observable yet (the toggle and board wiring are phase 2). Checked against phase 1's own scope instead:
- `SKY_GRADIENT_CLASS` extracted to `src/modules/shared/sky-gradient.ts:2` and is the single source of the gradient literal — repo-wide grep for the gradient's first stop (`180deg,#2a1b3d`) finds only this file; `LobbyBackground.styles.ts:5` now interpolates it. Met.
- Store (`board-background-store.ts`) and hook (`use-board-background.ts`) match the contract's function signatures and the `toast-store.ts`/`use-toast.ts` listener-array shape exactly (`src/modules/shared/board-background-store.ts:1-59`, `use-board-background.ts:1-28`). Met.
- `hydrateBoardBackgroundFromStorage` hydrates once per module load via `isHydrated` flag (`board-background-store.ts:11,30-31`), guarding the two-call-site risk the plan flagged. Met, and covered by `board-background-store.test.ts:157-190`'s "reads storage only once" and "does not notify a second time" cases.
- `src/modules/shared/index.ts` exports both new symbols (confirmed in diff). Met.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| — | — | None found. | — | — |

## Docs
- `docs-sync`: not run — scheduled for phase 2 per `plan.md`'s File plan (`docs/architecture/structure-and-state.md` edit is listed under phase 2, which also adds the `GameBoard.tsx` wiring the doc sentence needs to describe).
