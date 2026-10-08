# Plan: Map decoration sprite scale (boats, riders, trees)

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec)

**Revision note (architect-a, resolving implementer-b's BLOCKER on collector-overlay sizing):** the original "Decisions"/"Contracts" collector numbers below were geometrically impossible (see the replaced Decisions bullet and Contracts `collectorOverlay` class). Corrected; `ui-design.md`'s sizing table and States table amended to match (new "Correction" section there). Re-approval from architect-b needed before implementer-b resumes; everything else in this plan is unchanged from the prior APPROVED version.

## Goal and acceptance criteria
All items are ui-design.md's "Acceptance criteria" list verbatim (Final spec section). Copied here for traceability; ui-design.md is the source of truth if these drift.
- [ ] Desktop (tile ≈136px): docked boat's bounding box visibly crosses the tile's own rounded-lg border on its anchored corner.
- [ ] Mobile (tile ≈46-68px): boat-to-tile size ratio ≈42%, matching the desktop ratio (computed bounding-box width ÷ tile width at both viewport sizes).
- [ ] One occupant: rider (knight sprite) and boat hull render at the **same corner**, bounding boxes overlapping.
- [ ] 2+ occupants: each boat+rider pair occupies a distinct corner, no two pairs share a corner, no rider's corner diverges from its own boat's corner.
- [ ] Base tile, boat parked, zero occupants: collector accessory fully inside the boat's own bounding box.
- [ ] Occupied, idle (not positioned-on-resource) corner: boat + knight rider + collector all at the same corner; collector's box fully inside the boat's box, not overlapping the rider's torso/face; collector disappears once that occupant positions on a resource (`showIdleCollector` false).
- [ ] `hasActed: true` occupant renders its rider at `opacity-50` (computed style), unchanged.
- [ ] Occupant mid-death-animation renders no rider, unchanged.
- [ ] Grove trees (Empty/Cleared) render at ≈28% of tile side each, fully inside the tile's visible border.
- [ ] Base-tile accent trees (2) and Special-tile accent tree (1) render at ≈16% of tile side, visibly smaller than grove trees, no overlap with base crest/star icon.
- [ ] No regression: `tile-boats`, `docked-boat`, `collector-idle-${color}`, `tile-forest`, `tile-forest-tree` test ids all still present.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `BOAT_CORNER_POSITIONS` | `src/modules/map/components/TileBoats/TileBoats.types.ts:3-8` | Order `br, tr, tl, bl`; becomes the single shared corner source for both boat and rider. |
| `BoatEntryViewModel.cornerStyle` | `TileBoats.types.ts:17` | Already `Record<string,string>`, applied via `style=` on `.boatEntry` (`TileBoats.tsx:14`) — extending its contents (not its type) is the whole fix. |
| `toTileBoatsViewModel` corner-building loop | `TileBoats.map.ts:101-124` | Builds `cornerStyle` with an `Object.entries`/filter-undefined dance that's dead code (every `corner.style` literal already has exactly 2 defined keys, never `undefined`) — removed in this change. |
| `.boat` / `.collectorOverlay` classes | `TileBoats.styles.ts:4,6` | `w-7 h-7 sm:w-8 sm:h-8` and `w-5 h-5 sm:w-6 sm:h-6 -top-2.5 -left-1` — the fixed-px values converted to tile-relative percentages. |
| local `positions` array (duplicated) | `TileOccupants.tsx:9-14` and `TileOccupants.hook.ts:8-13` | Order `bl, br, tl, tr` — opposite of `BOAT_CORNER_POSITIONS`; this exact mismatch is why the rider and the boat land on opposite corners. Both copies are deleted; replaced by one import of `BOAT_CORNER_POSITIONS`. |
| `OccupantSpriteViewModel.positionClasses` | `TileOccupants.types.ts:11` | Currently a composed Tailwind-class string (position + origin + overflow); replaced by `slotStyle` (inline style, mirrors `cornerStyle`) + `isOverflow` (boolean, consumed by a `cva` variant). |
| `.image` max-width | `TileOccupants.styles.ts:6` | `max-w-[86px]` fixed px — removed; size now comes from the slot's own box (`29%` of tile), image fills it via `fill`. |
| `TreeSlot.size` | `TileForest.types.ts:15-22`, three literal layouts in `TileForest.map.ts:21-37` | `number` (16-30px); becomes `string` (percent of tile, e.g. `'28%'`), values updated to `'16%'`/`'28%'` per the sizing table. |
| `IslandTile` DOM order and z-index | `IslandTile.tsx:100-108`, `IslandTile.styles.ts:47-48`; `TileBoats.styles.ts:2` (z-[25]); `TileOccupants.styles.ts:4` (z-30) | forest(z-12) → boat(z-25) → centerContent(z-20) → occupants(z-30) → borderRow. Unchanged by this task (ui-designer-b already confirmed stacking is correct); **no edits to `IslandTile.tsx`/`IslandTile.styles.ts`**. |
| `styles.tile` (no `overflow-hidden`) | `IslandTile.styles.ts:5-6` | Confirms the boat can overhang the tile border with no clipping ancestor. |
| Grid cell size (`T`) | `MapGrid.tsx:47-50` | `clamp(46px,13.5vw,68px)` mobile / `clamp(94px,12.5vh,136px)` desktop, applied to `grid-template-columns`; `IslandTile` is `aspect-square w-full` (`IslandTile.styles.ts:6`), so it fills exactly one grid cell = T×T. |
| `Image ... fill` pattern | `IslandTile.tsx:47-53` (`baseImageWrapper` + `Image fill`), `IslandTile.tsx:108-113` (`borderImageWrapper` + `Image fill`) | Existing codebase convention for a CSS-sized (not literal-px) image: a positioned, explicitly-sized wrapper + `<Image fill>`. Reused here for every percentage-sized sprite in this task. |
| `ResourceNodeViewModel.slotStyle` | `TileResources.types.ts:13`, `TileResources.map.ts:121-127`, `TileResources.tsx:18-22` | Same "slot style object holds position(+transform), merged via `style=`" shape already used by a sibling component in this module — precedent followed, not reinvented. `TileResources` itself still hardcodes px `size` values (`TileResources.map.ts:36-58`); same bug class, **out of scope**, flag as follow-up only. |
| z-index scale regression test | `src/modules/map/z-index-scale.test.ts` | Scans every `*.styles.ts` under `src/modules/map/components/` for bare `z-<n>` outside Tailwind's default scale. This task introduces no new z-index values, so it stays green untouched. |
| eslint import boundaries | `eslint.config.mjs:38-54` (`MODULE_FILES`, `RESTRICTED_IMPORTS.deepModuleImport` = `@/modules/*/*`) | `TileOccupants` importing `../TileBoats/TileBoats.types` is a relative path, not `@/modules/...`, so it does not match the blocked pattern — confirmed safe. |
| Known pre-existing blocker | per coordinator's note; `docs/ai/tasks/2026-10-04-ui-ux-phase4-game-log-redesign` (in progress) | `GameLog.fixtures.ts` is missing a `multiEntryLog` export that `GameLog.preview.tsx` imports, 500ing every `/testbed/*` and app route. **Not this task's to fix.** preview-a/preview-b must re-check `npm run dev` before running `ui-verify`; if still broken, report BLOCKER naming the other task, don't patch `GameLog.fixtures.ts` here. |

## Root cause (bug)
- Reproduction: `/testbed/map-grid?state=Populated board` (once the dev-server blocker above is clear) — boat sits inland at its own tile corner, the knight rider renders at the tile's opposite corner, trees look tiny relative to the tile; confirmed by ui-designer-a/b in a live browser session (triage.md, ui-design.md).
- Cause 1 (corners): `BOAT_CORNER_POSITIONS` (`TileBoats.types.ts:3-8`) orders corners `br, tr, tl, bl`; the `positions` array duplicated independently in `TileOccupants.tsx:9-14` and `TileOccupants.hook.ts:8-13` orders them `bl, br, tl, tr`. For the common one-occupant case, index 0 resolves to opposite corners in each array — not a coincidence, an array-order mismatch (ui-design.md "Root cause").
- Cause 2 (scale): `TileBoats.styles.ts:4,6`, `TileOccupants.styles.ts:6`, and `TileForest.map.ts:21-37` all hardcode sprite sizes in fixed Tailwind px / raw px, with zero relation to `IslandTile`'s actual rendered size, which is driven entirely by `MapGrid.tsx:47-50`'s `clamp()` and varies 46-136px depending on viewport and zoom. Fixed px that looks right at one clamp endpoint is wrong at the other.

## Decisions
- Center boat and rider on the tile's own corner point via `transform: translate(±50%, ±50%)` (sign per corner), rather than fixed-inset positioning — because translate-by-percent is relative to the *element's own* box, this guarantees the rider (29% of T) stays fully inside the boat's box (42% of T) at any tile size, with zero per-corner manual offset math. Rejected: keep literal corner insets (e.g. `bottom: '2px'`) and compute containment by hand — breaks the moment either percentage changes, and doesn't naturally nest a smaller box inside a bigger one centered at the same point.
- Share one corner source, `BOAT_CORNER_POSITIONS` + new `CORNER_TRANSFORMS` (both in `TileBoats.types.ts`), imported by `TileOccupants.hook.ts` via a relative path (`../TileBoats/TileBoats.types`) — this directly fixes the duplicated/mismatched array that caused the bug (ui-designer-b's review finding) and matches the "Inside a module, relative imports" rule (component-architecture skill); confirmed not blocked by `eslint.config.mjs`'s `deepModuleImport` rule (that only matches `@/modules/*/*`, not relative paths). Rejected: give `TileOccupants` its own corrected copy of the array — reintroduces the exact DRY violation that caused this bug; a future edit to one copy and not the other reproduces today's symptom.
- Sprite size (boat 42%, rider 29%, collector 14% of the boat's own box — see "Superseded finding" below for why this is hull-relative, not T-relative like the others — grove tree 28%, accent tree 16% of T) expressed as **static Tailwind arbitrary-percent classes** in each `.styles.ts` (e.g. `w-[42%] h-[42%]`), not as computed view-model fields — because these percentages never vary per instance (every boat is 42% of T; only its *corner* varies), so they belong in the file that owns class strings, not duplicated into every view-model entry. Only truly per-instance values (corner position, `transform`) go through the view model's inline `style`. Rejected: export numeric percent constants from `.types.ts` purely to keep a single source of truth — with no second runtime consumer they'd be unused exports (kiss-dry-solid checklist); the sizing table in ui-design.md is the single source of truth for these numbers, cited in a code comment at each usage instead.
- `next/image`'s `fill` prop (replacing literal `width`/`height` numbers) on every sprite whose box is now percentage-sized — because `fill` is the pattern this exact codebase already uses for a CSS-sized image (`IslandTile.tsx:47-53,108-113`), and a literal numeric `width`/`height` prop cannot express a percentage. Rejected: keep numeric `width`/`height` props sized to a precomputed pixel guess — decouples the image's intrinsic size from its actual CSS size, defeating the point of switching to percentages.
- **Superseded finding (implementer-b BLOCKER, resolved here):** the original collector sizing (`w-[17%] h-[17%] -top-[33%] -left-[13%]`, a 1:1 unit-conversion of today's `-top-2.5 -left-1` offset at a 28-32px boat) is geometrically impossible. `.collectorOverlay`'s percentages resolve against its actual containing block, `.boat` (42% of T) — not T — so "40% of the boat's box" (the sizing table's real instruction) means a class of `w-[40%]`, not `w-[17%]` (my original contract wrongly used the T-relative number as if it applied to the hull-relative class — an architect error, not implementer-b's). At the correct 40%-of-hull size, the collector cannot be both "fully inside the boat's box" and "not overlapping the rider's bounding box": the boat is 42% of T, the rider is 29% of T, and both are centered on the *same* corner point (by this plan's own `CORNER_TRANSFORMS` design) — so the margin ring between the rider's edge and the hull's edge is only `(42-29)/2 = 6.5%` of T wide, i.e. `6.5/42 ≈ 15.5%` of the hull's own box. A 40%-of-hull collector is more than double that margin.
  - **Fix:** shrink the collector to **14% of the boat's box** (`w-[14%] h-[14%]`, ≈1.5 percentage points of safety margin under the 15.5% maximum) and anchor it **flush at the hull's own top-left inner corner** (`top-0 left-0`, replacing the negative offset entirely — simpler, and the negative offset was never compatible with "fully inside the boat's box" to begin with). This guarantees zero overlap with the centered rider by construction, for any T, with no per-corner math (the corner-agnostic placement direction, "upper-left regardless of the boat's actual tile corner," is unchanged from the original design intent).
  - **Residual risk, not fully resolved by this fix:** 14% of the boat's 42%-of-T box is 5.88% of T — at mobile's smallest tile (T=46px) that's **≈2.7px**, almost certainly below legible size for a sprite GIF; at desktop's largest tile (T=136px) it's **≈8px**, matching the originally-approved desktop estimate. Rejected fixing this by decentering the rider instead (would free more margin without shrinking the collector further) — that requires a new, per-corner-aware rider transform in `TileOccupants.hook.ts`/`.types.ts`, which implementer-a's files are already cross-reviewed and approved for under the current (centered, corner-agnostic) design; reopening them for this is out of this revision's scope. **ui-verify must explicitly check mobile-size legibility of the collector accessory; if it's confirmed illegible in practice, that is a new design question (not an implementation bug) and must go back to ui-designer-a/b, not be silently patched again.**
- `TileResources.map.ts`'s own fixed-px `size` values (`:36-58`) are the same bug class but are **out of scope** per triage.md ("flag as a follow-up, don't silently expand scope") — not touched in this task.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/map/components/TileBoats/TileBoats.types.ts` | edit | Add `CornerId`, `CornerPosition` types; change `BOAT_CORNER_POSITIONS` values to `'0'` insets; add `CORNER_TRANSFORMS`. | implementer-a |
| `src/modules/map/components/TileBoats/TileBoats.map.ts` | edit | Build `cornerStyle` as `{...corner.style, transform}`; remove the dead `Object.entries`/filter loop. | implementer-a |
| `src/modules/map/components/TileBoats/TileBoats.fixtures.ts` | edit | Update `boatEntryFixture.cornerStyle` to the new shape. | implementer-a |
| `src/modules/map/components/TileBoats/index.ts` | edit | Re-export `CORNER_TRANSFORMS` and `CornerId`/`CornerPosition` types alongside the existing `BOAT_CORNER_POSITIONS` export. | implementer-a |
| `src/modules/map/components/TileBoats/TileBoats.styles.ts` | edit | Percent-based `boatEntry`/`collectorOverlay` sizing; drop `sm:` breakpoint classes (percentages already scale). | implementer-b |
| `src/modules/map/components/TileBoats/TileBoats.tsx` | edit | Swap both `<Image>`s from numeric `width`/`height` to `fill`. | implementer-b |
| `src/modules/map/components/TileOccupants/TileOccupants.types.ts` | edit | Replace `positionClasses: string` with `slotStyle: Record<string,string>` + `isOverflow: boolean`. | implementer-a |
| `src/modules/map/components/TileOccupants/TileOccupants.hook.ts` | edit | Delete local `positions` array; import `BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS` from `../TileBoats/TileBoats.types`; compute `slotStyle`/`isOverflow`; drop now-unused `cn` import. | implementer-a |
| `src/modules/map/components/TileOccupants/TileOccupants.fixtures.ts` | edit | Update both fixtures to `slotStyle`/`isOverflow`. | implementer-a |
| `src/modules/map/components/TileOccupants/TileOccupants.styles.ts` | edit | `slot` becomes a `cva` with `w-[29%] h-[29%]` + `isOverflow` variant; `image` cva drops `max-w-[86px]`, becomes `object-contain` + `isFaded` variant. | implementer-b |
| `src/modules/map/components/TileOccupants/TileOccupants.tsx` | edit | Delete local `positions` array; render `styles.slot({isOverflow})` with `style={slotStyle}`; `<Image fill>`; drop now-unused `cn` import. | implementer-b |
| `src/modules/map/components/TileForest/TileForest.types.ts` | edit | `TreeSlot.size: number` → `string` (percent). | implementer-a |
| `src/modules/map/components/TileForest/TileForest.map.ts` | edit | Three layouts' `size` literals → `'16%'` (base/special accent) / `'28%'` (grove). | implementer-a |
| `src/modules/map/components/TileForest/TileForest.styles.ts` | edit | `image` drops `h-full w-full` (now redundant with `fill`), keeps `object-contain`. | implementer-b |
| `src/modules/map/components/TileForest/TileForest.tsx` | edit | `style` width/height use `pos.size` directly (already a percent string); `<Image fill>` instead of numeric `width`/`height`. | implementer-b |
| `src/modules/map/components/TileBoats/TileBoats.map.test.ts` | edit | Logic tests for the new `cornerStyle` shape (transform present, `'0'` insets, corner-id↔transform-sign correctness). | tester-a |
| `src/modules/map/components/TileOccupants/TileOccupants.hook.test.ts` | edit | Logic tests: `slotStyle` matches `BOAT_CORNER_POSITIONS[index % 4]` + `CORNER_TRANSFORMS`; `isOverflow` true only for index ≥ 4. | tester-a |
| `src/modules/map/components/TileForest/TileForest.map.test.ts` | edit | Assert `size` is `'28%'` for grove layouts and `'16%'` for base/special layouts. | tester-a |
| `src/modules/map/components/TileBoats/TileBoats.test.tsx` | edit | View test: boat renders with the computed `cornerStyle` (`transform` present) on `.boatEntry`; collector stays a child of `.boat`. | tester-b |
| `src/modules/map/components/TileOccupants/TileOccupants.test.tsx` | edit | View test, plus a composed test rendering `TileBoatsView` + `TileOccupantsView` from matching-index fixtures and asserting identical `top`/`bottom`/`left`/`right`/`transform` (same corner). | tester-b |
| `src/modules/map/components/TileForest/TileForest.test.tsx` | edit | Assert each tree's rendered `width`/`height` style is the expected percent string. | tester-b |
| `src/modules/map/components/TileBoats/TileBoats.preview.tsx` | edit | Update inline `cornerStyle` fixtures (`twoBoatsFixture`, `allCornersBoatsFixture`) to the new shape; add fixed-size "tile box" wrapper states at 46px and 136px to show the ratio stays visually constant. | preview-a |
| `src/modules/map/components/TileOccupants/TileOccupants.preview.tsx` | edit | Update fixtures to `slotStyle`/`isOverflow`; add the same sized wrapper states; add a "boat + rider, same corner" composed state rendering both views together. | preview-a |
| `src/modules/map/components/TileForest/TileForest.preview.tsx` | edit | Wrap each existing state in the same fixed-size tile box so tree-to-tile proportion is checkable. | preview-a |

No change to `TileBoats.hook.ts` (pure passthrough, nothing in its contract changes), `IslandTile.tsx`, `IslandTile.styles.ts`, `MapGrid.*`, or `src/testbed/registry.ts` (no new preview slug).

## Contracts
```ts
// src/modules/map/components/TileBoats/TileBoats.types.ts
import type { Island, PlayerColor } from '@/lib/types';

export type CornerId = 'br' | 'tr' | 'tl' | 'bl';

export interface CornerPosition {
  id: CornerId;
  /** Always exactly two of these four keys, each '0'. */
  style: Partial<Record<'top' | 'bottom' | 'left' | 'right', string>>;
}

/** Order is load-bearing: TileOccupants.hook.ts imports this directly so occupant index N
 *  always lands on the same corner as boat entry index N. Do not reorder without updating
 *  both consumers. */
export const BOAT_CORNER_POSITIONS: CornerPosition[] = [
  { id: 'br', style: { bottom: '0', right: '0' } },
  { id: 'tr', style: { top: '0', right: '0' } },
  { id: 'tl', style: { top: '0', left: '0' } },
  { id: 'bl', style: { bottom: '0', left: '0' } },
];

/** Centers an element on its tile corner point: half of its own box overhangs past the tile
 *  edge regardless of the element's size. This is what lets the boat (42% of T, see
 *  TileBoats.styles.ts) and the rider (29% of T, see TileOccupants.styles.ts) share one
 *  corner with the rider's box always fully inside the boat's box. */
export const CORNER_TRANSFORMS: Record<CornerId, string> = {
  br: 'translate(50%, 50%)',
  tr: 'translate(50%, -50%)',
  tl: 'translate(-50%, -50%)',
  bl: 'translate(-50%, 50%)',
};

export interface TileBoatsProps {
  island: Island;
}

export interface BoatEntryViewModel {
  key: string;
  color: PlayerColor;
  /** top/bottom/left/right: '0' (one CornerPosition's style) plus `transform`; applied via
   *  `style=` on `.boatEntry`. */
  cornerStyle: Record<string, string>;
  showIdleCollector: boolean;
  idleCollectorSprite?: string;
}
```

```ts
// src/modules/map/components/TileBoats/TileBoats.map.ts
// Signature unchanged:
export function toTileBoatsViewModel(
  island: Island,
  players: GameState['players'],
  localPlayer: Player | null,
  debugMode: boolean,
  fogOfWar: boolean,
): BoatEntryViewModel[] | null;

// cornerStyle construction (replaces today's Object.entries/filter loop):
// const corner = BOAT_CORNER_POSITIONS[index % BOAT_CORNER_POSITIONS.length];
// const cornerStyle: Record<string, string> = {
//   ...(corner.style as Record<string, string>),
//   transform: CORNER_TRANSFORMS[corner.id],
// };
```

```ts
// src/modules/map/components/TileOccupants/TileOccupants.types.ts
import type { Island, PlayerColor } from '@/lib/types';

export interface TileOccupantsProps {
  island: Island;
}

export interface OccupantSpriteViewModel {
  key: string;
  color: PlayerColor;
  sprite: string;
  /** Same corner (top/bottom/left/right: '0') and transform as the matching-index
   *  BoatEntryViewModel.cornerStyle — both built from the same BOAT_CORNER_POSITIONS entry. */
  slotStyle: Record<string, string>;
  isFaded: boolean;
  /** True for the 5th+ occupant on one tile: corner wraps (mod 4), shrinks and fades
   *  (unchanged pre-existing behavior, just renamed from an inline ternary). */
  isOverflow: boolean;
}
```

```ts
// src/modules/map/components/TileOccupants/TileOccupants.hook.ts
// Signature unchanged:
export function useTileOccupants(props: TileOccupantsProps): { occupants: OccupantSpriteViewModel[] };

// Replaces the local `positions` array and the final `.map(({ player, army }, index) => ...)`:
// import { BOAT_CORNER_POSITIONS, CORNER_TRANSFORMS } from '../TileBoats/TileBoats.types';
// ...
// .map(({ player, army }, index) => {
//   const sprite = PLAYER_DATA[player.color]?.sprite;
//   const corner = BOAT_CORNER_POSITIONS[index % BOAT_CORNER_POSITIONS.length];
//   const slotStyle: Record<string, string> = {
//     ...(corner.style as Record<string, string>),
//     transform: CORNER_TRANSFORMS[corner.id],
//   };
//   return {
//     key: `army-sprite-${player.id}-${army.id}`,
//     color: player.color,
//     sprite: sprite?.idle || '',
//     slotStyle,
//     isFaded: army.hasActed,
//     isOverflow: index >= 4,
//   };
// });
```

```ts
// src/modules/map/components/TileForest/TileForest.types.ts
export interface TreeSlot {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  /** Percent of the tile's own side length T, e.g. '28%'. Was a px number. */
  size: string;
  z: number;
}
// ForestLayout and toForestLayout's signature are unchanged.
```

```ts
// Tailwind class contracts implementer-b codes against (exact strings):

// TileBoats.styles.ts
export const styles = {
  container: 'pointer-events-none absolute inset-0 z-[25] select-none',
  boatEntry: 'absolute w-[42%] h-[42%]', // 42% of T, ui-design.md sizing table
  boat: 'relative h-full w-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] transition-transform duration-300 hover:scale-110',
  boatImage: 'object-contain',
  // 14% of the boat's OWN box (this class resolves against `.boat`, not T): the max that
  // fits without overlapping the rider is (hull-half - rider-half)/hull-half ≈ 15.5% of hull
  // (hull=42% of T, rider=29% of T, both centered on the same corner point — see Decisions'
  // "Superseded finding" note); 14% leaves a safety margin. Flush at the hull's own top-left
  // inner corner (no offset) — simpler than, and replaces, the earlier negative-offset design.
  // ~2.7px at T=46 (mobile min), ~8px at T=136 (desktop max) — ui-verify must check mobile
  // legibility; if illegible, that's a design question for ui-designer-a/b, not a retry here.
  collectorOverlay: 'absolute z-[26] w-[14%] h-[14%] top-0 left-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]',
  collectorImage: 'object-contain',
} as const;

// TileOccupants.styles.ts
import { cva } from 'class-variance-authority';
export const styles = {
  container: 'absolute inset-0 z-30 pointer-events-none',
  // 29% of T (~70% of the boat's 42%) — stays inside the boat's box when both are centered
  // on the same corner via CORNER_TRANSFORMS.
  slot: cva('absolute w-[29%] h-[29%]', {
    variants: { isOverflow: { true: 'scale-90 opacity-90', false: '' } },
  }),
  image: cva('object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]', {
    variants: { isFaded: { true: 'opacity-50', false: 'opacity-100' } },
  }),
} as const;

// TileForest.styles.ts
export const styles = {
  container: 'pointer-events-none absolute inset-0 z-[12] overflow-hidden select-none',
  tree: 'absolute drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] transition-transform duration-300',
  image: 'object-contain',
} as const;
```

## Phases
### Phase 1: Corner sharing, percentage sizing, fill images (single phase, 1/1)
1. implementer-a: `TileBoats.types.ts` — add `CornerId`/`CornerPosition`, update `BOAT_CORNER_POSITIONS` to `'0'` insets, add `CORNER_TRANSFORMS`; update `TileBoats/index.ts` exports.
2. implementer-a: `TileBoats.map.ts` — rebuild `cornerStyle`, delete the dead filter loop.
3. implementer-a: `TileBoats.fixtures.ts` — update `boatEntryFixture.cornerStyle`.
4. implementer-a: `TileOccupants.types.ts` — `slotStyle`/`isOverflow` replacing `positionClasses`.
5. implementer-a: `TileOccupants.hook.ts` — delete local `positions`, import from `TileBoats.types`, compute `slotStyle`/`isOverflow`, drop unused `cn` import.
6. implementer-a: `TileOccupants.fixtures.ts` — update both fixtures.
7. implementer-a: `TileForest.types.ts` — `TreeSlot.size: string`.
8. implementer-a: `TileForest.map.ts` — percent literals in all three layouts.
9. implementer-b (parallel with 1-8, once contracts above are read): `TileBoats.styles.ts`, `TileBoats.tsx` (`fill`).
10. implementer-b: `TileOccupants.styles.ts`, `TileOccupants.tsx` (`fill`, drop unused `cn`).
11. implementer-b: `TileForest.styles.ts`, `TileForest.tsx` (`fill`).
12. tester-a: logic tests (TileBoats.map, TileOccupants.hook, TileForest.map) — see Test plan.
13. tester-b: view tests (TileBoats, TileOccupants incl. the composed same-corner test, TileForest) — see Test plan.
14. preview-a: update the three `.preview.tsx` files — see File plan / Preview states. **Before this step, re-check `npm run dev` for the pre-existing GameLog.fixtures.ts 500 (see Verified context); if still broken, stop and report BLOCKER naming that other task instead of patching it.**
15. Run `npm run typecheck`, `npm run lint`, `npm test` on the full repo; fix any cross-file break before committing.
16. `ui-verify` screenshots at both a mobile (390×844) and desktop (1280×720) viewport, against the acceptance criteria above.
17. One commit: `fix(map): align boat, rider and tree sprite scale with tile size [phase 1/1]`.

Model escalation: none — this is contract-following mechanical work (shared constants, percentage classes, `fill` prop swap), no ambiguous design decisions left for builders.

## Test plan
- tester-a (logic, first):
  - `TileBoats.map.test.ts`: `cornerStyle` for entry index 0-3 each contains exactly the corner's `top`/`bottom`/`left`/`right: '0'` pair plus the matching `transform` from `CORNER_TRANSFORMS`; no `undefined` values ever appear (regression guard for the removed filter loop).
  - `TileOccupants.hook.test.ts`: for occupant index 0-4, `slotStyle` equals `{...BOAT_CORNER_POSITIONS[index % 4].style, transform: CORNER_TRANSFORMS[...]}`; `isOverflow` is `false` for index 0-3 and `true` for index 4; existing `isFaded`/visibility/death-suppression cases still pass unmodified.
  - `TileForest.map.test.ts`: grove layout (Empty/Cleared) entries all have `size: '28%'`; base layout and special layout entries all have `size: '16%'`; existing `top`/`left` assertions (unchanged) still pass.
- tester-b (view, then composed):
  - `TileBoats.test.tsx`: rendered `.boatEntry` (or `docked-boat`'s parent) has a `transform` style set; existing collector-visibility tests pass unmodified.
  - `TileOccupants.test.tsx`: existing tests pass with `slotStyle` instead of `positionClasses`; **new** composed test — render `TileBoatsView` with one boat fixture at a given corner and `TileOccupantsView` with one occupant fixture at the same index, assert their `top`/`bottom`/`left`/`right`/`transform` computed styles are identical (same corner, same centering point) — this is the test that would have caught the original bug.
  - `TileForest.test.tsx`: assert each `tile-forest-tree`'s computed `width`/`height` equals the expected percent string for its layout (grove vs. base/special).
  - No e2e spec: this is a pure sizing/positioning view change with no new interaction or route; verification is `ui-verify` screenshots (step 16) against ui-design.md's acceptance criteria, not Playwright.

## Preview states
- `TileBoats`: existing states unchanged in name, fixtures updated to the new `cornerStyle` shape; **new**: "Mobile size (46px tile)" and "Desktop size (136px tile)" states, each wrapping the view in an inline `position: relative` div sized to that tile footprint, to make the boat-to-tile ratio visually checkable at both clamp endpoints.
- `TileOccupants`: existing states unchanged in name, fixtures updated to `slotStyle`/`isOverflow`; same two sized-wrapper states as TileBoats; **new**: "Boat + rider, same corner" — renders `TileBoatsView` and `TileOccupantsView` together (stacked, matching z-index) from one shared corner-index fixture, to visually confirm the composition acceptance criteria.
- `TileForest`: existing six states unchanged, each wrapped in the same sized "tile box" div so grove vs. accent tree proportion is visible.

## Risks
- CSS percentage resolution depends on every ancestor in the chain having an explicit size: `TileBoats`/`TileOccupants`/`TileForest` containers are already `absolute inset-0` inside `IslandTile`'s `relative aspect-square w-full` button (confirmed, Verified context), so this holds for the real app; previews need their own sized wrapper or percentages collapse to 0 — covered explicitly above, not left to the builder to discover.
- `next/image`'s `fill` needs its *immediate parent* to be non-static and explicitly sized; every parent touched in this task already is (`.boatEntry`, `.collectorOverlay`, `.slot`, `.tree` are all `absolute` with explicit width/height) — verify this holds after implementer-b's edits (no new wrapper introduced that's missing a size).
- Tailwind JIT must statically see the literal arbitrary-value class strings (e.g. `w-[42%]`, `-top-[33%]`) in source; they must not be built by string interpolation (confirmed none of the contracts above interpolate a class name) — verify visually in `ui-verify` that sizes actually apply, not just that the build didn't error.
- Pre-existing dev-server blocker (`GameLog.fixtures.ts` missing `multiEntryLog`, owned by a different in-progress task) could still be blocking `ui-verify` by the time this task reaches its preview/checks step — re-check before assuming it's fixed; report BLOCKER naming the other task if so, don't patch it here.
- Collector accessory at mobile's smallest tile size (T=46px) renders at ≈2.7px — the corrected size that avoids overlapping the rider's bounding box, but likely too small to read as a distinct sprite. This is a known, flagged residual risk (see Decisions' "Superseded finding" note), not an oversight: `ui-verify` must look at it directly at 390×844 and confirm or deny legibility; if illegible, escalate to ui-designer-a/b for a design-level fix (e.g. hiding the collector below some tile-size threshold, or reconsidering hull/rider percentages) rather than another architect-side numeric patch.

## Review (architect-b)
VERDICT: APPROVED

Verified this session against source, not taken on faith:
- `TileBoats.types.ts:3-8` `BOAT_CORNER_POSITIONS` order br/tr/tl/bl, each `style` literal has exactly 2 defined keys (never `undefined`) — confirmed; the `Object.entries`/filter loop in `TileBoats.map.ts:109-115` is genuinely dead code as claimed.
- `TileBoats.tsx:14` `style={boat.cornerStyle}` on `.boatEntry` — confirmed, matches "Verified context" row 24.
- `TileBoats.styles.ts:4,6` (`w-7 h-7 sm:w-8 sm:h-8`; `w-5 h-5 sm:w-6 sm:h-6 -top-2.5 -left-1`) — confirmed fixed-px values cited.
- `TileOccupants.hook.ts:8-13` and `TileOccupants.tsx:9-14` both declare a local `positions` array, order bl/br/tl/tr — confirmed duplicated and confirmed the exact opposite order from `BOAT_CORNER_POSITIONS`, which is the root cause as stated.
- `TileOccupants.styles.ts:6` `max-w-[86px]` — confirmed.
- `TileForest.types.ts:20` `TreeSlot.size: number`; `TileForest.map.ts:21-37` literal sizes 18/16 (base), 16 (special), 28/30/26 (grove) — confirmed, matches the sizing table's "current" column and the plan's 16%/28% target split.
- `IslandTile.tsx:100-108` DOM order forest → boat → centerContent → occupants → borderRow; z-index `terrain`=10, forest=`z-[12]`, boat=`z-[25]`, centerContent=`z-20`, occupants=`z-30` (`IslandTile.styles.ts:47-48`, `TileBoats.styles.ts:2`, `TileOccupants.styles.ts:4`) — confirmed, no edit needed to `IslandTile.*` as the plan states.
- `IslandTile.styles.ts:5-6` `tile` cva has no `overflow-hidden` — confirmed, boat can overhang.
- `MapGrid.tsx:49` clamp values `clamp(46px, 13.5vw, 68px)` / `clamp(94px, 12.5vh, 136px)` — confirmed exact (plan cites the range `:47-50`, which contains line 49; not a hallucination, just an imprecise line pointer).
- `TileResources.types.ts:13` `ResourceNodeViewModel.slotStyle` shape and `TileResources.map.ts:36-58` fixed-px `SlotDef.size` — confirmed; correctly flagged out-of-scope rather than silently expanded.
- `eslint.config.mjs:38-54`, `RESTRICTED_IMPORTS.deepModuleImport` pattern `@/modules/*/*` — confirmed a relative import (`../TileBoats/TileBoats.types`) does not match this pattern.
- `src/modules/map/z-index-scale.test.ts` — confirmed it scans `*.styles.ts` under `src/modules/map/components/` for bare `z-<n>`; this task introduces no new z-index value, stays green.
- Old-path grep for `positionClasses`, `BOAT_CORNER_POSITIONS`, `occupantSlot`, `TreeSlot` across `src`, `docs`, `.claude`: every hit (`TileBoats.types.ts`, `.map.ts`, `.map.test.ts`, `index.ts`; `TileOccupants.hook.ts`, `.tsx`, `.types.ts`, `.fixtures.ts`, `.preview.tsx`; `TileForest.types.ts`, `.tsx`, `index.ts`, `.map.ts`, `.map.test.ts`) is already in the File plan as an edit. `TileForest/index.ts` re-exports the `TreeSlot` type by name only (no field-level code) and correctly needs no edit. `TileBoats.hook.test.ts` asserts only `boats`/`showIdleCollector` presence, never `cornerStyle` shape, so it is correctly left off the File plan.
- `src/testbed/registry.ts` already imports all three `.preview.tsx` files — confirmed no new preview slug needed, matching the plan's explicit note.
- CSS correctness of the corner-transform design: `translate(±50%, ±50%)` resolves against the *translated element's own* box per the CSS transforms spec, so centering both the boat (42% of T) and the rider (29% of T) on the same corner point with the same transform guarantees the smaller box is always inside the larger one, for any T — the "Decisions" section's rationale checks out, not just asserted.
- Checked `docs/ai/lessons-learned.md` for relevant entries: the z-index bare-class lesson (2026-10-05 entry) is already satisfied — plan changes no z-index values, only percentage sizing and `cornerStyle`/`slotStyle`. No new lesson to append; this plan doesn't introduce a new non-obvious failure mode, it fixes one that was already documented via triage/ui-design's root-cause analysis.

Design review:
- Simpler option considered and rejected with reasons in "Decisions" (literal insets vs. shared translate-based centering; numeric percent constants vs. static Tailwind classes; mirrored vs. fixed collector offset) — each rejection is concrete, not hand-waved.
- Responsibility split is clean: implementer-a owns types/map/hook/fixtures (data shape), implementer-b owns styles/tsx (presentation), matching the component-architecture skill's file responsibilities. No file is owned by both.
- Contracts section gives both implementers everything needed to work in parallel without touching each other's files: exact new types, exact map/hook code snippets, exact Tailwind class strings.
- Phases are a single small phase appropriate for a tier-M, view-only, 3-component sizing fix; no reducer/service/Firestore surface touched.
- Test plan correctly puts logic tests (cornerStyle/slotStyle computation, percent values) before view tests, and the new composed same-corner test in `TileOccupants.test.tsx` is exactly the test that would have caught the original bug — good regression coverage, not just coverage for its own sake.
- Preview states explicitly add sized "tile box" wrappers at both clamp endpoints (46px/136px) — necessary because percentage sizing collapses to 0 without an explicitly-sized ancestor, which the plan's own Risks section calls out and the preview states correctly address.
- Risks section correctly flags the pre-existing `GameLog.fixtures.ts` dev-server blocker from a different in-progress task and instructs preview-a to report BLOCKER rather than patch it — correct scope boundary.

No findings. Nothing to send back.

## Addendum: collector-overlay sizing correction (post-approval)
The above review approved the plan's original collector-overlay numbers (`w-[17%] h-[17%] -top-[33%] -left-[13%]`), which turned out to be geometrically impossible once implementer-b began building against them (BLOCKER: a 40%-of-hull collector, the sizing table's actual instruction, cannot stay inside the hull and clear of the centered rider at the same time). Fixed in the "Decisions" and "Contracts" sections above (`w-[14%] h-[14%] top-0 left-0`), with `ui-design.md`'s sizing/States tables amended to match. Status reverted to DRAFT pending architect-b re-review of this specific delta; no other part of the plan changed.

## Review (architect-b): delta re-review of the collector-overlay fix
VERDICT: APPROVED

Scope: re-reviewed only the delta named by the coordinator — plan.md's Decisions (`Superseded finding` bullet), Contracts (`collectorOverlay` class), Risks (new bullet), Addendum, and ui-design.md's corrected sizing-table/States-table rows and new "Correction" section. The rest of the previously-approved plan (file plan, other contracts, phases, test plan) is unchanged and was not re-verified in this pass, per instruction.

Geometry independently re-derived, not taken on faith:
- Both `.boatEntry` (42% of T) and the occupant `.slot` (29% of T) are positioned with `top/bottom/left/right: '0'` plus `transform: translate(±50%, ±50%)`. Working through the CSS: an element anchored flush to a corner (e.g. `bottom:0,right:0`) has that corner at the tile's corner point C; `translate(50%,50%)` (a percentage of *its own* box) shifts it by half its own width/height, which algebraically moves the box's **center**, not just a corner, onto C. So the hull and the rider are concentric squares both centered at C — confirmed this is what makes "rider always inside hull, any size" true by construction, not an approximation.
- Hull half-extent from C: 21% of T (half of 42%). Rider half-extent from C: 14.5% of T (half of 29%). Margin ring on every side: 21 − 14.5 = 6.5% of T, exactly as plan.md's "Superseded finding" states.
- As a fraction of the hull's own box (42% of T): 6.5/42 = 15.476...% ≈ 15.5%, matches the plan's stated "15.5% maximum" and "14% leaves a safety margin" (14 < 15.48, margin ≈ 1.48 percentage points of the hull's box — close enough to the plan's "≈1.5" to be the same number, rounding).
- Checked the chosen anchor (`top-0 left-0` flush, no offset) actually clears the rider, not just "small enough in isolation": the collector (14% of hull = 5.88% of T) placed flush in the hull's top-left corner spans, in hull-local terms, from the hull's own edge (−21% of T from C) inward to −21+5.88 = −15.12% of T from C, on both axes. The rider's edge on that same axis is at −14.5% of T from C. Since −15.12 < −14.5 (the collector's inner edge is farther from C than the rider's edge), the collector's x-range and the rider's x-range are disjoint — two axis-aligned rectangles with disjoint ranges on any one axis cannot overlap, regardless of the other axis. So the "no overlap with rider" claim holds by construction for any T, not just at the two sampled endpoints.
- Checked "fully inside the hull": the collector's far corner (−21% of T from C) sits exactly on the hull's own boundary (flush), not past it — satisfies "no accessory pixel renders outside the boat hull's box" (touching the edge, not exceeding it).
- Re-derived the two sampled pixel values independently: at T=46px, 14% × 42% × 46 = 2.7048px ≈ 2.7px (matches); at T=136px, 14% × 42% × 136 = 7.9968px ≈ 8px (matches, and matches the originally-approved desktop estimate as claimed).
- `plan.md` Contracts' `collectorOverlay` class (`w-[14%] h-[14%] top-0 left-0`, line ~233) matches the Decisions math and the ui-design.md Correction section's numbers exactly; no drift between the three places this number appears (Decisions, Contracts, ui-design.md sizing table / States table / Correction section) after folding in one stale leftover (see Findings).
- `ui-design.md`'s "Correction (architect-a, during implementation)" section's math matches plan.md's "Superseded finding" bullet word-for-word on the ratios (6.5%, 15.5%, 14%, 2.7px, 8px) — the two documents are not drifting from each other.

Findings (folded in directly, not sent back — trivial wording only):
- `plan.md`'s "Decisions" bullet about static Tailwind percent classes (the one listing "boat 42%, rider 29%, collector 17%, grove tree 28%, accent tree 16%") still named the superseded collector number two lines above the correction that replaces it — stale and could read as a second, conflicting spec on a quick scan. Fixed directly: now says "collector 14% of the boat's own box" with a pointer to the "Superseded finding" bullet for the hull-relative math, consistent with the corrected Contracts class.

On the residual-risk framing (the question the coordinator specifically asked about): deferring the mobile-legibility question (≈2.7px at T=46px) to `ui-verify`/preview-a, with an explicit escalation path back to ui-designer-a/b if confirmed illegible, is the right call and does not block approval now:
- The two things architect-a actually fixed — the geometric contradiction (couldn't be inside-hull and clear-of-rider at once) and the containment/overlap guarantees — are both resolved with a proof that holds for any T, verified above independently. Nothing about correctness is still open.
- What's left (is 2.7px of a GIF sprite legible to a player) is a subjective visual judgment, not a computable fact — exactly the kind of check this pipeline reserves for a browser/screenshot step (`ui-verify`), per CLAUDE.md's "Check visible changes in a browser before calling them done" and the `testing`/`ui-verify` skills' emphasis on verifying behavior in a browser rather than guessing.
- The alternative — architect-a picking a bigger collector size or a hide-below-threshold rule right now — would be new, unreviewed scope nobody asked for (ui-design.md's spec says nothing about hiding the collector at small sizes), and risks the same mistake that caused this BLOCKER in the first place: an architect-side numeric guess that isn't checked against the real rendered result until a builder hits it.
- The risk is not silently absorbed: it has an owner (preview-a, then `ui-verify`), a concrete check (look at the mobile screenshot), and a named escalation path if it fails (back to ui-designer-a/b, not another architect patch) — all stated in both `plan.md`'s Risks bullet and the Decisions/Addendum text. That is a complete risk entry, not a gap.
- If this does come back as illegible, it is cheap to fix later (one more sizing-table number) and does not block any other part of this phase (boat/rider corner alignment and tree sizing are unaffected by whatever happens to the collector). Holding up the whole phase on a guess about legibility would cost more than letting the browser check decide.

DONE
