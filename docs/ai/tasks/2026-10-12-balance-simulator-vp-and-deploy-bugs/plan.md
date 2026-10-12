# Plan: Balance-simulator M5 VP misattribution + bot Deploy affordability bug

Status: APPROVED
Inputs: triage.md

## Goal and acceptance criteria
- [ ] M5's PvP victory-point credit (`scripts/balance-simulator/metrics/victory-point-sources.ts`) is attributed to the seat that actually won the combat and received the VP (per `combat-player-resolve.reducer.ts`'s `winner`), not to the seat whose turn it is — a defender-wins-PvP fixture's summed `pvp` VP no longer exceeds that seat's recorded final VP, and is credited to the correct (defender) seat, not the attacker's.
- [ ] A fresh `npm run balance-sim` style run (or the existing `30`-game acceptance config) produces `mismatchCount === 0` for M5 where it previously reported 3-31 mismatches per config — verified via `scripts/balance-simulator/acceptance.test.ts` and/or `victory-point-sources.test.ts`.
- [ ] `bot-purchases.reducer.ts`'s Deploy-cost pre-check (`applyBotPurchases`) applies the Reinforce/Efficient discount only when `canUseCard` is true (mirroring `handleDeployAction`), so a bot that already used its one card-use action this turn never proposes an undiscounted-cost Deploy it can't afford — no more `Error handling action deploy: Not enough food. Cost: N` anomalies from this cause.
- [ ] `docs/balance-simulator-guide.md`'s "A bug the simulator found on its first real run" section (lines 87-110) is rewritten in the past tense, with current paths (`bot-purchases.reducer.ts`, `player-actions.reducer.ts`), the current error text (`"Not enough food. Cost: ${cost}"`), and current behavior (caught and logged by the dispatcher, not silently swallowed).

## Verified context
| Symbol or file | Location | Why it matters |
|---|---|---|
| `runMatch`, `MatchResult`, main loop | `scripts/balance-simulator/engine.ts:71-137` (loop: `:102-119`) | `actingSeat = state.currentPlayerIndex` (`:103`) is attached to every `TurnSnapshot` (`:117`) regardless of who the events inside it actually belong to; this is the seat `victory-point-sources.ts` currently (wrongly) uses for PvP VP. |
| `computeM5` | `scripts/balance-simulator/metrics/victory-point-sources.ts:30-69`, bug line `:50-52` | Credits `bySeat[turn.seat].pvp += 5` / `perMatchVP[turn.seat] += 5` unconditionally for every `pvpVictoryPoints` event — the bug. |
| `LogEvent`, `parseLogLine`, `MATCHERS` | `scripts/balance-simulator/log-parsers.ts:13-33` (type), `:57` (`pvpVictoryPoints` matcher, `:70`), `:155-157` (`parseLogLine`) | `parseLogLine(line: string): LogEvent[]` only ever sees the already-flattened message text; it never receives the structured log entry's `playerId`, so it has nothing to resolve the real winner from except the acting seat. |
| `handleCloseCombat` | `src/modules/game-rules/combat-player-resolve.reducer.ts:9-131`; VP award `:32,72`; log push `:33-38,73-78` | `winner`/`loser` are resolved from `combatState.winnerId`/`attackerId`/`defenderId` (`:16-20`), not from `state.currentPlayerIndex` — the defender can be `winner`. The VP-award log line is pushed via `pushLogEntry` with `playerId: winner.playerId` (`:36`, `:76`) — the real attribution data already exists on the entry, just discarded by the simulator. |
| `pushLogEntry`, `StructuredLogEntry` | `src/modules/game-rules/log-entry.ts:1-8`; type `src/lib/types/game.ts:30-44` | Every current reducer log push in `src/modules/game-rules` uses `pushLogEntry` (confirmed: `grep pushLogEntry` across the module returns only `pushLogEntry(...)` calls, no raw `state.log.push(string)` call sites) — `entry.playerId` is reliably present on every PvP-combat log entry in practice. |
| `Player.id`, `Player.playerId` | `src/lib/types/player.ts:19-21` | `id: number` is the seat index (0-3); `playerId: string` is the stable per-match session id. `game-setup.reducer.ts:52,78` (`createPlayer(creatorSeatIndex, ...)`, `createPlayer(botSeatIndex, ...)`) confirms `players[i].id === i` always, for every seat this simulator creates — `state.players.map(p => p.playerId)`, indexed by array position, is therefore a valid seat→playerId table for the whole match. |
| `engine.ts`'s log→event pipeline | `engine.ts:112-115` | `.map((entry) => typeof entry === 'string' ? entry : entry.message)` strips every entry down to its message string before `parseLogLine` ever sees it — this is where the `playerId` gets dropped. |
| `handleDeployAction` | `src/modules/game-rules/player-actions.reducer.ts:11-79`; gate `:21`, discount `:23-29`, throw `:31` | `canUseCard = !player.actionsThisTurn.includes(GameAction.UseCard)` (`:21`); discount applied only `&& canUseCard` (`:23,26`); throws `` `Not enough food. Cost: ${cost}` `` (`:31`) when `player.resources.food < cost`. Precedence: Reinforce checked before Efficient. |
| `applyBotPurchases` | `src/modules/game-rules/bot-purchases.reducer.ts:7-50`; bug `:30-33` | `deployCost = activeBot.efficientActive ? half : (activeBot.reinforceActive ? 0 : full)` — no `canUseCard` gate, and checks Efficient before Reinforce (opposite precedence from `handleDeployAction`). |
| `canAfford` | `src/modules/game-rules/bot-helpers.ts:9-11` | `player.resources[resource] >= cost` — used as-is, unchanged. |
| `handleGameAction` dispatcher | `src/modules/game-rules/game-rules.reducer.ts:31-141`; catch `:136-140` | On a thrown error, logs `console.error('Error handling action ${action}:', error)` and returns `{ state: gameState }` (the **pre-dispatch** state object, always truthy) — so `applyBotPurchases`'s `if (temp.state) currentState = temp.state;` (`bot-purchases.reducer.ts:34`) always reassigns, but to an unchanged state on failure. The observable bug is the `console.error` anomaly, not state corruption. |
| `test-fixtures.ts` | `scripts/balance-simulator/metrics/test-fixtures.ts:32-42` (`match()`) | `MatchResult` builder fills every field except what's in `overrides`; adding a required `seatPlayerIds` field to `MatchResult` means this builder's default object needs a default for it too, or every other metrics test file that calls `match({...})` without it fails to typecheck. |
| existing `victory-point-sources.test.ts` case | `scripts/balance-simulator/metrics/victory-point-sources.test.ts:6-23`, specifically `:12,22` | Today's passing assertion (`turn({ seat: 1, events: events({ kind: 'pvpVictoryPoints' }) })` → `m5.bySeat[1].pvp` is `5`) *is* the bug's current (wrong) behavior encoded as a "passing" test — crediting the turn's acting seat. It must be rewritten, not left as-is, once seats are resolved via `winnerPlayerId`. |
| existing `log-parsers.test.ts` case | `scripts/balance-simulator/log-parsers.test.ts:26-28` | Calls `parseLogLine('Bot 0 receives 5 VP for defeating Bot 1!')` with no second argument and expects `{ kind: 'pvpVictoryPoints' }` with no `winnerPlayerId` — must be updated to pass a `playerId` and assert it on the returned event. |

## Root cause (bugs only)

### Bug 1 — M5 PvP VP misattribution
- Reproduction: a defender-wins-PvP fixture (one `pvpVictoryPoints` event on the *attacker's* turn, whose `finalState` only credits the real winner, the defender, with the 5 VP) — today, `computeM5` credits the attacker's seat instead, so `perMatchVP[attackerSeat]` exceeds the attacker's real final VP (the M5 integrity check's flagged "mismatch"), while the defender's real VP is silently undercounted (not flagged, by design).
- Cause: `victory-point-sources.ts:50-52` uses `turn.seat` (the acting seat, set in `engine.ts:103,117` from `state.currentPlayerIndex`) to attribute every `pvpVictoryPoints` event, but PvP combat's winner is resolved independently of whose turn it is (`combat-player-resolve.reducer.ts:16-20`) and can be the defender. The correct attribution (`winner.playerId`) is already on the log entry (`:36,76`) but is discarded before `parseLogLine` ever runs (`engine.ts:112-115` keeps only `.message`).

### Bug 2 — bot proposes an unaffordable Deploy
- Reproduction: a bot with `efficientActive: true` (or `reinforceActive: true`), `actionsThisTurn` already containing `GameAction.UseCard` (simulating "already used a card this turn"), and food between the discounted and full `nextArmyCost` — `applyBotPurchases` dispatches `GameAction.Deploy`, which `handleDeployAction` correctly rejects (`Not enough food. Cost: <full cost>`), producing a `console.error` anomaly that a correct bot would never trigger.
- Cause: `bot-purchases.reducer.ts:30-32` computes `deployCost` from `activeBot.efficientActive`/`reinforceActive` with no `canUseCard` gate, so it still believes the discount applies even after the bot has already spent its one card-use action this turn.

## Decisions
- Thread attribution through the already-existing `StructuredLogEntry.playerId` field (set to `winner.playerId` at the source, `combat-player-resolve.reducer.ts:36,76`) rather than re-deriving the winner's name from the log *string* and resolving a name→seat lookup. Because: the correct data already exists one step upstream of where it's currently thrown away (`engine.ts:112-115`); re-parsing a name out of `"X receives 5 VP for defeating Y!"` and matching it back to a `Player.name` is strictly more code, more brittle (names aren't guaranteed unique off this simulator's own `Bot N` convention), and re-derives what the structured log entry already carries as data, not text. Rejected: name-based resolution (triage's suggested mechanism) — same section notes "left to architect-a to design the exact mechanism", and the entry's own `playerId` is the simpler one.
- Keep `parseLogLine`'s existing signature `(line: string): LogEvent[]` and *add* an optional second parameter (`playerId?: string`) rather than changing its first parameter to take the whole `LogEntry`. Because: `log-parsers.test.ts` has ~25 existing cases calling `parseLogLine('<plain string>')`; a signature that still accepts a bare string with no second argument keeps all of them compiling and passing unchanged, and only the one `pvpVictoryPoints` case needs updating. Rejected: `parseLogLine(entry: LogEntry)` — same outcome, but forces every existing call site/test to pass an object instead of a string for no added benefit here.
- Add `seatPlayerIds: string[]` to `MatchResult` (built once per match from `state.players.map(p => p.playerId)`, index = seat, per the `Player.id === index` invariant in Verified context) and resolve `event.winnerPlayerId` to a seat inside `computeM5`, rather than resolving to a seat earlier in `engine.ts` and storing a numeric `winnerSeat` directly on the event. Because: `victory-point-sources.test.ts` tests `computeM5` against hand-built `MatchResult` fixtures (per triage's planned reproduction test) — the seat-resolution step has to be visible and fixturable at that boundary, not buried inside `engine.ts` where it can't be exercised without running a real match. Rejected: resolving in `engine.ts` and emitting `winnerSeat` directly on the `TurnSnapshot`/event — simpler data flow, but moves the bug's actual fix (the resolution logic) out of the file whose bug this is and out of reach of `computeM5`'s own unit tests.
- When `event.winnerPlayerId` can't be resolved to a seat (`undefined`, or no match in `seatPlayerIds`), don't credit any seat — same convention `victory-point-sources.ts:56-57` already uses for `explorerVP` (an acknowledged undercount, excluded from the integrity check, documented in the guide's limitations). Because: crediting the wrong seat is the bug being fixed; silently under-counting is the existing, already-accepted failure mode for "can't attribute this one."
- Fix `bot-purchases.reducer.ts`'s Deploy pre-check to gate on `canUseCard` *and* to check Reinforce before Efficient, matching `handleDeployAction`'s own precedence (`player-actions.reducer.ts:23-26`), not just adding the gate to the existing (reversed) order. Because: the pre-check's whole purpose is to predict what `handleDeployAction` will actually do; leaving the precedence backwards would still mispredict the cost in the (rare, but real — `card-effects.reducer.ts:16-21` doesn't push `GameAction.UseCard` for immediate-effect cards, so both `reinforceActive` and `efficientActive` can be `true` at once) case where both flags are set. This is the same expression being edited for the gate, not a separate change.
- Do **not** fix the identical, un-triaged latent bug in `bot-purchases.reducer.ts:21-23` (the Upgrade/`masterBuilderActive` pre-check has the exact same missing-`canUseCard`-gate shape as the Deploy one). Because: it's outside this task's triaged scope (triage.md's Scope section names only the Deploy pre-check) and unverified as reproducible (no failing test or anomaly log for it in this session). Flagged below under Risks for a follow-up triage, not fixed here.
- Rewrite `docs/balance-simulator-guide.md:87-110` in place (same section, new content) rather than appending a new "fixed" section below it. Because: the section already exists specifically to document this bug; once fixed, updating it in place keeps one source of truth instead of two sections about the same bug at different points in time.

## File plan
| File | New / Edit | Responsibility | Owner |
|---|---|---|---|
| `scripts/balance-simulator/log-parsers.ts` | edit | `LogEvent`'s `pvpVictoryPoints` variant gains `winnerPlayerId?: string`; `parseLogLine` gains an optional second `playerId` param, forwarded to `build()`; the `pvpVictoryPoints` matcher's `build` sets `winnerPlayerId` from it | implementer-a |
| `scripts/balance-simulator/log-parsers.test.ts` | edit | Update the existing `pvpVictoryPoints` case (line 26-28) to pass a `playerId` second argument and assert it comes back on the event | tester-a |
| `scripts/balance-simulator/engine.ts` | edit | `MatchResult` gains `seatPlayerIds: string[]`; `runMatch` populates it from `state.players.map(p => p.playerId)`; the turn loop passes each log entry's `playerId` (when structured) through to `parseLogLine` instead of stripping it first | implementer-a |
| `scripts/balance-simulator/metrics/victory-point-sources.ts` | edit | `computeM5`'s `pvpVictoryPoints` branch resolves `event.winnerPlayerId` to a seat via `result.seatPlayerIds` and credits that seat (falling back to "uncredited" when unresolved) instead of `turn.seat` | implementer-a |
| `scripts/balance-simulator/metrics/test-fixtures.ts` | edit | `match()`'s default object gains `seatPlayerIds: []` so unrelated `match({...})` calls elsewhere keep compiling without having to set it | implementer-a |
| `scripts/balance-simulator/metrics/victory-point-sources.test.ts` | edit | Add the defender-wins-PvP reproduction case (failing before the fix, per tester-a's first pass); rewrite the existing `pvpVictoryPoints` case (line 6-23) to set `seatPlayerIds` and `winnerPlayerId` explicitly instead of relying on `turn.seat` | tester-a (repro case first), implementer-a (confirm still passes after the fix) |
| `src/modules/game-rules/bot-purchases.reducer.ts` | edit | Deploy-cost pre-check (`:30-32`) gains the same `canUseCard` gate and Reinforce-before-Efficient precedence `handleDeployAction` uses | implementer-b |
| `src/modules/game-rules/bot-purchases.reducer.test.ts` | new | Reproduction case first (bot with a card already used this turn + `efficientActive`/`reinforceActive`, proposing an unaffordable Deploy today); then the passing case after the fix (no `console.error` anomaly, no Deploy attempted) | tester-a (repro case first), implementer-b (confirm passes after fix) |
| `docs/balance-simulator-guide.md` | edit | Rewrite lines 87-110 ("A bug the simulator found on its first real run") in past tense with current paths/error text/caught-not-swallowed behavior | implementer-b |

No `preview-a`/`preview-b`/`docs-sync` rows: no UI, no `docs/architecture/*.md` change (per triage.md's scoping).

## Contracts
```ts
// scripts/balance-simulator/log-parsers.ts

export type LogEvent =
  | { kind: 'discoveryVP' }
  | { kind: 'monsterWin'; monsterName: MonsterName; vp: number }
  | { kind: 'monsterLoss'; monsterName: MonsterName }
  // winnerPlayerId is the winning Player's `playerId` (stable session id), read straight off the
  // structured log entry's own `playerId` field (combat-player-resolve.reducer.ts:36,76 pushes
  // `playerId: winner.playerId`) — undefined only if the entry that produced this match was a bare
  // string with no structured data (not expected from any current reducer; see Verified context).
  | { kind: 'pvpVictoryPoints'; winnerPlayerId?: string }
  | { kind: 'pvpResult' }
  | { kind: 'explorerVP' }
  // ...every other existing LogEvent variant, unchanged...
  | { kind: 'collectorGather' }
  | { kind: 'autoCollect' }
  | { kind: 'productiveCollect' }
  | { kind: 'wealthyGranted' }
  | { kind: 'stealGranted' }
  | { kind: 'deployed' }
  | { kind: 'upgraded' }
  | { kind: 'abilityBought'; abilityName: AbilityName }
  | { kind: 'cardBought'; cardName: CardName }
  | { kind: 'specialIslandCardFound'; cardName: CardName }
  | { kind: 'drawLostToFullHand' }
  | { kind: 'cardActivated' }
  | { kind: 'cardConsumed'; cardName: CardName }
  | { kind: 'sabotageSkip' };

/** Unchanged for every existing caller that passes only `line`. `playerId`, when given, is the
 *  structured log entry's own `playerId` (undefined for a bare-string entry) — forwarded to
 *  whichever matcher's `build` wants it; every other matcher ignores the extra argument. */
export function parseLogLine(line: string, playerId?: string): LogEvent[];


// scripts/balance-simulator/engine.ts

export interface MatchResult {
  outcome: 'finished' | 'capped';
  rounds: number;
  botTurns: number;
  winnerSeat: number | null;
  turns: TurnSnapshot[];
  finalState: SeatFinalState[];
  /** seatPlayerIds[seat] = that seat's stable Player.playerId for the whole match. Built once from
   *  `state.players.map(p => p.playerId)`; index === seat because `Player.id === array index` for
   *  every seat this simulator creates (game-setup.reducer.ts:52,78). Used by victory-point-sources.ts
   *  to resolve a `pvpVictoryPoints` event's `winnerPlayerId` back to a seat. */
  seatPlayerIds: string[];
}

// Turn-loop change (illustrative, not literal): each new log entry's own `playerId` (when the
// entry is structured; undefined for a bare string) is passed through to parseLogLine alongside
// its message — the entry is no longer flattened to a bare string before parsing.
// for (const entry of nextState.log.slice(logLengthBeforeTurn)) {
//   const line = typeof entry === 'string' ? entry : entry.message;
//   const playerId = typeof entry === 'string' ? undefined : entry.playerId;
//   events.push(...parseLogLine(line, playerId));
// }


// scripts/balance-simulator/metrics/victory-point-sources.ts

// computeM5's pvpVictoryPoints branch, replacing today's unconditional `turn.seat` credit:
// } else if (event.kind === 'pvpVictoryPoints') {
//   const winnerSeat = event.winnerPlayerId === undefined
//     ? undefined
//     : result.seatPlayerIds.indexOf(event.winnerPlayerId);
//   if (winnerSeat !== undefined && winnerSeat !== -1) {
//     bySeat[winnerSeat].pvp += 5;
//     perMatchVP[winnerSeat] += 5;
//   }
//   // else: unattributable, left uncredited — same convention as explorerVP (see its comment above).
// }
// `result` here is the MatchResult currently being iterated in the existing `results.forEach`
// (victory-point-sources.ts:40) — `seatPlayerIds` must be read from it, not from a module-level or
// per-call constant, since it differs per match.


// scripts/balance-simulator/metrics/test-fixtures.ts

// match()'s default object gains one field, nothing else changes:
// export function match(overrides: Partial<MatchResult> & { finalState: SeatFinalState[] }): MatchResult {
//   return {
//     outcome: 'finished',
//     rounds: 10,
//     botTurns: overrides.turns?.length ?? 0,
//     winnerSeat: null,
//     turns: [],
//     seatPlayerIds: [],
//     ...overrides,
//   };
// }


// src/modules/game-rules/bot-purchases.reducer.ts

// Deploy-cost pre-check (replacing lines 30-32), matching handleDeployAction's own gate and
// precedence (player-actions.reducer.ts:21-29) exactly:
// const canUseCard = !activeBot.actionsThisTurn.includes(GameAction.UseCard);
// const deployCost = activeBot.reinforceActive && canUseCard
//   ? 0
//   : activeBot.efficientActive && canUseCard
//     ? Math.ceil(activeBot.nextArmyCost / 2)
//     : activeBot.nextArmyCost;
// (the `canAfford(activeBot, deployCost, ResourceEnum.Food) && ...` condition below it is unchanged)
```

## Phases
### Phase 1: both bugs (single phase, tier M)
1. tester-a: write the failing reproduction test in `scripts/balance-simulator/metrics/victory-point-sources.test.ts` — a match where the attacker initiates combat but the defender wins (set `winnerPlayerId` to the defender's `playerId` on the `pvpVictoryPoints` event, `seatPlayerIds` mapping both seats, `finalState` crediting only the defender with the 5 VP) — run it, confirm it fails against the current `computeM5`. (haiku)
2. tester-a: write the failing reproduction test in `src/modules/game-rules/bot-purchases.reducer.test.ts` — bot with `efficientActive: true`, `actionsThisTurn: [GameAction.UseCard]`, food between half and full `nextArmyCost` — assert today's behavior (a `console.error` anomaly fires, e.g. via `jest.spyOn(console, 'error')`) to prove the repro, then (in the same file) the fix's expected assertion (no such anomaly) so the file is ready for implementer-b to make it pass. (haiku; escalate to sonnet if blocked twice)
3. implementer-a: apply the Bug 1 fix across `log-parsers.ts`, `log-parsers.test.ts`'s existing case, `engine.ts`, `victory-point-sources.ts`, `test-fixtures.ts`, and confirm tester-a's new case from step 1 and the existing `victory-point-sources.test.ts` case (rewritten per the File plan) both pass. (haiku; escalate to sonnet if blocked twice)
4. implementer-b: apply the Bug 2 fix in `bot-purchases.reducer.ts` and confirm tester-a's case from step 2 passes; rewrite `docs/balance-simulator-guide.md:87-110`. (sonnet, per triage's reducer-risk escalation)
5. tester-a: run the full `scripts/balance-simulator` test suite (`npx jest scripts/balance-simulator`) once both fixes land, confirm green.

Model escalation: implementer-b runs on sonnet per triage's Overrides line (`bot-purchases.reducer.ts` is a real `src/modules/game-rules` reducer). implementer-a stays on haiku; escalate only on a second BLOCKER.

## Test plan
- tester-a (logic, first):
  - `victory-point-sources.test.ts`: defender-wins-PvP case (above) — summed `pvp` VP for the attacker's seat must stay 0, and the defender's seat must show `pvp: 5`; `mismatchCount` must be `0`.
  - `victory-point-sources.test.ts`: an unresolvable `winnerPlayerId` (not in `seatPlayerIds`, or `undefined`) must not credit any seat and must not throw.
  - `victory-point-sources.test.ts`: rewritten existing case (line 6-23) — same assertions as today but attribution driven by `winnerPlayerId`/`seatPlayerIds`, not `turn.seat`.
  - `log-parsers.test.ts`: `parseLogLine('Bot 0 receives 5 VP for defeating Bot 1!', 'bot_0')` → `[{ kind: 'pvpVictoryPoints', winnerPlayerId: 'bot_0' }]`.
  - `bot-purchases.reducer.test.ts`: bot with card already used + a discount flag active + affordable-only-at-the-discounted-cost → before the fix, a `console.error` anomaly fires and/or Deploy isn't actually applied; after the fix, `applyBotPurchases` doesn't attempt Deploy at all (no anomaly, `armies.length` unchanged).
  - `bot-purchases.reducer.test.ts`: bot with no card used yet, discount flag active, affordable only at the discounted cost → Deploy still succeeds (the fix must not regress the legitimate discounted case).
- tester-b: none — no `.tsx`, no view, no e2e flow touched (per triage.md's scope).

## Preview states
- None — no UI components.

## Risks
- `bot-purchases.reducer.ts:21-23` (the Upgrade/`masterBuilderActive` pre-check) has the identical missing-`canUseCard`-gate shape as the Deploy bug being fixed here, but is outside this task's triaged scope and unverified as reproducible this session. Flag for a follow-up triage; do not fix in this task.
- `seatPlayerIds` relies on the `Player.id === array index` invariant holding for the whole match. Verified for every seat this simulator creates (`game-setup.reducer.ts:52,78`, `engine.ts:88-94` — the simulator never uses the multiplayer lobby join/exit path that could reorder `players`). If a future change to `engine.ts` ever uses `player-join`/`player-exit` reducers, this invariant needs re-verifying.

## Review (architect-b)
VERDICT: APPROVED

Independently re-verified both load-bearing invariants named in the coordinator's note, plus every other Verified-context row:

- **`Player.id === array index` invariant**: `src/modules/game-rules/player-factory.ts:30` sets `id: seatIndex` directly from the caller's `seatIndex` argument. `game-setup.reducer.ts:49-53` calls `createPlayer(creatorSeatIndex=0, ...)` then `players.push`; the bot loop (`:70-79`) calls `createPlayer(botSeatIndex=players.length, ...)` then `players.push` for each bot, so seats are assigned 0,1,2,... in push order with no gaps or reordering. `engine.ts:90` calls this exact `initializeGame` to build every simulator match — the invariant holds for the simulator's own player list, not just hypothetically. Lines 52/78 cited in the plan match the actual `createPlayer(...)` call sites exactly.
- **"every reducer log push uses `pushLogEntry`, none push bare strings"**: `grep -rn "\.log\.push(" src/modules/game-rules/` returns exactly one hit — `log-entry.ts:7`, which *is* `pushLogEntry`'s own implementation. `grep -rLn "pushLogEntry" src/modules/game-rules/*.reducer.ts` lists 6 files with no `pushLogEntry` call (`bot-army-actions`, `bot-purchases`, `bot-card-strategy`, `bot-turn`, `combat-initiate`, `game-rules.reducer.ts`); confirmed each pushes no log entries at all (no `log` reference beyond unrelated `console.warn`/switch-case text in `game-rules.reducer.ts`). So the claim holds: every log entry in `src/modules/game-rules` is structured and carries `playerId` reliably.

Also independently re-read and confirmed exact, not just plausible:
- `combat-player-resolve.reducer.ts:16-20` (winner/loser resolution independent of acting seat), `:32,72` (VP award), `:33-38,73-78` (log push with `playerId: winner.playerId`) — all byte-exact against the file.
- `engine.ts:71-137` (`runMatch`), `:102-119` (loop), `:112-115` (flatten-to-`.message`, dropping `playerId`) — exact. `MatchResult` at `:51-59` indeed lacks `seatPlayerIds` today, consistent with the plan adding it.
- `victory-point-sources.ts:30-69`, bug at `:50-52` — exact, `turn.seat` is the only attribution used today.
- `log-parsers.ts:13-33` (`LogEvent` union), `:57` (`MATCHERS` start), `:70` (`pvpVictoryPoints` matcher), `:155-157` (`parseLogLine`) — exact.
- `log-entry.ts:1-8`, `src/lib/types/game.ts:30-44` (`StructuredLogEntry`, `playerId?: string`) — exact.
- `src/lib/types/player.ts:19-21` (`id`/`playerId` fields and comments) — exact.
- `bot-purchases.reducer.ts:7-50`; Deploy pre-check `:30-33` checks `efficientActive` before `reinforceActive` with no `canUseCard` gate, confirmed reversed precedence vs. `handleDeployAction`; Upgrade pre-check `:21-24` has the identical missing-gate shape, confirmed real and correctly left out of scope (flagged in Risks).
- `player-actions.reducer.ts:11-79`; gate `:21`, Reinforce-before-Efficient `:23-29`, throw `` `Not enough food. Cost: ${cost}` `` `:31` — exact, precedence confirmed opposite of `bot-purchases.reducer.ts`'s current (buggy) order.
- `bot-helpers.ts:9-11` (`canAfford`) — exact.
- `game-rules.reducer.ts:31-141` dispatcher — behavior confirmed (`console.error` + return pre-dispatch `gameState` on thrown error). One citation is off by two lines: the plan says "catch `:134-138`"; the actual `catch (error) {` is at line 136, `console.error` at 137, return at 139 (closing brace 140) — matches the *other* citation of this same block, `engine.ts:22`'s own comment ("game-rules.reducer.ts:133 and :136-140"), which is exact. Trivial, non-blocking; folding in as a one-line fix below.
- `test-fixtures.ts:32-42` (`match()`), `victory-point-sources.test.ts:6-23` with `:12,22` being the turn/assertion pair encoding today's bug as a passing test, `log-parsers.test.ts:26-28` — all exact.

Design: no simpler option exists that reuses more. Threading `playerId` through `parseLogLine`'s existing string-based signature (optional second arg) instead of changing its first parameter avoids touching ~25 existing call sites — correctly rejected the alternative. Resolving `winnerPlayerId` → seat inside `computeM5` (not earlier in `engine.ts`) keeps the fix inside the one function `victory-point-sources.test.ts` already unit-tests, and is the minimal change: `engine.ts` only gains a field and stops stripping `playerId`, it doesn't gain resolution logic. The Deploy-precheck fix is the smallest change that mirrors the real reducer's own gate and order, in the same expression already being edited — no new abstraction. Declining to fix the identical Upgrade pre-check bug (out of triaged scope, unverified reproducible) is correct scope discipline, not negligence — it's flagged in Risks for follow-up.

Contracts are complete enough for two builders in parallel: `log-parsers.ts`'s new `LogEvent.pvpVictoryPoints.winnerPlayerId` and `parseLogLine`'s new optional param, `engine.ts`'s `MatchResult.seatPlayerIds`, and `victory-point-sources.ts`'s resolution logic are all implementer-a's own file plan rows, so no cross-builder dependency exists for Bug 1. Bug 2 (implementer-b) touches a disjoint file (`bot-purchases.reducer.ts`) with its own contract snippet. Phases are appropriately small (single phase, 5 steps, repro tests before fixes per the testing skill). Preview states: correctly none (no UI). No invented paths found anywhere in the plan.

One trivial fix folded in: `game-rules.reducer.ts:134-138` → `:136-140` in the Verified-context row for the dispatcher's catch block.
