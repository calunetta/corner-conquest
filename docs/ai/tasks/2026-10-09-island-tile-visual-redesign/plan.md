# Plan: Island tile visual redesign (resources, base layout, cloud density)

Status: APPROVED. Phase 1 shipped, committed (f30ad4a). Phase 2 (TileResources + IslandTile base layout): File plan/Contracts locked for ui-design.md §B Round 2's final values (Base resource node size `22%`, crest `44%`/`18px`-floor) — architect-b re-reviewed and approved (Phase 2 round 3).
Inputs: triage.md, ui-design.md (Final spec, APPROVED)

## Goal and acceptance criteria
- [ ] Perimeter clouds visibly and densely cover the outer ocean margin all the way around the board, not just thin clusters at the four corners and sparse edge points.
- [ ] `TileResources` sprite placement reads as a coherent, intentional island composition at normal play zoom (85% desktop default), not a scattered/odd arrangement — exact target defined by ui-designer-a/b after reviewing the current live render.
- [ ] The active-collector sprite on a resource node sits at the side of that specific node (not overlapping/centered on it) at a size that doesn't look undersized next to the resource sprite it's farming.
- [ ] `IslandTile`'s Base layout (castle + tree forest + base resource nodes + idle collectors + anchored boat) fits without overlap and reads clearly at both desktop and mobile tile sizes.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `FIXED_CLOUD_LAYOUT` | `src/modules/map/components/MapDecorations/MapDecorations.map.ts:32-96` | Confirmed 48 entries (not 40): 4 corner clusters × 5 = 20, plus 4 edges × 7 = 28. Re-read in this session: top edge's rightmost corner-cluster cloud (`cloud-tl-4`, `left: '4%'`) sits ~12 points of `left` away from the first edge cloud (`cloud-t1`, `left: '16%'`), confirming ui-design.md's measured gap. Static array; the Phase 1 fix is 8 new entries, listed below. |
| `CloudDef` type | `MapDecorations.types.ts:10-19` | `{ id, src, left, top, width, height, opacity?, desktopOnly? }` — the 8 new entries must match this shape exactly; no new fields. |
| `toVisibleDecorations` | `MapDecorations.map.ts:98-103` | Filters `desktopOnly` entries for mobile. All 8 new entries ship with `desktopOnly: false` (or omitted) per ui-design.md, so they appear on both breakpoints — this function needs no code change. |
| `MapDecorations.map.test.ts:1-55` | same folder | Existing tests assert `toVisibleDecorations(false)` returns the full `FIXED_CLOUD_LAYOUT` array and `toVisibleDecorations(true)` excludes `desktopOnly` entries. These stay structurally valid after the fix (still dynamic, not hardcoded counts) but the *value* of `toVisibleDecorations(true).clouds.length` changes from today's 40 to 48 once 8 mid-edge entries are un-flagged — tester-b adds an explicit assertion for the new number rather than relying on the existing dynamic checks to catch a regression. |
| `grep -n "desktopOnly: true" MapDecorations.map.ts` | re-run this session | Confirms 16 `cloud-*` entries carry `desktopOnly: true` today (lines 35,36,42,43,49,50,56,57 = 8 corner wisps; lines 63,67,72,76,81,85,90,94 = 8 mid-edge). 48 original entries − 16 `desktopOnly` = 32 always-visible originals. Mobile today: 32 + 0 gap-fillers (not yet un-clipped) = matches ui-design.md's measured "exactly 40" DOM count pre-fix. After the fix: 32 always-visible + 8 newly-unflagged mid-edge + 8 gap-fillers (never `desktopOnly`) = 48 on mobile; 48 original + 8 gap-fillers = 56 on desktop (`isMobile` false never filters). |
| `MapDecorations.preview.tsx:6-20` | same folder | Already has "Desktop" and "Mobile" states rendering `<MapDecorations isMobile={false / true} />` — this is what `ui-verify` screenshots; no new preview file or state needed for Phase 1. |
| `TileResources.map.ts` | `src/modules/map/components/TileResources/TileResources.map.ts:1-143` | `SINGLE_RESOURCE_SLOT`/`DUAL_RESOURCE_SLOTS`/`TRIPLE_RESOURCE_SLOTS`/`BASE_RESOURCE_SLOTS` (lines 36-58), `getSlot` (60-71), `toTileResourcesViewModel` (73-143, Food ×1.45 inflation at 117-119, collector construction at 135-140). All re-verified against the file on disk this session. |
| `TileResources.types.ts` | same folder, 16 lines | `ResourceNodeViewModel.slotStyle` is a closed type `{ top?/bottom?/left?/right?/transform?: string }` (line 13) — no `width`/`height` keys today; `farmingCollector` is `{ color, sprite } | null` (line 14) — both need extending, see Contracts. |
| `TileResources.styles.ts` | same folder, 8 lines | `collectorOverlay` (line 6) is `'absolute -top-3.5 -right-2 z-[35] w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[...]'` — fixed Tailwind position/size classes tied to the node's **inflated** box, confirmed this is what detaches the badge from Food's sheep sprite. |
| `TileResources.tsx` | same folder, 58 lines | `TileResourcesView` (8-51): node wrapper sets `style={{ ...node.slotStyle, width: nodeSize+'px', height: nodeSize+'px' }}` (18-22, slotStyle spread **before** the explicit px width/height, so slotStyle can never override size today); collector `<Image>` hardcodes `width={32} height={32}` (40-41) regardless of `styles.collectorOverlay`'s actual box size. |
| `TileResources.fixtures.ts` | same folder, 59 lines | `resourceIslandWithFood` (1 food, amount 1 → 1 node, SINGLE slot), `resourceIslandWithDualResources` (gold amount 2 + wood amount 1 → 3 expanded nodes, TRIPLE slots — the "Dual" in its name refers to the gold resource's duplicated amount, not total node count; re-verified, not a naming bug), `baseIslandWithResources` (Base, 2 resource types), `monsterIslandWithLivingMonsters`, `singleNodeFixture` (a `ResourceNodeViewModel` literal, `farmingCollector: null`). No existing fixture yields exactly 2 total expanded nodes. |
| `TileResources.preview.tsx` | same folder, 65 lines | `multipleResourceNodes` (9-27): gold node `spriteSrc: '/sprites/gold.gif'` (line 14, exists on disk but is not the real Gold sprite), wood node `spriteSrc: '/sprites/wood.gif'` (line 22, confirmed **does not exist** in `public/sprites/` — 404). `withCollectorNode` (29-41): `farmingCollector.sprite: '/sprites/collector_blue_idle.gif'` (line 38) — this file exists on disk but doesn't match production: `FARM_SPRITES.blue` (`TileResources.map.ts:6`) is `/sprites/farm_blue.gif`. All three literals will need `nodeSize`/`farmingCollector` shape updates once Contracts below land. |
| `public/sprites/` | directory listing, this session | Confirmed present: `mine.png`, `mine_active.png`, `tree.gif`, `sheep.gif`, `farm_blue.gif`, `gold.gif` (exists, wrong sprite), `collector_blue_idle.gif` (exists, wrong sprite for this component). Confirmed **absent**: `wood.gif`. |
| `IslandTile.tsx` | `src/modules/map/components/IslandTile/IslandTile.tsx:42-60,100,102,106` | Base case (42-60): castle crest (`baseImageWrapper`, Image `fill`) + `<TileResources island={island} isBase />` as siblings inside `baseContent`. `TileForest`/`TileBoats`/`TileOccupants` are siblings of `getTileCenterContent`'s output, not nested inside it (100,102,106) — confirmed, matches ui-design.md's citation fix. No `.map.ts` exists for this component; Base composition is pure JSX/CSS, no view-model field changes needed. |
| `IslandTile.styles.ts` | same folder, 68 lines | `baseImageWrapper` (line 51): `'relative h-12 w-12 drop-shadow-[...] sm:h-14 sm:w-14'` — a **fixed px size tied to Tailwind's `sm:` window-width breakpoint (640px), not to the tile's own responsive size `T`**. At mobile `T`'s low end (46px), this 48px crest exceeds the tile itself. **Round 2 (this session): now in scope, not a deferred Risk** — ui-design.md's Final spec (§B Round 2, "Decision 2" plus its floor correction) locks a percent-of-`T` replacement; see Decisions point 7 and Contracts below. |
| `IslandTile.fixtures.ts` | same folder, 92 lines | `baseIslandOwnedByLocalPlayer`/`baseIslandOwnedByOpponent` (36-42): both `resources: []` — confirmed, zero not one. No fixture today has 2-3 Base resources. |
| `IslandTile.preview.tsx` | same folder, 152 lines | "Base island owned by local player/opponent" states (76-92) both use the zero-resource fixtures above — need a new state once a resourced Base fixture exists. |
| `TileBoats.types.ts:14-30` | `src/modules/map/components/TileBoats/` | `BOAT_CORNER_POSITIONS` (4 corners) + `CORNER_TRANSFORMS` (`translate(±50%, ±50%)` per corner) — confirmed: a corner-anchored box of width `W`% (of the tile) spans `[-W/2, +W/2]`% around that corner coordinate on each axis (e.g. `bl`: x ∈ `[-W/2, W/2]`, y ∈ `[100-W/2, 100+W/2]`, in top-left-origin percent coordinates). |
| `TileBoats.styles.ts:5` | same folder | `boatEntry: 'absolute w-[42%] h-[42%]'` — boat corner box is 42% of `T`; its corner-anchored footprint therefore spans ±21% of `T` around each tile corner on both axes (computed this session from the geometry above). This is the exclusion zone Base resource slots must clear. |
| `TileOccupants.styles.ts:8` | `src/modules/map/components/TileOccupants/` | Rider box is 29% of `T` (±14.5% around each corner) — a strict subset of the boat's 42%/±21% zone, so clearing the boat zone clears this one too. |
| `MapGrid.tsx:50` | `src/modules/map/components/MapGrid/MapGrid.tsx` | Confirmed desktop `clamp(94px, 12.5vh, 136px)`, mobile `clamp(46px, 13.5vw, 68px)` — re-verified this session, matches ui-design.md. |

## Decisions
- Cloud density fix (ui-design.md §A, APPROVED): add exactly 8 "gap-filler" cloud entries to `FIXED_CLOUD_LAYOUT` — one at each of the 8 corner-to-edge transitions (2 per edge × 4 edges) — reusing the existing `cloud_medium.png` sprite and the existing 0.78–0.9 opacity range. No new layout system, no change to `toVisibleDecorations` or `CloudDef`. This is the smallest change that closes the measured ~12-point gap: adding entries to a static array the component already iterates, vs. rewriting the cloud layout as a generative/grid algorithm (rejected — ui-design.md explicitly ruled this out per triage's recommendation, and it would touch `toVisibleDecorations`'s mobile-filtering contract for no measurable benefit).
- All 8 new entries get `desktopOnly: false` (omitted, same as the type's optional default) and sit fully inside the `0%`–`100%` box (`2%`/`98%` on the perpendicular axis, matching `FIXED_ROCK_LAYOUT`'s `3%`/`97%` corner-rock convention), so they paint under `MapGrid`'s `overflow-hidden` root and the testbed's `overflow-x-auto` canvas, both of which clip anything at or beyond `0%`/`100%` (revise pass: the original `-5%`/`105%` values were off-grid and never painted — fixed by preview-b).
- **Mid-edge mobile-parity fix (round 2, ui-design.md §A's second table).** 16 of the original 48 cloud entries carry `desktopOnly: true`, not 8: 8 corner-cluster "wisps" (`cloud-tl-2/-3`, `cloud-tr-2/-3`, `cloud-bl-2/-3`, `cloud-br-2/-3`) plus 8 mid-edge clouds, one pair per edge (`cloud-t2/t6`, `cloud-b2/b6`, `cloud-l2/l6`, `cloud-r2/r6`), verified by `grep -n "desktopOnly: true" MapDecorations.map.ts` this session. Losing the 8 mid-edge clouds on mobile opens a real ~22-point gap on every edge, not a harmless density drop. Fix: un-flag all 8 mid-edge entries (`desktopOnly: true` → removed) so they show on mobile too; leave the 8 corner wisps `desktopOnly: true` (corner-only decorative bonus — each corner keeps 3 non-`desktopOnly` clouds regardless, so removing the wisps on mobile creates no edge gap). The 4 left/right mid-edge entries (`cloud-l2`, `cloud-l6`, `cloud-r2`, `cloud-r6`) additionally need their `left` moved from the off-box `-4%`/`104%` to the in-box `2%`/`98%` — same width-axis clipping bug as the original gap-fillers, confirmed by ui-design.md's screenshot crops showing only a 1-2px sliver at the old value. The 4 top/bottom mid-edge entries (`cloud-t2`, `cloud-t6`, `cloud-b2`, `cloud-b6`) only strictly need the flag removed (their height-axis offset was already 29-34% visible), but ui-design.md's table also moves their `top` to `2%`/`98%` for pattern consistency across all 8 — applied here rather than treated as optional, since a uniform fix is simpler to verify than two different conventions for the same bug.
- **Net coverage, corrected**: desktop shows all 56 entries (48 original + 8 gap-fillers; `isMobile=false` never filters). Mobile shows 48 of 56: 32 always-visible originals (48 − 16 `desktopOnly`) + 8 newly-unflagged mid-edge + 8 gap-fillers (never `desktopOnly`). The remaining 8-entry desktop/mobile gap is confined to the corner wisps, which don't affect edge coverage. (Superseded: an earlier pass of this plan claimed "8 of 48 are `desktopOnly`, mobile 48 of 56" with the wrong mechanism — only the corner-cluster count was right; it missed the 8 mid-edge entries and their required edit, which round-2 review caught.)
- **Round-3 left/right outer-cluster fix.** preview-b's round-3 pass found 10 more clipped entries, all on the width axis of the wide (918px-class) desktop board: `cloud-l1` (`left: '-6%'`), `cloud-l3` (`'-7%'`), `cloud-l4` (`'-4%'`), `cloud-l5` (`'-7%'`), `cloud-l7` (`'-6%'`) on the Left Perimeter Edge group, and `cloud-r1` (`'106%'`), `cloud-r3` (`'107%'`), `cloud-r4` (`'104%'`), `cloud-r5` (`'107%'`), `cloud-r7` (`'106%'`) on the Right Perimeter Edge group — verified directly against `MapDecorations.map.ts` on disk this session (exact lines in Contracts below). None of these 10 carry `desktopOnly` (confirmed against the file's 16 `desktopOnly: true` hits, none of which are `l1/l3/l4/l5/l7/r1/r3/r4/r5/r7`) — they already rendered on both breakpoints, just outside the `0%`–`100%` box on this board's width, same root-cause bug as the original gap-fillers and the round-2 mid-edge fix. Fix: move `left` to `'2%'` (left group) / `'98%'` (right group) — the identical in-box convention already approved and shipped for `cloud-l2/l6/r2/r6` in round 2 and for the 8 gap-fillers in round 1. `top` is untouched on all 10 (not reported as clipped, and each entry's `top` is already a normal in-box value: `16%/38%/50%/62%/84%`). No new design decision: this reuses the same mechanism ui-designer-b already approved, applied to the 10 entries round 2 missed because round 2 only covered the one mid-edge pair per side, not the whole Left/Right Perimeter Edge cluster.
- **Phase 2 locked (this session).** Three independent fixes, all confined to `TileResources`'s internal composition plus a `TileResources.fixtures.ts`/`IslandTile.fixtures.ts` addition, plus a fourth fix found during implementation (below) to `IslandTile.styles.ts`'s `baseContent` class, plus a Round 2 fifth fix (point 7, below) to the castle crest's own sizing — Base composition's JSX structure (Verified-context row above) needed no *structural* change (no new element, no reorder), but the crest wrapper's `<div>` (`IslandTile.tsx:46`) now needs one inline `style` added, and its containing box (`baseContent`) needed a sizing fix:
  1. **Collector badge beside the node, not the inflated Food box.** `farmingCollector` gains `size`/`side`/`offset` fields, computed in `toTileResourcesViewModel` from the slot's **pre-Food-scale** `size` (`uninflatedSize`), not the inflated `nodeSize`: `badgeSize = max(22, round(uninflatedSize * 0.55))`; `side = 'left' if slot.right is set and slot.left is not, else 'right'` (avoids pushing the badge off-tile for right-anchored slots); `offset = round((nodeSize - uninflatedSize) / 2 - badgeSize / 2)` px, applied as the `side`-keyed CSS property, vertically centered via `top: 50%, transform: translateY(-50%)`. Verified against real slot sizes: Food single (`uninflatedSize=46, nodeSize=67`) → badge 25px at `right: -2px` (touches the sprite's edge, matching ui-design.md's criterion); Gold/Wood dual (`uninflatedSize=nodeSize=38`) → badge 22px (floor) at `-11px` (exactly half-overhang, same convention `CORNER_TRANSFORMS` already uses elsewhere). Rejected: computing the badge from `nodeSize` directly (today's approach) — that's the root cause of the detached-badge bug the spec calls out, so continuing to use it isn't a fix.
  2. **3-band scatter.** `SINGLE_RESOURCE_SLOT` moves from the top band (`top: 20%`) to the middle band (`top: 46%`, within ui-design.md's "45-50%" range), keeping its horizontal centering. `DUAL_RESOURCE_SLOTS` moves from two top-band slots to top+bottom (`20%`/`70%`, within the "68-72%" range), keeping the existing `14%` left/right stagger. `TRIPLE_RESOURCE_SLOTS` moves from top/top/(upper-)middle to top/middle/bottom (`20%`/`46%`/`70%`), alternating `left`/`right`/`left` per ui-design.md's "alternating side" instruction (the old triple's 3rd slot was horizontally centered via `transform: translateX(-50%)`; the new one drops that in favor of a `left: 12%` offset, consistent with the other two bands). Sizes (`46`/`38`/`32`px) are unchanged — only band position moves, matching ui-design.md's "keeping the existing left/right horizontal stagger per slot."
  3. **Base resource slots: edge-midpoint, not corner.** Replaced the 3 fixed-px corner slots (`{top:'6px',left:'6px'}` etc.) with 3 percent-of-`T` slots at `top-center` (`top: 4%, left: 50%`) and two bottom slots at `left: 35%`/`65%` (`bottom: 4%`, both transform-centered horizontally) — chosen, not ui-design.md's example `25%`/`75%`, because the geometry check below (done this session) showed `25%`/`75%` lands inside the boat corner box's exclusion zone. **Sized as a percentage of `T` (`22%`/`22%`, not px) — revised from `18%` to `22%` this session, per ui-design.md's Final spec (§B Round 2, "Decision 1").** ui-designer-a's live-browser legibility check at `T=46/68/94/136` found `18%` (≈8.3px at `T=46`) barely legible; `22%` (≈9-25px across the clamp range) reads as a legible sprite at every size, independently re-verified by ui-designer-b against the crest geometry (zero node/crest overlap at all 4 clamps, see point 7 below) — this is the Final, approved value, not the `18%` this plan locked in an earlier pass. Unlike the 3 non-Base slot groups (which stay fixed-px per existing precedent), Base slots scale as a percentage of `T` because two of them sit close together (`35%`/`65%`, 30 points of `T` apart) and a fixed px box that's fine at desktop's 136px `T` would mutually overlap at mobile's 46px `T`; percent-of-`T` sizing scales both the gap and the box together, so no overlap at either clamp extreme (verified: combined half-widths of two `22%`-wide boxes centered 30 points apart is `22%` of `T` < the `30%`-of-`T` center-to-center gap — holds at any `T` since both scale together). This requires extending `ResourceNodeViewModel.slotStyle` with optional `width`/`height` (percent strings) and reordering `TileResources.tsx`'s style spread so `slotStyle` can override the node's default px size — see Contracts.
     - **Corner-exclusion math, re-verified at `22%` this session**: the boat corner box (42% of `T`, `CORNER_TRANSFORMS`'s `±50%` translate) spans `±21%` of `T` around each tile corner on both axes (derived from `TileBoats.styles.ts:5`'s `w-[42%]`/`h-[42%]` and the corner-anchor translate in `TileBoats.types.ts:25-30`). A Base slot's box, horizontally centered via `translateX(-50%)` at `left: L%` with box width `W%`, spans `[L-W/2, L+W/2]`. At `L=35%, W=22%`: `[24%, 46%]` — clear of the `[-21%,21%]`/`[79%,121%]` boat zones by a 3-point margin (down from the 5-point margin at the superseded `18%` width, still clear, no collision). At `L=65%, W=22%`: `[54%, 76%]` — clear of `[79%,121%]` by the same 3-point margin. ui-design.md's own example (`25%`) would span `[14%,36%]` at `W=22%`, overlapping `[-21%,21%]` from `14%` to `21%` — a real collision; the rejection of `25%`/`75%` stands regardless of the width revision.
  4. **Superseded by point 7**: this plan previously flagged the castle crest's fixed-px sizing (`IslandTile.styles.ts:51`'s `baseImageWrapper`) as an unresolved, out-of-scope risk. ui-design.md's Final spec (§B Round 2) brings it into scope with a locked fix — see point 7 below and the Risks section.
  5. **Preview/sprite-path fixes** (ui-design.md's flagged bug, folded into the same `TileResources.preview.tsx` edit): `gold.gif` → `/sprites/mine.png` (idle Gold sprite), `wood.gif` → `/sprites/tree.gif` (the only real Wood sprite); additionally fixed `collector_blue_idle.gif` → `/sprites/farm_blue.gif` (matches `FARM_SPRITES.blue`, `TileResources.map.ts:6`) — this file exists so it wasn't 404ing, but it's the wrong sprite for this component's farming-collector concept (`FARM_SPRITES`, not the idle-boat-collector sprite set); cheap to fix while already editing this exact literal for the new `size`/`side`/`offset` fields.
  6. **`IslandTile.styles.ts`'s `baseContent`: found and fixed during implementation, not in the original lock.** implementer-a's preview check (preview-b) found Base resource nodes rendering at ~6px instead of the spec's ~8px at `T=46`. Root cause, verified this session against `IslandTile.tsx:44,100-106` and both styles files: `baseContent` (`IslandTile.styles.ts:50`, pre-fix) was `'relative flex h-full w-full items-center justify-center'`, a child of `centerContent` (`IslandTile.tsx:104`, `styles.centerContent = 'z-20 h-full w-full p-1'`, itself position:static — no `relative`/`absolute` class). Because `centerContent` is static, `baseContent`'s own `relative` keeps it as the positioning *context* for its own absolutely-positioned descendants (the Base resource nodes), but `baseContent`'s own box is still the non-positioned flow-layout size of `h-full w-full` of `centerContent`'s *content* box — i.e. inset by `centerContent`'s `p-1` (4px/side) on top of the button's own `border-2` (2px/side, already excluded from `centerContent`'s padding box). At `T=46`: button padding box `46 - 2×2 = 42px` → `centerContent`'s own content box (after its `p-1`) `42 - 2×4 = 34px` → an 18%-of-`T` Base slot (`BASE_RESOURCE_SLOTS`, Contracts above) resolves its percent width against this 34px box: `0.18 × 34 ≈ 6.1px`, matching the ~6px defect exactly. Fix (verified on disk, `IslandTile.styles.ts:50-52` comment, `baseContent` itself now at line 52): `baseContent` → `'absolute inset-0 flex items-center justify-center'`. Because the button (`styles.tile`, `IslandTile.styles.ts:6`) carries `relative` and `centerContent` does not, `baseContent`'s new `absolute` containing block skips `centerContent` entirely and resolves against the **button's own padding box** (`42px` at `T=46`, border already excluded) — matching the pattern `TileBoats.styles.ts:4`'s `container: '... absolute inset-0 ...'` and `TileOccupants.styles.ts:4`'s `container: 'absolute inset-0 ...'` already use as direct siblings of `centerContent` inside the same button (`IslandTile.tsx:100-106`). Post-fix: `0.18 × 42 ≈ 7.6px ≈ 8px`, matching the spec. This is the smallest correct fix — it touches one Tailwind string, on the one island-type-specific wrapper (`baseContent`, Base-only), not `centerContent` (shared by every island type: fog icon, monster stack, special star, non-Base resources), so no other island type's layout is touched. Confirmed no other side effect beyond `baseFallbackIcon`'s `h-full w-full` (`IslandTile.styles.ts:55`) growing with the same box, ~34px→~42px (~8px) when a Base has no owner color — already called out in the task's own framing, not newly found here. `baseImageWrapper`'s crest stays fixed-px (`h-12 w-12`/`sm:h-14 sm:w-14`) as of *this* fix — its own mobile-overflow risk is addressed separately by point 7 below, not by this `baseContent` edit. (Note: the ~6px→~8px arithmetic above used the then-current `18%` Base-slot width; point 3's revision to `22%` changes the final pixel outcome — post-fix container `42px` at `T=46` × `22%` ≈ `9.2px` — but doesn't change the `baseContent` root cause or fix, which is about the containing box, not the slot's own percentage.)
  7. **Castle crest: percent-of-`T`, not fixed px — `44%`, floored at `18px`.** Replaces `IslandTile.styles.ts:51`'s `baseImageWrapper` fixed `h-12 w-12 sm:h-14 sm:w-14` (48–56px, tied to Tailwind's `sm:` *window*-width breakpoint, not to the tile's own `clamp()`-based `T`) — locked in ui-design.md's Final spec (§B Round 2 "Decision 2" plus its floor correction) after ui-designer-a's live-browser check found the fixed box overlaps all 3 Base resource nodes at `T=46/68/94/136` except by coincidence at `T=136`. Fixed value: `width: 'max(18px, 44%)'` / `height: 'max(18px, 44%)'` as an inline style (or an equivalent CSS mechanism — implementer-b's call; the `44%`/`18px` numbers are locked, the mechanism is not), resolved against `baseContent` (`IslandTile.styles.ts:52`, `absolute inset-0` against the tile button's own padding box, point 6 above) — the same container `TileResources`' Base node percent positions already resolve against, so crest and nodes scale together. **Floor is `18px`, not the Round-2 first pass's `20px`.** `baseContent`'s containing block is the button's padding box, which excludes the button's own `border-2` (`IslandTile.styles.ts:6`, 4px total) — at `T=46` that box is `42px`, not `46px`, so `44% × 42 = 18.48px`, already below a `20px` floor. ui-designer-b's independent re-verification (ui-design.md round-2 review, live Playwright measurement) found the `20px` floor actually engaging at `T=46` (rendered crest height measured exactly `20px`), shrinking the crest/resource-node clearance to `0.09px` — not the ~2%-of-container margin the `44%` figure assumes elsewhere in the spec. Lowering the floor to `18px` lets the percentage govern instead (measured `18.46875px`, matching the unfloored `18.48px`), restoring a `~0.86px` margin on both the top and bottom node pairs, independently confirmed by ui-designer-b. At `T=68/94/136` the floor never engages (`44%` of the button's padding box there is `28.16px`+, always above `18px`), so this only changes behavior at the mobile-minimum clamp. No change to `IslandTile.styles.ts`'s `baseContent`, `baseImage`, `baseFallbackIcon`, or any Base-resource-slot position — this is a `baseImageWrapper`-only edit.
  - Rejected alternative (Base sizing): keep Base slots at fixed px like the other 3 slot groups. Rejected because the geometry check above shows a fixed px size that avoids overlap at desktop's 136px `T` necessarily overlaps at mobile's 46px `T` (and vice versa) — percent-of-`T` is the only one-size-fits-both-clamps answer, not a stylistic preference.
  - Rejected alternative (crest floor): keep the `20px` floor from ui-design.md's first Round-2 pass. Rejected — disproven by ui-designer-b's independent live-browser measurement showing it actually engages at `T=46` and shrinks the real clearance to `0.09px`, not the margin the `44%` figure was meant to guarantee.
  - Rejected alternative (collector badge): size the badge as a percentage of `T` like the Base slots. Rejected — the badge is already correctly proportioned to its *resource node's* px size (`uninflatedSize`), not the tile; nodes themselves are fixed-px, so a px-derived badge size is consistent with its own node and simpler (no new "percent of what" question for a child-of-a-child element).
  - Rejected alternative (`baseContent` fix): remove `centerContent`'s `p-1` instead of changing `baseContent`. Rejected — `centerContent` is shared by every island type (fog icon, monster stack, special star, non-Base `TileResources`), so that edit's blast radius is every tile, not just Base; `baseContent` is Base-only, so fixing it there is strictly smaller.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/map/components/MapDecorations/MapDecorations.map.ts` | edit | Append 8 new entries, edit 8 existing mid-edge entries in place (desktopOnly + position), AND edit 10 existing left/right outer-cluster entries' `left` in place — exact values in Contracts below. | implementer-b |
| `src/modules/map/components/MapDecorations/MapDecorations.map.test.ts` | edit | Add tests: `FIXED_CLOUD_LAYOUT.length === 56`; all `id`s unique; `toVisibleDecorations(true).clouds.length === 48`; `toVisibleDecorations(false).clouds.length === 56`. | tester-b |

Phase 2 file plan (locked by architect-a this session):
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/map/components/TileResources/TileResources.types.ts` | edit | Extend `ResourceNodeViewModel.slotStyle` with optional `width?`/`height?` (percent strings, Base slots only); replace `farmingCollector`'s inline type with the new `FarmingCollectorViewModel` (`size`/`side`/`offset` added). | implementer-a |
| `src/modules/map/components/TileResources/TileResources.map.ts` | edit | Reposition `SINGLE_RESOURCE_SLOT`/`DUAL_RESOURCE_SLOTS`/`TRIPLE_RESOURCE_SLOTS` into 3 bands; replace `BASE_RESOURCE_SLOTS` with 3 percent-of-`T` edge-midpoint slots; compute `farmingCollector.size`/`side`/`offset` in `toTileResourcesViewModel`; push `width`/`height` into `slotStyle` when a slot defines them. Exact values in Contracts. | implementer-a |
| `src/modules/map/components/TileResources/TileResources.styles.ts` | edit | Trim `collectorOverlay` to drop the fixed `-top-3.5 -right-2 w-7 h-7 sm:w-8 sm:h-8` classes (position/size now computed per-node and applied inline) — keep only `absolute z-[35] drop-shadow-[...]`. | implementer-b |
| `src/modules/map/components/TileResources/TileResources.tsx` | edit | Reorder the node wrapper's `style=` so `node.slotStyle` is spread **after** the explicit px `width`/`height` (lets Base slots' percent `width`/`height` override); build the collector `<div>`'s `style=` from `farmingCollector.size`/`side`/`offset` instead of Tailwind classes; collector `<Image>` `width`/`height` read from `farmingCollector.size` instead of the hardcoded `32`. | implementer-b |
| `src/modules/map/components/TileResources/TileResources.fixtures.ts` | edit | Add `resourceIslandWithTwoDistinctResources` (wood amount 1 + gold amount 1 → exactly 2 expanded nodes, exercises `DUAL_RESOURCE_SLOTS`) — no existing fixture yields exactly 2 total nodes. | implementer-a |
| `src/modules/map/components/TileResources/TileResources.preview.tsx` | edit | Fix `gold.gif` → `/sprites/mine.png`, `wood.gif` → `/sprites/tree.gif`, `collector_blue_idle.gif` → `/sprites/farm_blue.gif`; update the 3 `ResourceNodeViewModel`/`FarmingCollectorViewModel` literals to the new fields. | implementer-b |
| `src/modules/map/components/TileResources/TileResources.map.test.ts` | edit | Logic tests for the new band positions, Base slot `width`/`height`, and the collector `size`/`side`/`offset` formula. | tester-a |
| `src/modules/map/components/TileResources/TileResources.test.tsx` | edit | View tests: collector `<div>`'s inline style carries the new `size`/`side`/`offset`-derived values; Base node renders `width`/`height` as percent strings. | tester-b |
| `src/modules/map/components/IslandTile/IslandTile.fixtures.ts` | edit | Add `baseIslandWithThreeResources` (Base island, 3 distinct resource types, 1 each — exercises all 3 `BASE_RESOURCE_SLOTS`). Today's Base fixtures have `resources: []`. | implementer-a |
| `src/modules/map/components/IslandTile/IslandTile.preview.tsx` | edit | Add a "Base island with resources" preview state using the new fixture. | preview-a |
| `src/modules/map/components/IslandTile/IslandTile.test.tsx` | edit | Add a view test rendering the new Base-with-resources fixture, asserting all 3 resource `data-testid`s are present alongside the crest. | tester-b |
| `src/modules/map/components/IslandTile/IslandTile.styles.ts` | edit | Two fixes, both this file, both implementer-b: (1) Found during implementation, not in the original lock (Decisions point 6): fix `baseContent` from `'relative flex h-full w-full items-center justify-center'` to `'absolute inset-0 flex items-center justify-center'`, matching `TileBoats`/`TileOccupants`' containing-block pattern so `TileResources`' percent-of-`T` Base slots resolve against the tile's own padding box, not doubly inset by `centerContent`'s `p-1`. (2) Round 2, Decisions point 7: drop `baseImageWrapper`'s fixed `h-12 w-12 sm:h-14 sm:w-14` classes (size now set inline, see `IslandTile.tsx` row below). Exact values in Contracts. | implementer-b |
| `src/modules/map/components/IslandTile/IslandTile.tsx` | edit | Round 2, Decisions point 7: add `style={{ width: 'max(18px, 44%)', height: 'max(18px, 44%)' }}` (or an equivalent CSS mechanism) to the crest wrapper `<div className={styles.baseImageWrapper}>` at line 46 — the only JSX change in this task; no element added, removed or reordered. | implementer-b |

`IslandTile.tsx`'s JSX *structure* (Verified-context row above) needed no change — Base composition was already correct; `TileResources`' own slot positions, `IslandTile.styles.ts`'s `baseContent`/`baseImageWrapper` classes, and (Round 2) one inline style on the existing crest wrapper `<div>` are the only changes.

## Contracts
### Phase 1 (locked)
No type changes — the 8 new entries are plain `CloudDef` object literals appended to the existing `FIXED_CLOUD_LAYOUT` array in `MapDecorations.map.ts`. Insert them as a new `// Corner-to-Edge Gap Fillers` comment block after line 95 (the last Right Perimeter Edge Cloud), before the closing `];`:
```ts
// Corner-to-Edge Gap Fillers
{ id: 'cloud-t0', src: '/sprites/cloud_medium.png', left: '9%', top: '2%', width: 74, height: 48, opacity: 0.8 },
{ id: 'cloud-t8', src: '/sprites/cloud_medium.png', left: '91%', top: '2%', width: 74, height: 48, opacity: 0.8 },
{ id: 'cloud-b0', src: '/sprites/cloud_medium.png', left: '9%', top: '98%', width: 74, height: 48, opacity: 0.8 },
{ id: 'cloud-b8', src: '/sprites/cloud_medium.png', left: '91%', top: '98%', width: 74, height: 48, opacity: 0.8 },
{ id: 'cloud-l0', src: '/sprites/cloud_medium.png', left: '2%', top: '9%', width: 74, height: 48, opacity: 0.8 },
{ id: 'cloud-l8', src: '/sprites/cloud_medium.png', left: '2%', top: '91%', width: 74, height: 48, opacity: 0.8 },
{ id: 'cloud-r0', src: '/sprites/cloud_medium.png', left: '98%', top: '9%', width: 74, height: 48, opacity: 0.8 },
{ id: 'cloud-r8', src: '/sprites/cloud_medium.png', left: '98%', top: '91%', width: 74, height: 48, opacity: 0.8 },
```
Values are ui-design.md §A's revised table (revise pass, corrected `-5%`/`105%` → `2%`/`98%` after preview-b found the old values clipped by `overflow-hidden`/`overflow-x-auto` and never painted), transcribed verbatim (ids, sprite, left/top, width/height, opacity all match; sprite size is 74×48, not 74×74). `desktopOnly` is omitted (defaults to falsy via `?:`), matching the other non-`desktopOnly` entries' style in this file (e.g. `cloud-tl-1` has no `desktopOnly` key at all — follow that convention, don't write `desktopOnly: false` explicitly).

**Important — the code currently on disk does not match this table.** `MapDecorations.map.ts:97-105` already has a "Corner-to-Edge Gap Fillers" block (git status shows this file modified), but its 8 entries still use the old, broken off-box values (`top: '-5%'`/`'105%'` for `cloud-t0/t8/b0/b8`, `left: '-5%'`/`'105%'` for `cloud-l0/l8/r0/r8`). implementer-b's job is to edit those 8 existing lines to the `2%`/`98%` values in the table above, not to append a second block.

**Second edit — 8 existing mid-edge entries, in place (round 2).** Edit these 8 lines of `FIXED_CLOUD_LAYOUT` (verified against `MapDecorations.map.ts` on disk at the line numbers shown; other fields — `src`, `width`, `height`, `opacity` — are unchanged):

| id | current line | field | from | to |
|---|---|---|---|---|
| `cloud-t2` | `MapDecorations.map.ts:63` | `top` | `'-4%'` | `'2%'` |
| `cloud-t2` | same line | `desktopOnly` | `true` | removed (key deleted) |
| `cloud-t6` | `MapDecorations.map.ts:67` | `top` | `'-4%'` | `'2%'` |
| `cloud-t6` | same line | `desktopOnly` | `true` | removed |
| `cloud-b2` | `MapDecorations.map.ts:72` | `top` | `'104%'` | `'98%'` |
| `cloud-b2` | same line | `desktopOnly` | `true` | removed |
| `cloud-b6` | `MapDecorations.map.ts:76` | `top` | `'104%'` | `'98%'` |
| `cloud-b6` | same line | `desktopOnly` | `true` | removed |
| `cloud-l2` | `MapDecorations.map.ts:81` | `left` | `'-4%'` | `'2%'` |
| `cloud-l2` | same line | `desktopOnly` | `true` | removed |
| `cloud-l6` | `MapDecorations.map.ts:85` | `left` | `'-4%'` | `'2%'` |
| `cloud-l6` | same line | `desktopOnly` | `true` | removed |
| `cloud-r2` | `MapDecorations.map.ts:90` | `left` | `'104%'` | `'98%'` |
| `cloud-r2` | same line | `desktopOnly` | `true` | removed |
| `cloud-r6` | `MapDecorations.map.ts:94` | `left` | `'104%'` | `'98%'` |
| `cloud-r6` | same line | `desktopOnly` | `true` | removed |

After this edit, e.g. `cloud-t2` reads `{ id: 'cloud-t2', src: '/sprites/cloud_small.png', left: '27%', top: '2%', width: 60, height: 40, opacity: 0.78 }` — no `desktopOnly` key at all, matching the omitted-key convention. `cloud-l2` reads `{ id: 'cloud-l2', src: '/sprites/cloud_small.png', left: '2%', top: '27%', width: 60, height: 40, opacity: 0.78 }`. `left`/`top` values not listed above (`cloud-t2`'s `left: '27%'`, `cloud-l2`'s `top: '27%'`, etc.) are unchanged from today's file. No `CloudDef` field changes — `desktopOnly` already exists as an optional field; this only flips its value and nudges `left`/`top` on these 8 entries.

**Third edit — 10 existing left/right outer-cluster entries, `left` only (round 3).** Edit these 10 lines of `FIXED_CLOUD_LAYOUT` (verified against `MapDecorations.map.ts` on disk at the line numbers shown; `src`, `top`, `width`, `height`, `opacity` are unchanged, and none of these 10 has a `desktopOnly` key to begin with):

| id | current line | field | from | to |
|---|---|---|---|---|
| `cloud-l1` | `MapDecorations.map.ts:80` | `left` | `'-6%'` | `'2%'` |
| `cloud-l3` | `MapDecorations.map.ts:82` | `left` | `'-7%'` | `'2%'` |
| `cloud-l4` | `MapDecorations.map.ts:83` | `left` | `'-4%'` | `'2%'` |
| `cloud-l5` | `MapDecorations.map.ts:84` | `left` | `'-7%'` | `'2%'` |
| `cloud-l7` | `MapDecorations.map.ts:86` | `left` | `'-6%'` | `'2%'` |
| `cloud-r1` | `MapDecorations.map.ts:89` | `left` | `'106%'` | `'98%'` |
| `cloud-r3` | `MapDecorations.map.ts:91` | `left` | `'107%'` | `'98%'` |
| `cloud-r4` | `MapDecorations.map.ts:92` | `left` | `'104%'` | `'98%'` |
| `cloud-r5` | `MapDecorations.map.ts:93` | `left` | `'107%'` | `'98%'` |
| `cloud-r7` | `MapDecorations.map.ts:95` | `left` | `'106%'` | `'98%'` |

`top` stays exactly as on disk for all 10: `cloud-l1`/`cloud-r1` keep `top: '16%'`, `cloud-l3`/`cloud-r3` keep `'38%'`, `cloud-l4`/`cloud-r4` keep `'50%'`, `cloud-l5`/`cloud-r5` keep `'62%'`, `cloud-l7`/`cloud-r7` keep `'84%'`. E.g. after this edit `cloud-l1` reads `{ id: 'cloud-l1', src: '/sprites/cloud_medium.png', left: '2%', top: '16%', width: 76, height: 50, opacity: 0.82 }`; `cloud-r1` reads `{ id: 'cloud-r1', src: '/sprites/cloud_medium.png', left: '98%', top: '16%', width: 76, height: 50, opacity: 0.82 }`. No `CloudDef` field changes and no `desktopOnly` key added — these entries already have none.

### Phase 2 (locked)

**`TileResources.types.ts`** — extend `slotStyle` and replace `farmingCollector`'s inline type:
```ts
export interface ResourceNodeViewModel {
  type: ResourceType;
  key: string;
  spriteSrc: string;
  nodeSize: number;
  slotStyle: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
    transform?: string;
    width?: string;   // percent, Base slots only
    height?: string;  // percent, Base slots only
  };
  farmingCollector: FarmingCollectorViewModel | null;
}

export interface FarmingCollectorViewModel {
  color: PlayerColor;
  sprite: string;
  /** px; badge is square. ~55% of the node's pre-Food-scale slot size, floored at 22px. */
  size: number;
  /** Which side of the resource sprite the badge sits on — 'left' when the node's own slot
   *  is right-anchored (avoids pushing the badge off-tile), 'right' otherwise. */
  side: 'left' | 'right';
  /** px offset from the node box's `side` edge to the badge's center. Negative = the badge
   *  overhangs past the node box (same half-overhang convention as TileBoats/TileOccupants'
   *  corner anchors). Applied as the CSS property named by `side`. */
  offset: number;
}
```

**`TileResources.map.ts`** — `SlotDef` gains optional `width`/`height`; 3 band groups reposition; `BASE_RESOURCE_SLOTS` replaced; collector fields computed from the slot's pre-inflation size:
```ts
interface SlotDef {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  transform?: string;
  size: number;      // px; reference size for the node box and the collector-badge formula
  width?: string;    // percent; Base slots only — overrides the node box's px size
  height?: string;   // percent; Base slots only
}

const SINGLE_RESOURCE_SLOT: SlotDef = {
  top: '46%',
  left: '50%',
  transform: 'translateX(-50%)',
  size: 46,
};

const DUAL_RESOURCE_SLOTS: SlotDef[] = [
  { top: '20%', left: '14%', size: 38 },
  { top: '70%', right: '14%', size: 38 },
];

const TRIPLE_RESOURCE_SLOTS: SlotDef[] = [
  { top: '20%', left: '12%', size: 32 },
  { top: '46%', right: '12%', size: 32 },
  { top: '70%', left: '12%', size: 32 },
];

const BASE_RESOURCE_SLOTS: SlotDef[] = [
  { top: '4%', left: '50%', transform: 'translateX(-50%)', size: 26, width: '22%', height: '22%' },
  { bottom: '4%', left: '35%', transform: 'translateX(-50%)', size: 26, width: '22%', height: '22%' },
  { bottom: '4%', left: '65%', transform: 'translateX(-50%)', size: 26, width: '22%', height: '22%' },
];
```
`getSlot` is unchanged (still indexes into these same 4 arrays by `idx`/`total`/`isBase`).

In `toTileResourcesViewModel`, after today's existing `nodeSize` calculation (`TileResources.map.ts:117-119`, unchanged), add the `width`/`height` push to `slotStyleEntries` and the collector-field formula:
```ts
    if (slot.width) slotStyleEntries.push(['width', slot.width]);
    if (slot.height) slotStyleEntries.push(['height', slot.height]);
    const slotStyle = Object.fromEntries(slotStyleEntries);

    const BADGE_SIZE_RATIO = 0.55;
    const BADGE_MIN_SIZE = 22;
    const uninflatedSize = slot.size; // pre-Food-scale reference, same value for all other types
    const badgeSize = Math.max(BADGE_MIN_SIZE, Math.round(uninflatedSize * BADGE_SIZE_RATIO));
    const badgeSide: 'left' | 'right' = slot.right !== undefined && slot.left === undefined ? 'left' : 'right';
    const badgeOffset = Math.round((nodeSize - uninflatedSize) / 2 - badgeSize / 2);

    return {
      type: node.type,
      key: `resource-node-${node.type}-${idx}`,
      spriteSrc,
      nodeSize,
      slotStyle: slotStyle as Record<string, string>,
      farmingCollector: positionedPlayer
        ? {
            color: positionedPlayer.color,
            sprite: FARM_SPRITES[positionedPlayer.color],
            size: badgeSize,
            side: badgeSide,
            offset: badgeOffset,
          }
        : null,
    };
```
(`BADGE_SIZE_RATIO`/`BADGE_MIN_SIZE` are module-level constants, declared once near the top of the file, not re-declared per node — shown inline above only to keep the formula's inputs visible together.)

**`TileResources.styles.ts`** — `collectorOverlay` trimmed to just the layer/shadow classes (position and size now computed per-node and applied inline):
```ts
collectorOverlay: 'absolute z-[35] drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]',
```

**`TileResources.tsx`** — node wrapper's style spread order flips (`slotStyle` last, so Base's percent `width`/`height` win over the default px); collector `<div>`/`<Image>` read size/position from `farmingCollector`:
```tsx
<div
  key={node.key}
  data-testid={`resource-node-${node.type}`}
  className={styles.nodeSlot}
  style={{
    width: `${node.nodeSize}px`,
    height: `${node.nodeSize}px`,
    ...node.slotStyle,
  }}
>
  <div data-testid={`resource-sprite-${node.type}`} className={styles.resourceSprite}>
    <Image src={node.spriteSrc} alt={`${node.type} resource`} width={node.nodeSize} height={node.nodeSize}
      className={styles.image} unoptimized />
  </div>

  {node.farmingCollector && (
    <div
      data-testid={`collector-farm-${node.farmingCollector.color}`}
      className={styles.collectorOverlay}
      style={{
        width: `${node.farmingCollector.size}px`,
        height: `${node.farmingCollector.size}px`,
        top: '50%',
        transform: 'translateY(-50%)',
        [node.farmingCollector.side]: `${node.farmingCollector.offset}px`,
      }}
    >
      <Image
        src={node.farmingCollector.sprite}
        alt={`${node.farmingCollector.color} collector farming`}
        width={node.farmingCollector.size}
        height={node.farmingCollector.size}
        className={styles.collectorImage}
        unoptimized
      />
    </div>
  )}
</div>
```

**Verified example values** (for implementer-a/tester-a to cross-check, not to hardcode as magic numbers beyond what's shown above):
| Case | `slot.size` (uninflated) | `nodeSize` | `badgeSize` | `badgeSide` | `badgeOffset` |
|---|---|---|---|---|---|
| Single Food (middle band) | 46 | 67 (`round(46×1.45)`) | 25 (`round(46×0.55)`) | `right` (slot has `left`, no `right`) | `-2` (`round((67-46)/2 - 25/2)`) |
| Dual slot 0 (Gold/Wood, top) | 38 | 38 (no inflation) | 22 (floor; `round(38×0.55)=21`) | `right` | `-11` (`round(0 - 11)`) |
| Dual slot 1 (bottom) | 38 | 38 | 22 (floor) | `left` (slot has `right`, no `left`) | `-11` |
| Triple slot 2 (bottom, `left: 12%`) | 32 | 32 | 22 (floor; `round(32×0.55)=18`) | `right` | `-11` |

**Base-slot corner-clearance check** (boat corner box spans `±21%` of `T` around each corner, Verified-context above): Base slot 1 (`left: 35%`, `width: 22%`) spans `[24%, 46%]`; slot 2 (`left: 65%`) spans `[54%, 76%]` — both clear of `[-21%,21%]`/`[79%,121%]` by a 3-point margin, at any `T`. (Revised from `18%`/5-point margin — see Decisions point 3.)

**`IslandTile.styles.ts`** — `baseImageWrapper`, Round 2 fix (Decisions point 7): drop the fixed-size Tailwind classes, keep position/shadow:
```ts
// was: baseImageWrapper: 'relative h-12 w-12 drop-shadow-[...] sm:h-14 sm:w-14',
baseImageWrapper: 'relative drop-shadow-[...]',
```

**`IslandTile.tsx`** — crest wrapper `<div>` (line 46) gains an inline `style` for the size this class used to set:
```tsx
<div
  className={styles.baseImageWrapper}
  style={{ width: 'max(18px, 44%)', height: 'max(18px, 44%)' }}
>
```
(or the equivalent CSS-variable/`clamp()` mechanism implementer-b prefers — the `44%`/`18px` numbers are locked, not the mechanism; it must resolve against `baseContent`, `IslandTile.styles.ts:52`, same container as the Base resource nodes). No other prop or child of this `<div>` changes. No other key in `IslandTile.styles.ts` changes; `baseContent`, `baseImage`, `baseFallbackIcon` are unaffected by this edit.

**`IslandTile.styles.ts`** — found during implementation (Decisions point 6): `baseContent`'s containing-box fix, one class string:
```ts
// was: baseContent: 'relative flex h-full w-full items-center justify-center',
baseContent: 'absolute inset-0 flex items-center justify-center',
```
No other field or type change. `baseImageWrapper`, `baseImage`, `baseFallbackIcon` and every other key in `IslandTile.styles.ts` are unchanged.

## Phases
### Phase 1: Design pass + cloud density (lower risk, independent of the other two)
1. ~~`preview-a`/browser screenshot~~ — done (ui-designer-a's session captured `testbed-map-decorations-state-Desktop--desktop.png`).
2. ~~`ui-designer-a` propose~~ — done, ui-design.md §A.
3. ~~`ui-designer-b` review~~ — done, APPROVED.
4. `architect-a`/`architect-b`: lock the 8 exact entries into this plan's Contracts (done above); architect-b reviews this plan.
5. `implementer-b`: fix the 8 gap-filler entries already in `FIXED_CLOUD_LAYOUT` to the `2%`/`98%` values per Contracts (don't append a duplicate block — they're already on disk, just at the wrong, off-box values); edit the 8 existing mid-edge entries (`cloud-t2/t6/b2/b6/l2/l6/r2/r6`) in place per the second Contracts table (desktopOnly removed on all 8; `left`/`top` moved to `2%`/`98%` on all 8); AND edit the 10 existing left/right outer-cluster entries (`cloud-l1/l3/l4/l5/l7`, `cloud-r1/r3/r4/r5/r7`) in place per the third Contracts table (`left` only moved to `2%`/`98%`; `top` untouched; no `desktopOnly` key on these). No other code change.
6. `tester-b`: add to `MapDecorations.map.test.ts`: `FIXED_CLOUD_LAYOUT.length === 56`; all `id`s unique; `toVisibleDecorations(true).clouds.length === 48`; `toVisibleDecorations(false).clouds.length === 56`.
7. `preview-a`: re-check `/testbed/map-decorations` "Desktop" and "Mobile" states already in `MapDecorations.preview.tsx` — no new preview file needed.
8. `preview-b`/`ui-verify`: screenshot both states, confirm no gap wider than ~8% of the board's side anywhere on the perimeter including mobile's 4 mid-edge gaps, confirm no new console errors, and confirm a DOM count of `[data-testid="decorative-cloud"]` is exactly 56 on `?state=Desktop` and exactly 48 on `?state=Mobile`.
9. Commit.
10. Stop and ask the user to type `continue` before Phase 2 (per project workflow — this phase's cloud change should be checked live before the larger resource/base layout work starts).

### Phase 2: TileResources + IslandTile base layout rework
1. ~~`architect-a`/`architect-b`: turn the approved resource/base-layout portion of the design spec into exact file-plan values and contracts~~ — done, this session (File plan + Contracts above). `architect-b` reviews this plan next.
2. `implementer-a`: `TileResources.types.ts`, `TileResources.map.ts`, `TileResources.fixtures.ts`, `IslandTile.fixtures.ts` per Contracts/File plan.
3. `implementer-b`: `TileResources.styles.ts`, `TileResources.tsx`, `TileResources.preview.tsx`, `IslandTile.styles.ts` (`baseContent` + `baseImageWrapper`), `IslandTile.tsx` (crest wrapper inline style) per Contracts/File plan.
4. `tester-a`: `TileResources.map.test.ts` — new band/collector-formula/Base-slot assertions.
5. `tester-b`: `TileResources.test.tsx`, `IslandTile.test.tsx` view tests.
6. `preview-a`: `IslandTile.preview.tsx` new "Base island with resources" state.
7. `preview-b`/`ui-verify`: screenshot `testbed/tile-resources` (all 4 states) and `testbed/island-tile`'s Base states at both the desktop (94px/136px) and mobile (46px/68px) tile-size clamps; check every acceptance criterion in ui-design.md's Phase 2 list, including the Round 2 criteria: Base resource nodes render at `22%` of `T` (not `18%`), the crest is percent-of-`T` (`44%`, `18px` floor) not fixed px, and zero crest/resource-node overlap at `T=46/68/94/136`.
8. Commit.

Model escalation: this phase's logic (the collector-badge formula, the percent-vs-px Base-slot sizing, the corner-clearance math) is less mechanical than Phase 1's value edits — escalate `implementer-a` and `tester-a` to sonnet; `implementer-b`'s edits (style trim, JSX reorder, preview literal updates) are closer to mechanical and can stay on haiku unless they hit the same complexity.

## Test plan
### Phase 1
- tester-b, `MapDecorations.map.test.ts`: `expect(FIXED_CLOUD_LAYOUT).toHaveLength(56)`; `expect(new Set(FIXED_CLOUD_LAYOUT.map((c) => c.id)).size).toBe(FIXED_CLOUD_LAYOUT.length)` for uniqueness; `expect(toVisibleDecorations(true).clouds).toHaveLength(48)` (was 40 before the mid-edge un-flag); `expect(toVisibleDecorations(false).clouds).toHaveLength(56)`. Existing 4 tests in this file stay structurally valid (they derive counts dynamically) but their *values* change once the mid-edge entries are un-flagged — the new explicit-48/56 assertions are what actually pins the corrected number down.
- `preview-b`/`ui-verify`, DOM-count check (ui-design.md's acceptance criteria): `document.querySelectorAll('[data-testid="decorative-cloud"]')` (or `getAllByTestId('decorative-cloud')` in `MapDecorations.test.tsx`-style query) returns exactly 56 elements at `/testbed/map-decorations?state=Desktop` and exactly 48 at `?state=Mobile`.

### Phase 2 (locked)
- `TileResources.map.test.ts` (tester-a):
  - `SINGLE_RESOURCE_SLOT`'s node lands at `top: '46%'` (middle band), not `'20%'`.
  - A 2-node island (`resourceIslandWithTwoDistinctResources`) produces one node at `top: '20%'` and one at `top: '70%'` (top+bottom, not both in the top 40%).
  - A 3-node island (`resourceIslandWithDualResources`, already 3 nodes) produces nodes at `top: '20%'`, `'46%'`, `'70%'` with alternating `left`/`right`/`left`.
  - `isBase` nodes' `slotStyle` includes `width: '22%'` and `height: '22%'`, and positions are `{top:'4%',left:'50%'}`, `{bottom:'4%',left:'35%'}`, `{bottom:'4%',left:'65%'}` (one per `BASE_RESOURCE_SLOTS` index).
  - Positioned Food single node: `farmingCollector.size === 25`, `.side === 'right'`, `.offset === -2`.
  - Positioned Dual-slot node (non-Food, `size: 38`): `farmingCollector.size === 22` (floor), `.offset === -11`; slot 0 `.side === 'right'`, slot 1 `.side === 'left'`.
  - Existing tests (`nodeSize` for Food/Wood/Gold, `farmingCollector.color`/`.sprite`, monster/empty-island nulls) stay green unedited — additive fields only.
- `TileResources.test.tsx` (tester-b): the collector `<div>` for a positioned Gold node carries inline `style` with `width`/`height` matching `farmingCollector.size` and the `[side]` key set to `${offset}px`; a Base node's wrapper `<div>` carries inline `width: '22%'`/`height: '22%'`.
- `IslandTile.test.tsx` (tester-b): rendering `baseIslandWithThreeResources` (isBase) shows the castle crest **and** all 3 `resource-node-*` test ids simultaneously (DOM presence only — jsdom has no real layout, so geometry/occlusion is `ui-verify`'s job, not this test's).

## Preview states
### Phase 1
- `MapDecorations.preview.tsx`'s existing "Desktop" and "Mobile" states — no new file, just re-screenshot per `ui-verify`.

### Phase 2 (locked)
- `TileResources.preview.tsx`'s 4 existing states ("Single food resource", "Multiple resources", "Resource with collector", "No resources") — re-screenshot after the sprite-path and field-shape fixes; no new state needed, the existing states already cover single/multi/collector/empty.
- `IslandTile.preview.tsx`: add "Base island with resources" (new, `baseIslandWithThreeResources`, `isBase: true`) alongside the existing "Base island owned by local player/opponent" (zero-resource) states — screenshot all three Base states at both the desktop and mobile tile-size clamps (`ui-verify` can simulate the clamp extremes via viewport width, per Phase 1's precedent).

## Risks
- Cloud density increase (8 more `<Image>` instances, 56 total) could hurt render cost; `MapDecorations.tsx` already renders all of `FIXED_CLOUD_LAYOUT` unconditionally, so this is a modest incremental cost on an existing pattern — check it isn't noticeably worse in the `ui-verify` browser check anyway.
- **Phase 2, resolved this session (Round 2)**: `IslandTile.styles.ts:51`'s castle crest (`baseImageWrapper`, previously a fixed 48px/56px box tied to Tailwind's `sm:` window-width breakpoint) is no longer left as an out-of-scope risk — ui-design.md's Final spec (§B Round 2) locks a percent-of-`T` fix (`44%`, `18px` floor, Decisions point 7, Contracts above), independently re-verified by ui-designer-b (zero crest/resource-node overlap at `T=46/68/94/136`, margin `~0.86px` at the worst-case `T=46`). This phase's Base-slot repositioning is now `22%`-of-`T` (revised from `18%`, Decisions point 3), verified clear of both the boat/occupant corner-anchor zones (3-point margin) and the crest (above). Residual risk: the `~0.86px` margin at `T=46` is thin — `preview-b` must still verify it in the browser (not just trust the math) as part of this phase's `ui-verify` pass, since a different browser's sub-pixel rounding or a future border-width tweak could erode it further (same caution ui-designer-b raised about the superseded `20px` floor).
- Base-slot percent sizing (`width`/`height` overriding the default px via style-spread reorder) is a small but real behavior change to `TileResources.tsx`'s style-merge order — verified safe for non-Base nodes (their `slotStyle` never sets `width`/`height`, so the reorder is a no-op for them), but worth a specific regression check in `tester-b`'s view tests (listed in Test plan) rather than relying on Base-only manual verification.
- **Resolved, not a residual risk**: `IslandTile.styles.ts`'s `baseContent` containing-box bug (Decisions point 6) — found by preview-b, fixed by implementer-a, verified by this review against the file on disk and the math above (~6px → ~8px at `T=46`). The pre-existing, separately-flagged crest/mobile-overflow risk (point 4 above) is unrelated and still open — this fix changes `baseContent`'s box size, not `baseImageWrapper`'s fixed px size, so it neither resolves nor worsens that risk.

## Review (architect-b)
VERDICT: APPROVED

Verified in this session:
- `FIXED_CLOUD_LAYOUT` (`src/modules/map/components/MapDecorations/MapDecorations.map.ts:32-96`): 48 entries confirmed (4×5 corner + 4×7 edge). `cloud-tl-4` is `left: '4%'` (line 37), `cloud-t1` is `left: '16%'` (line 62) — the ~12-point gap is real.
- `CloudDef` (`MapDecorations.types.ts:10-19`): the 8 literals in Contracts match the shape exactly (`id, src, left, top, width, height, opacity`, no `desktopOnly` key — matches the omitted-key convention other non-`desktopOnly` entries use, e.g. `cloud-t1`).
- `toVisibleDecorations` (`MapDecorations.map.ts:98-103`) needs no edit: filters only on `desktopOnly`, and none of the 8 new entries set it.
- New ids (`cloud-t0/t8/b0/b8/l0/l8/r0/r8`) don't collide with any existing id in the file.
- `MapDecorations.map.test.ts` (read in full): existing 4 tests compare against `FIXED_CLOUD_LAYOUT.length`/content dynamically, not a hardcoded 48 — they keep passing unedited, confirming plan's claim.
- `MapDecorations.test.tsx:16-148` (not in the file plan, correctly): every assertion there also reads `FIXED_CLOUD_LAYOUT.length` dynamically rather than a literal count, so it isn't broken by the append and didn't need a File plan entry. Grepped the repo for `FIXED_CLOUD_LAYOUT`/`MapDecorations.map` — the only other hits are docs (unrelated tasks' plans, the functionality audit) and this task's own files; no missed code path.
- `MapDecorations.preview.tsx:6-20`: "Desktop"/"Mobile" states already exist, confirming no new preview file is needed.
- File plan paths all resolve: `MapDecorations.map.ts`, `MapDecorations.map.test.ts` both exist at the stated paths; Phase 2's listed paths (`TileResources.map.ts/.styles.ts/.preview.tsx`, `IslandTile.tsx/.styles.ts/.fixtures.ts`) also exist, consistent with ui-design.md's citations.
- Design: smallest correct fix — appends to an existing static array the component already iterates, no new layout system, no touch to the mobile-filtering contract. Matches triage's explicit rejection of a generative/grid rewrite.

No findings. Phase 2 is correctly left unlocked pending this approval, per triage's phase split.

**Revise pass (prior session)**: ui-design.md §A was revised after preview-b found the original gap-filler values (`-5%`/`105%`) clipped by `MapGrid`'s `overflow-hidden` and the testbed's `overflow-x-auto`, never painting. Updated this plan's Decisions and Contracts to the corrected values (`2%`/`98%`, matching `FIXED_ROCK_LAYOUT`'s `3%`/`97%` convention, re-verified at `MapDecorations.map.ts:6-9`) and fixed the mobile-coverage math from the stale "40 of 56" to "48 of 56" (claimed 8 of the original 48 clouds are `desktopOnly`, all corner-cluster-only). Sprite size corrected to 74×48 (not 74×74) to match the table. Status returned to APPROVED.

## Review (architect-b), round 2
VERDICT: CHANGES REQUESTED

The round-1 "48 of 56" arithmetic above is itself wrong, and ui-design.md has since been revised a third time to fix the real bug — this plan was not updated to match.

1. **Independently re-verified the desktopOnly count — it's 16, not 8.** Ran `grep -n "desktopOnly: true" MapDecorations.map.ts` and `grep -n "cloud-.*desktopOnly: true"` myself (this session) against the file on disk: 16 `cloud-*` entries carry `desktopOnly: true`, not 8 — the 8 corner-cluster wisps this plan already lists (`cloud-tl-2`/`-3`, `cloud-tr-2`/`-3`, `cloud-bl-2`/`-3`, `cloud-br-2`/`-3`, lines 35-36/42-43/49-50/56-57) **plus 8 mid-edge clouds this plan's Decisions and the Review round-1 both missed**: `cloud-t2`/`t6` (lines 63/67), `cloud-b2`/`b6` (lines 72/76), `cloud-l2`/`l6` (lines 81/85), `cloud-r2`/`r6` (lines 90/94). So appending only the 8 new gap-fillers (as this plan's current File plan/Contracts specify) leaves mobile at 48 − 16 + 8 = 40 of 56, not 48 of 56 as this plan's Decisions claims.
2. **ui-design.md's current §A (re-read this session, lines 48-95) has since been revised a third time and now fixes this for real**, not by correcting the arithmetic but by changing the fix: un-flag the 8 mid-edge entries' `desktopOnly` (flip to `false`) and move 4 of them (`cloud-l2`/`l6`/`r2`/`r6`) inside the box (`left: '-4%'`/`'104%'` → `'2%'`/`'98%'`), with `cloud-t2`/`t6`/`b2`/`b6`'s matching `top` move to `2%`/`98%` specified in ui-design.md's table for pattern consistency (ui-design.md calls this part "optional polish, not required" but the table nonetheless specifies it — apply it, since "optional polish" undercuts the stated goal of a uniform fix). This is the real mechanism that gets mobile to 48 of 56 (32 always-visible originals + 8 newly-unflagged mid-edge + 8 gap-fillers), per ui-design.md lines 80 and 95.
3. **This plan's File plan and Contracts don't cover that edit at all.** The File plan's only `MapDecorations.map.ts` row says "Append the 8 gap-filler entries" — nothing about editing the 8 existing mid-edge entries. The Contracts section locks only the 8 new-entry literals. Required fix: add a Contracts table (or extend the existing one) with the exact before/after `desktopOnly`/`left`/`top` values for `cloud-t2`, `cloud-t6`, `cloud-b2`, `cloud-b6`, `cloud-l2`, `cloud-l6`, `cloud-r2`, `cloud-r6`, per ui-design.md's second table (its current lines 84-93), and update the File plan's `MapDecorations.map.ts` row to say "append 8 new entries and edit 8 existing mid-edge entries." Rewrite the Decisions mobile-coverage sentence from "8 of the original 48... all corner-cluster... mobile shows 48 of 56" to the corrected mechanism (16 desktopOnly originally; 8 corner wisps stay flagged, 8 mid-edge get un-flagged and repositioned; net mobile 48 of 56).
4. **Test plan gap, smaller**: ui-design.md's current acceptance criteria (its lines 113-116) add a DOM-count check — 56 `[data-testid="decorative-cloud"]` elements on `?state=Desktop`, 48 on `?state=Mobile` — on top of the array-length/unique-id test this plan already assigns to tester-b. The jest assertions (`length === 56`, unique ids) still hold unchanged and need no edit. But Phase 1's step 8 (preview-b/`ui-verify`) should explicitly check the 56/48 DOM count, not just "no gap wider than ~8%" — add that to the Phases/Test plan text so preview-b has the exact number to check instead of re-deriving it.

Confirmed correct and unaffected by the above: the 8 new gap-filler literals in this plan's Contracts (`cloud-t0/t8/b0/b8/l0/l8/r0/r8`) match ui-design.md's current §A first table (its lines 65-72) field-for-field — id, sprite, `left`/`top`, width×height, opacity all verified identical; none sit at or beyond `0%`/`100%`; all omit `desktopOnly` matching the file's non-`desktopOnly` entries' convention; `2%`/`98%` is consistent with `FIXED_ROCK_LAYOUT`'s `3%`/`97%` corner-rock convention (`MapDecorations.map.ts:6-9`, re-verified). `CloudDef`'s shape (`MapDecorations.types.ts:10-19`) and `toVisibleDecorations` (`MapDecorations.map.ts:108-113`, re-verified — line numbers in this plan's Verified-context row are stale by a few lines but the function itself is unchanged) still need no code change for the new entries; they do need to keep working correctly once the 8 existing entries' `desktopOnly` flags flip, which they will since the filter is generic.

Route back to architect-a: extend File plan, Contracts and Decisions per finding 3, and the Phases/Test plan text per finding 4. Re-review once updated.

**Revise pass (architect-a, this session) — resolves round 2.** Re-read ui-design.md's current §A in full and re-verified against `MapDecorations.map.ts` on disk (`grep -n "desktopOnly: true"`, confirmed 16 `cloud-*` hits: 8 wisps at lines 35/36/42/43/49/50/56/57, 8 mid-edge at lines 63/67/72/76/81/85/90/94 — matches finding 1 exactly). Changes made:
- File plan's `MapDecorations.map.ts` row now reads "append 8 new entries AND edit 8 existing mid-edge entries in place (desktopOnly + position)."
- Contracts gained a second table (before/after `left`/`top`/`desktopOnly` for `cloud-t2/t6/b2/b6/l2/l6/r2/r6`, with exact current line numbers) and a note that the gap-filler block already exists on disk at the old broken values — implementer-b edits those 8 lines rather than appending a duplicate block.
- Decisions rewritten with the corrected mechanism (16 `desktopOnly` originally, not 8; 8 wisps stay flagged, 8 mid-edge un-flag + reposition) and the corrected net coverage (56 desktop, 48 mobile), explicitly marking the prior "48 of 56 via 8 corner-only desktopOnly" sentence as superseded.
- Also applied ui-design.md's "optional polish" top/bottom `top` move to `2%`/`98%` as non-optional, per finding 2's reasoning (uniform fix easier to verify than two conventions for one bug) — t2/t6/b2/b6 now move `top` too, not just lose their flag.
- Phases step 5/6/8 and Test plan updated: step 5 now names both edits; tester-b's assertions add `toVisibleDecorations(true/false).clouds.length` checks (48/56); step 8 and the Test plan both specify the exact DOM-count check (56 `decorative-cloud` elements at `?state=Desktop`, 48 at `?state=Mobile`) ui-design.md's acceptance criteria require, verified the testid exists at `MapDecorations.tsx:40`.
- Re-verified the already-confirmed-correct parts (round 2's "Confirmed correct and unaffected" paragraph) are untouched: the 8 gap-filler literals, `CloudDef` shape, `toVisibleDecorations`'s generic filter needing no code change.

No further gap found against ui-design.md's current §A (both tables), its acceptance criteria (lines ~113-116), or the file on disk.

Status: APPROVED

## Review (architect-b), round 3
VERDICT: APPROVED

Re-verified this round-3 extension against ui-design.md's current §A and the file on disk:
- ui-design.md's current §A (re-read in full, lines 48-109): its first table (lines 63-72, gap-fillers) and second table (lines 84-93, mid-edge edits) match this plan's two Contracts tables field-for-field — ids, sprite, `left`/`top`, width×height, opacity, and `desktopOnly` disposition all identical. The second table's `top`-move for `cloud-t2/t6/b2/b6` (ui-design.md calls it "optional polish", this plan applies it as mandatory) is architect-a's documented, reasoned call (Decisions, point 2) — a uniform fix is simpler to verify than two conventions for one bug; not a deviation from the design, since ui-design.md's own table specifies the same `2%`/`98%` values regardless of the "optional" label.
- `grep -n "desktopOnly: true" MapDecorations.map.ts` run fresh this session on the committed `HEAD` version (`git show HEAD:...`, 48 entries, no gap-filler block) confirms the plan's premise: 16 `cloud-*` hits (8 corner wisps + 8 mid-edge), matching the plan's Decisions and both Contracts tables.
- `CloudDef` (`MapDecorations.types.ts:10-19`), `data-testid="decorative-cloud"` (`MapDecorations.tsx:40`), and both Phase 2 file-plan paths (`TileResources/`, `IslandTile/`, `ls` confirms every listed file exists) all check out.
- `MapDecorations.map.ts` on disk is mid-edit by implementer-b during this review (observed three different transient states across repeated reads in this session — fully-fixed, gap-filler-only-fixed, and still-broken); this is expected concurrent-agent noise, not a plan defect, since the plan's Contracts tables are the authoritative target regardless of the file's in-progress state. `progress.md`'s Phase 1 "implementation (implementer-b)" box is correctly still unchecked.
- `MapDecorations.map.test.ts`'s current diff (26 lines added, stable across repeated reads, unlike `.map.ts`) adds 3 tests ahead of plan lock: `FIXED_CLOUD_LAYOUT` length 56, unique ids, and "every gap filler id present in `toVisibleDecorations(true)`". These satisfy 2 of the plan's 4 assigned tester-b assertions (the 56-length and uniqueness checks) and don't conflict with any of them. They do **not** yet satisfy the other 2 — an explicit `expect(toVisibleDecorations(true).clouds).toHaveLength(48)` and `expect(toVisibleDecorations(false).clouds).toHaveLength(56)` — which the plan's Verified-context row (line 18) and Test plan both call for specifically because the file's other, pre-existing dynamic tests (`MapDecorations.map.test.ts`'s and `MapDecorations.test.tsx`'s filter-based assertions) derive their expected count from `FIXED_CLOUD_LAYOUT` itself and would stay green even if the mid-edge un-flag regressed. This is unfinished tester-b work, not a plan error; no change to plan.md needed — tester-b should add the two missing literal-count assertions per the Test plan section as already written.

No other findings.

**Revise pass (architect-a, this session) — addresses preview-b's round-3 finding (10 more clipped entries).** Re-read `MapDecorations.map.ts` on disk and verified the current `left`/`top`/`width`/`opacity` of all 10 flagged entries before locking values (no `desktopOnly` key on any of the 10, confirmed against the file's 16 `desktopOnly: true` hits): `cloud-l1` (`left: '-6%'`, `top: '16%'`, line 80), `cloud-l3` (`'-7%'`, `'38%'`, line 82), `cloud-l4` (`'-4%'`, `'50%'`, line 83), `cloud-l5` (`'-7%'`, `'62%'`, line 84), `cloud-l7` (`'-6%'`, `'84%'`, line 86), `cloud-r1` (`'106%'`, `'16%'`, line 89), `cloud-r3` (`'107%'`, `'38%'`, line 91), `cloud-r4` (`'104%'`, `'50%'`, line 92), `cloud-r5` (`'107%'`, `'62%'`, line 93), `cloud-r7` (`'106%'`, `'84%'`, line 95). Changes made:
- Decisions gained a "Round-3 left/right outer-cluster fix" bullet with the before values and the same reasoning as round 2 (identical mechanism, no new design decision).
- File plan's `MapDecorations.map.ts` row now also names the 10-entry `left`-only edit.
- Contracts gained a third table (before/after `left` for all 10, with current line numbers), stating explicitly that `top`/`src`/`width`/`height`/`opacity` are unchanged and no `desktopOnly` key exists on any of the 10.
- Phases step 5 now lists all three edits (gap-fillers, 8 mid-edge, 10 outer-cluster) so implementer-b has one place listing every required change.
- No test-count change: these 10 entries aren't `desktopOnly`, so they were already counted in `toVisibleDecorations`'s 48/56 totals — this is a pure repositioning fix, not an addition or a flag flip. Test plan and Phases step 6/8 (56/48 DOM-count and length assertions) are unaffected and need no edit.

Status: APPROVED (Phase 1, pending architect-b re-review of this round-4 extension)

## Review (architect-b), round 4
VERDICT: APPROVED

Re-verified the round-3 extension's third Contracts table (10 left/right outer-cluster entries) against `MapDecorations.map.ts` on disk this session, line by line:
- `cloud-l1` line 80 `left: '-6%'`, `cloud-l3` line 82 `'-7%'`, `cloud-l4` line 83 `'-4%'`, `cloud-l5` line 84 `'-7%'`, `cloud-l7` line 86 `'-6%'`, `cloud-r1` line 89 `'106%'`, `cloud-r3` line 91 `'107%'`, `cloud-r4` line 92 `'104%'`, `cloud-r5` line 93 `'107%'` — every line number and "from" value in the table matches the file exactly.
- `top` on all 10 unchanged and matches the table's claim: `l1`/`r1` `'16%'`, `l3`/`r3` `'38%'`, `l4`/`r4` `'50%'`, `l5`/`r5` `'62%'`, `l7`/`r7` `'84%'`. None of the 10 carries a `desktopOnly` key, confirmed against the file's 16 `desktopOnly: true` hits (lines 35,36,42,43,49,50,56,57,63,67,72,76,81,85,90,94 — none in the set `l1,l3,l4,l5,l7,r1,r3,r4,r5,r7`).
- `src`/`width`/`height`/`opacity` unchanged for all 10 per the table's claim, confirmed by direct comparison with the disk values.
- Grepped the repo for every one of these 10 ids (`cloud-l1`, `cloud-r1`, `cloud-l3`, `cloud-r3`, `cloud-l4`, `cloud-r4`, `cloud-l5`, `cloud-r5`, `cloud-l7`, `cloud-r7`) outside `node_modules`: only hit is `MapDecorations.map.ts` itself — no other code path references these ids, so no missed File plan entry.
- Target `'2%'`/`'98%'` values are the same in-box convention already shipped for the gap-fillers (round 1) and the mid-edge pair (round 2), both already fixed on disk at the time of this review (`cloud-t0/t8/b0/b8/l0/l8/r0/r8` at lines 98-105 all `2%`/`9%`/`91%`/`98%`; `cloud-t2/t6/b2/b6/l2/l6/r2/r6` at lines 63/67/72/76/81/85/90/94 all moved and un-flagged) — consistent, no new mechanism introduced.
- `MapDecorations.map.test.ts` (read in full) already contains the 48/56-length assertions the Test plan calls for (lines 70-76) — this is tester-b's in-progress work matching the plan, not a plan defect.
- No other File plan row, Contracts table or Decisions bullet needed for this extension; the 10-entry edit is purely a `left` reposition on existing non-`desktopOnly` entries, so the 48/56 mobile/desktop counts are unaffected, as the plan states.

No findings. Phase 1's plan (gap-fillers, 8 mid-edge edits, 10 outer-cluster edits) is fully locked and verified against the file on disk.

Status: APPROVED

## Review (architect-b), Phase 2
VERDICT: APPROVED

Verified this session, independently against the files on disk (not from the plan's own citations):

**Paths and symbols** — every file in the Phase 2 File plan exists at the stated path (`ls` on both component folders); re-grepped the whole repo for `farmingCollector`, `ResourceNodeViewModel`, `BASE_RESOURCE_SLOTS`, `slotStyle` — the only non-`TileResources` hits are `TileOccupants`' own unrelated `slotStyle` field (different type, same name, no collision since each module imports through its own index). `TileResources.map.ts`, `.types.ts`, `.styles.ts`, `.tsx` (full read): `SlotDef`, `SINGLE_RESOURCE_SLOT`/`DUAL_RESOURCE_SLOTS`/`TRIPLE_RESOURCE_SLOTS`/`BASE_RESOURCE_SLOTS`, `getSlot`, `toTileResourcesViewModel`, `collectorOverlay`'s exact fixed-class string, the node wrapper's `{...node.slotStyle, width, height}` spread order (slotStyle first, confirming the "needs reordering" claim) — all byte-for-byte match the plan's Verified-context quotes. `IslandTile.tsx:42-60/100/102/106` confirmed: Base case renders crest + `<TileResources island={island} isBase />` as siblings inside `baseContent`; `TileForest`/`TileBoats`/`TileOccupants` are siblings of `centerContent`, not nested in it — matches the citation fix ui-designer-b made and architect-a relied on. `IslandTile.styles.ts:51`'s `baseImageWrapper` is exactly `'relative h-12 w-12 drop-shadow-[...] sm:h-14 sm:w-14'`. `IslandTile.fixtures.ts:36-42`: both Base fixtures have `resources: []`, confirming no existing 2-3-resource Base fixture. `TileResources.fixtures.ts`/`.preview.tsx` (full read): confirms no existing fixture yields exactly 2 total expanded nodes (food→1, dual gold:2+wood:1→3, base→expands to 1-per-type regardless of amount); confirms `gold.gif`/`wood.gif`/`collector_blue_idle.gif` are the exact wrong preview paths claimed, and that `mine.png`, `mine_active.png`, `tree.gif`, `farm_blue.gif` exist on disk (`ls public/sprites/`) and are what `TileResources.map.ts`'s own `RESOURCE_SPRITES`/`FARM_SPRITES` catalogs use — `gold.gif` and `collector_blue_idle.gif` are legitimately used elsewhere in the repo (`resource-display.ts`, `LobbyBackground.map.ts`, `TileBoats.map.ts`) for a different sprite concept each, so the preview fix is correcting this component's own usage, not fighting a repo-wide convention.

**Collector-badge arithmetic**, recomputed independently from the Contracts formula, all 4 table rows: Food single (`uninflatedSize=46`, `nodeSize=round(46×1.45)=67`): `badgeSize=max(22,round(46×0.55)=25)=25`; `offset=round((67-46)/2-25/2)=round(10.5-12.5)=-2`. Dual slot 0/1 (`size=38`, no inflation): `badgeSize=max(22,round(38×0.55)=21)=22` (floor); `offset=round(0-11)=-11`. Triple slot 2 (`size=32`): `badgeSize=max(22,round(32×0.55)=18)=22` (floor); `offset=-11`. `badgeSide` formula (`'left' if slot.right set and slot.left unset, else 'right'`) checked against each slot's actual `left`/`right` key and matches every row's claimed side. All 4 rows check out exactly as the table states — no arithmetic error.

**Base-slot corner-clearance geometry**, independently derived, not just re-read: `TileBoats.types.ts:14-30` (`BOAT_CORNER_POSITIONS`, `CORNER_TRANSFORMS`) plus `TileBoats.styles.ts:5` (`w-[42%] h-[42%]`) confirm a corner box anchored at one tile corner with `translate(±50%,±50%)` spans exactly `±21%` of `T` around that corner on both axes — re-derived from CSS semantics (an un-transformed box at the corner spans `[0,42%]` on each axis from that corner; `translate(-50%,-50%)` shifts by half its own box size, i.e. `-21%`, centering it on the corner, giving `[-21%,21%]`), independent of the plan's own derivation and arriving at the same number. A Base slot box `width:18%` centered via `translateX(-50%)` at `left: L%` spans `[L-9, L+9]`. At `L=35`: `[26,44]`, clearing `[-21,21]` (bottom-left corner's x-zone) by 5 points — rectangle intersection requires overlap on *both* axes, so x-clearance alone is sufficient regardless of the two boxes' y-ranges, which do in fact overlap (Base slot's `bottom:4%` height `18%` box sits at y∈[78%,96%], inside the boat zone's y∈[79%,121%]) — the plan's x-only clearance argument is the right one and is sufficient, not an oversight. At `L=65`: `[56,74]`, clearing `[79,121]` (bottom-right corner) by 5 points. Confirmed ui-design.md's rejected `25%`/`75%` example does collide: `25%` spans `[16,34]`, overlapping `[-21,21]` over `[16,21]`; `75%` spans `[66,84]`, overlapping `[79,121]` over `[79,84]` — the plan's Decisions section shows only the first (left) collision, not the symmetric right-side one, but the number it corrected to (`35%/65%`) is the right fix either way; this is an incomplete narration, not a wrong conclusion — not blocking.

**Castle-crest risk, accurately described, not assumed**: `IslandTile.styles.ts:51` confirmed fixed `h-12 w-12 sm:h-14 sm:w-14` (48px, or 56px only past Tailwind's 640px *window*-width breakpoint — independent of the tile's own `clamp()`-based `T`). `MapGrid.tsx:50` confirms mobile `T`'s low end is `clamp(46px, 13.5vw, 68px)`, itself viewport-width-driven; on a phone viewport under 640px, `sm:` never applies, so the crest stays at 48px while `T` can be 46px — the crest alone exceeds the tile before any resource-slot change, independent of and prior to this phase's edits. Risk is correctly flagged as pre-existing, out of ui-design.md §B's 3 fix items, and left to `preview-b` to check in the browser rather than assumed to pass — not downplayed, not silently resolved.

**Test/code-impact check**: read `TileResources.map.test.ts`'s `nodeSize` assertions and `TileResources.test.tsx` in full — neither asserts a `className` string or a `slotStyle` position/order, so the `collectorOverlay` class trim and the node-wrapper style-spread reorder don't break any existing assertion; File plan's "additive fields only, existing tests stay green unedited" claim holds.

No findings. File plan, Contracts and Decisions are consistent with the code on disk and with each other.

Status: APPROVED

## Review (architect-b), Phase 2 round 2 — baseContent addition (Decisions point 6)

VERDICT: APPROVED

Re-verified this specific addition (Decisions point 6, File plan row 75, Contracts lines 301-306) against the files on disk this session, independently of architect-a's own verification:

- `IslandTile.styles.ts:52` on disk reads exactly `baseContent: 'absolute inset-0 flex items-center justify-center'`, with a comment at lines 50-51 explaining the fix — matches the Contracts block (lines 303-304) verbatim. No other key in the file changed (`baseImageWrapper`, `baseImage`, `baseFallbackIcon`, `centerContent` all unchanged, confirmed by full read).
- `IslandTile.tsx:42-60` confirmed: `baseContent` is used exactly once in the whole component, only in the `IslandType.Base` branch, wrapping the crest/fallback icon and `<TileResources island={island} isBase />`. Grepped the repo for `baseContent` outside this task's own docs: only hits are `IslandTile.tsx:44` and `IslandTile.styles.ts:52` — no other consumer. **Blast radius confirmed confined to Base tiles**: Monster (`renderMonsterIcons`), Special (`Star`), Resource (`TileResources isBase={false}`), and Empty tiles never reference `baseContent`, so this class change cannot affect their layout.
- Containing-block chain re-derived independently (not just re-read): `styles.tile` (`IslandTile.styles.ts:6`) carries `relative`; `centerContent` (`IslandTile.styles.ts:50` numbering pre-fix / now effectively unchanged, `'z-20 h-full w-full p-1'`) carries no `relative`/`absolute`, confirmed by direct read — so it is not a positioning context. Pre-fix `baseContent` (`relative ... h-full w-full`) sized itself to `centerContent`'s content box (flow layout), which is inset by `centerContent`'s own `p-1` (4px/side) beyond the button's padding box (itself inset by `border-2`, 2px/side). Post-fix `absolute inset-0` makes `baseContent`'s containing block the nearest positioned ancestor's **padding box** — that ancestor is the `button` (`relative`), not `centerContent` (static) — per CSS abspos semantics (inset offsets resolve against the containing block's padding edge). Arithmetic re-checked independently at `T=46`: button padcontent box `46 − 2×2 = 42px` (pre-fix effective box was `42 − 2×4 = 34px`); `0.18×34 ≈ 6.1px` vs `0.18×42 ≈ 7.6px ≈ 8px` — matches the plan's ~6px→~8px claim exactly.
- `TileBoats.styles.ts:4` (`container: 'pointer-events-none absolute inset-0 z-[25] select-none'`) and `TileOccupants.styles.ts:4` (`container: 'absolute inset-0 z-30 pointer-events-none'`) both confirmed on disk — both are direct siblings of `centerContent` inside the same button (`IslandTile.tsx:100,102,106`) and both already use `absolute inset-0` against that same button containing block. The fix makes `baseContent` consistent with an already-established pattern in this exact component tree, not a new one.
- No regression to non-Base tiles possible: `centerContent` itself (shared by every island type) is untouched: its `p-1` and lack of a position class are exactly as before, so fog icon, monster stack, special star and non-Base `TileResources` all size identically to pre-fix.

**Ownership note for the coordinator**: `IslandTile.styles.ts` is a `.styles.ts` file, which `component-architecture` assigns to implementer-b's lane; this specific line was written by implementer-a during a revise pass (per `progress.md`'s 2026-10-10 implementer-a (revise) log entry) while root-causing a bug it found, not by implementer-b. The fix itself is verified correct and minimal (one Tailwind string, Base-only blast radius) — not a plan defect, so it does not block this plan review. But per `agent-protocol`'s rule that "the owner must confirm the final version of their own file," implementer-b's subsequent revise-pass log entry only covers `IslandTile.preview.tsx`, not a confirmation of `IslandTile.styles.ts:52`. Recommend the coordinator have implementer-b do a brief confirm-pass over this one line (already correct, no content change expected) before Phase 2's final review, for lane accountability rather than correctness.

No findings that block approval. Status: APPROVED

## Review (architect-b), Phase 2 round 3 — crest percent-of-T sizing (Decisions point 7)

VERDICT: APPROVED

Scope: the new `IslandTile.tsx` File plan row (plan.md:78) and the re-locked `22%` Base-slot width against `TileBoats`' corner-anchor geometry, per this round's focus.

**`IslandTile.tsx` new row, verified against the file on disk**: read the file in full. Line 46 reads exactly `<div className={styles.baseImageWrapper}>`, inside the `IslandType.Base` branch (lines 42-60), as the plan's File plan row and Contracts (plan.md:310-317) claim — the inline `style={{ width: 'max(18px, 44%)', height: 'max(18px, 44%)' }}` the plan specifies adding is not yet on disk (expected: this is a plan review, not yet implemented). No other prop or child of this `<div>` on disk today, confirming the plan's "no other prop or child... changes" claim. `IslandTile.styles.ts:53` on disk still reads `baseImageWrapper: 'relative h-12 w-12 drop-shadow-[...] sm:h-14 sm:w-14'`, matching exactly what the Contracts section (plan.md:304-308) says to replace with `'relative drop-shadow-[...]'`. Grepped the repo for `baseImageWrapper` and `h-12 w-12`/`sm:h-14 sm:w-14`: only hits are `IslandTile.tsx:46` and `IslandTile.styles.ts:53` for the former; the latter's only other hits (`AttackSelectionDialog.styles.ts:14`, `ArmySelectionDialog.styles.ts:14`) are unrelated components' own `spriteWrap` classes, not the same class, so no other File plan row is missing. Grepped `docs/architecture/` for crest/`baseImageWrapper`: no hits — no `docs-sync` row needed for this change.

**22% corner-clearance re-derived independently from `TileBoats` geometry on disk, not from the plan's own numbers**: `TileBoats.types.ts:14-30` (`CORNER_TRANSFORMS`, `translate(±50%, ±50%)` per corner) plus `TileBoats.styles.ts:5` (`boatEntry: 'absolute w-[42%] h-[42%]'`) confirm a box anchored at one tile corner, translated by half its own box size, spans `[-21%, 21%]` of `T` around that corner on both axes — re-derived from the CSS semantics directly, same number the plan states. A Base slot box of width `22%` centered via `translateX(-50%)` at `left: L%` spans `[L-11, L+11]`:
- `L=35`: `[24%, 46%]` — clears the bottom-left corner's x-zone `[-21%, 21%]` by 3 points (`24-21=3`). Matches plan.md:302 and the Decisions point-3 sub-bullet's revised "3-point margin" claim exactly (down from the superseded 18%-width's 5-point margin).
- `L=65`: `[54%, 76%]` — clears the bottom-right corner's x-zone `[79%, 121%]` by 3 points (`79-76=3`). Matches.
- Rejected `25%`/`75%` alternative at the current `W=22%`: `25%` spans `[14%, 36%]`, overlapping `[-21%, 21%]` over `[14%, 21%]` — a real collision, confirming the plan's rejection still holds at the revised width (not just at the superseded 18%).

No arithmetic error found; the recomputation in Decisions point 3 and its corner-clearance sub-bullet (plan.md:302) is correct for `W=22%`, not stale leftover math from the `18%` pass.

**No other finding.** The Phase 2 File plan and Contracts are internally consistent with the code on disk for this round's two review targets.

Status: APPROVED
