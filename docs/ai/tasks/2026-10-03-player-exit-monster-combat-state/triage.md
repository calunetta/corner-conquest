# Triage: player-exit leaves monsterCombatState.attackerId unreindexed

Request: when a player exits, reindex/clear `monsterCombatState.attackerId` the same way `combatState.attackerId/defenderId` already are, in `src/modules/game-rules/services/player-exit.service.ts`.
Type: bug
Tier: S
Pipeline: tester-a implementer-a
Overrides: tester-a=sonnet, implementer-a=sonnet
Phases: 1

## Why this tier
- One file touched for the fix (`src/modules/game-rules/services/player-exit.service.ts:71-82`), one test file for coverage (`src/modules/game-rules/services/player-exit.service.test.ts`). Single layer (game-rules service), obvious solution — mirror the existing `combatState` block immediately above it.
- Risk signal: game-rule service with a Firestore transaction (`runTransaction`) → escalate both builders to sonnet per the tier table's override rule.
- Gameplay impact: yes, but the fix is a direct copy of an already-approved pattern, not new design — no game-designer stage needed.
- No visible UI, no GameState shape change (monsterCombatState already has attackerId), no new component.

## Scope
- In: extend `handlePlayerExit` to clear `monsterCombatState` when the exiting player is `monsterCombatState.attackerId`, and decrement `attackerId` when the exiting player's seat is lower, matching the `combatState` treatment at lines 71-82. Add test cases for exiting-player-is-monster-attacker and exiting-seat-below-monster-attacker, matching the existing `describe('combatState handling', ...)` block.
- Out: the `bot-logic.ts` gap (bot never plays StealResource/Scout/Teleport) — separate, lower-severity finding, not touched here.

## Open questions
- none
