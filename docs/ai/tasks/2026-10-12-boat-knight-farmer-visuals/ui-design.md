# UI design: Boat, knight and farmer visual placement

## Spec (ui-designer-a)

### Purpose and user story
As a player scanning the map, I want each army's knight to read as standing on land next to its boat, and its idle farmer to read as riding inside the boat hull, so a tile's occupants are legible at a glance instead of a pile of sprites stacked on one corner.

### Current geometry (verified)
All percents are of tile side `T`. Source: `src/modules/map/island-tile-slots.types.ts:16-30`, `TileOccupants.hook.ts:55-72`, `TileBoats.styles.ts:1-14`, pixel-sampled from `public/sprites/boat.gif` and `public/sprites/collector_blue_idle.gif` this session.

- Boat entry box: 42% of T, anchored flush on its corner (`BOAT_CORNER_POSITIONS`), then `translate(±50%,±50%)` centers the box exactly on the tile's corner point. For the `br` corner this puts the box at tile-x/y 79%–121% (half off-tile).
- Knight (occupant) box today: 29% of T, same corner, same `CORNER_TRANSFORMS` entry as its boat → centered on the identical point, so it sits inside the boat's footprint, confirmed in the `island-tile` testbed preview (knight's shield/sword peek out from behind the hull art instead of standing beside it).
- Farmer (`collectorOverlay`) today: 40%×40% of the *boat's own box*, flush `bottom-0 right-0` inside it → for `br` this lands at tile-x/y ≈ 4.2%–21%, outside the hull's own painted silhouette (boat.gif's non-transparent pixels span only 21%–78% x / 29%–71% y of its box), i.e. the farmer stands on grass next to the hull, confirmed visually in the `island-tile` preview ("Resource island, 2 nodes…" state): a lone blonde collector figure clearly separated from the boat art by bare grass.
- Boat art has no inherent facing direction — `boat.gif` is a symmetric-ish oval basket, unrotated today regardless of corner. There is nothing in the art to rotate the knight *to match*.

### Placement and layout
- Desktop (1280×720) and mobile (390×844): identical rule, all values are `%` of the tile side so they scale with the tile (desktop fixed size; mobile `clamp(46px, 13.5vw, 68px)`). No separate mobile layout for the knight. The farmer keeps today's existing, out-of-scope mobile suppression (`TileBoats.tsx:52-54`, `showIdleCollectors={!isMobile}` — unchanged by this spec).

**Knight — new per-corner slot** (replaces reusing `BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS`):

| Corner | style | size |
|---|---|---|
| `br` | `bottom: 24%; right: 24%` | 27% of T |
| `tr` | `top: 24%; right: 24%` | 27% of T |
| `tl` | `top: 24%; left: 24%` | 27% of T |
| `bl` | `bottom: 24%; left: 24%` | 27% of T |

No `transform` needed — the box is flush-anchored by its two offset edges, so it never needs centering on a point. (Avoids stacking a Tailwind `scale`/`translate` utility on top of an inline `transform`, the exact bug in `docs/ai/lessons-learned.md:82`; keep any future scale/fade variant on the inner `<Image>`, never on the positioned slot, matching `TileOccupants.styles.ts`'s existing split.)

Verified non-overlap: for `br`, knight spans tile-x/y 49%–76%; the boat spans 79%–121%. 3-point clear gap, no shared pixels in the corner box. Same clearance holds by symmetry for the other three corners.

This also satisfies the existing clearance rule documented at `island-tile-slots.types.ts:1-4` (a non-corner slot clears the 0–22%/78–100% band), reusing the same 24% figure already applied to `DUAL_RESOURCE_SLOTS`/`TRIPLE_RESOURCE_SLOTS`/`EMPTY_GROVE_SLOTS` for the same reason.

**Why offset, not image rotation:** the triage asks for the knight's "facing" to match its corner. `boat.gif` carries no directional art to align to (see above), and the knight's idle sprite (`blue.gif` etc.) is a front-facing pose — rotating it 90°/180°/270° per corner would turn it sideways or upside-down and break pixel-art readability. The per-corner diagonal inset above *is* the facing cue: which two edges the knight sits closest to always matches which corner its boat occupies, so the knight visibly "belongs" to that boat without any sprite rotation.

**Overflow occupants** (5th+ at the same corner, `index >= 4`): keep existing behavior — same corner slot (`index % 4`), `opacity-90` + `scale-90` on the image, unchanged by this spec. Nice-to-have, not required for acceptance: nudge each extra overflow index 8% further along the same two offset edges (e.g. a 5th occupant at `br` → `bottom: 32%; right: 32%`) so repeated occupants don't stack on exactly the same pixels. Leave to implementer's judgment; the triage scope is corner placement + rotation for the primary occupant, not overflow stacking.

**Farmer — recomposed inside the hull** (replaces the flush corner badge):

- Container stays the same `.boat` box (42% of T) as today; only the inner `collectorOverlay` anchor changes.
- New size: `w-[36%] h-[32%]` of the boat box (was `w-[40%] h-[40%]`).
- New position: centered at `left: 50%; top: 54%` of the boat box with `-translate-x-1/2 -translate-y-1/2` (was `bottom-0 right-0`).
- Verified containment: this places the farmer's box at boat-box-local x 32%–68%, y 38%–70%, fully inside `boat.gif`'s painted silhouette (21%–78% x, 29%–71% y) and inside its ribbed interior band (sampled ~31%–73% x at mid-height) — the farmer now sits on the basket floor instead of beside the hull.
- Keep `z-[26]` on the overlay (already above the hull image in paint order); keep the existing `drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]` token on the farmer image — no new shadow value needed, the lighter shadow reads correctly now that the hull itself grounds the figure.
- No sprite rotation or mirroring for the farmer either — same reasoning as the knight.

### States
| State | What the player sees | Trigger |
|---|---|---|
| Army docked, not on a resource | Knight stands on land at its boat's corner offset (24%/27%, see table); farmer sits inside the hull at its new centered position | `showIdleCollector: true` (`TileBoats.map.ts:82`, unchanged logic) |
| Army positioned on a resource | Knight at the same offset; no farmer (boat renders, collector suppressed) | `showIdleCollector: false`, existing |
| Mobile viewport | Knight renders at the same % offset, scaled down with the tile; farmer stays hidden (existing `!isMobile` gate, unchanged) | `useIsMobile()` |
| 2nd+ army sharing a corner (overflow) | Knight faded/scaled as today (`opacity-90`, `scale-90`); optionally nudged further along its two offset edges (nice-to-have) | `index >= BOAT_CORNER_POSITIONS.length` |
| Army dying | Knight suppressed during its death animation, unchanged (`TileOccupants.hook.ts:30-38`) | existing |
| Fog of war | Knight suppressed per existing visibility rule, unchanged (`TileOccupants.hook.ts:40-53`) | existing |

### Components and tokens
- Reuse only: `src/modules/map/components/TileOccupants/*`, `src/modules/map/components/TileBoats/*`, `src/modules/map/island-tile-slots.types.ts`. No shadcn primitive involved (pure sprite layout), no new component.
- Tokens: no new color/shadow tokens. Reuse `drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]` (knight image, unchanged) and `drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]` (farmer image, unchanged). Keep `z-30` on `TileOccupants` container and `z-[25]`/`z-[26]` on `TileBoats` container/overlay exactly as they are (both already correctly bracketed per `docs/ai/lessons-learned.md:84` — do not convert to bare `z-25`/`z-26`).
- Suggested (non-binding) data location: a new `OCCUPANT_CORNER_SLOTS: Record<CornerId, SlotDef>` export next to `BOAT_CORNER_POSITIONS` in `island-tile-slots.types.ts`, holding the four rows in the table above with `size: 27`. Architect decides the actual shape/name.

### Copy
None — no text in this surface.

### Interactions and motion
- No new interaction. Existing hover scale on the boat (`hover:scale-110`, `TileBoats.styles.ts:6`) is unaffected since the farmer's new position is still a child of `.boat` and scales with it.
- No motion change; nothing here is gated by `prefers-reduced-motion` today and this spec doesn't add any.

### Accessibility
- No change to `alt` text: knight keeps `${occupant.color} army` (`TileOccupants.tsx:18`), farmer keeps `${boat.color} collector idle` (`TileBoats.tsx:35`, via `boat.idleCollectorSprite`). Both already describe the sprite's role; still correct after repositioning since the role (army occupant vs. idle collector) hasn't changed, only where it sits.
- No interactive element added; nothing needs a focus state.
- Contrast/shape: both sprites keep their own drop-shadow for separation from the grass background; unchanged.

### Acceptance criteria
<!-- Checked in the browser by the ui-verify skill, via the existing island-tile testbed states. -->
- [ ] In `/testbed/island-tile?state=Resource island, 2 nodes + occupants on all corners`, each knight's inline position matches its corner's row in the table above (`bottom/right`, `top/right`, `top/left`, or `bottom/left`, each `24%`, box `27%` of T) and does not visually overlap its boat's hull art.
- [ ] In the same state, no knight sprite is centered on the same point as its boat (the historical `CORNER_TRANSFORMS` center-on-corner behavior is gone).
- [ ] In `/testbed/island-tile?state=Occupied resource island (collector overlay test)` (or any state with `showIdleCollector: true`), the farmer sprite is visually contained within the boat hull's painted silhouette, not standing on bare grass beside it.
- [ ] Farmer box is `36%×32%` of the boat box, centered at `(50%, 54%)` of that box (verifiable via computed style / DOM inspection in the testbed).
- [ ] Mobile screenshot of the same states: knight still visible and positioned per the table, scaled down with the tile; farmer still hidden (unchanged existing behavior).
- [ ] No regression to fog-of-war suppression, death-animation suppression, or `hasActed` fade on the knight (all pre-existing, unrelated to this change).

## Review (ui-designer-b)
VERDICT: APPROVED

Verified independently this session, all checked out:
- Re-read `island-tile-slots.types.ts:1-30`, `TileOccupants.hook.ts:55-72`, `TileOccupants.styles.ts:1-28`, `TileBoats.styles.ts:1-14`, `TileBoats.tsx:1-55`, `TileBoats.map.ts:1-100`, `TileBoats.types.ts:1-18` — every citation and current-geometry claim in the spec matches the code exactly, including the `BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS` re-export chain (`TileBoats.types.ts:3-4` re-exports from `island-tile-slots.types.ts`, so "single source of truth" is accurate) and the inline-transform-vs-Tailwind-scale lesson (`docs/ai/lessons-learned.md:82`) correctly applied by keeping the knight's new slot transform-free.
- Pixel-sampled `public/sprites/boat.gif` myself (Python/Pillow, alpha>10 threshold): opaque silhouette spans x 21.09%–78.13%, y 28.91%–71.48% of the 256×256 frame — matches the spec's "21%–78% x / 29%–71% y" to the percent. The farmer's new box (centered 50%/54%, 36%×32%) computes to x 32–68%, y 38–70%, inside that silhouette on every edge. The math is correct, not just asserted.
- Knight geometry checks out arithmetically: `bottom:24%; right:24%; size 27%` → x/y span 49%–76%; boat box (`bottom:0;right:0` flush, then `translate(50%,50%)` = +21% of its own 42%-of-T width) → span 79%–121%. 3-point clear gap as claimed, and by symmetry for the other three corners.
- No contrast/color-only issues (decorative sprites, no text), no interactive element added so no new focus/keyboard path needed, motion unaffected, mobile unaffected (farmer stays hidden per existing `!isMobile` gate, knight scales with the tile's existing `clamp()`).
- Feasible with existing primitives: pure percent/style changes to two existing `.styles.ts` files plus one new `SlotDef`-shaped export; no new component, no shadcn primitive, no new token.
- Acceptance criteria are all independently checkable (computed style, screenshot, or DOM inspection) against named testbed states already in the codebase.

One finding, non-blocking, folded into the Final spec below:
- The in-spec note flagging that only 1 of 3 `cornerOccupants` rendered in the "occupants on all corners" fixture states is worth escalating explicitly rather than leaving as an aside, because two of this task's six acceptance criteria (the multi-corner knight-placement checks) depend on that fixture rendering all three occupants. I did not reproduce the fixture bug myself in this session (browser check wasn't run as part of this design review), but the visibility logic in `TileOccupants.hook.ts:40-53` and `TileBoats.map.ts:15-25` both gate on `localPlayer.revealedTiles.includes(island.id)`, and `IslandTile.fixtures.ts`'s `localPlayerFixture.revealedTiles` does include `'resource-two-three-occ'`, `'resource-three-three-occ'`, `'empty-three-occ'`, `'empty-two-occ'` — so on inspection the fixture's data looks like it *should* satisfy visibility for all three occupants on each of those islands, not just one. That makes the "only 1 of 3 rendered" symptom look less like a fixture-data mismatch and more like a render/layout bug (e.g. two occupants landing on the same visual spot, or a z-order/overflow issue), which is directly relevant to this task's own front-end territory. Fix: before the implementer relies on any "…occupants on all corners" screenshot for sign-off, re-run that testbed state and determine whether it's genuinely 1-of-3 visible or 3-of-3 rendered-but-overlapping; route to the architect either way since it's outside this review's scope to fix.

## Final spec
Everything in "Spec (ui-designer-a)" above stands as written, with this addition:

- **Acceptance-criteria risk, add to the implementer's checklist**: before marking the first two acceptance criteria done (the multi-corner knight-placement checks against `/testbed/island-tile?state=Resource island, 2 nodes + occupants on all corners`), confirm in the browser whether all three `cornerOccupants` fixture entries actually render distinct knights. If fewer than three appear, this is likely a pre-existing render bug (fixture visibility data checks out on inspection, per the Review finding above), not a fixture-data problem — report it to the architect rather than silently testing against only the occupant(s) that happen to show up, since that would under-verify the per-corner placement table.
