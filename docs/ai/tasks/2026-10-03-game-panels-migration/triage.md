# Triage: Migrate game panels to src/modules

Request: Move `src/features/game/panels/ActionsPanel.tsx`, `PlayerInfo.tsx`, `GameLog.tsx` into `src/modules/<domain>/` per the component-architecture standard (row #5 of `docs/ai/refactor.md`). Depends on #1 and #3 (both done).
Type: refactor
Tier: M
Pipeline: architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b architect-b:final-review
Overrides: none
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Files touched (verified): [src/features/game/panels/ActionsPanel.tsx](../../../../src/features/game/panels/ActionsPanel.tsx) (308 lines), [src/features/game/panels/PlayerInfo.tsx](../../../../src/features/game/panels/PlayerInfo.tsx) (256 lines), [src/features/game/panels/GameLog.tsx](../../../../src/features/game/panels/GameLog.tsx) (32 lines) — view layer only, no `firebase`, `Math.random` or `Date.now` usage in any of the three.
- `ActionsPanel.tsx` and `PlayerInfo.tsx` both exceed the 150-line `max-lines` cap (`eslint.config.mjs:73`) that applies once they leave `LEGACY_PATHS` — each needs splitting across the component-architecture file types (view/.hook.ts/.styles.ts/.map.ts or .types.ts), not a straight move. `GameLog.tsx` is small enough to stay close to a single file.
- Call sites (grep across `src e2e docs scripts .claude CLAUDE.md`): `ActionsPanel` referenced in `GameBoard.tsx` + docs; `PlayerInfo` referenced in `GameBoard.tsx`, `PlayerInfoBar.tsx`, `e2e/gameplay.spec.ts` + docs; `GameLog` referenced in `GameBoard.tsx` + docs. All import sites must be repointed.
- No gameplay/rule changes, no Firestore shape changes, no new visible UI — behavior and visuals must stay identical. This mirrors row #3's shape (`2026-10-03-migrate-dialog-components`, tier M, 3 phases for 877 LOC across 3 files); row #5 is smaller (596 LOC) and fits one phase.
- Risk: `ActionsPanel` and `PlayerInfo` are consumed by `GameBoard.tsx` on every turn and `PlayerInfo` also by the e2e gameplay spec — architect planning and preview verification are warranted even though no gameplay changes, to keep the split behaviorally identical.

## Scope
- In: moving/splitting the 3 named panels into `src/modules/<domain>/` per component-architecture, preserving exact current behavior and visuals; updating import sites in `GameBoard.tsx` and `PlayerInfoBar.tsx`; testbed previews for each; updating `e2e/gameplay.spec.ts` import if it references the panel path directly.
- Out: any change to panel content, copy, layout, or the data/state the panels read (no `GameState` or Firestore shape changes). `PlayerInfoBar.tsx` itself is out of scope (row #7) except for its import of `PlayerInfo`.

## Open questions
- none
