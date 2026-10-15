# UI design: Tile decoration editor

## Spec (ui-designer-a)

### Purpose and user story
As a developer tuning island art (not a player — this tool never ships to players), I want to drag decoration sprites onto a realistic tile preview, save several named layouts per island scenario, and pick images from an auto-discovered folder, so that I can replace the hand-coded tree slot tables with visually-tuned layouts without editing coordinate arrays by hand.

Dev-only: reachable at `/testbed/tile-decoration-editor`, same route family as `IslandTileSlotLab` (`src/modules/map/components/IslandTile/IslandTile.preview.slot-lab.tsx`). Not part of the in-game HUD; mobile layout rules below exist only because the testbed shell itself must still work at narrow widths, not because players ever see this.

### Placement and layout
- **Desktop (1280×720)**: new testbed preview registered in `src/testbed/registry.ts` next to `islandTilePreview`, rendered inside the existing `TestbedShell` (`src/testbed/components/TestbedShell/TestbedShell.tsx:1`) — sidebar nav stays, `<main>` hosts the editor. Inside `<main>`, three columns left to right:
  1. **Scenario & layout rail** (`w-64`, fixed): scenario picker, layout list for the selected scenario, Add/Duplicate/Delete/Rename/Save row.
  2. **Tile canvas** (center, flexible, min `360px`): the `IslandTileSlotLab`-style realistic tile preview (`WithLabGameBoardContext`, same `GameBoardProvider` wrapper, same fixtures) at a fixed `360×360` px canvas, occupants/resources/boats rendered as non-interactive alignment reference, decoration instances rendered as draggable sprites on top.
  3. **Image & instance inspector** (`w-72`, fixed): image picker grid (sprites from `public/sprites/decorations/`, auto-discovered) to add a new instance; below it, the selected instance's size and z-index fields and a Remove button.
  - This 3-column layout reuses the `flex flex-wrap items-start gap-8` pattern already used by `IslandTileSlotLab` (`IslandTile.preview.slot-lab.tsx:151`), just with a third column added.
- **Mobile (390×844)**: columns stack vertically in the same order (rail, canvas, inspector) under `useIsMobile()` (`@/modules/shared`); the tile canvas keeps its fixed `360×360`px art (it does not shrink to a map-grid tile size — there is no live `MapGrid` on this page, so the "whole map grid must stay visible" rule does not apply here). This is a developer tool inside the testbed shell, which already scrolls vertically; no new scroll-affordance spec is needed beyond what `TestbedShell` provides today.

### States
| State | What the player (developer) sees | Trigger |
|---|---|---|
| Default | Scenario picker shows "Base" selected; layout list shows the migrated layouts (see Copy) with the first one active; canvas shows that layout's decorations on the realistic tile; inspector shows the image grid with no instance selected | Page load |
| Scenario changed | Layout list repopulates for the new scenario (e.g. switching to "Resource" shows "1 node", "2 nodes", "3 nodes", "4 nodes" sub-tabs, each with its own layout list); canvas clears to that scenario's first layout | Scenario `<Select>` change |
| Layout selected | Canvas redraws with the chosen layout's instances; rail highlights the active layout row | Click a layout row |
| Instance selected | Selected sprite gets a visible outline ring (`ring-2 ring-primary`) on the canvas; inspector's size/z-index fields populate with that instance's values; Remove button enables | Click a decoration sprite on the canvas |
| Dragging | Selected sprite follows the pointer within the canvas bounds; a live `top%, left%` readout appears in the inspector while dragging; drag is clamped to the canvas box (0–100% of each axis) | Pointer-down + move on a sprite |
| Unsaved changes | A "Unsaved changes" badge (`Badge variant="outline"` with `text-accent`) appears next to the active layout name; Save button becomes the only enabled action in that row (Add/Duplicate/Delete disabled until saved or discarded) | Any drag, add, remove, rename, or field edit since the last save |
| Saving | Save button shows a spinner (`Loader2` from lucide-react, `animate-spin`) and is disabled | Save clicked, request in flight |
| Saved | "Unsaved changes" badge disappears; a transient inline confirmation ("Saved.") shows for 2s then fades | Save response 200 |
| Save error | Inline error text under the Save button ("Could not save — see console.") in `text-destructive`; edits are preserved, not discarded | Save response non-200 or network failure |
| Empty layout | Canvas shows the realistic tile with zero decoration sprites and a centered dashed-border hint text "No decorations — pick an image to add one" (`text-muted-foreground`) | Layout has 0 instances (e.g. after removing the last one, or a brand-new layout) |
| Image grid empty | If `public/sprites/decorations/` has no files yet, the image picker shows "No images in public/sprites/decorations/ yet." instead of a grid | Folder auto-discovery returns 0 images |
| No scenario data (first run before migration) | Not a real state once implementer-a runs the migration in the same phase; not specced further here |

### Components and tokens
- Reuse, each path verified in this session:
  - `TestbedShell` (`src/testbed/components/TestbedShell/TestbedShell.tsx`) — outer shell, registered via `src/testbed/registry.ts:1-86` alongside `islandTilePreview`.
  - `GameBoardProvider` + `IslandTileView` + lab fixtures (`localPlayerFixture`, `cornerOccupants4`, `labGameStateFixture`) from `src/modules/map/components/IslandTile/IslandTile.preview.slot-lab.tsx:36-57` and `IslandTile.fixtures.ts` — gives the realistic tile canvas with occupants/resources/boats as alignment reference, same as `IslandTileSlotLab`.
  - shadcn `Select` (`src/components/ui/select.tsx`) — scenario picker and, for Resource/Empty, the node/tree-count sub-picker.
  - shadcn `Button` (`src/components/ui/button.tsx`) — Add layout, Duplicate, Delete, Save, Remove instance.
  - shadcn `Input` (`src/components/ui/input.tsx`) — layout rename field, size (number) field.
  - shadcn `Badge` (`src/components/ui/badge.tsx`) — "Unsaved changes" indicator.
  - shadcn `Tooltip` (`src/components/ui/tooltip.tsx`) — image thumbnails show filename on hover (image grid has no room for visible labels).
  - shadcn `ScrollArea` (`src/components/ui/scroll-area.tsx`) — layout list and image grid, both potentially longer than their fixed column height.
  - shadcn `AlertDialog` (`src/components/ui/alert-dialog.tsx`) — confirm before Delete layout (destructive, irreversible once saved).
  - lucide-react icons: `Trash2` (delete), `Copy` (duplicate), `Save`, `Loader2` (spinner), `Plus` (add layout) — same icon set already in use via `lucide-react` project-wide.
- One new visual pattern (the one this feature is allowed): the **draggable sprite instance** on the canvas — a sprite rendered at `position: absolute`, sized and positioned from its instance data, with a pointer-driven drag handle that updates `top`/`left` live. No existing component in `src/modules/map` is draggable; `IslandTileSlotLab`'s tile is purely a display reference, never an interaction target. Everything else in this spec reuses existing shadcn primitives or the `IslandTileSlotLab` tile-canvas pattern.
- Tokens: `bg-black/60 backdrop-blur-md border-white/10` for the rail/inspector panels (same glass pattern as `MapZoomControls.tsx`); `text-muted-foreground`, `text-destructive`, `text-accent`, `ring-primary`, `border-border` — no raw hex values anywhere in the spec above.

### Copy
- Page title (sidebar nav + `<main>` heading): "Tile decoration editor"
- Scenario picker label: "Scenario"
- Scenario options, exact strings: "Base", "Special", "Empty — 2 trees", "Empty — 3 trees", "Resource — 1 node", "Resource — 2 nodes", "Resource — 3 nodes", "Resource — 4 nodes", "Monster — alive", "Monster — cleared"
- Layout list header: "Layouts"
- Layout row default/migrated names: "Default" for each scenario's first (migrated) layout — e.g. selecting "Base" shows one layout row named "Default" holding the 15 instances migrated from `BASE_FOREST_SLOTS`.
- Buttons: "Add layout", "Duplicate", "Rename", "Delete", "Save", "Remove"
- Delete confirm dialog: title "Delete this layout?", body "This removes \"{layout name}\" from {scenario name} permanently once you save.", confirm "Delete", cancel "Cancel"
- Unsaved badge: "Unsaved changes"
- Save success (transient): "Saved."
- Save error: "Could not save — see console."
- Empty layout hint (on canvas): "No decorations — pick an image to add one"
- Empty image folder: "No images in public/sprites/decorations/ yet."
- Image grid header: "Decoration images"
- Instance inspector header: "Selected decoration"
- Instance fields labels: "Size (% of tile)", "Layer (z-index)"
- No selection placeholder in inspector: "Click a decoration on the tile to edit it."

### Interactions and motion
- **Add decoration**: click an image thumbnail in the picker → a new instance appears centered (`top: 45%, left: 45%`, `size: 20`, `z: 10` — the same loose defaults as `EMPTY_GROVE_SLOTS`'s scale) on the canvas, auto-selected.
- **Drag**: pointer-down on a sprite captures the pointer (`setPointerCapture`); pointer-move updates the instance's `top`/`left` as a percentage of the canvas box, clamped to `0–100` on each axis (no corner-clearance enforcement in the tool itself — that judgment stays with the developer, same as the current hand-authored tables carry inline review comments); pointer-up commits the position and marks the layout unsaved. Click without drag (no pointer-move beyond a 4px threshold) selects without moving — avoids accidental nudges.
- **Remove**: selects an instance, click "Remove" deletes it immediately (no confirm — reversible by not saving, same tier as reordering); if it was the last instance, canvas shows the Empty-layout hint.
- **Resize / re-layer**: inspector's "Size" and "Layer" number inputs edit the selected instance directly; canvas reflects the change live (same live-update expectation as drag).
- **Add layout**: prompts for a name via inline `Input` appearing in place of the button (not a dialog — this is a quick, low-stakes action); Enter confirms, Escape cancels; new layout starts empty.
- **Duplicate**: copies the active layout's instances into a new layout named "{original name} copy"; immediately selects the copy.
- **Rename**: inline `Input` replaces the layout row's label text, same Enter/Escape pattern as Add.
- **Delete**: requires the `AlertDialog` confirm above; cannot delete a scenario's last remaining layout (button disabled with tooltip "A scenario needs at least one layout" when only one exists) — every scenario must always resolve to a layout for in-game rendering.
- **Save**: writes the entire active layout (all instances) for the active scenario to the one config file via the dev-only API route; button disabled when there are no unsaved changes or while a save is in flight.
- Motion: unsaved badge and saved-confirmation fades use `transition-opacity duration-200`; both respect `motion-reduce:transition-none` for `prefers-reduced-motion`. Drag itself has no transition (must track the pointer directly, 1:1, for a predictable drag feel).

### Accessibility
- Scenario `<Select>` and layout rows are standard shadcn/Radix controls — already keyboard- and screen-reader-accessible by construction.
- Each image thumbnail button: `aria-label="Add {filename}"` (filename only, since these are dev-asset names, not player-facing copy) and the `Tooltip` shows the same string on hover/focus.
- Each draggable sprite instance is a `button`-rooted element (not a bare `div`) so it is independently focusable; `aria-label="Decoration {index+1} of {count}, {filename}"`. Arrow keys, when the instance is focused, nudge `top`/`left` by 1% per press (Shift+Arrow by 5%) — this is the keyboard equivalent of drag, required because drag-and-drop alone is not keyboard-operable (WCAG 2.1.1).
- Remove/Delete/Save/Add/Duplicate buttons are icon+text (never icon-only), so no `aria-label`-only gap exists; "A scenario needs at least one layout" is exposed as the disabled button's accessible description (`aria-describedby`), not only a tooltip.
- Focus-visible ring (`focus-visible:ring-2 focus-visible:ring-ring`) on every interactive element, including the draggable sprite buttons.
- Contrast: all copy above sits on the existing dark glass panels (`bg-black/60` over `background: 230 40% 6%`), same contrast profile already verified for `MapZoomControls`/`GameStatusBadge` — no new background color introduced.

### Acceptance criteria
- [ ] `/testbed/tile-decoration-editor` loads inside `TestbedShell`, sidebar nav entry present, matching the Default state copy above.
- [ ] Selecting each of the 10 scenario options (screenshot each) shows a layout list and a canvas matching that scenario's migrated "Default" layout, with no console error.
- [ ] Clicking a decoration sprite shows the selection ring and populates the inspector's Size/Layer fields with that instance's current values.
- [ ] Dragging a sprite updates its position live and sets the "Unsaved changes" badge; releasing the pointer leaves it at the drop position.
- [ ] Pressing an arrow key while a sprite is focused moves it by 1% (visually confirmable via a before/after screenshot) without using the pointer.
- [ ] Clicking an image thumbnail adds a new, auto-selected instance at the centered default position; the layout's instance count increases by one.
- [ ] Removing the last instance in a layout shows the "No decorations — pick an image to add one" empty-canvas hint.
- [ ] Attempting to delete a scenario's only layout shows the button disabled rather than allowing a delete to zero layouts.
- [ ] Clicking Save shows the spinner, then "Saved." and the "Unsaved changes" badge disappears, on a successful dev API response.
- [ ] At 390px width (mobile), the rail/canvas/inspector stack vertically in that order and every control remains reachable by scrolling, with no horizontal overflow.

## Review (ui-designer-b)
VERDICT: APPROVED (fixes folded into Final spec below)

All cited paths/components verified this session: `TestbedShell.tsx`, `TestbedShell.styles.ts`, `src/testbed/registry.ts`, `src/testbed/testbed.types.ts`, `IslandTile.preview.slot-lab.tsx` (fixtures, `WithLabGameBoardContext`, `GameBoardProvider`), `island-tile-slots.types.ts:136-173` (`BASE_FOREST_SLOTS`/`SPECIAL_FOREST_SLOT`/`EMPTY_GROVE_SLOTS`), `TileForest.map.ts:11-17` (suppression logic), `TileForest.tsx`/`.styles.ts`, `badge.tsx`, `tooltip.tsx`, `scroll-area.tsx`, `alert-dialog.tsx`, `MapZoomControls.styles.ts:2`, `GameStatusBadge.styles.ts:4` (glass tokens, confirmed in the `.styles.ts` file not the `.tsx`), `use-is-mobile.ts`. No invented primitive, token or path found.

Findings, each folded into the Final spec, none require a redesign:

1. **Route/state navigation gap.** `PreviewStage.tsx:13-33` shows "Select a state above to preview it" when no `?state=` is in the URL, and `TestbedSidebar.tsx:33` links to the bare `/testbed/{slug}` with no state param — so "reachable at `/testbed/tile-decoration-editor`" does not land in the editor by itself, same as every other multi-state preview (confirmed via `IslandTile.preview.tsx:34,43-44`, where `IslandTileSlotLab` is one named state, not the page default). Fixed below: the editor is registered as a single named state ("Editor"); placement/acceptance criteria now target `/testbed/tile-decoration-editor?state=Editor`.
2. **Scenario picker vs sub-picker contradiction.** States row implies a two-level picker (outer scenario + sub-tabs for node/tree count); Components row only grants a sub-picker to "Resource/Empty" (Monster's alive/cleared needs one too, per the States row itself); Copy lists all 10 strings flat with no split between outer and inner control. An implementer could build either a flat 10-item `<Select>` or a nested one from this text. Fixed below: outer `<Select>` has 5 options (Base, Special, Empty, Resource, Monster); a second `<Select>` appears only for Empty/Resource/Monster, with their own options.
3. **Default new-instance values don't match their cited source.** `island-tile-slots.types.ts:169-173` (`EMPTY_GROVE_SLOTS`) has `size: '28%'` and `z: 12-14`, not the spec's `size: 20, z: 10`. Functionally harmless (a dev-tool default the developer adjusts immediately), but the citation is wrong. Fixed below: default `size: 25, z: 12`, no more tied to a table that doesn't hold those numbers.
4. **"Layer (z-index)" field's real ceiling needs a note.** The decoration container replaces `TileForest`, whose container is `z-[12]` (`TileForest.styles.ts:2`), always below `TileBoats` (`z-[25]`/`z-[26]`, `TileBoats.styles.ts:4,10`) and `TileResources` (`z-[28]`-`z-[35]`, `TileResources.styles.ts:2,9,11`). So the "Layer" field can only reorder decorations against each other, never draw one over a boat or resource icon — intentional (keeps the corner-clearance rule meaningful), but worth stating so implementer-a keeps the new container at the same `z-[12]` slot and nobody later reads "Layer" as "bring to front of everything."
5. **6 of the 10 scenarios start with nothing to migrate.** Resource×4 and Monster×2 have no legacy slot table (today suppressed, `TileForest.map.ts:12-16`), so their seeded "Default" layout has 0 instances on first run — the spec's Default-state example only shows Base's 15-instance migration. This already falls under the specced "Empty layout" state; the Final spec says so explicitly so implementer/tester don't mistake an empty Resource/Monster canvas for a bug.

Everything else holds: glass tokens, state table, accessibility (keyboard nudge, aria-labels, focus ring), drag/resize/re-layer interactions, Save/error/empty states, mobile stacking (`TestbedShell.styles.ts` already `flex-col` under `md:`), and acceptance criteria are consistent with the theme and with existing primitives, and are screenshot/test-observable once fix 1 is applied.

## Final spec

### Purpose and user story
As a developer tuning island art (not a player — this tool never ships to players), I want to drag decoration sprites onto a realistic tile preview, save several named layouts per island scenario, and pick images from an auto-discovered folder, so that I can replace the hand-coded tree slot tables with visually-tuned layouts without editing coordinate arrays by hand.

Dev-only: reachable at `/testbed/tile-decoration-editor?state=Editor` (see fix 1 — this preview registers one named state, "Editor", same pattern as `IslandTileSlotLab` inside `islandTilePreview`, `IslandTile.preview.tsx:34,43-44`; the bare `/testbed/tile-decoration-editor` shows the testbed's standard state-picker nav first, per `PreviewStage.tsx`). Not part of the in-game HUD; mobile layout rules below exist only because the testbed shell itself must still work at narrow widths, not because players ever see this.

### Placement and layout
- **Desktop (1280×720)**: new testbed preview registered in `src/testbed/registry.ts` next to `islandTilePreview`, with its own slug `tile-decoration-editor` and one state named "Editor", rendered inside the existing `TestbedShell` (`src/testbed/components/TestbedShell/TestbedShell.tsx:1`) via `src/app/testbed/[slug]/page.tsx` — sidebar nav stays, `<main>` hosts the editor. Inside `<main>`, three columns left to right:
  1. **Scenario & layout rail** (`w-64`, fixed): scenario picker, conditional sub-picker (see Copy), layout list for the selected scenario/variant, Add/Duplicate/Delete/Rename/Save row.
  2. **Tile canvas** (center, flexible, min `360px`): the `IslandTileSlotLab`-style realistic tile preview (`WithLabGameBoardContext`, same `GameBoardProvider` wrapper, same fixtures) at a fixed `360×360` px canvas, occupants/resources/boats rendered as non-interactive alignment reference (`pointer-events-none` containers, as today), decoration instances rendered as draggable sprites on top, in a container kept at the same `z-[12]` stacking slot `TileForest.styles.ts:2` uses today (see Review finding 4) — decorations stay below boats/resources, same as real play.
  3. **Image & instance inspector** (`w-72`, fixed): image picker grid (sprites from `public/sprites/decorations/`, auto-discovered) to add a new instance; below it, the selected instance's size and z-index fields and a Remove button.
  - This 3-column layout reuses the `flex flex-wrap items-start gap-8` pattern already used by `IslandTileSlotLab` (`IslandTile.preview.slot-lab.tsx:151`), just with a third column added.
- **Mobile (390×844)**: columns stack vertically in the same order (rail, canvas, inspector) under `useIsMobile()` (`@/modules/shared`); the tile canvas keeps its fixed `360×360`px art (it does not shrink to a map-grid tile size — there is no live `MapGrid` on this page, so the "whole map grid must stay visible" rule does not apply here). This is a developer tool inside the testbed shell, which already scrolls vertically (`TestbedShell.styles.ts`: `flex flex-col md:h-screen md:flex-row` on the shell, `flex-1 md:overflow-y-auto` on `<main>`); no new scroll-affordance spec is needed beyond what `TestbedShell` provides today.

### States
| State | What the player (developer) sees | Trigger |
|---|---|---|
| Default | Scenario picker shows "Base" selected (no sub-picker, Base has none); layout list shows the migrated layout (see Copy) with the first one active; canvas shows that layout's decorations on the realistic tile; inspector shows the image grid with no instance selected | `/testbed/tile-decoration-editor?state=Editor` loads |
| Scenario changed | For Base/Special: layout list repopulates directly. For Empty/Resource/Monster: a sub-picker (second `<Select>`) appears with that scenario's variants (e.g. Empty → "2 trees"/"3 trees"); layout list repopulates once a variant is chosen; canvas clears to that variant's first layout | Scenario `<Select>` change (and, where applicable, sub-picker change) |
| Layout selected | Canvas redraws with the chosen layout's instances; rail highlights the active layout row | Click a layout row |
| Instance selected | Selected sprite gets a visible outline ring (`ring-2 ring-primary`) on the canvas; inspector's size/z-index fields populate with that instance's values; Remove button enables | Click a decoration sprite on the canvas |
| Dragging | Selected sprite follows the pointer within the canvas bounds; a live `top%, left%` readout appears in the inspector while dragging; drag is clamped to the canvas box (0–100% of each axis) | Pointer-down + move on a sprite |
| Unsaved changes | A "Unsaved changes" badge (`Badge variant="outline"` with `text-accent`) appears next to the active layout name; Save button becomes the only enabled action in that row (Add/Duplicate/Delete disabled until saved or discarded) | Any drag, add, remove, rename, or field edit since the last save |
| Saving | Save button shows a spinner (`Loader2` from lucide-react, `animate-spin`) and is disabled | Save clicked, request in flight |
| Saved | "Unsaved changes" badge disappears; a transient inline confirmation ("Saved.") shows for 2s then fades | Save response 200 |
| Save error | Inline error text under the Save button ("Could not save — see console.") in `text-destructive`; edits are preserved, not discarded | Save response non-200 or network failure |
| Empty layout | Canvas shows the realistic tile with zero decoration sprites and a centered dashed-border hint text "No decorations — pick an image to add one" (`text-muted-foreground`) | Layout has 0 instances — this is the expected first-run state for all 6 Resource/Monster variants (no legacy slot table to migrate, see Review finding 5), as well as after removing a layout's last instance or creating a brand-new layout |
| Image grid empty | If `public/sprites/decorations/` has no files yet, the image picker shows "No images in public/sprites/decorations/ yet." instead of a grid | Folder auto-discovery returns 0 images |
| No scenario data (first run before migration) | Not a real state once implementer-a runs the migration in the same phase; not specced further here |

### Components and tokens
- Reuse, each path verified in this session:
  - `TestbedShell` (`src/testbed/components/TestbedShell/TestbedShell.tsx`) — outer shell, registered via `src/testbed/registry.ts:1-86` alongside `islandTilePreview`.
  - `GameBoardProvider` + `IslandTileView` + lab fixtures (`localPlayerFixture`, `cornerOccupants4`, `labGameStateFixture`) from `src/modules/map/components/IslandTile/IslandTile.preview.slot-lab.tsx` and `IslandTile.fixtures.ts` — gives the realistic tile canvas with occupants/resources/boats as alignment reference, same as `IslandTileSlotLab`.
  - shadcn `Select` (`src/components/ui/select.tsx`) — outer scenario picker (5 options: Base, Special, Empty, Resource, Monster) and, for Empty/Resource/Monster, a second `<Select>` for the variant (tree count / node count / alive-cleared).
  - shadcn `Button` (`src/components/ui/button.tsx`) — Add layout, Duplicate, Delete, Save, Remove instance.
  - shadcn `Input` (`src/components/ui/input.tsx`) — layout rename field, size (number) field.
  - shadcn `Badge` (`src/components/ui/badge.tsx`) — "Unsaved changes" indicator.
  - shadcn `Tooltip` (`src/components/ui/tooltip.tsx`) — image thumbnails show filename on hover (image grid has no room for visible labels).
  - shadcn `ScrollArea` (`src/components/ui/scroll-area.tsx`) — layout list and image grid, both potentially longer than their fixed column height.
  - shadcn `AlertDialog` (`src/components/ui/alert-dialog.tsx`) — confirm before Delete layout (destructive, irreversible once saved).
  - lucide-react icons: `Trash2` (delete), `Copy` (duplicate), `Save`, `Loader2` (spinner), `Plus` (add layout) — same icon set already in use via `lucide-react` project-wide.
- One new visual pattern (the one this feature is allowed): the **draggable sprite instance** on the canvas — a sprite rendered at `position: absolute`, sized and positioned from its instance data, with a pointer-driven drag handle that updates `top`/`left` live. No existing component in `src/modules/map` is draggable; `IslandTileSlotLab`'s tile is purely a display reference, never an interaction target. Everything else in this spec reuses existing shadcn primitives or the `IslandTileSlotLab` tile-canvas pattern.
- Tokens: `bg-black/60 backdrop-blur-md border-white/10` for the rail/inspector panels (same glass pattern as `MapZoomControls.styles.ts:2`/`GameStatusBadge.styles.ts:4`); `text-muted-foreground`, `text-destructive`, `text-accent`, `ring-primary`, `border-border` — no raw hex values anywhere in the spec above.

### Copy
- Page title (sidebar nav + `<main>` heading): "Tile decoration editor"
- Scenario picker label: "Scenario"; outer `<Select>` options, exact strings: "Base", "Special", "Empty", "Resource", "Monster"
- Sub-picker label: "Variant"; shown only when the outer scenario is Empty, Resource, or Monster:
  - Empty → "2 trees", "3 trees"
  - Resource → "1 node", "2 nodes", "3 nodes", "4 nodes"
  - Monster → "Alive", "Cleared"
  - (Base and Special have no sub-picker — one variant each. 2 + 2 + 4 + 2 = 10 scenario/variant combinations total, matching the acceptance criteria below.)
- Layout list header: "Layouts"
- Layout row default/migrated names: "Default" for each scenario/variant's first layout — e.g. selecting "Base" shows one layout row named "Default" holding the 15 instances migrated from `BASE_FOREST_SLOTS`; Resource and Monster variants' "Default" layout starts with 0 instances (nothing to migrate, see States table).
- Buttons: "Add layout", "Duplicate", "Rename", "Delete", "Save", "Remove"
- Delete confirm dialog: title "Delete this layout?", body "This removes \"{layout name}\" from {scenario name} permanently once you save.", confirm "Delete", cancel "Cancel"
- Unsaved badge: "Unsaved changes"
- Save success (transient): "Saved."
- Save error: "Could not save — see console."
- Empty layout hint (on canvas): "No decorations — pick an image to add one"
- Empty image folder: "No images in public/sprites/decorations/ yet."
- Image grid header: "Decoration images"
- Instance inspector header: "Selected decoration"
- Instance fields labels: "Size (% of tile)", "Layer (z-index)"
- No selection placeholder in inspector: "Click a decoration on the tile to edit it."

### Interactions and motion
- **Add decoration**: click an image thumbnail in the picker → a new instance appears centered (`top: 45%, left: 45%, size: 25, z: 12` — a loose mid-range default, inside the span the migrated tables already use: `15%`-`28%` size, `z` `10`-`20`) on the canvas, auto-selected.
- **Drag**: pointer-down on a sprite captures the pointer (`setPointerCapture`); pointer-move updates the instance's `top`/`left` as a percentage of the canvas box, clamped to `0–100` on each axis (no corner-clearance enforcement in the tool itself — that judgment stays with the developer, same as the current hand-authored tables carry inline review comments); pointer-up commits the position and marks the layout unsaved. Click without drag (no pointer-move beyond a 4px threshold) selects without moving — avoids accidental nudges.
- **Remove**: selects an instance, click "Remove" deletes it immediately (no confirm — reversible by not saving, same tier as reordering); if it was the last instance, canvas shows the Empty-layout hint.
- **Resize / re-layer**: inspector's "Size" and "Layer" number inputs edit the selected instance directly; canvas reflects the change live (same live-update expectation as drag). "Layer" only reorders decorations against each other — the decoration container stays at the same `z-[12]` slot `TileForest` uses today, always below boats/resources (`TileBoats.styles.ts:4,10`, `TileResources.styles.ts:2,9,11`); it cannot draw a decoration over a boat or resource icon.
- **Add layout**: prompts for a name via inline `Input` appearing in place of the button (not a dialog — this is a quick, low-stakes action); Enter confirms, Escape cancels; new layout starts empty.
- **Duplicate**: copies the active layout's instances into a new layout named "{original name} copy"; immediately selects the copy.
- **Rename**: inline `Input` replaces the layout row's label text, same Enter/Escape pattern as Add.
- **Delete**: requires the `AlertDialog` confirm above; cannot delete a scenario/variant's last remaining layout (button disabled with tooltip "A scenario needs at least one layout" when only one exists) — every scenario/variant must always resolve to a layout for in-game rendering.
- **Save**: writes the entire active layout (all instances) for the active scenario/variant to the one config file via the dev-only API route; button disabled when there are no unsaved changes or while a save is in flight.
- Motion: unsaved badge and saved-confirmation fades use `transition-opacity duration-200`; both respect `motion-reduce:transition-none` for `prefers-reduced-motion`. Drag itself has no transition (must track the pointer directly, 1:1, for a predictable drag feel).

### Accessibility
- Scenario `<Select>`, sub-picker `<Select>`, and layout rows are standard shadcn/Radix controls — already keyboard- and screen-reader-accessible by construction.
- Each image thumbnail button: `aria-label="Add {filename}"` (filename only, since these are dev-asset names, not player-facing copy) and the `Tooltip` shows the same string on hover/focus.
- Each draggable sprite instance is a `button`-rooted element (not a bare `div`) so it is independently focusable; `aria-label="Decoration {index+1} of {count}, {filename}"`. Arrow keys, when the instance is focused, nudge `top`/`left` by 1% per press (Shift+Arrow by 5%) — this is the keyboard equivalent of drag, required because drag-and-drop alone is not keyboard-operable (WCAG 2.1.1).
- Remove/Delete/Save/Add/Duplicate buttons are icon+text (never icon-only), so no `aria-label`-only gap exists; "A scenario needs at least one layout" is exposed as the disabled button's accessible description (`aria-describedby`), not only a tooltip.
- Focus-visible ring (`focus-visible:ring-2 focus-visible:ring-ring`) on every interactive element, including the draggable sprite buttons.
- Contrast: all copy above sits on the existing dark glass panels (`bg-black/60` over `background: 230 40% 6%`), same contrast profile already verified for `MapZoomControls`/`GameStatusBadge` — no new background color introduced.

### Acceptance criteria
- [ ] `/testbed/tile-decoration-editor?state=Editor` loads inside `TestbedShell`, sidebar nav entry present, matching the Default state copy above.
- [ ] Selecting each of the 10 scenario/variant combinations (2 + 2 + 4 + 2, screenshot each) shows a layout list and a canvas matching that combination's "Default" layout (empty canvas + hint text for the 6 Resource/Monster combinations, populated canvas for Base/Special/Empty), with no console error.
- [ ] Clicking a decoration sprite shows the selection ring and populates the inspector's Size/Layer fields with that instance's current values.
- [ ] Dragging a sprite updates its position live and sets the "Unsaved changes" badge; releasing the pointer leaves it at the drop position.
- [ ] Pressing an arrow key while a sprite is focused moves it by 1% (visually confirmable via a before/after screenshot) without using the pointer.
- [ ] Clicking an image thumbnail adds a new, auto-selected instance at the centered default position; the layout's instance count increases by one.
- [ ] Removing the last instance in a layout shows the "No decorations — pick an image to add one" empty-canvas hint.
- [ ] Attempting to delete a scenario/variant's only layout shows the button disabled rather than allowing a delete to zero layouts.
- [ ] Clicking Save shows the spinner, then "Saved." and the "Unsaved changes" badge disappears, on a successful dev API response.
- [ ] At 390px width (mobile), the rail/canvas/inspector stack vertically in that order and every control remains reachable by scrolling, with no horizontal overflow.
