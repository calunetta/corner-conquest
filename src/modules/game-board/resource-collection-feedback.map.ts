import type { GameState, Player, ResourceType, StructuredLogEntry } from '@/lib/types';
import { isArmyEligibleToPosition } from '@/modules/game-rules';
import { getResourceDisplayName } from '@/modules/shared';

export interface ToastContent {
  title: string;
  description: string;
}

function isStructuredCollectionEntry(
  entry: GameState['log'][number],
): entry is StructuredLogEntry & { resourcesCollected: Partial<Record<ResourceType, number>> } {
  return typeof entry !== 'string' && entry.resourcesCollected !== undefined;
}

/** Structured log entries appended since index `sinceIndex` that recorded a resource collection
 *  (`resourcesCollected` present) for `playerId`. */
export function findNewCollectionEntries(
  log: GameState['log'],
  sinceIndex: number,
  playerId: string,
): StructuredLogEntry[] {
  return log
    .slice(sinceIndex)
    .filter(isStructuredCollectionEntry)
    .filter((entry) => entry.playerId === playerId);
}

/** "Collected 2 Food, 1 Gold." toast content for one collection log entry, or null if the entry
 *  carries no resources (defensive; should not happen for an entry `findNewCollectionEntries` returned). */
export function toCollectionToastContent(entry: StructuredLogEntry): ToastContent | null {
  const resourcesCollected = entry.resourcesCollected;
  if (!resourcesCollected) return null;

  const descriptionParts = Object.entries(resourcesCollected).map(
    ([type, amount]) => `${amount} ${getResourceDisplayName(type as ResourceType)}`,
  );
  if (descriptionParts.length === 0) return null;

  return {
    title: 'Resources collected',
    description: `Collected ${descriptionParts.join(', ')}.`,
  };
}

/** Count of `player`'s armies sitting on a tile where `isArmyEligibleToPosition` is true. */
export function countIdleFarmArmies(state: GameState, player: Player): number {
  return player.armies.filter((army) => {
    const tile = state.map[army.position.y * state.settings.gridSize.cols + army.position.x];
    return tile !== undefined && isArmyEligibleToPosition(tile, player, army.id);
  }).length;
}

/** "Army idle" (count === 1) / "Armies idle" (count > 1) toast content, or null if count === 0. */
export function toIdleFarmToastContent(idleCount: number): ToastContent | null {
  if (idleCount === 0) return null;

  if (idleCount === 1) {
    return {
      title: 'Army idle',
      description: '1 army is idle on a resource spot. Re-position it to keep collecting.',
    };
  }

  return {
    title: 'Armies idle',
    description: `${idleCount} armies are idle on resource spots. Re-position them to keep collecting.`,
  };
}
