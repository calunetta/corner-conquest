# Final review: Balance-simulator M5 VP misattribution + bot Deploy affordability bug, phase 1/1

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no errors (`tsc --noEmit` exit 0).
- `npm run lint`: scoped `npx eslint` on every file this task touched (`scripts/balance-simulator/log-parsers.ts`, `engine.ts`, `metrics/victory-point-sources.ts`, `metrics/test-fixtures.ts`, `log-parsers.test.ts`, `metrics/victory-point-sources.test.ts`, `src/modules/game-rules/bot-purchases.reducer.ts`, `bot-purchases.reducer.test.ts`) → 0 errors, 0 output. The repo-wide `npm run lint` reports ~15,655 problems, all from `.claude/worktrees/*` (other parallel swarm tasks' git worktrees, e.g. `firebase.test.ts` require-imports, `types/*.ts` missing `import type`) — none of those paths are touched by this task; pre-existing and out of scope.
- `npm test`: scoped run `npx jest scripts/balance-simulator src/modules/game-rules/bot-purchases.reducer.test.ts` → `Test Suites: 96 passed, 96 total`, `Tests: 663 passed, 663 total`. The repo-wide `npm test` reports 87 failed suites, all from `.claude/worktrees/*/e2e/*.spec.ts` files that jest's `testPathIgnorePatterns` (`jest.config.js`) doesn't exclude (only `<rootDir>/e2e/`, not nested worktree copies) and that import `playwright/test` outside its intended runner — pre-existing environmental noise, unrelated to this task's files.
- ui-verify: not applicable — no UI in scope (plan confirms, triage confirms).

## Plan adherence
- M5 PvP VP attributed to the real winner, not the acting seat: met. `victory-point-sources.ts:50-57` resolves `event.winnerPlayerId` via `result.seatPlayerIds.indexOf(...)` and credits that seat; `log-parsers.ts:17,76-80` carries `winnerPlayerId` from the structured log entry; `engine.ts:99,117-120,139` builds `seatPlayerIds` and stops flattening structured entries to bare strings before parsing. Matches the plan's contract block verbatim (ternary/ordering aside, which is cosmetic).
- `mismatchCount === 0` for a defender-wins-PvP fixture: met, verified by the new test `victory-point-sources.test.ts` ("credits PvP VP to the real winner (defender) via winnerPlayerId, not to the attacker whose turn it is") — asserts `bySeat[0].pvp === 0`, `bySeat[1].pvp === 5`, `mismatchCount === 0`.
- `bot-purchases.reducer.ts`'s Deploy pre-check gated on `canUseCard`, Reinforce-before-Efficient: met. `bot-purchases.reducer.ts:30-33` now reads `const canUseCard = !activeBot.actionsThisTurn.includes(GameAction.UseCard); const deployCost = activeBot.reinforceActive && canUseCard ? 0 : activeBot.efficientActive && canUseCard ? Math.ceil(...) : activeBot.nextArmyCost;` — exact match to the plan's contract snippet, correct precedence vs. `handleDeployAction` (`player-actions.reducer.ts:23-26`).
- No more undiscounted-cost Deploy anomalies from this cause: met, verified by 5 cases in `bot-purchases.reducer.test.ts` (gate for `efficientActive`, gate for `reinforceActive`, both regression cases, and the both-flags-active precedence case) — each asserts `consoleErrorSpy` not called and exact `armies.length`/food deltas, not just "doesn't throw."
- `docs/balance-simulator-guide.md:87-110` rewritten in past tense, current paths, current error text, current caught-not-swallowed behavior: met. Diff confirms `bot-purchases.reducer.ts`/`player-actions.reducer.ts` paths, exact error text `` `Not enough food. Cost: ${cost}` `` (verified against `player-actions.reducer.ts:31` in this session), and describes the dispatcher's `console.error` catch, not a silent swallow.

## Findings
None.

## Docs
- `docs-sync`: not needed. No `docs/architecture/*.md` file describes bot Deploy-discount behavior or M5 attribution logic as designed differently from the fix — both fixes restore previously-intended behavior in simulator-only instrumentation and a bot pre-check, not documented game rules. `docs/balance-simulator-guide.md` (not an architecture doc) was updated directly by implementer-b per the plan's own scoping (triage.md: "No `docs/architecture/*.md` file is affected ... `docs-sync` dropped").

## Notes
Progress.md boxes ticked for: implementation, tests, checks (typecheck/lint/unit tests — scoped to this task's files; the broad repo-wide lint/test noise from `.claude/worktrees/*` is pre-existing and unrelated). "previews" and "UI verified" are n/a per plan. Final review box ticked. Commit still pending (coordinator's step).
