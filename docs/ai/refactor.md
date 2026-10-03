# Refactor plan: migrate legacy code into `src/modules`

Full inventory of everything still outside the `src/modules/<domain>/` standard (see
`component-architecture` skill), ordered so each item's dependencies are migrated before it.
`src/modules/game-board/` is already done (see
`docs/ai/tasks/2026-10-02-gameboardcontext-migration/progress.md`).

## How an agent should use this file

1. Read the table below top to bottom. Skip any row already marked `done`.
2. For the first row not marked `done`, check `docs/ai/tasks/` for a folder whose slug matches
   that row's "Task slug" column.
   - No folder exists → start fresh: run `/triage` on that row's scope, then run the `swarm`
     skill.
   - Folder exists and its `progress.md` has every phase checked and committed → update this
     file's status to `done` for that row (with the commit hash), then move to the next row.
   - Folder exists but has unchecked boxes → resume it (this is also what the `SessionStart`
     hook surfaces). Do not start a new row while one is in progress.
3. Two rows may be run in parallel in separate agent windows only if their "Files" columns don't
   overlap and neither depends on the other per the "Depends on" column. Check both before
   starting a second row concurrently.
4. When a row is done, update `docs/README.md` if it documents behavior the migrated files
   implement, per `CLAUDE.md`'s definition of done.

## Status legend
`pending` — not started · `in-progress` — task folder exists, phases unchecked · `done` — committed, docs updated

| # | Domain | Files | Depends on | Task slug (docs/ai/tasks/*) | Status |
|---|---|---|---|---|---|
| 1 | Game rules — attack/player/card/movement | `src/lib/actions/attack.ts`, `player.ts`, `card.ts`, `movement.ts`, `resource.ts`, `index.ts` | — | `game-rules-actions-migration` | done (614458b, b05f3b4) |
| 2 | Game rules — core logic | `src/lib/game-logic.ts`, `turn-progression.ts`, `bot-logic.ts`, `game-initializer.ts`, `card-data.ts`, `player-data.ts` | #1 | `game-rules-core-migration` | pending |
| 3 | Game dialogs — combat | `src/features/game/components/GameDialogManager.tsx`, `src/features/game/dialogs/CombatDialog.tsx`, `MonsterCombatDialog.tsx` | #1 | `2026-10-03-migrate-dialog-components` | done (6788cdb, 311ea59, a6de61d) — `GameDialogManager.tsx` stays at its legacy path, import-boundary constraint; see plan.md's Decisions |
| 4 | Game dialogs — remaining | `src/features/game/dialogs/AbilitiesDialog.tsx`, `ArmySelectionDialog.tsx`, `AttackSelectionDialog.tsx`, `CardsDialog.tsx`, `ConfirmExitDialog.tsx`, `HostLeaveDialog.tsx`, `MonsterSelectionDialog.tsx`, `PositionDialog.tsx`, `ProductiveCardDialog.tsx`, `SabotageDialog.tsx`, `SpecialIslandRollDialog.tsx`, `StealResourceDialog.tsx`, `WealthyDialog.tsx` | #3 | `2026-10-03-game-dialogs-remaining-migration` | in-progress (phase 1/5 committed 1cb8ac3) |
| 5 | Game panels | `src/features/game/panels/ActionsPanel.tsx`, `PlayerInfo.tsx`, `GameLog.tsx` | #1, #3 | `game-panels-migration` | pending |
| 6 | Game map/board visuals | `src/features/game/components/GameBoard.tsx`, `MapGrid.tsx`, `IslandTile.tsx`, `TileBoats.tsx`, `TileForest.tsx`, `TileOccupants.tsx`, `TileResources.tsx`, `MapDecorations.tsx`, `MapZoomControls.tsx`, `src/features/game/hooks/useMapPanZoom.ts` | #1 | `game-map-migration` | pending |
| 7 | Game header/status | `src/features/game/components/GameBoardHeader.tsx`, `GameStatusBadge.tsx`, `PlayerInfoBar.tsx` | #1 | `game-header-migration` | pending |
| 8 | Game effects | `src/features/game/components/AnimatedMonster.tsx`, `DeathEffect.tsx`, `TutorialBeacon.tsx`, `src/features/game/hooks/useTurnTimer.ts` | — | `game-effects-migration` | pending |
| 9 | Lobby | `src/features/lobby/components/Lobby.tsx`, `LobbyBackground.tsx`, `LobbyGameRow.tsx`, `CreateGameDialog.tsx`, `CustomSettingsSheet.tsx` | — | `lobby-migration` | pending |
| 10 | Shared hooks | `src/hooks/use-game-engine.ts`, `use-player.tsx`, `use-toast.ts`; also dedupe `use-is-mobile.ts` vs `use-mobile.ts` (near-duplicates — confirm which is actually imported before deleting the other) | — | `shared-hooks-migration` | pending |
| 11 | App entry points | `src/app/page.tsx`, `src/app/layout.tsx`, `src/components/icons.tsx` | #6, #9, #10 | `app-entry-migration` | pending |

## Not in scope here
- `src/lib/types/*.ts`, `src/features/game/types.ts`: shared type definitions. Move each type
  into the `src/modules/<domain>/Name.types.ts` of whichever row above first consumes it, rather
  than migrating types as a standalone pass — a types-only move has no behavior to test against.
- `src/lib/firebase.ts`, `placeholder-images.ts`, `utils.ts`: cross-cutting utilities, not
  components. Leave in place unless a specific row's migration requires touching them.
- `src/components/ui/` (shadcn, vendored) and `src/testbed/` (already follows its own structure).
