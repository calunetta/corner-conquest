# Plan: Remove ghost boat lingering at base after army departs

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] Once a player's last army leaves their Base tile, no boat renders at the Base until an army of theirs is physically stationed there again.
- [ ] A boat still renders correctly at whichever island an army currently occupies (unchanged — this path already works).
- [ ] At match start, before the player has deployed/moved any army away from base, the Base boat still renders (current "start anchored" behavior for the initial army sitting at base is preserved, since that's just the normal occupant-tied boat, not the fallback).

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `toTileBoatsViewModel` | `src/modules/map/components/TileBoats/TileBoats.map.ts:32-122` | The mapper that decides which boats render on a tile. |
| occupant-tied boats | `TileBoats.map.ts:75-86` (`if (occupants.length > 0) ...`) | Correct, unaffected path: renders one boat per army physically on the tile, keyed to the army. This already covers an army sitting at its own base. |
| base fallback | `TileBoats.map.ts:87-94` (`else if (baseOwner) ...`) | **Root cause.** Fires whenever the Base tile has zero occupants — i.e. permanently, as soon as the owner's starting army moves anywhere else, since nothing ever makes `baseOwner` false or re-checks whether the player still has zero armies total. This is the ghost boat. |
| `TileBoats.map.test.ts` | `src/modules/map/components/TileBoats/TileBoats.map.test.ts` | Existing tests likely assert the current (buggy) fallback renders a boat when occupants are empty — will need updating to assert it does NOT render once the player has moved away. |

## Root cause
`TileBoats.map.ts`'s `else if (baseOwner)` branch renders a boat at the Base purely from `occupants.length === 0`, with no check on whether the owning player has ever moved an army away. The branch was presumably meant to show the boat before the player's first move, but it also fires — identically — after their only army has permanently left, since both situations look the same from this function's inputs (zero occupants on this tile). There's no state distinguishing "never left" from "left and gone."

## Decisions
- Delete the `else if (baseOwner)` fallback branch entirely. The occupant-tied branch (`occupants.length > 0`) already renders the owner's boat correctly when their army is sitting at the base (e.g. at match start, or if they return home). Once the army leaves, no boat renders at the base — matching "the boat follows the army" per `docs/README.md` §6.12's own stated intent, and matching the user's complaint directly.
  - Rejected: track a `hasEverLeftBase` flag per player to distinguish start-of-game from after-departure — adds persistent state for a purely cosmetic rule when deleting the fallback already produces the correct visual in both cases (the starting army sitting at base is still covered by the occupant branch).
  - Flag for the user/UI designer only if, once previewed, an empty base with zero armies at home for several turns looks too bare — in which case a static (non-player-colored) empty-dock sprite could be added later as its own small follow-up, not blocking this bug fix.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `src/modules/map/components/TileBoats/TileBoats.map.ts` | edit | Remove the `baseOwner`/`isBasePositioned`/`else if` fallback block and the now-unused `isBase`/`baseOwner` lookups if nothing else in the file needs them. | implementer-b |
| `src/modules/map/components/TileBoats/TileBoats.map.test.ts` | edit | Replace/remove the test(s) asserting a boat renders at an empty base; add a test asserting no boat renders at a Base tile with zero occupants once at least one army exists elsewhere for that player. | implementer-b |
| `src/modules/map/components/TileBoats/TileBoats.test.tsx` | edit | Four tests build a Base island with `occupants: []` and rely on the deleted fallback: `renders docked boat on player base at game start` (L86-103), `anchors a parked base boat...` (L185-204), `renders the idle collector inside its own hull...` (L227-243), and both "mobile collector gating" tests (L264-278) via the shared `parkedBaseIsland` fixture (L247-255). Rebuild each with the base island occupied by the owner's own army (`occupants: [{ playerId: 0, armyId: 0 }]`) so they assert the correct, unaffected occupant-tied branch instead of the deleted fallback — this is the same scenario ("army sitting at its own base") the plan's Decision already says the occupant branch covers. Add one new test: a Base island with `occupants: []` renders no boat (`toTileBoatsViewModel` returns `null`). | implementer-b |
| `src/modules/map/components/TileBoats/TileBoats.hook.test.ts` | edit | `returns boats for base tile` (L17-32) and `updates boats when island prop changes` (L170-200, asserts `boats!.length).toBe(1)` for `island1`) both use a Base island with `occupants: []` and rely on the deleted fallback. Give each island an occupant (`occupants: [{ playerId: 0, armyId: 0 }]`) matching `bluePlayer`'s army from `TileBoats.fixtures.ts`, so the assertions hold through the occupant-tied branch. | implementer-b |
| `src/modules/map/components/TileBoats/TileBoats.preview.tsx` | edit | Add a preview state built from `toTileBoatsViewModel` (not a raw `boats={null}` literal, unlike the existing `'Empty (no boats)'` state at L87-90) called against the existing `baseIsland` fixture (`occupants: []`, from `TileBoats.fixtures.ts:23-32`) with `[bluePlayer, redPlayer]` and `bluePlayer`, mirroring the `contestedBaseBoats` pattern at L68/104-106. This makes the fixed "army moved away from base" case visually checkable, not just asserted by unit tests. | preview-a |
| `docs/architecture/systems-and-visuals.md` | edit | Lines 110-111 ("begins anchored", "Player Base tiles start with the owner's boat anchored") describe only the start-of-game state and stay accurate; add one sentence to the "Shoreline Boat Docking System" bullet stating the boat disappears once the owner's last army leaves the base — it is not a permanent base fixture. This disambiguates the "Rebalanced Base Tile Layout" bullet (L115-116), which lists "anchored shoreline boat" among the base's visual elements in a way that could otherwise be read as always-present (the bug this task fixes). | docs-sync |

## Contracts
No change to `BoatEntryViewModel` or the function signature of `toTileBoatsViewModel` — this is a pure deletion inside the existing function body.

## Phases
### Phase 1: fix + verify
1. Remove the fallback branch and dead lookups in `TileBoats.map.ts`. (implementer-b)
2. Update `TileBoats.map.test.ts` to match: replace the empty-base-renders-a-boat case with one asserting `null`. (implementer-b)
3. Fix the four now-broken tests in `TileBoats.test.tsx` and the two in `TileBoats.hook.test.ts` per the File plan (rebuild each Base-tile case with an occupant instead of relying on the deleted fallback). (implementer-b)
4. `npm run typecheck && npm run lint && npm test`. (implementer-b)
5. Add the new `TileBoats.preview.tsx` state built from `toTileBoatsViewModel` against the empty-occupants `baseIsland` fixture. (preview-a)
6. Browser check: open the new `TileBoats.preview.tsx` testbed state (and/or a live match) with an army moved away from base; confirm no boat remains at the base tile, and that the boat appears correctly at the army's new tile. (preview-a, preview-b per `ui-verify`)
7. Add one clarifying sentence to `docs/architecture/systems-and-visuals.md`'s "Shoreline Boat Docking System" bullet per the File plan. (docs-sync)

Model escalation: none expected.

## Test plan
- `TileBoats.map.test.ts`: base tile with an owner-army occupant → boat renders (occupant branch, unchanged). Base tile with zero occupants → no boat (new case, replaces the deleted fallback's test). Base tile whose owner's army moved to another island → no boat at base, boat renders at the new island. Multiple players sharing a non-base island → each still gets a distinct corner (unchanged, already covered by existing tests).
- `TileBoats.test.tsx` / `TileBoats.hook.test.ts`: the four/two tests listed in the File plan, rebuilt to occupy the Base island with the owner's own army rather than relying on zero-occupant fallback behavior.

## Preview states
- `TileBoats`: new state "Empty base, army away" — `toTileBoatsViewModel` against the `baseIsland` fixture (`occupants: []`) — alongside the existing "army at base" (to be rebuilt as occupant-tied) and "army on resource island" states.

## Risks
- Low — isolated deletion, covered by existing unit tests plus one new case.

## Review (architect-b)
VERDICT: CHANGES REQUESTED

Verified: `TileBoats.map.ts:63-64,75-94` matches the cited root cause exactly (occupant branch `75-86`, `else if (baseOwner)` fallback `87-94`). `IslandTile.map.ts`'s own `baseOwner` (base sprite background, not boats) is a separate concern, correctly left untouched.

Findings:

1. File plan omits two test files that construct a Base island with `occupants: []` and assert a boat renders — they will break the moment the fallback is deleted and must be owned by implementer-b alongside `TileBoats.map.test.ts`:
   - `src/modules/map/components/TileBoats/TileBoats.test.tsx`: `renders docked boat on player base at game start` (L86-103), `anchors a parked base boat...` (L185-204), `renders the idle collector inside its own hull...` (L227-243), and both `mobile collector gating` tests (L264-278, via `parkedBaseIsland` L247-255).
   - `src/modules/map/components/TileBoats/TileBoats.hook.test.ts`: `returns boats for base tile` (L17-32) and `updates boats when island prop changes` (L170-200, asserts `boats!.length).toBe(1)` for `island1` with `occupants: []`).
   Fix: add both files to the File plan, owner implementer-b. Each needs its base-with-zero-occupants case either removed or rewritten to assert `boats` is `null`/the base case explicitly uses a seeded occupant instead (matching the file's own intent — e.g. "army at base" should construct the island with `occupants: [{ playerId: 0, armyId: 0 }]`, not rely on the deleted fallback).

2. Preview states section asks for a state showing "army moved away from base" built from the real map function (same pattern as `TileBoats.preview.tsx:68,104-106`'s `contestedBaseBoats`), but the File plan doesn't list `TileBoats.preview.tsx` as a file to edit. None of the file's current states cover this: `'Empty (no boats)'` (L87-90) passes `boats={null}` directly, it isn't derived from `toTileBoatsViewModel` against a Base island with zero occupants. Fix: add `TileBoats.preview.tsx` to the File plan (owner implementer-b, or preview-a/b per the pipeline — whichever stage edits preview files in this pipeline), adding a state that calls `toTileBoatsViewModel` on a Base island with `occupants: []` so the fix is visually checkable, not just asserted by unit tests.

3. Docs: `docs/architecture/systems-and-visuals.md:104-116` ("Shoreline Boat Docking System") documents only the start state ("begins anchored", "Base tiles start with the owner's boat anchored") and a "Rebalanced Base Tile Layout" bullet (L115-116) that lists "anchored shoreline boat" among the base's permanent visual elements — ambiguous enough to read as describing today's (buggy) always-anchored behavior. CLAUDE.md requires `docs-sync` whenever a bug fix changes documented behavior, but `triage.md`'s pipeline (line 6) has no `docs-sync` stage. Fix: either confirm in the plan that L104-116 doesn't actually assert persistence after departure (so no doc change is required) and say so explicitly, or add one sentence to that section stating the boat disappears once the owner's last army leaves the base, and add `docs-sync` to the pipeline for this phase.

Not a blocker, fold in: triage.md's open-question framing ("flag to the user/UI designer only if too empty") is fine as-is and doesn't need a plan change.

Everything else checks out: root-cause analysis, decision to delete rather than add a flag, contracts (no signature change), and risk assessment are sound and match the simplest fix.

### Response to review
1. Addressed — `TileBoats.test.tsx` and `TileBoats.hook.test.ts` added to the File plan, owner implementer-b, with the exact tests/fixtures to rebuild (occupant-tied instead of fallback-tied) listed per file.
2. Addressed — `TileBoats.preview.tsx` added to the File plan, owner preview-a (this pipeline's dedicated preview stage), with the exact fixture (`baseIsland`, `occupants: []`) and pattern (`toTileBoatsViewModel`, mirroring `contestedBaseBoats`) to use.
3. Addressed via the second option — added one clarifying sentence to the File plan for `docs/architecture/systems-and-visuals.md` (owner docs-sync) and added `docs-sync` to `triage.md`'s pipeline.

### Re-review (architect-b)
VERDICT: APPROVED

Confirmed all three findings fixed in `plan.md`'s File plan (L32-35) and `triage.md`'s pipeline (L6, now includes `docs-sync` before `architect-b:final-review`):
1. `TileBoats.test.tsx` and `TileBoats.hook.test.ts` entries (L32-33) name the exact tests and the exact fixture change (`occupants: [{ playerId: 0, armyId: 0 }]`). Verified `bluePlayer` (built via `buildPlayer` in `src/modules/map/board-context.fixtures.ts:16`, `id: 0`) defaults to `armies: [{ id: 0, ... }]`, so `armyId: 0` for `playerId: 0` is correct and will hit the still-valid occupant-tied branch, not reintroduce the deleted fallback.
2. `TileBoats.preview.tsx` entry (L34) owner preview-a, which is in the pipeline; fixture and pattern match the existing `contestedBaseBoats` precedent at `TileBoats.preview.tsx:68,104-106`.
3. `docs/architecture/systems-and-visuals.md` entry (L35) owner docs-sync, with the exact sentence to add specified; `docs-sync` is now in `triage.md:6`'s pipeline ahead of final review. The doc file itself is unchanged as of this review — correct, since docs-sync hasn't run yet; the File plan now carries the instruction forward.

No new issues found. Plan is approved for implementation.
