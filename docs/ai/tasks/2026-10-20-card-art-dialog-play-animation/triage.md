# Triage: Card art in CardsDialog, card-play animation, card icons in the game log

Request: Show the generated framed card art in CardsDialog instead of the zap icon (new reusable card component or variant if needed), play a card animation when the local player clicks Use, and show the card's icon next to card-use entries in the game log.
Type: feature
Tier: L
Pipeline: ui-designer-a ui-designer-b architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b docs-sync architect-b:final-review
Overrides: implementer-a=claude-sonnet-5-5 implementer-b=claude-sonnet-5-5 tester-a=claude-sonnet-5-5 tester-b=claude-sonnet-5-5 preview-a=claude-sonnet-5-5 preview-b=claude-sonnet-5-5 docs-sync=claude-sonnet-5-5
Phases: 3

<!-- The Pipeline and Overrides lines are read by scripts/claude-swarm-runner.sh. Keep their format. -->

## Why this tier
- View: `src/modules/cards/components/CardsDialog/CardsDialog.tsx` renders each card as a shadcn `Card` with `RegistryIcon id="zap"`; art catalog exists at `src/modules/cards/card-art.ts` (`CARD_ART`, `ABILITY_ART`), images in `public/sprites/cards/`.
- Card use flows `GameDialogManager.tsx:280` (`onUseCard` → `TOGGLE_CARDS_DIALOG` + `local_UseCard`) → `src/modules/game-board/game-board.card-actions.hook.ts` `handleUseCard`. The animation is local UI state only (user decision: only the acting player sees it).
- Game log: `StructuredLogEntry` (`src/lib/types/game.ts:46`) has no card field; 26 `category: 'cards'` entries in `card-effects.reducer.ts`, `card-targeted-effects.reducer.ts`, `card-acquisition.reducer.ts`, plus card messages in `combat-monster-roll.reducer.ts`. A reliable icon needs an optional `cardName` on the entry, set by the game-rule reducers: a GameState/Firestore document shape change (additive, optional) → tier L.
- Visible UI: yes (dialog, animation, log) → UI designers. Gameplay rules: unchanged → no game designers.
- Risk: game-rule reducers touched (log payload only, no rule change); `max-lines` 150 applies to new module files.

## Scope
- In: reusable framed-card component (dialog variant, plus whatever the animation needs); CardsDialog layout with art, name, count, description, Use; local card-play overlay animation (reduced-motion fallback); optional `cardName` on structured log entries for card uses and GameLog rendering of the card icon; testbed previews; docs for the log entry shape.
- Out: syncing the animation to opponents; AbilitiesDialog art (not requested); changing any card rule or text; regenerating art.

## Phases (proposed; architect-a finalizes)
1. Framed-card component + CardsDialog uses it.
2. Card-play animation on Use (local only).
3. `cardName` on card log entries + GameLog card icon + docs-sync.

## Open questions
- none (audience: only the acting player; log shows the icon, decided 2026-10-20)
