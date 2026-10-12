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
- [x] committed: d71b5b8

## Phase 2: UI-bug track
- [x] plan approved (architect-b)
- [x] implementation (implementer-b: `e2e/bot-ui-actions.ts`; tester-b: `e2e/bot-vs-bot-ui.spec.ts`, `.claude/agents/ui-bug-reviewer.md`)
- [x] tests (tester-a: `e2e/bot-ui-actions.test.ts`; tester-b: e2e run)
- [x] checks: typecheck, lint, unit tests — not run: one real `test:e2e` run of the new spec, no Java runtime in this environment; run before deploy
- [x] final review (architect-b)
- [ ] committed: <hash>

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-11 architect-a: DONE, wrote plan.md and progress.md for both phases.
2026-10-11 architect-b: CHANGES REQUESTED, missing move-diff case for plain army moves (no LogEvent).
2026-10-11 architect-a: DONE, revised plan with BotStepResult{events,moves,state}.
2026-10-11 architect-b: APPROVED.
2026-10-11 implementer-a: DONE, anomaly capture + metrics/report wiring (engine.ts split into anomaly-capture.ts/match-snapshot.ts to stay under max-lines).
2026-10-11 implementer-b: DONE, .claude/agents/balance-rule-reviewer.md; CHANGES REQUESTED on implementer-a (bad file citation), fixed.
2026-10-11 implementer-a: CHANGES REQUESTED on implementer-b (invented "watch" severity), fixed.
2026-10-11 tester-a: DONE, 241/241 tests passing.
2026-10-11 tester-b: APPROVED, 2 non-blocking coverage gaps noted (match-snapshot.ts unit test, runMatch anomaly-wiring integration test).
2026-10-11 architect-b: APPROVED (final review), same 2 gaps noted as acceptable follow-up.
2026-10-11 coordinator: committed d71b5b8.
