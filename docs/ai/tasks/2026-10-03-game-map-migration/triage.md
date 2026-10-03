# Triage: Migrate game map/board visuals to src/modules

Request: Move `src/features/game/components/GameBoard.tsx`, `MapGrid.tsx`, `IslandTile.tsx`, `TileBoats.tsx`, `TileForest.tsx`, `TileOccupants.tsx`, `TileResources.tsx`, `MapDecorations.tsx`, `MapZoomControls.tsx`, and `src/features/game/hooks/useMapPanZoom.ts` into `src/modules/<domain>/` per the component-architecture standard (row #6 of `docs/ai/refactor.md`). Depends on #1 (done).
Type: refactor
Tier: M
Pipeline: architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b architect-b:final-review
Overrides: none
Phases: 3

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Files touched (verified, 10 files / ~1,422 LOC): [GameBoard.tsx](../../../../src/features/game/components/GameBoard.tsx) (108), [MapGrid.tsx](../../../../src/features/game/components/MapGrid.tsx) (78), [IslandTile.tsx](../../../../src/features/game/components/IslandTile.tsx) (204), [TileBoats.tsx](../../../../src/features/game/components/TileBoats.tsx) (161), [TileForest.tsx](../../../../src/features/game/components/TileForest.tsx) (97), [TileOccupants.tsx](../../../../src/features/game/components/TileOccupants.tsx) (98), [TileResources.tsx](../../../../src/features/game/components/TileResources.tsx) (175), [MapDecorations.tsx](../../../../src/features/game/components/MapDecorations.tsx) (185), [MapZoomControls.tsx](../../../../src/features/game/components/MapZoomControls.tsx) (83), [useMapPanZoom.ts](../../../../src/features/game/hooks/useMapPanZoom.ts) (233) — all view layer, one logic-only hook.
- Impurity check: `IslandTile.tsx` uses `Date.now()` (line 56) and `Math.random()` (line 83, border-image variety); `TileOccupants.tsx` uses `Date.now()` (line 27). Neither touches `firebase`. These are small view-local effects (render-time snapshot / cosmetic randomization), not reducer logic — plan should keep them in the view or a thin `.hook.ts`, not invent a `.service.ts` for them.
- `IslandTile.tsx` (204), `TileBoats.tsx` (161), `TileResources.tsx` (175), `MapDecorations.tsx` (185), and `useMapPanZoom.ts` (233) all exceed the 150-line `max-lines` cap (`eslint.config.mjs:73`) once they leave `LEGACY_PATHS` — each needs splitting across the component-architecture file types, not a straight move.
- Call sites (grep across `src e2e docs scripts .claude CLAUDE.md`): `GameBoard` is imported directly by `src/app/page.tsx`, `GameBoardContext.tsx`, and multiple panels/dialogs/header components outside this row's scope — same import-boundary shape as row #3, where `GameDialogManager.tsx` had to stay at its legacy path. Architect should decide per-file whether `GameBoard.tsx` can move or must stay a legacy re-export, same as row #3's precedent. `MapGrid`→`IslandTile`→(`TileBoats`, `TileForest`, `TileOccupants`, `TileResources`) and `MapGrid`→(`MapDecorations`, `MapZoomControls`→`useMapPanZoom`) are the only intra-row dependency chains; existing unit tests already cover `TileResources`, `TileOccupants`, `TileBoats`, `TileForest`, `MapDecorations` and must move with their subjects.
- No gameplay/rule changes, no Firestore shape changes, no new visible UI — behavior and visuals must stay pixel-identical. This mirrors row #3's shape (`2026-10-03-migrate-dialog-components`, tier M, 3 phases for 877 LOC / 3 files); this row is larger (10 files / ~1,422 LOC) so 3 phases cut by layer (pan/zoom hook + controls; island tile + its tile children; GameBoard + MapGrid + decorations) rather than by file count, with architect-a confirming the exact cut.
- Risk: `GameBoard.tsx` renders every turn for every player and is the root of the whole map tree — architect planning and preview verification are warranted even though no gameplay changes.

## Scope
- In: moving/splitting the 10 named files into `src/modules/<domain>/` per component-architecture, preserving exact current behavior and visuals; updating all import sites; testbed previews for each; moving the 5 existing unit tests (`TileResources`, `TileOccupants`, `TileBoats`, `TileForest`, `MapDecorations`) with their subjects.
- Out: any change to map content, visuals, layout, pan/zoom behavior, or the data/state the tiles read (no `GameState` or Firestore shape changes). `GameBoardHeader.tsx`, `GameStatusBadge.tsx`, `PlayerInfoBar.tsx` (row #7) and the panels (row #5) are out of scope except for repointing their imports of files this row moves.

## Open questions
- none
