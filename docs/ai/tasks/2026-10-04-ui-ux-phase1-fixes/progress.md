# Progress: UI/UX review Phase 1 — bug fixes and quick wins

Tier: S · Phases: 1

## Phase 1: hydration fix, zoom aria-labels, deck copy, player-info labels
- [x] reproduction test for the hydration bug (tester-a)
- [x] implementation (implementer-a): deterministic border sprite, aria-labels, deck copy, player-info labels
- [x] checks: typecheck, lint, unit tests
- [x] committed: 43227a0

## Log
- 2026-10-04 tester-a: DONE, added failing reproduction test IslandTile.hook.test.ts:285-307 for the SSR/client hydration mismatch.
- 2026-10-04 implementer-a: DONE, deterministic hashIsland(x,y) replaces Math.random() in IslandTile.hook.ts; aria-labels added to MapZoomControls, PlayerInfoStats chips; "Deck: N" reworded to "Cards left in deck: N" in ActionsPanel (+ test updates). typecheck/lint clean, 1797 tests passing.
