# Plan: Default-elements editing mode for the tile-decoration editor

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec)

## Goal and acceptance criteria
All acceptance criteria from `ui-design.md`'s Final spec apply verbatim (lines 97-109). Restated with the two triage-resolved items folded in:
- [ ] Testbed `TileDecorationEditor` has two `Tabs` triggers, `Decorations` (default) and `Default elements`; `Decorations` mode's rail/canvas/inspector content is unchanged.
- [ ] `Default elements` mode replaces the rail with the 4-group/9-row element list (no Scenario/Variant `Select`).
- [ ] Each row renders the exact sprite count the spec's table lists (4 for Knight/Boat, 1/2/3/4 for the resource rows, 3 for Base resource slots, 1 for Idle art, 0 for Player crest) and hides the matching real layer via its `data-testid` (none hidden for Player crest).
- [ ] Knight/Boat: one shared `Size` field resizes all 4 corners; dragging one corner never moves the other 3.
- [ ] Resource/special rows: each sprite has its own independently-resizable `Size` field.
- [ ] Player crest: no draggable sprite, shows the `Centered — size only` badge, inspector shows exactly `Size (% of tile)` and `Minimum size (px)`, no readout, no `Layer (z-index)` field anywhere in this mode.
- [ ] Save in `Default elements` mode writes the edited values into `src/modules/map/island-tile-slots.types.ts` as TS source, preserving every existing comment and every untouched export byte-for-byte; shows the warning line `Saving writes directly to island-tile-slots.types.ts.` (only in this mode).
- [ ] A regression test locks in `TileDecorations` `z-[12]` < `IslandTile` `centerContent` `z-20` < `TileBoats` `z-[25]` < `TileOccupants` `z-30`.
- [ ] Full keyboard path (Tab/Enter/arrows only) reaches every control, per the spec's Accessibility section.
- [ ] `island-tile-slots.test.ts`'s pinned literals still pass unchanged (no default value is retuned by this task — editing tool only).

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `OCCUPANT_CORNER_SLOTS`, `BOAT_CORNER_POSITIONS`, `CORNER_TRANSFORMS`, `CornerPosition`, `CornerId`, `SlotDef`, `SINGLE_RESOURCE_SLOT`, `DUAL_RESOURCE_SLOTS`, `TRIPLE_RESOURCE_SLOTS`, `QUAD_RESOURCE_SLOTS`, `BASE_RESOURCE_SLOTS`, `OCCUPANT_SIZE`, `BOAT_SIZE`, `SPECIAL_ISLAND_SIZE/TOP/LEFT`, `BASE_CREST_SIZE/MIN_PX` | `src/modules/map/island-tile-slots.types.ts:1-123` | The locked, hand-tuned data this feature edits. User memory requires preserving current values exactly except through this explicitly-asked tool. |
| `island-tile-slots.test.ts` | `src/modules/map/island-tile-slots.test.ts:1-105` | Pins today's literals; must still pass (values unchanged by this task). |
| `TileDecorationEditorView`/`TileDecorationEditor` | `src/testbed/components/TileDecorationEditor/TileDecorationEditor.tsx:14,49` | Root component; gets the mode `Tabs` and conditional rail/canvas/inspector. |
| `useTileDecorationEditor` | `TileDecorationEditor.hook.ts:31-167` | Existing decorations-mode state; gains `mode` and composes the new sub-hook. |
| `TileDecorationEditorViewModel` | `TileDecorationEditor.types.ts:13-43` | Gains `mode`/`onModeChange` and the default-elements fields (Contracts below). |
| `TileDecorationEditorRail` | `TileDecorationEditorRail.tsx:32-113` | Owns its own `<aside>`; becomes the `Decorations`-mode rail content, loses its outer `<aside>` tag (moves to the new shared shell). |
| `TileDecorationEditorCanvas`, `WithReferenceGameBoardContext` (private) | `TileDecorationEditorCanvas.tsx:30-45,49-81` | Reference-tile wrapper to extract into a shared component; canvas's sprite-loop to adapt to the generalized sprite. |
| `TileDecorationEditorInspector`, `SelectedInstanceFields` | `TileDecorationEditorInspector.tsx:28-74,83-117` | Decorations-mode inspector incl. the `Layer (z-index)` field this mode must never show. |
| `TileDecorationEditorLayoutActions` | `TileDecorationEditorLayoutActions.tsx:39-103` | Bundles action buttons + the Save row (`styles.saveRow`, lines 92-100) that must be extracted and reused. |
| `TileDecorationEditorSprite` | `TileDecorationEditorSprite.tsx:41-116` | Pointer drag (1:1, `DRAG_THRESHOLD_PX=4`), arrow-key nudge (1%/5% Shift), click-select; hardcodes `top/left/size/z/SPRITE_CENTER_TRANSFORM` from a `DecorationInstance` — generalizing its style/aria-label props is this plan's one shared-component refactor. |
| `toPointerPercent`, `clampPercent`, `nudgeInstance`, `createInstance` | `TileDecorationEditor.map.ts:12-39` | Existing pure pointer-math/clamp helpers to reuse, not duplicate. |
| `toReferenceIsland`, `toFileName`, `emptyIsland`, `specialIsland`, `resourceIsland`, `REFERENCE_ISLANDS` | `TileDecorationEditor.display.map.ts:22-65` | Existing reference-tile fixtures for 7 of the 9 rows; `baseIslandWithResources` (new) covers the remaining 2 (Player crest, Resource slots (base)). |
| `saveDecorationLayouts`, `listDecorationImages` | `TileDecorationEditor.service.ts:8-30` | Pattern for the new `saveDefaultElements` POST call. |
| `src/app/api/tile-decoration-editor/layouts/route.ts:1-36` | — | Pattern for the new default-elements save route: dev-only 404 in production, validate body, `writeFile`. Deep-imports `@/modules/map/decoration-layouts.types` directly (not the barrel) — the new route mirrors this. |
| `TileOccupants.tsx:8-10` (`styles.container` div) | — | Missing `data-testid="tile-occupants"`; `tile-boats`/`tile-resources` already exist (`TileBoats.tsx:21`, `TileResources.tsx:34`) confirming the convention. |
| `IslandTile.tsx:55-93` (base crest wrapper, special-content div), `SPECIAL_ISLAND_IDLE_SPRITE` const (`IslandTile.tsx:27`) | — | Missing `data-testid="base-crest"`/`data-testid="special-content"`; `SPECIAL_ISLAND_IDLE_SPRITE` is a local, unexported const this plan needs reused by the editor, not re-hardcoded. |
| `TileOccupants.hook.ts:56,58,68` | — | `PLAYER_DATA[player.color].sprite.idle` + `OCCUPANT_CORNER_SLOTS[index]` is how a knight's real sprite/slot is derived — the source of truth for the Knight row's per-corner image (ui-design.md's `cornerOccupants4[i].sprite` claim is unverified: `cornerOccupants4` entries are `{playerId, armyId}` only, `IslandTile.fixtures.slot-tuning.ts:8-15` — no `.sprite` field exists. This plan derives the sprite via `PLAYER_DATA` instead; functionally identical result, corrected source). |
| `COLLECTOR_IDLE_SPRITES` | `TileBoats.map.ts:6-11`, re-exported `TileBoats/index.ts:3` | Per-color boat-idle-collector sprite, the Boat row's per-corner image per ui-design.md (not `/sprites/boat.gif`, which is identical for every color and wouldn't show corner identity). |
| `toTileResourcesViewModel` | `TileResources.map.ts:91-162` | Already computes each resource node's real `spriteSrc` in array order for an island — reused (sprite only, not position) so the 5 resource-table rows never duplicate the Food/Wood/Gold sprite-selection logic. |
| `TileDecorations.styles.ts:2` (`z-[12]`), `IslandTile.styles.ts:59` (`centerContent` `z-20`), `TileBoats.styles.ts:4` (`z-[25]`), `TileOccupants.styles.ts:4` (`z-30`) | — | The z-index chain the regression test locks in. Verified by both ui-designers this session; `TileResources.styles.ts:2,9,11` (`z-[28]`/`z-[32]`/`z-[35]`) is nested inside `centerContent`'s own stacking context, not a 5th rung. |
| `decorationOverlay` | `TileDecorationEditor.styles.ts:44` (`z-[60]`) | Already above every production layer (lessons-learned: an interactive editor overlay must out-rank every layer it visually sits on, not match production's z-index) — the default-elements canvas reuses this, not a new z value. |
| `src/modules/map/index.ts:1-23` | — | The module barrel; `island-tile-slots.types.ts`'s exports are not in it today — testbed code must import them from here (lessons-learned: a `src/testbed/**` deep import into `@/modules/map/components/...` survives lint undetected; this plan avoids creating a new one). |
| `LEGACY_PATHS`, `MODULE_FILES`, `deepModuleImport` | `eslint.config.mjs:12-22,41,46-50` | Confirms `src/app/api/**` and `src/testbed/**` are outside `MODULE_FILES` (`src/modules/**/*.{ts,tsx}`), so the new API route may deep-import `@/modules/map/island-tile-slots.types` (matching the existing `layouts/route.ts` precedent) while testbed files use the barrel. |
| `node_type: memory` feedback | `~/.claude/projects/.../feedback_island_tile_slots_locked.md` | This task is the explicit, by-name user ask required before touching these values; still never retune a default inside this plan — only build the tool. |

## Decisions
- **Generalize `TileDecorationEditorSprite`** to take `image`, `ariaLabel`, a fully-computed `style: CSSProperties`, instead of a `DecorationInstance` — because both modes need byte-identical pointer/keyboard interaction, and the two modes' position conventions (center-point vs corner-anchored) differ, so the sprite itself must stay format-agnostic. Rejected: a second near-duplicate sprite component (violates DRY on the exact logic lessons-learned already flagged as fragile: pointer threshold, drag math, keyboard nudge).
- **One generic anchored-style map function pair** (`toAnchoredStyleFromPointer`, `nudgeAnchoredStyle`) drives knight, boat, resource-node and special-art position edits — because all four already share the same "two of four edge keys, in whichever order the file already uses" shape (`CornerPosition.style`, `SlotDef`'s own partial top/bottom/left/right). Rejected: a corner-specific function plus a separate center-point function (the math is identical; only the clamp range differs, which the function already takes as a parameter).
- **Clamp every anchored-style edit (corner and center-point alike) to one shared range, [-50, 100]**, not `clampPercent`'s existing [0, 100] — because today's hand-tuned values already go negative on both kinds: occupant corners (`-20%`, `-5%`) *and* a resource center-point, `BASE_RESOURCE_SLOTS[1] = { top: '45%', right: '-17%', size: 30 }` (`island-tile-slots.types.ts:120`). A `[0,100]` clamp would make `right: '-17%'` both unreachable by drag and destructive by nudge (snaps to `0` on the very first nudge). `[-50,100]` covers every known locked value (occupant corners down to `-20`, `BASE_RESOURCE_SLOTS[1].right` at `-17`, every positive center point up to `80`) with one constant, so there is nothing per-kind to get wrong. Rejected: two separate ranges, one for corner rows and one for resource/special rows (this plan's first draft did this and missed that `BASE_RESOURCE_SLOTS[1]` needed the wider range too — nothing in ui-design.md or the real data requires the split, so one range is both simpler and correct). Rejected: reusing `clampPercent` unmodified (would clamp away/corrupt real existing values on first edit).
- **Player crest, Knight/Boat shared size, and the two crest fields are drafted alongside the 5 resource-slot tables in one `IslandTileSlotsDraft` object**, exported as a type from `island-tile-slots.types.ts` itself (co-located with the values it describes) — because it is literally "the editable subset of this file's own exports," and a single shared type avoids the testbed and the save route maintaining two independent shape definitions. Rejected: defining the draft type only in the testbed component (the save route would then either import across the `src/testbed`/`src/app` boundary for a pure type, or duplicate the shape — duplication is the worse of the two, but importing a testbed type into a production API route the wrong direction; the slots file is the correct single owner).
- **The save route deep-imports `@/modules/map/island-tile-slots.types` directly**, not through the `@/modules/map` barrel — matching the existing `layouts/route.ts:4` precedent exactly (API routes are outside `MODULE_FILES`, so the lint boundary doesn't apply either way; consistency with the one existing example wins over barrel purity here).
- **Regenerate the file by reading its current text and doing targeted, scoped string substitution of only the changed literals**, not by re-serializing the whole module from a template — because triage's resolved answer requires preserving every comment verbatim, and only a substitution approach can guarantee that without hand-copying every comment into a second source of truth that could drift. The substitution is scoped per export block (extracted first, so e.g. `OCCUPANT_CORNER_SLOTS`'s `br` entry can never accidentally match `BOAT_CORNER_POSITIONS`'s `br` entry) and, within a block, per already-present key (so key order is preserved, never rewritten). Safety net: a test asserts that regenerating with an unchanged draft produces byte-identical output against the real file on disk.
- **Knight row's per-corner image comes from `PLAYER_DATA[player.color].sprite.idle`** (resolved via the reference island's own `occupants`/`playerId`), not `cornerOccupants4[i].sprite` as ui-design.md's Canvas section states — that field does not exist on the fixture (`IslandTile.fixtures.slot-tuning.ts:8-15`). Same visual result (the real per-player army idle sprite, in the same br/tr/tl/bl order), corrected source only.
- **Boat row's per-corner image is `COLLECTOR_IDLE_SPRITES[color]`**, not `/sprites/boat.gif` — `/sprites/boat.gif` is identical for every color (no visual corner identity in the editor), matching ui-design.md's own text ("the boat's `collector_<color>_idle.gif`").
- **Resource-row sprite images are read from the real `toTileResourcesViewModel` output** (`.spriteSrc` only, by array index) rather than re-deriving Food/Wood/Gold selection logic — one source of truth, zero chance of the editor showing a different sprite than the live tile for the same node.
- **Extract `TileDecorationEditorSaveRow`** (Save button + status text + optional one-line warning) out of `TileDecorationEditorLayoutActions`, reused by a new, much smaller `TileDecorationEditorDefaultElementsActions` — because ui-design.md explicitly asks to reuse "the same Save button and Unsaved changes indicator pattern" while dropping Add/Duplicate/Rename/Delete, which only `TileDecorationEditorLayoutActions` has. Rejected: duplicating the Save/status JSX into a second component (the two would drift the next time `STATUS_TEXT` or `styles.saveRow` changes).
- **Extract `TileDecorationEditorRailShell`** (the `<aside>` wrapper + the mode `Tabs`), with `TileDecorationEditorRail`'s existing content and the new `TileDecorationEditorDefaultElementsRail` content both rendered as its `children` — because the `Tabs` row must sit inside the same `md:w-56` column as both rails' content, and duplicating the `<aside>`+`Tabs` JSX in two files would drift. This is not a pass-through wrapper (it owns real layout + the Tabs' own state wiring).
- **No shared shell for the inspector or canvas** — each of `TileDecorationEditorInspector` (unchanged) and the new `TileDecorationEditorDefaultElementsInspector`/`...Canvas` keeps its own one-line `<aside>`/wrapper, because there is no shared interactive header to extract there (unlike the rail's Tabs), and a wrapper with nothing but a pass-through `children` prop would violate KISS.
- **No new editable z-index data and no `Layer (z-index)` field in Default-elements mode**, per triage's resolved answer. The regression test (new `src/modules/map/tile-layer-z-index.test.ts`, flat file, same precedent as `island-tile-slots.test.ts`) locks in today's chain by reading each component's own `styles.container`/`centerContent` string, not by hand-copying the numbers into a second file.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/map/island-tile-slots.types.ts` | edit | Add `ISLAND_TILE_SLOTS_PATH` (string constant, mirrors `DECORATION_LAYOUTS_CONFIG_PATH`) and `IslandTileSlotsDraft` (type only). No existing exported value changes. | implementer-a |
| `src/modules/map/index.ts` | edit | Re-export `ISLAND_TILE_SLOTS_PATH`, `IslandTileSlotsDraft` (type), `CornerId`/`CornerPosition`/`SlotDef` (types), `OCCUPANT_CORNER_SLOTS`, `BOAT_CORNER_POSITIONS`, `OCCUPANT_SIZE`, `BOAT_SIZE`, `SPECIAL_ISLAND_TOP`, `SPECIAL_ISLAND_LEFT`, `SPECIAL_ISLAND_SIZE`, `BASE_CREST_SIZE`, `BASE_CREST_MIN_PX`, `SINGLE_RESOURCE_SLOT`, `DUAL_RESOURCE_SLOTS`, `TRIPLE_RESOURCE_SLOTS`, `QUAD_RESOURCE_SLOTS`, `BASE_RESOURCE_SLOTS` from `./island-tile-slots.types`; re-export `COLLECTOR_IDLE_SPRITES` from `./components/TileBoats`; re-export `SPECIAL_ISLAND_IDLE_SPRITE` from `./components/IslandTile`. | implementer-a |
| `src/modules/map/components/IslandTile/IslandTile.tsx` | edit | Add `export` to the existing `SPECIAL_ISLAND_IDLE_SPRITE` const (line 27); add `data-testid="base-crest"` to the base-image wrapper div (line 57) and `data-testid="special-content"` to the special-content div (line 76). No behavior change. | implementer-b |
| `src/modules/map/components/IslandTile/index.ts` | edit | Re-export `SPECIAL_ISLAND_IDLE_SPRITE` from `./IslandTile`. | implementer-a |
| `src/modules/map/components/TileOccupants/TileOccupants.tsx` | edit | Add `data-testid="tile-occupants"` to the container div (line 10). No behavior change. | implementer-b |
| `src/modules/map/tile-layer-z-index.test.ts` | new | Regression test: `TileDecorations.styles.ts` `container` z < `IslandTile.styles.ts` `centerContent` z < `TileBoats.styles.ts` `container` z < `TileOccupants.styles.ts` `container` z. | tester-a |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.types.ts` | edit | Add `EditorMode` and the mode-switch + default-elements fields to `TileDecorationEditorViewModel` (Contracts below). | implementer-a |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.defaultElements.types.ts` | new | `DefaultElementRowId`, `DefaultElementKind`, `DefaultElementRowMeta`, `DefaultElementSlotViewModel`, `AnchoredStyle`, `SaveDefaultElementsRequestBody`. | implementer-a |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.display.map.ts` | edit | Add `baseIslandWithResources` (3 distinct resource types, per ui-design.md's Final-spec Fix 1). | implementer-a |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.defaultElements.map.ts` | new | `DEFAULT_ELEMENT_ROWS` (static, 9 rows), `toIslandTileSlotsDraft`, `toSlotsForRow`, `toAnchoredStyleFromPointer`, `nudgeAnchoredStyle`, `clampAnchoredOffsetPercent`, `toAnchoredStyleReadout`, `applyDragToDraft`, `applyNudgeToDraft`, `applySharedCornerSizeToDraft`, `applySlotSizeToDraft`, `applyCrestFieldToDraft`. | implementer-a |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.defaultElements.map.test.ts` | new | Unit tests for every function above. | tester-a |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.defaultElements.hook.ts` | new | `useDefaultElementsEditor()`: draft state, selection, dirty/status, drag/nudge/resize handlers, `onSave`. | implementer-a |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.defaultElements.hook.test.ts` | new | Hook tests (selection reset on row change, dirty flag, save success/error). | tester-a |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.hook.ts` | edit | Add `mode`/`onModeChange` state; compose `useDefaultElementsEditor()`; reset `selectedInstanceId` on mode change. | implementer-a |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.service.ts` | edit | Add `saveDefaultElements(draft: IslandTileSlotsDraft): Promise<void>` POSTing to the new route. | implementer-a |
| `src/app/api/tile-decoration-editor/default-elements/regenerate-source.ts` | new | `regenerateIslandTileSlotsSource(currentSource: string, draft: IslandTileSlotsDraft): string` — scoped, comment-preserving substitution. | implementer-a |
| `src/app/api/tile-decoration-editor/default-elements/regenerate-source.test.ts` | new | Round-trip test (unchanged draft → byte-identical to the real file read via `fs.readFileSync`), plus one-field-changed tests per export. | tester-a |
| `src/app/api/tile-decoration-editor/default-elements/route.ts` | new | Dev-only POST route: validate body, read current file, call `regenerateIslandTileSlotsSource`, `writeFile`. | implementer-a |
| `src/app/api/tile-decoration-editor/default-elements/route.test.ts` | new | Production 404, malformed-body 400, happy path writes and responds 200. | tester-a |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditorSprite.tsx` | edit | Generalize props to `{ image, ariaLabel, style: CSSProperties, isSelected, onSelect, onDrag(topPercent, leftPercent), onNudge(dTop, dLeft) }`; drop the `DecorationInstance`/`index`/`count` props; interaction logic (drag threshold, pointer math, keyboard nudge) unchanged. | implementer-b |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.map.ts` | edit | Add `toDecorationSpriteStyle(instance): CSSProperties` and `toDecorationAriaLabel(instance, index, count): string`, so the generalized sprite's props are built here, not inline in the canvas. | implementer-a |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.map.test.ts` | edit | Add tests for the two new functions. | tester-a |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditorCanvas.tsx` | edit | Use `toDecorationSpriteStyle`/`toDecorationAriaLabel` and the new `TileDecorationEditorSprite` props; use the new shared reference-tile component instead of its private `WithReferenceGameBoardContext`. | implementer-b |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditorReferenceTile.tsx` | new | Extracted from `TileDecorationEditorCanvas.tsx`'s private `WithReferenceGameBoardContext`: wraps one `Island` in the lab `GameBoardProvider` + `IslandTileView`, unchanged behavior. | implementer-b |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditorModeTabsBar.tsx` | new | The two `Tabs`/`TabsTrigger`s (`Decorations`, `Default elements`). | implementer-b |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditorRailShell.tsx` | new | `<aside className={cn(styles.panel, styles.railPanel)}>` + `TileDecorationEditorModeTabsBar` + `children`. | implementer-b |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditorRail.tsx` | edit | Drop its own outer `<aside>` tag (now provided by the shell); content unchanged otherwise. | implementer-b |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditorDefaultElementsRail.tsx` | new | The 4-group/9-row single-select list. | implementer-b |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditorDefaultElementsCanvas.tsx` | new | Renders the active row's reference tile (via `TileDecorationEditorReferenceTile`) with the right `hideTestId` class, plus its sprites (generalized `TileDecorationEditorSprite`) or the crest badge. | implementer-b |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditorDefaultElementsInspector.tsx` | new | Per-row-kind fields: shared corner Size, per-slot Size, or the two crest fields; `NO_SELECTION_TEXT` reused; never renders a `Layer (z-index)` field. | implementer-b |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditorSaveRow.tsx` | new | Extracted Save button + status text + optional one-line warning paragraph. | implementer-b |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditorLayoutActions.tsx` | edit | Use `TileDecorationEditorSaveRow` instead of its own inline save-row markup; Add/Duplicate/Rename/Delete unchanged. | implementer-b |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditorDefaultElementsActions.tsx` | new | Renders only `TileDecorationEditorSaveRow` with the mode-specific warning text. | implementer-b |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.styles.ts` | edit | Add `hideOccupants`, `hideBoats`, `hideResources`, `hideSpecialContent` (static Tailwind arbitrary-attribute-selector classes), `crestBadge`/`crestBadgeLabel`, `groupHeader` (the one new token combination), `saveWarningText`. | implementer-b |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.tsx` | edit | Render `TileDecorationEditorRailShell`+conditional rail, conditional canvas, conditional inspector, by `mode`. | implementer-b |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.test.tsx` | edit | Add: tab switch, each row's sprite count + hide target, shared-size-resizes-all-4, drag-one-corner-doesn't-move-others, Save-row warning text presence/absence, no `Layer (z-index)` field. | tester-b |

## Contracts
```ts
// ---- src/modules/map/island-tile-slots.types.ts (additions only; every existing export unchanged) ----
export const ISLAND_TILE_SLOTS_PATH = 'src/modules/map/island-tile-slots.types.ts';

/** The editable subset of this file's own exports: every value the Default-elements editor
 *  mode can drag/nudge/resize. CORNER_TRANSFORMS is deliberately absent — it is derived per
 *  corner, never user-tuned. */
export interface IslandTileSlotsDraft {
  occupantCornerSlots: CornerPosition[]; // 4, same br/tr/tl/bl order as today
  boatCornerPositions: CornerPosition[]; // 4, same order
  occupantSize: number;
  boatSize: number;
  specialIslandTop: string; // e.g. '40%'
  specialIslandLeft: string;
  specialIslandSize: number;
  baseCrestSize: number;
  baseCrestMinPx: number;
  singleResourceSlot: SlotDef;
  dualResourceSlots: SlotDef[];
  tripleResourceSlots: SlotDef[];
  quadResourceSlots: SlotDef[];
  baseResourceSlots: SlotDef[];
}

// ---- src/testbed/components/TileDecorationEditor/TileDecorationEditor.defaultElements.types.ts ----
import type { Island } from '@/lib/types';
import type { CornerId, IslandTileSlotsDraft } from '@/modules/map';

export type DefaultElementRowId =
  | 'knight' | 'boat' | 'crest' | 'base-resources' | 'special-art'
  | 'resource-1' | 'resource-2' | 'resource-3' | 'resource-4';

export type DefaultElementKind = 'corner' | 'resourceSlots' | 'specialArt' | 'crest';

export type DefaultElementHideTestId = 'tile-occupants' | 'tile-boats' | 'tile-resources' | 'special-content' | null;

/** Static per-row metadata. DEFAULT_ELEMENT_ROWS (defaultElements.map.ts) is the one array of
 *  these 9, in rail display order, grouped by groupLabel. */
export interface DefaultElementRowMeta {
  id: DefaultElementRowId;
  groupLabel: string;    // 'Occupants & boats' | 'Base island' | 'Special island' | 'Resource island'
  rowLabel: string;      // e.g. 'Knight (all corners)', exact copy from ui-design.md
  kind: DefaultElementKind;
  referenceIsland: Island;
  hideTestId: DefaultElementHideTestId; // null only for 'crest' (stays visible, see plan Decisions)
}

/** Always exactly two of these four keys set, same convention as CornerPosition['style'] and SlotDef. */
export type AnchoredStyle = Partial<Record<'top' | 'bottom' | 'left' | 'right', string>>;

/** One draggable/resizable sprite on the canvas. Absent (empty array) for the 'crest' row. */
export interface DefaultElementSlotViewModel {
  id: string;          // CornerId for corner rows; `node-${index}` for resourceSlots; 'special' for specialArt
  image: string;
  ariaLabel: string;    // e.g. 'Knight, bottom-right corner' / 'Resource node 2 of 3' / 'Special island art'
  style: AnchoredStyle;
  transform: string;    // CORNER_TRANSFORMS[cornerId] for boat; '' for knight; SPRITE_CENTER_TRANSFORM for the rest
  size: number;         // % of tile; shared (ignored per-slot) for corner rows, per-slot otherwise
}

export interface SaveDefaultElementsRequestBody {
  draft: IslandTileSlotsDraft;
}

// ---- TileDecorationEditor.defaultElements.map.ts ----
export const DEFAULT_ELEMENT_ROWS: DefaultElementRowMeta[]; // the 9-row table from ui-design.md, built from
  // toReferenceIsland('empty-2') [knight, boat], toReferenceIsland('special') [special-art],
  // toReferenceIsland('resource-1'..'resource-4'), and the new baseIslandWithResources [crest, base-resources]

export function toIslandTileSlotsDraft(): IslandTileSlotsDraft; // deep-clones the real exported constants (no shared references with the static module)

export function toSlotsForRow(row: DefaultElementRowMeta, draft: IslandTileSlotsDraft): DefaultElementSlotViewModel[];
// corner: zips OCCUPANT_CORNER_SLOTS/BOAT_CORNER_POSITIONS order with each corner's image
//   (knight: PLAYER_DATA[player.color].sprite.idle, looked up via row.referenceIsland.occupants + a fixed
//   players list; boat: COLLECTOR_IDLE_SPRITES[player.color])
// resourceSlots: image from toTileResourcesViewModel(row.referenceIsland, row.id === 'base-resources', [], {})
//   (.spriteSrc only, by index), position/size from the matching draft array/object by the same index
// specialArt: one slot, image = SPECIAL_ISLAND_IDLE_SPRITE, position from draft.specialIslandTop/Left, size from draft.specialIslandSize
// crest: []

export function toAnchoredStyleFromPointer(
  previousStyle: AnchoredStyle,
  pointerTopPercent: number,
  pointerLeftPercent: number,
  clamp: (value: number) => number, // every caller passes clampAnchoredOffsetPercent — one shared range for every row kind
): AnchoredStyle;
// For each key present in previousStyle: top -> clamp(pointerTopPercent); bottom -> clamp(100 - pointerTopPercent);
// left -> clamp(pointerLeftPercent); right -> clamp(100 - pointerLeftPercent). Only present keys are touched/returned.

export function nudgeAnchoredStyle(
  previousStyle: AnchoredStyle,
  dTop: number,
  dLeft: number,
  clamp: (value: number) => number, // every caller passes clampAnchoredOffsetPercent
): AnchoredStyle;
// top += dTop; bottom -= dTop; left += dLeft; right -= dLeft (each clamped), same "only present keys" rule.

export const ANCHORED_OFFSET_MIN = -50;
export const ANCHORED_OFFSET_MAX = 100;
/** The one clamp used for every anchored-style edit (corner rows and center-point rows alike) —
 *  covers every known locked value, including the negative resource center-point BASE_RESOURCE_SLOTS[1].right
 *  (island-tile-slots.types.ts:120) and the negative occupant-corner offsets. */
export function clampAnchoredOffsetPercent(value: number): number; // Math.min(100, Math.max(-50, value))

export function toAnchoredStyleReadout(style: AnchoredStyle): string;
// e.g. "Bottom -1%, right -5%" / "Top 50%, left 50%" — capitalized key, in whichever order the keys appear.

export function applyDragToDraft(
  row: DefaultElementRowMeta, slotId: string, topPercent: number, leftPercent: number, draft: IslandTileSlotsDraft,
): IslandTileSlotsDraft;
export function applyNudgeToDraft(
  row: DefaultElementRowMeta, slotId: string, dTop: number, dLeft: number, draft: IslandTileSlotsDraft,
): IslandTileSlotsDraft;
export function applySharedCornerSizeToDraft(rowId: 'knight' | 'boat', size: number, draft: IslandTileSlotsDraft): IslandTileSlotsDraft;
export function applySlotSizeToDraft(row: DefaultElementRowMeta, slotId: string, size: number, draft: IslandTileSlotsDraft): IslandTileSlotsDraft;
export function applyCrestFieldToDraft(field: 'size' | 'minPx', value: number, draft: IslandTileSlotsDraft): IslandTileSlotsDraft;

export const CORNER_LABELS: Record<CornerId, string>; // br: 'bottom-right', tr: 'top-right', tl: 'top-left', bl: 'bottom-left'

// ---- TileDecorationEditor.map.ts (additions) ----
export function toDecorationSpriteStyle(instance: DecorationInstance): CSSProperties; // today's inline style, moved here
export function toDecorationAriaLabel(instance: DecorationInstance, index: number, count: number): string;

// ---- TileDecorationEditor.defaultElements.hook.ts ----
export interface DefaultElementsEditorState {
  draft: IslandTileSlotsDraft;
  activeRowId: DefaultElementRowId;
  activeRow: DefaultElementRowMeta;
  slots: DefaultElementSlotViewModel[];       // for activeRow
  selectedSlotId: string | null;
  isDirty: boolean;
  status: EditorStatus;
  onSelectRow: (rowId: DefaultElementRowId) => void;   // resets selectedSlotId to null
  onSelectSlot: (slotId: string | null) => void;
  onDragSlot: (slotId: string, topPercent: number, leftPercent: number) => void;
  onNudgeSlot: (slotId: string, dTop: number, dLeft: number) => void;
  onResizeSharedCornerSize: (size: number) => void;    // knight/boat rows only
  onResizeSlot: (slotId: string, size: number) => void; // resourceSlots/specialArt rows only
  onResizeCrest: (field: 'size' | 'minPx', value: number) => void;
  onSave: () => void;
}
export function useDefaultElementsEditor(): DefaultElementsEditorState;

// ---- TileDecorationEditor.types.ts (additions to TileDecorationEditorViewModel) ----
export type EditorMode = 'decorations' | 'default-elements';
// add to TileDecorationEditorViewModel:
//   mode: EditorMode;
//   onModeChange: (mode: EditorMode) => void;
//   defaultElements: DefaultElementsEditorState; // the whole sub-state nested, not flattened

// ---- TileDecorationEditorSprite.tsx (new props shape) ----
export interface TileDecorationEditorSpriteProps {
  image: string;
  ariaLabel: string;
  style: CSSProperties;         // fully computed by the caller: position keys + width/height + transform + zIndex if any
  isSelected: boolean;
  onSelect: () => void;
  onDrag: (topPercent: number, leftPercent: number) => void;
  onNudge: (dTop: number, dLeft: number) => void;
}
// data-testid stays "tile-decoration-editor-sprite" on every usage, for existing/new tests and e2e.

// ---- src/app/api/tile-decoration-editor/default-elements/regenerate-source.ts ----
export function regenerateIslandTileSlotsSource(currentSource: string, draft: IslandTileSlotsDraft): string;
// Algorithm (byte-preservation is the hard requirement):
// 1. For OCCUPANT_CORNER_SLOTS and BOAT_CORNER_POSITIONS: extract each export's own array block by name
//    first (so the two arrays' identical-looking per-corner lines can never cross-match each other).
//    Within a block, for each of the 4 ids, replace only the value after each key that is already present
//    (preserve key order as written; never add/remove a key).
// 2. For SINGLE_RESOURCE_SLOT (single object) and DUAL/TRIPLE/QUAD/BASE_RESOURCE_SLOTS (arrays, by index,
//    not by id): same scoped, key-order-preserving value substitution, including the numeric `size`.
// 3. For OCCUPANT_SIZE, BOAT_SIZE, SPECIAL_ISLAND_SIZE, BASE_CREST_SIZE, BASE_CREST_MIN_PX: replace the
//    number between `= ` and `;` on that export's own line only.
// 4. For SPECIAL_ISLAND_TOP, SPECIAL_ISLAND_LEFT: replace the quoted string the same way.
// 5. Every other line (every comment, every other export, blank lines, import block) passes through unchanged.

// ---- src/app/api/tile-decoration-editor/default-elements/route.ts ----
// POST only. process.env.NODE_ENV === 'production' -> 404 (mirrors layouts/route.ts).
// Body: { draft?: unknown } -> isCompleteIslandTileSlotsDraft(draft) guard -> 400 on failure.
// Reads ISLAND_TILE_SLOTS_PATH via readFile, calls regenerateIslandTileSlotsSource, writeFile, 200 { ok: true }.
```

## Phases
### Phase 1: Data layer — draft type, pure transforms, save route, regression test, test-hook attributes
1. Add `ISLAND_TILE_SLOTS_PATH` and `IslandTileSlotsDraft` to `island-tile-slots.types.ts`; re-export everything this plan's Contracts list from `src/modules/map/index.ts`, plus `COLLECTOR_IDLE_SPRITES` and `SPECIAL_ISLAND_IDLE_SPRITE` (implementer-a).
2. Export `SPECIAL_ISLAND_IDLE_SPRITE` from `IslandTile.tsx` and its `index.ts`; add `data-testid="base-crest"`/`"special-content"` to `IslandTile.tsx`; add `data-testid="tile-occupants"` to `TileOccupants.tsx` (implementer-b).
3. New `src/modules/map/tile-layer-z-index.test.ts` (tester-a) — run and confirm green against current code before moving on.
4. Add `baseIslandWithResources` to `TileDecorationEditor.display.map.ts` (implementer-a).
5. New `TileDecorationEditor.defaultElements.types.ts` and `TileDecorationEditor.defaultElements.map.ts` (implementer-a), with `TileDecorationEditor.defaultElements.map.test.ts` (tester-a) covering: `toIslandTileSlotsDraft` deep-clones (mutating the result never touches the real constants); `toSlotsForRow` per kind (corner order/images, resource image-by-index, special, crest `[]`); `toAnchoredStyleFromPointer`/`nudgeAnchoredStyle` for every key-pair combination that appears in the real tables; `applySlotSizeToDraft`/`applySharedCornerSizeToDraft`/`applyCrestFieldToDraft` immutability (return a new object, never mutate `draft`).
6. New `src/app/api/tile-decoration-editor/default-elements/regenerate-source.ts` + test (implementer-a, tester-a). The round-trip test is the safety net for the locked-values memory: build a draft from the real file's current exports, regenerate, and `expect(output).toBe(fs.readFileSync(realPath, 'utf-8'))`.
7. New `route.ts` + `route.test.ts` (implementer-a, tester-a), and `saveDefaultElements` added to `TileDecorationEditor.service.ts` (implementer-a).
8. Checks: `npm run typecheck`, `npm run lint`, `npx jest src/modules/map/tile-layer-z-index.test.ts src/testbed/components/TileDecorationEditor src/app/api/tile-decoration-editor/default-elements`.
9. Commit, stop, ask the user to type `continue`.

Model escalation: none — triage already overrides every implementer/tester/preview agent on this task to sonnet.

### Phase 2: UI layer — mode tabs, default-elements rail/canvas/inspector, sprite generalization, wiring
1. Generalize `TileDecorationEditorSprite.tsx` to the new props shape; add `toDecorationSpriteStyle`/`toDecorationAriaLabel` to `TileDecorationEditor.map.ts` (+ tests, tester-a); update `TileDecorationEditorCanvas.tsx` to use both (implementer-a for the map functions, implementer-b for the sprite/canvas `.tsx` changes — land together since the prop contract between them must match on first compile).
2. New `TileDecorationEditorReferenceTile.tsx`, extracted from `TileDecorationEditorCanvas.tsx`'s private helper; update `TileDecorationEditorCanvas.tsx` to use it (implementer-b).
3. New `TileDecorationEditor.defaultElements.hook.ts` + hook test (implementer-a, tester-a); wire into `TileDecorationEditor.hook.ts` (mode state + composition) and `TileDecorationEditor.types.ts` (viewModel fields) (implementer-a).
4. New `TileDecorationEditorSaveRow.tsx`; edit `TileDecorationEditorLayoutActions.tsx` to use it; new `TileDecorationEditorDefaultElementsActions.tsx` (implementer-b).
5. New `TileDecorationEditorModeTabsBar.tsx`, `TileDecorationEditorRailShell.tsx`; edit `TileDecorationEditorRail.tsx` (drop outer `<aside>`); new `TileDecorationEditorDefaultElementsRail.tsx` (implementer-b).
6. New `TileDecorationEditorDefaultElementsCanvas.tsx`, `TileDecorationEditorDefaultElementsInspector.tsx`; add the new static classes to `TileDecorationEditor.styles.ts` (implementer-b).
7. Edit `TileDecorationEditor.tsx` to wire `mode` through the shell/rail/canvas/inspector (implementer-b).
8. Update `TileDecorationEditor.test.tsx` per the File plan's test list (tester-b).
9. ui-verify in a real browser (not just RTL): click through both tabs, every one of the 9 rows, drag a knight corner and confirm the other 3 don't move, change the shared Size field and confirm all 4 resize, select Player crest and confirm no sprite/no Layer field, toggle Save in both modes and confirm the warning line only shows in Default elements (preview-a — the existing single "Editor" preview state already drives the real connected component per lessons-learned, so no new preview file is needed, only manual verification through it).
10. docs-sync: add one sentence to `docs/architecture/systems-and-visuals.md`'s "Shared Slot Table" section noting the testbed editor can now tune these values directly, with no change to any documented default or rule (docs-sync agent).
11. Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
12. Commit, stop, ask the user to type `continue` (end of task — no Phase 3).

Model escalation: none.

## Test plan
- tester-a (logic, first):
  - `tile-layer-z-index.test.ts`: the 3 inequalities, plus a guard that each extracted number is read from the real `styles` export (not hand-copied) so a future class-string change fails this test, not silently drifts.
  - `TileDecorationEditor.defaultElements.map.test.ts`: every function in the Contracts block; specifically `toAnchoredStyleFromPointer`/`nudgeAnchoredStyle` against each of the 4 real key-pairs (`{bottom,right}`, `{top,right}`, `{top,left}`, `{bottom,left}`) and against a `{top,left}` resource slot; dragging one corner never touches the other 3 entries in the array (`applyDragToDraft`). **Required case**: `BASE_RESOURCE_SLOTS[1] = { top: '45%', right: '-17%', size: 30 }` (`island-tile-slots.types.ts:120`) — `nudgeAnchoredStyle(slot.style, 0, 1, clampAnchoredOffsetPercent)` (one `ArrowRight` nudge) must return `right: '-18%'`, not `'0%'`, proving the shared `[-50,100]` clamp doesn't snap a real negative locked value to 0 on first touch; also assert `clampAnchoredOffsetPercent(-17)` is a no-op (`-17` is within `[-50,100]`).
  - `TileDecorationEditor.defaultElements.hook.test.ts`: switching `activeRowId` clears `selectedSlotId`; `onSave` sets `status: 'saving'` then `'saved'`/`'error'`; an edit made while a save is in flight keeps `isDirty: true` after it resolves (mirrors the existing decorations-mode `onSave` behavior at `TileDecorationEditor.hook.ts:122-137`).
  - `regenerate-source.test.ts`: unchanged-draft round trip is byte-identical to the real file; changing exactly one value (e.g. `OCCUPANT_SIZE`) changes exactly that line; changing one corner's `bottom` leaves every other corner's lines, and `BOAT_CORNER_POSITIONS`'s identically-shaped `br`/`tr`/`tl`/`bl` lines, untouched.
  - `route.test.ts`: production → 404; malformed body → 400; happy path writes the file and returns 200.
  - `TileDecorationEditor.map.test.ts` additions: `toDecorationSpriteStyle`/`toDecorationAriaLabel` against the existing sample fixtures.
- tester-b (view and e2e):
  - `TileDecorationEditor.test.tsx`: tab switching renders the right rail/canvas/inspector; each of the 9 rows renders its documented sprite count and the right real layer is hidden (query by the new `data-testid`s); changing the shared Size field while any one knight corner is selected resizes all 4 (assert each sprite's rendered `style.width`); dragging one corner sprite leaves the other 3's rendered style unchanged; Player crest row renders 0 sprites, the badge, and exactly 2 inspector fields; the Save-row warning text is present only in Default-elements mode; no `Layer (z-index)` label exists anywhere in that mode's DOM.
  - No e2e spec: this is a dev-only testbed tool (`/testbed`), not a user-facing game flow, so it is out of `e2e/`'s scope per the existing pattern (no `.spec.ts` references `TileDecorationEditor` today).

## Preview states
- No new preview file: `tileDecorationEditorPreview`'s single `Editor` state already renders the real connected `<TileDecorationEditor />` (`TileDecorationEditor.preview.tsx:9`), so both modes are reachable and interactive through the existing testbed route (`/testbed`, "Dev tools" group, "Tile Decoration Editor"). preview-a's job this task is ui-verify against that one existing state, not adding a new one.

## Risks
- Regex-based source regeneration could silently corrupt `island-tile-slots.types.ts` if a substitution's scoping is wrong — mitigated by the byte-identical round-trip test (Phase 1, step 6) and by never touching the file in Phase 1 integration testing without that test green first.
- The shared `[-50, 100]` anchored-offset clamp is a new decision, not specified numerically in ui-design.md — if a future hand-tuned value falls outside it, it only limits the editor's drag/nudge range, never a stored value (an existing value outside that range still renders correctly on load; only further *dragging* it would be bounded). Flag to the user if real-world tuning needs a wider range.
- `COLLECTOR_IDLE_SPRITES`/`PLAYER_DATA` corrections to ui-design.md's Canvas section (Decisions above) change the Contracts' data source but not the described visual result — architect-b should confirm this reading of ui-design.md during final review, since it is a correction to an approved spec, not a deviation from it.

## Review (architect-b)
VERDICT: APPROVED

### Follow-up pass confirming the clamp fix (this session)
architect-a's revision (line 50, 200-205, 318, 332) replaces the two-range split with one shared `clampAnchoredOffsetPercent`, range `[-50, 100]`, used by every caller of `toAnchoredStyleFromPointer`/`nudgeAnchoredStyle` regardless of row kind. Re-checked against every real locked value in `island-tile-slots.types.ts` (re-read in full this session): minimum is `-20` (`OCCUPANT_CORNER_SLOTS['tr'/'tl'].top`), next is `-17` (`BASE_RESOURCE_SLOTS[1].right`, line 120); maximum is `80` (`QUAD_RESOURCE_SLOTS[3].left`), next `75` (`TRIPLE_RESOURCE_SLOTS[1].left`). `[-50, 100]` covers all of these with margin on both ends — correct and sufficient, and simpler than the rejected two-range design (one constant, no per-kind branch to get wrong). The new test case (Test plan, tester-a bullet) asserts `nudgeAnchoredStyle` on `BASE_RESOURCE_SLOTS[1]` with one `ArrowRight` nudge returns `right: '-18%'` (not `'0%'`) and that `clampAnchoredOffsetPercent(-17)` is a no-op — this is exactly the regression check the prior finding needed. No other part of the plan changed in this revision; my prior pass already confirmed the ui-design.md corrections (Confirmed correct #1) and the Phase 1/Phase 2 split (Confirmed correct #2), which still stand.

Original full review preserved below.

### Original pass
Re-verified independently this session (not trusting the prior self-written review) against: `island-tile-slots.types.ts` (full file), `TileOccupants.hook.ts`, `TileBoats.map.ts`, `IslandTile.fixtures.slot-tuning.ts`, `IslandTile.fixtures.ts`, `player-data.ts`, `TileDecorations.styles.ts`, `IslandTile.styles.ts`, `TileBoats.styles.ts`, `TileOccupants.styles.ts`, `TileResources.styles.ts`, `IslandTile.tsx`, `TileOccupants.tsx`, `TileBoats.tsx`, `TileResources.tsx`, `TileDecorationEditorSprite.tsx`, `TileDecorationEditorInspector.tsx`, `TileDecorationEditorLayoutActions.tsx`, `src/modules/map/index.ts`, `decoration-layouts.types.ts`, `layouts/route.ts`, `eslint.config.mjs`, and the full `TileDecorationEditor/` directory listing.

### Confirmed correct
1. **Both ui-design.md corrections are real and the plan's fix is right.** `cornerOccupants4` entries are `{playerId, armyId}` only (`buildCornerOccupants4`, `IslandTile.fixtures.slot-tuning.ts:9-15`, confirmed exported as `cornerOccupants4` from `IslandTile.fixtures.ts:121` with the same shape) — no `.sprite` field exists anywhere on it. `PLAYER_DATA[color].sprite.idle` is real (`src/modules/game-rules/player-data.ts:22,31,40,49`, used identically today at `TileOccupants.hook.ts:56,68`: `const sprite = PLAYER_DATA[player.color]?.sprite; … sprite?.idle`). `COLLECTOR_IDLE_SPRITES[color]` is real and exported (`TileBoats.map.ts:6-11`, re-exported `TileBoats/index.ts`). Approve this correction as written.
2. **Phase split is sound.** Phase 1 (data/logic/save-route, ~10 files) is fully testable in isolation (typecheck/lint/unit tests, no UI dependency) before Phase 2 builds the UI on top of a verified contract. Sizes are comparable and match triage's "2 phases" sizing for a tier-L task. The one same-file landing implementer-a/implementer-b share in Phase 2 step 1 (`TileDecorationEditorSprite.tsx` + `TileDecorationEditor.map.ts`) is called out explicitly as intentional, not an oversight.
3. Every path, line number and symbol I spot-checked in Verified context and the File plan is real and matches: `TileDecorations.styles.ts:2` (`z-[12]`), `IslandTile.styles.ts:59` (`centerContent` `z-20`), `TileBoats.styles.ts:4` (`z-[25]`), `TileOccupants.styles.ts:4` (`z-30`); `IslandTile.tsx:27,57,76`; `TileOccupants.tsx:10`; `TileBoats.tsx:21`, `TileResources.tsx:34` (existing testid convention); `TileDecorationEditorInspector.tsx`'s `SelectedInstanceFields` (Size, Layer (z-index), readout, Remove — exactly as described); `TileDecorationEditorLayoutActions.tsx`'s `saveRow` block; `src/modules/map/index.ts`'s barrel (today missing every `island-tile-slots.types` export, confirming the File plan's edit is needed); `DECORATION_LAYOUTS_CONFIG_PATH` naming precedent (`decoration-layouts.types.ts:60`) matches the proposed `ISLAND_TILE_SLOTS_PATH`; `layouts/route.ts`'s deep-import-not-barrel pattern confirmed. No invented path found.

### Finding (blocking) — the [0,100] clamp for "resource/special center points" is wrong for a real locked value
The plan's one stated clamp decision (line 50) only covers corner rows: `[-50, 50]` instead of `clampPercent`'s `[0, 100]`, "because today's hand-tuned occupant offsets are already negative." The Verified-context row for `clampPercent` and the Contracts' `toAnchoredStyleFromPointer`/`nudgeAnchoredStyle` signatures imply the *other* three kinds (`resourceSlots`, `specialArt`) reuse `clampPercent`'s `[0,100]` unmodified (the plan never states a third range, and `SINGLE/DUAL/TRIPLE/QUAD_RESOURCE_SLOTS` are all `top`/`left`-only and non-negative, consistent with that assumption).

That assumption breaks on a real locked value the resourceSlots kind must edit: `BASE_RESOURCE_SLOTS[1] = { top: '45%', right: '-17%', size: 30 }` (`island-tile-slots.types.ts:120`) — the "Resource slots (base)" row (ui-design.md's own table, line 27). This is the exact same bug class the plan already caught and fixed for `OCCUPANT_CORNER_SLOTS` (line 50), just missed one table over. Under the Contracts' formula (`right -> clamp(100 - pointerLeftPercent)`, pointer value itself always in `[0,100]`), a `[0,100]` clamp makes `right: '-17%'` both undraggable (the achievable range for `right` is `[0,100]`, never negative) and destructive on first touch: `nudgeAnchoredStyle`'s `right -= dLeft` starting from `-17` and clamped to `[0,100]` snaps straight to `0` on the very first nudge — a 17-point jump the user didn't ask for, the first time they touch this element's slot 1.

Fix: the clamp range for `resourceSlots`/`specialArt` anchored-style edits needs to accommodate this value — either a third named range (e.g. `[-50, 100]`, which covers every known locked value: occupant corners down to `-20`, `BASE_RESOURCE_SLOTS[1].right` at `-17`, and every positive center point up to `80`), or collapse to one shared range used for all four kinds so there is only one constant to reason about (simpler, and nothing in ui-design.md or the real data requires two different ranges — the two-range split was this plan's own invention, not a spec requirement). Either way, add a test case in `TileDecorationEditor.defaultElements.map.test.ts` (already planned, Phase 1 step 5) specifically for `BASE_RESOURCE_SLOTS[1]`'s `right` key, per the test plan's own stated intent to cover "a `{top,right}` one (`BASE_RESOURCE_SLOTS[1]`)" — that line already names the right test, it just needs the clamp decision fixed first so the test can pass with the real value reachable.

### Non-blocking notes
- ui-design.md's row table cites `TileOccupants.tsx:9` for the missing `tile-occupants` testid; the real line (confirmed) is 10, and plan.md's own File plan row (line 69) already has it right at line 10. No action — plan.md is the contract, not ui-design.md, and plan.md is correct.
- Verified-context row 38 cites `IslandTile.fixtures.slot-tuning.ts:8-15` for `cornerOccupants4`'s shape; that range is actually `buildCornerOccupants4`'s function body (which produces the real exported `cornerOccupants4`, confirmed same shape), not a local binding named `cornerOccupants4` in that file (there is an unrelated same-named local at `slot-tuning.ts:59`, used only inside that file for other fixtures). The data-shape claim is correct; the citation points at the right logic under a slightly imprecise description. Not worth a plan edit.

### Verdict
Everything else — Verified context, Decisions, File plan, Contracts, phase split, test plan, preview plan — checks out against the real code. Fix the clamp-range gap above (one line in the Decisions section plus the contract comment for `toAnchoredStyleFromPointer`/`nudgeAnchoredStyle`'s clamp parameter), then this is approvable without another full pass.
