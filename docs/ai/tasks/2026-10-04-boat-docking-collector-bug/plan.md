# Plan: Fix boat corner collision on contested Base tiles

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] On a Base tile occupied by 2+ armies (owner's own army plus one or more attackers, or multiple attackers), each army's boat renders at a distinct shore corner — no two boats share the same `cornerStyle`.
- [ ] Existing boat behavior is unchanged for: empty tiles, base tiles with a single occupant, non-base tiles with multiple occupants, idle-collector visibility, fog of war.
- [ ] `docs/README.md` §6.12's collector-farming bullet (lines 427-431) is split so each sentence is attributed to the component that actually implements it (`TileOccupants.tsx` for persistent visibility, `TileResources.tsx` for active farming, `TileBoats.tsx` for the idle collector and base-boat anchoring), and the shore corner numbering lists the order the code actually uses.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `toTileBoatsViewModel` | `src/modules/map/components/TileBoats/TileBoats.map.ts:32` | Builds one `BoatEntryViewModel` per occupant/base-owner; calls `getCornerPosition` per entry. |
| `getCornerPosition` | `src/modules/map/components/TileBoats/TileBoats.map.ts:101-113` | Root cause: for `isBaseTile === true` it ignores `entryIndex` and keys the corner only on `ownerId`. |
| call site | `src/modules/map/components/TileBoats/TileBoats.map.ts:116` | `getCornerPosition(index, isBase, baseOwner?.id)` — `baseOwner?.id` is constant across all entries of one tile, `isBase` is constant per tile, only `index` varies, but `index` is discarded by the Base-tile branch. |
| `BOAT_CORNER_POSITIONS` | `src/modules/map/components/TileBoats/TileBoats.types.ts:3-8` | Order is `[br, tr, tl, bl]` (index 0 = bottom-right), not `[bl, br, tl, tr]` as `docs/README.md:441-444` currently states. |
| occupants seeded at setup | `src/modules/game-rules/game-setup.reducer.ts:70,96` | `creatorTile.occupants = [{ playerId: creatorSeatIndex, armyId: ... }]` (same for bots) — every Base tile has `occupants.length >= 1` from turn one, so `toTileBoatsViewModel`'s `occupants.length > 0` branch (`TileBoats.map.ts:75-86`) runs for Base tiles in normal play; the `else if (baseOwner)` fallback (`TileBoats.map.ts:87-95`) is unreachable once a base has any occupant, i.e. always, after setup. |
| `baseIslandWithOccupants` fixture | `src/modules/map/components/TileBoats/TileBoats.fixtures.ts:33-45` | Already an unused fixture of exactly the bug scenario: `IslandType.Base`, `owner: 0`, two occupants (`playerId: 1`, `playerId: 2`). Reuse it for the new test instead of inventing data. |
| farming collector overlay | `src/modules/map/components/TileResources/TileResources.map.ts:108-141`, rendered at `src/modules/map/components/TileResources/TileResources.tsx:35-46` | Correctly implemented and tested; `docs/README.md:427` wrongly attributes this to `TileOccupants.tsx`. |
| `TileOccupants` hook | `src/modules/map/components/TileOccupants/TileOccupants.hook.ts:22-81` | Renders only each army's own persistent sprite (`PLAYER_DATA[player.color]?.sprite.idle`); has no collector, no `positionedBy` read, no idle/farming branching. The triage note "`TileOccupants` has its own idle-vs-farming logic" is not supported by the code — ruled out as a cause. |
| `Island.positionedBy` | `src/lib/types/map.ts:34` | `{ playerId: number; resource: ResourceType }[]` — read by both `TileBoats.map.ts:78` and `TileResources.map.ts:110`; the two reads are consistent (idle on boat XOR farming on the matching resource node), not duplicated logic to fix. |
| docs drift | `docs/README.md:427, 439-444` | §6.12 misattributes the collector-farming bullet to `TileOccupants.tsx` and lists corner order `Bottom-Left, Bottom-Right, Top-Left, Top-Right`; code order is `Bottom-Right, Top-Right, Top-Left, Bottom-Left`. Code wins; docs updated in this phase. |

## Root cause (bugs only)
- Reproduction (failing test to add first): a `Base` island with `owner: 0` and two occupants (reuse `baseIslandWithOccupants` fixture, `TileBoats.fixtures.ts:33`, or an equivalent two-occupant Base island) run through `toTileBoatsViewModel` returns 2 boat entries whose `cornerStyle` are identical — both equal `BOAT_CORNER_POSITIONS[baseCornerMap[0]]` — because both entries are passed the same `ownerId` (`baseOwner?.id`, always the tile owner, regardless of which occupant the entry is for).
- Cause: `getCornerPosition` (`TileBoats.map.ts:101-113`) branches on `isBaseTile` and, when true, computes `cornerIdx` purely from `ownerId` via `baseCornerMap`, never consulting `entryIndex`. Every Base tile has at least one occupant from the moment the game is set up (`game-setup.reducer.ts:70,96`), so any Base tile with 2+ occupants — a defender plus one or more attackers, or multiple attackers after the defender is gone — renders all of its boats (and their idle-collector overlays, when shown) stacked on the exact same corner, visually overlapping/hiding each other. This matches the triage symptom "boats ... not showing up or behaving correctly."
- `baseCornerMap` itself is additionally inconsistent even for its intended single-owner case: `{ 0: 0, 1: 1, 2: 1, 3: 3 }` maps both owner id 1 and owner id 2 to corner index 1, and never uses corner index 2 — further evidence this mapping was never exercised against more than one occupant.

## Decisions
- Delete the Base-tile special case in `getCornerPosition` and assign every boat entry's corner the same way, `BOAT_CORNER_POSITIONS[entryIndex % BOAT_CORNER_POSITIONS.length]`, regardless of tile type, because it is the simplest fix that guarantees distinct corners per entry (matches `docs/README.md`'s own requirement: "Multiple players or armies occupying the same island receive separate corners without visual collision") and this exact logic already exists and is tested for non-base tiles (`TileBoats.map.test.ts`, "assigns corners by entryIndex for non-base tiles"). Rejected: keep `baseCornerMap` but index it per-entry by each entry's own `player.id` instead of the fixed `baseOwner.id` (would fix the collision but keeps a second, redundant corner-selection scheme with no behavioral requirement that a player's corner be tied to their id — adds complexity the acceptance criteria don't need).
- Remove the now-unused `isBaseTile`/`ownerId` parameters and the `baseCornerMap` constant from `getCornerPosition` rather than leaving dead branches, per KISS/DRY.
- Fix `docs/README.md` §6.12 in this phase (CLAUDE.md principle 6): the collector-farming bullet at lines 427-431 spans three different components under one `(TileOccupants.tsx)` heading, so split it instead of relabeling it wholesale — keep a `TileOccupants.tsx` bullet with only L428 (persistent visibility); fold L429 (active farming collector) into the already-correct `Active Collector Farming` bullet under `TileResources.tsx` at L426 (it already says almost the same thing); fold L430-431 (idle collector + base-boat anchoring) into the existing `Shoreline Boat Docking System (TileBoats.tsx)` bullet at L439, since that logic lives in `TileBoats.map.ts` alongside the corner-assignment code that bullet already documents. Also correct the corner-numbering list (L441-444) to match `BOAT_CORNER_POSITIONS`' actual order. Rejected: rename the single bullet's heading from `(TileOccupants.tsx)` to `(TileResources.tsx)` (architect-b review: fixes the farming-collector sentence but makes the persistent-visibility and idle-collector sentences wrong instead — trades one inaccurate attribution for another). Rejected: leave docs as-is and treat this as out of scope — triage explicitly flagged the docs section as describing behavior that must work, so its inaccuracies must not mislead the next agent who touches this code.
- No change to `TileOccupants.tsx`/`.hook.ts` or `TileResources.*`: both already work correctly against `positionedBy`; no evidence in the code supports the triage's "both independently derive overlapping state" concern once the farming-collector logic is correctly located in `TileResources`, not `TileOccupants`.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/map/components/TileBoats/TileBoats.map.ts` | edit | Simplify `getCornerPosition` to `(entryIndex: number)`, always returning `BOAT_CORNER_POSITIONS[entryIndex % BOAT_CORNER_POSITIONS.length]`; remove `baseCornerMap` and the `isBaseTile`/`ownerId` params; update the call site at line 116 to `getCornerPosition(index)`. | implementer-a |
| `src/modules/map/components/TileBoats/TileBoats.map.test.ts` | edit | Add a test reproducing the Base-tile collision (2 occupants on a Base island get distinct `cornerStyle`s) before the fix lands; update the stale comment in the existing "assigns corners correctly for base tile by owner id" test (it currently references the removed `baseCornerMap`) to describe entry-index-based assignment instead. | tester-a |
| `docs/README.md` | edit | §6.12: split the mis-attributed collector-farming bullet (lines 427-431) by component instead of relabeling it — see "Docs edit (exact text)" below for the precise before/after; and correct the corner list (lines 441-444) to `Corner 0: Bottom-Right`, `Corner 1: Top-Right`, `Corner 2: Top-Left`, `Corner 3: Bottom-Left`. | implementer-a |

No view, style, hook, fixture, or preview files change: the fix is confined to one pure function's corner-selection logic, and the existing `TileBoats.preview.tsx` / `TileBoats.fixtures.ts` states (`twoBoatsFixture`, `allCornersBoatsFixture`) already construct `BoatEntryViewModel[]` directly with distinct `cornerStyle`s per entry — they never exercised the buggy code path and don't need new states to demonstrate the fix. No `IslandTile.tsx` wiring changes: the bug is entirely inside `toTileBoatsViewModel`.

### Docs edit (exact text)
Replace `docs/README.md:426-431`, currently:
```
  - **Active Collector Farming:** Stationed collectors (`/sprites/farm_${player.color}.gif`) harvest directly on top of the specific resource node they are assigned to.
- **Persistent Soldier / Knight Visibility & Collector Farming (`TileOccupants.tsx`)**:
  - Army soldiers / knights remain **persistently visible** on island tiles at all times, ensuring commanders and opponents always have complete situational awareness of garrisoned forces.
  - When an army is positioned to harvest a resource, the active farming collector (`/sprites/farm_${player.color}.gif`) harvests directly at that specific resource node while the soldier remains stationed on the island.
  - When an army is occupying an island without being positioned on a resource, an idle faction collector (`/sprites/collector_${player.color}_idle.gif`) waits docked at the shoreline boat.
  - Player Base tiles start with the owner's boat anchored in the water canal and idle collector.
```
with:
```
  - **Active Collector Farming:** Stationed collectors (`/sprites/farm_${player.color}.gif`) harvest directly on top of the specific resource node they are assigned to. When an army is positioned to harvest a resource, the active farming collector harvests directly at that specific resource node while the soldier remains stationed on the island.
- **Persistent Soldier / Knight Visibility (`TileOccupants.tsx`)**:
  - Army soldiers / knights remain **persistently visible** on island tiles at all times, ensuring commanders and opponents always have complete situational awareness of garrisoned forces.
```
Leave lines 432-438 (`Extra Move Card Mechanics`, `Automatic Turn Completion`) unchanged.

Then insert the idle-collector/base-boat-anchoring sentences into the existing `Shoreline Boat Docking System (TileBoats.tsx)` bullet. Currently (`docs/README.md:439-445`):
```
- **Shoreline Boat Docking System (`TileBoats.tsx`)**:
  - Each island features 4 discrete shore corner anchors:
    - Corner 0: Bottom-Left
    - Corner 1: Bottom-Right
    - Corner 2: Top-Left
    - Corner 3: Top-Right
  - Every player's expedition boat (`/sprites/boat.gif`) begins anchored to their home Base shoreline.
```
Replace with:
```
- **Shoreline Boat Docking System (`TileBoats.tsx`)**:
  - Each island features 4 discrete shore corner anchors:
    - Corner 0: Bottom-Right
    - Corner 1: Top-Right
    - Corner 2: Top-Left
    - Corner 3: Bottom-Left
  - Every player's expedition boat (`/sprites/boat.gif`) begins anchored to their home Base shoreline.
  - When an army is occupying an island without being positioned on a resource, an idle faction collector (`/sprites/collector_${player.color}_idle.gif`) waits docked at the shoreline boat. Player Base tiles start with the owner's boat anchored in the water canal and idle collector.
```
(The line after this bullet, "When an army is landed on an island, their boat docks at the first available corner...", is unchanged and stays directly below.)

## Contracts
```ts
// src/modules/map/components/TileBoats/TileBoats.map.ts
// BEFORE (buggy):
function getCornerPosition(
  entryIndex: number,
  isBaseTile: boolean,
  ownerId?: number,
): (typeof BOAT_CORNER_POSITIONS)[number] { /* ... */ }

// AFTER (contract for this fix):
function getCornerPosition(entryIndex: number): (typeof BOAT_CORNER_POSITIONS)[number] {
  return BOAT_CORNER_POSITIONS[entryIndex % BOAT_CORNER_POSITIONS.length];
}

// Call site (TileBoats.map.ts ~line 116), update from:
//   const corner = getCornerPosition(index, isBase, baseOwner?.id);
// to:
//   const corner = getCornerPosition(index);

// No other exported signature changes. toTileBoatsViewModel's return type
// (BoatEntryViewModel[] | null, from TileBoats.types.ts:14-20) is unchanged.
```

## Phases
### Phase 1: Fix corner collision
1. tester-a: in `TileBoats.map.test.ts`, add a failing test — Base island, `owner: 0`, two occupants (e.g. reuse `baseIslandWithOccupants` from `TileBoats.fixtures.ts:33`, or construct `occupants: [{ playerId: 0, armyId: 0 }, { playerId: 1, armyId: 1 }]` inline with `mockPlayers`) — asserting `result!.length === 2` and `result![0].cornerStyle` does not equal `result![1].cornerStyle`. Run it and confirm it fails against the current code (sonnet: no, mechanical).
2. implementer-a: apply the `getCornerPosition` simplification exactly as in Contracts. Run the new test and confirm it now passes (sonnet: no, mechanical — the fix is a 10-line deletion plus a 2-line function body).
3. tester-a: update the comment in the pre-existing "assigns corners correctly for base tile by owner id" test that references `baseCornerMap`, since that constant no longer exists; the assertion itself (`cornerStyle` is defined) still holds and needs no behavior change.
4. implementer-a: apply the two `docs/README.md` §6.12 corrections from the File plan.

Model escalation: none — this is a bounded logic deletion with existing test coverage patterns to follow.

## Test plan
- tester-a (logic, first):
  - New: Base island with 2 occupants → 2 boat entries with distinct `cornerStyle` (reproduces and then verifies the fix).
  - Existing, must still pass unmodified in behavior: single-occupant Base tile idle collector (`docks owner boat on base tile with idle collector`), 2-occupant non-base tile distinct corners (`assigns corners by entryIndex for non-base tiles`), idle collector hidden when positioned (`hides idle collector when army is positioned on a resource`), all fog-of-war/visibility cases, unique boat keys, no-mutation test.
  - Comment-only update: `assigns corners correctly for base tile by owner id` keeps its assertion, drops the `baseCornerMap` reference in its comment.
- tester-b (view and e2e): none planned — no `.tsx`/`.styles.ts` change in this fix, and the bug is not reachable from a single-player local flow worth a new e2e spec at tier M. If `npm run test:e2e` already covers a multi-army base siege scenario, re-run it as a regression check only; do not author a new spec.

## Preview states
- No new preview states required: `TileBoats.preview.tsx`'s `allCornersBoatsFixture` and `twoBoatsFixture` already render 2-4 boats at distinct corners directly from hand-built `BoatEntryViewModel`s (`TileBoats.preview.tsx:9-49`), which is what the fixed `toTileBoatsViewModel` will now also produce for a contested Base tile. preview-a: confirm (don't recreate) these existing states still render correctly after the fix — `npm run dev` → `/testbed` → "Tile Boats" group, "Two boats" and "All four corners" states.

## Risks
- None beyond standard regression risk, mitigated by the existing `TileBoats.map.test.ts` suite plus the new test in step 1.

## Review (architect-b)
VERDICT: APPROVED

Re-reviewed the revised "Docs edit (exact text)" section against the live `docs/README.md`:
- "Before" block for the first edit (plan lines 47-53) matches `docs/README.md:426-431` verbatim, including indentation — confirmed by direct read.
- "After" block (plan lines 57-59): folds L429's sentence into the existing `Active Collector Farming` sub-bullet at L426 (stays correctly under the `TileResources.tsx` header bullet, L419), and shrinks the `TileOccupants.tsx` bullet to only L428 (persistent visibility). No content lost, no duplication introduced. Minor nit, non-blocking: the merged bullet now says "harvest directly on top of the specific resource node" and, one sentence later, "harvests directly at that specific resource node" — redundant phrasing implementer-a may tighten in passing, but it is not a factual error and doesn't block approval.
- "Before" block for the second edit (plan lines 65-71) matches `docs/README.md:439-445` verbatim; plan correctly notes line 446 ("When an army is landed...") is unchanged and unaffected — confirmed by direct read.
- "After" block (plan lines 75-82): corrects the corner list to `Bottom-Right, Top-Right, Top-Left, Bottom-Left`, matching `BOAT_CORNER_POSITIONS`' actual array order (`TileBoats.types.ts:3-8`), and relocates the idle-collector/base-boat-anchoring sentences (verbatim from the removed L430-431) into the `TileBoats.tsx` bullet, which is where that logic actually lives (`TileBoats.map.ts:70-95,117`). Correctly attributed, no information dropped.
- Goal criterion (line 9), Decisions (line 33) and File plan row 3 (line 41) are consistent with each other and with the exact-text section; no stale references to the rejected wholesale-rename approach remain in the active plan (only in the superseded review below, kept for history).
- Everything verified in the prior round (root cause, `getCornerPosition`, fixtures, test file contents, setup reducer, `TileOccupants.hook.ts` having no collector logic) is unchanged and still holds.

Plan approved. Proceed to tester-a (Phase 1, step 1).

### Prior round (resolved)
VERDICT: CHANGES REQUESTED — addressed above (Goal criterion, Decisions, File plan docs row, and new "Docs edit (exact text)" section now split the bullet by component instead of relabeling it wholesale).

- `docs/README.md:427` fix as written (File plan row 3, Decisions line 33) renames the whole bullet heading from `(TileOccupants.tsx)` to `(TileResources.tsx)`. Read in full, that bullet (lines 427-431) covers three different components, not one:
  - L428 "Army soldiers / knights remain persistently visible" — genuinely `TileOccupants.tsx` (confirmed: `TileOccupants.hook.ts:22-81` renders the persistent idle sprite per occupant).
  - L429 "active farming collector ... harvests directly at that specific resource node" — genuinely `TileResources.tsx` (confirmed: `TileResources.map.ts:108-141`, `TileResources.tsx:35-46`, `farmingCollector`).
  - L430-431 "idle faction collector ... waits docked at the shoreline boat" / "Base tiles start with the owner's boat anchored ... and idle collector" — genuinely `TileBoats.tsx` (confirmed: `showIdleCollector`/`idleCollectorSprite` computed in `TileBoats.map.ts:70-95,117`, not in `TileOccupants.hook.ts`, which has no idle/farming branching at all).

  Renaming the single heading to `TileResources.tsx` fixes the attribution for L429 but makes L428, L430 and L431 wrong in the opposite direction — it trades one inaccurate heading for another, which fails the acceptance criterion as written ("§6.12 correctly attributes the farming-collector overlay... "; CLAUDE.md principle 6 requires docs stay true, not just differently wrong). Fix: split the bullet by component instead of relabeling it wholesale — e.g. keep a `TileOccupants.tsx` bullet with only L428 (persistent visibility), fold L429 into the existing `Active Collector Farming` bullet already under `TileResources.tsx` at L426 (it already says almost the same thing and is already correctly attributed), and fold L430-431 (idle collector + base boat anchoring) into the existing `Shoreline Boat Docking System (TileBoats.tsx)` bullet at L439, since the idle-collector logic lives in `TileBoats.map.ts` alongside the corner logic that bullet already documents. Update the File plan's docs row and Decisions line 33 accordingly; implementer-a needs the corrected row before touching `docs/README.md`.

Everything else verified and correct:
- `getCornerPosition`/call site lines, `BOAT_CORNER_POSITIONS` order, `baseCornerMap` values and the base-tile bug mechanism: confirmed byte-for-byte in `TileBoats.map.ts:62-116` and `TileBoats.types.ts:3-8`.
- `baseIslandWithOccupants` fixture (owner 0, occupants playerId 1 and 2) at `TileBoats.fixtures.ts:33-45`: confirmed, matches the described repro.
- `game-setup.reducer.ts:70,96`: confirmed every base tile seeds one occupant at setup, so the `else if (baseOwner)` fallback branch is unreachable after setup as claimed.
- `TileOccupants.hook.ts:22-81` has no collector/positionedBy logic, ruling out the triage's "TileOccupants has its own idle-vs-farming logic" — confirmed, no mention of `positionedBy` or collector sprites in that file.
- Existing tests `TileBoats.map.test.ts:191-207` (`baseCornerMap[0]` comment, asserts only `cornerStyle` defined) and `:209-228` (asserts distinct corners for non-base) match the plan's description; the fix doesn't regress the single-occupant tests at `:8-23` and `:49-64`, which assert `.color`/`.showIdleCollector`, never `.cornerStyle`.
- Corner-numbering correction (L441-444: Bottom-Right/Top-Right/Top-Left/Bottom-Left) matches `BOAT_CORNER_POSITIONS` array order exactly.
- File plan owners, phases and test plan are otherwise sound: single root-cause fix, test-first ordering, no unnecessary file touches, no new preview states needed (justified against actual fixture file).
