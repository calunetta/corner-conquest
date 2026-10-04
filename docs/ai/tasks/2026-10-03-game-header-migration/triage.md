# Triage: Migrate game header/status to src/modules

Request: Move `src/features/game/components/GameBoardHeader.tsx`, `GameStatusBadge.tsx`, `PlayerInfoBar.tsx` into `src/modules/<domain>/` per the component-architecture standard (row #7 of `docs/ai/refactor.md`). Depends on #1 (done).
Type: refactor
Tier: M
Pipeline: architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b architect-b:final-review
Overrides: none
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Files touched (verified, 3 files / 218 LOC): [GameBoardHeader.tsx](../../../../src/features/game/components/GameBoardHeader.tsx) (50), [GameStatusBadge.tsx](../../../../src/features/game/components/GameStatusBadge.tsx) (45), [PlayerInfoBar.tsx](../../../../src/features/game/components/PlayerInfoBar.tsx) (123) — view layer only, all read `useGameBoard()`; no `firebase`, `Math.random`, or `Date.now` in any of the three. All three stay under the 150-line `max-lines` cap (`eslint.config.mjs:73`), so no splitting is forced by line count.
- Import-boundary question, same shape as row #3's `GameDialogManager.tsx` precedent: `PlayerInfoBar.tsx` imports `PlayerInfo` from `@/features/game/panels/PlayerInfo` (row #5, pending) and `TutorialBeacon` from `./TutorialBeacon` (row #8, pending) — both still legacy paths. A module `.tsx` may not import `@/features/*` per the established rule, so architect-a must decide whether `PlayerInfoBar` stays a thin legacy re-export (like `GameDialogManager.tsx`) or the import moves to a `.hook.ts`, same call row #3's architect made.
- Call sites (grep across `src e2e docs scripts .claude CLAUDE.md`): `GameBoardHeader`, `GameStatusBadge`, `PlayerInfoBar` are each referenced only by `src/features/game/components/GameBoard.tsx` (row #6, pending) plus docs. No e2e or test imports of these three components directly.
- No gameplay/rule changes, no Firestore shape changes, no new visible UI — behavior and visuals must stay identical. Smaller than row #3 (877 LOC/3 files, 3 phases) and row #5 (596 LOC/3 files, 1 phase); fits one phase.
- Risk: `GameBoardHeader` and `PlayerInfoBar` render every turn for every player; the cross-module import-boundary decision (same as row #3) warrants architect planning and preview verification even though no gameplay changes.

## Scope
- In: moving the 3 named files into `src/modules/<domain>/` per component-architecture, preserving exact current behavior and visuals; deciding and implementing the import-boundary approach for `PlayerInfoBar`'s still-legacy `PlayerInfo` and `TutorialBeacon` imports; updating the import site in `GameBoard.tsx`; testbed previews for each.
- Out: any change to header/status/player-bar content, copy, layout, or the data/state read (no `GameState` or Firestore shape changes). Migrating `PlayerInfo` (row #5) or `TutorialBeacon` (row #8) themselves is out of scope — only repointing/re-exporting their imports from this row's files.

## Open questions
- none
