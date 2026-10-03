# Final review: Migrate game rules core logic into src/modules/game-rules, phase 3/4

VERDICT: APPROVED

## Out-of-band event (not a build defect)
A concurrent sibling session (unrelated cards-dialog migration task) committed the deletions of
`src/lib/game-logic.ts` and `src/lib/turn-progression.ts` as part of its own commit `2a396f1`
("refactor(cards): migrate SabotageDialog, WealthyDialog, StealResourceDialog to src/modules
[phase 2/5]") before this task's Phase 3 could commit them itself. Verified via
`git show 2a396f1 --stat`: both files appear as `D` in that diff, alongside that unrelated task's
own dialog moves. This task's new module files
(`src/modules/game-rules/player-join.reducer.ts`, `src/modules/game-rules/turn-progression.ts`)
were already created from the legacy files' content before the sweep, so nothing is lost — but
there is no separate "delete" step left for this phase to perform, and the deletion's commit hash
belongs to an unrelated task. Recorded here for traceability, not routed to any builder as a fix.

## Checks run (this session)
- `npx tsc --noEmit`: errors only in untracked `src/modules/map/components/{AnimatedMonster,
  DeathEffect,IslandTile,TileBoats}/*.test.ts(x)` — confirmed via `git status --porcelain` (`??`),
  belonging to the concurrent `game-map-migration` task. Zero errors in any file this phase
  touches or created.
- `npx eslint src/modules/game-board/game-board.hook.ts src/modules/game-rules/player-join.reducer.ts src/modules/game-rules/turn-progression.ts src/modules/game-rules/player-join.reducer.test.ts src/modules/game-rules/turn-progression.test.ts src/modules/game-rules/index.ts`:
  no output, exit 0.
- `npm run lint` (repo-wide): `35 problems (35 errors, 0 warnings)`, all in untracked
  `src/modules/combat/components/AttackSelectionDialog/AttackSelectionDialog.tsx` and
  `src/modules/map/components/*` test files — confirmed `??` in `git status`, zero hits for
  "game-rules" or any file this phase owns.
- `npx jest src/modules/game-rules src/features/lobby src/features/game/context src/modules/game-board`:
  `Test Suites: 25 passed, 25 total` / `Tests: 296 passed, 296 total`.
- `npm test` (full repo, informational): `Test Suites: 1 failed, 125 passed, 126 total` /
  `Tests: 14 failed, 1252 passed, 1266 total` — the one failing suite is
  `src/modules/map/components/IslandTile/IslandTile.test.tsx`, untracked, concurrent
  `game-map-migration` task (`TypeError: Cannot destructure property 'possibleMoves' of 'uiState'
  as it is undefined` — unrelated fixture/mock shape issue in that task's own file). Not this
  phase's scope.
- `git grep -n "@/lib/game-logic\|@/lib/turn-progression"` across the whole repo (tracked +
  untracked via plain `grep -rn` over `src e2e scripts docs .claude`): zero hits anywhere.
  Confirms the acceptance criterion "no file imports from any of the six deleted legacy paths"
  for these two files.

## Plan adherence
- `src/modules/game-rules/player-join.reducer.ts` (86 lines) and
  `src/modules/game-rules/turn-progression.ts` (104 lines): both under the 150-line cap, as the
  plan predicted ("no split needed"). Met.
- Body comparison against `git show 2a396f1~1:src/lib/game-logic.ts` and
  `git show 2a396f1~1:src/lib/turn-progression.ts` (the pre-deletion legacy content): both new
  files are byte-identical to the originals except import repoints (now relative to
  `./player-data`, `./player-factory`, `./movement.reducer` instead of `@/lib/...`/
  `@/modules/game-rules`) and one trivial, behavior-neutral change:
  `player-join.reducer.ts:25` uses `const newGameState = ...` where the original used
  `let newGameState = ...`. The variable is never reassigned in either version, so this is a
  no-op correctness-preserving tweak (likely a `prefer-const` lint autofix), not a body change.
  Non-blocking.
- `turn-progression.ts:18`'s `hasActiveDialogOrPendingAction: boolean = false` matches the
  original legacy file exactly. The plan's own Contracts section (`plan.md:234`) describes it as
  `?: boolean`, but the Verified context (`plan.md:19`) and the actual legacy source both show a
  default value, not an optional-without-default signature — the contract's shorthand was
  imprecise, not the implementation. Functionally equivalent (`boolean = false` makes the
  parameter optional with the same default as `?: boolean` would via `undefined` coalescing
  through the function's own falsy checks). No fix needed; same conclusion the implementers
  already reached cross-reviewing each other.
- `index.ts` adds exactly the two export lines the plan specifies
  (`plan.md:126`): `export { addPlayerToGame, BASE_TILE_SIZE } from './player-join.reducer';` and
  `export { hasPlayerRemainingActions } from './turn-progression';` — present at
  `src/modules/game-rules/index.ts:5-6`. No unplanned exports added (lesson from Phase 2's review
  applied correctly this time).
- `player-join.reducer.test.ts`: 9 cases covering full-game, color-exhausted, already-joined,
  status-not-Waiting, last-seat-fills-game, seats-remain, distinct-colors, and base-tile-placement
  branches — matches the Test plan's named branches (`plan.md:309`) plus extra coverage, all using
  the real `initializeGame`/`startGame`/`addPlayerToGame` reducers per the testing skill's
  fixture-building guidance.
- `turn-progression.test.ts`: the one ported case, assertions verified byte-identical to
  `git show 2a396f1~1:src/lib/__tests__/turn-progression.test.ts`'s test body (same setup,
  same three assertions in the same order).
- Call-site repoints verified via `git diff` for all files in Phase 3's File plan: `Lobby.tsx`
  (merged into the single `@/modules/game-rules` import, consistent with the module's existing
  pattern), `game-board.hook.ts`, both `GameBoardContext*.characterization.test.tsx` (mock path
  updated, `hasPlayerRemainingActions` added to the shared `@/modules/game-rules` mock factory),
  `gameBoardTestKit.tsx` docstring, and all 10 `game-rules/*.test.ts` + `player-exit.service.test.ts`
  fixture-import repoints (`addPlayerToGame` now imported from `@/modules/game-rules` instead of
  `@/lib/game-logic`). All present and correct.
- `src/lib/game-logic.ts`, `src/lib/turn-progression.ts`,
  `src/lib/__tests__/turn-progression.test.ts` confirmed deleted (via `git show 2a396f1 --stat`
  and `ls` — absent from disk). See "Out-of-band event" above for why no separate delete step
  landed in this phase's own commit.
- `bot-logic.test.ts` line 134 of the plan, flagged as "no change" for this phase: confirmed —
  `src/lib/__tests__/bot-logic.test.ts` does not import `game-logic` (grep confirms), so no edit
  was needed here; it is untouched in this phase's diff.

## Findings
None blocking. One cosmetic note already surfaced by the implementers' cross-review
(`turn-progression.ts` using `boolean = false` instead of the Contracts section's `?: boolean`
shorthand) — confirmed functionally equivalent and in fact the byte-accurate choice matching the
legacy source; no action needed.

## Docs
- `docs/README.md`: not updated — correct per plan, scheduled for Phase 4 (`plan.md:13,162`).

## progress.md
Phase 3 boxes ticked after independent re-verification in this session: plan approved (already
APPROVED from architect-b's original sign-off), implementation, tests, checks, final review.
Previews/UI-verify stay unticked — not applicable, per plan (no UI change).
