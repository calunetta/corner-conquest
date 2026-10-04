# Progress: Migrate Lobby domain to src/modules

Tier: M · Phases: 2

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: logic layer (types, map, hook, fixtures, service, index)
- [x] plan approved (architect-b)
- [x] implementation (implementer-a)
- [x] tests (tester-a)
- [x] checks: typecheck, lint, unit tests — typecheck clean except the 5 expected `Cannot find module './<Name>'` in index.ts files awaiting Phase 2's views; lint clean; `npx jest src/modules/lobby` 102/102 passed
- [x] final review (architect-b)
- [ ] committed: <hash>

## Phase 2: view layer, wiring, cleanup
- [x] plan approved (architect-b) — plan.md Status: APPROVED, applies to whole task
- [ ] implementation (implementer-b)
- [ ] tests (tester-b)
- [ ] previews (preview-a, preview-b)
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
- 2026-10-04 architect-a: DONE, plan drafted (2 phases: logic layer, view layer+wiring+cleanup)
- 2026-10-04 architect-b: CHANGES REQUESTED, invented PlayerStandings precedent
- 2026-10-04 architect-a: DONE, revised citations to GameBoardHeader precedent
- 2026-10-04 architect-b: APPROVED
- 2026-10-04 implementer-a: DONE, Phase 1 logic layer (service, hooks, maps, fixtures, index files)
- 2026-10-04 tester-a: DONE, Phase 1 102 tests, no bugs found
