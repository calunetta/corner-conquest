# Final review: Special island card reveal, phase 1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no output (tsc --noEmit exits 0).
- `npm run lint`: whole-repo invocation (`eslint .`) reports 23781 problems, but every one of them is in files outside this task's scope — legacy test scaffolding under `.claude/worktrees/*` (other agents' parallel swarm worktrees) and pre-existing `src/lib/types/*.ts` / `tailwind.config.ts` import-style warnings. Scoped run on exactly the 17 files this phase touches: `npx eslint <phase-1 files> --max-warnings 0` → `4 problems (0 errors, 4 warnings)`, and all 4 warnings are "File ignored because of a matching ignore pattern" (the `LEGACY_PATHS`-exempt `src/lib/types/*.ts` files), not real lint errors. Zero lint errors in this phase's files.
- `npm test`: scoped run on the 7 touched test files → `Test Suites: 49 passed, 49 total`, `Tests: 974 passed, 974 total`. Full-repo `npm test` fails (181 suites) but every failure is either under `.claude/worktrees/*` (other agents' isolated worktrees, picked up because jest has no ignore pattern for them) or in files this task never touches (`TileForest`, `TileResources`, `TileOccupants`, `island-tile-slots`, `firestore.rules.test.ts`, `.agents/skills/*`) — confirmed by `npx jest --testPathIgnorePatterns='/node_modules/' '/\.claude/worktrees/' '/e2e/'` and diffing the failing suite list against this phase's File plan; none overlap.
- ui-verify: not applicable to phase 1 (no rendering changes; `IslandTile`/`CardRevealEffect` work is phase 2).

## Plan adherence
- `CardRevealAnimation` type, `GameState.cardRevealAnimations`, `SpecialIslandRollDialogState.x/y` — added exactly per contract (`src/lib/types/cards.ts`, `game.ts`, `dialogs.ts`).
- `revealIsland` push point — `island-discovery.reducer.ts:64-65`, inside the card-drawn branch only; `isScout`/hand-full/empty-deck branches push nothing, confirmed by reducer tests.
- `handleRollOnSpecialIsland` — signature changed to `payload?: { roll?: number; x: number; y: number }` (`card-acquisition.reducer.ts:90-93`); push point inside the `roll === 3 || 6` branch only (`:126-134`); no-payload/no-card/hand-full/empty-deck branches push nothing, confirmed by tests including the "no payload at all" case.
- `game-setup.reducer.ts` initializes `cardRevealAnimations: []`; `player-turn.reducer.ts` adds `REVEAL_ANIMATION_DURATION_MS = 1400` and filters stale entries in `handleEndTurn`, mirroring `deathAnimations` exactly.
- `tile-click.hook.ts:84` and `GameDialogManager.tsx:138-142` thread `x`/`y` through the dialog state and the dispatched action payload, matching the contract pseudocode verbatim.
- `clearCardRevealAnimations` added to `game-board.engine.service.ts`, mirroring `clearDeathAnimations`'s body shape; service tests cover empty array, success, error propagation, id/createdAt preservation.
- Engine-side scheduled clear: present and working, verified end-to-end through `useGameEngine` (scheduling, de-duplication, session-driver-only clearing) — see Findings for the one file-plan deviation.
- `board-context.fixtures.ts` and `SpecialIslandRollDialog.fixtures.ts` updated with the new field/coords as planned.
- All six pre-existing `handleRollOnSpecialIsland` call sites in tests updated (`card-acquisition.reducer.test.ts` ×5, `game-rules.reducer.test.ts:273`); `game-board.map.test.ts:86,152` dialog literals updated. Repo-wide grep confirms no remaining call site passes a payload without `x`/`y`.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `src/modules/game-board/game-board.animation-cleanup.hook.ts` (new, untracked) | Not listed in plan.md's File plan, which specified editing the scheduled-clear effect in place inside `game-board.engine.hook.ts`. Implementer-a instead extracted both the existing death-animation effect and the new card-reveal effect into a new sibling hook file. Code itself is correct (verified line-by-line against `git show HEAD:src/modules/game-board/game-board.engine.hook.ts`: the death-animation effect body is unchanged, just moved; the card-reveal effect is a faithful mirror), well-isolated, and exercised indirectly through `useGameEngine`'s existing and new tests (974 passing, including the two new card-reveal scheduling tests and the session-driver test). Not a functional defect. | implementer-a (for plan.md record-keeping; no code change needed) | No — approved as-is. Add one line to plan.md's File plan on the next edit to this task folder so the record matches the repo. |
| 2 | `src/modules/game-board/game-board.tile-click.hook.ts:75-76` | Stray `console.error('[DEBUG tileClick]', ...)` and a `// TEMP DEBUG` comment sit immediately above this phase's edit at `:84`. Pre-existing (already flagged in plan.md's architect-b review before implementation, confirmed again this session — these lines are unrelated to this task, belong to the concurrent `bot-ui-position-stall` task's in-progress working tree). | not this task's owner | No — flagged only so the commit step for this phase doesn't accidentally sweep it in with `git add -A`; stage only this task's File-plan files. |

## Docs
- `docs-sync`: not needed this phase — `docs/architecture/game-mechanics.md` update is scoped to phase 2 (idle art + reveal feedback is only player-visible once `IslandTile` renders it).
