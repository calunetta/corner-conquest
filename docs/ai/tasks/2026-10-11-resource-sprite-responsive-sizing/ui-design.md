# UI design: Resource sprite responsive sizing

## Spec (ui-designer-a)

### Purpose and user story
As a commander, I want resource nodes and the farming-collector badge on an island tile to scale with the tile's own rendered size, so they read clearly whether I'm on a large desktop window or a small mobile screen, instead of looking tiny on a big tile or oversized/overlapping on a small one.

This is a sizing-only fix. No sprite swap, no new sprite, no change to slot *positions* (the `top`/`left`/`right`/`bottom` percent table from `2026-10-11-island-tile-layout-consolidation` is unchanged and out of scope), no gameplay change.

### Root cause (verified in code)
- The tile itself is already responsive: `clamp(94px, 12.5vh, 136px)` desktop / `clamp(46px, 13.5vw, 68px)` mobile (`src/modules/map/components/MapGrid/MapGrid.tsx:49-51`).
- Boats (`TileBoats.styles.ts`: `w-[42%] h-[42%]` hull, `w-[40%] h-[40%]` collector) and occupants (`TileOccupants.styles.ts`: `w-[29%] h-[29%]`) are percent-of-tile and scale correctly at every tile width. Both also use Next's `fill` image mode (`TileBoats.tsx:26,33`, `TileOccupants.tsx:16`): the `<Image>` has no explicit pixel `width`/`height`, it fills whatever CSS box its percent-sized parent resolves to.
- Resource nodes and the collector badge are the opposite: `SlotDef.size` (`island-tile-slots.types.ts:38`, values 46/38/32/26) is a **fixed px number**, carried through `TileResources.map.ts` into `nodeSize` (px) and `farmingCollector.size`/`offset` (px), then applied in `TileResources.tsx:19-20,40-44` as literal `${n}px` inline styles and as numeric `width`/`height` props on `<Image>`. None of it reacts to the tile's live rendered width.
- One partial exception: `BASE_RESOURCE_SLOTS` (`island-tile-slots.types.ts:66-70`) already carries a `width: '22%', height: '22%'` override that wins over the px `size` at render time (`TileResources.tsx`'s inline `style` spreads `node.slotStyle` after the px `width`/`height`, and `slotStyle` only carries `width`/`height` for Base slots). Base's node *box* already renders correctly; only Single/Dual/Triple nodes, and the collector badge on every tile type including Base, are still px-fixed.

### The fix: match the boat/occupant pattern, including `fill`
Convert resource-node and badge sizing to percent-of-tile, and stop giving `<Image>` explicit pixel dimensions — exactly how `TileBoats`/`TileOccupants` already work. Two sub-fixes:

**1. Node box.** `SlotDef.size` becomes a percent-of-T number instead of px (same field name and same four tiers, reinterpreted). Scale factor: Base's `22%` is the one tier that already renders correctly today (hand-tuned, not part of the bug) — use it as the anchor and carry the other three tiers' existing px ratios onto it (factor `22/26 = 0.846`, rounded to the nearest whole percent):

| Slot table | Old `size` (px) | New `size` (% of T) |
|---|---|---|
| `SINGLE_RESOURCE_SLOT` | 46 | **39** |
| `DUAL_RESOURCE_SLOTS` | 38 | **32** |
| `TRIPLE_RESOURCE_SLOTS` | 32 | **27** |
| `BASE_RESOURCE_SLOTS` | 26 (legacy, box size was already overridden to 22% width/height) | **22** (now the single source — the separate `width`/`height` override fields on `SlotDef` are removed, every tier uses `size` the same way) |

Food keeps its existing 1.45x inflation (`FOOD_SCALE = 1.45`, `TileResources.map.ts:35`'s comment about the sheep sprite's transparent padding is unchanged), now applied to the percent instead of px, rounded to one decimal place (`toFixed(1)`):

| Slot table | Food-inflated `size` (% of T) |
|---|---|
| Single | 39 × 1.45 = **56.6** |
| Dual | 32 × 1.45 = **46.4** |
| Triple | 27 × 1.45 = **39.2** |
| Base | 22 × 1.45 = **31.9** |

Rendered node box: `width: '${inflatedSize}%'`, `height: '${inflatedSize}%'` (replaces the current px `nodeSize` style and the Base-only `slotStyle.width`/`height` override — one code path for all four tiers).

**2. Collector badge.** Today's px floor (`BADGE_MIN_SIZE = 22`, `TileResources.map.ts:36`) is computed in JS against the *uninflated* slot size, which can't know the tile's live pixel width — exactly the problem the triage flags ("JS-side `Math.max` can't know the live tile width"). Fix: express the badge size as percent-of-**node-box** (not percent-of-tile) and let the floor be a CSS `max()` expression, which *can* see the live resolved size:
- `BADGE_SIZE_RATIO = 0.55` is unchanged, but it's now a percent of the node's own rendered box, nested the same way `TileBoats`' collector (`w-[40%] h-[40%]`) nests inside the boat's own box.
- Because badge-as-percent-of-node must stay visually tied to the node's *uninflated* reference size (same intent as today: "every resource type gets the same badge" per `TileResources.map.ts:109`'s comment), the Food case divides the ratio by the Food inflation factor instead of multiplying a separate px number:

| Resource type | Badge size (CSS, as % of its own node box) |
|---|---|
| Wood, Gold (not inflated) | `max(22px, 55%)` |
| Food (inflated 1.45x) | `max(22px, 37.9%)` (= `0.55 / 1.45`, `toFixed(1)`) |

This one pair of values (`55%` / `37.9%`) applies to **every slot tier** — Single, Dual, Triple, Base — because it's relative to the node's own box, not the tile. That also means whether the 22px floor kicks in now depends only on the tile's *live* rendered pixel width (via the browser's own `max()` evaluation), not on which slot tier the author happened to pick — which is the actual bug fix the triage asked for ("a floor of 22px as a CSS floor rather than a JS one").

**3. Badge position — replace the px offset with a fixed corner-style transform.** The current `offset` (`TileResources.map.ts:114`, `Math.round((nodeSize - uninflatedSize) / 2 - badgeSize / 2)`) is arithmetic over two values that can each independently hit the 22px floor at runtime — there is no single percent that is correct in both the floored and non-floored case. Instead, anchor the badge at the node's edge midpoint and let `transform`'s own percentage (which CSS resolves against the *badge's own* final box, floored or not) do the centering — the same convention `CORNER_TRANSFORMS` already uses for boats (`island-tile-slots.types.ts:25-30`, `translate(50%, -50%)` etc.):

| `farmingCollector.side` | Badge style |
|---|---|
| `'right'` (badge overhangs the node's right edge) | `top: 50%`, `left: 100%`, `transform: translate(-50%, -50%)` |
| `'left'` (badge overhangs the node's left edge) | `top: 50%`, `right: 100%`, `transform: translate(50%, -50%)` |

`side` selection is unchanged (`TileResources.map.ts:112-113`). The `farmingCollector.offset` field is removed entirely — it's no longer computed or needed, the view applies the fixed per-side recipe above.

**4. `<Image>` sizing.** Remove the numeric `width`/`height` props on both the resource sprite and the collector sprite `<Image>` elements (`TileResources.tsx:28-29,50-51`); use the Next.js `fill` prop instead, matching `TileBoats.tsx:26-29,33-38` and `TileOccupants.tsx:16-20` exactly. No style change needed on `.resourceSprite` (`TileResources.styles.ts`: already `relative w-full h-full`, the same shape as `TileBoats.styles.ts`'s `.boat`); `.collectorOverlay` is already `absolute` and needs no wrapper, same as `TileBoats.styles.ts`'s `.collectorOverlay`.

### Type changes implied (for architect-a to confirm, not this stage's file to own)
- `island-tile-slots.types.ts` `SlotDef`: `size` is now percent-of-T (`number`, unit implied, same as every other percent field in this file); the `width?`/`height?` percent-override fields are removed (no longer needed — every tier now goes through `size` the same way).
- `TileResources.types.ts` `ResourceNodeViewModel.nodeSize`: becomes a CSS length string (e.g. `'39%'`, `'56.6%'`) instead of a px `number`.
- `TileResources.types.ts` `FarmingCollectorViewModel.size`: becomes a CSS length string carrying the `max()` expression (e.g. `'max(22px, 55%)'`) instead of a px `number`; `.offset` is removed.
- `ResourceNodeViewModel.slotStyle`: drop the `width?`/`height?` fields (no longer produced — see point 1 above, Base no longer needs a style override).

### Placement and layout
- Desktop (1280×720) and mobile (390×844): no placement change. Tile size (`clamp(94px, 12.5vh, 136px)` desktop / `clamp(46px, 13.5vw, 68px)` mobile) and the full `MAP_COLS`×`MAP_ROWS` grid are unaffected — this is purely a sizing fix inside each tile's existing resource-node/badge layer. z-order unchanged (`z-[28]` resource container, `z-[35]` badge, per `TileResources.styles.ts`).

### States
| State | What the player sees | Trigger |
|---|---|---|
| Single resource node (any tile size) | Node renders at 39% of T (56.6% for Food), scaling smoothly as the tile resizes between the mobile and desktop clamp ranges — no longer a fixed px size that looks tiny at 136px or oversized at 46px | `resourceIslandWithFood` fixture |
| Dual/Triple resource nodes | Nodes render at 32%/27% of T respectively (46.4%/39.2% for Food), same scaling behavior | `resourceIslandWithTwoDistinctResources`, `resourceIslandWithDualResources` fixtures |
| Base tile resources | Nodes render at 22% of T (31.9% for Food) — same value as today, now reached through the same code path as the other three tiers instead of a special-cased override | `baseIslandWithResources`, `baseIslandWithThreeResources` fixtures |
| Farming collector badge, large tile | Badge renders at 55% of its node's box (37.9% for a Food node), visibly scaled to the node | any fixture with `positionedBy` set |
| Farming collector badge, small tile (mobile clamp minimum, T≈46px) | Badge's CSS floor (`max(22px, …)`) takes over once the percent value would resolve under 22px, keeping the badge legible instead of shrinking to an unreadable speck | same fixtures, verified at 390×844 viewport |
| No resources / monster alive | Unchanged: renders nothing (`toTileResourcesViewModel` returns `null`) | `monsterIslandWithLivingMonster`, empty-resources fixtures |

### Components and tokens
- Reuse only: `next/image`'s `fill` prop (already used by `TileBoats.tsx`, `TileOccupants.tsx` — verified above), CSS `max()` (no Tailwind/shadcn equivalent needed, a plain inline-style string), and the existing `translate(±50%, ±50%)` corner-transform convention already defined in `island-tile-slots.types.ts:25-30`. No new visual pattern, no new component, no shadcn primitive involved — this is a unit-of-measurement fix to an existing presentation layer.
- No Tailwind/theme tokens touched (`bg-*`/`text-*`/`border-*` unaffected); every number here is a size or position, not a color.

### Copy
None. No player-facing text changes.

### Interactions and motion
Unchanged: resource sprites keep `hover:scale-110`/`transition-transform` (`TileResources.styles.ts: resourceSprite`), already respecting `prefers-reduced-motion` the same way they do today (no new motion introduced).

### Accessibility
No change: resource/collector `<Image>` elements keep their existing `alt` text (`"{type} resource"`, `"{color} collector farming"`, `TileResources.tsx:27,49`). Switching from numeric `width`/`height` to `fill` does not change the accessible name or role. No new interactive/focusable element is introduced.

### Acceptance criteria
<!-- Checked in the browser by the ui-verify skill, and/or by a unit test against the literal numbers above. -->
- [ ] At the mobile tile-size extreme (390×844 viewport, tile ≈46-68px), a resource node's rendered box is visibly proportional to the tile — no node overflowing past its tile's edge, no node reduced to an illegible sliver.
- [ ] At the desktop tile-size extreme (1280×720 viewport, tile ≈94-136px), the same node is visibly larger (in px) than at the mobile extreme, scaling with the tile instead of staying a fixed px size.
- [ ] `SINGLE_RESOURCE_SLOT.size === 39`, `DUAL_RESOURCE_SLOTS[*].size === 32`, `TRIPLE_RESOURCE_SLOTS[*].size === 27`, `BASE_RESOURCE_SLOTS[*].size === 22` (unit test on `island-tile-slots.types.ts`).
- [ ] A Food node's rendered `nodeSize` is `'56.6%'` / `'46.4%'` / `'39.2%'` / `'31.9%'` for Single/Dual/Triple/Base respectively; a non-Food node's is `'39%'` / `'32%'` / `'27%'` / `'22%'` (unit test on `TileResources.map.ts`).
- [ ] A positioned (farmed) node's `farmingCollector.size` is `'max(22px, 55%)'` for Wood/Gold and `'max(22px, 37.9%)'` for Food, for every slot tier (unit test on `TileResources.map.ts`).
- [ ] A positioned node's badge renders with `top: 50%` plus either (`left: 100%`, `transform: translate(-50%, -50%)`) for `side: 'right'` or (`right: 100%`, `transform: translate(50%, -50%)`) for `side: 'left'`, and no `offset` field exists on the view model (unit test + type check).
- [ ] Neither the resource sprite nor the collector-badge `<Image>` has a numeric `width`/`height` prop; both use `fill` (code inspection / snapshot test on `TileResources.tsx`).
- [ ] The `/testbed/tile-resources` preview's four existing states ("Single food resource", "Multiple resources", "Resource with collector", "No resources") render with no console error and no visible overlap or clipping, confirmed by `ui-verify` screenshots at both 1280×720 and 390×844.
- [ ] `docs/architecture/systems-and-visuals.md`'s resource-sizing description (wherever §6.13 or its successor documents `SlotDef.size`/badge sizing) is updated to describe percent-of-tile/percent-of-node sizing instead of px (owned by `docs-sync`, not this stage).

## Review (ui-designer-b)
VERDICT: CHANGES REQUESTED

Code verified: `island-tile-slots.types.ts:38-70`, `TileResources.map.ts:34-133`, `TileResources.tsx:18-55`, `TileResources.types.ts:8-37`, `TileBoats.styles.ts:1-14`, `TileBoats.tsx:1-45`. Node-size scale math (46/38/32/26 × 0.846 → 39/32/27/22) and the `BADGE_SIZE_RATIO`/Food-divide math (0.55, 0.55/1.45=37.9) check out.

1. **Badge floor can render bigger than its own node — new bug, not fixed.** `max(22px, 55%)` is evaluated against the node box, and 22px exceeds 55% of the node box across most of the size range, not just at the mobile extreme the spec calls out:
   - Mobile min (T=46px): node boxes are Single 17.9px / Dual 14.7px / Triple 12.4px / Base 10.1px; 55% of each is 9.8/8.1/6.8/5.6px, so **every tier floors to 22px — a badge larger than its own resource node** (22px vs a 17.9px node, worst case Base at 22px vs 10.1px, more than double).
   - Base tier floors across the *entire* desktop range too: at T=94-136px, Base node is 20.7-29.9px, 55% is 11.4-16.5px — always under 22px, so the Base-tier badge is pinned to 22px for every live tile size, including the case (T=94-120px-ish) where 22px badge ≈ or > the 20.7-26px node. This isn't a mobile-only edge case; it's the Base tile's normal desktop appearance.
   - This directly contradicts the acceptance criterion it's meant to satisfy (ui-design.md line 77: "keeping the badge legible... instead of shrinking to an unreadable speck") — the fix trades an undersized badge for an oversized one that overhangs past its own node, likely clipping into the tile edge or neighboring slots.
   - The codebase already solved this exact problem a different way: `TileBoats.tsx:32` (`showIdleCollectors` forced false on mobile) with the comment "the collector is a sub-legible speck at mobile tile sizes, so it is not rendered at all" — and `TileBoats.styles.ts:11-13`'s `collectorOverlay` has **no px floor at all**, pure `w-[40%] h-[40%]` of the boat box. The spec's "match the boat/occupant pattern" framing (line 16) does not actually match it here: boats solve small-badge legibility by hiding, not flooring.
   - **Fix**: drop the `max(22px, …)` floor; make `farmingCollector.size` a plain percent-of-node string (`'55%'` / `'37.9%'`), and reuse the existing `useIsMobile()` hide pattern from `TileBoats.tsx` — suppress the farming-collector badge on mobile the same way idle boat collectors are suppressed, instead of inventing a CSS-floor mechanism with no precedent. This also removes the only remaining px literal (`BADGE_MIN_SIZE`) cleanly instead of relocating it into a `max()` string, and keeps `TileResources` and `TileBoats` on one shared solution for the same problem (the "at most one new visual pattern" rule in skill `ui-design`).

2. **Rounding method named in the spec doesn't produce the spec's own numbers.** Line 28 says Food sizes are "rounded to one decimal place (`toFixed(1)`)", but verified in Node:
   - `(39*1.45).toFixed(1)` → `'56.5'`, not the table's `56.6` (line 32).
   - `(27*1.45).toFixed(1)` → `'39.1'`, not the table's `39.2` (line 34).
   - Root cause: `39*1.45` and `27*1.45` are not exactly representable in binary float (`56.549999999999997...`, `39.149999999999999...`), so `toFixed(1)` rounds down instead of to the mathematical `.55`/`.15` midpoint.
   - `Math.round(x*10)/10` does produce the table's values (`56.6`, `39.2`, and also `46.4`, `31.9` unaffected either way) — verified in Node.
   - This is a real contract gap: tester-a will pin acceptance-criteria literals (`'56.6%'`, `'39.2%'`) per line 98, and if implementer-a follows the prose ("`toFixed(1)`") instead of the table, the shipped code produces `'56.5%'`/`'39.1%'` and the test (correctly written against the table) fails, or vice versa.
   - **Fix**: line 28 and anywhere else "toFixed(1)" is prescribed as the method, replace with "rounded to one decimal place via `Math.round(x * 10) / 10`" so prose and table agree. Table values (56.6/46.4/39.2/31.9, 37.9) are unchanged.

3. **Minor wording correction, not blocking.** Accessibility section (line 91) implies motion is already reduced-motion-safe ("no change... already respecting prefers-reduced-motion the same way they do today"); verified in `TileResources.styles.ts:4` the `resourceSprite` class has no `motion-reduce:` variant, and no blanket rule exists in `src/app/globals.css` (grepped, no match). The claim is about parity with the *current* code, which is accurate (no regression), but "already respecting prefers-reduced-motion" overstates it — there's a pre-existing gap, out of scope for this bug fix. Folded into the Final spec below as a one-line correction; no change in scope.

Everything else checks out: the percent-of-tile node-size table and its scale factor, the `fill`-prop conversion (matches `TileBoats.tsx:26-29` and `TileOccupants.tsx:16` exactly, verified), the corner-transform badge-position fix (consistent with `CORNER_TRANSFORMS` convention, `island-tile-slots.types.ts:25-30`), the type changes (verified `slot.width`/`slot.height` has exactly the two call sites the spec assumes, `TileResources.map.ts:105-106`, safe to remove), copy (none), and layout/z-order (unchanged, verified `TileResources.styles.ts:1,5`). Mobile grid-fit, contrast and keyboard path are unaffected since no new interactive or colored element is introduced.

## Final spec
<the agreed spec; later stages rely only on this section>

Everything in "Spec (ui-designer-a)" above applies **except** the following three corrections:

**1. Collector badge sizing — pure percent-of-node, no px floor, hidden on mobile instead.**
Replace §"2. Collector badge" (and the `BADGE_MIN_SIZE`/`max()` mechanism throughout) with:
- `farmingCollector.size` is a plain percent-of-node-box string: `'55%'` for Wood/Gold, `'37.9%'` for Food (= `0.55 / 1.45`, rounded per the method in correction 2 below). No px floor, no `max()` expression.
- `BADGE_MIN_SIZE` constant is deleted, not relocated into CSS.
- The farming-collector badge is not rendered on mobile. Reuse the existing `useIsMobile()` pattern from `TileBoats.tsx` (where `showIdleCollectors` is forced `false` on mobile with the comment "the collector is a sub-legible speck at mobile tile sizes"): `TileResources` gains the same `isMobile`-gated suppression for `farmingCollector`, consistent with how the sibling component already handles the identical small-badge-legibility problem. (architect-a: decide whether this lives as a prop threaded in from the caller, same as `TileBoats`, or a direct `useIsMobile()` call inside `TileResources` — either is consistent with the existing pattern; implementer-a/b confirm which call site `TileResources` shares with `TileBoats`.)
- Acceptance criteria line 99 becomes: "A positioned (farmed) node's `farmingCollector.size` is `'55%'` for Wood/Gold and `'37.9%'` for Food, for every slot tier (unit test on `TileResources.map.ts`)."
- Acceptance criteria line 77 ("Farming collector badge, small tile... CSS floor takes over") is replaced: "Farming collector badge is not rendered at all below the mobile breakpoint (`useIsMobile()` true), matching `TileBoats`' idle-collector suppression; verified at 390×844 no collector badge is present in the DOM."
- `FarmingCollectorViewModel.size` type (ui-design.md line 64) stays a CSS length string but never carries `max()`; `TileResources.types.ts:28`'s comment updates to "percent of the node's own rendered box; not shown on mobile" instead of "floored at 22px."

**2. Rounding method.** Everywhere the spec says "rounded to one decimal place (`toFixed(1)`)" (line 28) or implies `.toFixed(1)` elsewhere, read: "rounded to one decimal place via `Math.round(x * 10) / 10`." All table values (39/32/27/22 unscaled; 56.6/46.4/39.2/31.9 Food-scaled; 55%/37.9% badge) are unchanged and verified to match this method in Node (`node -e` session, this review).

**3. Accessibility wording.** Line 91's "already respecting prefers-reduced-motion the same way they do today" is replaced with: "No change: resource/collector `<Image>` elements keep their existing `alt` text and hover-scale behavior unchanged (pre-existing lack of a `motion-reduce:` variant on `.resourceSprite` is out of scope for this sizing fix). Switching from numeric `width`/`height` to `fill` does not change the accessible name or role."

All other sections of "Spec (ui-designer-a)" — root cause, node-box sizing table and scale factor, badge position (corner-transform), `<Image>`/`fill` conversion, type changes, placement/layout, states (except the two lines corrected above), components/tokens, copy, and the remaining acceptance criteria — stand as written and are approved.
