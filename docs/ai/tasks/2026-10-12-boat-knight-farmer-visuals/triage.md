# Triage: Boat, knight and farmer visual placement

Request: Knight (army occupant sprite) should render on land, oriented to match its boat's corner, not floating over the boat/water; farmer (idle collector sprite) should always render visibly inside the boat hull when not positioned on a resource, not as a separate badge tag off to the side; general art-quality pass so the farmer reads as riding in the boat.
Type: component
Tier: M
Pipeline: ui-designer-a ui-designer-b architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b docs-sync architect-b:final-review
Overrides: none
Phases: 1

## Why this tier
- Visible UI signal: yes — player-facing sprite placement and art treatment on every island tile.
- Files/layers touched (verified this session):
  - [TileOccupants.hook.ts](src/modules/map/components/TileOccupants/TileOccupants.hook.ts) — occupant ("knight") slot currently reuses `BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS`, the exact same corner anchor and transform as its boat, so the occupant sprite is centered directly on the boat box instead of being offset onto land.
  - [TileOccupants.styles.ts](src/modules/map/components/TileOccupants/TileOccupants.styles.ts) — occupant box is 29% of tile side, centered on the same corner as the 42% boat box.
  - [TileBoats.styles.ts](src/modules/map/components/TileBoats/TileBoats.styles.ts) — `collectorOverlay` (farmer) is a separate `absolute bottom-0 right-0` badge at 40% of the boat box, drawn as its own layer on top of the hull rather than composited to look seated inside it.
  - [TileBoats.tsx](src/modules/map/components/TileBoats/TileBoats.tsx) — renders `boat.gif` then the collector badge as a sibling overlay.
  - [island-tile-slots.types.ts](src/modules/map/island-tile-slots.types.ts) — `BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS` is the single source of truth both components anchor to; any rotation-per-corner concept for the knight doesn't exist yet.
  - [IslandTile.tsx](src/modules/map/components/IslandTile/IslandTile.tsx) — render order: `TileBoats` then center content then `TileOccupants`, both positioned independently inside the same tile.
- No game-rule, Firestore, or `GameState` shape change — pure placement/art, so no game-designer stage and no architecture doc change expected (confirm with docs-sync regardless, since `docs/architecture/*.md` may describe current boat/occupant layout).
- `showIdleCollector` logic in [TileBoats.map.ts](src/modules/map/components/TileBoats/TileBoats.map.ts:82) already keys the farmer's boat-vs-positioned state off `!isPositionedOnResource` per army — the "unless positioned" behavior exists; this task is about making it visually read as inside the boat, not about the on/off logic itself.

## Scope
- In: occupant (knight) sprite placement so it sits visually on land near its boat's corner instead of centered on the boat; a rotation/angle treatment per corner so the knight's facing matches that corner's boat orientation; farmer (collector) sprite recomposited to read as seated inside the boat hull rather than a corner badge; supporting art/quality pass on these two sprites' sizing, shadow and layering.
- Out: boat hull artwork itself (`boat.gif`), resource-node collector badge (separate component/feature, just shipped in [2026-10-12-collector-badge-left-and-bigger](docs/ai/tasks/2026-10-12-collector-badge-left-and-bigger)), fog-of-war/visibility logic, `showIdleCollector` on/off logic, any `GameState` or reducer change.

## Open questions
- none — proceeding to ui-designer for an exact spec (corner-by-corner knight offset/rotation values, farmer-in-boat composition) since "angle corresponding to the boat" and "inside the boat" need concrete numbers before implementation.
