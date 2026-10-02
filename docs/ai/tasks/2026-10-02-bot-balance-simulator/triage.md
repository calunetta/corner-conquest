# Triage: Bot-vs-bot balance simulator

Request: a tool that runs many bot-vs-bot matches so game designers can judge balance from data instead of intuition.
Type: feature (tooling)
Tier: M
Pipeline: game-designer-a game-designer-b architect-a architect-b implementer-a implementer-b tester-a tester-b architect-b:final-review
Overrides: none
Phases: 1

## Why this tier
- Gameplay-adjacent (Gameplay signal: yes — the simulator's output is what the game designers use to judge balance), so the game-designer pair defines the metrics first. No visible UI (a CLI script + a Markdown/JSON report), so no UI designers and no preview stage.
- Implementation is a script plus a report generator: one layer, reuses `src/lib/bot-logic.ts`, `src/lib/game-initializer.ts`, `src/lib/actions` unchanged.

## Scope
- In: `scripts/balance-simulator.mjs` (or `.ts` run via `tsx`) that plays N complete bot-vs-bot matches entirely through the existing pure reducers and `takeBotTurn` (no Firestore, no UI), for 2, 3 and 4 bot players and both fog-of-war settings; a report (win rate per player seat/color, average match length in turns, average VP at game end, resource totals mined, card usage frequency) written to a file and printed as a table; a game-design doc explaining how to read and act on the output.
- Out: changing any game rule or bot heuristic (the simulator measures the current game, it doesn't fix it); a UI for the simulator; running real matches against Firestore.

## Open questions
None — recommended approach: a Node script invoking the existing reducers directly (same approach as `src/lib/__tests__/*`), looping until `gameState.status === 'finished'` with a safety turn cap to avoid infinite loops, is simplest and reuses code the unit tests already exercise.
