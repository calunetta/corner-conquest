# Plan: Island tile layout consolidation

Status: APPROVED
Inputs: triage.md, ui-design.md (Final spec)

## Goal and acceptance criteria
- [ ] One shared slot/corner table (`src/modules/map/island-tile-slots.types.ts`) is the single source of truth for `TileResources.map.ts`, `TileBoats.map.ts` (via `TileBoats.types.ts`), `TileForest.map.ts`, and `TileOccupants.hook.ts` (via `TileBoats.types.ts`); no component defines its own slot or corner literals anymore.
- [ ] Resource-island dual slots move `left`/`right` 14%→24%; triple slot 1's `left` moves 12%→24%; Empty/Cleared grove trees 1 and 2 move `left`/`right` 22%→24%. All other slot values (Base resource/forest, single resource, triple slots 2-3, grove tree 3, Special forest, all 4 corners) are byte-for-byte unchanged.
- [ ] `Base island with resources and occupants` preview state renders pixel-identical to today (regression, not a fix).
- [ ] New preview states (listed in Preview states below) show the corrected slots not overlapping the `tl`/`tr`-corner boat's on-tile box (top/left or top/right 0–21%).
- [ ] All 13 existing `IslandTile.preview.tsx` states still render with no console error and no visible overlap at 1280×720 and 390×844 (`ui-verify`).
- [ ] `docs/architecture/systems-and-visuals.md` §6.13 describes one shared slot table instead of four separately-tuned coordinate sets (docs-sync).

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `SlotDef`, `SINGLE_RESOURCE_SLOT`, `DUAL_RESOURCE_SLOTS`, `TRIPLE_RESOURCE_SLOTS`, `BASE_RESOURCE_SLOTS`, `getSlot` | `src/modules/map/components/TileResources/TileResources.map.ts:27-80` | the resource-node coordinate system being consolidated; `getSlot` (idx/total/isBase dispatch) stays local, only the tables it reads move |
| `ResourceNodeViewModel`, `FarmingCollectorViewModel` | `src/modules/map/components/TileResources/TileResources.types.ts:8-37` | unchanged; `slotStyle` shape doesn't change |
| `CornerId`, `CornerPosition`, `BOAT_CORNER_POSITIONS`, `CORNER_TRANSFORMS` | `src/modules/map/components/TileBoats/TileBoats.types.ts:3-30` | the one already-shared system; moves to the new shared file, `TileBoats.types.ts` keeps only `TileBoatsProps`/`BoatEntryViewModel` |
| `toTileBoatsViewModel`, `getCornerPosition` | `src/modules/map/components/TileBoats/TileBoats.map.ts:32-111` | only its import of `BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS` changes source; logic unchanged |
| `toForestLayout`, Base/Special/grove `TreeSlot[]` literals | `src/modules/map/components/TileForest/TileForest.map.ts:6-46` | grove literals (lines 36-39) move to the shared file with 2 values corrected; Base/Special literals move unchanged |
| `TreeSlot`, `ForestLayout`, `TileForestProps`, `TREE_SPRITES` | `src/modules/map/components/TileForest/TileForest.types.ts` | `TreeSlot` moves to the shared file; `TileForest.types.ts` re-exports it for `ForestLayout`'s and the component's own public API |
| `useTileOccupants` | `src/modules/map/components/TileOccupants/TileOccupants.hook.ts:1-75` | only its import of `BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS` (currently `from '../TileBoats/TileBoats.types'`, line 5) changes source |
| `OccupantSpriteViewModel` | `src/modules/map/components/TileOccupants/TileOccupants.types.ts` | unchanged |
| `IslandTileView`, stacking order forest→boats→centerContent→occupants | `src/modules/map/components/IslandTile/IslandTile.tsx:93-118` | unchanged; no edit needed here |
| `IslandTile.fixtures.ts` — `localPlayerFixture`, `opponentPlayerFixture`, `armyFixture`, `gameStateFixture`, `baseIslandWithResourcesAndOccupants` | `src/modules/map/components/IslandTile/IslandTile.fixtures.ts:16-104` | base for the new resource/empty-island fixtures; `gameStateFixture.players` is the single players array every `IslandTile.preview.tsx` state resolves occupants against (via one shared `GameBoardProvider`) |
| `IslandTile.preview.tsx` — `WithGameBoardContext`, `createViewModel`, 13 `states` entries | `src/modules/map/components/IslandTile/IslandTile.preview.tsx` | add 4 new states here; existing 13 must still render unchanged |
| `determineVisibility` (per-tile) | `src/modules/map/components/TileBoats/TileBoats.map.ts:13-30` | non-Base tile under `fogOfWar: true` (the preview's `BASE_SETTINGS.fogOfWar`) needs `localPlayer.revealedTiles.includes(island.id)` or boats render null — new fixture island ids must be added to `localPlayerFixture.revealedTiles` |
| per-occupant visibility filter | `src/modules/map/components/TileOccupants/TileOccupants.hook.ts:40-54` | `TileBoats` has no per-occupant filter (only the tile-level one above), but `TileOccupants` does — an opponent's soldier sprite may not render even when their boat does; out of scope, see Risks |
| corner assignment is post-filter array index | `src/modules/map/components/TileOccupants/TileOccupants.hook.ts:55-58`, `src/modules/map/components/TileBoats/TileBoats.map.ts:90-95` | confirmed by ui-designer-b's review (ui-design.md:100-106): a single valid occupant always lands on `br`; reaching `tl` needs 3 valid occupants, `tr` needs 2 |
| `Island.occupants` | `src/lib/types/map.ts:32` | `{ playerId: number; armyId: number }[]`, no cardinality limit; two entries may share a `playerId` with different `armyId`s |
| eslint `MODULE_FILES`, `max-lines` | `eslint.config.mjs:38,69` | `src/modules/**/*.{ts,tsx}` capped at 150 non-blank/non-comment lines; the new shared file and `IslandTile.fixtures.ts` must stay under this |

## Root cause (bugs only)
N/A — refactor, not a bug fix. (The two corner-clearance gaps the spec fixes — Resource-island dual/triple slot 1, and Empty-island grove trees 1-2 — are latent visual bugs, not yet reported; they're fixed as part of consolidating the four systems, per ui-design.md's Final spec.)

## Decisions
- One shared file `src/modules/map/island-tile-slots.types.ts` holding both the slot/corner **types** and the **constant tables**, mirroring the existing `TileBoats.types.ts` precedent (types + constants already coexist there). Rejected: separate `.types.ts` + a `.ts` data file (adds a file for no added clarity at this size — the whole module is ~100 lines).
- Lives at the `map` module root (`src/modules/map/`), not inside any one component's `components/<Name>/` folder, because it's read by four sibling components — same precedent as `src/modules/map/board-context.fixtures.ts`. Rejected: putting it in `src/modules/shared/` (only used within this one module, not across modules).
- `getSlot` (the idx/total/isBase dispatcher in `TileResources.map.ts`) stays local to `TileResources.map.ts`; only the tables it reads move. Rejected: moving `getSlot` itself into the shared file (it's resource-specific selection logic, not shared data — `TileBoats`/`TileForest` have their own, different dispatch rules).
- `CornerId`/`CornerPosition`/`BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS` keep their existing names when they move, to minimize the diff in every file that already imports them. Rejected: renaming to something role-neutral like `OCCUPANT_CORNER_POSITIONS` (no behavior or clarity gain, touches more call sites for no reason).
- New preview/test fixtures reuse `localPlayerFixture` + `opponentPlayerFixture`, giving `localPlayerFixture` a second army, instead of inventing a third player — per ui-design.md's Final spec note (ui-design.md:105, 116-118). Rejected: a third player fixture (more surface to keep in sync, no behavioral difference for this test).

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/map/island-tile-slots.types.ts` | new | Single source of truth: `SlotDef`, `TreeSlot`, `CornerId`, `CornerPosition` types; `BOAT_CORNER_POSITIONS`, `CORNER_TRANSFORMS`, `SINGLE_RESOURCE_SLOT`, `DUAL_RESOURCE_SLOTS`, `TRIPLE_RESOURCE_SLOTS`, `BASE_RESOURCE_SLOTS`, `BASE_FOREST_SLOTS`, `SPECIAL_FOREST_SLOT`, `EMPTY_GROVE_SLOTS` constants | implementer-a |
| `src/modules/map/island-tile-slots.test.ts` | new | Pins the exact (corrected) values of every exported table, corner-by-corner and slot-by-slot (literal expectations, not derived) | tester-a |
| `src/modules/map/components/TileResources/TileResources.map.ts` | edit | Remove the private `SlotDef`/`SINGLE_RESOURCE_SLOT`/`DUAL_RESOURCE_SLOTS`/`TRIPLE_RESOURCE_SLOTS`/`BASE_RESOURCE_SLOTS` (lines 27-63); import them from `../../island-tile-slots.types`; `getSlot` and everything else unchanged | implementer-a |
| `src/modules/map/components/TileResources/TileResources.map.test.ts` | edit | Update the two-node (`left`/`right` 14%→24%) and three-node slot-1 (`left` 12%→24%) expectations at lines 392-409 to the corrected values; all other assertions unchanged | tester-a |
| `src/modules/map/components/TileBoats/TileBoats.types.ts` | edit | Remove `CornerId`/`CornerPosition`/`BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS` (lines 3-30); keep `TileBoatsProps`/`BoatEntryViewModel`; re-export the four moved names from `../../island-tile-slots.types` so every existing importer of `./TileBoats.types` keeps working unchanged | implementer-a |
| `src/modules/map/components/TileBoats/TileBoats.map.ts` | edit | No logic change; import path for `BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS` still `./TileBoats.types` (now a re-export) — verify it still resolves, no edit needed unless the re-export isn't used | implementer-a |
| `src/modules/map/components/TileForest/TileForest.types.ts` | edit | Remove the `TreeSlot` interface; re-export `TreeSlot` from `../../island-tile-slots.types`; `ForestLayout`, `TileForestProps`, `TREE_SPRITES` unchanged | implementer-a |
| `src/modules/map/components/TileForest/TileForest.map.ts` | edit | Replace the inline Base/Special/grove `TreeSlot[]` literals (lines 22-39) with imports of `BASE_FOREST_SLOTS`, `SPECIAL_FOREST_SLOT`, `EMPTY_GROVE_SLOTS` from `../../island-tile-slots.types`; seed/sprite logic unchanged | implementer-a |
| `src/modules/map/components/TileForest/TileForest.map.test.ts` | edit | Add assertions pinning the corrected grove `left`/`right` values (tree 1 `left:24%`, tree 2 `right:24%`, tree 3 unchanged) — no existing assertion currently checks these, so none break, but the fix needs a test that would have failed before it | tester-a |
| `src/modules/map/components/TileOccupants/TileOccupants.hook.ts` | edit | Change the import of `BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS` from `'../TileBoats/TileBoats.types'` (line 5) to `'../../island-tile-slots.types'` | implementer-a |
| `src/modules/map/components/TileOccupants/TileOccupants.fixtures.ts` | edit | Same import redirect for `CORNER_TRANSFORMS` (currently line 4) | implementer-a |
| `src/modules/map/components/TileBoats/TileBoats.fixtures.ts` | edit | Same import redirect for `CORNER_TRANSFORMS` (currently line 4) | implementer-a |
| `src/modules/map/components/TileOccupants/TileOccupants.preview.tsx` | edit | Same import redirect for `CORNER_TRANSFORMS` (currently line 8) | preview-a |
| `src/modules/map/components/TileBoats/TileBoats.preview.tsx` | edit | Same import redirect for `CORNER_TRANSFORMS` (currently line 17) | preview-a |
| `src/modules/map/components/IslandTile/IslandTile.fixtures.ts` | edit | Add `secondArmyFixture` (id `2`) to `localPlayerFixture.armies`; add 4 new `Island` fixtures (see Contracts); add their ids to `localPlayerFixture.revealedTiles`; add the 4 islands to `gameStateFixture.map` | implementer-a |
| `src/modules/map/components/IslandTile/IslandTile.preview.tsx` | edit | Add 4 new states to the `states` array using the new fixtures through `WithGameBoardContext`/`createViewModel`, same pattern as the existing `Resource island` state | preview-a |
| `docs/architecture/systems-and-visuals.md` | edit | Rewrite §6.13 (line 92) to describe the one shared slot table instead of four separately-tuned coordinate sets | docs-sync |

## Contracts
```ts
// src/modules/map/island-tile-slots.types.ts
// Single source of truth for every island-tile sprite-placement coordinate.
// All percent values are % of the tile's own side length T. Corner-clearance rule (see
// ui-design.md): a non-corner slot must clear the 0-22%/78-100% band on at least one axis
// for every corner it is near. 22% = the boat's 21% half-box + a 1-point visible gap.

export type CornerId = 'br' | 'tr' | 'tl' | 'bl';

export interface CornerPosition {
  id: CornerId;
  /** Always exactly two of these four keys, each '0'. */
  style: Partial<Record<'top' | 'bottom' | 'left' | 'right', string>>;
}

/** Order is load-bearing: TileOccupants.hook.ts reads this directly so occupant index N
 *  always lands on the same corner as boat entry index N. Do not reorder. */
export const BOAT_CORNER_POSITIONS: CornerPosition[] = [
  { id: 'br', style: { bottom: '0', right: '0' } },
  { id: 'tr', style: { top: '0', right: '0' } },
  { id: 'tl', style: { top: '0', left: '0' } },
  { id: 'bl', style: { bottom: '0', left: '0' } },
];

/** Centers an element on its tile corner point: half of its own box overhangs past the
 *  tile edge regardless of the element's size (boat 42% of T, rider 29% of T). */
export const CORNER_TRANSFORMS: Record<CornerId, string> = {
  br: 'translate(50%, 50%)',
  tr: 'translate(50%, -50%)',
  tl: 'translate(-50%, -50%)',
  bl: 'translate(-50%, 50%)',
};

export interface SlotDef {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  transform?: string;
  size: number; // px; reference size for the node box and the collector-badge formula
  width?: string; // percent; Base slots only, overrides the node box's px size
  height?: string; // percent; Base slots only
}

export const SINGLE_RESOURCE_SLOT: SlotDef = {
  top: '46%',
  left: '50%',
  transform: 'translateX(-50%)',
  size: 46,
};

// left/right corrected 14% -> 24% to clear the boat corner band (was the one coordination
// gap the triage flagged: these slots were never checked against the boat corners).
export const DUAL_RESOURCE_SLOTS: SlotDef[] = [
  { top: '20%', left: '24%', size: 38 },
  { top: '70%', right: '24%', size: 38 },
];

// Slot 1's left corrected 12% -> 24% (same gap as above); slots 2-3 already clear by their
// vertical offset (46%/70% fall outside the 0-22%/78-100% bands) and are unchanged.
export const TRIPLE_RESOURCE_SLOTS: SlotDef[] = [
  { top: '20%', left: '24%', size: 32 },
  { top: '46%', right: '12%', size: 32 },
  { top: '70%', left: '12%', size: 32 },
];

// Edge-midpoint slots keep clear of the boat and occupant corner anchors. Unchanged.
export const BASE_RESOURCE_SLOTS: SlotDef[] = [
  { top: '4%', left: '50%', transform: 'translateX(-50%)', size: 26, width: '22%', height: '22%' },
  { bottom: '4%', left: '35%', transform: 'translateX(-50%)', size: 26, width: '22%', height: '22%' },
  { bottom: '4%', left: '65%', transform: 'translateX(-50%)', size: 26, width: '22%', height: '22%' },
];

export interface TreeSlot {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  /** Percent of the tile's own side length T, except the Special slot's '4px' top/left. */
  size: string;
  z: number;
}

// Unchanged: kept inside the gap between the top-left boat corner (0-21% of T) and the base
// crest/top resource slot, so trees never sit under the resource icons.
export const BASE_FOREST_SLOTS: TreeSlot[] = [
  { top: '2%', left: '23%', size: '15%', z: 12 },
  { top: '11%', left: '23%', size: '15%', z: 14 },
];

// Unchanged: single decorative slot, not corner-adjacent.
export const SPECIAL_FOREST_SLOT: TreeSlot[] = [{ top: '4px', left: '4px', size: '16%', z: 12 }];

// Trees 1 and 2's left/right corrected 22% -> 24% to clear the boat corner band; tree 3
// (bottom:26%, left:44%) was already clear and is unchanged.
export const EMPTY_GROVE_SLOTS: TreeSlot[] = [
  { top: '18%', left: '24%', size: '28%', z: 12 },
  { top: '24%', right: '24%', size: '28%', z: 14 },
  { bottom: '26%', left: '44%', size: '28%', z: 13 },
];
```

```ts
// src/modules/map/components/TileBoats/TileBoats.types.ts — new shape (unchanged exports
// from this file's consumers' point of view: TileBoatsProps, BoatEntryViewModel, CornerId,
// CornerPosition, BOAT_CORNER_POSITIONS, CORNER_TRANSFORMS all still resolve from here).
import type { Island, PlayerColor } from '@/lib/types';
export type { CornerId, CornerPosition } from '../../island-tile-slots.types';
export { BOAT_CORNER_POSITIONS, CORNER_TRANSFORMS } from '../../island-tile-slots.types';

export interface TileBoatsProps {
  island: Island;
}

export interface BoatEntryViewModel {
  key: string;
  color: PlayerColor;
  cornerStyle: Record<string, string>;
  showIdleCollector: boolean;
  idleCollectorSprite?: string;
}
```

```ts
// src/modules/map/components/IslandTile/IslandTile.fixtures.ts — additions only, every
// existing export keeps its current value.
import type { Army } from '@/lib/types';

export const secondArmyFixture: Army = { id: 2, position: { x: 1, y: 1 }, hasActed: false };
// localPlayerFixture.armies becomes: [armyFixture, secondArmyFixture]
// localPlayerFixture.revealedTiles gains the 4 new island ids below (TileBoats requires
// localPlayer.revealedTiles.includes(island.id) under fogOfWar for a non-Base tile's boats
// to render at all — see TileBoats.map.ts determineVisibility).

// occupants arrays below use index order [local/army0, opponent/army1, local/army2] so the
// component's post-filter index cycling (0->br, 1->tr, 2->tl) lands a boat on every corner
// under test, per ui-design.md's Final spec (states table).

export const resourceIslandWithTwoNodesAndThreeOccupants: /* Island */ unknown = {
  id: 'resource-two-three-occ', x: 2, y: 4, type: 'resource' /* IslandType.Resource */,
  resources: [/* two distinct ResourceType entries, amount 1 each, so toTileResourcesViewModel
                 expands to exactly 2 nodes -> DUAL_RESOURCE_SLOTS */],
  occupants: [
    { playerId: 0 /* localPlayerFixture.id */, armyId: 0 /* armyFixture.id */ },
    { playerId: 1 /* opponentPlayerFixture.id */, armyId: 1 },
    { playerId: 0, armyId: 2 /* secondArmyFixture.id */ },
  ],
  positionedBy: [],
};
// Mirror this shape for:
// - resourceIslandWithThreeNodesAndThreeOccupants (3 distinct resource types, amount 1 each -> TRIPLE_RESOURCE_SLOTS)
// - emptyIslandWithThreeOccupants (IslandType.Empty, same 3-occupant array, forces grove tree 1 next to the tl boat)
// - emptyIslandWithTwoOccupants (IslandType.Empty, occupants sliced to the first two entries only -> br, tr)
// Each needs a unique `id` and `{x,y}`, and must be added to gameStateFixture's `map` array
// and to localPlayerFixture.revealedTiles.
```

Implementer-a fills in the real `Island` fixture literals (exact `ResourceType`s, `x`/`y`, `id` strings) following the existing style in this file (see `resourceIsland`, `occupiedResourceIsland`); the pseudo-code above is the shape and occupant-array contract, not the literal file content.

## Phases
### Phase 1: Shared slot table, migration, fixtures, tests, docs
1. implementer-a creates `src/modules/map/island-tile-slots.types.ts` exactly as in Contracts. (sonnet)
2. tester-a creates `src/modules/map/island-tile-slots.test.ts` pinning every exported table's literal values (fails until step 1 exists — do this in parallel with/right after step 1, not blocked on steps 3-9).
3. implementer-a edits `TileResources.map.ts`, `TileBoats.types.ts`, `TileForest.types.ts`, `TileForest.map.ts`, `TileOccupants.hook.ts`, `TileOccupants.fixtures.ts`, `TileBoats.fixtures.ts` per the File plan. (sonnet)
4. tester-a updates `TileResources.map.test.ts` (corrected dual/triple values) and `TileForest.map.test.ts` (new grove left/right assertions).
5. implementer-a edits `IslandTile.fixtures.ts`: add `secondArmyFixture`, the 4 new islands, revealedTiles entries, and add the islands to `gameStateFixture.map`. (sonnet)
6. preview-a edits `TileBoats.preview.tsx`, `TileOccupants.preview.tsx` (import redirect) and `IslandTile.preview.tsx` (4 new states).
7. Run `npm run typecheck`, `npm run lint`, `npm test` across every touched file (not scoped to one directory).
8. `ui-verify` screenshots of all 17 `IslandTile.preview.tsx` states at 1280×720 and 390×844; confirm no overlap and no console error.
9. docs-sync rewrites `docs/architecture/systems-and-visuals.md` §6.13.

Model escalation: steps 1 and 3 (implementer-a's cross-component migration) run on sonnet per triage's override; step 5 (fixture/visibility wiring, non-obvious revealedTiles requirement) also sonnet.

## Test plan
- tester-a (logic, first):
  - `island-tile-slots.test.ts`: every exported constant's exact values (corner styles/transforms for all 4 corners; all 3 resource-count tables including the corrected 24% values; Base/Special/grove forest tables including the corrected grove values).
  - `TileResources.map.test.ts`: update the 2-node and 3-node-slot-1 `slotStyle` expectations to `left:'24%'`/`right:'24%'`; all badge-offset/size tests untouched (they don't depend on left/right literals).
  - `TileForest.map.test.ts`: add assertions that the 2-tree and 3-tree grove layouts have tree 1 at `left:'24%'` and (for the 3-tree case) tree 2 at `right:'24%'`, tree 3 unchanged at `left:'44%'`.
  - `TileBoats.map.test.ts`, `TileOccupants.hook.test.ts`: no new cases required (corner table values and consumer logic are unchanged); re-run existing suite to confirm the import-path change didn't break anything.
- tester-b (view and e2e):
  - `IslandTile.test.tsx`: no new case required unless it currently snapshots style values that moved (check before declaring done).
  - No e2e change: this is a presentation-only refactor, no new user flow.

## Preview states
- `IslandTile`: 4 new states — `Resource island, 2 nodes + occupants on all corners`, `Resource island, 3 nodes + occupants on all corners`, `Empty island, 3-tree grove + 3 occupants (br/tr/tl)`, `Empty island, 3-tree grove + 2 occupants (br/tr)` — using the new `IslandTile.fixtures.ts` islands. All 13 existing states re-verified for no regression.
- `TileBoats`, `TileOccupants`: no new states — only an import-path edit, verify their existing preview states still render.

- No file in this plan is owned by implementer-b or preview-b: this is a pure data-layer consolidation (types/maps/hooks/fixtures and one preview-state addition), no `.tsx`/`.styles.ts` changes. Both agents should report "no files to touch" rather than invent work.

## Risks
- `TileOccupants`' per-occupant fog filter (`TileOccupants.hook.ts:40-54`) can hide the opponent's soldier sprite on the new fixtures even though their boat renders (boats have no such filter). This only affects whether a rider sprite is visible, not the boat/resource/tree clearance the acceptance criteria test — not a blocker, but preview-a should note in the preview if a corner shows an empty boat.
- `IslandTile.fixtures.ts` is already 117 lines; adding 4 islands + 1 army + revealedTiles edits may approach the 150-line `max-lines` lint cap. Keep new entries single-line in the existing compact style (see `resourceIsland`, `occupiedResourceIsland`) to stay under budget; if it still doesn't fit, flag back to architect rather than splitting the file improvised.

## Review (architect-b)
VERDICT: APPROVED

Verified against the real files (not just the plan's claims):
- `TileResources.map.ts:27-80` (`SlotDef`, all four tables, `getSlot`), `TileBoats.types.ts:1-45`, `TileForest.map.ts:1-46`, `TileForest.types.ts:1-29`, `TileOccupants.hook.ts:1-75`, `TileOccupants.fixtures.ts`, `TileBoats.fixtures.ts`, `TileOccupants.preview.tsx`, `TileBoats.preview.tsx`, `TileBoats.map.ts`, `IslandTile.fixtures.ts` (117 lines, matches the plan's stated current length), `IslandTile.preview.tsx`, `IslandTile.tsx:93-118` all match the plan's cited line numbers and current contents exactly.
- `TileResources.map.test.ts:396` (`left:'14%'`/`right:'14%'`) and `:405,407` (`left:'12%'`) are the exact old values and locations the plan says to update; `TileForest.map.test.ts` has no existing `left`/`right` assertions, confirming the grove fix needs new coverage rather than an edit.
- Re-ran the architect's grep for `CORNER_TRANSFORMS|BOAT_CORNER_POSITIONS|CornerId|CornerPosition|TreeSlot|SlotDef` across `src/` (including non-component files) and `docs/`: every hit is a file already in the File plan (owner implementer-a or preview-a), with one exception below.
- `docs/architecture/systems-and-visuals.md` §6.13 exists starting at the header the plan describes editing; its current text is the four separately-tuned coordinate-set description the plan says to replace.
- `Army` type (`src/lib/types/player.ts:13-17`) matches the `secondArmyFixture` shape in Contracts exactly; no invented fields.

Finding (non-blocking, fold in during implementation):
- `src/modules/map/components/TileBoats/index.ts:4-5` re-exports `BOAT_CORNER_POSITIONS`, `CORNER_TRANSFORMS`, `CornerId`, `CornerPosition` from `./TileBoats.types`, same as `TileBoats.map.ts`'s import — not listed in the File plan. No edit is actually needed: the plan's new `TileBoats.types.ts` re-exports these same four names from the shared file, so this file's re-export chain still resolves, exactly the reasoning already given for `TileBoats.map.ts`. implementer-a should verify it (quick `npm run typecheck`) rather than skip it, since it's an importer the architect's grep should have listed alongside `TileBoats.map.ts`.

Design: one shared file at the module root, re-exports preserving existing import paths, and `getSlot` staying local are all the simplest options available — no simpler alternative found. Phases are appropriately scoped for parallel tester-a/preview-a work after implementer-a's step 1.
