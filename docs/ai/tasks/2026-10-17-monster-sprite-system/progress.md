# Progress: Filename-driven monster sprite system

Tier: L · Phases: 3 (Phase 1 detailed in plan.md; Phases 2-3 outlined only, to be detailed in their own planning pass)

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: Catalog, types, spawn rules
- [x] plan approved (architect-b)
- [x] implementation (implementer-a)
- [x] tests (tester-a, tester-b)
- [x] previews (none this phase — no view files)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (n/a — no view files)
- [x] docs-sync (game-mechanics.md:31, systems-and-visuals.md:21-22 — mandatory, same phase)
- [x] final review (architect-b)
- [x] committed: 6fcfc15

## Phase 2: Combat/rendering wiring for the optional attack
- [x] plan detailed and approved (architect-a, architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] docs-sync (game-mechanics.md:30,36 and systems-and-visuals.md:22: skip-attack-animation behavior)
- [x] final review (architect-b)
- [x] committed: 1f47fb0

## Phase 3: Testbed uploader
- [x] plan detailed and approved (architect-a, architect-b)
- [x] implementation (implementer-a, implementer-b) — hook.ts written by implementer-a; route/validation/view files found from an earlier session, verified and cross-reviewed; revisions applied (per-field GIF copy, pick-time size check, remount fix)
- [x] tests (tester-a, tester-b) — logic 187 pass across 4 files; view 31 pass; generator tests added. Not covered: `addMonster` fetch (not in plan's test list)
- [x] previews (preview-a) — `monster-sprite-uploader` registered under Dev tools
- [x] checks: typecheck, lint, unit tests — typecheck clean; scoped eslint exit 0; scoped jest 2603 pass. Not run: full-repo `npm run lint`/`npm test` — they fail on other tasks' `.claude/worktrees/` copies and on uncommitted TileResources/TileDecorationEditor work, none from this phase
- [x] UI verified (ui-verify) — preview-b APPROVED; desktop + mobile screenshots under test-results/ui-verify/. Not exercised: boss warning line, clamp on Boss-off, file picks, submit paths (not submitted to avoid writing public/)
- [x] docs-sync — `systems-and-visuals.md:182` bullet; game-mechanics.md unchanged (already documents caps)
- [x] final review (architect-b) — APPROVED, review.md "Phase 3 review"
- [x] committed: e0046b1

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
- 2026-10-17 architect-a: DONE, wrote plan.md (Phase 1 detailed) and progress.md, Status: PROPOSED
- 2026-10-17 architect-b: CHANGES REQUESTED on plan.md (missing docs-sync, 2 citation fixes, 1 signature narrowing, 1 non-blocking lint note)
- 2026-10-17 architect-a: DONE, revised plan.md and progress.md per architect-b's findings, Status: PROPOSED
- 2026-10-17 implementer-a: DONE, hook.ts; revisions (per-field GIF copy, pick-time size check, stale-error clearing)
- 2026-10-17 implementer-b: DONE, view files verified; remount fix (fileInputResetKey)
- 2026-10-17 tester-a: DONE, logic tests (187 pass in 4 files)
- 2026-10-17 tester-b: DONE, view tests (31 pass)
- 2026-10-17 preview-a: DONE, preview registered under Dev tools
- 2026-10-17 preview-b: APPROVED, desktop/mobile ui-verify, no console errors
- 2026-10-17 docs-sync: DONE, systems-and-visuals.md:182
- 2026-10-17 architect-b: APPROVED (final review), review.md
