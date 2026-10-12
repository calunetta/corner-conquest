# Final review: Resource sprite responsive sizing, phase 1/1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: passes, no output (ran unscoped, repo-wide).
- `npm run lint`: repo-wide run reports 15517 problems, but every error is in pre-existing files outside this task's scope (`.claude/worktrees/inspiring-kare-ee7f7f/**`, legacy `src/lib/__tests__`, `src/lib/types/*`, `e2e/reconnect-bot-takeover.spec.ts`) — none are in this task's File plan and none were touched this phase. Scoped run on every file this task edited: `npx eslint src/modules/map/components/TileResources/ src/modules/map/island-tile-slots.types.ts src/modules/map/island-tile-slots.test.ts --max-warnings 0` → no output, clean.
- `npm test`: repo-wide run reports `Test Suites: 61 failed, 325 passed, 386 total` / `Tests: 586 failed, 3926 passed, 4512 total`, but the failures are in unrelated files carrying other in-progress tasks' uncommitted changes in this shared working tree (verified: `TileBoats.map.ts`'s failing tests reference `player.positions`/`armyId`, a different, unrelated refactor already sitting uncommitted per `git status`). Scoped run: `npx jest src/modules/map/components/TileResources src/modules/map/island-tile-slots.test.ts` → `Test Suites: 7 passed, 7 total` / `Tests: 162 passed, 162 total`.
- ui-verify: reviewed `test-results/ui-verify/recheck-{desktop,mobile}-Single-food-resource.png` and the `testbed-tile-resources-state-*` screenshots for all five preview states at both viewports. Sprite sits visibly inside its tile box in every screenshot; no clipping, overlap, or illegible sliver visible. Collector badge present on desktop, absent on the "mobile (badge hidden)" state, matching the mobile-suppression contract.

## Plan adherence
- `SlotDef.size` percent values (39/32/27/26→22) and removal of `width?`/`height?`: met — `src/modules/map/island-tile-slots.types.ts:38-70`, pinned by `island-tile-slots.test.ts`.
- `nodeSize` as CSS percent string, Food-scaled: met — `TileResources.map.ts:312-315` (`toNodeSize`), pinned by `TileResources.map.test.ts`'s new tier table (`'56.6%'`/`'46.4%'`/`'39.2%'`/`'31.9%'` for Food, `'39%'`/`'32%'`/`'27%'`/`'22%'` otherwise).
- `farmingCollector.size` percent, no px floor, no `offset`: met — `TileResources.map.ts:318-322` (`toBadgeSize`), `offset` field deleted from `FarmingCollectorViewModel` (`TileResources.types.ts`) and no longer computed in `.map.ts`.
- Badge position recipe (`top:50%` + `left:100%`/`right:100%` + `translate`): met — `TileResources.tsx`'s `toCollectorBadgeStyle`, exact match to the Contracts block.
- Both `<Image>`s use `fill`, no numeric `width`/`height`: met — `TileResources.tsx` diff removes both props, adds `fill`; view test asserts no `width`/`height` attribute.
- Badge suppressed on mobile via `useIsMobile()`: met — `TileResources()` passes `showFarmingCollector={!isMobile}`; hook-level test and connected-component test both cover it.
- No overflow/sliver at 390×844, visibly larger at 1280×720: met in substance, with one documented edge case — see Findings.
- Testbed states render, no console error, no visible overlap/clipping: met per the screenshots reviewed above.
- `docs/architecture/systems-and-visuals.md` reworded: met — the percent-of-tile sentence (now at line 96, was 94 before this task's own edit shifted nothing; architect-b's approval already flagged this pre-existing off-by-one in the plan's line numbers, not a defect in the edit) and line 108's badge description both updated, "floored at 22px" removed, mobile suppression documented.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `src/modules/map/island-tile-slots.types.ts:43` (`SINGLE_RESOURCE_SLOT`, `top: '46%'`) combined with `TileResources.map.ts`'s `toNodeSize` (single-slot Food → `56.6%` tall) | A single Food node's box can reach `top 46% + height 56.6% ≈ 102.6%` of the tile, 2.6 points past the tile's bottom edge. In practice this is absorbed by the sprite's own transparent canvas padding (confirmed in the reviewed screenshots: the visible sheep sprite sits well inside the tile at both viewports), and it is a large improvement over the pre-fix behavior, which overflowed by tens of px at mobile tile sizes regardless of position. The root cause is the slot *position* table (`top: '46%'`), frozen by the prior `island-tile-layout-consolidation` task and explicitly out of scope here (triage.md's Scope: "Out: the slot position table ... already fixed"). | position-table owner (follow-up task) | No — non-blocking. File a follow-up task against the position table (e.g. raise `SINGLE_RESOURCE_SLOT.top` or trim the single-slot Food scale) rather than reopening this task's scope. |

## Docs
- `docs-sync`: ran, updated `docs/architecture/systems-and-visuals.md` (percent-of-tile sentence near line 96 and the Active Collector Farming bullet at line 108) to describe percent-based sizing, remove the "floored at 22px" language, and document mobile badge suppression.
