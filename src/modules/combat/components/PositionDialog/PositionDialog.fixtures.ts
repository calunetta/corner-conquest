import type { IslandResource } from '@/lib/types';
import { ResourceType } from '@/lib/types';

/** Single resource node available. */
export const singleResource: IslandResource[] = [{ type: ResourceType.Gold, amount: 2 }];

/** Multiple resource types available. */
export const multipleResources: IslandResource[] = [
  { type: ResourceType.Food, amount: 3 },
  { type: ResourceType.Wood, amount: 1 },
  { type: ResourceType.Gold, amount: 2 },
];
