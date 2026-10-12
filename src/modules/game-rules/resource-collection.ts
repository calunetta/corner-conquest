import type { GameState, Player } from '@/lib/types';

/**
 * Removes each of `collectedPositions` from `player.positions` and the matching `positionedBy`
 * entry on its tile, using the same filter idiom as the rest of the reducers. Shared by
 * `applyAutomaticCollection` and `handleUseProductiveCard`: both reducers clear the same spots
 * the instant they credit them, so the army must be re-positioned to collect again.
 */
export function clearCollectedPositions(
  state: GameState,
  player: Player,
  collectedPositions: Player['positions'],
): void {
  const cols = state.settings.gridSize.cols;

  collectedPositions.forEach((pos) => {
    const tile = state.map[pos.y * cols + pos.x];
    if (tile?.positionedBy) {
      tile.positionedBy = tile.positionedBy.filter((p) => !(p.playerId === player.id && p.resource === pos.resource));
    }
  });
  player.positions = player.positions.filter((pos) => !collectedPositions.includes(pos));
}
