# Plan: Boat, knight and farmer visual placement

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec)

## Goal and acceptance criteria
- [ ] Knight (occupant) sprite renders offset onto land at its boat's corner (24%/27% per the table below), never centered on the same point as its boat.
- [ ] No knight sprite overlaps its boat's hull box (verified non-overlap from ui-design.md holds for all four corners).
- [ ] Farmer (idle collector) sprite renders inside the boat hull's painted silhouette (36%×32% of the boat box, centered at 50%/54%), not beside it on bare grass.
- [ ] No regression to fog-of-war suppression, death-animation suppression, or `hasActed` fade on the knight.
- [ ] Mobile: knight still visible and positioned per the table, scaled with the tile; farmer stays hidden (existing `!isMobile` gate, unchanged).
- [ ] Before closing out, the `/testbed/island-tile?state=Resource island, 2 nodes + occupants on all corners` state is checked in the browser: confirm whether all 3 `cornerOccupants` render as distinct knights. If fewer than 3 appear, this is a pre-existing render bug unrelated to this plan's edits (data looks correct on inspection, see Risks) — report it to the architect rather than silently under-testing.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `BOAT_CORNER_POSITIONS`, `CORNER_TRANSFORMS`, `CornerId`, `CornerPosition`, `SlotDef` | `src/modules/map/island-tile-slots.types.ts:6-30` | Existing corner data shapes; `OCCUPANT_CORNER_SLOTS` (new) reuses `CornerPosition`'s shape. Order (`br, tr, tl, bl`) is load-bearing — occupant index N must read the same corner id as boat entry N. |
| `useTileOccupants` | `src/modules/map/components/TileOccupants/TileOccupants.hook.ts:8-75` | Currently builds `slotStyle` from `BOAT_CORNER_POSITIONS[index % 4]` + `CORNER_TRANSFORMS[corner.id]` (lines 58-62) — the exact bug: occupant centers on the boat's point. |
| `OccupantSpriteViewModel` | `src/modules/map/components/TileOccupants/TileOccupants.types.ts:7-18` | `slotStyle` field and its stale doc comment (lines 11-12) claiming it matches the boat's corner/transform. |
| `styles.slot` | `src/modules/map/components/TileOccupants/TileOccupants.styles.ts:8-15` | `w-[29%] h-[29%]`, must become `27%`; stale comment claims centering on the boat corner. |
| `styles.collectorOverlay` | `src/modules/map/components/TileBoats/TileBoats.styles.ts:11-12` | `w-[40%] h-[40%] bottom-0 right-0`, must become `w-[36%] h-[32%]` centered at `left:50%;top:54%` with `-translate-x-1/2 -translate-y-1/2`. |
| `TileBoatsView` | `src/modules/map/components/TileBoats/TileBoats.tsx:16-48` | Renders `collectorOverlay` as a child of `.boat`; no structural change needed, only the styles object changes. |
| `occupantSpriteFixture`, `fadedOccupantFixture` | `src/modules/map/components/TileOccupants/TileOccupants.fixtures.ts:58-74` | Currently build `slotStyle` with `CORNER_TRANSFORMS`; must switch to the new offset-only values. |
| `cornerOf`, "corner alignment with TileBoats" describe block, "slotStyle and isOverflow per occupant index" describe block, "corner wrap beyond the fifth occupant" describe block | `src/modules/map/components/TileOccupants/TileOccupants.hook.test.ts:9-15, 513-631` | All assert the occupant's `slotStyle` equals (or is derived from) `BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS`; every literal expectation in these three blocks must change to the new table. |
| `anchorOf`, "rider and boat composition" describe block | `src/modules/map/components/TileOccupants/TileOccupants.test.tsx:174-245` | Three tests assert the rider's inline style equals the boat's inline style exactly ("both centered on it", "same corner... four distinct corners" meaning same anchor as its own boat). Must be rewritten to assert the rider is offset from, and does not share, its boat's anchor. |
| `BOAT_CORNER_POSITIONS` / `CORNER_TRANSFORMS` describe blocks | `src/modules/map/island-tile-slots.test.ts:16-41` | Pins today's two tables; unaffected by this plan (boat anchors unchanged) but the new `OCCUPANT_CORNER_SLOTS` table needs its own pinned-literal block here, same pattern. |
| `threeOccupantsFixture`, `allFadedFixture`, `ViewportBoatAndRider` comment | `src/modules/map/components/TileOccupants/TileOccupants.preview.tsx:8, 27-57, 59-69, 118-120` | Three inline `slotStyle` literals use `CORNER_TRANSFORMS` directly; the "Boat + rider, same corner" state name/comment (lines 59-60, 118-120) asserts the now-false premise that rider and boat share one point. |
| `TileBoats.map.test.ts:436-447`, `TileBoats.preview.tsx`, `TileBoats.test.tsx:209-271` | boat-only corner/collector-containment tests and the boat preview | Verified: none assert the collector's exact position/size (only containment or the boat's own corner), and none touch occupants. No change needed in these three files. |
| `TileResources.styles.ts:6`, `TileResources.tsx:58` | separate `collectorOverlay` (resource-node collector badge, just shipped) | Different component, different class, out of scope per triage.md:24. Do not touch. |
| `docs/architecture/systems-and-visuals.md:95, 126` | architecture doc | Line 95 lists `BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS` as "the boat/occupant corner anchors" (now inaccurate — occupant has its own table). Line 126 doesn't describe the collector's placement precisely, but is the natural place to note it now sits inside the hull. |

## Decisions
- New per-corner data lives in `island-tile-slots.types.ts` as `OCCUPANT_CORNER_SLOTS: CornerPosition[]`, reusing the existing `CornerPosition` type (`{ id, style }`) rather than inventing a new type, because it is structurally identical to `BOAT_CORNER_POSITIONS` (ui-design.md's suggested `SlotDef`-shaped export is not used: `SlotDef.size` is a number used as a formula input elsewhere in this file, but here size is a fixed `27%` that belongs in the Tailwind class, not in the data — adding an unused `size` field to satisfy a type that doesn't fit would be speculative).
- `TileOccupants.hook.ts` drops its `BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS` imports entirely and indexes `OCCUPANT_CORNER_SLOTS` directly by `index % OCCUPANT_CORNER_SLOTS.length`, because the two tables share the same order/length by construction (both `br, tr, tl, bl`) — no need to look up the boat table just to read its `.id`. Rejected: keep reading `BOAT_CORNER_POSITIONS[index].id` then look up `OCCUPANT_CORNER_SLOTS[id]` (an extra indirection that adds no behavior).
- No `transform` on the occupant slot (per ui-design.md): the box is flush-anchored by its two offset-% edges. Rejected: keep a transform for fine-tuning — ui-design.md's math already verifies non-overlap without one, and it would repeat the inline-transform-vs-Tailwind-scale conflict in `docs/ai/lessons-learned.md:82`.
- Farmer recomposition is a pure `.styles.ts` edit (size/position of `collectorOverlay`); no `.tsx` or `.map.ts` change, because `TileBoatsView` already renders `collectorOverlay` as a styled child `div` — only the class string's box geometry changes.
- Overflow nudge (5th+ occupant sharing a corner, moving 8% further per extra index) is left out: ui-design.md marks it "nice-to-have, not required for acceptance," and KISS says skip it since nothing in the acceptance criteria needs it.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/map/island-tile-slots.types.ts` | edit | Add `OCCUPANT_CORNER_SLOTS: CornerPosition[]` (the four knight offsets); fix two stale comments this addition breaks: `CornerPosition.style`'s doc ("Always exactly two of these four keys, each '0'") only describes `BOAT_CORNER_POSITIONS`'s values, not the new `'24%'` values — generalize it to "exactly two of these four keys set" (drop "each '0'"); and `BOAT_CORNER_POSITIONS`'s own doc ("TileOccupants.hook.ts reads this directly") becomes false once that hook switches to `OCCUPANT_CORNER_SLOTS` — reword to note `OCCUPANT_CORNER_SLOTS` must keep the same order by construction instead | implementer-a |
| `src/modules/map/components/TileOccupants/TileOccupants.hook.ts` | edit | Build `slotStyle` from `OCCUPANT_CORNER_SLOTS` instead of `BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS`; update `isOverflow` to compare against `OCCUPANT_CORNER_SLOTS.length` | implementer-a |
| `src/modules/map/components/TileOccupants/TileOccupants.types.ts` | edit | Fix the stale `slotStyle` doc comment (no longer matches the boat's anchor) | implementer-a |
| `src/modules/map/components/TileOccupants/TileOccupants.fixtures.ts` | edit | `occupantSpriteFixture`/`fadedOccupantFixture` use the new offset `slotStyle` values; drop the now-unused `CORNER_TRANSFORMS` import | implementer-a |
| `src/modules/map/components/TileOccupants/TileOccupants.styles.ts` | edit | `slot` box `29%` → `27%`; fix stale comment | implementer-b |
| `src/modules/map/components/TileBoats/TileBoats.styles.ts` | edit | `collectorOverlay` → `w-[36%] h-[32%] left-1/2 top-[54%] -translate-x-1/2 -translate-y-1/2` (drop `bottom-0 right-0`); fix stale comment | implementer-b |
| `src/modules/map/island-tile-slots.test.ts` | edit | Add a pinned-literal describe block for `OCCUPANT_CORNER_SLOTS`, same pattern as the existing `BOAT_CORNER_POSITIONS` block | tester-a |
| `src/modules/map/components/TileOccupants/TileOccupants.hook.test.ts` | edit | Rewrite the three describe blocks listed in Verified context (corner alignment, slotStyle/isOverflow per index, corner wrap) to the new literal table; `cornerOf` helper and death/visibility tests above line 513 are unaffected | tester-a |
| `src/modules/map/components/TileOccupants/TileOccupants.test.tsx` | edit | Rewrite "rider and boat composition" (lines 174-245): assert the rider's anchor is offset from, and distinct from, its boat's anchor per corner, instead of equal to it | tester-b |
| `src/modules/map/components/TileOccupants/TileOccupants.preview.tsx` | edit | Update the three inline `slotStyle` literals (`threeOccupantsFixture`, `allFadedFixture`) to the new offset values; drop the `CORNER_TRANSFORMS` import; rename/reword the "Boat + rider, same corner" state and its comment to describe the new (offset, non-overlapping) composition | preview-a |
| `docs/architecture/systems-and-visuals.md` | edit | §6.13 line 95: add `OCCUPANT_CORNER_SLOTS` and note the knight no longer shares the boat's anchor; §6.13 line 126 area: note the idle collector now renders inside the hull's silhouette | docs-sync |

No changes to: `TileBoats.tsx`, `TileBoats.map.ts`, `TileBoats.types.ts`, `TileBoats.fixtures.ts`, `TileBoats.map.test.ts`, `TileBoats.test.tsx`, `TileBoats.preview.tsx`, `TileOccupants.tsx`, `IslandTile.tsx`, `TileResources.*` (verified above — none assert or depend on the geometry this plan changes).

## Contracts
```ts
// src/modules/map/island-tile-slots.types.ts — new export, same file as BOAT_CORNER_POSITIONS.
// Order matches BOAT_CORNER_POSITIONS (br, tr, tl, bl): occupant index N must read
// OCCUPANT_CORNER_SLOTS[N % OCCUPANT_CORNER_SLOTS.length] to land on the corner its boat
// (index N of BOAT_CORNER_POSITIONS) is at. No `transform`: each box is flush-anchored by
// its own two offset edges, so it never needs centering on a point (unlike CORNER_TRANSFORMS).
export const OCCUPANT_CORNER_SLOTS: CornerPosition[] = [
  { id: 'br', style: { bottom: '24%', right: '24%' } },
  { id: 'tr', style: { top: '24%', right: '24%' } },
  { id: 'tl', style: { top: '24%', left: '24%' } },
  { id: 'bl', style: { bottom: '24%', left: '24%' } },
];

// src/modules/map/components/TileOccupants/TileOccupants.hook.ts — replaces lines 56-62.
// OccupantSpriteViewModel itself is UNCHANGED (slotStyle stays Record<string, string>;
// only what TileOccupants.types.ts's doc comment says about it changes).
const slot = OCCUPANT_CORNER_SLOTS[index % OCCUPANT_CORNER_SLOTS.length];
const slotStyle: Record<string, string> = { ...(slot.style as Record<string, string>) };
// isOverflow: index >= OCCUPANT_CORNER_SLOTS.length   (was BOAT_CORNER_POSITIONS.length; same
// numeric value, 4, but reads the table this hook now actually uses)

// src/modules/map/components/TileOccupants/TileOccupants.styles.ts — slot box only, cva unchanged otherwise.
slot: cva('absolute w-[27%] h-[27%]', { variants: { isOverflow: { true: 'opacity-90', false: '' } } }),

// src/modules/map/components/TileBoats/TileBoats.styles.ts — collectorOverlay only.
collectorOverlay:
  'absolute z-[26] w-[36%] h-[32%] left-1/2 top-[54%] -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]',
```

## Phases
### Phase 1: Knight offset + farmer-in-hull recomposition
1. implementer-a: add `OCCUPANT_CORNER_SLOTS` to `island-tile-slots.types.ts` per the Contracts block.
2. implementer-a: edit `TileOccupants.hook.ts` to build `slotStyle`/`isOverflow` from `OCCUPANT_CORNER_SLOTS` (Contracts block); drop the now-unused `BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS` import.
3. implementer-a: fix the `slotStyle` doc comment in `TileOccupants.types.ts`.
4. implementer-a: update `occupantSpriteFixture`/`fadedOccupantFixture` in `TileOccupants.fixtures.ts` to `{ bottom: '24%', right: '24%' }` / `{ top: '24%', right: '24%' }`; drop the `CORNER_TRANSFORMS` import.
5. implementer-b: edit `TileOccupants.styles.ts` — `slot` box to `w-[27%] h-[27%]`; fix the stale comment.
6. implementer-b: edit `TileBoats.styles.ts` — `collectorOverlay` per the Contracts block; fix the stale comment.
7. tester-a: add the `OCCUPANT_CORNER_SLOTS` pinned-literal block to `island-tile-slots.test.ts`.
8. tester-a: rewrite the three affected describe blocks in `TileOccupants.hook.test.ts` (corner alignment with TileBoats, slotStyle/isOverflow per occupant index, corner wrap beyond the fifth occupant) against the new table: occupant and boat no longer share a corner value, so "corner alignment with TileBoats" must assert the occupant's corner *id* (top/bottom + left/right side) matches its boat's corner id, while the exact style values differ. (sonnet: this block requires re-deriving the intended semantics, not a mechanical find-replace.)
9. tester-b: rewrite "rider and boat composition" in `TileOccupants.test.tsx` (lines 174-245) to assert the rider's inline style differs from its boat's (no longer `toEqual`), while still on the matching corner id, for 1, 4 and 5 (wrap) riders. (sonnet: same reasoning as step 8.)
10. preview-a: update `TileOccupants.preview.tsx` — the three `CORNER_TRANSFORMS`-based `slotStyle` literals (new offset values, drop the import) and the "Boat + rider, same corner" state's name/comment (now describes an offset, non-overlapping composition, not a shared point).
11. docs-sync: update `docs/architecture/systems-and-visuals.md` §6.13 (lines 95 and the collector description near line 126) per the File plan.
12. Before marking acceptance criteria done: ui-verify the `/testbed/island-tile` states named in ui-design.md's Acceptance criteria (desktop and mobile), including the "occupants on all corners" risk check in this plan's Goal section.

Model escalation: steps 8 and 9 (test semantics change, not mechanical).

## Test plan
- tester-a (logic, first):
  - `island-tile-slots.test.ts`: `OCCUPANT_CORNER_SLOTS` has the 4 corners in `br, tr, tl, bl` order with the exact `{top/bottom, left/right}: '24%'` pairs from the Contracts block, and no `transform`/`size` key.
  - `TileOccupants.hook.test.ts`: for 1, 4, 5 (wrap), and 8 (wrap) occupants, each occupant's `slotStyle` equals the `OCCUPANT_CORNER_SLOTS` entry for its index (literal values, not derived), has no `transform` key, and `isOverflow` is unchanged (false for indices 0-3, true for 4+). Keep the existing death-animation/fog-of-war/debug-mode/`hasActed` tests (lines 1-511) unchanged — they don't touch `slotStyle`.
- tester-b (view and e2e):
  - `TileOccupants.test.tsx`: for 1 and 4 riders, each rider's inline style matches its own `OCCUPANT_CORNER_SLOTS` entry and is NOT equal to its boat's inline style (the regression this task fixes); for 5 riders, the wrapped 5th rider matches the 1st rider's slot (both corner `br`), same as before.
  - No e2e spec needed: this is pure sprite placement/art, not a new interaction (confirmed in triage.md:19, ui-design.md Interactions section).

## Preview states
- `TileOccupants`: existing "Single occupant", "Two occupants", "Three occupants mixed", "All faded" states keep their names; their fixtures move to the new offset values. "Boat + rider, same corner" is renamed to describe the knight standing beside (not on) its boat, at both tile sizes.
- `TileBoats`: no preview changes (collector geometry is a pure style change, already exercised by "Single boat", "Two boats", "All four corners", "Contested base" states).
- ui-verify (browser): `/testbed/island-tile?state=Resource island, 2 nodes + occupants on all corners` and `...+occupants on all corners` (3-node variant), `/testbed/island-tile?state=Occupied resource island (collector overlay test)` or equivalent `showIdleCollector: true` state — desktop and mobile, per ui-design.md's Acceptance criteria.

## Risks
- ui-designer-b's review (ui-design.md:94-95) flagged that the "occupants on all corners" testbed fixture may render fewer than 3 distinct knights, but the visibility data (`localPlayerFixture.revealedTiles` in `IslandTile.fixtures.ts:24-27`, confirmed includes `'resource-two-three-occ'` etc.) and the occupant-resolution logic (`TileOccupants.hook.ts:15-27`, confirmed all 3 `cornerOccupants` entries in `IslandTile.fixtures.ts:99-103` resolve to a real player+army) both check out on inspection — I did not reproduce the symptom in a browser this session. If fewer than 3 knights render after this phase's changes, it is a separate pre-existing bug, not something this plan's edits should be expected to fix; per the Goal section, report it rather than silently testing against fewer occupants.
- The farmer's new position (centered 50%/54%, 36%×32% of the boat box) is a CSS-only change verified by ui-designer-b's own pixel sampling of `boat.gif` (ui-design.md:88); no new pixel sampling is needed by implementer-b, but ui-verify must still confirm it visually, since Tailwind arbitrary values (`left-1/2`, `top-[54%]`) can be mistyped without a type error.

## Review (architect-b)
VERDICT: APPROVED

Verified independently this session:
- Every path and symbol in Verified context checked against the real files: `island-tile-slots.types.ts:1-98`, `TileOccupants.hook.ts:1-75` (bug confirmed at lines 58-62), `TileOccupants.types.ts:1-18`, `TileOccupants.styles.ts:1-28`, `TileBoats.styles.ts:1-14`, `TileBoats.tsx:1-55`, `TileOccupants.fixtures.ts:1-74`, `TileOccupants.hook.test.ts` (describe blocks at 513, 547, 597-631 match), `TileOccupants.test.tsx:174-245`, `island-tile-slots.test.ts:1-96`, `TileOccupants.preview.tsx:1-128`, `TileBoats.map.test.ts` (corner-placement block), `TileBoats.preview.tsx`, `TileBoats.test.tsx:195-271`, `TileResources.styles.ts:1-8`, `TileResources.tsx:50-65`, `docs/architecture/systems-and-visuals.md:93-131`. All citations and line ranges are accurate; no invented path.
- Repo-wide grep for `BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS` (excluding `node_modules` and the stale `.claude/worktrees/` copy) turns up only files already in the File plan as fix-or-leave: `TileBoats.types.ts`, `TileBoats.map.ts`, `TileBoats.fixtures.ts`, `TileBoats/index.ts` re-export/consume the boat's own anchor only (verified at `TileBoats.map.ts:92-102`, unaffected by this plan, correctly left out) — nothing missed.
- Math verified independently: knight box at `br` (`bottom:24%;right:24%`, 27% size) spans tile x/y 49%-76%; boat box spans 79%-121% (flush 42% box + 50%/50% self-translate = +21%). 3-point gap, no overlap, holds by symmetry for the other three corners. Farmer box (36%×32%, centered 50%/54% of the boat's local box) spans boat-local x 32-68%, y 38-70% — inside the boat-art silhouette ui-designer-b pixel-sampled (21-78% x, 29-71% y). Arithmetic in the plan and ui-design.md is correct, not just asserted.
- Design is KISS/DRY: `OCCUPANT_CORNER_SLOTS` reuses the existing `CornerPosition` shape rather than inventing a new type or duplicating `BOAT_CORNER_POSITIONS`'s values (the four corners have genuinely different offset numbers, so this isn't duplication); dropping the `BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS` lookup from the hook removes an indirection instead of adding one; the farmer recomposition is a pure style-constant change with no `.tsx`/`.map.ts` touch, matching the existing split. No speculative options (overflow-nudge correctly deferred per its own "nice-to-have" label).
- File plan splits implementer-a/b, tester-a/b and preview-a onto disjoint files with no overlapping ownership; the two test-semantics rewrites (steps 8-9) are correctly flagged for sonnet escalation since they require re-deriving intent, not mechanical find-replace. Contracts block is literal and sufficient for both implementers to work in parallel without touching each other's files.
- Confirmed no other consumer of `OccupantSpriteViewModel.slotStyle` reads `.transform` (grep across `src/modules/map`), so dropping the transform key is safe; `TileOccupants.tsx:15` spreads `slotStyle` as an inline `style` prop regardless of which keys it contains.

Two trivial stale-comment gaps found and folded into the plan directly (File plan row for `island-tile-slots.types.ts`), not blocking:
- `CornerPosition.style`'s doc comment ("Always exactly two of these four keys, each '0'") is only true for `BOAT_CORNER_POSITIONS`'s values; `OCCUPANT_CORNER_SLOTS` will use `'24%'`. Generalized to drop "each '0'".
- `BOAT_CORNER_POSITIONS`'s own doc comment claims "`TileOccupants.hook.ts` reads this directly," which stops being true once the hook switches to `OCCUPANT_CORNER_SLOTS` per this plan's own Decisions section. Reworded to describe the new order-preservation requirement instead.
