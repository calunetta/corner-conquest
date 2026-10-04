# Final review: Fix boat corner collision on contested Base tiles, phase 1/1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: pass, no errors (`tsc --noEmit` clean output).
- `npm run lint`: pass, `eslint . --max-warnings 0 --no-error-on-unmatched-pattern` clean output.
- `npm test`: `Test Suites: 3 failed, 172 passed, 175 total` / `Tests: 1795 passed, 1795 total`. All 3 failing suites are unrelated to this diff:
  - `.agents/skills/caveman-learn/tests/skill-file.test.mjs` and `.agents/skills/caveman-explore/tests/skill-file.test.mjs`: "Your test suite must contain at least one test" — pre-existing empty-suite files, introduced in commit `374721a` (unrelated skill-config commit), not touched by this task.
  - `src/modules/hud/components/GameStatusBadge/GameStatusBadge.test.tsx`: failed in the full run with `signal=SIGSEGV` (jest worker crash). Re-ran in isolation: `npx jest src/modules/hud/components/GameStatusBadge/GameStatusBadge.test.tsx` → `Test Suites: 1 passed, 1 total`, `Tests: 9 passed, 9 total`. Confirmed flaky worker crash, unrelated to `TileBoats` — the file isn't touched by this diff.
  - `npx jest src/modules/map/components/TileBoats` (this task's own suite) → `Test Suites: 3 passed, 3 total`, `Tests: 33 passed, 33 total`.
- ui-verify: the screenshots preview-a's report cites (`test-results/ui-verify/testbed-tile-boats--desktop.png`, `...--mobile.png`) both show the testbed's un-clicked landing state ("Select a state above to preview it.") — the URL used had no `?state=` query param, so they don't actually show the "Two boats" or "All four corners" states the plan asked preview-a to confirm. I re-ran `node .claude/skills/ui-verify/scripts/snapshot.mjs` myself against `http://localhost:9002/testbed/tile-boats?state=Two%20boats` and `?state=All%20four%20corners` (dev server started for this check, stopped after): both `PASS`, 0 console errors, 0 HTTP errors. Visually: "Two boats" renders two boats at distinct corners (top-right, bottom-right); "All four corners" renders four boats at all four distinct corners. No regression. See non-blocking finding below.

## Plan adherence
- Criterion 1 (contested Base tile: distinct `cornerStyle` per boat): met. `getCornerPosition` in `src/modules/map/components/TileBoats/TileBoats.map.ts:101-103` is now `BOAT_CORNER_POSITIONS[entryIndex % BOAT_CORNER_POSITIONS.length]` unconditionally, matching the plan's Contracts section exactly; the `isBaseTile`/`ownerId` params and `baseCornerMap` are gone, call site at line 106 is `getCornerPosition(index)`. New test `TileBoats.map.test.ts:315-338` ("assigns distinct corners to 2+ occupants on a base tile") asserts `result!.length === 2` and `result![0].cornerStyle` !== `result![1].cornerStyle`.
- Criterion 2 (no regression to empty/single-occupant/non-base/idle-collector/fog): met. Full `TileBoats.map.test.ts` suite passes (33/33, includes all the pre-existing cases listed in the plan's Test plan); none of those assertions needed updates beyond the one stale comment the plan called out.
- Criterion 3 (`docs/README.md` §6.12 split and corner order): met. Diff matches the approved plan's "Docs edit (exact text)" section verbatim — verified by diffing `docs/README.md` against the plan's before/after blocks:
  - `TileOccupants.tsx` bullet now carries only persistent-visibility (plan's L428).
  - `Active Collector Farming` bullet (under `TileResources.tsx`) absorbed the active-farming sentence (plan's L429).
  - `Shoreline Boat Docking System (TileBoats.tsx)` bullet absorbed the idle-collector/base-boat-anchoring sentences (plan's L430-431) and the corner list was corrected to `Bottom-Right, Top-Right, Top-Left, Bottom-Left`, matching `BOAT_CORNER_POSITIONS`' actual order (`TileBoats.types.ts:3-8`).

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `test-results/ui-verify/testbed-tile-boats--desktop.png` / `--mobile.png` | Screenshots cited as proof the "Two boats"/"All four corners" preview states render correctly actually show the testbed's default placeholder ("Select a state above to preview it."), because the snapshot command was run against the bare `/testbed/tile-boats` URL instead of `?state=Two%20boats` / `?state=All%20four%20corners` (the pattern already used by other multi-state components, e.g. `testbed-army-selection-dialog-state-Mixed-...png`). I re-ran the check with the correct URLs myself and confirmed PASS with the fix visually correct; no actual defect found. | preview-a | No — I independently re-verified and confirmed correct rendering; this is a process note for preview-a's next task, not a defect in this one. |

## Docs
- `docs/README.md`: updated in this phase, per plan — §6.12 bullet split and corner-numbering correction, both verified against the live file.
