# Progress: Balance-simulator M5 VP misattribution + bot Deploy affordability bug

Tier: M · Phases: 1

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: fix M5 PvP VP misattribution (Bug 1) and bot Deploy affordability (Bug 2); rewrite guide doc (Bug 3)
- [x] plan approved (architect-b)
- [x] implementation (implementer-a: log-parsers.ts, engine.ts, victory-point-sources.ts, test-fixtures.ts; implementer-b: bot-purchases.reducer.ts, docs/balance-simulator-guide.md)
- [x] tests (tester-a: victory-point-sources.test.ts, log-parsers.test.ts, bot-purchases.reducer.test.ts — reproduction cases before the fix)
- [x] previews (none — no UI)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (n/a — no UI)
- [x] final review (architect-b)
- [x] committed: f8d07b6

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-12 architect-a: DONE, wrote plan.md (root cause for both bugs verified by the coordinator during triage).
2026-10-12 architect-b: APPROVED, independently re-verified Player.id===array-index and pushLogEntry-only invariants.
2026-10-12 tester-a: DONE, failing reproduction tests for both bugs confirmed failing for the right reason.
2026-10-12 implementer-a: DONE, Bug 1 fix (winnerPlayerId/seatPlayerIds attribution).
2026-10-12 implementer-b: DONE, Bug 2 fix (canUseCard gate) + Bug 3 doc rewrite. Cross-reviews: both APPROVED.
2026-10-12 tester-b: CHANGES REQUESTED, 2 untested branches (reinforceActive gate, both-flags precedence) in bot-purchases.reducer.test.ts.
2026-10-12 tester-a: DONE, added 3 cases addressing both gaps.
2026-10-12 tester-b: APPROVED, traced each new case to confirm actual discrimination, not just passing.
2026-10-12 architect-b: APPROVED (final review). No docs-sync needed (no architecture doc describes either fix's behavior differently).
2026-10-12 coordinator: committed f8d07b6. Flagged a third, unconfirmed instance of the same bug shape (Upgrade pre-check, bot-purchases.reducer.ts:21-24) as a separate follow-up task (task_f5385b2a) — out of scope here per triage.
