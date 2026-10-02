# Progress: Bot-vs-bot balance simulator

Tier: M · Phases: 1 (built solo; see plan.md's "Note on process")

## Phase 1: Bot-vs-bot balance simulator
- [x] plan written (coordinator, no architect-b review available — see plan.md)
- [x] rng.ts + tests (7/7)
- [x] log-parsers.ts + tests (34/34, one per exact source string)
- [x] stats.ts + tests (14/14, including hand-computed reference values)
- [x] engine.ts + tests (7/7)
- [x] metrics/ (one file per M-group, 150-line rule) + tests (24/24)
- [ ] report.ts + cli.ts + jest.simulator.config.js + npm scripts
- [ ] docs/balance-simulator-guide.md + docs/README.md §6.8 link
- [ ] full checks + a real tiny run + commit

## Log
- 2026-10-02 game-designer-a: DONE, proposal + probe findings
- 2026-10-02 game-designer-b: DONE, VERDICT APPROVED, Final spec written, tightened statistics
- 2026-10-02 architect-a: FAILED (rate limit, no output) — Agent tool then became unavailable for the rest of the session
- 2026-10-02 coordinator: continuing solo per the user's "use the swarm, don't stop" instruction with Agent/SendMessage/ListAgents all disabled. Wrote plan.md and the pure layer (rng, log-parsers, stats), all tested against the real source strings and hand-computed reference values.
- 2026-10-02 coordinator: built combat-odds.ts (exact dice-sum convolution, not Monte Carlo; 8/8 tests against hand-enumerated 1v1 and 2v1 cases). Built metrics/ as one file per M-group (outcomes M1-M2, wins M3-M4, victory-point-sources M5, activity [simplified M6-M7], cards M8, combat M9, bot-health M10, index for composition + the M10 gate) after an initial single-file draft hit this repo's own 150-line lint rule — split it, consistent with component-architecture's one-responsibility-per-file principle. 24/24 tests on synthetic MatchResult fixtures, including both spec-mandated integrity checks (M5: summed VP sources never exceed final VP; M8: acquired = consumed + held) actually failing when the fixture breaks the invariant, not just passing on happy-path data. Extended log-parsers.ts to capture which card a cardBought/specialIslandCardFound event names (needed for M8's per-card tally); its own test suite grew to match. Scoped down from the full spec: M6/M7 report event counts per category, not resource amounts or per-ability purchase names (the log lines carry that detail as free text the current parser doesn't extract); M9's PvP numbers are observed-only, no expected-vs-observed z-test (the simulator doesn't capture the defender's attack power at fight time). Both cuts are commented in code and will be in the guide's "Known limitations".
- 2026-10-02 coordinator: built engine.ts (runMatch against the real reducers, Firestore stubbed via jest.doMock, takeBotTurn's next state read from the stub's setDoc call since it deep-clones rather than mutating). Found and fixed a real bug while writing the determinism test: `withSeededRandom` was not async-aware — it restored Math.random as soon as an async callback returned its pending Promise, not once it settled, so an `await` inside the bot-turn loop ran with the real Math.random. Fixed in rng.ts with a regression test. 7/7 engine tests pass, including determinism on a real 3-bot match.
