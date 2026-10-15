# Triage: Drag-and-drop tile-decoration editor (replaces hand-coded tree layouts)

Request: Build a testbed tool to drag-and-drop decoration sprites onto a tile preview, per island-type scenario, saving named layout collections to one config file (with folder-based image auto-discovery and a dev-only save API route); this unifies with and replaces the current TileForest tree system, and newly enables decorations on Resource and Monster islands (currently suppressed).
Type: feature
Tier: L
Pipeline: ui-designer-a ui-designer-b architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b docs-sync architect-b:final-review
Overrides: implementer-a=sonnet, implementer-b=sonnet, tester-a=sonnet, tester-b=sonnet, preview-a=sonnet, preview-b=sonnet
Phases: 3

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Touches 3+ modules: `src/modules/map` (`island-tile-slots.types.ts`, `TileForest/TileForest.map.ts`, `TileForest/TileForest.types.ts` — verified in this session), a new editor under `src/testbed` (view/hook/styles/map/types/fixtures/preview/tests, ~8 files), and a brand-new `src/app/api/.../route.ts` dev-only save endpoint — this repo currently has no API routes (`find src/app/api` returned nothing), so this is new infrastructure, not a pattern to copy.
- Visible UI: yes, twice over — (1) players newly see decorations on Resource and Monster islands, which are today suppressed in `TileForest.map.ts:12-18`; (2) the editor itself is a new interactive drag-and-drop tool that needs its own UX spec (scenario picker, drag behavior, add/remove, multi-layout management, image picker).
- Gameplay: no. Purely visual; no rule, number, or `GameState`/Firestore change. Game-designer stage is skipped.
- Data: no Firestore/GameState shape change. The one new config file and the save API route are dev-tooling, not runtime game data.
- Risk: the slot tables this touches (`BASE_FOREST_SLOTS`, `SPECIAL_FOREST_SLOT`, `EMPTY_GROVE_SLOTS` in `island-tile-slots.types.ts:136-173`) are covered by this project's "island-tile slot values are locked" rule — changing them is the explicit, confirmed ask here, not an incidental edit, so architect-a must carry that context forward and docs-sync must update the locked-values note/memory pointer after.
- File count (migration + config model + editor + API route + docs) is well past the ~6-file single-phase threshold, so this runs phased, not as one M-tier pass.

## Scope
- In:
  - One new config file holding, per scenario, a collection of named whole layouts (position + image + size + z-index per decoration instance). Scenarios: Base; Special; Empty×{2-tree, 3-tree}; Resource×{1,2,3,4 node count}; Monster×{alive, cleared}.
  - Migrating `BASE_FOREST_SLOTS`, `SPECIAL_FOREST_SLOT`, `EMPTY_GROVE_SLOTS` into that config as the first layout entry for their scenario.
  - Deterministic per-island layout selection (seeded from x/y and type/scenario, same style as today's `seed = x*7 + y*13` in `TileForest.map.ts:21`), extended to also select among multiple layouts, and extended to Resource/Monster scenarios (removing today's suppression).
  - A new `src/testbed` editor: scenario picker (reusing the `IslandTileSlotLab` fixture/context pattern for a realistic tile preview with occupants/resources/boats visible as alignment reference), drag-to-position decoration instances, add/remove instances, manage multiple named layouts per scenario, an image picker fed by folder auto-discovery under a new `public/sprites/decorations/` folder.
  - A dev-only Next.js API route that writes the editor's Save action straight to the one config file on disk; must not be reachable/included in production builds.
  - `docs/architecture/systems-and-visuals.md` (and any other architecture doc that documents tile decoration/tree behavior) updated to match; the locked-values memory note updated to point at the new config file instead of the old arrays.
- Out:
  - `OCCUPANT_CORNER_SLOTS`, `BOAT_CORNER_POSITIONS`, resource-node slot tables (`SINGLE_RESOURCE_SLOT`, `DUAL/TRIPLE/QUAD_RESOURCE_SLOTS`), and `MapDecorations` (map-level rocks/clouds) are unchanged — only the forest/tree slot tables are being replaced.
  - No change to `GameState`, Firestore schema, or any `game-rules` reducer.
  - No change to which resource/monster islands exist or how many — only whether/what decoration renders on them.

## Open questions
- None — scope, data model, persistence, image source, migration, and determinism were confirmed with the user before this triage.
