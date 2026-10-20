# Triage: Play the card animation only after the card is used and every dialog/sheet is closed

Request: The card-play animation must run only after all dialogs are closed, including cards with follow-up dialogs (Sabotage, Wealthy, Steal Resource) and target steps (Teleport, Scout); on mobile the "more actions" sheet must close first, then the animation plays.
Type: bug
Tier: M
Pipeline: architect-a architect-b tester-a implementer-a implementer-b tester-b docs-sync architect-b:final-review
Overrides: implementer-a=claude-sonnet-5-5 implementer-b=claude-sonnet-5-5 tester-a=claude-sonnet-5-5 tester-b=claude-sonnet-5-5 docs-sync=claude-sonnet-5-5
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- Reproducible: `src/features/game/components/GameDialogManager.tsx` (`onUseCard`, ~line 283) calls `startCardPlay(cardName)` on the Use click, before `local_UseCard`. For follow-up cards `handleUseCard` (`src/modules/game-board/game-board.card-actions.hook.ts`) then opens SabotageDialog / WealthyDialog / StealResourceDialog (z-50), so the overlay (z-40, 1100 ms) runs hidden under them. Cancelling those dialogs does not consume the card (`card-effects.reducer.ts` defers consumption for follow-up cards), yet the animation already played.
- Combat cards (Overcome, War Chief, Decide Dice Roll) are used inside the combat dialogs and never trigger the overlay today.
- Mobile: the "more actions" sheet is local state in `src/modules/hud/components/ActionsPanel/MobileActionsBar.hook.ts` (`isSheetOpen`); tapping an action does not close it.
- Proposed direction (architect decides): trigger the play from the moment the card is consumed, using the new `StructuredLogEntry.cardName` on local-player card-use entries (dedupe per turn+card, ignore entries present at mount), and hold the play until no dialog/sheet is open; close the mobile sheet on action tap. No rule, Firestore or GameState change.
- Visible UI: timing only, no new visual state → no UI designers, no new previews; coordinator runs ui-verify.

## Scope
- In: trigger point and gating of `CardPlayOverlay` / `useCardPlay`; GameDialogManager wiring; mobile actions sheet closing on action tap; tests; docs `special-cards.md` §6.6 Card-Play Animation bullet.
- Out: overlay visuals; syncing to other players; game rules.

## Open questions
- none
