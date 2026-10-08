# UI design: Map decoration sprite scale (boats, riders, trees)

## Spec (ui-designer-a)

### Purpose and user story
As a player scanning the board, I want the dock boat, its rider, and trees to read as a single coherent, consistently-scaled island scene at any tile size (mobile clamp 46-68px, desktop clamp 94-136px, any zoom level) so that the board looks intentional instead of like loose stickers of the wrong size pasted near each other.

### Root cause (verified this session, supersedes triage's "coincidence" framing)
- `TileBoats.types.ts:3-8` (`BOAT_CORNER_POSITIONS`) assigns corners in order **br, tr, tl, bl** (index 0 → bottom-right).
- `TileOccupants.tsx:9-14` / `TileOccupants.hook.ts:8-13` (`positions`) assigns corners in order **bl, br, tl, tr** (index 0 → bottom-left).
- For a tile with one occupant (the common case), the boat renders bottom-right while the army's full sprite renders bottom-left — opposite corners of the same tile, by an array-order mismatch, not coincidence. This is the literal cause of "renders as a separate uncomposed sprite instead of appearing inside the boat."
- Separately, `TileBoats.styles.ts:4` (`w-7 h-7 sm:w-8 sm:h-8`, 28-32px flat), `TileOccupants.styles.ts:6` (`max-w-[86px]` flat), and `TileForest.map.ts:21-37` (16-30px flat `size`) never scale with the tile's own rendered size (`IslandTile.styles.ts:6`, `aspect-square w-full`, driven by `MapGrid.tsx:49-52`'s `clamp(46px,13.5vw,68px)` mobile / `clamp(94px,12.5vh,136px)` desktop). Fixed px that looks right at one clamp endpoint is wrong at the other.

### Design decision (resolves triage's open question)
Composition is **(b) two independently-sized existing sprites, with the rider's anchor defined relative to the boat's position** — no new art (confirmed no combined boat+rider sprite exists: `docs/ai/tiny-swords-asset-catalog.md:9,21`; the Tiny Swords asset-replacement session is out of scope).
- The **rider is the occupant's existing army idle sprite** (`PLAYER_DATA[color].sprite.idle`, e.g. `/sprites/blue.gif` — already what `TileOccupants` renders today). Verified visually: `blue.gif` is a full armored knight; `collector_blue_idle.gif` is a small rounded civilian bust. Per current logic the knight (via `TileOccupants`) already renders unconditionally for every occupant with no resource-positioned gating, while the small collector (via `TileBoats`' `showIdleCollector`) is gated off when the army is actively positioned on a resource. Keep both gating rules exactly as-is (zero logic change) — only fix size, corner alignment, and anchoring:
  - **Occupied corner** (an army is on this tile): the corner shows one boat with the knight rider sized and positioned inside its hull. `TileOccupants`' corner order is corrected to match `BOAT_CORNER_POSITIONS` exactly, so occupant index N's rider always lands on the same corner as boat entry index N.
  - **Parked corner, no occupant** (base tile, owner's boat waiting, nobody deployed): boat alone, with the small collector-idle sprite as the "someone's tending the dock" accessory — unchanged purpose, resized to be proportional to the boat instead of a fixed-px overflow hack.
- Everything is sized as a **percentage of the tile's own box** (the pattern `TileForest.map.ts` already uses for position, e.g. `top: '18%'`) instead of fixed Tailwind px classes, so scale tracks `clamp()` automatically at both ends.

### Placement and layout
- Desktop (1280×720, tile ≈94-136px by `MapGrid.tsx:50`): decoration lives inside/around each `IslandTile`'s own corner, same as today — no new panel, no new DOM region. The boat corner box overhangs the tile's own rounded-lg border (`IslandTile.styles.ts:6`, no `overflow-hidden` on `styles.tile`, confirmed — content may already render past the tile edge, same pattern as `styles.borderRow`'s `-bottom-[11px]`, `IslandTile.styles.ts:57`).
- Mobile (390×844, tile ≈46-68px): identical relative proportions via percentage sizing; the 5×6 map grid stays fully visible and unaffected (`docs/ai/tiny-swords-asset-catalog.md` not relevant here; grid dimensions `MAP_COLS`/`MAP_ROWS`, `src/lib/types/actions.ts:1-2`, untouched). No HUD collapse needed — this is tile-internal decoration, not a new HUD element.
- Layering (`IslandTile.tsx:100-106`, unchanged order): terrain → forest (z-12) → death effect → boat hull (z-25) → center content (z-20, visually under boat due to DOM order... confirmed current order already has boat after center content in paint order at z-25 > z-20) → rider (z-30, already above boat — confirmed `TileOccupants.styles.ts:4` `z-30` > `TileBoats.styles.ts:2` `z-[25]`) → border row.

### Sizing table (all values % of the tile's own side length `T`; replaces fixed px)
| Element | Current (fixed) | New (relative) | At T=46px (mobile min) | At T=136px (desktop max) |
|---|---|---|---|---|
| Boat hull | 28-32px | 42% of T | ~19px | ~57px |
| Rider (occupied corner, knight sprite) | capped 86px, own slot | 70% of the **boat's** box (≈29% of T) | ~13px | ~40px |
| Collector accessory (whenever `showIdleCollector` is true: zero-occupant parked state, or occupied-idle before the army positions on a resource — see States table) | 20-24px | **Corrected during implementation, see "Correction (architect-a)" below: 14% of the boat's box (≈6% of T), flush at the hull's own top-left inner corner (`top-0 left-0`, replacing the earlier negative offset)** | ~2.7px | ~8px |
| Grove trees (Empty/Cleared, 2-3 trees) | 26-30px | 28% of T each | ~13px | ~38px |
| Base accent trees (2 trees) | 16-18px | 16% of T each | ~7px | ~22px |
| Special-tile accent tree (1 tree) | 16px | 16% of T | ~7px | ~22px |

### States
| State | What the player sees | Trigger |
|---|---|---|
| Base tile, boat parked, no occupant | Boat hull only + small collector accessory inside the hull's upper area | `island.type === Base`, `island.occupants.length === 0`, `baseOwner` exists (`TileBoats.map.ts:87-94`) |
| Occupied corner, idle (not gathering) | Boat hull + full knight rider + the small collector accessory, all at the same corner, index-matched. Per `TileBoats.map.ts:84` (`showIdleCollector: !isPositionedOnResource`), the collector **does** render here, unchanged from today — the knight rider (`TileOccupants`, unconditional) and the collector (`TileBoats`, gated) are two independent layers that now land on the same corner instead of opposite ones. **Corrected during implementation (see "Correction" below):** the collector is sized at 14% of the boat's box and anchored flush at the hull's own top-left inner corner (`top-0 left-0`), not the originally-specified 40%-of-boat/negative-offset combination, which was geometrically incompatible with staying inside the hull and clear of the rider at the same time | `occupants.length > 0`, `showIdleCollector === true` (not positioned on resource) |
| Occupied corner, positioned on resource | Boat hull + knight rider only (rider always shows per `TileOccupants`' existing unconditional render — unchanged); the collector accessory is hidden specifically in this state (`showIdleCollector: false` when `isPositionedOnResource`, `TileBoats.map.ts:78,84`) | `island.positionedBy` includes this player |
| Occupant has acted this turn | Rider renders at `opacity-50` (existing `isFaded` cva variant, `TileOccupants.styles.ts:6-13`, unchanged token) | `army.hasActed === true` |
| Occupant mid-death-animation | No rider renders on this tile (existing suppression, `TileOccupants.hook.ts:36-44`, unchanged) | matching entry in `gameState.deathAnimations` |
| Multiple occupants, same tile | Each occupant gets its own boat+rider pair at its own corner, index-matched 1:1, no overlap | `island.occupants.length > 1` |
| Grove / accent trees | Sized per the table above, always fully inside the tile's rounded border (forest container keeps `overflow-hidden`, `TileForest.styles.ts:2`) | `IslandTile.type` per `TileForest.map.ts:6-44`, unchanged |

### Components and tokens
- Reuse only: `next/image` with `unoptimized` (existing pattern in all three components), `class-variance-authority` (`TileOccupants.styles.ts:1`, `IslandTile.styles.ts:1`), `cn()` from `@/lib/utils`.
- No shadcn primitives involved — these are non-interactive map decorations (`pointer-events-none` on both `TileBoats.styles.ts:2` and `TileOccupants.styles.ts:4`, confirmed, unchanged).
- Tokens: shadow `drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]` / `drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]` (existing values, keep as-is — purely decorative sprite shadows, not theme colors). No new color tokens; nothing here touches `bg-*`/`text-*`/`border-*`.
- No new visual pattern introduced — this is a sizing/positioning/alignment correction of three existing components, one shared convention (percentage-of-box instead of fixed px).

### Copy
- None. All three components are non-interactive decorative sprites with no text, consistent with current behavior (`alt` text on `Image` stays descriptive and unchanged: `"${color} boat"`, `"${color} army"`, `"Island Tree"`, `"${color} collector idle"`).

### Interactions and motion
- None of these three layers are interactive (`pointer-events-none`, confirmed above) — no click, no keyboard path, no new motion. Keep existing `transition-transform duration-300` on boat and tree containers (decorative only, dead on boat specifically since `pointer-events-none` blocks the `hover:scale-110` on `TileBoats.styles.ts:4` from ever firing — pre-existing, out of scope to fix, flagging for implementer-a as a low-value cleanup candidate only, not a requirement).
- `motion-reduce:` not applicable — no new animation is introduced; existing `.gif` sprite animation (boat idle, rider idle, collector idle) is unaffected by this sizing change.

### Accessibility
- No touch targets apply: every element here is `pointer-events-none`, decorative only (WCAG 2.5.5/2.5.8 target-size criteria don't apply to non-interactive content).
- `alt` text stays present and descriptive on every `Image` (unchanged from current code), so screen readers skip these as decorative-but-labeled, consistent with current behavior.
- No color-only signaling: army identity is carried by sprite art (`PLAYER_DATA[color]`) exactly as today, unaffected by this change.

### Acceptance criteria
- [ ] At desktop tile size (zoom to max, tile ≈136px), the docked boat's rendered bounding box visibly crosses the tile's own rounded-lg border on the anchored corner (part of the boat sprite paints outside the tile's `0 10px 20px` shadow/border box), not fully inside it.
- [ ] At mobile tile size (390×844 viewport, tile ≈46-68px), the boat-to-tile size ratio is visually consistent with the desktop ratio (~42%), not a fixed small or oversized blob — confirm via computed bounding-box width ÷ tile bounding-box width at both viewport sizes.
- [ ] For a tile with exactly one occupant, the rider (knight sprite) and the boat hull render at the **same corner** of the tile (both bottom-right for occupant index 0, matching `BOAT_CORNER_POSITIONS[0]`), with their bounding boxes overlapping — not opposite corners.
- [ ] For a tile with 2+ occupants, each occupant's boat+rider pair occupies a distinct corner with no two pairs sharing a corner, and no rider's corner diverges from its own boat's corner.
- [ ] A base tile with a parked boat and zero occupants shows the boat hull with the small collector accessory fully contained inside the boat's own bounding box (no accessory pixel renders outside the boat hull sprite's box).
- [ ] For an occupied, idle (not positioned-on-resource) corner, all three elements render together at the same corner — boat hull, full knight rider, and collector accessory — with the collector's bounding box fully inside the boat's bounding box and not overlapping the rider's torso/face region (collector sits at the hull's upper-outer edge per the sizing table). Once that same occupant positions on a resource, the collector disappears and only boat + rider remain (`showIdleCollector` turns false).
- [ ] An occupant with `hasActed: true` shows its rider at reduced opacity (`opacity-50`), verified by computed style, same as pre-change behavior.
- [ ] An occupant mid-death-animation shows no rider sprite on its tile (same suppression as pre-change behavior).
- [ ] Grove trees on an Empty/Cleared island render at ≈28% of the tile's side length each and stay fully inside the tile's visible border (no clipped half-tree at the forest container edge).
- [ ] Base-tile accent trees (2) and the Special-tile accent tree (1) render at ≈16% of tile side, visibly smaller than grove trees, and do not overlap the base crest image / star icon at tile center.
- [ ] No regression: `data-testid="tile-boats"`, `data-testid="docked-boat"`, `data-testid="collector-idle-${color}"`, `data-testid="tile-forest"`, `data-testid="tile-forest-tree"` all still present (existing tests key off these, `TileBoats.test.tsx`, `TileForest.test.tsx`).

## Review (ui-designer-b)
VERDICT: APPROVED

Verified this session against source (not taken on faith):
- `TileBoats.types.ts:3-8` `BOAT_CORNER_POSITIONS` order br/tr/tl/bl — confirmed.
- `TileOccupants.hook.ts:8-13` and `TileOccupants.tsx:9-14` `positions` order bl/br/tl/tr — confirmed, duplicated in both files (hook and view both declare the same array independently; worth an implementer note, not a spec issue since it's pre-existing duplication, not introduced by this change).
- `TileBoats.styles.ts:4,6` (`w-7 h-7 sm:w-8 sm:h-8`, `w-5 h-5 sm:w-6 sm:h-6 -top-2.5 -left-1`), `TileOccupants.styles.ts:6` (`max-w-[86px]`), `TileForest.map.ts:21-37` (16-30px) — all fixed-px, confirmed, matches "current" column of sizing table.
- `IslandTile.styles.ts:5-6` `tile` cva has no `overflow-hidden` — confirmed, boat can overhang.
- `IslandTile.tsx:100-106` DOM order forest → boat → centerContent → occupants, with z-10/12/25/20/30 stack (`IslandTile.styles.ts:47,48`, `TileBoats.styles.ts:2`, `TileOccupants.styles.ts:4`) — confirmed, rider (z-30) paints over boat (z-25) over centerContent (z-20).
- `TileForest.styles.ts:2` forest container keeps `overflow-hidden` — confirmed.
- `MapGrid.tsx:50` clamp values `clamp(46px, 13.5vw, 68px)` / `clamp(94px, 12.5vh, 136px)` — confirmed, matches doc exactly.
- Sizing-table math re-derived independently at both T endpoints (boat 42%, rider 70%-of-boat, collector 40%-of-boat, grove trees 28%, accent trees 16%) — all six rows check out to the nearest px shown.
- `docs/ai/tiny-swords-asset-catalog.md:9` (boat row) and `:21` (collector row) — confirmed no combined boat+rider sprite exists in the catalog, supporting the "(b) no new art" decision.
- Test IDs `tile-boats`, `docked-boat`, `collector-idle-${color}` (`TileBoats.tsx:12,15,26`) and `tile-forest`, `tile-forest-tree` (`TileForest.tsx:14,18`) all exist as cited.

One real gap found and fixed in this pass (folded in, not sent back — see edits above):
- `TileBoats.map.ts:84` sets `showIdleCollector: !isPositionedOnResource`, i.e. the collector renders whenever an occupant is idle, **not** only in the zero-occupant branch. The original States table's "positioned on resource" row claimed the collector "does not apply here, it only exists for the zero-occupant branch," which is backwards — the collector is hidden *only* when positioned on a resource, and shows in both the zero-occupant parked state *and* the occupied-idle state. The original sizing table's "(parked corner only)" label on the collector row was consistent with that same wrong framing. Left as originally written, an implementer building strictly from the sizing/states tables would never anchor the collector relative to the knight rider, because the tables said that combination never happens — but per `TileBoats.map.ts:84` it is the common idle case for any occupied, non-gathering corner. Fixed: States table rows (idle-occupied now explicitly includes the collector with its anchor rule; positioned-on-resource row corrected to state why the collector is absent there), sizing table's collector row reworded to list both triggering states, and a new acceptance criterion added for the three-element (boat+rider+collector) idle-occupied composition, checking the collector's box stays inside the boat's box and clear of the rider's torso/face. This was a correctness fix to existing content, not a new visual pattern or structural change, so folded in directly per protocol rather than sent back.

Everything else checked clean:
- **Theme/tokens**: no new color/shadow tokens introduced; reuses existing `drop-shadow-*` values and `cn()`/`cva` patterns already in these three components. No `bg-*`/`text-*`/`border-*` touched.
- **States**: empty/base/occupied/positioned/faded/death-suppressed/multi-occupant/grove all covered; the one gap is fixed above. No loading or error state applies — these are pure derived-data decorations with no async fetch of their own (data comes from `gameState`, already loaded by the time `IslandTile` renders).
- **Mobile fit**: percentage-of-tile sizing is span-invariant by construction; grid dimensions (`MAP_COLS`/`MAP_ROWS`) untouched; no new DOM region added, so nothing can newly cover the grid.
- **Accessibility**: all three layers stay `pointer-events-none` (confirmed `TileBoats.styles.ts:2`, `TileOccupants.styles.ts:4`, `TileForest.styles.ts:2`), so WCAG 2.5.5/2.5.8 target-size don't apply; `alt` text unchanged and descriptive; no color-only signaling introduced beyond what already exists (`PLAYER_DATA[color]` sprite identity, unaffected).
- **Readability mid-turn**: corner-matching the two independent arrays (rider vs. boat) is the single change that most improves this — today's opposite-corner placement is the actual "pasted stickers" complaint; after the fix, a glance at one corner reads as one coherent dock scene. The collector/rider co-occurrence fix above keeps that readability intact for the idle state instead of leaving an unspecified overlap risk.
- **Feasibility**: no new primitives, no new sprite assets, same `next/image`/`cva`/`cn()` patterns already in all three files; percentage sizing is a mechanical swap of the existing literal `size`/width-class values for percentage strings, same shape as `TileForest.map.ts`'s existing `top`/`left` percentage pattern (`:21-37`) extended to `size`.
- **Acceptance criteria**: all are observable by computed bounding box/opacity/test-id in a browser or RTL test; none require subjective judgment. The regression criterion correctly enumerates all five test-ids actually present in the three components.

## Final spec
Everything in "Spec (ui-designer-a)" above, as amended by this review's edits (States table, sizing table's collector row, and the added acceptance criterion for the idle-occupied three-element composition). No other changes. Ready for architect-a.

## Correction (architect-a, during implementation — resolves implementer-b's BLOCKER)
The collector sizing above ("40% of the **boat's** box ... clear of the rider's footprint") is geometrically impossible as specified, and was caught only once implementer-b built against it, not during planning or this review:
- `.collectorOverlay`'s percentage sizing resolves against its actual containing block, the boat hull (`.boat`, 42% of T) — not T directly.
- The boat (42% of T) and the rider (29% of T, per the sizing table's own "70% of the boat's box" row) are both centered on the *same* tile-corner point (plan.md's `CORNER_TRANSFORMS` design, approved separately and unaffected by this correction). That leaves a margin ring between the rider's edge and the hull's edge of only `(42-29)/2 = 6.5%` of T, i.e. `6.5/42 ≈ 15.5%` of the hull's own box.
- A collector at 40% of the hull is more than double that available margin: it cannot simultaneously satisfy "fully inside the boat's bounding box" and "not overlapping the rider's torso/face" (both required by the acceptance criteria), regardless of what offset is chosen.

**Fix:** collector sized at 14% of the boat's box (within the 15.5% maximum, leaving a small safety margin), anchored flush at the hull's own top-left inner corner (`top-0 left-0`) instead of the earlier negative offset. This guarantees zero bounding-box overlap with the rider by construction, for any tile size, with no per-corner math — the corner-agnostic "always upper-left regardless of the boat's actual tile corner" placement direction is unchanged from the original intent.

**Known residual limitation, not resolved by this fix:** 14% of the boat's 42%-of-T box is 5.88% of T. At the mobile minimum tile size (T≈46px) that renders at **≈2.7px** — likely below legible size for a sprite GIF. At the desktop maximum (T≈136px) it's **≈8px**, matching this doc's original desktop estimate. Decentering the rider instead of shrinking the collector further was considered and rejected for this revision (it would require reopening `TileOccupants`' already-approved, corner-agnostic rider positioning, out of scope for this fix). `ui-verify` must check mobile-size legibility directly; if the collector is confirmed illegible in practice at small tile sizes, that is a new design question for ui-designer-a/b (e.g. hiding the collector below a tile-size threshold, or revisiting the hull/rider percentages), not something to patch again at the architect/implementer level.

## Addendum (ui-designer-a, 2026-10-08 — resolves preview-a's mobile legibility finding)

preview-a measured the residual limitation flagged above directly: **2.6px** at a 46px mobile tile ("a single speck at the hull's inner top-left corner, not a readable sprite"), **7.9px** at a 136px desktop tile ("small but identifiable"). Decision: **(a) hide the collector accessory entirely on mobile.**

**Rationale:**
- The collector's information value is narrow and already redundant with other signals: "idle, not positioned on a resource" (`TileBoats.map.ts:84`, `showIdleCollector: !isPositionedOnResource`). A player checking resource-positioning status reads it from the island's own state (resource icon, `positionedBy`), not from a sub-3px fleck on a boat. Losing it changes nothing about what information is available, only how redundantly it's shown.
- A 2.6px fleck is worse than no accessory. It isn't "graceful degradation" of a nicety — a shape too small to resolve as the collector sprite doesn't read as "tending the dock," it reads as render noise (an anti-aliased dot, or in a bad case a one-pixel artifact), undermining this task's own purpose statement ("read as a single coherent... scene," not "loose stickers"). Showing a single-digit-px non-sprite does the latter.
- The boat+rider composition — the actual fix this task exists for (corner-matching the two previously-mismatched arrays) — is fully intact and legible without the collector at every tile size, mobile included. Nothing load-bearing depends on the collector rendering on mobile.
- Mobile's entire clamp range (46-68px) stays under the legibility floor this data implies: at mobile's own maximum (68px) the collector would render at `68 × 0.42 × 0.14 ≈ 4px`, still below "small but identifiable" territory (that threshold was only reached at 136px). So "hide on mobile" isn't a cliff at one measured point reopening at the next breakpoint — the entire mobile range fails the same way the measured 46px point did. Desktop's range (94-136px) includes the one point confirmed identifiable (136px); its lower end (94px) is unmeasured and smaller than 7.9px, which this addendum accepts as option (b), graceful degradation, for desktop only — not reopening architect-a's hull/rider percentages, and not pursued further here. If a future pass finds the desktop minimum also illegible, that's a new finding to bring back here, not a reason to block this fix.

**Mechanism (for implementer-b, precise so it doesn't need re-routing):**
- Breakpoint: viewport width **768px**, i.e. Tailwind's default `md` breakpoint — confirmed unmodified in `tailwind.config.ts` (no custom `screens` key) and numerically identical to `useIsMobile`'s own threshold (`src/modules/shared/use-is-mobile.ts:3`, `MOBILE_BREAKPOINT = 768`, matching media query `max-width: 767px`).
- **SUPERSEDED mechanism (do not implement):** the earlier wording "pure CSS, no new JS hook, `hidden md:block` on the collector wrapper" is withdrawn. A CSS visibility class leaves the element in the DOM, so it cannot satisfy the DOM-absence acceptance criterion (`collector-idle-${color}` absent below 768px).
- **Implementation (current):** conditional render via `useIsMobile()` from `@/modules/shared`, confirmed necessary because the DOM-absence acceptance criterion cannot be satisfied by a CSS-only visibility class. The connected `TileBoats()` in `TileBoats.tsx` calls `useIsMobile()` and passes `showIdleCollectors={!isMobile}` to `TileBoatsView`, which renders the collector only when `showIdleCollectors && boat.showIdleCollector && boat.idleCollectorSprite`. `collectorOverlay` in `TileBoats.styles.ts` carries no responsive-visibility class. Zero change to `TileBoats.map.ts`'s `showIdleCollector` logic — that gate still decides *whether* the collector is eligible to render at all (not positioned on a resource); the new class decides whether an eligible collector is actually painted, purely by viewport width.
- This is a visibility toggle, not a size change: the collector keeps the 14%-of-boat sizing and `top-0 left-0` anchor from the Correction above on every viewport where it's shown (≥768px); it is simply not rendered (or rendered then hidden, implementer-b's choice of mechanism) below that width.

**Updated acceptance criteria (replaces the relevant parts of the existing list above, rest unchanged):**
- [ ] At viewport width ≥768px (desktop), the collector accessory renders for every state where `showIdleCollector === true`, exactly as specified in the Sizing table and States table above — no change from the existing criteria.
- [ ] At viewport width <768px (mobile, including the full 390×844 reference viewport), the collector accessory does not render in any state, even when `showIdleCollector === true` — verified by absence of `data-testid="collector-idle-${color}"` in the DOM (not merely `opacity-0`/visually hidden — it must not paint a sub-legible fleck).
- [ ] Boat hull and knight rider composition (corner-matching, sizing, layering) is unaffected by and independent of this mobile hide — verified by the existing boat/rider acceptance criteria above passing identically at both viewport widths.
- [ ] No regression: `data-testid="tile-boats"` and `data-testid="docked-boat"` still present at both viewport widths; `data-testid="collector-idle-${color}"` present at ≥768px matching eligibility, absent at <768px regardless of eligibility.
