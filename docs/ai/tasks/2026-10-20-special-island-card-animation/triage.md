# Triage: Card animation when the player finds a card on a special island

Request: Play the card animation when the local player gets a card from a special-island roll; it plays for every card, combat cards included.
Type: feature
Tier: M
Pipeline: architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b docs-sync architect-b:final-review
Overrides: implementer-a=claude-sonnet-5-5 implementer-b=claude-sonnet-5-5 tester-a=claude-sonnet-5-5 tester-b=claude-sonnet-5-5 preview-a=claude-sonnet-5-5 preview-b=claude-sonnet-5-5 docs-sync=claude-sonnet-5-5
Phases: 1

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- The drawn card is chosen locally in `src/features/game/components/GameDialogManager.tsx` (`SpecialIslandRollDialog` `onRoll`, ~line 138: `cardDrawn` via `chooseSpecialIslandCard`, stored in `dialogs.specialIslandRoll.cardDrawn`); the dialog shows "Card Acquired" until the player closes it. No log entry carries the card name (found/bought entries have no `cardName`), and none is needed: no GameState or Firestore change.
- Trigger/gate exist: `useCardPlayTrigger` (`src/modules/cards/components/CardPlayOverlay/CardPlayOverlay.hook.ts`) with `selectionPlay` and the `${turn}:${card}` dedupe; `isCardPlayBlocked` (`src/modules/game-board/game-board.map.ts`) already blocks while `specialIslandRoll` is open, so a found play naturally waits for the dialog to close.
- A found play must bypass `NO_PLAY_CARDS` (combat cards animate when found) and must not share the use dedupe key (finding War Chief then using it the same turn is impossible for combat cards, but finding then using e.g. Extra Move in one turn must play twice).
- Visible change: the overlay's polite status text should say "You found {card}." for a found card (no new visuals) → no UI designers; overlay preview gains a found state; the Card play sandbox gains a "find a card" control.

## Scope
- In: found-card play kind (status copy), trigger input for found cards, GameDialogManager wiring on special-island result, tests, overlay preview state, sandbox control, docs `special-cards.md` §6.6.
- Out: bought cards (Buy Card action), rules, multiplayer sync, overlay visuals.

## Open questions
- none
