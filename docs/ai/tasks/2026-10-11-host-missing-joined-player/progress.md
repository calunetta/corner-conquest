# Progress: Host never sees a player join the match

Tier: M · Phases: 1

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: gate isMyTurn on match status
- [x] plan approved (architect-b)
- [x] implementation (implementer-a)
- [x] tests (tester-a, tester-b)
- [x] checks: typecheck, lint, unit tests
- [x] docs updated (docs-sync): `docs/architecture/systems-and-visuals.md`
- [x] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-11 architect-a: DONE, root cause confirmed, plan.md + progress.md written
2026-10-11 architect-b: DONE, VERDICT APPROVED
2026-10-11 tester-a: DONE, failing repro test added (isMyTurn true for host while waiting)
2026-10-11 implementer-a: DONE, gated isMyTurn on gameState.status === Playing
2026-10-11 tester-b: DONE, CHANGES REQUESTED (coverage gaps) → tester-a revised → VERDICT APPROVED, 205/205 game-board tests, 2271/2271 repo-wide
2026-10-11 docs-sync: DONE, updated systems-and-visuals.md §6.10 In-Memory Turn Buffering
