import { ResourceType } from '@/lib/types';

const RESOURCE_DISPLAY_NAMES: Record<ResourceType, string> = {
  [ResourceType.Food]: 'Food',
  [ResourceType.Wood]: 'Wood',
  [ResourceType.Gold]: 'Gold',
};

export function getResourceDisplayName(type: ResourceType): string {
  return RESOURCE_DISPLAY_NAMES[type] || type;
}

const RESOURCE_ICON_IDS: Record<ResourceType, string> = {
  [ResourceType.Food]: 'resource-food',
  [ResourceType.Wood]: 'resource-wood',
  [ResourceType.Gold]: 'resource-gold',
};

/** Registry id of a resource's card-option icon, falling back to food for an unknown type. */
export function toResourceIconId(type: ResourceType): string {
  return RESOURCE_ICON_IDS[type] || RESOURCE_ICON_IDS[ResourceType.Food];
}

export const RESOURCE_SPRITES: Record<ResourceType, string> = {
  [ResourceType.Food]: '/sprites/sheep.gif',
  [ResourceType.Wood]: '/sprites/tree.gif',
  [ResourceType.Gold]: '/sprites/gold.gif',
};

export const RESOURCE_GAIN_SPRITES: Record<ResourceType, string> = {
  [ResourceType.Food]: '/sprites/food_gain.gif',
  [ResourceType.Wood]: '/sprites/wood_gain.gif',
  [ResourceType.Gold]: '/sprites/gold_gain.gif',
};

/** Measured loop length of the gain GIFs (160ms + 6x110ms = 820ms, loop=infinite). The overlay
 *  unmounts after this long so the GIF plays once. */
export const RESOURCE_GAIN_ANIMATION_MS = 820;
