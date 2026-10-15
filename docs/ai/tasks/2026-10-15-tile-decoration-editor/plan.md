# Plan: Drag-and-drop tile-decoration editor (replaces TileForest)

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec)

## Goal and acceptance criteria
All ten acceptance criteria in ui-design.md's Final spec, plus:
- [ ] `TileForest` (component, slot tables, preview, tests) is fully removed; `IslandTile.tsx` renders `TileDecorations` instead, reading layouts from the one new config file.
- [ ] Decorations render (possibly zero instances) on Resource and Monster islands; the suppression in the old `toForestLayout` is gone.
- [ ] `BASE_FOREST_SLOTS`, `SPECIAL_FOREST_SLOT`, `EMPTY_GROVE_SLOTS` are removed from `island-tile-slots.types.ts`; their numbers are preserved (converted to the new instance shape by documented, checkable arithmetic, not re-eyeballed) as the "Default" layout of their scenario in the new config file.
- [ ] `/testbed/tile-decoration-editor?state=Editor` drives the whole flow against the real dev API routes (checked with `ui-verify`, dev server only — this tool is out of scope for `test:e2e`, which runs a production build where the testbed is normally disabled, see Decisions).
- [ ] `npm run typecheck`, `npm run lint`, `npm test` pass after every phase.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `BASE_FOREST_SLOTS`, `SPECIAL_FOREST_SLOT`, `EMPTY_GROVE_SLOTS`, `TreeSlot` | `src/modules/map/island-tile-slots.types.ts:124-173` | The locked values being migrated; numbers reproduced below, not re-derived by a builder. |
| `toForestLayout` | `src/modules/map/components/TileForest/TileForest.map.ts:11-39` | Current selection/suppression logic being replaced. |
| `TileForest`, `.styles.ts`, `.types.ts`, `.fixtures.ts`, `.preview.tsx`, `index.ts`, `.test.tsx`, `.map.test.ts` | `src/modules/map/components/TileForest/*` | Every file to delete. |
| `TileForest` import/usage | `src/modules/map/components/IslandTile/IslandTile.tsx:10,127` | Only production wiring point; swap for `TileDecorations`. |
| `tileForestPreview` import/usage | `src/testbed/registry.ts:5,55` | Swap for the new production preview. |
| Forest describe block | `src/modules/map/island-tile-slots.test.ts:109-151` | Pinned tests for the tables being removed; delete this block, nothing else in the file. |
| `getSlot`'s node-count fallback (`total >= 4` → `QUAD_RESOURCE_SLOTS`) | `src/modules/map/components/TileResources/TileResources.map.ts:73-89` | Precedent for clamping a Resource island's node total to 1-4 for the new `resource-N` scenario key; `expandedNodes.length` (line 128) is the real "total" the game already uses. |
| `island.resources: IslandResource[]`, `island.monsters?: Monster[]` | `src/lib/types/map.ts:19-34` | Fields the new `toScenarioKey` reads: resource amounts sum, monster alive/cleared. |
| Center-point migration formula ("top' = top + size/2, etc.") | `src/modules/map/island-tile-slots.types.ts:54-61` | Precedent this plan reuses to convert every `TreeSlot` (top-left-corner anchored) into the new center-anchored `DecorationInstance`. |
| `SlotDef`/resource slots already centered with `transform: translate(-50%, -50%)` | `src/modules/map/components/TileResources/TileResources.tsx` (via `island-tile-slots.types.ts:54-61`) | Precedent for the new instance's render convention (see Decisions). |
| `IslandTileSlotLab`, `WithLabGameBoardContext`, `localPlayerFixture`, `cornerOccupants4`, `labGameStateFixture` | `src/modules/map/components/IslandTile/IslandTile.preview.slot-lab.tsx:36-57`, `IslandTile.fixtures.ts:20,121,156` | Reused by the editor's canvas for a realistic tile with occupants/resources/boats as alignment reference. |
| `TestbedShell`, `.styles.ts` (`flex flex-col md:h-screen md:flex-row`, `flex-1 md:overflow-y-auto`) | `src/testbed/components/TestbedShell/TestbedShell.tsx:1-16`, `.styles.ts:1-4` | Outer shell; mobile stacking already built in. |
| `ComponentPreview`, `findPreview` | `src/testbed/testbed.types.ts:10-17`, `src/testbed/registry.ts:99-101` | Shape every preview (including the new ones) must match. |
| `PreviewStage` state routing (`?state=`) | `src/testbed/components/PreviewStage/PreviewStage.tsx:13-33` | Confirms the editor must register as a single named state "Editor" (ui-design fix 1), not the bare slug. |
| `isTestbedEnabled()` | `src/testbed/testbed.config.ts:1-8` | Gates the testbed UI (`NODE_ENV !== 'production' \|\| NEXT_PUBLIC_ENABLE_TESTBED === 'true'`). The two new API routes must NOT reuse this — see Decisions. |
| `useIsMobile` | `src/modules/shared/index.ts:4` | Mobile stacking hook for the editor's `.tsx`. |
| `resolveJsonModule: true` | `tsconfig.json:12` | The new config file can be a plain `.json`, statically imported by both game code and the editor. |
| `find src/app/api` → empty | checked this session | No existing API-route pattern to follow; routes below are new infrastructure. |
| `public/sprites/decorations/` does not exist; `public/sprites/{pine_tree,spring_tree,autmn_tree,tree}.gif` do | checked this session | The image-discovery folder must be created and seeded; originals must NOT be deleted (`RESOURCE_SPRITES[Wood].sprite = '/sprites/tree.gif'`, `TileResources.map.ts:29`, still points at the un-prefixed path). |
| `feedback_island_tile_slots_locked.md` (user memory) | `~/.claude/projects/-Users-clunetta-Documents-Games-Corner-Conquest/memory/` | Forbids editing these tables without an explicit ask; triage records that ask. The memory file itself is user-owned — not edited by any agent here (see Decisions). |
| `docs/architecture/systems-and-visuals.md:109-118` | forest/suppression section to rewrite | docs-sync target. |
| `docs/README.md` | Re-read this session: 33 lines total (`wc -l` → 33), a pure index/table of contents, zero mentions of "forest"/"tree"/"decoration" anywhere. The earlier citation of lines 43-44/424-459 was wrong — that content is in a stale, orphaned `src/docs/README.md` (49KB, not linked from anywhere, not part of the docs/README.md → docs/architecture/*.md chain). `docs/README.md` is not a docs-sync target for this task. |

## Decisions
- **New `DecorationInstance` uses a center point (`top`/`left` = sprite's own center, numeric % of tile side), not the old `TreeSlot`'s top-left-corner/any-two-edges anchoring**, because (a) the codebase already documents and uses center-anchoring as the correct convention for a scaled sprite (`island-tile-slots.types.ts:54-61`, applied via `translate(-50%, -50%)` in `TileResources.tsx`), and (b) a drag/arrow-nudge tool needs one pair of numbers per instance, clampable to a single `0-100` box on each axis — a 4-key "any two of top/bottom/left/right" shape can't be dragged with one clamp rule. Rejected: keep `TreeSlot`'s shape as-is (simpler migration, but `EMPTY_GROVE_SLOTS` mixes top/left, top/right and bottom/left anchors in the same table, which the drag/clamp model can't represent uniformly).
- **Migration converts every old slot to its center point using the file's own precedent formula** (`center = edge + size/2`, mirrored from the right/bottom edge as `100 - edge - size/2` when the old entry was right- or bottom-anchored), and converts the 4 px-based entries in `SPECIAL_FOREST_SLOT` to percent of the tile's 360px reference canvas (`px / 360 * 100`, rounded to 1 decimal, same rounding helper style as `TileResources.map.ts:40-42`) before adding `size/2`. All arithmetic is done below, in Contracts, so no builder re-derives these numbers.
- **User confirmed (revise-mode instruction): migrated instances keep today's 4-sprite variety.** Each migrated layout's instances cycle through the 4 existing tree images by instance index within that layout — `MIGRATED_TREE_IMAGES = ['/sprites/decorations/pine_tree.gif', '/sprites/decorations/spring_tree.gif', '/sprites/decorations/autmn_tree.gif', '/sprites/decorations/tree.gif']`, `image = MIGRATED_TREE_IMAGES[index % 4]` (index 0-based within the layout's own instance list, restarting at 0 for each migrated layout). This doesn't reproduce the OLD per-island seed-driven single-sprite choice exactly (the old model picked one sprite for a whole island; this picks per-instance-within-a-layout), but it keeps visible variety in the migrated art instead of collapsing to one image, and is deterministic and auditable. Superseded: the earlier draft's "same single image for every instance" decision, which the user rejected.
- **Image folder seeded with all 4 existing tree images** (`pine_tree.gif`, `spring_tree.gif`, `autmn_tree.gif`, `tree.gif`, copied — not moved — from `public/sprites/` into `public/sprites/decorations/`), so the image picker and the "Image grid empty" state aren't both trivially true on first run, and a developer can restore per-island variety by hand immediately.
- **One flat 10-member string union `DecorationScenarioKey`** (`'base' | 'special' | 'empty-2' | 'empty-3' | 'resource-1'..'resource-4' | 'monster-alive' | 'monster-cleared'`) is the single key both the config file and the editor's scenario+variant selection use, because ui-design's Final spec already settled on exactly these 10 combinations (2+2+4+2) — a nested `{scenario, variant}` object would need a second normalization step for no benefit. Rejected: nested object key (more "structured" but the editor's two `<Select>`s and the config's `Record` keys would need a join/split function either way; the flat union needs it in one place: `DECORATION_SCENARIO_KEYS`/`toScenarioKey`).
- **The whole config file is loaded into the editor's memory once (static `.json` import) and Save POSTs the entire edited config back**, not a per-layout PATCH, because it's one file, this is a single-developer dev tool with no concurrent-write risk, and a whole-file overwrite needs no server-side merge logic. Rejected: partial/merge PATCH (more correct for multi-user editing, which this tool will never have).
- **The two new API routes gate on `process.env.NODE_ENV === 'production'` directly (404 otherwise), not on `isTestbedEnabled()`**, because `isTestbedEnabled()` also returns `true` in a production build when `NEXT_PUBLIC_ENABLE_TESTBED=true` (for QA to view testbed UI in prod) — but writing to the server's filesystem must never be possible in any deployed build, regardless of that flag.
- **No Playwright e2e spec for the editor.** `test:e2e` builds and serves a production build (`playwright.config.ts`, `webServer`) without `NEXT_PUBLIC_ENABLE_TESTBED` set, so `/testbed/*` 404s there already (confirmed: no existing spec touches `/testbed`). Coverage is `tester-b`'s RTL view test (pointer/keyboard event simulation, service mocked) plus `ui-verify` screenshots against `npm run dev`, matching "Definition of done"'s "new or changed components have a testbed preview, checked with skill ui-verify" — no new tooling is invented to work around a dev-only route.
- **`monster-cleared` migrates real decorations, not an empty layout.** Re-read `TileForest.map.ts:12-18` directly: suppression triggers only for `IslandType.Resource` or for Monster **with `monsters.length > 0`** (alive) — a cleared Monster island (`monsters.length === 0`/`undefined`) falls through past that check into the exact same final branch as an Empty island (the code's own comment: `// Empty or Cleared Island: Natural lush tree grove`), and today renders real `EMPTY_GROVE_SLOTS`-derived trees, seed-selected 2 vs 3 the same way Empty islands are. The earlier draft's "nothing to migrate" premise for `monster-cleared` (inherited from ui-design Review finding 5, which only checked the Resource+alive-Monster suppression condition) was wrong for this one combination. Fix: `monster-cleared`'s config entry gets **two** migrated layouts — `monster-cleared-default-2trees` ("Default (2 trees)") and `monster-cleared-default-3trees` ("Default (3 trees)") — built from the exact same `EMPTY_GROVE_SLOTS`-derived instances as `empty-2`/`empty-3` (data in Contracts). `toDecorationLayout`'s existing generic `layouts[seed % layouts.length]` selection (no code change) then reproduces today's exact seed-driven 2-vs-3 choice for cleared Monster islands, with zero special-casing. This is the one combination among the 10 where the migrated "Default" is not length-1 and not named plainly "Default" — ui-design.md's Copy line ("Resource and Monster variants' 'Default' layout starts with 0 instances") is therefore inaccurate for `monster-cleared` specifically; that's ui-design.md's own file to correct, not touched here, but tester-b/preview-a must build against this plan's corrected behavior, not that line.
- **The locked-values memory note is not edited by any agent in this task.** It's the user's own memory file outside the repo. docs-sync updates `docs/architecture/systems-and-visuals.md` (the real source of truth); the coordinator/user updates the memory pointer afterward.

## File plan
### Phase 1 — production: replace TileForest with TileDecorations
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/map/decoration-layouts.types.ts` | new | `DecorationInstance`, `DecorationLayout`, `DecorationScenarioKey`, `DecorationLayoutsConfig`, `DECORATION_SCENARIO_KEYS` (ordered 10-tuple), `DECORATION_LAYOUTS_CONFIG_PATH` (string constant, the file's repo-relative path, used by the Phase-2 save route) | implementer-a |
| `src/modules/map/decoration-layouts.config.json` | new | The one config file; migrated Base/Special/Empty-2/Empty-3/Monster-cleared layouts (exact data in Contracts) plus empty "Default" layouts for the 5 Resource/Monster-alive combinations | implementer-a |
| `src/modules/map/components/TileDecorations/TileDecorations.types.ts` | new | `TileDecorationsProps { island: Island; isBase?: boolean }` | implementer-a |
| `src/modules/map/components/TileDecorations/TileDecorations.map.ts` | new | `toScenarioKey`, `toDecorationLayout` (pure, seeded selection; signatures in Contracts) | implementer-a |
| `src/modules/map/components/TileDecorations/TileDecorations.fixtures.ts` | new | Sample islands (ported from `TileForest.fixtures.ts`) + a small sample `DecorationLayoutsConfig` for tests/previews | implementer-a |
| `src/modules/map/components/TileDecorations/index.ts` | new | Barrel: `TileDecorations`, `toDecorationLayout`, `toScenarioKey`, the types | implementer-a |
| `src/modules/map/index.ts` | edit | Re-export `DecorationScenarioKey`, `DecorationInstance`, `DecorationLayout`, `DecorationLayoutsConfig`, `DECORATION_SCENARIO_KEYS`, `DECORATION_LAYOUTS_CONFIG_PATH`, and the config object itself (`decorationLayoutsConfig`), so `src/testbed` and `src/app/api` never deep-import `src/modules/map/*` | implementer-a |
| `src/modules/map/island-tile-slots.types.ts` | edit | Delete `BASE_FOREST_SLOTS`, `SPECIAL_FOREST_SLOT`, `EMPTY_GROVE_SLOTS`, `TreeSlot` only; every other export byte-for-byte unchanged | implementer-a |
| `src/modules/map/components/TileForest/TileForest.map.ts` | delete | superseded by `TileDecorations.map.ts` | implementer-a |
| `src/modules/map/components/TileForest/TileForest.types.ts` | delete | superseded | implementer-a |
| `src/modules/map/components/TileForest/TileForest.fixtures.ts` | delete | superseded | implementer-a |
| `src/modules/map/components/TileForest/index.ts` | delete | superseded | implementer-a |
| `src/modules/map/components/TileDecorations/TileDecorations.tsx` | new | View: renders `DecorationInstance[]`, same `pointer-events-none absolute inset-0 z-[12]` container as today | implementer-b |
| `src/modules/map/components/TileDecorations/TileDecorations.styles.ts` | new | Same classes as `TileForest.styles.ts`, renamed `tree`→`decoration` | implementer-b |
| `src/modules/map/components/IslandTile/IslandTile.tsx` | edit | Swap `TileForest` import/usage (line 10, 127) for `TileDecorations`, same two props | implementer-b |
| `src/modules/map/components/TileForest/TileForest.tsx` | delete | superseded | implementer-b |
| `src/modules/map/components/TileForest/TileForest.styles.ts` | delete | superseded | implementer-b |
| `src/modules/map/components/TileDecorations/TileDecorations.map.test.ts` | new | `toScenarioKey`/`toDecorationLayout` cases (Test plan) | tester-a |
| `src/modules/map/components/TileForest/TileForest.map.test.ts` | delete | superseded | tester-a |
| `src/modules/map/island-tile-slots.test.ts` | edit | Delete the `'forest slot tables'` describe block (lines 109-151); nothing else changes | tester-a |
| `src/modules/map/components/TileDecorations/TileDecorations.test.tsx` | new | View test (Test plan) | tester-b |
| `src/modules/map/components/TileForest/TileForest.test.tsx` | delete | superseded | tester-b |
| `src/modules/map/components/TileDecorations/TileDecorations.preview.tsx` | new | Preview states (Preview states section) | preview-a |
| `src/modules/map/components/TileForest/TileForest.preview.tsx` | delete | superseded | preview-a |
| `src/testbed/registry.ts` | edit | Swap `tileForestPreview` import/array entry (lines 5, 55) for `tileDecorationsPreview` | preview-a |
| `public/sprites/decorations/pine_tree.gif`, `spring_tree.gif`, `autmn_tree.gif`, `tree.gif` | new (copy) | Seed the image-discovery folder; copy, don't move — originals stay referenced elsewhere | implementer-a |
| `docs/architecture/systems-and-visuals.md` | edit | Rewrite §6.13's forest bullets (lines 110-118) to describe `TileDecorations`/the config file; replace the suppression-rule bullet with the corrected rule (Resource islands never decorated; Monster islands decorated once cleared, same as Empty — see Decisions) | docs-sync |

### Phase 2 — editor logic (no view yet)
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.types.ts` | new | Hook view-model/handler shapes, `EditorScenarioOption` (Contracts) | implementer-a |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.map.ts` | new | Pure helpers: `toScenarioOptions`, `createInstance`, `clampPercent`, `toPointerPercent`, `nudgeInstance`, `duplicateLayout`, `renameLayout`, `removeInstance`, `removeLayout` | implementer-a |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.fixtures.ts` | new | Small sample `DecorationLayoutsConfig` + sample image list, for hook/view tests and the preview | implementer-a |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.service.ts` | new | `listDecorationImages()`, `saveDecorationLayouts(config)` — the only files that call `fetch` | implementer-a |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.hook.ts` | new | `useTileDecorationEditor()` (Contracts) | implementer-a |
| `src/testbed/components/TileDecorationEditor/index.ts` | new | Barrel | implementer-a |
| `src/app/api/tile-decoration-editor/images/route.ts` | new | `GET`: 404 in production; else `fs.readdir('public/sprites/decorations')`, filter to image extensions, return `{ images: string[] }` of `/sprites/decorations/<file>` paths | implementer-a |
| `src/app/api/tile-decoration-editor/layouts/route.ts` | new | `POST`: 404 in production; else validate the body has all 10 `DECORATION_SCENARIO_KEYS` with ≥1 layout each (400 otherwise), write `DECORATION_LAYOUTS_CONFIG_PATH` | implementer-a |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.map.test.ts` | new | Pure-helper cases (Test plan) | tester-a |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.hook.test.ts` | new | Hook cases (Test plan) | tester-a |
| `src/app/api/tile-decoration-editor/images/route.test.ts` | new | GET cases, `fs/promises` mocked (Test plan) | tester-a |
| `src/app/api/tile-decoration-editor/layouts/route.test.ts` | new | POST cases, `fs/promises` mocked (Test plan) | tester-a |

### Phase 3 — editor view, preview, registry
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.styles.ts` | new | Every Tailwind class for the 3-column layout + draggable sprite + states | implementer-b |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.tsx` | new | Composes the 3 sub-views below from `useTileDecorationEditor()`; mobile stacking via `useIsMobile` | implementer-b |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditorRail.tsx` | new | Scenario/variant pickers, layout list, Add/Duplicate/Delete/Rename/Save row | implementer-b |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditorCanvas.tsx` | new | `WithLabGameBoardContext` tile + draggable sprite buttons + empty-layout hint | implementer-b |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditorInspector.tsx` | new | Image grid + selected-instance fields + Remove | implementer-b |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.test.tsx` | new | View test, hook mocked (Test plan) | tester-b |
| `src/testbed/components/TileDecorationEditor/TileDecorationEditor.preview.tsx` | new | One state, "Editor" (Preview states) | preview-b |
| `src/testbed/registry.ts` | edit | Add `tileDecorationEditorPreview` import + array entry | preview-b |

## Contracts
```ts
// ---------------------------------------------------------------------------
// src/modules/map/decoration-layouts.types.ts
// ---------------------------------------------------------------------------
export interface DecorationInstance {
  id: string;
  /** Public path, e.g. '/sprites/decorations/tree.gif'. */
  image: string;
  /** Sprite's own CENTER point, % of the tile's side T, 0-100 (view applies
   *  translate(-50%, -50%), same convention as the resource-node slots). */
  top: number;
  left: number;
  /** Box width/height, % of T. */
  size: number;
  /** Stacking order among decorations only; the container itself stays at the
   *  TileForest-era z-[12], always below TileBoats (z-25/26) and TileResources
   *  (z-28..35) — see Final spec's "Layer" note. */
  z: number;
}

export interface DecorationLayout {
  id: string;
  name: string;
  instances: DecorationInstance[];
}

export type DecorationScenarioKey =
  | 'base' | 'special'
  | 'empty-2' | 'empty-3'
  | 'resource-1' | 'resource-2' | 'resource-3' | 'resource-4'
  | 'monster-alive' | 'monster-cleared';

export const DECORATION_SCENARIO_KEYS: readonly DecorationScenarioKey[] = [
  'base', 'special', 'empty-2', 'empty-3',
  'resource-1', 'resource-2', 'resource-3', 'resource-4',
  'monster-alive', 'monster-cleared',
] as const;

export type DecorationLayoutsConfig = Record<DecorationScenarioKey, DecorationLayout[]>;

/** Repo-relative path of decoration-layouts.config.json, used by the save API route
 *  (`path.join(process.cwd(), DECORATION_LAYOUTS_CONFIG_PATH)`). */
export const DECORATION_LAYOUTS_CONFIG_PATH = 'src/modules/map/decoration-layouts.config.json';

// ---------------------------------------------------------------------------
// src/modules/map/components/TileDecorations/TileDecorations.map.ts
// ---------------------------------------------------------------------------
// import decorationLayoutsConfig from '../../decoration-layouts.config.json';
// import { IslandType } from '@/lib/types'; import type { Island } from '@/lib/types';
// import type { DecorationLayout, DecorationLayoutsConfig, DecorationScenarioKey } from '../../decoration-layouts.types';

export function toScenarioKey(island: Island, isBase: boolean): DecorationScenarioKey;
// isBase -> 'base'
// island.type === IslandType.Special -> 'special'
// island.type === IslandType.Monster -> island.monsters && island.monsters.length > 0 ? 'monster-alive' : 'monster-cleared'
// island.type === IslandType.Resource ->
//   total = island.resources.reduce((sum, r) => sum + r.amount, 0)
//   nodeCount = Math.max(1, Math.min(total, 4))   // mirrors TileResources.map.ts's total>=4 -> QUAD fallback
//   `resource-${nodeCount}` as DecorationScenarioKey
// else (Empty/Cleared) ->
//   seed = Math.abs(island.x * 7 + island.y * 13)   // isBase is always false here, so the old (isBase?3:0) term is 0
//   seed % 2 === 0 ? 'empty-2' : 'empty-3'

export function toDecorationLayout(
  island: Island,
  isBase: boolean,
  config: DecorationLayoutsConfig = decorationLayoutsConfig as DecorationLayoutsConfig,
): DecorationLayout;
// scenarioKey = toScenarioKey(island, isBase)
// layouts = config[scenarioKey]           // always length >= 1, enforced by the save route + migration
// seed = Math.abs(island.x * 7 + island.y * 13 + (isBase ? 3 : 0))   // same formula as today's toForestLayout
// return layouts[seed % layouts.length]

// ---------------------------------------------------------------------------
// src/modules/map/components/TileDecorations/TileDecorations.tsx (view contract)
// ---------------------------------------------------------------------------
export interface TileDecorationsProps { island: Island; isBase?: boolean }
// const layout = toDecorationLayout(island, isBase);
// renders styles.container (same classes as TileForest.styles.ts today, tree -> decoration) with
// layout.instances.map(instance => <div style={{ top:`${instance.top}%`, left:`${instance.left}%`,
//   width:`${instance.size}%`, height:`${instance.size}%`, zIndex: instance.z,
//   transform: 'translate(-50%, -50%)' }}><Image src={instance.image} alt="Island decoration" fill unoptimized /></div>)
// No null return / no suppression branch: an empty instances array renders the container with no children.

// ---------------------------------------------------------------------------
// MIGRATED DATA — decoration-layouts.config.json
// Every position number below is derived from the locked tables by exactly one formula:
//   center = edge + size/2            (top/left-anchored entries)
//   center = 100 - edge - size/2      (right/bottom-anchored entries, since edge is the
//                                       box's distance from the FAR side)
//   px -> percent first: pct = round1(px / 360 * 100), then the formula above applies to pct
// roundToOneDecimal === Math.round(value * 10) / 10, same helper style as TileResources.map.ts:40-42.
// No position value below was eyeballed; re-derive from island-tile-slots.types.ts:136-173 (as
// read this session) to audit.
//
// Every instance's image cycles through the 4 existing tree sprites, by the instance's own index
// within its layout's instance array (0-based, restarting at 0 per layout — user-confirmed, keeps
// today's visible sprite variety instead of collapsing to one image):
//   const MIGRATED_TREE_IMAGES = [
//     '/sprites/decorations/pine_tree.gif',
//     '/sprites/decorations/spring_tree.gif',
//     '/sprites/decorations/autmn_tree.gif',   // real filename, not "autumn_tree.gif" — verified
//                                               // against public/sprites/autmn_tree.gif this session
//     '/sprites/decorations/tree.gif',
//   ];
//   image = MIGRATED_TREE_IMAGES[index % 4]

// "base" -> one layout, id "base-default", name "Default", from BASE_FOREST_SLOTS
// (size 15 -> size/2 7.5), image cycling pine/spring/autmn/tree by index 0-14:
// [ {top:36.5,left:44.5,img:pine}, {top:37.5,left:42.5,img:spring}, {top:37.5,left:37.5,img:autmn},
//   {top:37.5,left:31.5,img:tree}, {top:41.5,left:42.5,img:pine}, {top:39.5,left:34.5,img:spring},
//   {top:36.5,left:56.5,img:autmn}, {top:39.5,left:52.5,img:tree}, {top:38.5,left:52.5,img:pine},
//   {top:37.5,left:67.5,img:spring}, {top:39.5,left:47.5,img:autmn}, {top:39.5,left:62.5,img:tree},
//   {top:44.5,left:52.5,img:pine}, {top:46.5,left:62.5,img:spring}, {top:37.5,left:52.5,img:autmn} ]
//   (all size:15, z:10; "img:pine" etc. abbreviate the full MIGRATED_TREE_IMAGES path above)

// "special" -> one layout, id "special-default", name "Default", from SPECIAL_FOREST_SLOT
// (size 16 -> size/2 8; entries 4,7,8 were '20px' top -> 5.6%+8=13.6; entry 9 was '70px'/'50px' ->
// 19.4%+8=27.4 top, 13.9%+8=21.9 left), image cycling pine/spring/autmn/tree by index 0-8:
// [ {top:13,left:8,z:10,img:pine}, {top:15,left:18,z:12,img:spring}, {top:18,left:28,z:15,img:autmn},
//   {top:13.6,left:28,z:15,img:tree}, {top:38,left:28,z:15,img:pine}, {top:38,left:30,z:15,img:spring},
//   {top:13.6,left:28,z:15,img:autmn}, {top:13.6,left:28,z:15,img:tree}, {top:27.4,left:21.9,z:20,img:pine} ]
//   (all size:16)

// EMPTY_GROVE_SLOTS, converted once (size 28 -> size/2 14; entry 2 was right:24 -> left =
// 100-24-14=62; entry 3 was bottom:26 -> top = 100-26-14=60), image cycling pine/spring/autmn:
//   [0] {top:32,left:38,z:12,img:pine}
//   [1] {top:38,left:62,z:14,img:spring}
//   [2] {top:60,left:58,z:13,img:autmn}
//   (all size:28)
// "empty-2" -> one layout, id "empty-2-default", name "Default": instances [0,1] above.
// "empty-3" -> one layout, id "empty-3-default", name "Default": instances [0,1,2] above.

// "monster-cleared" -> TWO layouts (see Decisions: cleared Monster islands are NOT suppressed
// today — they fall through to the same EMPTY_GROVE_SLOTS branch as Empty islands, seed-selected
// 2 vs 3 trees). toDecorationLayout's existing layouts[seed % layouts.length] reproduces that
// exact choice with no code change, since seed % 2 means the same thing for any length-2 array:
//   [ { id: "monster-cleared-default-2trees", name: "Default (2 trees)", instances: [0,1] above },
//     { id: "monster-cleared-default-3trees", name: "Default (3 trees)", instances: [0,1,2] above } ]

// "resource-1".."resource-4" and "monster-alive" -> one layout each, id "<key>-default",
// name "Default", instances: [] — these 5 (not 6) combinations are genuinely suppressed today
// (Resource: unconditional; Monster: only while monsters.length > 0), confirmed against
// TileForest.map.ts:12-18 this session.

// ---------------------------------------------------------------------------
// src/testbed/components/TileDecorationEditor/TileDecorationEditor.types.ts
// ---------------------------------------------------------------------------
export interface EditorScenarioOption {
  key: string;             // outer <Select> value, e.g. 'empty', 'resource'
  label: string;           // 'Base' | 'Special' | 'Empty' | 'Resource' | 'Monster'
  variants: { key: DecorationScenarioKey; label: string }[]; // [] for base/special (no sub-picker)
}

export type EditorStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface TileDecorationEditorViewModel {
  scenarioOptions: EditorScenarioOption[];
  activeScenario: string;              // outer key, e.g. 'resource'
  activeVariant: DecorationScenarioKey | null; // null only for base/special
  layouts: DecorationLayout[];          // for config[activeScenarioKey]
  activeLayoutId: string;
  selectedInstanceId: string | null;
  images: string[];                    // from listDecorationImages()
  isDirty: boolean;
  status: EditorStatus;
  canDeleteActiveLayout: boolean;       // false when layouts.length === 1
  onScenarioChange: (outerKey: string) => void;
  onVariantChange: (variant: DecorationScenarioKey) => void;
  onSelectLayout: (layoutId: string) => void;
  onAddLayout: (name: string) => void;
  onDuplicateLayout: () => void;
  onRenameLayout: (name: string) => void;
  onDeleteLayout: () => void;
  onAddInstance: (image: string) => void;
  onSelectInstance: (instanceId: string | null) => void;
  onDragInstance: (instanceId: string, top: number, left: number) => void; // already-clamped %
  onNudgeInstance: (instanceId: string, dTop: number, dLeft: number) => void; // raw -5..5, hook clamps
  onResizeInstance: (instanceId: string, size: number) => void;
  onRelayerInstance: (instanceId: string, z: number) => void;
  onRemoveInstance: (instanceId: string) => void;
  onSave: () => void;
}

export function useTileDecorationEditor(): TileDecorationEditorViewModel;
// Loads decorationLayoutsConfig (from '@/modules/map') into state once on mount; calls
// listDecorationImages() in an effect. onDragInstance/onNudgeInstance/onResizeInstance mark isDirty.
// onSave calls saveDecorationLayouts(config) and sets status 'saving' -> 'saved' (2s, then 'idle',
// isDirty false) or 'error'.

// ---------------------------------------------------------------------------
// src/testbed/components/TileDecorationEditor/TileDecorationEditor.service.ts
// ---------------------------------------------------------------------------
export function listDecorationImages(): Promise<string[]>;        // GET /api/tile-decoration-editor/images
export function saveDecorationLayouts(config: DecorationLayoutsConfig): Promise<void>; // POST .../layouts, throws on !res.ok

// ---------------------------------------------------------------------------
// src/app/api/tile-decoration-editor/images/route.ts
// ---------------------------------------------------------------------------
// export async function GET(): Promise<Response>
// if (process.env.NODE_ENV === 'production') return new Response(null, { status: 404 });
// files = await fs.readdir(path.join(process.cwd(), 'public/sprites/decorations'))
// images = filter to .gif/.png/.jpg/.jpeg/.webp, map to `/sprites/decorations/${file}`
// return NextResponse.json({ images })

// ---------------------------------------------------------------------------
// src/app/api/tile-decoration-editor/layouts/route.ts
// ---------------------------------------------------------------------------
// export async function POST(request: Request): Promise<Response>
// if (process.env.NODE_ENV === 'production') return new Response(null, { status: 404 });
// const { config } = await request.json() as { config: DecorationLayoutsConfig };
// validate: DECORATION_SCENARIO_KEYS.every(key => Array.isArray(config[key]) && config[key].length >= 1)
//   -> 400 if not
// await fs.writeFile(path.join(process.cwd(), DECORATION_LAYOUTS_CONFIG_PATH), JSON.stringify(config, null, 2))
// return NextResponse.json({ ok: true })
```

## Phases
### Phase 1: production migration (replace TileForest with TileDecorations)
1. implementer-a creates `decoration-layouts.types.ts` and `decoration-layouts.config.json` with the exact migrated data in Contracts; adds the barrel/index exports; deletes the forest slot tables from `island-tile-slots.types.ts`. (sonnet)
2. implementer-a creates `TileDecorations.map.ts`/`.types.ts`/`.fixtures.ts`/`index.ts`; deletes the superseded `TileForest.map.ts`/`.types.ts`/`.fixtures.ts`/`index.ts`. (sonnet)
3. implementer-b creates `TileDecorations.tsx`/`.styles.ts`, wires `IslandTile.tsx` to it, deletes `TileForest.tsx`/`.styles.ts`. (sonnet)
4. tester-a writes `TileDecorations.map.test.ts`, deletes `TileForest.map.test.ts`, trims the forest describe block from `island-tile-slots.test.ts`. (sonnet)
5. tester-b writes `TileDecorations.test.tsx`, deletes `TileForest.test.tsx`. (sonnet)
6. preview-a writes `TileDecorations.preview.tsx`, deletes `TileForest.preview.tsx`, updates `registry.ts`. (sonnet)
7. implementer-a copies the 4 tree images into `public/sprites/decorations/`.
8. docs-sync updates `systems-and-visuals.md` §6.13 (`docs/README.md` is not a target — see Verified context).
9. Checks: `npm run typecheck`, `npm run lint`, `npm test`; `ui-verify` on `/testbed/tile-forest`→`/testbed/tile-decorations`-equivalent preview states (renamed slug) and the live game board (an Empty/Base/Resource/Monster island each).

Model escalation: all of Phase 1 (per triage overrides).

### Phase 2: editor logic (hook, map, service, API routes)
1. implementer-a builds `TileDecorationEditor.types.ts`/`.map.ts`/`.fixtures.ts`/`.service.ts`/`.hook.ts`/`index.ts`. (sonnet)
2. implementer-a builds the two API routes. (sonnet)
3. tester-a writes `.map.test.ts`, `.hook.test.ts`, and both route tests (mock `fs/promises`). (sonnet)
4. Checks: `npm run typecheck`, `npm run lint`, `npm test`. No UI yet, no `ui-verify` this phase.

Model escalation: all of Phase 2.

### Phase 3: editor view, preview, registry
1. implementer-b builds `TileDecorationEditor.styles.ts`, `.tsx`, `Rail.tsx`, `Canvas.tsx`, `Inspector.tsx`. (sonnet)
2. tester-b writes `TileDecorationEditor.test.tsx` (hook mocked). (sonnet)
3. preview-b writes `TileDecorationEditor.preview.tsx`, updates `registry.ts`. (sonnet)
4. Checks: `npm run typecheck`, `npm run lint`, `npm test`; `ui-verify` against all ten acceptance-criteria screenshots in ui-design.md's Final spec, at 1280×720 and 390×844.

Model escalation: all of Phase 3.

## Test plan
- tester-a (logic, first):
  - `TileDecorations.map.test.ts`: `toScenarioKey` for base, special, empty (both seed parities), resource totals 1/2/3/4/5+ (clamped to 4), monster alive/cleared; `toDecorationLayout` returns the exact migrated instance arrays above (image included) for a Base/Special/Empty-2/Empty-3 island at a fixture seed, returns `instances: []` for a fresh Resource/Monster-alive island, and for `monster-cleared` picks between the 2-tree and 3-tree layouts by `seed % 2` exactly like Empty does (same two seeds as the Empty-2/Empty-3 cases should flip the same way for a cleared-Monster island at the same x/y).
  - `TileDecorationEditor.map.test.ts`: `clampPercent` at -10/0/50/100/110; `nudgeInstance` ±1/±5 clamped at the edges; `createInstance` defaults (`top:45,left:45,size:25,z:12`); `duplicateLayout` assigns a new layout id AND new instance ids (so editing the copy never mutates the original); `renameLayout`/`removeInstance`/`removeLayout`; `toScenarioOptions` returns exactly 2+2+4+2=10 variant entries across 5 outer options, labels matching ui-design's Copy strings verbatim.
  - `TileDecorationEditor.hook.test.ts`: scenario/variant change resets `activeLayoutId` to the new list's first entry and `selectedInstanceId` to null; `onDragInstance`/`onNudgeInstance`/`onResizeInstance`/`onRelayerInstance` set `isDirty`; `onAddLayout` on the sole layout keeps `canDeleteActiveLayout` false until a second layout exists; `onDeleteLayout` is a no-op when `layouts.length === 1`; `onSave` calls `saveDecorationLayouts` with the current in-memory config and transitions `status` idle→saving→saved (service mocked to resolve) and idle→saving→error (service mocked to reject), `isDirty` only clears on success.
  - `route.test.ts` (images): returns the mocked `fs.readdir` result filtered to image extensions and prefixed `/sprites/decorations/`; empty dir → `{ images: [] }`; `NODE_ENV=production` → 404 without calling `fs.readdir`.
  - `route.test.ts` (layouts): valid body → 200 and `fs.writeFile` called with `JSON.stringify(config, null, 2)` at `DECORATION_LAYOUTS_CONFIG_PATH`; body missing one of the 10 scenario keys → 400, `fs.writeFile` not called; `NODE_ENV=production` → 404 without calling `fs.writeFile`.
- tester-b (view and e2e, no e2e this task — see Decisions):
  - `TileDecorations.test.tsx`: renders each instance's image/alt/style (top/left/size/z, `translate(-50%, -50%)`); renders the container with zero children (no crash) for an empty-instances fixture; still mounts (no longer suppressed) for Resource and living-Monster fixtures.
  - `TileDecorationEditor.test.tsx` (hook mocked via the view model directly, no real fetch): clicking a layout row calls `onSelectLayout`; clicking a sprite button calls `onSelectInstance` and shows the ring class; simulated `pointerdown`+`pointermove`+`pointerup` on a sprite button calls `onDragInstance` with clamped percentages; `ArrowRight`/`Shift+ArrowRight` on a focused sprite call `onNudgeInstance` with 1/5; clicking an image thumbnail calls `onAddInstance`; Remove on the only instance shows the empty-layout hint text; Delete button `disabled` with the "A scenario needs at least one layout" `aria-describedby` when `canDeleteActiveLayout` is false; Save shows the spinner while `status==='saving'` and "Saved." while `status==='saved'`, "Could not save — see console." while `status==='error'`.

## Preview states
- `TileDecorations` (`src/modules/map/components/TileDecorations/TileDecorations.preview.tsx`, slug renamed from `tile-forest`): Base (decorated), Special (decorated), Empty (decorated), Resource (decorations enabled, empty by default), Monster alive (decorations enabled, empty by default — no longer suppressed), Monster cleared (decorated — same seeded grove as Empty, not empty). Uses `TileDecorations.fixtures.ts`.
- `TileDecorationEditor` (`src/testbed/components/TileDecorationEditor/TileDecorationEditor.preview.tsx`): one state, "Editor", rendering the real `TileDecorationEditor` component against `TileDecorationEditor.fixtures.ts`'s sample config/image list (service mocked at the preview level the same way other interactive previews avoid real network/Firestore calls, e.g. `IslandTileSlotLab`'s `GameBoardProvider` fixtures).

## Risks
- **`decoration-layouts.config.json` grows into `src/modules/map/`'s flat namespace**: if a future task adds more config-like files here, consider a `src/modules/map/config/` subfolder then — not needed for one file today (KISS).
- **ui-design.md's Copy line for Monster/Resource "Default" layouts is now inaccurate for `monster-cleared`** (it says all 6 Resource/Monster combinations start at 0 instances; only 5 do — see Decisions). Not corrected here (out of this stage's scope); tester-b/preview-a build against this plan's corrected behavior, and whoever next touches ui-design.md should fix that line.
- **Dev-only save route writes to the repo's own source tree** (`src/modules/map/decoration-layouts.config.json`) from a running `next dev` server: this is intentional (same spirit as hand-editing `island-tile-slots.types.ts` today) but means Save has no undo — mitigated by the "cannot delete a scenario's last layout" rule and git being the real undo.

## Review (architect-b)
VERDICT: APPROVED

Re-review after architect-a's revision. All three findings below are resolved, each re-verified against the repo this session:
1. **Fabricated `docs/README.md` citation — fixed.** Verified-context row 38 now correctly attributes the "top-right forest cluster" text to `src/docs/README.md` (re-read: 463 lines, 49KB, line 425 contains the exact "top-right cluster" text), not `docs/README.md` (still 33 lines, no forest content). Confirmed `src/docs/README.md` is reachable only from historical task records (`grep -rl "src/docs/README"` outside `docs/ai/tasks/*` and `.claude/worktrees/*` returns nothing) — i.e. genuinely orphaned from the real `docs/README.md` → `docs/architecture/*.md` index chain, so correctly left out of this task's docs-sync scope. File plan no longer has a `docs/README.md` row.
2. **`monster-cleared` regression — fixed.** Decision and Contracts now give `monster-cleared` two migrated layouts (`monster-cleared-default-2trees`/`-3trees`) built from the same `EMPTY_GROVE_SLOTS`-derived instances as `empty-2`/`empty-3`; `toDecorationLayout`'s existing `layouts[seed % layouts.length]` reproduces today's exact seed-driven 2-vs-3 choice with no new branching. Re-confirmed against `TileForest.map.ts:12-18` this session: suppression is genuinely Resource-always + Monster-only-while-alive, so only `resource-1..4` and `monster-alive` (5, not 6) stay empty-by-design — matches the plan's corrected Contracts and File-plan row 57.
3. **Decision #3 (sprite variety) — resolved by user confirmation.** Migrated instances now cycle through the 4 real tree images (`pine_tree.gif`, `spring_tree.gif`, `autmn_tree.gif` — filename re-verified against `public/sprites/autmn_tree.gif`, `tree.gif`) by instance index within each layout, per the coordinator's revise-mode instruction recording the user's answer. Spot-checked the cycling against every migrated array in Contracts (Base's 15, Special's 9, the grove's 3): each follows `index % 4` exactly as documented, no drift.

ui-design.md's Copy line now being stale for `monster-cleared` (flagged in Risks) is correctly scoped out of this plan-review and this task's File plan — it's a wording-only fix to a different hand-off file, doesn't change any contract or acceptance criterion a builder works against, and the plan explicitly tells tester-b/preview-a to build against the corrected behavior here, not that line.

Original findings (evidence retained below for the record):
1. **`docs/README.md:43-44,424-459` citation is fabricated.** Read the file this session: it is 33 lines total (`wc -l docs/README.md` → 33), a pure index/table-of-contents with zero mentions of "forest", "tree" or "decoration" anywhere in it — no embedded copy of the §6.13 content exists, and no "top-right forest cluster" text exists at any line. The plan's Verified-context row and File-plan row 82 (`docs/README.md | edit | Update lines 43-44 and 424-459...`) describe content that does not exist in this file. Fix: drop that row from the File plan and the Verified-context table; the only real docs-sync target for this task is `docs/architecture/systems-and-visuals.md:109-118` (confirmed accurate — content there matches "Resource Island Forest Suppression Rule" verbatim, and it does not mention Monster islands at all, consistent with the code — see finding 2).

2. **A second, unflagged visual regression: Monster-cleared islands are not suppressed today, and the plan silently wipes their decorations.** Read `TileForest.map.ts:12-16` directly:
   ```
   if (island.type === IslandType.Resource ||
       (island.type === IslandType.Monster && island.monsters && island.monsters.length > 0)) {
     return null;
   }
   ```
   Suppression triggers only for Resource, or for Monster **with `monsters.length > 0`** (alive). A cleared Monster island (`monsters.length === 0` or `undefined`) falls through past this check, past the `isBase`/`Special` branches, into the same default branch as an Empty island, and today renders real `EMPTY_GROVE_SLOTS`-style trees with the full 4-way seeded sprite variety (`TileForest.tsx:9-11`, `toForestLayout`'s final `return { treeSprite, layout: EMPTY_GROVE_SLOTS.slice(0, treeCount) }`). But the plan's Contract (`toScenarioKey`) and ui-design's Review finding 5 both assert "Monster×2 have no legacy slot table (today suppressed, `TileForest.map.ts:12-16`)" and migrate `monster-cleared` to an empty `instances: []` default layout "by design." That premise is wrong for the cleared variant: this migration removes decorations from an island type that is decorated today, and no Decision or Risk entry discloses it — only the "same tree.gif for all" risk is flagged. Fix: either (a) migrate `monster-cleared`'s "Default" layout from the same `EMPTY_GROVE_SLOTS` data used for `empty-2`/`empty-3` (matching today's actual fallthrough behavior), or (b) keep it empty but add this as a second, explicit disclosed regression in Risks and get the same sign-off requested in finding 3. Don't leave it as an uncaught side effect of a wrong "today suppressed" premise.

3. **Architect-a's question on Decision #3: route back to the user, don't approve as-is.** Triage's "explicit, confirmed ask" (triage.md's Risk bullet) is about changing the **locked slot-table values** themselves (`BASE_FOREST_SLOTS` etc., per `feedback_island_tile_slots_locked.md`) — confirmed. Triage's Scope also already settled the new data model: "position + image + size + z-index per decoration instance" (triage.md:22) — a per-instance image, confirmed. But the specific consequence Decision #3 draws from that model — that every migrated Base/Special/Empty instance collapses to one shared image, discarding today's visible 4-way seeded pine/spring/autumn/plain variety per island — is not itemized anywhere in triage's confirmed scope, and architect-a's own Decision #3 text says "Flagging for architect-b/user sign-off, not deciding past them," i.e. architect-a is not asserting this was already confirmed. Given it's a real, player-visible art regression with a plausible alternative on the table (cycle through the 4 images by instance index), this needs the user's explicit answer before Phase 1 lands, not architect-b's approval in their place. Route back together with finding 2 — both are visible regressions the migration introduces that weren't itemized in triage's "confirmed" list.

Everything else checked out: every other path/line/symbol cited in Verified Context and the File plan was reread this session (`island-tile-slots.types.ts:124-173`, `TileForest.map.ts:11-39`, `IslandTile.tsx:10,127`, `src/testbed/registry.ts:5,55` + `findPreview`, `island-tile-slots.test.ts:109-151`, `TileResources.map.ts` slot-fallback/rounding/Wood-sprite-path, `src/lib/types/map.ts`'s `Island`/`IslandResource`/`monsters` fields, the center-point migration formula, `IslandTile.preview.slot-lab.tsx`/`IslandTile.fixtures.ts` fixtures, `TestbedShell.tsx`/`.styles.ts`, `testbed.types.ts`, `PreviewStage.tsx`'s `?state=` gating, `testbed.config.ts`'s `isTestbedEnabled()`, `src/modules/shared/index.ts`'s `useIsMobile` export, `tsconfig.json`'s `resolveJsonModule`, `find src/app/api` empty, the 4 existing tree images present / `decorations/` folder absent, and the `TileForest.styles.ts`/`TileBoats.styles.ts`/`TileResources.styles.ts` z-index values cited by ui-design) — all accurate. A fresh repo-wide grep for `TileForest`, `BASE_FOREST_SLOTS`, `SPECIAL_FOREST_SLOT`, `EMPTY_GROVE_SLOTS`, and `tileForestPreview` turned up only the File-plan's own listed hits (production code, tests, preview, registry, this task's own docs) — no stray reference left unaccounted for. The migrated-data arithmetic in Contracts was independently recomputed by hand for every Base/Special/Empty entry against the live `island-tile-slots.types.ts` values and matches exactly (center = edge + size/2, mirrored for right/bottom anchors, px→pct via `round1(px/360*100)` before adding size/2) — no re-derivation needed by a builder, confirmed correct as written. Design review: the center-point `DecorationInstance` shape, the flat 10-key `DecorationScenarioKey` union, the whole-file-overwrite Save, and the `NODE_ENV==='production'` gate (not `isTestbedEnabled()`) on the two API routes are each the simplest option that matches a real constraint (uniform drag/clamp model, no second normalization step, single-developer tool, filesystem-write safety independent of the QA testbed-in-prod flag) — no simpler alternative found. Phasing, file ownership split, and contracts are complete enough for implementer-a/b to work in parallel without touching each other's files.
