import type { IslandResource } from '@/lib/types';
import { RESOURCE_SPRITES, getResourceDisplayName } from '@/components/icons';
import type { PositionDialogViewModel } from './PositionDialog.types';

const DEFAULT_RESOURCE_SPRITE = '/sprites/mine.png';

/** Pure. Mirrors legacy PositionDialog.tsx exactly. */
export function toPositionDialogViewModel(resources: IslandResource[]): PositionDialogViewModel {
  return {
    options: resources.map((resource) => ({
      type: resource.type,
      amount: resource.amount,
      sprite: RESOURCE_SPRITES[resource.type] || DEFAULT_RESOURCE_SPRITE,
      displayName: getResourceDisplayName(resource.type),
    })),
  };
}
