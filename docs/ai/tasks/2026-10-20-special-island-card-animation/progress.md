# Progress: Card animation when a card is found on a special island

Tier: M · Phases: 1

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: Found-card play
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a, preview-b)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify)
- [x] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
- 2026-10-20: build/tests/previews approved; preview-b scripted the sandbox found flow and overlay Found card state, all pass; one transient SIGSEGV jest worker crash in an untouched suite, rerun green; typecheck, lint, jest 310 suites / 4326 tests pass; docs-sync updated special-cards.md §6.6; final review APPROVED.
