# Final review: Collector badge — bigger, always left, phase 1/1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: `tsc --noEmit` — no output, clean.
- `npx eslint` on all 7 changed files (`TileResources.map.ts`, `.types.ts`, `.tsx`, `.fixtures.ts`, `.preview.tsx`, `.map.test.ts`, `.test.tsx`): no output, clean.
- `npx jest src/modules/map/components/TileResources`: `Test Suites: 6 passed, 6 total` / `Tests: 147 passed, 147 total`.
- `npm test` (whole repo): `Test Suites: 56 failed, 336 passed, 392 total` / `Tests: 578 failed, 4003 passed, 4581 total`. All 56 failing suites are under `.claude/worktrees/inspiring-kare-ee7f7f/...` — a stray worktree directory Jest is crawling, unrelated to this task (confirmed: `grep -E "^FAIL "` output has zero hits outside that path, and zero hits touch `src/modules/map`). Not caused by this phase; pre-existing repo/environment artifact.
- ui-verify: reviewed screenshots in `test-results/ui-verify/` for `testbed-tile-resources-state-Resource-20with-20collector--desktop.png`, `...triple-20slots--desktop.png`, `...triple-20slots--mobile.png`, `...Base-20resource-20with-20collector--desktop.png`. Badge renders larger and on the node's left edge in every state; triple-slot state (tightest-margin slot `TRIPLE_RESOURCE_SLOTS[2]`) shows no clipping against the dashed tile border at both sizes.

## Plan adherence
- Badge ratio 65%/44.8%: `TileResources.map.ts:37-39` (`BADGE_SIZE_RATIO = 0.65`), comment updated. Met.
- Always-left, no conditional: `badgeSide` local and `.side` field removed from `TileResources.map.ts:123-136`; `FarmingCollectorViewModel.side` removed (`TileResources.types.ts:24-31`); `toCollectorBadgeStyle` takes `Pick<FarmingCollectorViewModel, 'size'>` and always returns the left-edge recipe (`TileResources.tsx:24-26`), exactly per the Contracts block. Met.
- All 9 slots screenshot-checkable: three new preview states added (`Resource with collector, dual slots` — not in the File plan but harmless extra coverage of `DUAL_RESOURCE_SLOTS`; `Resource with collector, triple slots`; `Base resource with collector`), all built through `toTileResourcesViewModel` via a new `farmedNodesFor` helper (`TileResources.preview.tsx:60-70`). Screenshots confirm rendering with no clipping. Met.
- Docs: `docs/architecture/systems-and-visuals.md:109` rewritten to state 65%/44.8%, always-left, citing `BADGE_SIZE_RATIO`/`toBadgeSize`/`toCollectorBadgeStyle`. Met.
- Every old-ratio/side test updated: `grep` for `side`, `'55%'`, `'37.9%'`, `right side`, `left side`, `right-anchored` in both test files returns only the new always-left test titles/assertions (`TileResources.map.test.ts:538,566,581,596,608`); no leftover `'right'` badge-side assertion anywhere. Met.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `src/modules/map/components/TileResources/TileResources.fixtures.ts:52` | `baseIslandWithResources.positionedBy` changed from `[]` to a Food entry per the plan's step 2, but `TileResources.preview.tsx`'s `baseFarmedNodes` overrides `positionedBy` locally via `farmedNodesFor` (spreads the island, replaces `positionedBy`), so the fixture's new field is never read by the preview it was added for. It is harmless (no test relies on the old `[]` value either; checked `TileResources.map.test.ts:413,421,568` and `TileResources.test.tsx:101,201,208` — none assert collector absence on this fixture) and costs nothing to leave. | none (informational) | No |
| 2 | `docs/ai/tasks/2026-10-12-collector-badge-left-and-bigger/progress.md` | Phase 1 boxes for implementation/tests/previews/checks/UI-verified were still unticked and the Log section empty despite the work being complete and verified in this review — a process gap outside my file ownership (I only tick final-review's own box per protocol). | coordinator | No (not a code defect) |

## Docs
- `docs-sync`: ran. `docs/architecture/systems-and-visuals.md:109` updated to the 65%/44.8%/always-left rule in the same phase, matching the code.
