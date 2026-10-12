# Triage: Resource node tile overflow / poor space usage

Request: fix resource sprites (sheep/tree/mine) sometimes rendering at the very edge of an island tile or outside it, and not using the tile's free grass space well.
Type: bug
Tier: S
Pipeline: (direct fix, verified in browser; no swarm agents spawned)
Overrides: none
Phases: 1

## Why this tier
- Root cause isolated to one file (`src/modules/map/island-tile-slots.types.ts`) plus one rendering line in `TileResources.tsx`; no game-rules or data-model changes.
- Confirmed via the existing `tile-resources` and `island-tile` testbed previews that `DUAL_RESOURCE_SLOTS[1]` / `TRIPLE_RESOURCE_SLOTS[2]` (`top: '70%'`, edge-anchored, no vertical centering) combined with `FOOD_SCALE` (1.45x size inflation for the sheep sprite, `TileResources.map.ts`) pushed an inflated Food node's box far past the tile's bottom edge — reproduced with a two-Food-node island in the preview before the fix (sheep rendered almost entirely below the tile).
- `public/sprites/terrain.png` bakes a painted grass/water border into every tile (thin on top/sides, thick at the bottom), which the old edge-anchored slots (e.g. `top: '4%'`, `bottom: '4%'`) sat close to or on.

## Scope
- In: convert the four resource-node slot tables (`SINGLE_RESOURCE_SLOT`, `DUAL_RESOURCE_SLOTS`, `TRIPLE_RESOURCE_SLOTS`, `BASE_RESOURCE_SLOTS`) from corner-anchored to center-anchored (`top`/`left` = node center), and make `TileResourcesView` always center the node box on that point (`transform: translate(-50%, -50%)`). Converted values preserve the exact prior visual position for non-Food resources (`top' = top + size/2`, etc.) while bounding Food's inflated growth symmetrically instead of one-sided.
- Out: board-level terrain generation (`generateIslandTerrain`, `map-generation.ts`) — the user's screenshots are single-tile closeups, so the complaint is intra-tile sprite placement, not which tiles get resources. Also out: Base-tile castle sizing, forest slots (`BASE_FOREST_SLOTS`, `EMPTY_GROVE_SLOTS`), and boat/occupant corner anchors — untouched, already carefully tuned in prior tasks, not implicated by the reproduced bug.

## Open questions
- None; reproduced and fixed the exact failure mode shown in the user's screenshots.
