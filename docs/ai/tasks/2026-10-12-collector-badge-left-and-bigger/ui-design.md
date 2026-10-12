# UI design: Collector badge — bigger, always left

## Spec (ui-designer-a)

### Purpose and user story
As a player watching a farmed resource node, I want the collector badge to be bigger and always on the same side (matching the farmer sprite's facing direction) so I can spot who is farming a node faster and the badge reads consistently across the whole island.

### Placement and layout
No new placement: this changes only the size and side of the existing collector badge drawn by `TileResourcesView` (`src/modules/map/components/TileResources/TileResources.tsx:58-72`), next to a farmed resource node, at `z-35` per `docs/architecture/systems-and-visuals.md:109`.

- Desktop (1280×720) and mobile layout of the tile grid: unchanged. The badge is one small element inside an island tile (`IslandTile`, tile side `clamp(94px, 12.5vh, 136px)` desktop / `clamp(46px, 13.5vw, 68px)` mobile per `src/features/game/components/MapGrid.tsx`). No change to tile sizes, grid, or any other HUD element.
- Badge side: always on the node's **left** edge, centered on that edge midpoint (`top: 50%` of the node's own box). Today's conditional (`TileResources.map.ts:126-127`) that flips to the right edge for most nodes is removed; every farmed node's badge sits to its left from now on, regardless of where the node itself is anchored inside the tile.
- Badge size: **65%** of the node's own rendered box width/height (up from 55%), still measured against the node's *un-inflated* box — i.e. still excluding the `FOOD_SCALE = 1.45` inflation Food's sheep sprite box gets, exactly as today's 55% excludes it (`TileResources.map.ts:34-39`). No px floor is added: mobile keeps hiding the badge entirely (`showFarmingCollector={!isMobile}`, `TileResources.tsx:84`) rather than enforcing a minimum badge size.
  - Non-food badge ratio, node-relative: 65%.
  - Food badge ratio, node-relative: 65 / 1.45 = 44.8% (one decimal, matching the existing `roundToOneDecimal` convention in `toBadgeSize`), so the badge's on-screen size relative to the tile is identical across resource types, exactly as the current 55%/37.9% pair is today.

### Per-slot overflow check (resolves the triage's open risk)
The triage flagged a possible tile-edge overflow once every node always badges left, worst case `TRIPLE_RESOURCE_SLOTS[2]` (`left: 12%`, `size: 27`). That flagged math assumed the badge sits flush against the node's edge. It does not: `toCollectorBadgeStyle` (`TileResources.tsx:24-29`) centers the badge *on* the node's edge via `transform: translate(50%, -50%)` (or `translate(-50%, -50%)` for the current right case) — the same centering comment already states ("Anchors the badge on the node's edge midpoint"). So a badge of width `w` (in % of tile side T) centered on a node's left edge at position `L` (also in % of T) spans `[L − w/2, L + w/2]`, not `[L − w, L]`.

Recomputed at the new 65% ratio, using each slot's node left-edge position `L` in % of T (`island-tile-slots.types.ts`) and badge width `w = slot.size × 0.65`:

| Slot | `L` (node left edge, % T) | `w` (badge width, % T) | Badge span (% T) | Clears tile (0–100%)? |
|---|---|---|---|---|
| `SINGLE_RESOURCE_SLOT` (left 50%, transform −50%, size 39) | 30.5 | 25.35 | 17.8 – 43.2 | Yes |
| `DUAL_RESOURCE_SLOTS[0]` (left 24%, size 32) | 24 | 20.8 | 13.6 – 34.4 | Yes |
| `DUAL_RESOURCE_SLOTS[1]` (right 24%, size 32) | 44 | 20.8 | 33.6 – 54.4 | Yes (already badges left today) |
| `TRIPLE_RESOURCE_SLOTS[0]` (left 24%, size 27) | 24 | 17.55 | 15.2 – 32.8 | Yes |
| `TRIPLE_RESOURCE_SLOTS[1]` (right 12%, size 27) | 61 | 17.55 | 52.2 – 69.8 | Yes (already badges left today) |
| `TRIPLE_RESOURCE_SLOTS[2]` (left 12%, size 27) — the flagged slot | 12 | 17.55 | **3.2 – 20.8** | Yes — closest margin of all slots, still 3.2% clear of the tile edge |
| `BASE_RESOURCE_SLOTS[0]` (left 50%, transform −50%, size 22) | 39 | 14.3 | 31.9 – 46.2 | Yes |
| `BASE_RESOURCE_SLOTS[1]` (left 35%, transform −50%, size 22) | 24 | 14.3 | 16.9 – 31.2 | Yes |
| `BASE_RESOURCE_SLOTS[2]` (left 65%, transform −50%, size 22) | 54 | 14.3 | 46.9 – 61.2 | Yes |

Food's enlarged node box shifts `L` only for the transform-based slots (`SINGLE_RESOURCE_SLOT`, `BASE_RESOURCE_SLOTS`), never past the non-food `L` toward the tile edge (it shifts toward tile center as the box grows), and the food badge's absolute T-width is identical to non-food at the same slot (the `/FOOD_SCALE` in `toBadgeSize` cancels the box inflation), so Food's spans are the same or safer than the row above in every case — verified by hand for all three transform slots.

**Conclusion: "always left" at 65% needs no per-slot exception and no change to `island-tile-slots.types.ts`.** Every slot clears the tile edge with margin; the tightest is `TRIPLE_RESOURCE_SLOTS[2]` at 3.2% of T, still a visible gap at every tile size since the layout is percentage-based.

### States
| State | What the player sees | Trigger |
|---|---|---|
| No resources | Nothing rendered (`TileResourcesView` returns `null`) | Island has no `resources` | 
| Resource, not farmed | Resource sprite(s) only, no badge | Node has no `positionedBy` entry for its type |
| Resource, farmed, desktop | Resource sprite plus a collector badge (farm sprite, player color) at 65% of the node's size, centered on the node's **left** edge | A player is positioned to farm that resource type |
| Resource, farmed, mobile | Resource sprite only; badge is not rendered | Same as above, `useIsMobile()` true |
| Multiple resources | Each node renders independently with its own slot, size and (if farmed) badge, following the rules above | Island has 2–3 resource nodes or is a Base island |

No new state is introduced; the only change inside the existing "Resource, farmed" state is the badge's size (55% → 65%) and side (conditional → always left).

### Components and tokens
- Reuse only: `TileResourcesView` (`src/modules/map/components/TileResources/TileResources.tsx`), its `toCollectorBadgeStyle` positioning function, and the existing `/sprites/farm_${color}.gif` collector sprites. No new component, no new visual pattern.
- Tokens: none — the badge is a sprite image (`next/image`, `unoptimized`), not a themed UI element. No color, border or background token changes.

### Copy
None. The badge has an `alt` string already: `"${color} collector farming"` (`TileResources.tsx:66`) — unchanged.

### Interactions and motion
None. The badge is static art with no interaction or transition, same as today.

### Accessibility
- The badge's `alt` text (`"${color} collector farming"`) already names the player color, so color is not the only signal — unchanged, no regression.
- No interactive element, so no keyboard or focus change.
- Contrast: not applicable (sprite image, not text).

### Acceptance criteria
- [ ] In `/testbed/tile-resources`, state "Resource with collector": the collector badge sits to the **left** of the sheep node (not the right, as it does before this change).
- [ ] The badge's rendered size is visibly larger than before (65% vs. 55% of the node box) — confirm the preview fixture's `size` value is updated from `'37.9%'` to `'44.8%'` (Food) and that a non-food collector fixture, if added, uses `'65%'`.
- [ ] Every one of the 9 node slots listed in the table above (`SINGLE_RESOURCE_SLOT`, both `DUAL_RESOURCE_SLOTS`, all three `TRIPLE_RESOURCE_SLOTS`, all three `BASE_RESOURCE_SLOTS`) renders its badge fully inside the tile's visible box at both the mobile-min (46px) and desktop-max (136px) tile sizes used by `TileBox` in the preview — no clipping against the dashed tile border.
- [ ] Mobile preview state "Resource with collector, mobile (badge hidden)" still shows no badge at all.
- [ ] `docs/architecture/systems-and-visuals.md:109` no longer says the badge is "55%... centred on the node's right edge, or on its left edge when the node is anchored to the right edge"; it says the badge is always on the left edge at the new ratio (docs-sync).

## Review (ui-designer-b)
VERDICT: APPROVED (two corrections folded in below; no change to the size/side decision)

Verified against code: `TileResources.map.ts:34-39,52-57,126-127` (ratio, badge-size formula, current side rule), `TileResources.tsx:24-29,58-72,84` (badge CSS, mobile hide), `island-tile-slots.types.ts:43-70` (all 9 slot defs), `TileResources.styles.ts:3,6` (`nodeSlot` is itself `absolute` so it is the containing block for `collectorOverlay`'s percentages — confirms the spec's "size is % of the node's own box" claim), `docs/architecture/systems-and-visuals.md:109` (current wording matches what the spec says it will replace), `TileResources.fixtures.ts`, `TileResources.preview.tsx:30-50` (existing fixtures/states).

Re-derived the per-slot table independently (CSS `left`/`right` without `transform` sets that edge directly, independent of box size; `left:X%` + `translateX(-50%)` centers the box so its left edge is at `X − size/2`). All 9 rows check out exactly as written, including the tightest case `TRIPLE_RESOURCE_SLOTS[2]`: L=12, w=27×0.65=17.55, span 3.2–20.8% of T. No overflow anywhere. The "always left, 65%" decision needs no per-slot exception — agreed, no change to `island-tile-slots.types.ts`.

Two corrections to the Food/transform paragraph (math conclusion is unaffected, but the reasoning as written is wrong and would mislead a future reader):

1. **"shifts toward tile center as the box grows" is wrong for `SINGLE_RESOURCE_SLOT`.** That slot is already centered on the tile's own center (`left:50%`, `translateX(-50%)`); growing the box for Food expands it symmetrically *away from* center on both sides, it does not shift toward center. Recomputed: Food nodeSize = 39×1.45 = 56.55%, so L_food = 50 − 56.55/2 = 21.725 (vs. L_non-food = 30.5 — moves 8.775 points *toward* the left tile edge, not toward center). Badge width is still 25.35 (0.65×39, food-normalized, unaffected by the box inflation as the spec correctly says). Food span = 21.725−12.675 to 21.725+12.675 = **9.05 – 34.4**, left-edge margin 9.05%. That is tighter than the non-food margin (17.8%), not "the same or safer" — but it is still well clear of 0%, and still bigger than the overall worst case (`TRIPLE_RESOURCE_SLOTS[2]`'s 3.2%), so the conclusion "no per-slot exception needed" still holds.
2. **"shifts L only for the transform-based slots" is wrong.** Right-anchored non-transform slots (`DUAL_RESOURCE_SLOTS[1]`, `TRIPLE_RESOURCE_SLOTS[1]`) also shift under Food, because CSS `right:X%` fixes the box's right edge and the left edge (`right_edge − width`) moves as width grows. Recomputed `TRIPLE_RESOURCE_SLOTS[1]` under Food: right edge fixed at 88%, nodeSize = 27×1.45 = 39.15%, L_food = 88−39.15 = 48.85 (vs. 61 for non-food) — this one *does* move toward center, span 40.075–57.625, comfortably clear. Net effect: every slot, food or not, clears its tile edge; the floor across all 9 slots × both resource variants remains `TRIPLE_RESOURCE_SLOTS[2]` at 3.2%, unaffected by Food since that slot is left-anchored with no transform (L is set directly by `left:12%`, independent of box size).

Fixed conclusion for the Final spec: **"always left" at 65% needs no per-slot exception. The worst-case margin across all 9 slots and both Food/non-Food is `TRIPLE_RESOURCE_SLOTS[2]` at 3.2% of T, unaffected by the Food scale (it's a left-anchored, non-transform slot). Every transform- or right-anchored slot's margin moves by a few points under Food — sometimes tighter (e.g. `SINGLE_RESOURCE_SLOT` drops from 17.8% to 9.05%), sometimes looser — but never below the 3.2% floor.**

**Acceptance-criteria gap (fold-in fix, no redesign):** criterion 3 asks to confirm all 9 node slots clear the tile edge "in `/testbed/tile-resources`" at both tile-size extremes, but the existing preview states don't exercise 7 of the 9 slots with a collector: `multipleResourceNodes` (`TileResources.preview.tsx:30-34`) uses `resourceIslandWithTwoDistinctResources`, a 2-resource island with no `positionedBy`, so it never renders a badge at all; `withCollectorNode` (`:36-50`) is hand-written and only ever exercises `SINGLE_RESOURCE_SLOT`. Nothing in the registry drives a farmed triple-resource or farmed base island through `toTileResourcesViewModel`, so `TRIPLE_RESOURCE_SLOTS` and `BASE_RESOURCE_SLOTS` are never shown with a badge in the testbed as it stands — criterion 3 would be unverifiable by screenshot. Fix, scoped to implementer-b/preview-b (reusing the exact pattern already used for `multipleResourceNodes`, not a new visual pattern): add two more preview states, "Resource with collector, triple slots" (an island with 3 resources and a `positionedBy` entry, built through `toTileResourcesViewModel`) and "Base resource with collector" (`baseIslandWithResources` — already defined in `TileResources.fixtures.ts:41-53` but currently unused in the preview — with a `positionedBy` entry added to the fixture), both built the same way as `multipleResourceNodes`. This makes all 9 slots screenshot-checkable at both the mobile and desktop `TileBox` sizes (toggle via viewport/`useIsMobile`, same as the existing mobile-hidden state).

No other gaps found: states table covers empty/not-farmed/farmed/mobile-hidden/multi completely for this component (loading, error, disabled, focus and selected genuinely don't apply — static non-interactive sprite, no fetch); mobile fit unaffected (badge stays hidden below 768px, no tile-grid impact); accessibility unaffected (no color-only signal, `alt` text unchanged, no interactive/focus/keyboard surface, no motion added); buildable with existing primitives only (`next/image`, existing CSS recipe); every acceptance criterion is screenshot- or test-observable once the two preview states above are added.

## Final spec

Same as ui-designer-a's spec above (Purpose, Placement and layout, States, Components and tokens, Copy, Interactions and motion, Accessibility, Acceptance criteria), with the per-slot overflow analysis's Food/transform paragraph and conclusion replaced by the corrected versions in this review, and with the preview scope for implementer-b/preview-b expanded to add two more preview states so all 9 slots are screenshot-checkable:

- "Resource with collector, triple slots" — a 3-resource, non-base island with one resource `positionedBy` a player, built through `toTileResourcesViewModel` like `multipleResourceNodes`.
- "Base resource with collector" — `baseIslandWithResources` (`TileResources.fixtures.ts:41`) with a `positionedBy` entry added, built the same way.

Ratio: 65% (non-Food), 44.8% (Food, = 65/1.45 rounded to one decimal). Side: always `left`. No change to `island-tile-slots.types.ts`. Doc update at `docs/architecture/systems-and-visuals.md:109` per acceptance criterion 5.
