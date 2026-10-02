# Progress: Bot-vs-bot balance simulator

Tier: M · Phases: 1 (built solo; see plan.md's "Note on process")

## Phase 1: Bot-vs-bot balance simulator
- [x] plan written (coordinator, no architect-b review available — see plan.md)
- [x] rng.ts + tests (7/7)
- [x] log-parsers.ts + tests (34/34, one per exact source string)
- [x] stats.ts + tests (14/14, including hand-computed reference values)
- [x] engine.ts + tests (7/7)
- [ ] metrics.ts + tests
- [ ] report.ts + cli.ts + jest.simulator.config.js + npm scripts
- [ ] docs/balance-simulator-guide.md + docs/README.md §6.8 link
- [ ] full checks + a real tiny run + commit

## Log
- 2026-10-02 game-designer-a: DONE, proposal + probe findings
- 2026-10-02 game-designer-b: DONE, VERDICT APPROVED, Final spec written, tightened statistics
- 2026-10-02 architect-a: FAILED (rate limit, no output) — Agent tool then became unavailable for the rest of the session
- 2026-10-02 coordinator: continuing solo per the user's "use the swarm, don't stop" instruction with Agent/SendMessage/ListAgents all disabled. Wrote plan.md and the pure layer (rng, log-parsers, stats), all tested against the real source strings and hand-computed reference values.
- 2026-10-02 coordinator: built engine.ts (runMatch against the real reducers, Firestore stubbed via jest.doMock, takeBotTurn's next state read from the stub's setDoc call since it deep-clones rather than mutating). Found and fixed a real bug while writing the determinism test: `withSeededRandom` was not async-aware — it restored Math.random as soon as an async callback returned its pending Promise, not once it settled, so an `await` inside the bot-turn loop ran with the real Math.random. Fixed in rng.ts with a regression test. 7/7 engine tests pass, including determinism on a real 3-bot match.
