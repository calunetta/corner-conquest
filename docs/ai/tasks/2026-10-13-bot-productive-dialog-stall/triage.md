# Triage: Bot never resolves the Productive card dialog

Request: Fix the bot-AI bug where bots pick up the Productive special card but never resolve its dialog, permanently gating that seat's automatic resource collection and stalling matches.
Type: bug
Tier: S
Pipeline: tester-a implementer-a docs-sync
Overrides: tester-a=sonnet, implementer-a=sonnet
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Root cause confirmed by investigation, one layer, one file to change:
  - `src/modules/game-rules/bot-card-strategy.reducer.ts:10-55` (`applyBotCardStrategy`) has branches for Reinforce, Efficient, MasterBuilder, Wealthy (`:28-42`) and Sabotage, but none for `CardName.Productive`.
  - `src/modules/game-rules/player-turn.reducer.ts:89-97` (`handleEndTurn`) sets `state.productiveDialogState = { playerId }` on every turn rotation into a player still holding Productive, and only the `else` branch runs `applyAutomaticCollection`.
  - `src/modules/game-rules/card-effects.reducer.ts:53-99` (`handleUseProductiveCard`) is the only place that clears `productiveDialogState` (`:99`), via `GameAction.UseProductiveCard`.
  - Grep across all `bot-*.reducer.ts` / `bot-helpers.ts` / `services/bot-turn.service.ts` for `Productive`, `productiveDialogState`, `UseProductiveCard`: zero matches. Bots never dispatch this action.
  - Net effect: a bot holding Productive never clears the dialog state, never discards or re-resolves the card, and `applyAutomaticCollection` is skipped for that seat on every subsequent turn — matching the balance-simulator finding (0 Productive consumed in every config, 100% of seats trapped, fog-off matches running 70+ rounds).
- Gameplay impact: yes, this is a bot-behavior rule fix (overrides `game-designer-*`/`ui-designer-*` prepend rules are n/a — no human-facing rule or UI changes, bots are the only actor affected).
- Visible UI: none. No dialog or component changes — only bot decision logic gains a branch that dispatches the existing `GameAction.UseProductiveCard`.
- Firestore / data model: no shape change. Reuses the existing `UseProductiveCard` action and `productiveDialogState` field.
- Risk: touches a game-rule reducer (`bot-card-strategy.reducer.ts`, under `src/modules/game-rules`) → escalate `implementer-a` and `tester-a` to sonnet per triage rule.
- No test file anywhere exercises Productive combined with any bot reducer/service (`bot-turn.reducer.test.ts`, `bot-card-strategy.reducer.test.ts`, `services/bot-turn.service.test.ts` all have zero mentions) — tester-a writes the failing repro first.
- `docs/architecture/special-cards.md:78-82` documents the human dialog flow but says nothing about bot behavior — not a doc/code mismatch, but docs-sync should add a line once bots resolve it, since this is new documented bot behavior.

## Scope
- In: give `applyBotCardStrategy` (or an equivalent bot path reached before `EndTurn`) a branch that resolves a pending `productiveDialogState` for the bot's own seat by dispatching `GameAction.UseProductiveCard` with a chosen resource (mirroring the existing Wealthy resource-choice logic at `bot-card-strategy.reducer.ts:28-42`) when a valid positioned resource exists, or the dialog's skip option otherwise.
- Out: the lower-confidence Wealthy acquire-count anomaly in 4p-fog-off (441 vs 20-90 elsewhere) — not confirmed, no bot-dialog bug found for Wealthy, needs separate data investigation against the balance-report sim logs before any fix is scoped.

## Open questions
- None.
