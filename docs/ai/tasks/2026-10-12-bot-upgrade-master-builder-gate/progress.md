# Progress: bot Upgrade pre-check ignores canUseCard gate on Master Builder discount

Tier: S · Phases: 1

## Phase 1: fix bot-purchases Upgrade cost pre-check
- [x] failing repro test (tester-a)
- [x] fix implemented (implementer-a)
- [x] checks: typecheck, lint, unit tests
- [x] docs sync (docs-sync — confirmed no doc change needed)
- [ ] committed: <hash>

## Log
- 2026-10-12 tester-a: DONE, added failing repro + regression-guard tests to bot-purchases.reducer.test.ts; confirmed failure against unfixed code (`Not enough wood. Cost: 6`)
- 2026-10-12 implementer-a: DONE, gated `masterBuilderActive` on hoisted `canUseCard` in bot-purchases.reducer.ts:21-23; all 7 tests pass, typecheck/lint clean
- 2026-10-12 full suite: `npm run typecheck && npm run lint && npm test` → 204 suites / 2449 tests pass
- 2026-10-12 docs-sync: DONE, no edits — player-facing Master Builder rule in special-cards.md/game-mechanics.md was already correct; only the bot's internal cost estimate was fixed
