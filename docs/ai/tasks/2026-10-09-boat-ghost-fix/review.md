# Final review: Remove ghost boat lingering at base after army departs, phase 1/1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: passes clean (`tsc --noEmit`, no output).
- `npm run lint`: passes clean (`eslint . --max-warnings 0 --no-error-on-unmatched-pattern`, no output).
- `npm test`: `Test Suites: 2 failed, 179 passed, 181 total` / `Tests: 1982 passed, 1982 total`. The 2 failing suites (`.agents/skills/caveman-learn/tests/skill-file.test.mjs`, `.agents/skills/caveman-explore/tests/skill-file.test.mjs`) fail with "Your test suite must contain at least one test" — pre-existing, unrelated to this task (no uncommitted changes under `.agents/`, last touched in commit `374721a`, before this task started). All 1982 real tests, including every `TileBoats`/`TileOccupants` test, pass.
- Scoped run: `npx jest src/modules/map/components/TileBoats src/modules/map/components/TileOccupants` → `Test Suites: 5 passed, 5 total`, `Tests: 83 passed, 83 total`.
- ui-verify: reviewed `test-results/ui-verify/testbed-tile-boats-state-Empty-20base-2C-20army-20away-20-real-20map-20function--desktop.png` and `--mobile.png` (new "Empty base, army away" preview state) — both show the tile box with no boat rendered, at both widths. Compared against `testbed-tile-boats-state-Contested-20base-20-real-20map-20function--desktop.png` to confirm the unaffected occupant-tied path still renders two boats at distinct corners.

## Plan adherence
- Goal/acceptance criterion 1 ("no boat renders at Base once owner's last army leaves, until an army returns") — met. `TileBoats.map.ts` diff deletes the entire `else if (baseOwner)` fallback branch (previously lines 87-94) and the now-dead `isBase`/`baseOwner` lookups (previously lines 63-64); `IslandType` import still used by `determineVisibility` (`TileBoats.map.ts:23`), not left dangling.
- Criterion 2 (occupant-tied boat rendering unchanged) — met. Occupant branch (`occupants.length > 0`) untouched; verified via the "Contested base" preview screenshot still showing two boats, and `TileOccupants` tests (which share corner-alignment logic with `toTileBoatsViewModel`) all pass.
- Criterion 3 (boat still renders at match start / army at base) — met. All test fixtures previously using `occupants: []` on a Base tile to assert a boat renders were rebuilt with an explicit owner occupant (`occupants: [{ playerId: 0, armyId: 0 }]`) in `TileBoats.map.test.ts`, `TileBoats.test.tsx`, and `TileBoats.hook.test.ts`, matching the plan's File plan exactly.
- File plan compliance: all 5 planned files touched — `TileBoats.map.ts`, `TileBoats.map.test.ts`, `TileBoats.test.tsx`, `TileBoats.hook.test.ts`, `TileBoats.preview.tsx` — plus the planned `docs/architecture/systems-and-visuals.md` edit. No out-of-plan files touched.
- New regression tests added beyond the plan's minimum: `TileBoats.map.test.ts` adds "renders no boat on an empty base tile once the owner army has left" and "moves the owner boat to the new island when the base army departs" (the exact departure scenario from the bug report); `TileBoats.test.tsx` adds a DOM-level "renders no boat on a base tile whose owner army has left" test asserting `docked-boat` is absent. Good — directly covers the reported bug, not just the refactored code path.
- Preview state added per plan: `TileBoats.preview.tsx` adds `emptyBaseArmyAwayBoats` built from the real `toTileBoatsViewModel` against the `baseIsland` fixture (`occupants: []`), rendered as the "Empty base, army away (real map function)" state — confirmed visually via the screenshots above.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| — | — | None found. | — | — |

## Docs
- `docs-sync`: ran, updated `docs/architecture/systems-and-visuals.md`'s "Shoreline Boat Docking System" bullet (line 111) with the exact planned sentence: "The base boat is not a permanent fixture: it is drawn only while one of the owner's armies is physically on the Base tile (`toTileBoatsViewModel` in `TileBoats.map.ts`), so it disappears once the owner's last army leaves." Also updated the adjacent "Rebalanced Base Tile Layout" bullet (line 116) to qualify "anchored shoreline boat" with "while an army of the owner is stationed there," removing the prior ambiguity that read as the boat being a permanent base fixture.
