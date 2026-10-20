# Progress: Card-play animation rules (combat cards off, Teleport/Scout on select) + live card-play sandbox

Tier: M · Phases: 1

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: Rules, selection-time play and sandbox
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
- 2026-10-20: build/tests/previews approved (preview-a re-reported after an empty first report); preview-b scripted the sandbox click-through at desktop and 390x844, all pass; docs-sync updated special-cards.md §6.6; typecheck, lint, jest 310 suites / 4305 tests pass; final review APPROVED.
