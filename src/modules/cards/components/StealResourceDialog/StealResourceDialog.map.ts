import type { Player, ResourceType } from '@/lib/types';
import { getResourceDisplayName, RESOURCE_SPRITES, toPlayerIdleSprite } from '@/modules/shared';
import type { StealPlayerOptionViewModel, StealResourceOptionViewModel } from './StealResourceDialog.types';

const DEFAULT_RESOURCE_SPRITE = '/sprites/mine.png';

const toTotalResources = (player: Player): number =>
  Object.values(player.resources).reduce((total, amount) => total + amount, 0);

/** Pure. Mirrors legacy StealResourceDialog.tsx's player grid, legacy :51-79. */
export function toPlayerOptions(players: Player[], selectedPlayerId: number | null): StealPlayerOptionViewModel[] {
  return players.map((player) => ({
    id: player.id,
    name: player.name,
    sprite: toPlayerIdleSprite(player.color),
    totalResources: toTotalResources(player),
    isSelected: selectedPlayerId === player.id,
  }));
}

/** Pure. Mirrors legacy StealResourceDialog.tsx's resource grid, legacy :109-115. */
export function toResourceOptions(
  player: Player,
  selectedResource: ResourceType | null,
): StealResourceOptionViewModel[] {
  return (Object.keys(player.resources) as ResourceType[]).map((resource) => {
    const available = player.resources[resource];

    return {
      resource,
      sprite: RESOURCE_SPRITES[resource] || DEFAULT_RESOURCE_SPRITE,
      displayName: getResourceDisplayName(resource),
      available,
      isAvailable: available > 0,
      isSelected: selectedResource === resource,
    };
  });
}
