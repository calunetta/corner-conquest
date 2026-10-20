# Progress: Card-play animation only after the card is used and every dialog/sheet is closed

Tier: M · Phases: 1

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: Log-driven, gated card-play trigger and mobile sheet close
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] docs (docs-sync): special-cards.md:13
- [x] checks: typecheck, lint, unit tests
- [ ] UI verified (ui-verify): not run: real flow needs a live match on the real Firebase project; manual check by the user pending
- [x] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
- 2026-10-20: repro tests (tester-a) failed before the fix, pass after; implementer-a seeds dedupe keys at mount (accepted, tested); docs-sync wording fixed after review; typecheck, lint, jest 306 suites / 4216 tests pass; final review APPROVED.
