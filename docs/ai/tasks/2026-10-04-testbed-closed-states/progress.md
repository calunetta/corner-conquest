# Progress: Testbed states don't auto-open

Tier: S · Phases: 1

## Phase 1: Closed-by-default PreviewStage + testbed-preview skill rule
- [x] implementation (implementer-a)
- [x] tests (tester-a)
- [x] checks: typecheck, lint, unit tests
- [x] UI verified (manual check in browser, see log)
- [x] committed: 2ccfefe

## Log
<!-- One line per stage: YYYY-MM-DD agent: DONE | BLOCKER, short summary -->
2026-10-04 implementer-a: DONE, PreviewStage renders a closed state-name link list when no `?state=` is set; added skill rule to testbed-preview; one revise round (fixed `states` still rendering all states alongside the list)
2026-10-04 tester-a: DONE, rewrote PreviewStage.test.tsx for the closed-list default; 11/11 passing
2026-10-04 coordinator: full suite green (143 suites, 1409 tests), typecheck/lint clean, manually verified in browser at /testbed/island-tile — selecting a component shows a closed list of state names, clicking one opens only that state
