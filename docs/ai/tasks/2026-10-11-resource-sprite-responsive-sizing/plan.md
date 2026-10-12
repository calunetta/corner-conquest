# Plan: Resource sprite responsive sizing

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec)

## Goal and acceptance criteria
- [ ] `SlotDef.size` is percent-of-tile, not px: `SINGLE_RESOURCE_SLOT.size === 39`, `DUAL_RESOURCE_SLOTS[*].size === 32`, `TRIPLE_RESOURCE_SLOTS[*].size === 27`, `BASE_RESOURCE_SLOTS[*].size === 22`; `SlotDef.width`/`.height` are removed.
- [ ] A resource node's rendered `nodeSize` is a CSS percent string: `'56.6%'`/`'46.4%'`/`'39.2%'`/`'31.9%'` for Food Single/Dual/Triple/Base, `'39%'`/`'32%'`/`'27%'`/`'22%'` for Wood/Gold at the same tiers.
- [ ] A farmed node's `farmingCollector.size` is `'55%'` for Wood/Gold and `'37.9%'` for Food, for every slot tier, with no px floor and no `offset` field.
- [ ] A positioned node's badge renders `top: 50%` plus (`left: 100%`, `transform: translate(-50%, -50%)`) for `side: 'right'` or (`right: 100%`, `transform: translate(50%, -50%)`) for `side: 'left'`.
- [ ] Neither the resource sprite nor the collector-badge `<Image>` has a numeric `width`/`height` prop; both use `fill`.
- [ ] The farming-collector badge does not render when `useIsMobile()` is true (same suppression `TileBoats` applies to idle collectors).
- [ ] At 390×844 a resource node's box is visibly proportional to its tile (no overflow, no illegible sliver); at 1280×720 the same node is visibly larger in px than at 390×844.
- [ ] `/testbed/tile-resources`'s four states render with no console error and no visible overlap/clipping at both viewports.
- [ ] `docs/architecture/systems-and-visuals.md` lines 94 and 108 describe percent-of-tile/percent-of-node sizing, not px (docs-sync).

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `SlotDef` | `src/modules/map/island-tile-slots.types.ts:32-41` | `size` field (px today) and the Base-only `width`/`height` override being removed |
| `SINGLE_RESOURCE_SLOT`, `DUAL_RESOURCE_SLOTS`, `TRIPLE_RESOURCE_SLOTS`, `BASE_RESOURCE_SLOTS` | `island-tile-slots.types.ts:43-70` | the four slot tables whose `size` values change (46/38/32/26 px → 39/32/27/22 %) |
| `toTileResourcesViewModel` | `src/modules/map/components/TileResources/TileResources.map.ts:51-133` | owns `nodeSize`, `slotStyle`, `farmingCollector` computation |
| `BADGE_SIZE_RATIO`, `BADGE_MIN_SIZE` | `TileResources.map.ts:35-36` | `BADGE_MIN_SIZE` is deleted; `BADGE_SIZE_RATIO` (0.55) stays |
| `getSlot` | `TileResources.map.ts:38-49` | unchanged, returns the `SlotDef` for a node index |
| `ResourceNodeViewModel`, `FarmingCollectorViewModel` | `src/modules/map/components/TileResources/TileResources.types.ts:8-37` | `nodeSize`/`farmingCollector.size` become CSS strings; `slotStyle.width`/`.height` and `farmingCollector.offset` are removed |
| `TileResourcesView`, `TileResources` | `src/modules/map/components/TileResources/TileResources.tsx:8-67` | view currently renders px inline styles and numeric `<Image>` dims; connected component gains `useIsMobile()` |
| `styles` | `src/modules/map/components/TileResources/TileResources.styles.ts:1-8` | no change needed — `.resourceSprite`/`.image`/`.collectorOverlay` already `w-full h-full`/`absolute`, same shape as `TileBoats.styles.ts` |
| `useTileResources` | `src/modules/map/components/TileResources/TileResources.hook.ts:1-11` | unchanged — returns only `nodes`, no mobile concern |
| `TileBoatsView`, `TileBoats` | `src/modules/map/components/TileBoats/TileBoats.tsx:9-55` | the pattern being mirrored: connected `TileBoats()` calls `useIsMobile()` itself (not threaded from `IslandTile.tsx`) and passes `showIdleCollectors={!isMobile}` into the pure view |
| `useIsMobile` | `src/modules/shared/index.ts:4` (re-exports `./use-is-mobile`) | hook to reuse, imported directly in a `.tsx` view file, same as `TileBoats.tsx:4` |
| `IslandTile.tsx` | `src/modules/map/components/IslandTile/IslandTile.tsx:10,61,67` | renders `<TileResources island={island} isBase />` / `isBase={false}` with no mobile-related prop today — confirms `TileBoats`'s mobile gating is self-contained, not caller-threaded; **no edit needed here** |
| `TileResources.fixtures.ts` | `src/modules/map/components/TileResources/TileResources.fixtures.ts:65-72` | `singleNodeFixture.nodeSize` is `67` (px); becomes `'56.6%'` |
| `TileResources.preview.tsx` | `src/modules/map/components/TileResources/TileResources.preview.tsx:17-31` | hand-written `withCollectorNode` fixture carries px `nodeSize`/`size`/`offset`, needs the same conversion |
| `island-tile-slots.test.ts` | `src/modules/map/island-tile-slots.test.ts:49-72` | pins today's px `size` values and the Base `width`/`height` fields — both change |
| `TileResources.map.test.ts` | `src/modules/map/components/TileResources/TileResources.map.test.ts` (576 lines) | pins px `nodeSize`, floored `badgeSize`, and `offset` in ~15 assertions — all need the new contract |
| `TileResources.test.tsx` | `src/modules/map/components/TileResources/TileResources.test.tsx` | view-level `toHaveStyle` assertions pin px widths/heights and `offset`-based badge position |
| `TileResources.hook.test.ts` | `src/modules/map/components/TileResources/TileResources.hook.test.ts` | tests `useTileResources` only (nodes, no mobile) — **no change needed**, hook contract is unaffected |
| `docs/architecture/systems-and-visuals.md` | lines 94, 108 | §describing `SlotDef` sizing and the badge's "55% of the node's reference size, floored at 22px" — both need rewording (docs-sync) |

## Root cause (bugs only)
- Reproduction: at the mobile tile-size extreme (T≈46-68px) a `SINGLE_RESOURCE_SLOT`-sized node renders at a fixed 46px (or 67px inflated for Food) regardless of T, overflowing a 46px tile; at the desktop extreme (T≈94-136px) the same fixed px size renders tiny relative to T. tester-a pins this as failing assertions against the current px literals in `island-tile-slots.test.ts` and `TileResources.map.test.ts` before any implementation change.
- Cause: `SlotDef.size` (`island-tile-slots.types.ts:38`) is a fixed px number, carried unchanged through `nodeSize` (`TileResources.map.ts:96-97`) into a literal `${n}px` inline style and numeric `<Image>` `width`/`height` (`TileResources.tsx:19-20,28-29`) — nothing in this path reads the tile's live rendered width, unlike `TileBoats`/`TileOccupants`, which are percent-of-tile and `fill`-based throughout.

## Decisions
- Convert `SlotDef.size` to percent-of-T in place (same field, same four tiers) using the Base tier's already-correct 22% as the anchor, scale factor 22/26 ≈ 0.846 — because Base's box already renders correctly today and the fix should only touch the three tiers that don't, not introduce a second sizing field. Rejected: a new `sizePercent` field alongside the old px `size` (duplicates one piece of knowledge in two fields, violates DRY).
- Badge size is a plain percent of the node's own box (`55%`/`37.9%`), no CSS `max()` floor, suppressed entirely on mobile via `useIsMobile()` — because ui-designer-b's review (ui-design.md:110-115) showed `max(22px, 55%)` makes the badge bigger than its own node across most of the live tile-size range, and the codebase already solves "legible collector badge at small tile sizes" by hiding it (`TileBoats.tsx:32`), not flooring it. Rejected: keep the `max()` floor (produces a worse bug than the one being fixed, per the review's measurements).
- Mobile suppression: the connected `TileResources()` component calls `useIsMobile()` itself and passes `showFarmingCollector={!isMobile}` into `TileResourcesView`, mirroring `TileBoats()` exactly (`TileBoats.tsx:50-55`) — because `IslandTile.tsx` already calls `<TileBoats island={island} />` with no mobile-related prop, confirming the sibling component's mobile gating is self-contained rather than caller-threaded; matching it keeps one convention for "hide a collector badge on mobile" instead of two. Rejected: thread an `isMobile` prop in from `IslandTile.tsx` (the sibling component doesn't do this; would create two different conventions for the same problem, and requires editing a third file for no behavioral gain).
- Badge position uses the fixed per-side corner-style recipe (`top:50%` + `left:100%`/`right:100%` + `translate(∓50%,-50%)`) instead of a computed px/percent offset — because the current `offset` formula (`TileResources.map.ts:114`) is arithmetic over two values that can each independently react to live tile width, and there is no single percent correct in both cases; the fixed recipe lets each box's own `transform` percentage resolve against its own final size, the same convention `CORNER_TRANSFORMS` already uses (`island-tile-slots.types.ts:25-30`). Rejected: compute a new offset percent (same class of bug being fixed, just in percent instead of px).
- Rounding for all Food-inflated percents uses `Math.round(x * 10) / 10`, not `.toFixed(1)` — because `.toFixed(1)` on `39 * 1.45` and `27 * 1.45` rounds down to `56.5`/`39.1` due to binary float representation, while `Math.round` produces the spec's own table values `56.6`/`39.2` (verified in ui-design.md's review, line 117-123).
- No `.styles.ts` edit — because `.resourceSprite` (`relative w-full h-full`) and `.collectorOverlay` (`absolute`) already have the exact shape `TileBoats.styles.ts`'s `.boat`/`.collectorOverlay` has; only the inline `style=` values and `<Image>` props change. Rejected: adding width/height Tailwind classes there (would duplicate what the inline percent string already expresses).

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/map/island-tile-slots.types.ts` | edit | `SlotDef.size` → percent-of-T values (39/32/27/22); remove `width?`/`height?` fields and the Base slots' `width`/`height` literals | implementer-a |
| `src/modules/map/island-tile-slots.test.ts` | edit | update literal `size` assertions to the new percent values; drop the `width`/`height` assertions on `BASE_RESOURCE_SLOTS` | tester-a |
| `src/modules/map/components/TileResources/TileResources.types.ts` | edit | `ResourceNodeViewModel.nodeSize`/`slotStyle` and `FarmingCollectorViewModel` per Contracts below | implementer-a |
| `src/modules/map/components/TileResources/TileResources.map.ts` | edit | percent-based `nodeSize`, badge `size`/`side` (no `offset`, no `BADGE_MIN_SIZE`), named `FOOD_SCALE` constant, shared `roundToOneDecimal` helper | implementer-a |
| `src/modules/map/components/TileResources/TileResources.fixtures.ts` | edit | `singleNodeFixture.nodeSize` → `'56.6%'` | implementer-a |
| `src/modules/map/components/TileResources/TileResources.map.test.ts` | edit | update every `nodeSize`/`farmingCollector` assertion (percent strings, no `offset`, no floor-at-22 case) | tester-a |
| `src/modules/map/components/TileResources/TileResources.tsx` | edit | percent `width`/`height` + `fill` on both `<Image>`s; badge positioned via the fixed per-side style; `showFarmingCollector` prop on `TileResourcesView`; `TileResources()` calls `useIsMobile()` | implementer-b |
| `src/modules/map/components/TileResources/TileResources.test.tsx` | edit | update `toHaveStyle` assertions to percent/transform-based values; add a case asserting no collector badge when `showFarmingCollector={false}` | tester-b |
| `src/modules/map/components/TileResources/TileResources.preview.tsx` | edit | update `withCollectorNode`'s hand-written `nodeSize`/`farmingCollector` literals to the new contract | preview-a |
| `docs/architecture/systems-and-visuals.md` | edit | reword lines 94/108 (`SlotDef.size` and badge-sizing description) to percent-of-tile/percent-of-node, remove "floored at 22px" | docs-sync |

No change needed: `TileResources.hook.ts`, `TileResources.hook.test.ts`, `TileResources.styles.ts`, `TileResources/index.ts`, `IslandTile.tsx`, `TileBoats/*` (already percent-based, confirmed no coordination needed), `TileOccupants/*`.

## Contracts
```ts
// src/modules/map/island-tile-slots.types.ts
export interface SlotDef {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  transform?: string;
  /** Percent of the tile's own side length T — reference size for the node box and the
   *  collector-badge formula (same unit as every other field in this file). */
  size: number;
}
// SINGLE_RESOURCE_SLOT.size = 39
// DUAL_RESOURCE_SLOTS[*].size = 32
// TRIPLE_RESOURCE_SLOTS[*].size = 27
// BASE_RESOURCE_SLOTS[*].size = 22, width/height fields and their literals deleted

// src/modules/map/components/TileResources/TileResources.types.ts
export interface ResourceNodeViewModel {
  type: ResourceType;
  key: string;
  spriteSrc: string;
  /** CSS percent length, e.g. '39%', '56.6%'. */
  nodeSize: string;
  slotStyle: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
    transform?: string;
  };
  farmingCollector: FarmingCollectorViewModel | null;
}

export interface FarmingCollectorViewModel {
  color: PlayerColor;
  sprite: string;
  /** Percent of the node's own rendered box; not shown on mobile. '55%' for Wood/Gold,
   *  '37.9%' for Food (0.55 / FOOD_SCALE, rounded to one decimal). */
  size: string;
  /** Which side of the resource sprite the badge sits on: 'left' when the node's own slot
   *  is right-anchored (avoids pushing the badge off-tile), 'right' otherwise. */
  side: 'left' | 'right';
}
// offset field removed entirely.

// src/modules/map/components/TileResources/TileResources.map.ts
const FOOD_SCALE = 1.45; // sheep.gif has large transparent canvas padding
const BADGE_SIZE_RATIO = 0.55; // badge is ~55% of the node's own (uninflated) box
// BADGE_MIN_SIZE deleted — no px floor.

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

// nodeSize: `${slot.size}%` for Wood/Gold; `${roundToOneDecimal(slot.size * FOOD_SCALE)}%` for Food.
// farmingCollector.size: `${BADGE_SIZE_RATIO * 100}%` for Wood/Gold ('55%');
//   `${roundToOneDecimal((BADGE_SIZE_RATIO * 100) / FOOD_SCALE)}%` for Food ('37.9%').
// farmingCollector.side: unchanged logic (TileResources.map.ts:112-113).
// slotStyle: top/bottom/left/right/transform only — width/height entries removed.
// offset: not computed, not returned.

// src/modules/map/components/TileResources/TileResources.tsx
interface TileResourcesViewProps {
  nodes: ResourceNodeViewModel[] | null;
  /** False on mobile: the badge is a sub-legible speck at mobile tile sizes, so it is not
   *  rendered at all — same convention as TileBoatsView's showIdleCollectors. */
  showFarmingCollector?: boolean;
}
export function TileResourcesView({ nodes, showFarmingCollector = true }: TileResourcesViewProps): JSX.Element | null;
export function TileResources(props: TileResourcesProps): JSX.Element; // calls useTileResources(props) and useIsMobile(), passes showFarmingCollector={!isMobile}

// Node box style: { width: node.nodeSize, height: node.nodeSize, ...node.slotStyle }
// Resource <Image>: fill (no width/height props)
// Badge rendered only when showFarmingCollector && node.farmingCollector; style:
//   side === 'right' → { width: size, height: size, top: '50%', left: '100%', transform: 'translate(-50%, -50%)' }
//   side === 'left'  → { width: size, height: size, top: '50%', right: '100%', transform: 'translate(50%, -50%)' }
// Collector <Image>: fill (no width/height props)
```

## Phases
### Phase 1: Percent-of-tile resource sizing
1. `island-tile-slots.types.ts`: change `SlotDef.size` values, delete `width?`/`height?` fields and their literals on `BASE_RESOURCE_SLOTS`. (implementer-a)
2. `island-tile-slots.test.ts`: update the `size` literals and remove the `width`/`height` assertions on `BASE_RESOURCE_SLOTS`, so this test fails against the pre-change code and passes once step 1 lands. (tester-a, before step 1/3-4 land — bug-tier-M rule)
3. `TileResources.types.ts`: apply the Contracts block's type changes. (implementer-a)
4. `TileResources.map.ts`: apply the Contracts block's logic — `FOOD_SCALE`, `roundToOneDecimal`, percent `nodeSize`, percent `farmingCollector.size`, drop `BADGE_MIN_SIZE`/`offset`. (implementer-a) — sonnet: the rounding/ratio arithmetic has a documented float-precision trap (Decisions), worth the stronger model.
5. `TileResources.fixtures.ts`: update `singleNodeFixture.nodeSize`. (implementer-a)
6. `TileResources.map.test.ts`: update every `nodeSize`/`farmingCollector` assertion per the new contract (percent strings, no `offset`, no floor case), ahead of steps 3-5 landing. (tester-a)
7. `TileResources.tsx`: apply the Contracts block's view changes — percent box sizing, `fill` on both `<Image>`s, fixed per-side badge style, `showFarmingCollector` prop, `useIsMobile()` in the connected component. (implementer-b)
8. `TileResources.test.tsx`: update `toHaveStyle` assertions; add the mobile-suppression case. (tester-b)
9. `TileResources.preview.tsx`: update `withCollectorNode`'s literals. (preview-a)
10. `docs/architecture/systems-and-visuals.md`: reword lines 94 and 108. (docs-sync)
11. Checks: `npm run typecheck`, `npm run lint`, `npm test` (unscoped); `ui-verify` screenshots of `/testbed/tile-resources`'s four states at 1280×720 and 390×844 — confirm no node overflow/sliver, no console error, and the collector badge absent at 390×844.

Model escalation: step 4 (rounding/ratio arithmetic — sonnet, per the float-precision trap two reviewers already had to catch).

## Test plan
- tester-a (logic, first — pins the repro per the bug-tier-M rule): `island-tile-slots.test.ts`'s `size` literals (39/32/27/22, no `width`/`height` on Base); `TileResources.map.test.ts`'s `nodeSize` for Food vs. non-Food at all four tiers (`'56.6%'`/`'46.4%'`/`'39.2%'`/`'31.9%'` vs `'39%'`/`'32%'`/`'27%'`/`'22%'`); `farmingCollector.size` (`'55%'`/`'37.9%'`) and `.side` for every tier, with no `offset` key on the object and no case asserting a `22` floor.
- tester-b (view and e2e): `TileResourcesView` renders `width`/`height` as the percent string on the node box; renders the resource `<Image>` and collector `<Image>` with no numeric `width`/`height` attribute (mocked `next/image`, inspect props); badge style is `top: 50%` plus `left: 100%`/`transform: translate(-50%, -50%)` for `side: 'right'` and `right: 100%`/`transform: translate(50%, -50%)` for `side: 'left'`; `showFarmingCollector={false}` renders no `collector-farm-*` test id even when `node.farmingCollector` is non-null. No e2e change — no gameplay/flow behavior changed, only sizing.

## Preview states
- TileResources: existing four states unchanged by name ("Single food resource", "Multiple resources", "Resource with collector", "No resources"); `withCollectorNode`'s literals updated to `nodeSize: '56.6%'`, `farmingCollector.size: '37.9%'`, no `offset` field.

## Risks
- The float-rounding trap (ui-design.md review, line 117-123) recurring if an implementer reads old prose instead of the Contracts block above — mitigated by naming the exact formula (`Math.round(x * 10) / 10`) in the contract, not just prose.
- `TileResources.map.test.ts` has ~15 literal-pinned assertions across both describe blocks; missing one leaves a stale px/`offset` expectation that fails loudly in `npm test` — not a silent risk, but worth tester-a double-checking coverage against this plan's test-plan list before handing off.

## Review (architect-b)
VERDICT: APPROVED

Verified every path/symbol in "Verified context" and the File plan against the repo: `island-tile-slots.types.ts:32-70` (SlotDef, four slot tables, px `size`/`width`/`height` as described), `TileResources.map.ts:35-36,96-128` (`BADGE_SIZE_RATIO`, `BADGE_MIN_SIZE`, `getSlot`, `nodeSize`/`badgeSize`/`badgeOffset`), `TileResources.types.ts:8-37`, `TileResources.tsx:8-67`, `TileResources.styles.ts:1-8`, `TileResources.hook.ts:1-11`, `TileBoats.tsx:1-55` and `TileBoats.styles.ts:1-14` (mirrored pattern, `showIdleCollectors`/`useIsMobile` confirmed exactly as cited), `src/modules/shared/index.ts:4` (`useIsMobile` export), `IslandTile.tsx:10,61,67` (no mobile prop threaded, confirms self-contained gating), `TileResources.fixtures.ts:65-72`, `TileResources.preview.tsx:18-33`, `island-tile-slots.test.ts` (96 lines, px literals pinned as described), `TileResources.map.test.ts` (576 lines), `TileResources.test.tsx` (existing `toHaveStyle` px/offset assertions at lines 176-229, matching the plan's description), and `docs/architecture/systems-and-visuals.md:108` (exact text match on the "55%... floored at 22px" sentence).

Ran the repo-wide grep the plan's root-cause analysis implies (`BADGE_MIN_SIZE`, `slot.width`/`slot.height`, `.offset`, `nodeSize`, `farmingCollector`, `SlotDef`) across `src`, `e2e`, `docs`, `.claude`: every hit is inside a file already on the File plan. The only other hits are inside `.claude/worktrees/inspiring-kare-ee7f7f/`, a separate git worktree unrelated to this task — correctly out of scope.

Verified the rounding formula in Node: `Math.round(x*10)/10` applied to `39*1.45`/`32*1.45`/`27*1.45`/`22*1.45` gives `56.6`/`46.4`/`39.2`/`31.9`, and `55/1.45` gives `37.9` — matches every acceptance-criteria literal and the Contracts block.

One trivial inaccuracy, folded in rather than blocking: the File plan's docs-sync row and the goal/acceptance-criteria line both say "lines 94 and 108" for `systems-and-visuals.md`; the first sentence to reword ("All percentages are of the tile's own side length...") is actually at line 96, not 94 (verified: `grep -n` shows line 96). Line 108 is correct. docs-sync should reword whichever line currently holds that sentence; the two-line drift doesn't change what needs to change.

Design: this is the simplest fix available — one field (`SlotDef.size`) reinterpreted as percent instead of px, and the existing `useIsMobile`/`fill`/corner-transform conventions from `TileBoats` reused verbatim rather than inventing a new mechanism. No simpler option exists; the ui-designer-b review already rejected the more complex `max()`-floor alternative for a real bug (badge bigger than its own node), and the architect's own Decisions section correctly rejects a duplicate `sizePercent` field. Responsibilities stay split along the existing file boundaries (types/map owned by implementer-a, view by implementer-b, tests by tester-a/b, docs by docs-sync) with no new coordination needed. The Contracts block is concrete enough for two builders working in parallel: exact formulas, exact literal outputs, and the file-by-file split of the Decisions' badge-position/rounding/mobile-suppression choices leaves no ambiguity for implementer-a or implementer-b to resolve independently. Phase is appropriately sized (single phase, tier M); tests are meaningful (table-driven literal pins, a repro-first ordering per the bug-tier-M rule, a new mobile-suppression test case); preview states are unchanged in name and fully specified for their literal updates.

No changes requested.
