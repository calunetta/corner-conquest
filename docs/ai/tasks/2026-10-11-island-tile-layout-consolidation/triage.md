# Triage: Island tile layout consolidation

Request: Replace the four independently-computed percent-coordinate systems for island-tile sprite placement (resource nodes, boat corners, forest clusters, soldier/knight occupants) with one shared layout table per island type, so slots are defined once and can't silently overlap.
Type: refactor
Tier: M
Pipeline: ui-designer-a ui-designer-b architect-a architect-b tester-a implementer-a implementer-b tester-b preview-a preview-b docs-sync architect-b:final-review
Overrides: implementer-a=sonnet, implementer-b=sonnet
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier

- Files/layers touched, verified this session:
  - [TileResources.map.ts:27-80](src/modules/map/components/TileResources/TileResources.map.ts:27) — `SlotDef`, `SINGLE/DUAL/TRIPLE_RESOURCE_SLOTS`, `BASE_RESOURCE_SLOTS`, `getSlot`
  - [TileBoats.map.ts:90-92](src/modules/map/components/TileBoats/TileBoats.map.ts:90) + `TileBoats.types.ts` — `BOAT_CORNER_POSITIONS`, `CORNER_TRANSFORMS`
  - [TileForest.map.ts:19-46](src/modules/map/components/TileForest/TileForest.map.ts:19) — base/empty/special tree-cluster coordinates, hand-tuned to "clear" the boat corner and base resource slot (see comment at line 20-21)
  - [TileOccupants.hook.ts:56-62](src/modules/map/components/TileOccupants/TileOccupants.hook.ts:56) — already imports `BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS` from `TileBoats.types` so occupant N and boat entry N share a corner; this is the one place two of the four systems already coordinate, by import, not by a shared source of truth
  - [IslandTile.tsx:93-118](src/modules/map/components/IslandTile/IslandTile.tsx:93) — stacking order of `TileForest` → `TileBoats` → center content (`TileResources`) → `TileOccupants`, confirmed no z-index coordination beyond render order
  - `docs/architecture/systems-and-visuals.md` §6.13 documents all four systems' current coordinates in prose; will go stale and must be updated
- Visible UI: yes — this is a visible-sprite-overlap bug; fixing it changes on-screen positions.
- Gameplay: no — no rule, number, card, monster or economy change.
- Data: no Firestore/`GameState` shape change — pure presentation layer (`.map.ts`/`.hook.ts` functions feeding existing view components).
- Risk: four components (`TileResources`, `TileBoats`, `TileForest`, `TileOccupants`) must agree on one new shared slot table without regressing any of the existing visual rules (base resource clearance, badge-size-ratio math, occupant/boat corner pairing, fog-of-war visibility gating). Cross-component refactor inside one module — escalate `implementer-a`/`implementer-b` to sonnet.
- Bug-tier-M rule applied: `tester-a` runs right after the architects, before implementation, so the overlap reproduction (e.g. a Base tile with 3 resources + boat + 2 occupants + forest) is a failing test before the fix.
- Existing `.preview.tsx` files for `TileResources`, `TileBoats`, `TileOccupants` (and fixtures) give `preview-a`/`preview-b` a fast way to render every slot-count combination and visually confirm no overlap.
- No matching row in `docs/ai/refactor.md` (island-tile visuals migration, row 6, is already `done`); this is new work on already-migrated code, not a reopened migration.

## Scope

- In: a single shared layout module (exact shape — e.g. per-island-type slot maps keyed by role — is architect-a's call) that `TileResources.map.ts`, `TileBoats.map.ts`, `TileForest.map.ts`, and `TileOccupants.hook.ts` all read from; migrating their existing slot constants into it; preserving current look-and-feel except where it actually overlaps; updating `docs/architecture/systems-and-visuals.md` §6.13.
- Out: new sprites or art assets; changing which sprites appear on which island type; the badge-size/collector-offset math in `TileResources.map.ts` (reused, not redesigned, unless it's the source of an overlap); any gameplay/rule change; a general-purpose drag-and-tune editor tool (noted by the user as a possible follow-up, not part of this task).

## Open questions

- None — proceeding with the swarm.
