import { IslandType, PlayerColor, ResourceType } from '@/lib/types';
import type { GameState } from '@/lib/types';
import { defaultGameSettings, initializeGame, startGame } from '@/modules/game-rules';

export const SANDBOX_PLAYER_ID = 'sandbox-player';

/**
 * A real, reducer-built 2-player match (1 human at seat 0, 1 bot) with a second army added to
 * the human seat on its own Resource tile, two tiles (Manhattan distance 2) from the first army
 * — inside `MOVE_RADIUS` (`movement.reducer.ts`), so both armies fall inside each other's
 * `possibleMoves`. This is the exact setup needed to probe the stale-selectedArmy race from
 * docs/ai/tasks/2026-10-13-bot-ui-position-stall: position the first army, then immediately
 * click the second army's tile, the way `e2e/bot-ui-actions.ts`'s positions loop does.
 */
export function buildPositionRaceGameState(): GameState {
  let game = initializeGame(
    'sandbox_game',
    'Position Race Sandbox',
    1,
    { playerId: SANDBOX_PLAYER_ID, name: 'Sandbox Player', color: PlayerColor.Blue },
    1,
    false,
    defaultGameSettings,
  );
  game = startGame(game, 'Sandbox Player');

  const human = game.players[0];
  const secondArmyPos = { x: 1, y: 1 }; // Manhattan distance 2 from the base army at (0, 0).
  human.armies = [...human.armies, { id: 1, position: secondArmyPos, hasActed: false }];

  const cols = game.settings.gridSize.cols;
  const secondTile = game.map[secondArmyPos.y * cols + secondArmyPos.x];
  secondTile.type = IslandType.Resource;
  secondTile.resources = [{ type: ResourceType.Gold, amount: 5 }];
  secondTile.occupants = [{ playerId: human.id, armyId: 1 }];
  secondTile.positionedBy = [];

  human.revealedTiles = [...human.revealedTiles, secondTile.id];

  return game;
}
