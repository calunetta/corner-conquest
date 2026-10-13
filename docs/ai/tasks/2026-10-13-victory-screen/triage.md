# Triage: Victory screen with return-to-lobby

Request: Add a victory screen showing the winner at the end of the game, with a button to return to the lobby.
Type: feature
Tier: M
Pipeline: ui-designer-a ui-designer-b architect-a architect-b implementer-a implementer-b tester-a tester-b preview-a preview-b docs-sync architect-b:final-review
Overrides: none
Phases: 1

## Why this tier
- Win detection already exists: `GameState.status === GameStatus.Finished` and `GameState.winner` (`src/lib/types/game.ts:6-11,47-69`), set by four reducers in `src/modules/game-rules/*.reducer.ts`. No gameplay/rule change needed, so no game-designer stage.
- No existing victory/game-over UI component anywhere (`src/modules`, `src/features`) — this is new, player-visible UI, so `ui-designer-a/b` run before the architects.
- New component lives in one area: an overlay/dialog rendered from `src/features/game/components/GameBoard.tsx` (which already composes `GameDialogManager.tsx` and has access to `gameStateForDisplay.status`/`.winner`), following `src/modules/<domain>/` component-architecture conventions.
- Return-to-lobby reuses the existing exit path: `onExit` prop → `page.tsx:handleExitGame` → `setActiveGameId(null)` (there is no `/lobby` route; the app toggles `<Lobby>`/`<GameBoard>` client-side in `src/app/page.tsx:8-30`). The existing `handlePlayerExit` service (`src/modules/game-rules/services/player-exit.service.ts`) already handles Firestore cleanup on exit and should be reused rather than re-implemented, though exiting a *finished* game is a new case for it (no bot-conversion needed since the match is over) — architect-a to confirm exact behavior.
- One module, ~1 new component + minor wiring into `GameBoard.tsx`/`GameDialogManager.tsx` → fits tier M, single phase.

## Scope
- In: new victory/game-over overlay component shown when `status === GameStatus.Finished`, displaying the winner (name/avatar per existing `Player` type), a "Return to lobby" button wired to the existing exit flow, testbed preview, tests, docs update if `player-exit.service.ts` behavior changes for a finished game.
- Out: new win conditions, elimination/territory-based endings, post-game stats/summary screens, rematch flow, spectator mode.

## Open questions
- None — proceeding with the swarm pipeline above.
