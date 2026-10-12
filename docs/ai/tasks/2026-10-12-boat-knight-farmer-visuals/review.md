# Final review: Boat, knight and farmer visual placement, phase 1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no output (`tsc --noEmit`).
- `npm run lint`: 15515 problems, all inside `.claude/worktrees/inspiring-kare-ee7f7f/` (a pre-existing, unrelated stray worktree checked into the repo). Zero errors/warnings outside it (`npm run lint 2>&1 | grep -v worktrees | grep -E "^/Users"` → no output). Scoped `npx eslint` on the 10 touched files also returned zero output.
- `npm test`: `Test Suites: 59 failed, 355 passed, 414 total` / `Tests: 620 failed, 4299 passed, 4919 total` — every failed suite is under `.claude/worktrees/inspiring-kare-ee7f7f/` (confirmed: `grep -E "^FAIL"` output has zero matches outside that path). Scoped to this task's area: `npx jest src/modules/map/components/TileOccupants src/modules/map/components/TileBoats src/modules/map/island-tile-slots.test.ts src/testbed/registry.test.ts` → `Test Suites: 14 passed, 14 total` / `Tests: 212 passed, 212 total`.
- ui-verify: per preview-b's report (relayed in the task context), knight offset-onto-land and farmer-in-hull were visually verified in the browser via the testbed and `/testbed/island-tile` states, desktop and mobile. The "only 1 of 3 knights" concern from ui-design.md's Risks section was traced to a snapshot viewport-crop artifact, not a real rendering bug — resolved, not a blocker.

## Plan adherence
- Knight sprite offset onto land at 24%/27% per corner, never centered on the boat's point: met. `OCCUPANT_CORNER_SLOTS` in `src/modules/map/island-tile-slots.types.ts:23-31` matches the Contracts block exactly (`{bottom:'24%',right:'24%'}` etc., no `transform`); `TileOccupants.hook.ts:57-59` builds `slotStyle` from it; `TileOccupants.styles.ts:5-10` sizes the box at `w-[27%] h-[27%]`.
- No knight overlap with its boat's hull box: met per architect-b's independently verified arithmetic in `plan.md:126` (knight 49-76%, boat 79-121%, 3-point gap) — geometry unchanged from the approved plan, implementation matches the Contracts block literally.
- Farmer renders inside the boat hull's silhouette (36%×32% at 50%/54%): met. `TileBoats.styles.ts:11-13`: `w-[36%] h-[32%] left-1/2 top-[54%] -translate-x-1/2 -translate-y-1/2`, matching the Contracts block.
- No regression to fog-of-war suppression, death-animation suppression, or `hasActed` fade: met. `TileOccupants.hook.ts` diff touches only the `slotStyle`/`isOverflow` construction (lines 57-59, 67); the filtering logic above it (fog-of-war, death animation, `hasActed`) is untouched, and `TileOccupants.hook.test.ts` lines 1-511 (those suites) are unchanged in the diff and still pass (212/212 above).
- Mobile: knight visible and positioned per the table, farmer stays hidden via existing `!isMobile` gate: met per plan — no gating logic touched in this diff (`TileBoats.tsx` unedited, confirmed by `git diff` producing no hunks for that file), and preview-b visually verified both viewports.
- Testbed risk check (`occupants on all corners`, 3 knights) was checked in the browser; resolved as a viewport-crop snapshot artifact, not a real bug, as instructed by the plan's Goal section (report rather than silently under-test) — correctly reported, not silently dropped.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `src/testbed/.../IslandTile.fixtures.ts` (fog-of-war gap, "Occupied resource island (collector overlay test)" fixture renders nothing) | Pre-existing bug, out of this task's File plan and not caused by this diff. | none (new task) | No |
| 2 | resource-node sprites vs. knight sprites, some corners/fixtures | Pre-existing visual collision, not introduced by this task's geometry change (knight box only shrank 29%→27% and moved inward; it did not grow toward resource slots). | none (new task) | No |

Both findings are outside this plan's File plan and were already flagged as out-of-scope by preview-b; recommend the coordinator open separate tasks for them. Neither blocks this phase.

## Docs
- `docs-sync`: ran, updated `docs/architecture/systems-and-visuals.md` §6.13 — line 95 now lists `OCCUPANT_CORNER_SLOTS` alongside `BOAT_CORNER_POSITIONS`/`CORNER_TRANSFORMS` as the corner anchors; a new bullet under "Persistent Soldier / Knight Visibility" documents the knight's offset placement; the idle-collector bullet near line 126 now states the 36%×32% box centered at 50%/54% inside the hull silhouette. Verified against the actual diff — accurate, no invented symbols.

## Scope note
`src/modules/map/island-tile-slots.types.ts` was flagged as possibly carrying unrelated uncommitted resource-slot edits from another task. Checked: those resource-slot edits (center-anchoring, percent sizing) are already committed in `1375d33` and `d9bfa3a` (confirmed via `git log`), so the current working-tree diff for this file contains only this task's `OCCUPANT_CORNER_SLOTS` addition and its two comment fixes — nothing to carve out before committing.
