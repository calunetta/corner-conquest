# Triage: Map decoration sprite scale (boats, riders, trees)

Request: fix inconsistent sprite scale on the island tile map — the dock boat sits inland on the tile corner instead of overhanging the coastline, the farmer/army rider renders as a separate uncomposed sprite instead of appearing inside the boat, and trees render too small relative to the tile.
Type: bug
Tier: M
Pipeline: ui-designer-a ui-designer-b architect-a architect-b tester-a implementer-a implementer-b tester-b preview-a preview-b architect-b:final-review
Overrides: none
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Verified root cause this session, live in the browser (testbed `tile-boats` and `map-grid` states) and by reading source:
  - `IslandTile` is fully responsive (`relative flex aspect-square w-full ...`, `src/modules/map/components/IslandTile/IslandTile.styles.ts:6`) — its rendered pixel size depends on the grid/viewport/zoom, not a fixed value.
  - `TileBoats.styles.ts:4` hardcodes the boat at `w-7 h-7 sm:w-8 sm:h-8` (28-32px flat) and `TileBoats.types.ts:4` (`BOAT_CORNER_POSITIONS`) anchors it `bottom: 2px, right: 2px` from the **tile's own corner** — i.e. inland on the tile's own box, not overhanging the coastline/water boundary between tiles, which is what the screenshot shows and what the user expects (Catan-robber-style edge placement).
  - `TileOccupants.styles.ts:6` caps the army/farmer sprite at `max-w-[86px]` in its own independent `bottom-right` slot (`occupantSlot: 'absolute w-1/2 h-1/2'`) — this never reads the boat's position or size, so nothing visually composes the rider "inside" the boat; they're two unrelated overlays landing near each other by coincidence of both using corner/edge anchoring.
  - `TileForest.map.ts` hardcodes tree sizes in raw px (16-30px, e.g. lines 23-24, 34-36) with zero relation to the tile's actual rendered size.
  - Confirmed in the browser: `/testbed/tile-boats?state=Single boat` renders a boat with no size reference tile around it (isolated); `/testbed/map-grid?state=Populated board` shows the real composition — small boat, tiny separate occupant sprite nearby, both at a scale that doesn't track the rendered tile size.
- Visible UI: yes — this is purely what the player sees on the board, no rule or data-model change. Triggers the `ui-designer-a/b` insertion per tier M.
- Gameplay: no. Data: no Firestore/GameState shape change. Risk: low — no game-rules reducers, no timers/concurrency.
- Scope: 3 components (`TileBoats`, `TileOccupants`, `TileForest`), each with styles + map/logic + tests + preview — roughly 10-14 files, one layer (view), fits one phase.
- Bug, root cause already known (not "needs architect to find it") — but a design decision is still required (how should a rider actually compose with a boat: a single combined sprite, a clipped inner anchor point, or repositioning only — see Open questions), which is why `ui-designer-a/b` run before the architects rather than implementers just picking numbers.

## Scope
- In: establish a consistent, tile-relative sizing approach for `TileBoats`, `TileOccupants`, and `TileForest` (e.g. percentage/em of the tile's own box instead of fixed Tailwind px classes), reposition the boat to overhang the coastline/tile edge instead of sitting inland at the tile's own corner, and visually compose the rider with the boat when one is present.
- Out: any other map decoration component not named here (if a similar fixed-px pattern turns up elsewhere during implementation, flag it as a follow-up, don't silently expand scope); no change to boat/occupant game logic (`TileBoats.map.ts`'s visibility/corner-assignment logic, `TileOccupants.hook.ts`'s data derivation) beyond what positioning/sizing requires; no sprite-asset replacement unless ui-designer-a's spec calls for a new composed boat+rider sprite sheet (the Tiny Swords asset work another active session is doing is out of scope here — check `docs/ai/tiny-swords-asset-catalog.md` for available assets before proposing a new one, don't duplicate that session's work).

## Open questions
- None blocking triage. For ui-designer-a to resolve in its spec: does a composed boat+rider look use (a) a single sprite sheet with the rider already drawn inside the boat, (b) two independently-sized sprites with the rider's anchor point defined relative to the boat's interior, or (c) something simpler (e.g. the rider sprite just repositioned and scaled down to sit visually "in" the boat, no new art)? Check `docs/ai/tiny-swords-asset-catalog.md` first for what's already available before assuming new art is needed.
