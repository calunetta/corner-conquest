# Progress: Migrate game rules core logic into src/modules/game-rules

Tier: L · Phases: 4

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: data layer (card-data, player-data)
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b) — no new tests needed, pure constant move; confirmed by architect-b final review
- [x] previews (preview-a, preview-b) — not applicable, no UI change
- [x] checks: typecheck, lint, unit tests — pass (701/703 repo-wide; 2 failures in unrelated concurrent game-header-migration task's files)
- [x] UI verified (ui-verify) — not applicable, no UI change
- [x] final review (architect-b)
- [x] committed: 15563b6

## Phase 2: game-initializer split (monster-catalog, player-factory, map-generation, game-setup)
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [ ] previews (preview-a, preview-b) — not applicable, no UI change
- [x] checks: typecheck, lint, unit tests — pass (scoped: 39 suites/334 tests; repo-wide failures/errors trace only to untracked concurrent tasks' files)
- [ ] UI verified (ui-verify) — not applicable, no UI change
- [x] final review (architect-b)
- [x] committed: e55c53c

## Phase 3: game-logic + turn-progression
- [x] plan approved (architect-b) — plan.md Status: APPROVED, applies to whole task
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [ ] previews (preview-a, preview-b) — not applicable, no UI change
- [x] checks: typecheck, lint, unit tests — pass (scoped: 25 suites/296 tests; repo-wide failures trace only to untracked concurrent game-map-migration task's files)
- [ ] UI verified (ui-verify) — not applicable, no UI change
- [x] final review (architect-b)
- [x] committed: 1bebb20 (legacy-file deletions landed earlier under sibling commit 2a396f1, see review.md "Out-of-band event")

## Phase 4: bot-logic split + docs
- [ ] plan approved (architect-b)
- [ ] implementation (implementer-a, implementer-b)
- [ ] tests (tester-a, tester-b)
- [ ] previews (preview-a, preview-b)
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
- 2026-10-03 architect-a: DONE, plan drafted (4 phases: data layer, game-initializer split, game-logic+turn-progression, bot-logic split+docs)
- 2026-10-03 architect-b: DONE, plan APPROVED
- 2026-10-03 implementer-a, implementer-b: DONE, Phase 1 built, cross-reviewed, both APPROVED
- 2026-10-03 architect-b: DONE, Phase 1 final review APPROVED (2 non-blocking findings: cosmetic import-line merge, stale doc references to deleted src/lib/card-data.ts outside this plan's scope)
- 2026-10-03 Phase 1 committed: 15563b6
- 2026-10-03 implementer-a, implementer-b, tester-a: DONE, Phase 2 built (monster-catalog, player-factory, map-generation, game-setup.reducer), call sites repointed, tests ported/added
- 2026-10-03 architect-b: DONE, Phase 2 final review CHANGES REQUESTED (gratuitous casts in map-generation.ts/game-setup.reducer.ts; 3 unplanned/unused exports in index.ts)
- 2026-10-03 implementer-a: DONE, both findings fixed
- 2026-10-03 architect-b: DONE, Phase 2 final review APPROVED (fixes re-verified independently)
- 2026-10-03 Phase 2 committed: e55c53c
- 2026-10-04 implementer-a, implementer-b, tester-a: DONE, Phase 3 built (player-join.reducer, turn-progression), call sites repointed, tests ported/added, cross-reviewed (1 non-blocking note on `boolean = false` vs. `?: boolean`)
- 2026-10-04 architect-b: DONE, Phase 3 final review APPROVED. Noted out-of-band event: src/lib/game-logic.ts and src/lib/turn-progression.ts deletions were swept into concurrent sibling commit 2a396f1 before this phase could commit them; confirmed via git show, nothing lost, zero remaining imports of either legacy path repo-wide (git grep)
- 2026-10-04 Phase 3 committed: 1bebb20
