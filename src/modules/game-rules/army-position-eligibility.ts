import type { Island, IslandResource, Player } from '@/lib/types';
import { IslandType } from '@/lib/types';

/** First resource spot on `tile` with no `positionedBy` entry, or `undefined` if none are open. */
export function findAvailableResourceSpot(tile: Island): IslandResource | undefined {
  return tile.resources.find((resource) => !(tile.positionedBy || []).some((pos) => pos.resource === resource.type));
}

/** True when `armyId` (one of `player`'s armies) could legally position on `tile` right now:
 *  not already positioned, tile is Resource or Base with resources, no monster present, and at
 *  least one resource spot on it has no `positionedBy` entry yet. */
export function isArmyEligibleToPosition(tile: Island, player: Player, armyId: number): boolean {
  const isAlreadyPositioned = player.positions.some((pos) => pos.armyId === armyId);
  if (isAlreadyPositioned) return false;

  const isPositionableTile = tile.type === IslandType.Resource || tile.type === IslandType.Base;
  if (!isPositionableTile || tile.resources.length === 0) return false;

  const monsterOnTile = Boolean(tile.monsters && tile.monsters.length > 0);
  if (monsterOnTile) return false;

  return findAvailableResourceSpot(tile) !== undefined;
}
