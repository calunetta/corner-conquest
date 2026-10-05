# Progress: No boats visible anywhere on the live game board

Tier: M · Phases: 1

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: Fix the stacking defect and guard against recurrence
- [x] plan approved (architect-b)
- [x] failing test written and confirmed failing (tester-a)
- [x] implementation (implementer-b)
- [x] tests (tester-a, tester-b)
- [ ] previews (preview-a, preview-b) — including live/dev-match visual check, not just the testbed — composed-testbed evidence accepted as equivalent by architect-b judgment call (see review.md "Live-match check"); no literal live/dev match was run
- [x] checks: typecheck, lint, unit tests — lint scoped to this phase's files clean; repo-wide lint still fails on an unrelated pre-existing file (see review.md Finding #4)
- [x] UI verified (ui-verify)
- [x] final review (architect-b)
- [x] committed: 6641210

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-04 architect-a: DONE, root cause found — bare z-5/12/25/26/28/35 Tailwind classes compile to no CSS (default scale is 0/10/20/30/40/50), leaving boats/collectors/forest at z-index:auto behind .terrain's real z-10
2026-10-04 architect-b: DONE, plan APPROVED
2026-10-04 tester-a: DONE, z-index-scale.test.ts written, failed on exactly the 6 predicted violations
2026-10-04 implementer-b: DONE, bracketed all 6 classes (z-25 -> z-[25] etc.), regression test now passes
2026-10-04 tester-b: DONE (coordinator re-run), existing TileBoats/TileResources/TileOccupants/IslandTile view tests green, 56/56
2026-10-05 preview-a: DONE (2 rounds), round 1 testbed-only; round 2 added composed IslandTile/MapGrid preview states with occupants against the real .terrain sibling per architect-b's findings
2026-10-05 preview-b: DONE, independently verified screenshots via ui-verify, no defects, clipping symptom not observed (separate, unverified cause, out of scope)
2026-10-05 architect-b (final-review): DONE, APPROVED — accepted composed-preview evidence in place of a literal live/dev-match screenshot (judgment call documented in review.md); routed unrelated MobileActionsBar lint failure to its own task
