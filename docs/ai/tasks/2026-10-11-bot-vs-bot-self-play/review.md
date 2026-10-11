# Final review: Bot-vs-bot self-play testing, phase 1/2

VERDICT: APPROVED

## Checks run
- `npm run typecheck`: clean, no errors.
- `npx eslint scripts/balance-simulator docs/balance-simulator-guide.md .claude/agents/balance-rule-reviewer.md`: `✖ 2 problems (0 errors, 2 warnings)` — both warnings are `File ignored because no matching configuration was supplied` (ESLint has no parser config for `.md` files; not a real finding).
- `npx jest scripts/balance-simulator`: `Test Suites: 36 passed, 36 total` / `Tests: 241 passed, 241 total`.
- ui-verify: not applicable — plan.md's "Preview states" section states none; Phase 1 is a Node CLI/report tool with no React component.

## Plan adherence
- Anomaly capture: met. `scripts/balance-simulator/anomaly-capture.ts:24-38` (`silenceConsoleAndCaptureAnomalies`) records every `console.warn`/`console.error` the dispatcher makes, formatting an `Error` arg to its `.message` per the contract. `engine.ts:88,106,117` clears `recordedAnomalies` at the start of each bot turn and attaches a copy to that turn's `TurnSnapshot` via `snapshotSeat`.
- Aggregation into the report: met. `metrics/anomalies.ts` (`computeAnomalies`) matches the `AnomalyMetrics` contract exactly (dedup by `kind::message`, `count`, `exampleSeat`/`exampleRound`, sorted descending). Wired into `ConfigMetrics` at `metrics/index.ts:8,28,60`.
- Always-breach flag: met. `report/flags.ts:41-47` pushes `severity: 'breach'` whenever `totalAnomalies > 0`, confirmed never downgraded by `gatedByBotHealth` (`report/flags.test.ts`'s "keeps the anomalies flag at breach" test, 20-match fixture, passing).
- Report rendering: met. `report/markdown.ts:39-46,75-76` adds the Anomalies table, tested empty and populated in `report/index.test.ts`.
- `balance-rule-reviewer.md`: met. Frontmatter shape matches `docs-sync.md:1-13` (`name`, `description`, `tools: Read, Grep, Glob`, `model: sonnet`, `effort`, `color`, `skills`). Content matches the plan's "Required content" section point for point: cites `report.md`'s own numbers, checks `docs/architecture/game-mechanics.md` before calling something a rule bug, separates doc/code drift from rule bugs, calls out every anomaly as a bug regardless of count, never calls the simulator itself.
- Docs: met. `docs/balance-simulator-guide.md` adds the Anomalies row to the metric table plus the prose section, same pattern as the other M1-M10 entries; correctly outside `docs/architecture/`, so no `docs-sync` stage needed (plan.md's Decisions, confirmed: no rule/architecture-file change this phase).
- `npm run typecheck`, `npm run lint`, `npm test`: met, see Checks above.

## Deviation from File plan (non-blocking, scope within owner)
`engine.ts` was split into `anomaly-capture.ts` and `match-snapshot.ts`, neither listed in plan.md's File plan. Both are owned by implementer-a (engine.ts's owner) and are a pure move of existing `snapshotSeat`/`toFinalState`/`createFirestoreCapture`/`isOwnBase` bodies out of `engine.ts`, verified identical against `git diff` (only `snapshotSeat`'s signature gained the new `anomalies` parameter and `TurnSnapshot` gained the field — everything else byte-identical). `engine.ts` is now 146 lines, under the 150-line lint limit; splitting out this code was necessary to stay under it with the new `Anomaly` type and capture wiring added. Within KISS/DRY/SOLID: single-responsibility split (console-capture vs. snapshot-building), no new behavior, no public API surface added beyond what the plan already specified for `engine.ts`.

## Findings
| # | File:line | Problem | Owner | Blocking? |
|---|---|---|---|---|
| 1 | `scripts/balance-simulator/engine.test.ts:75-80` | No bot-reachable path can drive `handleGameAction` into its default/catch case (confirmed: `decideBotTurn`'s three steps only dispatch handled `GameAction` values — plan.md's Verified context), so no test exercises the full `runMatch` → real anomaly → correctly-attributed `TurnSnapshot` path end-to-end. tester-a instead unit-tested the capture mechanism in isolation (`anomaly-capture.test.ts`, covers formatting, kind assignment, clear-between-turns) and documented the gap honestly in a comment rather than faking a bot-reachable trigger. The remaining wiring in `engine.ts` (`recordedAnomalies.length = 0` before the turn, `[...recordedAnomalies]` passed into `snapshotSeat` after it) is 3 lines, inspected directly in this review and correct. | tester-a (acceptable as shipped; close as a documented follow-up, not a blocker) | No |
| 2 | `scripts/balance-simulator/match-snapshot.ts:31-64` | No dedicated unit test for `snapshotSeat`/`toFinalState` against real `Player`/`GameState` data (e.g. `isOwnBase` filtering, `armyPositions` mapping, `hasProductiveInHand`). Pre-existing gap, not introduced by this phase: `git diff` shows these function bodies are an unmodified move out of `engine.ts` (only `snapshotSeat` gained the new `anomalies` parameter, itself covered by `engine.test.ts`'s "gives every turn an anomalies array" test and the `metrics`/`flags`/`report` tests that construct real `TurnSnapshot`/`SeatFinalState` fixtures). | implementer-a / tester-a (acceptable as shipped; close as a documented follow-up, not a blocker) | No |

Both findings are coverage gaps on logic that is either pre-existing (finding 2) or structurally untestable without fabricating a non-existent bot path (finding 1), not defects found in this phase's new code. Neither blocks Phase 1: the capture mechanism's correctness is verified both by direct unit test and by code inspection, and `match-snapshot.ts`'s logic is unchanged from what already shipped. Recommend a follow-up task note (not required before this phase's commit) to add a direct `match-snapshot.test.ts` at the next opportunity that touches that file.

## Docs
- `docs-sync`: not needed. No file under `docs/architecture/` changed; no game rule, dispatcher behavior, or documented architecture changed — only a new observability layer (capturing an already-existing console side-effect) was added. `docs/balance-simulator-guide.md` is outside `docs/architecture/` and was updated inline by implementer-a per plan.md's existing convention for that file.
