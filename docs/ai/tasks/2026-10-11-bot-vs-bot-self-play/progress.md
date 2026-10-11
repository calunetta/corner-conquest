# Progress: Bot-vs-bot self-play testing (rule-bug track + UI-bug track)

Tier: L · Phases: 2

<!-- architect-a creates one block per phase. The coordinator ticks boxes as stage
     reports arrive; architect-b (final review) confirms them. The SessionStart hook
     lists every unticked box, so a new session knows where to resume. -->

## Phase 1: headless rule-bug track
- [x] plan approved (architect-b)
- [x] implementation (implementer-a: `engine.ts`, `metrics/anomalies.ts`, `metrics/index.ts`, `report/flags.ts`, `report/markdown.ts`, `docs/balance-simulator-guide.md`; implementer-b: `.claude/agents/balance-rule-reviewer.md`)
- [x] tests (tester-a)
- [x] checks: typecheck, lint, unit tests
- [x] final review (architect-b)
- [ ] committed: <hash>

## Phase 2: UI-bug track
- [ ] plan approved (architect-b)
- [ ] implementation (implementer-b: `e2e/bot-ui-actions.ts`, `.claude/agents/ui-bug-reviewer.md`; tester-b: `e2e/bot-vs-bot-ui.spec.ts`)
- [ ] tests (tester-a: `e2e/bot-ui-actions.test.ts`; tester-b: e2e run)
- [ ] checks: typecheck, lint, unit tests, one real `test:e2e` run of the new spec
- [ ] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-11 architect-a: DONE, wrote plan.md and progress.md for both phases.
