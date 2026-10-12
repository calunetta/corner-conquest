# Bot-vs-bot balance simulator

A tool for game designers to judge balance from data instead of intuition. It plays many complete
bot-vs-bot matches through the real game logic (the same reducers and `takeBotTurn` the app uses)
with Firestore stubbed out — zero writes, zero network — and reports ten metrics per (player
count, fog of war) configuration.

## Running it

```bash
# A tiny 3-game smoke test (no real statistics) — also runs automatically in `npm test`:
npx jest scripts/balance-simulator/cli.test.ts

# A real run. Takes minutes, not seconds, for the default 200 games × 6 configs:
BALANCE_SIMULATOR_ARGS="--players 2,3,4 --fog on,off --games 200 --seed 1 --max-rounds 150 --out balance-reports" \
  npm run balance:simulate
```

Flags: `--players` and `--fog` are comma-separated lists; `--games` is per config; `--seed` fixes
the randomness (see "Comparing runs" below); `--max-rounds` caps a match before it's recorded as
"capped" rather than "finished"; `--out` is the report directory. Every flag has the default shown
above. Output: `report.md` (also printed to stdout) and `report.json` with the same numbers.

## Reading the report

**"Read this first"** lists every fired flag, grouped as:
- **Breaches** — M1 (capped matches), M2 (match length), M5/M8 integrity failures, and M9 combat
  accuracy. These always report, regardless of bot health.
- **Bot health** — M10 flags. Never suppressed; if these fire, the bots themselves are broken and
  every other number in the report is noise until that's fixed.
- **Suppressed (bot health)** — M3 (win split), M4 (VP margin) and the M8 hand-limit/lost-draw
  flags, downgraded from "breach" when any M10 flag fires. A bot that can't act properly will
  produce a skewed win rate for reasons that have nothing to do with game balance.

**Per-config sections** show every metric's numbers regardless of suppression — only the *flag
severity* changes, never the data.

| Metric | What it measures |
|---|---|
| M1 | Finished vs. capped matches |
| M2 | Match length in rounds, and how many finish by round 20/40 |
| M3 | Win rate per seat, with a 95% confidence interval and a χ² test for an uneven split |
| M4 | Final VP per seat, winner margin, winner overshoot past the goal |
| M5 | VP by source (discovery, monster kills, PvP, Explorer\*), with an integrity check |
| M6/M7 (reported together as "activity") | **Simplified** — see Known limitations |
| M8 | Card economy: acquired vs. consumed vs. held, per card, with an integrity check |
| M9 | Combat accuracy: observed vs. expected win rate for monster fights; PvP is observed-only |
| M10 | Bot health: does a seat ever leave its own Base, get stuck on Productive, or never play a card it holds |
| Anomalies | Every `console.warn`/`console.error` the root dispatcher made during a bot turn — never silently swallowed |

\* Explorer's own VP amount isn't in its log line, so M5 can't attribute it to a source — it's
excluded from both the per-seat Explorer total and the integrity check, not silently folded into
another category.

### Anomalies

`handleGameAction` (`src/modules/game-rules/game-rules.reducer.ts:33-142`), the single root
dispatcher every bot action goes through, has two silent failure paths: an unrecognized/unhandled
action logs a `console.warn` and returns the state unchanged (line 133), and a caught reducer
error logs a `console.error` and does the same (lines 136-140). The simulator used to silence both
along with `console.log`; it now records every `warn`/`error` call made during each bot's turn and
attaches them to that turn as `Anomaly` entries (`unhandledAction` or `reducerError`), aggregated
per run into counted, deduplicated rows. Any anomaly fires an unsuppressed "breach" flag — a bot
turn that silently did nothing it meant to do is a real bug regardless of win-rate noise.

## Known limitations

This simulator was built directly by the coordinating session rather than through the swarm's
usual architect/implementer/tester review pipeline (agent-spawning tools became unavailable
mid-session; see `docs/ai/tasks/2026-10-02-bot-balance-simulator/progress.md` for the full
account). It has no independent review. Specific scope cuts, each chosen over leaving the metric
out entirely:

- **M6/M7 report event *counts*, not resource *amounts* or per-ability-name purchase counts**,
  except ability purchases (Explorer vs. Collector), which were cheap to add. The log lines carry
  resource amounts as free text (`"collected 2 wheat, 1 iron."`); extracting and summing them
  reliably was out of scope for this pass. A collection-event count is still a real, if coarser,
  signal.
- **M9's PvP numbers are observed-only.** An expected-vs-observed test needs both combatants'
  attack power at the moment of the fight; the simulator currently only captures the acting seat's
  own attack power for the turn, not the opponent's. The monster-combat half of M9 (the more
  common fight type) has the full expected-vs-observed test.
- **No CI run has verified a full 200-games-per-config matrix.** Everything above was verified with
  small (3-30 games) runs, which is enough to prove the pipeline is correct but not enough to trust
  the balance conclusions themselves — run it for real before acting on its numbers.

## A bug the simulator found on its first real run

Running the acceptance tests (`scripts/balance-simulator/acceptance.test.ts`) surfaced a genuine
inconsistency between `bot-purchases.reducer.ts`'s own cost pre-check and the real
`handleDeployAction` reducer, not a simulator bug.

- `handleDeployAction` (`src/modules/game-rules/player-actions.reducer.ts:21-29`) only applies the
  Reinforce/Efficient Deploy discount when the player hasn't already used their one card-use action
  this turn (`canUseCard = !player.actionsThisTurn.includes(GameAction.UseCard)`), checking
  Reinforce before Efficient.
- `bot-purchases.reducer.ts`'s own pre-check before attempting Deploy computed the same discount
  from the raw `efficientActive`/`reinforceActive` flags, without that same `canUseCard` check, and
  checked Efficient before Reinforce — the opposite precedence.
- A bot that activates Reinforce or Efficient earlier in the same turn (which does consume the
  turn's one card-use action) then reached the Deploy check still believing the discount applied.
  `handleDeployAction` correctly denied it and threw `` `Not enough food. Cost: ${cost}` `` at the
  full, undiscounted cost. That error was caught and logged by the dispatcher
  (`game-rules.reducer.ts`'s `handleGameAction`, via `console.error('Error handling action deploy:',
  error)`), not silently swallowed — but the bot still lost that Deploy opportunity for the turn,
  and every simulator run logged one `console.error` anomaly per occurrence.

Fixed: `bot-purchases.reducer.ts`'s Deploy pre-check now gates the discount on `canUseCard` and
checks Reinforce before Efficient, matching `handleDeployAction`'s own gate and precedence exactly.
A bot that already used its card-use action this turn now correctly computes the full, undiscounted
cost before deciding whether to attempt Deploy, so it never proposes a Deploy it can't afford for
this reason. See `src/modules/game-rules/bot-purchases.reducer.test.ts` for the regression tests.

## Known bot facts (confirmed by two independent design-review passes, `game-design.md`)

- Bots position on their own Base's resources first (Base tiles list gems before other resources,
  and the bot takes the first free spot) — this is **not** a sign of a smart economy, and when
  `pctPositionsOnOwnBase` is high the M5-M8 numbers are already suppressed by the M10 gate.
- Bots always buy the Explorer ability before Collector.
- A bot that uses the Productive card and then never positions on a fresh resource gets stuck:
  `handleProductiveCard`'s dialog is never resolved by the bot's turn loop, so the card sits
  unconsumed indefinitely — the `trapped` flag in M10 is this exact state.
- Sabotage targets human players only (`bot-logic.ts`); bots never use it on each other, so bots
  will always show Sabotage in `everUnusedCards`. This is a known, not a found, Problem.
- Bots never play combat cards (Overcome, War Chief, Decide Dice Roll).
- Fog of war off removes the bot's exploration-priority incentive almost entirely.

## Comparing two runs

Use the **same seed and games count** for both. The map is paired (match *i* of run A and run B
see the identical board, because `mapSeed` only depends on the seed, player count, fog setting and
match index — never on anything about how the bots play). **Play is not paired**: a bot-logic
change on an identical map can still diverge immediately, so don't expect the same two bots to make
identical moves. Judge a difference between two runs by whether the confidence intervals (M3) or a
two-proportion z-test overlap, not by eyeballing a single percentage point change.

## Deck composition (a documentation drift, not a bug)

The deck dealt in a real match is 2 copies of each of the 13 `BASE_CARDS`
(`src/lib/game-initializer.ts:277-278`). `SPECIAL_CARDS` (`src/lib/card-data.ts`), which has a
different, weighted distribution, is defined but never used anywhere in the codebase.
