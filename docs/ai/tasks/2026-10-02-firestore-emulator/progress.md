# Progress: Firestore emulator for e2e tests

Tier: M · Phases: 1

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: Firestore emulator for e2e
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] checks: typecheck, lint, unit tests
- [x] e2e suite run against the emulator (tester-b)
- [x] final review (architect-b)
- [x] committed: (this commit)

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
- 2026-10-02 architect-a: DONE, plan.md DRAFT (emulator started as a Playwright webServer, firebase.ts emulator switch, docs updates)
- 2026-10-02 architect-b: DONE, plan APPROVED
- 2026-10-02 implementer-a: DONE, emulator config + firebase.ts + playwright.config.ts
- 2026-10-02 implementer-b: DONE, docs; VERDICT APPROVED on implementer-a
- 2026-10-02 tester-a: DONE, 5 unit tests for the emulator switch
- 2026-10-02 tester-b: DONE, e2e 5/6 pass against the emulator (1 pre-existing flaky spec, unrelated); VERDICT APPROVED on tester-a
- 2026-10-02 architect-b (final-review): DONE, VERDICT APPROVED, found that the parallel firestore-rules task had broken the shared checks on this branch (finding 1, blocking that task not this phase)
- 2026-10-02 coordinator: fixed finding 1 (see 2026-10-02-firestore-rules/progress.md) and applied the two trivial findings 3-4 to firebase.test.ts myself (afterEach restores a deleted env var correctly instead of setting "undefined"; collapsed two redundant cases into one it.each) — both non-blocking, this keeps the diff small instead of spawning another tester-a round. Finding 2 (flaky mobile e2e spec) logged as a new follow-up task.
