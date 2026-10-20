# Triage: Card-play animation rules (combat cards off, Teleport/Scout on select) + live testbed sandbox

Request: Combat cards (Overcome, War Chief, Decide Dice Roll) never play the card animation; Teleport and Scout play it as soon as they are selected in the Cards dialog (not after their last target); add a testbed page to check the card-play flow live (dialogs, follow-up dialogs, mobile sheet, animation).
Type: feature
Tier: M
Pipeline: architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b docs-sync architect-b:final-review
Overrides: implementer-a=claude-sonnet-5-5 implementer-b=claude-sonnet-5-5 tester-a=claude-sonnet-5-5 tester-b=claude-sonnet-5-5 preview-a=claude-sonnet-5-5 preview-b=claude-sonnet-5-5 docs-sync=claude-sonnet-5-5
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Current behavior (commit 0e2aa34): `useCardPlayTrigger` (`src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.hook.ts`) queues plays from local card-use log entries (`StructuredLogEntry.cardName`) and holds them while `isCardPlayBlocked(uiState, gameState)` (`src/modules/game-board/game-board.map.ts`) is true; wired in `src/features/game/components/GameDialogManager.tsx`.
- Combat cards log with `cardName` in `combat-monster-roll.reducer.ts`, so they currently animate after combat: must be excluded.
- Teleport sets `pendingAction` (teleport) on Use and logs only on the move (`movement.reducer.ts`); Scout sets `pendingAction` (scout) and logs after the third tile. Playing "on select" needs a selection-time trigger plus a gate that does not block on the teleport/scout map-targeting pending actions, and the later log entry must be deduped (same turn+card).
- New testbed sandbox page: a dev-only harness in `src/testbed/` composing real CardsDialog, Sabotage/Wealthy/StealResource dialogs, mobile actions sheet and CardPlayOverlay with the real trigger/gate over a fake local log, so the user can click through flows live.
- No game rule, Firestore or GameState change. Accepted limits (user, 2026-10-20): cancel then re-use same card same turn does not re-animate; manually reopened sheets may cover a waiting play.

## Scope
- In: exclusion of combat cards from the animation; selection-time play for Teleport and Scout (dedupe with their later log entry, gate ignores their map-targeting pending action); testbed sandbox page + registry; tests; docs `special-cards.md` §6.6 Card-Play Animation bullet.
- Out: overlay visuals, rules, multiplayer sync.

## Open questions
- none (combat cards: no animation at all, decided 2026-10-20)
