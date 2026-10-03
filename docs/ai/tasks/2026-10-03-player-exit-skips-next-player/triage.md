# Triage: Player exit on own turn skips the next player

Request: Fix `handlePlayerExit` so that when the current player leaves, the turn passes to the player who was next in order, and update the characterization tests that assert the old behavior.
Type: bug
Tier: S
Pipeline: tester-a implementer-a
Overrides: tester-a=sonnet, implementer-a=sonnet
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- One service (`src/modules/game-rules/services/player-exit.service.ts`) and its test file, one layer, root cause known and reproducible (3 players, seat 1 leaves on own turn: lands on Host instead of Player 3).
- Gameplay: corrects turn order to the intended behavior, no rule or number change; no UI, no Firestore shape change. Builders escalated to sonnet: Firestore transaction + game-rule reducer.

## Scope
- In: replace `currentPlayerIndex = playerIndex % players.length` before `handleEndTurn` with the previous seat, so `handleEndTurn`'s single advance lands on the next player; update the two "known bug" tests (middle seat and last seat) to the corrected result and turn counter.
- Out: `handleEndTurn`, other exit paths, `src/lib/actions/player.ts` legacy copy (check whether it still exists/is called; report, don't change).

## Open questions
- None.
