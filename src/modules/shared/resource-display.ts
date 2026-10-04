import { ResourceType } from '@/lib/types';

const RESOURCE_DISPLAY_NAMES: Record<ResourceType, string> = {
  [ResourceType.Food]: 'Food',
  [ResourceType.Wood]: 'Wood',
  [ResourceType.Gold]: 'Gold',
};

export function getResourceDisplayName(type: ResourceType): string {
  return RESOURCE_DISPLAY_NAMES[type] || type;
}

export const RESOURCE_SPRITES: Record<ResourceType, string> = {
  [ResourceType.Food]: '/sprites/sheep.gif',
  [ResourceType.Wood]: '/sprites/tree.gif',
  [ResourceType.Gold]: '/sprites/gold.gif',
};
