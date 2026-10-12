# Progress: Resource node tile overflow / poor space usage

Tier: S · Phases: 1

## Phase 1: Center-anchor resource node slots
- [x] implementation: `src/modules/map/island-tile-slots.types.ts` (slot constants), `src/modules/map/components/TileResources/TileResources.tsx` (universal centering transform), `src/modules/map/components/TileResources/TileResources.fixtures.ts` and `.preview.tsx` (updated literals)
- [x] tests updated: `src/modules/map/island-tile-slots.test.ts`, `TileResources.map.test.ts`, `TileResources.test.tsx`
- [x] checks: `npm run typecheck` clean; `npx eslint` clean on touched files; `npx jest src/modules/map` 428/428 passed (excluding the unrelated `.claude/worktrees/inspiring-kare-ee7f7f` copy and pre-existing unrelated failures elsewhere in the repo — e2e specs picked up by jest, firestore rules emulator, `.agents/` skill tests)
- [x] UI verified: testbed `tile-resources` (single/dual/triple states, plus a two-Food-node reproduction built through the real `toTileResourcesViewModel` pipeline) and `island-tile` (`Base island with resources`, `Base island with resources and occupants`, `Occupied resource island`) at desktop size in the built-in browser — confirmed the sheep/tree/mine sprites stay inside the tile's grass area, clear of the painted shoreline border, with no regression to occupant/boat corner placement
- [x] docs updated: `docs/architecture/systems-and-visuals.md` §6.13 (removed the stale literal percentages, documented the center-anchoring contract)
- [ ] committed: pending user confirmation

## Log
- 2026-10-12: Reproduced the bug from the user's screenshots (sheep/tree rendered at or past a tile's edge) by inspecting `island-tile-slots.types.ts`, `TileResources.map.ts`'s `FOOD_SCALE`, and `public/sprites/terrain.png`'s painted border. Root cause: edge-anchored slots (`top`/`right`/`bottom`) grow one-sided when a node's box is inflated (Food's 1.45x), overflowing past the tile. Fixed by converting all four resource-slot tables to center-anchored points and centering every node on that point in the renderer. Verified in the browser testbed before and after.
