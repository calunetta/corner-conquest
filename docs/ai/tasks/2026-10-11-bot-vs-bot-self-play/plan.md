# Plan: Bot-vs-bot self-play testing (rule-bug track + UI-bug track)

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] Every `console.warn`/`console.error` the dispatcher logs during a bot's turn (an unhandled
      action or a caught reducer error) is captured per turn, aggregated into the balance report,
      and flagged — never silently swallowed as it is today.
- [ ] A new agent definition, `.claude/agents/balance-rule-reviewer.md`, reads a generated
      `report.md`/`report.json` plus `docs/architecture/game-mechanics.md` and reports rule/balance
      bugs it finds, without a Claude call during the simulation itself.
- [ ] A new Playwright spec plays a full match between two UI-driven, bot-decided seats, captures
      a screenshot plus console/network errors for every turn, and keeps only the turns where
      something looks wrong (console error, failed request, or the intended action never landed).
- [ ] A second new agent definition, `.claude/agents/ui-bug-reviewer.md`, reads only that filtered
      subset and reports broken interactions.
- [ ] No LLM call happens during either simulation loop; review only runs once, after the fact, on
      the aggregated/filtered output.
- [ ] `npm run typecheck`, `npm run lint` and `npm test` pass for every file touched.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `runMatch`, `MatchConfig`, `MatchResult`, `TurnSnapshot`, `SeatFinalState` | `scripts/balance-simulator/engine.ts:1-193` | Phase 1 extends `TurnSnapshot` and the per-turn loop here; signature and behavior of everything else stays. |
| `deriveMatchSeeds` | `scripts/balance-simulator/engine.ts:186-192` | Reused as-is by both `cli.ts` and the acceptance tests; not touched. |
| `handleGameAction` | `src/modules/game-rules/game-rules.reducer.ts:33-142` | The single root dispatcher every bot action (and player action) goes through. Line 133: `console.warn` on an unrecognized/unhandled action, returns `{ state: gameState }` unchanged. Line 136-140: `catch` block, `console.error`, returns `{ state: gameState }` unchanged. These are the only two anomaly sources reachable from a bot turn — confirmed by grep: no other `console.warn`/`console.error` exists under `src/modules/game-rules/**` except `services/player-exit.service.ts:148`, which `takeBotTurn` never calls. |
| `decideBotTurn` | `src/modules/game-rules/bot-turn.reducer.ts:14-27` | Pure bot decision tree: `applyBotCardStrategy` → `applyBotPurchases` → `applyBotArmyActions` → `handleGameAction(EndTurn)`. Already called once per turn by `runMatch`'s `takeBotTurnWithStub`. |
| `takeBotTurn` | `src/modules/game-rules/services/bot-turn.service.ts:9-16` | The only I/O wrapper; `runMatch` already stubs its `setDoc`. Not touched by Phase 1. |
| `applyBotCardStrategy`, `applyBotPurchases`, `applyBotArmyActions` | `src/modules/game-rules/bot-card-strategy.reducer.ts:11`, `bot-purchases.reducer.ts:7`, `bot-army-actions.reducer.ts:12` | Already individually exported from their own files (not re-exported from `index.ts`). Phase 2's spec deep-imports them directly — allowed under `e2e/**/*.ts`'s `no-restricted-imports` exemption (`eslint.config.mjs:116-121`); no new public export needed. |
| `parseLogLine`, `LogEvent` | `scripts/balance-simulator/log-parsers.ts:155-157`, `13-33` | Converts a `state.log` tail into structured events by exact string match. Phase 1 reuses it unchanged for metrics; Phase 2's e2e helper deep-imports it the same way (also under the e2e exemption) for every bot action that *does* push a log line — but not for plain moves (see next row). |
| `handleMoveAction` | `src/modules/game-rules/movement.reducer.ts:45-123` | Pushes a log entry only for an extra-move (`:106-112`) or for leaving a resource position (`:85-98`, when the army it moves had one). An ordinary move onto any other tile — the common case, and also how a PvP/monster attack is initiated (moving onto an occupied tile) — pushes **no log entry at all**, and `LogEvent`'s union (`log-parsers.ts:13-33`) has no "moved" kind. Phase 2 therefore cannot rely on `parseLogLine` to know a move happened; it must diff `Army.position` (`src/lib/types/player.ts:13-17`, `id: number`) for the acting seat's armies before/after each `applyBotArmyActions` step. |
| `NEVER_CONSUMED_BY_BOTS` | `scripts/balance-simulator/acceptance.test.ts:26-36` | Already enumerates, and asserts, every card bot logic has no code path to play. Bounds the `LogEvent` kinds Phase 2's UI-action mapping must actually cover — no card outside this gap needs a click handler. |
| `isSessionDriver` bot-turn effect | `src/modules/game-board/game-board.engine.hook.ts:97-102, 151-162` | `isSessionDriver` is `false` whenever `humanSeatIds.length === 0` (line 100). An all-bot match therefore has **no client that will ever call `takeBotTurn`** — the existing auto-driver mechanism cannot run a bot-vs-bot match through the real UI. This is why Phase 2 must compute each bot action in the test and perform it with real clicks, not just open two bot-seat browser tabs and watch. |
| `ConfigMetrics`, `computeConfigMetrics` | `scripts/balance-simulator/metrics/index.ts:12-59` | Phase 1 adds one more field (`anomalies`) alongside `m1`...`m10`, following the exact pattern of every existing metric. |
| `collectFlags`, `Flag` | `scripts/balance-simulator/report/flags.ts:3-53` | Phase 1 adds one more always-`breach` flag, same shape as the M5/M8 integrity checks (never suppressed by `gatedByBotHealth`). |
| `toMarkdown`, `configSection` | `scripts/balance-simulator/report/markdown.ts:21-68` | Phase 1 adds one more table in `configSection`, same pattern as M10's. |
| `table`, `pct`, `num` | `scripts/balance-simulator/report/markdown-tables.ts:2,9,10` | Reused for the new Anomalies table; no new formatting helper needed. |
| `turn`, `match`, `seatFinal` fixtures | `scripts/balance-simulator/metrics/test-fixtures.ts:5-41` | `turn()` needs a default `anomalies: []` so every existing caller keeps compiling. |
| `.claude/agents/docs-sync.md`, `.claude/agents/tester-a.md` | `.claude/agents/docs-sync.md:1-13`, `.claude/agents/tester-a.md:1-13` | Frontmatter shape (`name`, `description`, `tools`, `model`, `effort`, `color`, `skills`) the two new review-agent files must follow. |
| `docs/balance-simulator-guide.md` | whole file | Living companion doc for this tool; already documents every metric (M1-M10) and "Known limitations" in prose, maintained by whoever adds the metric (not routed through `docs-sync`, since it's outside `docs/architecture/`). Phase 1 adds one row plus a short "Rule-bug review" section the same way. |
| `safeCleanupGame`, `enterLobby`-style helpers | `e2e/e2e-cleanup.ts`, `e2e/reconnect-bot-takeover.spec.ts:7-31` | Two-browser-context pattern (lobby entry, match creation/join, cleanup in `afterEach`) Phase 2's spec follows. |
| `page.getByTestId('actions-panel-end-turn')`, role-based locators | `e2e/reconnect-bot-takeover.spec.ts:71,76` | End Turn already has a stable `data-testid`; Deploy/Upgrade/Buy Card/Move are driven by role/text locators elsewhere in `e2e/gameplay.spec.ts` — exact selectors for the remaining actions are an implementation detail implementer-b resolves against the live DOM, not a plan decision. |
| `npm run balance:simulate`, `balance:simulate` script | `package.json:15` | Runs `jest scripts/balance-simulator/cli.test.ts`; unchanged. |

## Decisions
- Capture anomalies at `handleGameAction`'s two existing `console.warn`/`console.error` call sites, by changing `runMatch`'s already-present `jest.spyOn(console, ...)` mocks from pure no-ops into no-ops that also record their calls, cleared and read once per bot turn — because this is the single dispatcher every bot action already passes through (DRY: one capture point, not one per bot-reducer call site). Rejected: instrumenting every `handleGameAction` call inside `bot-army-actions.reducer.ts`/`bot-purchases.reducer.ts`/`bot-card-strategy.reducer.ts` individually (duplicated across ~15 call sites, and the triage explicitly keeps bot decision logic "reused as-is").
- Treat "invalid/no-op bot action" and "caught reducer error" as the same two anomaly kinds already named by the dispatcher's own code (`unhandledAction` = the `console.warn` default case at `game-rules.reducer.ts:133`; `reducerError` = the `console.error` catch at line 137) — because no other code path in a bot's turn produces an unexplained no-op; a separate full-state-diff no-op detector would risk false positives on a legitimate "nothing to do this turn" bot pass. Rejected: deep-diffing state before/after each granular bot step to detect silent no-ops (speculative, no evidence it finds anything the two log points don't already cover).
- Report anomalies as an always-`breach` flag (never suppressed by `gatedByBotHealth`), matching the M5/M8 integrity-check precedent in `report/flags.ts:30-35` — because a swallowed exception or an unhandled action during bot-only play is a real bug regardless of win-rate noise.
- Phase 2's e2e spec computes each bot step with the real reducers in Node (`applyBotCardStrategy`/`applyBotPurchases`/`applyBotArmyActions`, deep-imported) and translates the result into one Playwright interaction per action, re-reading the live state between steps — because `isSessionDriver` (`game-board.engine.hook.ts:100`) never fires for an all-bot match, so nothing else will ever turn a bot decision into a UI action. Rejected: giving both e2e seats `isBot: true` and waiting for the existing driver effect (silently never fires, zero human seats); rejected: calling `decideBotTurn` once per turn and diffing only the final state (loses which action produced which change, so one click target can't be told apart from another when a turn does several things).
- `planNextStep` reports two kinds of signal, not one: `events: LogEvent[]` (from `parseLogLine`, for every bot action that pushes a log line — Deploy, Upgrade, Buy Card, Use Card, card-funded actions) and `moves: Array<{ armyId: number; to: { x: number; y: number } }>` (an explicit position diff of the acting seat's armies before/after the step, independent of the log). Because `handleMoveAction` pushes no log entry for an ordinary move or for an attack-initiating move onto an occupied tile (see "Verified context"), `LogEvent` alone can't tell `performUiAction` a move happened at all; without the diff, every plain move and every attack would compute correctly in the oracle state but never be clicked, so the live UI state would silently stop matching the oracle after the first such move. Rejected: adding a "moved"/"attacked" `LogEvent` kind to `log-parsers.ts` (that file matches exact strings the reducers already log; inventing a case for a string that is never actually logged doesn't fit its contract and nothing else would ever produce it).
- Keep `applyBotCardStrategy`/`applyBotPurchases`/`applyBotArmyActions`/`parseLogLine` as deep imports from `e2e/bot-ui-actions.ts`, not new exports from `src/modules/game-rules/index.ts` — because `e2e/**/*.ts` is already exempted from the deep-import lint rule (`eslint.config.mjs:116-121`), so widening the module's public API would add surface no non-test caller needs (YAGNI).
- The two new `.claude/agents/*.md` files are not application code, so they don't fit implementer-a's (`.types`/`.map`/`.service`/`.hook`/`.fixtures`) or implementer-b's (`.tsx`/`.styles.ts`) usual scope. Assign `balance-rule-reviewer.md` to implementer-b in Phase 1 (implementer-a is already fully loaded with `engine.ts`/`metrics/`/`report/`, giving implementer-b real work this phase) and `ui-bug-reviewer.md` to tester-b in Phase 2 (tester-b is the one defining what counts as "flagged," so is best placed to write the reviewer's reading instructions). Rejected: one implementer owning both agent files across both phases (uneven workload within each phase).
- No `game-designer-*`/`ui-designer-*` stage: no rule, number, or player-facing UI changes (triage's "Gameplay signal"/"Visible UI signal": no). No `docs-sync` stage: nothing under `docs/architecture/*.md` changes; the one doc touched (`docs/balance-simulator-guide.md`) is outside that folder and is edited inline by implementer-a, same as its existing M1-M10 sections were.

## File plan
### Phase 1 (headless rule-bug track)
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `scripts/balance-simulator/engine.ts` | edit | Add `Anomaly` type; add `anomalies: Anomaly[]` to `TurnSnapshot`; capture `console.warn`/`console.error` calls per bot turn via the existing spies and attach them to each turn's snapshot. | implementer-a |
| `scripts/balance-simulator/engine.test.ts` | edit | Assert a turn with no anomalies gets `anomalies: []`, and (via a forced unhandled-action payload, see Test plan) that a real anomaly is captured and attributed to the correct seat/round. | tester-a |
| `scripts/balance-simulator/metrics/anomalies.ts` | new | `computeAnomalies(results: MatchResult[]): AnomalyMetrics` — aggregates every turn's `anomalies` across all matches in a config into deduplicated, counted rows. | implementer-a |
| `scripts/balance-simulator/metrics/anomalies.test.ts` | new | Unit tests for `computeAnomalies`: zero anomalies, one repeated message counted correctly, two distinct messages kept separate, `matchesWithAnomalies` counts a match once even with multiple anomalous turns. | tester-a |
| `scripts/balance-simulator/metrics/index.ts` | edit | Add `anomalies: AnomalyMetrics` to `ConfigMetrics`; call `computeAnomalies(results)` in `computeConfigMetrics`. | implementer-a |
| `scripts/balance-simulator/metrics/index.test.ts` | edit | Assert `computeConfigMetrics(...).anomalies` is present and correct for a fixture with a seeded anomaly. | tester-a |
| `scripts/balance-simulator/metrics/test-fixtures.ts` | edit | Add `anomalies: []` to `turn()`'s defaults. | implementer-a |
| `scripts/balance-simulator/report/flags.ts` | edit | Add one always-`breach` flag when `m.anomalies.totalAnomalies > 0`. | implementer-a |
| `scripts/balance-simulator/report/flags.test.ts` | edit | Assert the new flag fires with `totalAnomalies > 0` and is absent at `0`, and that its severity is always `'breach'` even when `gatedByBotHealth` is true. | tester-a |
| `scripts/balance-simulator/report/markdown.ts` | edit | Add an "Anomalies" table to `configSection`, same pattern as M10's. | implementer-a |
| `scripts/balance-simulator/report/index.test.ts` | edit (if it asserts the full markdown shape) | Cover the new Anomalies section renders for a report with and without anomalies. | tester-a |
| `docs/balance-simulator-guide.md` | edit | Add an "Anomalies" row to the metric table and a short paragraph on what it means and where it comes from. | implementer-a |
| `.claude/agents/balance-rule-reviewer.md` | new | New agent definition: reads a generated `report.md`/`report.json` plus `docs/architecture/game-mechanics.md`, reports rule/balance bugs with evidence. See Contracts for required content. | implementer-b |

### Phase 2 (UI-bug track)
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `e2e/bot-ui-actions.ts` | new | `planNextStep(state, seat, step)` — runs one of `applyBotCardStrategy`/`applyBotPurchases`/`applyBotArmyActions` against a state snapshot and returns a `BotStepResult`: the new `LogEvent[]` tail (via `parseLogLine`, for log-producing actions) **and** a `moves` position diff (for plain moves and attack-initiating moves, which `handleMoveAction` never logs) plus the resulting state; `performUiAction(page, result, seat)` — performs every UI interaction a `BotStepResult` implies (move/attack clicks first from `moves`, then Deploy/Upgrade/Buy Card/Use Card/End Turn etc. from `events`), scoped to the `LogEvent` kinds `NEVER_CONSUMED_BY_BOTS` (`acceptance.test.ts:26-36`) says bots can actually reach. | implementer-b |
| `e2e/bot-ui-actions.test.ts` | new | Unit tests for `planNextStep`'s pure diffing (no Playwright, no browser): a step that changes nothing returns `{ events: [], moves: [] }`; a step that deploys returns `{ events: [{ kind: 'deployed' }], moves: [] }`; a step that only repositions an army returns `{ events: [], moves: [{ armyId, to }] }` with no event; a step that both moves and logs (e.g. moves off a resource position) returns both populated. | tester-a |
| `e2e/bot-vs-bot-ui.spec.ts` | new | Orchestrates one full match between two UI-driven seats: for each seat's turn, reads live state, calls `planNextStep` for each of the three bot phases in order, calls `performUiAction` with the full `BotStepResult` (so moves are clicked even when a step has no `LogEvent`), then clicks End Turn; captures a screenshot and buffers `page.on('console')`/`page.on('pageerror')`/`page.on('requestfailed')` per turn; after the match, keeps only turns with a captured console/page error, a failed request, or an action (a `moves` entry or an `events` entry) whose expected effect never showed up in the live state/log within the sync timeout, and writes the filtered subset to `e2e/.bot-self-play-captures/<run-id>/`. | tester-b |
| `.claude/agents/ui-bug-reviewer.md` | new | New agent definition: reads only the filtered capture folder (screenshots + buffered console/network logs) and reports broken interactions with evidence. See Contracts for required content. | tester-b |

## Contracts
```ts
// scripts/balance-simulator/engine.ts — additions only; everything else in this file is unchanged.

/** One console.warn/console.error call the dispatcher made during a single bot turn — its own
 *  "something unexpected happened" signal (game-rules.reducer.ts:133 and :136-140). */
export interface Anomaly {
  kind: 'unhandledAction' | 'reducerError';
  /** console args joined to one string; an Error argument contributes its .message. */
  message: string;
}

export interface TurnSnapshot {
  // ...existing fields unchanged...
  anomalies: Anomaly[];
}

// scripts/balance-simulator/metrics/anomalies.ts — new file.
import type { Anomaly } from '../engine';

export interface AnomalyMetrics {
  totalAnomalies: number;
  matchesWithAnomalies: number;
  totalMatches: number;
  /** One row per distinct (kind, message) pair, sorted by count descending. */
  byMessage: Array<{ kind: Anomaly['kind']; message: string; count: number; exampleSeat: number; exampleRound: number }>;
}

export function computeAnomalies(results: MatchResult[]): AnomalyMetrics;

// scripts/balance-simulator/metrics/index.ts — ConfigMetrics gains one field.
export interface ConfigMetrics {
  // ...existing fields unchanged (players, fog, m1...m10, activity, gatedByBotHealth)...
  anomalies: AnomalyMetrics;
}

// scripts/balance-simulator/report/flags.ts — collectFlags gains one unconditional check:
//   if (m.anomalies.totalAnomalies > 0) flags.push({ severity: 'breach', text: `${label}: ${m.anomalies.totalAnomalies} anomal${singular ? 'y' : 'ies'} across ${m.anomalies.matchesWithAnomalies}/${m.anomalies.totalMatches} matches` });
// No change to the Flag type or to any existing flag's logic.
```

```ts
// e2e/bot-ui-actions.ts — Phase 2, new file. Types only; selectors are implementer-b's to resolve
// against the live DOM following the existing e2e locator conventions (gameplay.spec.ts, reconnect-bot-takeover.spec.ts).
import type { GameState } from '@/lib/types';
import type { LogEvent } from '../scripts/balance-simulator/log-parsers'; // deep import, e2e exemption

export type BotStep = 'cardStrategy' | 'purchases' | 'armyActions';

export interface BotStepResult {
  /** Every log-producing action this step took (Deploy, Upgrade, Buy Card, Use Card, etc.). */
  events: LogEvent[];
  /** Every army belonging to `seat` whose position changed this step, diffed from `state.players`
   *  before vs. after — the only signal for a plain move or an attack-initiating move onto an
   *  occupied tile, since `handleMoveAction` (movement.reducer.ts:45-123) logs neither. */
  moves: Array<{ armyId: number; to: { x: number; y: number } }>;
  /** The state after this step, purely as the oracle for the next step — never written anywhere. */
  state: GameState;
}

/** Runs one bot phase against `state` purely in Node; used only to decide what to click next. */
export function planNextStep(state: GameState, seat: number, step: BotStep): BotStepResult;

/** Performs every UI interaction `result` implies for `seat` on `page`: each `moves` entry first
 *  (select the army, click its destination tile — this also drives an attack, since combat starts
 *  by moving onto an occupied tile), then each `events` entry (Deploy/Upgrade/Buy Card/Use
 *  Card/End Turn, etc.). Throws if an action's `data-testid`/role locator isn't found (a real UI
 *  bug the spec should surface, not swallow). */
export function performUiAction(page: import('@playwright/test').Page, result: BotStepResult, seat: number): Promise<void>;
```

## Phases
### Phase 1: headless rule-bug track
1. implementer-a: add `Anomaly` to `engine.ts`, extend `TurnSnapshot`, capture `console.warn`/`console.error` per turn in `runMatch`'s loop. (sonnet)
2. implementer-a: `metrics/anomalies.ts` (`computeAnomalies`), wire into `metrics/index.ts`'s `ConfigMetrics`/`computeConfigMetrics`. (sonnet)
3. implementer-a: update `metrics/test-fixtures.ts`'s `turn()` default; add the Anomalies flag to `report/flags.ts`; add the Anomalies table to `report/markdown.ts`'s `configSection`. (sonnet)
4. implementer-a: add the Anomalies row + short paragraph to `docs/balance-simulator-guide.md`.
5. implementer-b: write `.claude/agents/balance-rule-reviewer.md` per the Contracts' required content. (sonnet)
6. tester-a: tests for steps 1-3 (`engine.test.ts`, `metrics/anomalies.test.ts`, `metrics/index.test.ts`, `report/flags.test.ts`, `report/index.test.ts` if applicable). (sonnet)
7. Run `npm run typecheck`, `npx eslint scripts/balance-simulator docs/balance-simulator-guide.md`, `npx jest scripts/balance-simulator`.

Model escalation: all of 1-6 (per triage's blanket L-tier escalation).

### Phase 2: UI-bug track
1. implementer-b: `e2e/bot-ui-actions.ts` (`planNextStep`, `performUiAction`) covering every `LogEvent` kind reachable per `NEVER_CONSUMED_BY_BOTS`. (sonnet)
2. tester-a: `e2e/bot-ui-actions.test.ts` for `planNextStep`'s pure diffing logic. (sonnet)
3. tester-b: `e2e/bot-vs-bot-ui.spec.ts` — two-context orchestration, per-turn capture, post-match filtering, written capture folder. (sonnet)
4. tester-b: `.claude/agents/ui-bug-reviewer.md` per the Contracts' required content. (sonnet)
5. Run `npm run typecheck`, `npx eslint e2e`, `npx jest e2e/bot-ui-actions.test.ts`, then one real `npm run test:e2e -- e2e/bot-vs-bot-ui.spec.ts` run to confirm the spec completes and produces a capture folder.

Model escalation: all of 1-4 (per triage's blanket L-tier escalation).

## Required content for the two new agent files
Both follow the frontmatter shape of `.claude/agents/docs-sync.md:1-13` (`name`, `description`, `tools: Read, Grep, Glob`, `model: sonnet`, `effort`, `color`, `skills: [agent-protocol, anti-hallucination, caveman]`), plus:
- `balance-rule-reviewer`: `description` states it runs after `npm run balance:simulate` (or an equivalent `--out` run) produces `report.md`/`report.json`, reads both plus `docs/architecture/game-mechanics.md`, and reports each flagged balance/rule concern with the exact config label and metric it came from; never a Claude call per match/turn. Its `## Do`/`## Don't` tell it to cite `report.md`'s own numbers and flag text, not to re-derive statistics, and to check a suspected rule bug's config/section against `docs/architecture/game-mechanics.md` before calling it a bug (code vs. doc drift is a separate finding, not a rule bug).
- `ui-bug-reviewer`: `description` states it runs after `e2e/bot-vs-bot-ui.spec.ts` produces a filtered capture folder, reads only that folder's screenshots and buffered console/network logs, and reports each turn where the capture shows a broken interaction (console error, failed request, a click that didn't produce its expected effect) with the turn number and file path as evidence. Its `## Do`/`## Don't` tell it never to open the full, unfiltered log (the spec has already filtered; re-reading everything defeats the point of filtering) and to distinguish a cosmetic console warning from an actual broken interaction by what the screenshot shows, not by the console line alone (per skill `agent-protocol`'s rule on tracing a finding to its real cause before calling it non-blocking).

## Test plan
- tester-a (logic, first):
  - `engine.test.ts`: a turn with a normal action has `anomalies: []`; feeding `handleGameAction` (via a reachable bot path, or directly within a small added `game-rules.reducer.ts`-level test if a bot path can't force the default case) an unrecognized action produces one `unhandledAction` anomaly attributed to the correct seat and round; the existing determinism test still passes with the new field present.
  - `metrics/anomalies.test.ts`: zero matches → `totalAnomalies: 0`; one match with two anomalous turns bearing the same message → `byMessage` has one row with `count: 2`; two matches with different messages → two separate rows; `matchesWithAnomalies` counts a match once regardless of how many anomalous turns it had.
  - `metrics/index.test.ts`: `computeConfigMetrics` surfaces the fixture's anomaly count unchanged.
  - `report/flags.test.ts`: the new flag fires only when `totalAnomalies > 0`; its severity is `'breach'` even when `gatedByBotHealth` is `true` (never suppressed).
  - `e2e/bot-ui-actions.test.ts` (Phase 2): `planNextStep` returns `{ events: [], moves: [], state }` unchanged when a bot phase does nothing; returns the exact `LogEvent[]` tail `parseLogLine` would produce for a seeded state that deploys/buys a card; returns a populated `moves` diff and an empty `events` for a seeded state where the only change is a plain army reposition (no log line), proving `moves` is not derived from the log.
- tester-b (view and e2e):
  - `e2e/bot-vs-bot-ui.spec.ts`: a full 2-seat bot-vs-bot match completes (reaches `Finished` or a round cap) purely through real clicks; at least one capture folder is written; a deliberately broken selector (temporarily renamed in a local run, not committed) produces a flagged turn, confirming the filter actually catches a broken interaction rather than only passing silently.

## Preview states
None — no new or changed React component; Phase 1 is a Node CLI/report tool, Phase 2 is an e2e spec plus two agent-definition files.

## Risks
- Phase 1's `console.warn`/`console.error` capture changes `runMatch`'s spy setup; if a test elsewhere asserts the spies' exact call count (none currently do, per `engine.test.ts`), it would break — tester-a re-checks this when writing the new assertions.
- Phase 2's click-based translation can drift from the oracle state if a UI action takes visibly longer than the sync timeout; `bot-vs-bot-ui.spec.ts` must re-read live state before each step (never assume the UI applied the previous step by the time the next one starts), the same `SYNC_TIMEOUT_MS`-bounded-wait convention `reconnect-bot-takeover.spec.ts:5` already uses.
- `.claude/agents/*.md` frontmatter mistakes (wrong `tools:` list, missing `skills:`) aren't caught by `npm run typecheck`/`lint`/`test`; implementer-b/tester-b must diff their file's frontmatter shape against `docs-sync.md`'s by hand before reporting DONE.

## Review (architect-b)
VERDICT: APPROVED

Re-verified `movement.reducer.ts` directly: only three `pushLogEntry` calls exist in the file — line 68 (teleport, inside the `isTeleport` branch), line 93 (leaving a resource position, inside the `:85-98` range cited), line 108 (extra move, inside the `:106-112` range cited). Teleport is the only third case, and it doesn't need `moves`-diff coverage: `CardName.Teleport` is in `NEVER_CONSUMED_BY_BOTS` (`acceptance.test.ts:26-36`), so bots never take that path — `applyBotArmyActions` only ever drives the two logged cases plus the unlogged plain-move/attack-initiating case already covered by `moves`. No fourth case exists (grepped the whole file for `pushLogEntry`). `revealIsland` (called from `handleMoveAction:118-120` on first discovery) does push its own log entries (`island-discovery.reducer.ts:20,29,40,47,64,71`), which is fine: those surface through `events` as before (`discoveryVP`/`explorerVP`/monster kinds) and don't conflict with `moves` — a discovery-triggering move gets both signals, a plain non-discovery move gets only `moves`. The fix in `BotStepResult`/`performUiAction` closes the blocking gap: every army position change is now observable to `performUiAction` independent of whether the step happened to log anything.

The earlier non-blocking signature mismatch is also resolved — File plan (line 77) and Contracts (line 150) both read `performUiAction(page, result, seat)`.

No other changes needed. Plan is otherwise unchanged from the prior fully-verified pass (all other "Verified context" rows, Decisions, and Phase 1 content stand as previously confirmed).

### Revision note (architect-a)
Addressed both review points:
- Blocking: `planNextStep` now returns `BotStepResult` (`events: LogEvent[]` plus `moves: Array<{ armyId: number; to: { x: number; y: number } }>`, the latter diffed from `Army.position` before/after the step, since `handleMoveAction` logs neither a plain move nor an attack-initiating move — see "Verified context"'s `handleMoveAction` row and the new Decisions bullet). `performUiAction(page, result, seat)` now consumes the full `BotStepResult`, clicking every `moves` entry (which also drives attacks, since combat starts by moving onto an occupied tile) before the `events`-derived actions. File plan, Contracts, Phase 2 steps and the test plan were all updated to match.
- Non-blocking: `performUiAction`'s signature is now `(page, result, seat)` everywhere — File plan row and Contracts block agree.
