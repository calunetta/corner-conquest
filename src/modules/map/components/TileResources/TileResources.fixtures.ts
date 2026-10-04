import type { Island } from '@/lib/types';
import { IslandType, ResourceType as ResourceTypeEnum } from '@/lib/types';
import type { ResourceNodeViewModel } from './TileResources.types';

export const resourceIslandWithFood: Island = {
  id: 'resource-food-1',
  x: 1,
  y: 1,
  type: IslandType.Resource,
  resources: [{ type: ResourceTypeEnum.Food, amount: 1 }],
  occupants: [],
  positionedBy: [],
};

export const resourceIslandWithDualResources: Island = {
  id: 'resource-dual-1',
  x: 2,
  y: 2,
  type: IslandType.Resource,
  resources: [
    { type: ResourceTypeEnum.Gold, amount: 2 },
    { type: ResourceTypeEnum.Wood, amount: 1 },
  ],
  occupants: [],
  positionedBy: [],
};

export const baseIslandWithResources: Island = {
  id: 'base-1',
  x: 0,
  y: 0,
  type: IslandType.Base,
  owner: 0,
  resources: [
    { type: ResourceTypeEnum.Food, amount: 2 },
    { type: ResourceTypeEnum.Gold, amount: 1 },
  ],
  occupants: [],
  positionedBy: [],
};

export const monsterIslandWithLivingMonsters: Island = {
  id: 'monster-1',
  x: 3,
  y: 3,
  type: IslandType.Monster,
  monsters: [{ name: 'Lancer', level: 3, sprite: { idle: '', attack: '', death: '' } }],
  resources: [{ type: ResourceTypeEnum.Gold, amount: 1 }],
  occupants: [],
};

export const singleNodeFixture: ResourceNodeViewModel = {
  type: ResourceTypeEnum.Food,
  key: 'resource-node-food-0',
  spriteSrc: '/sprites/sheep.gif',
  nodeSize: 67,
  slotStyle: { top: '20%', left: '50%', transform: 'translateX(-50%)' },
  farmingCollector: null,
};
