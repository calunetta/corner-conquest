# Triage: bot-vs-bot-ui.spec.ts stalls on the Position action button

Request: In `e2e/bot-vs-bot-ui.spec.ts`, `clickActionButton(page, GameAction.local_Position)` (`e2e/bot-ui-actions.ts:263`) times out — `getByTestId('action-button-local:position')` stays disabled for the full 10-minute test timeout (618 retries, "element is not enabled"), confirmed by a real GitHub Actions CI run (not assumed from reading code).
Type: bug
Tier: M
Pipeline: architect-a architect-b tester-a implementer-a implementer-b tester-b docs-sync architect-b:final-review
Overrides: implementer-a=sonnet tester-a=sonnet
Phases: 1

## Why this tier
- Reproduced in CI, not by reading code: run `38365931036`, job "E2E tests", failed after 10.3 minutes on this exact assertion.
- Root cause unknown. Two real root causes (not test-selector issues) were already found and fixed this session in the same bot-vs-bot/reconnect e2e area:
  - `game-board.state.hook.ts` froze the turn buffer the instant `isMyTurn` was true, discarding later live Firestore updates.
  - `handleStartGame` routed the started state through the `EndTurn` action, skipping the host's own first turn.
  Given that pattern, this stall could be: (a) `planNextStep` (`e2e/bot-ui-actions.ts`, via `applyBotArmyActions` in `src/modules/game-rules/bot-army-actions.reducer.ts`) choosing a position move the UI's own button-enablement condition disagrees with (a real logic bug or a stale-test-helper bug), or (b) a genuine UI timing issue where the button's enabled state lags the just-completed tile/army selection. Must be confirmed with a live run, not assumed.
- Touches game-rule bot logic (`bot-army-actions.reducer.ts`) and/or the Actions panel's button-enablement logic (`src/modules/hud/components/ActionsPanel/`) — matches the Risk signal (game-rule reducers), not a tier-S "obvious fix".

## Scope
- In: find why the Position action button never becomes clickable for the bot's chosen move; fix the root cause (test helper, UI enablement logic, or bot planning logic, whichever is actually wrong); add/strengthen the regression test (failing repro first, per the bug pipeline) using `e2e/bot-vs-bot-ui.spec.ts` as the real regression surface.
- Out: anything in `e2e/reconnect-bot-takeover.spec.ts` (already fully fixed and passing this session) and the general pacing/duration of `bot-vs-bot-ui.spec.ts` (10 minutes is this spec's own configured timeout, not itself a bug, unless the fix changes how long a full self-play match legitimately takes).

## Open questions
- None — the failing CI run and exact assertion are already known; start with `tester-a` tightening the repro (likely a scoped-down e2e run or a unit-level repro of the planning/enablement mismatch), then `architect-a` on root cause.
