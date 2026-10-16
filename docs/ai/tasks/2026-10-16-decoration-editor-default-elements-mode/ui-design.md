# UI design: Default-elements editing mode for the tile-decoration editor

## Spec (ui-designer-a)

### Purpose and user story
As a developer tuning tile art, I want to drag/nudge/resize the knight, boat, base crest, special-island art and resource-node slots on the same live-tile canvas the forest-decoration editor already uses, so I don't have to hand-edit percent literals in `src/modules/map/island-tile-slots.types.ts` and guess at the result.

### Placement and layout
The whole editor (`TileDecorationEditorView`, `src/testbed/components/TileDecorationEditor/TileDecorationEditor.tsx:14`) keeps its current structure: rail (`TileDecorationEditorRail`) — canvas (`TileDecorationEditorCanvas`) — inspector (`TileDecorationEditorInspector`), `flex-row` on desktop / stacked on mobile (`styles.root`, `TileDecorationEditor.styles.ts:7`). Only the rail's content changes per mode; canvas and inspector are the same components with new inputs.

- **Mode switch**: a `Tabs` (`src/components/ui/tabs.tsx`, verified present) at the top of the rail, above the Scenario `Select`. Two triggers: `Decorations` (default, current behavior) and `Default elements`. Switching modes resets `selectedInstanceId`/element selection to none, same as switching scenario does today (`TileDecorationEditor.hook.ts:94-103`, `goToScenario`).
- **Desktop (1280×720)**: unchanged widths — rail `md:w-56`, canvas `md:min-w-[320px] md:flex-1`, inspector `md:w-64` (`styles.railPanel`/`canvasColumn`/`inspectorPanel`). The Tabs row adds one row's height above the existing Scenario picker; no column resizes.
- **Mobile (390×844)**: rail stacks first (unchanged order), Tabs render full-width two-up like a segmented control. This is the testbed, not the live map grid, so the "map grid stays visible" rule doesn't apply here — there is no map grid on this screen.

### Default-elements rail content (replaces Scenario+Variant+Layouts with an Element list)
When the `Default elements` tab is active, the rail shows:
1. No Scenario/Variant `Select` — the element list below fixes the reference tile per row.
2. A heading `Default elements` (same `styles.panelTitle` treatment as today's `Layouts` heading).
3. **New pattern** (the one new visual pattern this feature introduces): a grouped single-select list — four group headers, each a smaller/dimmer label than `panelTitle` (`text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70`, new token combination, no new color), with the existing `styles.layoutRow` button under each for its rows. No add/duplicate/rename/delete/Badge-unsaved-indicator-on-the-row — these aren't named layouts, there is exactly one instance of each element kind, so the per-row controls from `TileDecorationEditorLayoutActions` don't apply in this mode.
4. Groups and rows, each row's label is its exact copy and its reference island:

| Group header | Row label | Reference island | Hides on canvas |
|---|---|---|---|
| Occupants & boats | Knight (all corners) | `empty-2` (existing `emptyIsland`, already 4 occupants + boats via `cornerOccupants4`, `TileDecorationEditor.display.map.ts:33,52`) | `[data-testid=tile-occupants]` |
| Occupants & boats | Boat (all corners) | `empty-2` (same) | `[data-testid=tile-boats]` |
| Base island | Player crest | `base`, extended: reference island needs 1–3 resources to also exercise the next row; crest itself only needs the existing `baseIsland` | the base crest image inside `styles.baseContent` |
| Base island | Resource slots (base) | same extended base reference island, with resources `[Food×2, Wood×1]` (3 nodes, to show all 3 `BASE_RESOURCE_SLOTS`) | `[data-testid=tile-resources]` |
| Special island | Idle art | `special` (existing `specialIsland`) | the image inside `styles.specialContent` |
| Resource island | 1 resource node | `resource-1` (existing) | `[data-testid=tile-resources]` |
| Resource island | 2 resource nodes | `resource-2` (existing) | `[data-testid=tile-resources]` |
| Resource island | 3 resource nodes | `resource-3` (existing) | `[data-testid=tile-resources]` |
| Resource island | 4 resource nodes | `resource-4` (existing) | `[data-testid=tile-resources]` |

`[data-testid=tile-occupants]`, on the base-crest row, and on the special-content row don't exist yet — `TileOccupants.tsx:9`, `IslandTile.tsx:55`, `IslandTile.tsx:76` have no `data-testid`. Add `data-testid="tile-occupants"`, `data-testid="base-crest"`, `data-testid="special-content"` to those three wrapper elements, matching the existing `tile-boats`/`tile-resources` convention (`TileBoats.tsx:21`, `TileResources.tsx:34`), so `styles.tileFrame`'s hide-selector (today: `[&_[data-testid=tile-decorations]]:hidden`, `TileDecorationEditor.styles.ts:40`) can target each one per selected row, the same technique already used to hide the real decoration layer under the editor's own sprites. This is a view-layer addition (a test hook attribute), not a behavior change — no docs-sync needed for it alone.

The "resource slots (base)" and "player crest" rows need a reference island with resources that `TileDecorationEditor.display.map.ts` doesn't have today (its `baseIsland.resources` is `[]`, `TileDecorationEditor.display.map.ts:22-29`); add one `baseIslandWithResources` entry for these two rows only — same file, same pattern as `resourceIsland(n)`.

### Canvas per element row
Same `TileDecorationEditorCanvas` shell (`styles.tileFrame`, the realistic tile underneath, `styles.decorationOverlay` on top) and same `TileDecorationEditorSprite` drag/nudge/select interaction (pointer drag 1:1 with the tile box, arrow-key nudge 1%/5% with Shift, click-to-select, `TileDecorationEditorSprite.tsx`). What changes is only the data feeding it:

- **Knight / Boat rows**: 4 sprites, one per `CornerId` (`br`/`tr`/`tl`/`bl`), each using that corner's real army sprite (`cornerOccupants4[i].sprite`/the boat's `collector_<color>_idle.gif`, same assets `TileOccupants`/`TileBoats` already render) so the editor sprite looks identical to the hidden real one. All 4 share one size value (`OCCUPANT_SIZE` or `BOAT_SIZE` — one shared number, not per-instance, unlike decorations). Dragging moves only the selected corner's own two anchored style keys (e.g. `bottom`/`right` for `br`); the other 3 corners don't move.
- **Resource rows (1/2/3/4 nodes) and Base resource-slots row**: N sprites at the matching table's center points (`SINGLE_RESOURCE_SLOT`/`DUAL_RESOURCE_SLOTS`/`TRIPLE_RESOURCE_SLOTS`/`QUAD_RESOURCE_SLOTS`/`BASE_RESOURCE_SLOTS`), reusing each node's real sprite image (Food/Wood/Gold, per `TileResources.map.ts`). Each sprite has its own size, same as decoration instances — this is the one row-shape that already matches `DecorationInstance`'s per-instance size.
- **Special-island idle-art row**: 1 sprite at `(SPECIAL_ISLAND_TOP, SPECIAL_ISLAND_LEFT)`, using the special island's own idle-art image, with `SPECIAL_ISLAND_SIZE`.
- **Player-crest row**: no draggable sprite — the crest has no position fields in `island-tile-slots.types.ts` (it's centered by `styles.baseContent`'s `flex items-center justify-center`, `IslandTile.styles.ts:63`, not a slot). Canvas shows the real crest (not hidden) plus a small non-interactive centered dashed-circle badge (reuse `styles.emptyHint`'s dashed-border treatment, scaled down) labeled "Centered — size only" so the player isn't hunting for a drag handle that doesn't exist.

### Inspector per element row
Reuses `TileDecorationEditorInspector`'s `SelectedInstanceFields` layout (`Size` and position-readout rows, `Remove` button removed — nothing here is addable/removable):

- **Knight / Boat**: Size field is labeled `Size (applies to all 4 corners)` and edits the one shared `OCCUPANT_SIZE`/`BOAT_SIZE` value regardless of which corner sprite is selected. The position readout shows the two anchored edges and values for the *selected* corner, not always "Top/Left" — e.g. `Bottom -1%, right -5%` for `br`, `Top -20%, right -5%` for `tr` (mirrors each `CornerPosition.style`'s actual two keys, `island-tile-slots.types.ts:17-32`).
- **Special idle art**: `Size (% of tile)` edits `SPECIAL_ISLAND_SIZE`; readout `Top 40%, left 50%` from `SPECIAL_ISLAND_TOP`/`SPECIAL_ISLAND_LEFT`.
- **Resource nodes (all 5 tables)**: same per-instance `Size (% of tile)` field as today's decoration inspector, one per selected node; readout `Top N%, left N%`.
- **Player crest**: two fields, no readout, no selection needed (always shows the one crest): `Size (% of tile)` → `BASE_CREST_SIZE`, `Minimum size (px)` → `BASE_CREST_MIN_PX`.
- No `Remove` button anywhere in this mode — every row is a fixed, non-deletable element.

### Save
Same `Save` button and `Unsaved changes` indicator pattern (`TileDecorationEditorLayoutActions`, `styles.statusText`), but its target differs by mode: in `Default elements` mode, Save writes the edited numbers back into `island-tile-slots.types.ts` as TS source (regenerated from a template that preserves every existing comment verbatim — per triage's resolved Save-target answer), not into the decoration-layouts JSON config. Add one line of static copy under the rail's Save row, visible only in this mode: `Saving writes directly to island-tile-slots.types.ts.` — a plain warning, not a dialog, since these are the hand-tuned/locked values called out in the user's own memory note; no extra confirmation step blocks Save (triage didn't ask for one, and today's decoration Save has none either).

### States
| State | What the player sees | Trigger |
|---|---|---|
| Decorations mode (default) | Exactly today's editor, unchanged | App load / `Decorations` tab |
| Default elements mode, no row selected | Rail shows the 4 groups/9 rows; canvas shows the first row's (`Knight`) reference tile with its 4 sprites unselected; inspector shows `Click a decoration on the tile to edit it.` (reused `NO_SELECTION_TEXT`) | `Default elements` tab clicked |
| Row selected, corner/node selected | Canvas highlights the selected sprite (`ring-2 ring-primary`, unchanged); inspector shows that row's fields | Click a row, then click/Tab to a sprite |
| Crest row selected | Canvas shows the real (non-hidden) crest + centered dashed badge; inspector shows the two size fields, no sprite selection state | Click `Player crest` row |
| Dirty / Saving / Saved / Error | Same `Unsaved changes` badge, spinner, `Saved.`, `Could not save — see console.` as today (`STATUS_TEXT`, `TileDecorationEditorLayoutActions.tsx:11-16`) | Edit any field / click Save / request settles |
| Empty images (N/A in this mode) | Not applicable — this mode has no image picker, since every element is a fixed sprite, not a user-added one | — |

### Components and tokens
- Reuse: `Tabs`/`TabsList`/`TabsTrigger` (`src/components/ui/tabs.tsx`), `Select` (rail, unchanged for Decorations mode), `Input` (inspector numeric fields), `Button` (Save), `Tooltip`/`TooltipProvider` (unchanged), all of `TileDecorationEditorCanvas`/`TileDecorationEditorSprite`/`TileDecorationEditorInspector`'s existing structure and `styles` object (`TileDecorationEditor.styles.ts`).
- New token combination (one, within the one-new-pattern budget): the group-header label class for the grouped element list, built from existing tokens only (`text-muted-foreground`, no new color, no new size scale outside the existing `text-[10px]`/`text-xs` pair already in use for `panelTitle`/`label`).
- No raw hex values; no new color tokens.

### Copy
- Tab labels: `Decorations`, `Default elements`.
- Rail heading in the new mode: `Default elements`.
- Group headers: `Occupants & boats`, `Base island`, `Special island`, `Resource island`.
- Row labels: `Knight (all corners)`, `Boat (all corners)`, `Player crest`, `Resource slots (base)`, `Idle art`, `1 resource node`, `2 resource nodes`, `3 resource nodes`, `4 resource nodes`.
- Crest canvas badge: `Centered — size only`.
- Save-row warning (default-elements mode only): `Saving writes directly to island-tile-slots.types.ts.`
- Inspector size-field labels: `Size (applies to all 4 corners)` (knight/boat only), `Size (% of tile)` (special art, resource nodes), `Minimum size (px)` (crest only).
- Reused unchanged: `Click a decoration on the tile to edit it.`, `Saved.`, `Could not save — see console.`, `Unsaved changes`.

### Interactions and motion
- Tabs: click or arrow-key between the two triggers (native Radix Tabs keyboard model), `Enter`/`Space` activates, matches existing `focus-visible:ring-2 focus-visible:ring-ring` pattern.
- Element-list rows: click or `Enter`/`Space` selects a row (reuses `styles.layoutRow` button semantics, `aria-current` on the active row).
- Sprite drag/nudge/select: byte-for-byte the existing `TileDecorationEditorSprite` behavior — pointer drag 1:1, arrow-key nudge 1%/5% with Shift, `DRAG_THRESHOLD_PX = 4` click-vs-drag disambiguation, `aria-pressed` for selection state.
- No new motion; `styles.statusText`'s existing `motion-reduce:transition-none` opacity fade covers the Saved/Error text in this mode too.

### Accessibility
- Tabs: Radix `Tabs` ships correct `role="tablist"`/`role="tab"`/`aria-selected` and roving tabindex; no extra work needed beyond using the primitive.
- Each element-list row keeps a visible label (not icon-only) — no `aria-label` needed beyond what `styles.layoutRow` already provides.
- Each sprite's `aria-label` changes from `Decoration N of M, <file>` to a slot-appropriate label, e.g. `Knight, bottom-right corner` / `Boat, top-left corner` / `Resource node 2 of 3` / `Special island art`, so a screen-reader user knows which fixed slot they're on, not a decoration index.
- Crest-only fields keep the existing `Input` + `<label>` pairing (`SelectedInstanceFields`'s `fieldRow`/`label` pattern); no `aria-label` needed since each `Input` has a visible `<label>`.
- Contrast: group headers at `text-muted-foreground/70` on `bg-black/60` — verify ≥ 4.5:1 before shipping; if it falls short, drop the `/70` opacity and use the same `text-muted-foreground` as `panelTitle`.
- Keyboard path end-to-end: Tab to mode Tabs → Tab to element row → Enter selects → Tab into canvas → Tab/arrow-select a sprite → arrow keys nudge → Tab to inspector Size field → type a value → Tab to Save. No mouse-only step.

### Acceptance criteria
- [ ] Testbed page shows two Tabs triggers labeled `Decorations` and `Default elements`; the `Decorations` tab's content is pixel-identical to today's editor (scenario picker, variant picker, layout list, image grid).
- [ ] Clicking `Default elements` replaces the Scenario/Variant/Layouts rail content with the 4-group, 9-row element list; no `Select` for scenario/variant is visible.
- [ ] Selecting `Knight (all corners)` renders exactly 4 draggable sprites on the canvas, one per tile corner, and hides the real knight sprites underneath (`[data-testid=tile-occupants]` not visible).
- [ ] Selecting `Boat (all corners)` renders exactly 4 draggable sprites and hides `[data-testid=tile-boats]`.
- [ ] Selecting any of the 4 resource-node rows renders exactly 1/2/3/4 draggable sprites respectively, each independently resizable, and hides `[data-testid=tile-resources]`.
- [ ] Selecting `Resource slots (base)` renders exactly 3 draggable sprites on a Base-type reference tile.
- [ ] Selecting `Idle art` renders exactly 1 draggable sprite on the Special-type reference tile.
- [ ] Selecting `Player crest` renders no draggable sprite, shows the `Centered — size only` badge, and the inspector shows exactly the `Size (% of tile)` and `Minimum size (px)` fields with no position readout.
- [ ] For Knight or Boat, changing the Size field while any one of the 4 corner sprites is selected visibly resizes all 4 corner sprites at once.
- [ ] Dragging one knight/boat corner sprite does not move the other 3 corner sprites.
- [ ] The Save row in `Default elements` mode shows the line `Saving writes directly to island-tile-slots.types.ts.`; the same row in `Decorations` mode does not.
- [ ] Every interactive element (tab, row, sprite, Input, Save) reaches a visible focus ring via Tab key alone, no pointer required.

## Review (ui-designer-b)
VERDICT: APPROVED, with three small fixes folded into the Final spec below.

Independently re-checked this session (not trusting the prior self-written review) against: `TileDecorationEditor.tsx`, `.hook.ts`, `.styles.ts`, `TileDecorationEditorCanvas.tsx`, `TileDecorationEditorSprite.tsx`, `TileDecorationEditorInspector.tsx`, `TileDecorationEditorRail.tsx`, `TileDecorationEditorLayoutActions.tsx`, `TileDecorationEditor.display.map.ts`, `src/modules/map/island-tile-slots.types.ts`, `IslandTile.tsx`, `IslandTile.styles.ts`, `TileOccupants.tsx`, `TileOccupants.styles.ts`, `TileBoats.tsx`, `TileBoats.styles.ts`, `TileDecorations.styles.ts`, `TileResources.tsx`, `TileResources.styles.ts`, `TileResources.map.ts`, `IslandTile.fixtures.ts`, `IslandTile.preview.slot-lab.tsx`, `src/components/ui/tabs.tsx`, `globals.css`.

### Confirmed correct
- Z-index chain is exactly as claimed: `TileDecorations.styles.ts:2` `z-[12]` < `IslandTile.styles.ts:59` `centerContent` `z-20` < `TileBoats.styles.ts:4` `z-[25]` < `TileOccupants.styles.ts:4` `z-30`; `TileResources.styles.ts:2,9,11` is `z-[28]`/`z-[32]`/`z-[35]` but nested inside `centerContent`'s own stacking context. The regression test triage asks for is checking a real, verified invariant.
- The three missing `data-testid`s are genuinely missing: `TileOccupants.tsx`'s container div (no testid today), `IslandTile.tsx`'s base-crest wrapper div and special-content div (neither has one). `tile-boats` (`TileBoats.tsx:21`) and `tile-resources` (`TileResources.tsx:34`) already exist, confirming the convention the spec extends.
- `cornerOccupants4` is built from `(localPlayerFixture, opponentPlayerFixture, thirdPlayerFixture, fourthPlayerFixture)` in `br, tr, tl, bl` order (`IslandTile.fixtures.ts:121-123`, `IslandTile.preview.slot-lab.tsx:79`), so the spec's claim that corner-to-color mapping needs no new decision is correct.
- `OCCUPANT_CORNER_SLOTS`' two-key-per-corner shape matches the inspector's worked examples exactly: `br` is `bottom: -1%, right: -5%`, `tr` is `top: -20%, right: -5%` (`island-tile-slots.types.ts:28-29`).
- `Tabs` exists at `src/components/ui/tabs.tsx`; `TileDecorationEditor` is only consumed from `src/testbed/`, never from a live-board route, so "no map grid on this screen" is correct and the mobile rule in the skill genuinely doesn't apply here.
- `dark` `--muted-foreground` is `230 20% 70%` against `--background: 230 40% 6%` (`globals.css:47,58`) — high contrast at full opacity, so the spec's "verify ≥4.5:1, drop `/70` if it falls short" contingency is a reasonable, already-specified fallback rather than a deferred risk.

### Fix 1 (bug, folded in) — base reference island would show 2 resource sprites, not 3
`TileResources.map.ts:116-117`: `const count = isBase ? 1 : Math.max(1, r.amount || 1);` — **on a Base island, every resource array entry always expands to exactly one node; `amount` is ignored.** The spec's `baseIslandWithResources` of `[Food×2, Wood×1]` is 2 array entries, so it renders 2 nodes, not 3, and the acceptance criterion "Selecting `Resource slots (base)` renders exactly 3 draggable sprites" would fail as specified. Fix: the new fixture needs 3 distinct resource-type entries, e.g. `[{type: Food, amount: 1}, {type: Wood, amount: 1}, {type: Gold, amount: 1}]` (amount is irrelevant on a base tile; only entry count matters).

### Fix 2 (contradiction, folded in) — player-crest row's hide target contradicts its own state
The row table says Player crest's "Hides on canvas" target is "the base crest image inside `styles.baseContent`". The Canvas and States sections both say the opposite: "Canvas shows the real crest (**not hidden**) plus a small non-interactive centered dashed-circle badge." These can't both be true, and as written an implementer following the table would wire a hide selector that the States section explicitly forbids. The States/Canvas behavior is the one with a stated reason (the crest has no position field, so hiding it would leave nothing to look at) and is correct; the table cell is left over from treating this row like the others. Fix: the `base-crest` testid stays (useful for a test asserting the real crest *is* visible in this row, and for `IslandTile.tsx`'s own future use), but the table's "Hides on canvas" column for the Player crest row reads "— (stays visible; see States)", not "styles.baseContent".

### Fix 3 (clarity gap, folded in) — z-index field silently dropped, not stated
`SelectedInstanceFields` (`TileDecorationEditorInspector.tsx:83-117`) always renders both a `Size` field and a `Layer (z-index)` field plus `Remove`. The spec says Remove is dropped in Default-elements mode but never says the z-index field is also dropped (triage's resolution is "no new editable z field", and no row's inspector section in the spec lists a Layer field) — an implementer skimming the component rather than the triage doc could reasonably keep it. Fix: add one line to the inspector section: "No `Layer (z-index)` field in this mode, for any row — layering here is fixed per triage's resolved z-index answer, not per-element data."

None of these three findings change layout, copy, components, states or accessibility — they correct one data value, one contradicted table cell, and one omission. Everything else in the spec (mode switch via `Tabs`, rail content swap, per-row canvas sprite counts, shared vs. per-instance sizing, crest's no-drag-handle treatment, Save-target copy, keyboard path, `aria-label` scheme) is consistent with the current components and buildable with existing primitives.

## Final spec
Everything in "Spec (ui-designer-a)" above stands, with these three corrections:

1. **Base reference-island fixture** (new `baseIslandWithResources` in `TileDecorationEditor.display.map.ts`, used by the `Player crest` and `Resource slots (base)` rows): resources are `[{type: Food, amount: 1}, {type: Wood, amount: 1}, {type: Gold, amount: 1}]` — three distinct resource types, not `[Food×2, Wood×1]` — so `getSlot`'s base branch (`TileResources.map.ts:74-76`, one node per array entry) produces 3 nodes and exercises all 3 `BASE_RESOURCE_SLOTS`.
2. **Row table, "Hides on canvas" column, `Player crest` row**: reads "— (stays visible; see States)". The `base-crest` testid is still added to `IslandTile.tsx`'s crest wrapper, but it is not used as a hide target in this mode.
3. **Inspector section**: add "No `Layer (z-index)` field in this mode, for any row — layering is fixed per triage's resolved z-index answer, not per-element data." immediately after the bullet list of per-row field sets.

DONE
