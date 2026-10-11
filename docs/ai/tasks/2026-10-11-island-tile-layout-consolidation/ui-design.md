# UI design: Island tile layout consolidation

## Spec (ui-designer-a)

### Purpose and user story
As a commander, I want every sprite on an island tile — resource nodes, docked boats, tree groves, and garrisoned soldiers/knights — to render in its own clear spot, so a fully-loaded tile (resources + boat + multiple occupants + forest) never shows two sprites stacked on top of each other and hiding game state.

This is a presentation-only refactor: no sprite, island type, or gameplay rule changes. The four independently-computed coordinate systems listed below collapse into one shared slot table that all four components read from, so a slot is defined exactly once and two roles can't be assigned the same spot by accident.

### Existing systems being consolidated (verified in code)
| System | File | Unit | Anchor style |
|---|---|---|---|
| Resource nodes | `TileResources.map.ts:27-80` (`SlotDef`, `getSlot`) | top/bottom/left/right as **% of tile side T**; node box size in **px** (`slot.size`, badge math reused as-is) | one of `SINGLE_RESOURCE_SLOT`, `DUAL_RESOURCE_SLOTS`, `TRIPLE_RESOURCE_SLOTS`, `BASE_RESOURCE_SLOTS` |
| Boat docking | `TileBoats.map.ts:90-92`, `TileBoats.types.ts:14-19` (`BOAT_CORNER_POSITIONS`, `CORNER_TRANSFORMS`) | one of 4 tile corners, box 42% of T, centered on the corner point (half overhangs the tile edge) | `br, tr, tl, bl`, cycled by occupant index |
| Tree groves | `TileForest.map.ts:19-46` | top/bottom/left/right as **% of T**; tree box size as **% of T** | isBase: 2 slots near top-left; Special: 1 slot; Empty/Cleared: up to 3 slots |
| Soldier/knight sprites | `TileOccupants.hook.ts:56-62` | same corner table as boats (imported from `TileBoats.types`), box 29% of T, centered on the same corner point | shares index with the boat entry so the rider always sits inside its boat |

Today only the boat/occupant pair is coordinated (by one component importing the other's constants). Resource nodes and tree groves were tuned by hand, each against the boat corners alone, never against each other or against a common rule. The result: Base tiles are safe (hand-tuned, see below), but **Resource/Empty island resource-node slots were never checked against the boat corners that can also appear on those islands**, and two of the forest "empty grove" slots sit exactly on the corner-clearance boundary with zero margin.

### The shared rule: corner clearance
A docked boat occupies a 42%-of-T box centered on its corner; on-tile it covers the **0%–21% band from both edges meeting at that corner**. Any slot that is not itself a corner slot (resource node, tree) must clear that band on **at least one axis** (top/bottom distance ≥ 22% of T, or left/right distance ≥ 22% of T) for every corner it is near. 22% is the 21% boat half-box plus a 1-point visible gap — the same margin Base's hand-tuned slots already use (see `BASE_RESOURCE_SLOTS` bottom-left/right at left 35%/65%, box half-width 11%, clearing the 78% br-corner line by exactly 2%, and the Base forest slots clearing the top-left corner's 21% left line by 1-2%).

This single rule is what the shared table encodes per slot, so a future slot addition is checked against it instead of eyeballed against whichever corner the author remembered.

### Shared slot table (by island type / role)
All values are % of tile side T, same units as the already-correct boat/occupant/forest systems. Unlisted axis values are unchanged from current code (verified above); only the four flagged values move.

**Base tile** (unchanged — already clears every corner by 1-2%):
- Forest: `{top:2%, left:23%, size:15%}`, `{top:11%, left:23%, size:15%}`
- Base resource slots (center, bottom-left, bottom-right): `{top:4%, left:50%(center), 22%x22%}`, `{bottom:4%, left:35%(center), 22%x22%}`, `{bottom:4%, left:65%(center), 22%x22%}`
- Corners (boat + occupant, shared): `br, tr, tl, bl`, in that cycle order

**Resource island, 1 node** (unchanged — already centered, clears all corners):
- `{top:46%, left:50%(center)}`

**Resource island, 2 nodes** (`left`/`right` move 14% → 24%, closing the Resource-island gap: the only system that currently puts a non-base resource node inside a corner's clearance band):
- `{top:20%, left:24%}`, `{top:70%, right:24%}`

**Resource island, 3 nodes** (slot 1's `left` moves 12% → 24%; slots 2–3 already clear by their vertical offset, 46%/70% are both outside the 0-22/78-100 bands):
- `{top:20%, left:24%}`, `{top:46%, right:12%}`, `{top:70%, left:12%}`

**Empty/Cleared island forest** (`left`/`right` move 22% → 24% on the two corner-adjacent trees; the third tree is already clear):
- `{top:18%, left:24%, size:28%}`, `{top:24%, right:24%, size:28%}`, `{bottom:26%, left:44%, size:28%}`

**Special island forest** (unchanged — single decorative slot, not corner-adjacent):
- `{top:4px, left:4px, size:16%}`

**Monster island**: no forest and no resource slots render while a monster is alive (suppressed today, keep suppressed); corners still available for boats if a non-fighting army is present.

**Resource island / Empty island corners**: same `br, tr, tl, bl` 4-corner table as Base, shared unchanged, still shared between `TileBoats` and `TileOccupants`.

### Placement and layout
- Desktop (1280×720) and mobile (390×844): no placement change at the page level. This is an internal-to-tile coordinate fix; tile size itself stays `clamp(94px, 12.5vh, 136px)` desktop / `clamp(46px, 13.5vw, 68px)` mobile (`MapGrid.tsx:49-52`), and the full `MAP_COLS`×`MAP_ROWS` grid stays visible exactly as today — this task touches no grid or HUD layout.
- All four systems keep their current z-order, unchanged: forest `z-[12]` → boats `z-[25]`/collector `z-[26]` → center content `z-20` (resource container `z-[28]`, collector badge `z-[35]`) → occupants `z-30` (`TileForest.styles.ts`, `TileBoats.styles.ts`, `IslandTile.styles.ts:46`, `TileResources.styles.ts`, `TileOccupants.styles.ts`).

### States
| State | What the player sees | Trigger |
|---|---|---|
| Base tile, 3 resources + 2 occupants (repro case) | Castle, 2 forest trees top-left, 3 base resource badges, boats at `br`/`tr` with idle or farming collectors, 2 soldier sprites riding those boats — nothing overlaps | `baseIslandWithResourcesAndOccupants` fixture already in `IslandTile.fixtures.ts:55-67` |
| Resource island, 2 nodes + 1 occupant | 2 resource nodes at the corrected 24% left/right, boat+rider sharing the occupant's corner, no node sprite touching the boat box | add a fixture: Resource island, 2 resources, 1 occupant in corner `tl` (the tightest corner against the dual-slot's top node) |
| Resource island, 3 nodes + 1 occupant | 3 resource nodes at the corrected positions, boat+rider in `tl`, slot 1's node fully clear of the boat box | add a fixture: Resource island, 3 resources, 1 occupant in corner `tl` |
| Empty island, 3-tree grove + 1 occupant | Grove trees at the corrected 24% left/right, boat+rider in `tl` or `tr`, no tree sprite touching the boat box | add a fixture: Empty island, 1 occupant in corner `tl` (forces the grove's tree-1 next to the boat) |
| Fogged / not visible | No forest, no boats, no occupants, no resources render (all four systems already gate on tile visibility) | unchanged, existing `hiddenFogIsland` / `Scout target (fogged)` preview state |
| Monster island, living monster | No forest, no resources; corners still open for a non-fighting boat | unchanged, existing `monsterIslandWithLivingMonster` fixture |

### Components and tokens
- Reuse only: `TileResources`, `TileBoats`, `TileForest`, `TileOccupants` (all verified above) read from one new shared constants module instead of their own private slot arrays. No new component, no new visual pattern — this is a data consolidation, not a new UI element.
- No Tailwind/theme tokens change: sprites keep their existing `drop-shadow-*`, `hover:scale-110`, `transition-transform` classes verified in each `.styles.ts` file listed above.
- Percent values are the only "token" this spec introduces, and they are positions, not colors or type — no `bg-*`/`text-*`/`border-*` tokens are touched.

### Copy
None. No player-facing text changes.

### Interactions and motion
Unchanged: resource sprites scale 1.1x on hover (`TileResources.styles.ts: resourceSprite`), boats scale 1.1x on hover (`TileBoats.styles.ts: boat`), both via `transition-transform`, both already respect `prefers-reduced-motion` the same way they do today (no new motion added, so no new reduced-motion variant is needed).

### Accessibility
No change: tile `button` keeps its `aria-label="Island at {x}, {y}"` (`IslandTile.tsx:90`); resource/collector `Image` elements keep their existing descriptive `alt` text (`"{type} resource"`, `"{color} collector farming"`, `TileResources.tsx:27,42`). This refactor moves numbers, not markup, so no new accessibility surface is created.

### Acceptance criteria
- [ ] `Base island with resources and occupants` preview state (`/testbed/island-tile?state=Base%20island%20with%20resources%20and%20occupants`) renders identically to today: 2 forest trees top-left, 3 resource badges, 2 boats at `br`/`tr` with riders — pixel positions unchanged (regression, not a fix).
- [ ] A new Resource-island preview state with 2 resource nodes and one occupant in corner `tl` shows the dual-slot node's bounding box (top 20%, left 24%, box width = its px `size`) not overlapping the boat's on-tile box (top 0-21%, left 0-21%).
- [ ] A new Resource-island preview state with 3 resource nodes and one occupant in corner `tl` shows slot 1's node (top 20%, left 24%) not overlapping the boat's on-tile box.
- [ ] A new Empty-island preview state with one occupant in corner `tl` shows grove tree 1 (top 18%, left 24%, size 28%) not overlapping the boat's on-tile box, and with one occupant in corner `tr` shows grove tree 2 (top 24%, right 24%, size 28%) not overlapping the boat's on-tile box.
- [ ] Every existing `IslandTile.preview.tsx` state (13 states) still renders with no console error and no visible sprite overlap, confirmed by `ui-verify` screenshots at both 1280×720 and 390×844.
- [ ] `docs/architecture/systems-and-visuals.md` §6.13 is updated to describe the one shared slot table instead of four separately-tuned coordinate sets (owned by `docs-sync`, not this stage).

## Review (ui-designer-b)
VERDICT: APPROVED (one defect found and folded into the Final spec below, no redesign needed)

Verified against code, matches spec exactly:
- `TileResources.map.ts:40-63` — `SINGLE/DUAL/TRIPLE_RESOURCE_SLOTS`, `BASE_RESOURCE_SLOTS` values match the "current" numbers the spec cites (dual `left:'14%'/right:'14%'`, triple slot1 `left:'12%'`, base bottom-left/right `left:35%/65%`, half-width from `width:'22%'`).
- `TileForest.map.ts:19-39` — Base layout `{top:2%,left:23%}/{top:11%,left:23%}`, Empty/Cleared grove `{top:18%,left:22%}/{top:24%,right:22%}/{bottom:26%,left:44%}` match.
- `TileBoats.types.ts:14-29` — `BOAT_CORNER_POSITIONS` cycle order `br,tr,tl,bl` and `CORNER_TRANSFORMS` (42%-of-T box, half overhangs) match; `TileOccupants.hook.ts:56-62` imports the same table, confirming the one already-shared system.
- z-order claims all confirmed: forest `z-[12]` (`TileForest.styles.ts:2`), boats `z-[25]`/collector `z-[26]` (`TileBoats.styles.ts:4,12`), centerContent `z-20` (`IslandTile.styles.ts:48`) with resources container `z-[28]`/badge `z-[35]` (`TileResources.styles.ts:2,6`), occupants `z-30` (`TileOccupants.styles.ts:4`); render order forest→boats→centerContent→occupants confirmed at `IslandTile.tsx:104-113`.
- Clearance math checked by hand: Base bottom-right slot (`left:65%`, half-width 11%) right edge lands at 76%, 2% inside the 78% `br`/`tr` clearance line — matches the spec's "clearing by exactly 2%" claim. Base forest tree1 left edge at 23% clears the `tl` 22%-left-distance threshold by 1% — matches.
- Testbed URL shape confirmed: `src/app/testbed/[slug]/page.tsx:8-13` reads `slug`/`state` query param exactly as the acceptance criteria's URL does; `islandTilePreview.slug` = `'island-tile'` (`IslandTile.preview.tsx:75`), registered in `src/testbed/registry.ts:8,52`. Current preview file has exactly 13 states (`grep -c "name:"` → 13), matching the "13 states" acceptance criterion before the new ones are added.
- `baseIslandWithResourcesAndOccupants` fixture exists at `IslandTile.fixtures.ts:55-67` as cited; `occupiedResourceIsland` (`IslandTile.fixtures.ts:91-93`) is 1 resource / 1 occupant, confirming the 2-node, 3-node and empty-island occupant fixtures genuinely don't exist yet and must be added, as the spec says.

**Defect found — the three "1 occupant in corner tl/tr" fixtures are not buildable as described:**
`TileOccupants.hook.ts:55-62` assigns the on-screen corner by the **post-filter array index**: `BOAT_CORNER_POSITIONS[index % 4]` where `index` comes from the final `.map` after the valid-army and visibility filters have already run. A fixture with exactly one valid occupant therefore always gets `index = 0` → corner `'br'`, never `'tl'` or `'tr'`, regardless of where that occupant sits in the source `island.occupants` array (invalid/filtered entries don't consume an index slot). `TileBoats.map.ts:90-95` uses the identical `entryIndex % 4` rule with no independent per-occupant visibility filter, so every valid occupant also produces a boat at the matching corner — meaning a fixture built with 3 valid occupants (to reach index 2 = `'tl'`) will render 3 boats/riders (`br`, `tr`, `tl`), not 1.
This means:
- "Resource island, 2 nodes + 1 occupant in corner `tl`" and "Resource island, 3 nodes + 1 occupant in corner `tl`" each need **3 valid occupants** in the fixture, not 1, to land one of them on `tl`.
- "Empty island ... one occupant in corner `tl`" needs 3 valid occupants; "... one occupant in corner `tr`" needs 2 valid occupants (index 0→`br`, index 1→`tr`).
- `src/lib/types/map.ts:32` — `occupants: { playerId: number; armyId: number }[]` has no cardinality limit and two entries may share a `playerId` with different `armyId`s, so fixtures can reuse `localPlayerFixture`/`opponentPlayerFixture` with extra armies instead of inventing a third player.
This is a fixture/wording correction, not a layout-rule or visual-pattern change — folded into the Final spec below rather than sent back.

No other findings: states cover fog/monster/base/resource/empty including the one coordination gap (dual-slot resource vs. boat corner) the triage flagged; percent-only values scale correctly from mobile `clamp(46px,13.5vw,68px)` to desktop tile sizes, no px assumptions introduced; no new interactive/focusable elements so no new keyboard/focus/reduced-motion surface is needed; no color-only signal introduced (pure sprite position); buildable with existing primitives only (no new component, shadcn untouched); every acceptance criterion is screenshot-checkable once the occupant counts below are corrected.

## Final spec
Everything in the "Spec (ui-designer-a)" section above is final **except** the three state rows and their acceptance criteria, corrected as follows (all other percentages, slot tables, z-order, copy, and accessibility notes stand unchanged):

### States (corrected)
| State | What the player sees | Trigger |
|---|---|---|
| Resource island, 2 nodes + occupants on all corners | 2 resource nodes at the corrected 24% left/right, 3 boats+riders at `br`/`tr`/`tl` (component's index-based corner cycling makes a single occupant always land on `br`; 3 valid occupants are needed to populate `tl`), no node sprite touching the `tl` boat's box — that is the only pair under test; `br`/`tr` are incidental | add a fixture: Resource island, 2 resources, 3 occupants (reuse `localPlayerFixture` + `opponentPlayerFixture`, give one of them a second army, or add a third player fixture — implementer's choice) |
| Resource island, 3 nodes + occupants on all corners | 3 resource nodes at the corrected positions, 3 boats+riders at `br`/`tr`/`tl`, slot 1's node fully clear of the `tl` boat's box | add a fixture: Resource island, 3 resources, 3 occupants (same corner-population note as above) |
| Empty island, 3-tree grove + occupants (two fixtures) | (a) 3 occupants (`br`/`tr`/`tl`): grove tree 1 at the corrected 24% left clear of the `tl` boat's box; (b) 2 occupants (`br`/`tr`): grove tree 2 at the corrected 24% right clear of the `tr` boat's box | add two fixtures as described |

### Acceptance criteria (corrected, replacing the 2nd–4th bullets of the original list; 1st, 5th and 6th bullets unchanged)
- [ ] A new Resource-island preview state with 2 resource nodes and 3 occupants (populating corners `br`, `tr`, `tl` via the component's index cycling) shows the dual-slot node at `top:20%,left:24%` not overlapping the `tl`-corner boat's on-tile box (top 0-21%, left 0-21%).
- [ ] A new Resource-island preview state with 3 resource nodes and 3 occupants (`br`,`tr`,`tl`) shows slot 1's node (`top:20%,left:24%`) not overlapping the `tl`-corner boat's on-tile box.
- [ ] A new Empty-island preview state with 3 occupants (`br`,`tr`,`tl`) shows grove tree 1 (`top:18%,left:24%,size:28%`) not overlapping the `tl`-corner boat's on-tile box; a second Empty-island preview state with 2 occupants (`br`,`tr`) shows grove tree 2 (`top:24%,right:24%,size:28%`) not overlapping the `tr`-corner boat's on-tile box.

Unchanged from the original spec: Purpose/user story, existing-systems table, shared corner-clearance rule, the full shared slot table (Base/Resource/Empty/Special/Monster), Placement/layout, z-order, Components and tokens, Copy, Interactions and motion, Accessibility, and acceptance criteria 1, 5 and 6.
