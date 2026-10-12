# Triage: Resource sprite responsive sizing

Request: Resource nodes and the farming-collector badge are sized in fixed pixels, independent of the tile's actual rendered size, so they look tiny on large desktop tiles and oversized/overlapping on small mobile tiles; convert them to percent-of-tile like boats and occupants already are.
Type: bug
Tier: M
Pipeline: ui-designer-a ui-designer-b architect-a architect-b tester-a implementer-a implementer-b tester-b preview-a preview-b docs-sync architect-b:final-review
Overrides: none
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier

- Root cause, verified this session:
  - [MapGrid.tsx:49](src/modules/map/components/MapGrid/MapGrid.tsx:49) — the tile itself is already responsive: `clamp(94px, 12.5vh, 136px)` desktop, `clamp(46px, 13.5vw, 68px)` mobile.
  - [TileBoats.styles.ts](src/modules/map/components/TileBoats/TileBoats.styles.ts) (`w-[42%] h-[42%]` boat, `w-[40%] h-[40%]` collector) and [TileOccupants.styles.ts](src/modules/map/components/TileOccupants/TileOccupants.styles.ts) (`w-[29%] h-[29%]`) already size as percent-of-tile — these scale correctly at every tile width.
  - [island-tile-slots.types.ts](src/modules/map/island-tile-slots.types.ts) (`SlotDef.size`, in px: 46/38/32/26) feeds [TileResources.map.ts:96-114](src/modules/map/components/TileResources/TileResources.map.ts:96) (`nodeSize`, `badgeSize`, `badgeOffset`, all px) feeds [TileResources.tsx:19-20,40-44](src/modules/map/components/TileResources/TileResources.tsx:19) (inline `width`/`height` in px). None of this scales with T: a 46px node is ~34% of T at desktop max (136px) but ~100% of T at mobile min (46px).
  - [TileResources.map.ts:35-36](src/modules/map/components/TileResources/TileResources.map.ts:35): `BADGE_MIN_SIZE = 22` (px floor) — an explicit px constraint with no percent equivalent; the plan must decide how a floor survives a percent-based size (e.g. `max(Npx, X%)` via CSS, not JS-side `Math.max` which can't know the live tile width).
  - [TileResources.types.ts:28](src/modules/map/components/TileResources/TileResources.types.ts:28) documents the badge size as "px; ... floored at 22px" — will need rewording regardless of the chosen fix.
- Bug: reproducible and root-caused (above), but tier M per the triage table ("bug that needs root-cause analysis") because the actual fix requires a real design decision — how the Food 1.45x inflation, the badge-size ratio, and the 22px floor each translate from a px world to a percent-of-T world — not a one-line tweak.
- Visible UI: yes — this changes on-screen resource/badge sizes at every tile size; ui-designer pair inserted per the tier-M rule.
- Gameplay: no rule/number change.
- Data: no Firestore/`GameState` shape change.
- Files/layers: `island-tile-slots.types.ts` (shared constants), `TileResources.map.ts`/`.types.ts` (logic/types — implementer-a), `TileResources.tsx` (view — implementer-b), plus `island-tile-slots.test.ts` and `TileResources.map.test.ts` (tests, 576 lines, extensive literal pins that will need updating). About 6 files, one component family.
- Bug-tier-M rule applied: `tester-a` runs right after the architects, before implementation, to pin a reproduction (e.g. node/badge size as a function of simulated tile width) that fails against the current px constants.
- No matching row in `docs/ai/refactor.md`.

## Scope

- In: converting `SlotDef.size` (and the badge-size ratio/floor/Food-inflation math derived from it) from fixed px to percent-of-tile, for every island type (Base, Resource single/dual/triple); updating `TileResources.tsx` to apply percent-based width/height (and the 22px floor, if kept, as a CSS floor rather than a JS one); updating the shared-layout tests and `TileResources.map.test.ts`'s literal expectations; visually re-verifying the existing and new preview states at both the mobile (46-68px) and desktop (94-136px) tile-size extremes.
- Out: changing boats/occupants (already percent-based, out of scope unless the architect finds they need to coordinate with the new resource percentages); the slot *position* table from the Oct 11 layout-consolidation task (`top`/`left`/`right`/`bottom`, already percent and already fixed); any new sprite art; any gameplay change.

## Open questions

- None — proceeding with the swarm.
