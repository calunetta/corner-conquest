# Progress: Balance-simulator M5 VP misattribution + bot Deploy affordability bug

Tier: M · Phases: 1

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: fix M5 PvP VP misattribution (Bug 1) and bot Deploy affordability (Bug 2); rewrite guide doc (Bug 3)
- [x] plan approved (architect-b)
- [ ] implementation (implementer-a: log-parsers.ts, engine.ts, victory-point-sources.ts, test-fixtures.ts; implementer-b: bot-purchases.reducer.ts, docs/balance-simulator-guide.md)
- [ ] tests (tester-a: victory-point-sources.test.ts, log-parsers.test.ts, bot-purchases.reducer.test.ts — reproduction cases before the fix)
- [ ] previews (none — no UI)
- [ ] checks: typecheck, lint, unit tests
- [ ] UI verified (n/a — no UI)
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
