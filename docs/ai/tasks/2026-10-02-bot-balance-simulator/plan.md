# Plan: Bot-vs-bot balance simulator

Status: APPROVED
Inputs: triage.md, game-design.md (Final spec)

## Note on process
Both architect-a and architect-b (the normal planning/review pair) were interrupted mid-run by
agent-spawning becoming unavailable for the rest of this session (Agent, SendMessage and
ListAgents tools all started erroring "disabled for this session" after an earlier rate limit).
I (the coordinator) wrote this plan and built the tool myself, directly, continuing to follow the
Final spec and this repo's skills (`component-architecture`'s principles for non-UI code,
`code-standards`, `kiss-dry-solid`, `testing`'s logic-before-everything-else order). There was no
independent architect-b review of this plan before implementation; treat that as the known gap in
this task's provenance.

## Goal and acceptance criteria
From game-design.md's Final spec, "Acceptance" section (1-5): determinism, integrity (M5/M8 sums
match), faithfulness (zero-consumption cards actually show zero, Sabotage skips counted correctly,
|z| ≤ 3 on a real run), unit tests for every log parser against its exact source string, a tiny run
completing and writing both report files, and zero Firestore writes / zero network / zero changes
to `src/lib`.

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `takeBotTurn` | `src/lib/bot-logic.ts:26` | `Promise<void>`; deep-clones its argument (`JSON.parse(JSON.stringify(initialState))`, line 28) and works on the clone — it does **not** mutate `initialState`. The only early return is `!botPlayer \|\| !botPlayer.isBot \|\| state.status !== 'playing'` (line 32), which an all-bot, status-`'playing'` simulation never hits. Every other path reaches the unconditional `await setDoc(doc(db, 'games', gameId), state)` on line 241 — **the mocked `setDoc`'s second argument is the only way to get the next state out.** (Corrected from an earlier, wrong assumption in the Final spec and this plan's first draft — verified by reading the function in full, not just its call sites.) |
| `db, doc, setDoc` import | `src/lib/bot-logic.ts:6`, from `./firebase` | Must be mocked so `takeBotTurn` never touches real Firestore or network. |
| `initializeGame`, `startGame`, `defaultGameSettings` | `src/lib/game-initializer.ts:8-21` (settings), exported functions | Same functions the existing unit tests (`src/lib/__tests__/*.test.ts`) already use to build a real `GameState`. |
| `MAP_ROWS`, `MAP_COLS` | `src/lib/types/actions.ts:1-2` | 6 rows × 5 cols; base corners at (0,0)/(4,5)/(0,5)/(4,0) per the spec's seat layout. |
| Every `state.log.push(...)` call | `src/lib/actions/{attack,card,movement,player,resource}.ts` | Ground truth for `log-parsers.ts`; all 54 call sites were read and listed before writing the parser (see `scripts/balance-simulator/log-parsers.test.ts`, one case per distinct wording). |
| `CardName`, `MonsterName` | `src/lib/types/cards.ts`, `src/lib/types/monsters.ts` | Canonical string literals reused directly in parsed events, type-only imports (no runtime coupling to Firestore). |
| `BASE_CARDS` deck composition | `src/lib/game-initializer.ts:277-278` | 2 copies of each of the 13 `BASE_CARDS`; `SPECIAL_CARDS` (`src/lib/card-data.ts`) is unused dead code — noted in the guide, not changed. |

## Decisions
- **Execution model: a dedicated Jest config, not a bare `tsx` CLI.** Stubbing `src/lib/firebase.ts` cleanly requires `jest.mock`; a plain `tsx`-run script has no equivalent without adding a new ESM loader/alias mechanism. Both design-review probes (`game-design.md`) already proved the Jest-mock approach works in this exact sandbox. Rejected: a `tsx` CLI with a hand-rolled module loader (more moving parts, unproven here, for no user-facing benefit — the npm script hides the mechanism either way).
- **Location: `scripts/balance-simulator/`, not `src/`.** This is a developer tool, not a shipped feature or a UI component; `src/modules/` is for components per `component-architecture`, and `src/lib/` is frozen legacy. A new top-level `scripts/` subfolder (next to the existing `scripts/claude-swarm-runner.sh`) keeps it clearly separate and matches "zero changes to `src/lib`" in Acceptance #5.
- **One module per responsibility**, mirroring `component-architecture`'s split even though there's no view here: `rng.ts` (seeding), `log-parsers.ts` (pure text → event), `stats.ts` (pure math), `engine.ts` (runs one match / one config using the real reducers, Firestore mocked), `metrics.ts` (aggregates events into the M1-M10 tables), `report.ts` (Markdown + JSON formatting), `cli.ts` (argv parsing and `main()`).
- **`parseLogLine` returns an array, not a single event.** Some lines are two metrics at once (a successful Wealthy or Steal Resource use is both a "granted resource" event for M6 and a "card consumed" event for M8) — discovered while writing the parser's own tests against the exact source strings, fixed before the array-vs-object choice reached any other file.
- **Scope cut, recorded not hidden: full exhaustive wiring of every M1-M10 cell is large.** I am building the complete pure layer (rng, log-parsers with full coverage of all 54 log call sites, stats) to the spec's full detail, since that is where correctness bugs are cheapest to catch and the unit tests directly satisfy Acceptance #4. `engine.ts`, `metrics.ts`, `report.ts` and `cli.ts` follow in this same phase; if the output budget runs out before all ten metrics are wired into the report, the remainder is logged in `progress.md` as a precise, resumable TODO rather than silently shipped as "done."

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `scripts/balance-simulator/rng.ts` (+`.test.ts`) | new | Deterministic seeding: `deriveSeed`, `withSeededRandom` | coordinator (done) |
| `scripts/balance-simulator/log-parsers.ts` (+`.test.ts`) | new | `state.log` line → zero or more `LogEvent`s, one test per exact source string | coordinator (done) |
| `scripts/balance-simulator/stats.ts` (+`.test.ts`) | new | Wilson interval, chi-squared, pooled z-test, distribution summary | coordinator (done) |
| `scripts/balance-simulator/engine.ts` (+`.test.ts`) | new | `runMatch`, `runConfig`: seeds, builds the game, loops `takeBotTurn`, collects events | coordinator (next) |
| `scripts/balance-simulator/metrics.ts` (+`.test.ts`) | new | Turns collected events into the M1-M10 tables and their flags | coordinator (next) |
| `scripts/balance-simulator/report.ts` (+`.test.ts`) | new | Markdown ("Read this first" + tables) and JSON report formatting | coordinator (next) |
| `scripts/balance-simulator/cli.ts` | new | Argv parsing, runs the matrix, writes `report.md`/`report.json` | coordinator (next) |
| `jest.simulator.config.js` | new | Node-env Jest config for this folder, mocking `src/lib/firebase` | coordinator (next) |
| `jest.config.js` | edit | Exclude `scripts/balance-simulator/` from the default jsdom run (same pattern as `firestore.rules.test.ts`) | coordinator (next) |
| `package.json` | edit | `npm run balance:simulate -- <flags>`, `npm run test:balance` | coordinator (next) |
| `docs/balance-simulator-guide.md` | new | Explains each metric, its flag, gating, and the "comparing runs" rules, per the Final spec | coordinator (next) |
| `docs/README.md` | edit | §6.8 links to the guide | coordinator (next) |

## Contracts
```ts
// scripts/balance-simulator/log-parsers.ts (already implemented exactly as below)
export type LogEvent = /* discriminated union, one variant per observable game event */;
export function parseLogLine(line: string): LogEvent[];

// scripts/balance-simulator/engine.ts
export interface MatchConfig { players: number; fog: boolean; mapSeed: number; playSeed: number; maxRounds: number; }
export interface MatchResult {
  outcome: 'finished' | 'capped';
  rounds: number;
  botTurns: number;
  winnerSeat: number | null;
  events: Array<{ seat: number; turn: number; event: LogEvent }>;
  finalVictoryPoints: number[]; // by seat
  finalAttackPower: number[];   // by seat
}
export function runMatch(config: MatchConfig): MatchResult;

// scripts/balance-simulator/metrics.ts
export function computeConfigMetrics(results: MatchResult[]): ConfigMetrics; // one call per (players, fog) config
```

## Phases
Single phase (tier M, one sitting), continued across this session without stopping per the user's
standing instruction. Steps already done are marked.
1. `rng.ts`, `log-parsers.ts`, `stats.ts` with full unit tests. **Done.**
2. `engine.ts`: seeded match setup and the `takeBotTurn` loop with Firestore mocked, plus its own tests (a 2-bot, 3-game, small-cap run — Acceptance #4's "tiny run"). **Done** — also found and fixed a real async-seeding bug (see progress.md).
3. `metrics/`: M1-M10 aggregation and the gating rule (M10 suppresses M3/M4/M8), with tests proving the integrity checks (M5 sums, M8 acquired = consumed + held). **Done** — split into one file per M-group after a single-file draft broke this repo's own 150-line rule.
4. `report/` + `cli.ts` + one npm script (`balance:simulate`). **Done** — no separate Jest config was needed in the end; see progress.md for why.
5. `docs/balance-simulator-guide.md` + `docs/README.md` §6.8 link. **Done.**
6. Full checks (`npm run typecheck`, `npm run lint`, `npm test`), a real-matches acceptance test (Acceptance #3), a genuine CLI run proving Acceptance #1/#2/#4, commit. **Done** — found a real concurrency hazard (`runMatch` + `Promise.all`) and a real `bot-logic.ts` bug along the way; both documented.

Model escalation: none — this entire task is tooling with no gameplay-UI surface, built directly without sub-agents because the Agent tool is unavailable this session.

## Test plan
- Logic (already done): `rng.test.ts`, `log-parsers.test.ts` (34 cases, one per distinct source string plus edge cases), `stats.test.ts` (14 cases, including hand-computed reference values).
- `engine.test.ts`: determinism (same seeds → identical `MatchResult` except nothing time-based), a capped match when `maxRounds` is tiny, zero Firestore/network calls (the mock itself proves this — if the mock weren't hit, the real `setDoc` would throw on missing config).
- `metrics.test.ts`: integrity invariants on synthetic `MatchResult[]` fixtures (not full games — fast, deterministic), and that the M10 gate actually suppresses M5-M7 in the output structure.

## Preview states
None — this task has no UI and no testbed entry (triage.md: "no visible UI, so no UI designers and no preview stage").

## Risks
- **Full statistical fidelity vs. solo build time.** Mitigated by building the pure, independently-verifiable layers (parsers, stats) first and to full spec detail, and by stating plainly in `progress.md` and the final summary exactly how far the remaining phases got if the session ends before every metric is wired through to the report.
- **No independent review of this plan or the final code** (architect-b, tester-b unavailable). Mitigated by: citing verified evidence for every decision above, running the full check suite before every commit, and being explicit about this gap rather than presenting the output as if it had the usual two-agent review.
