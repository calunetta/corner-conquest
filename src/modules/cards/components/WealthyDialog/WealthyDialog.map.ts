import { ResourceType } from '@/lib/types';
import { RESOURCE_SPRITES, getResourceDisplayName } from '@/components/icons';
import type { WealthyDialogViewModel } from './WealthyDialog.types';

const DEFAULT_RESOURCE_SPRITE = '/sprites/mine.png';

/** Fixed order, legacy WealthyDialog.tsx:22. */
const RESOURCES: ResourceType[] = [ResourceType.Food, ResourceType.Wood, ResourceType.Gold];

/** Pure. No gameState/props dependency: always the same 3 resources in the same order. */
export function toWealthyDialogViewModel(): WealthyDialogViewModel {
  return {
    options: RESOURCES.map((resource) => ({
      resource,
      sprite: RESOURCE_SPRITES[resource] || DEFAULT_RESOURCE_SPRITE,
      displayName: getResourceDisplayName(resource),
    })),
  };
}
