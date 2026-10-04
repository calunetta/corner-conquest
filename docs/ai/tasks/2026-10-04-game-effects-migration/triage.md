# Triage: Migrate game effects to src/modules

Request: Move `src/features/game/components/TutorialBeacon.tsx` and `src/features/game/hooks/useTurnTimer.ts` into `src/modules/<domain>/` per the component-architecture standard (row #8 of `docs/ai/refactor.md`). Depends on #1 (done).
Type: refactor
Tier: S
Pipeline: implementer-a tester-a
Overrides: none
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Row #8's original file list also named `AnimatedMonster.tsx` and `DeathEffect.tsx`, but both are already migrated — they now live at `src/modules/map/components/AnimatedMonster/` and `.../DeathEffect/` with no remaining references to their old `src/features/game/components/` paths (verified by grep across `src e2e docs .claude CLAUDE.md`). Real remaining scope is just the 2 files below.
- Files touched (verified, 2 files / 141 LOC): [TutorialBeacon.tsx](../../../../src/features/game/components/TutorialBeacon.tsx) (74 lines) — view only, uses `useState`/`useEffect` + `localStorage`, no `firebase`/`Math.random`/`Date.now`; [useTurnTimer.ts](../../../../src/features/game/hooks/useTurnTimer.ts) (67 lines) — a hook with `setInterval`/`setTimeout`-style timer state, no Firestore, pure client timer logic. Both stay under the 150-line `max-lines` cap (`eslint.config.mjs:73`).
- Call sites (grep across `src e2e docs scripts .claude CLAUDE.md`):
  - `TutorialBeacon` is imported by `src/features/game/components/GameBoard.tsx` (row #6, done — still at legacy path per that row's import-boundary decision) and `src/features/game/components/PlayerInfoBar.tsx` (row #7, done — also kept at legacy path for the same reason). Both import sites must be repointed to the new module path.
  - `useTurnTimer` is imported only by `src/modules/game-board/game-board.hook.ts:4` (row's dependency already migrated) — one call site to repoint.
- No gameplay/rule changes, no Firestore shape changes, no new visible UI — behavior and visuals must stay identical. Small, single-layer, one straightforward pattern already used three times (rows #3, #6, #7) for the same "module file importing from a still-legacy caller" repoint. Fits tier S, one phase, implementer-a + tester-a only (no architect planning needed — the pattern is settled; no UI designer — no visual change; no preview agents — no new/changed visual states, just a relocation).

## Scope
- In: moving `TutorialBeacon.tsx` and `useTurnTimer.ts` into `src/modules/<domain>/` per component-architecture (view + hook file shapes), preserving exact current behavior and visuals; repointing the three import sites (`GameBoard.tsx`, `PlayerInfoBar.tsx`, `game-board.hook.ts`); unit/view tests for both.
- Out: any change to tutorial-beacon content, copy, timer duration/behavior, or `GameState`/Firestore shape. Migrating `GameBoard.tsx` or `PlayerInfoBar.tsx` themselves is already done (rows #6, #7) — only their import lines change here.

## Open questions
- none
