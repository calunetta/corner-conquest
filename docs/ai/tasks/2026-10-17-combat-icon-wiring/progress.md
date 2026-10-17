# Progress: Lucide-capable icon resolver and combat icon wiring

Tier: L · Phases: 2

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: resolver contract and shared icon rendering
- [x] plan approved (architect-b)
- [x] implementation (implementer-a, implementer-b)
- [x] tests (tester-a, tester-b)
- [x] previews (preview-a, preview-b) — none planned, skip
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify) — none planned, no visible change
- [x] docs updated (docs-sync)
- [x] final review (architect-b)
- [x] committed: 33aed66

## Phase 2: combat dialogs wired to the registry
- [x] plan approved (architect-b)
- [x] implementation (implementer-b)
- [x] tests (tester-b)
- [x] previews (preview-a, preview-b) — none planned, skip
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (ui-verify): testbed Combat Dialog, rolling state, spinner renders; the blocking build error was fixed in 859e061
- [x] docs updated (docs-sync)
- [x] final review (architect-b)
- [x] committed: 1c54f01

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
