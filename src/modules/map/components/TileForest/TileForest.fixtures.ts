import type { Island } from '@/lib/types';
import { IslandType } from '@/lib/types';

export const emptyIsland: Island = {
  id: 'empty-1',
  x: 0,
  y: 0,
  type: IslandType.Empty,
  resources: [],
  occupants: [],
};

export const baseIsland: Island = {
  id: 'base-1',
  x: 0,
  y: 0,
  type: IslandType.Base,
  owner: 0,
  resources: [],
  occupants: [],
};

export const resourceIsland: Island = {
  id: 'resource-1',
  x: 1,
  y: 1,
  type: IslandType.Resource,
  resources: [{ type: 'food', amount: 1 }],
  occupants: [],
};

export const monsterIslandWithMonsters: Island = {
  id: 'monster-1',
  x: 2,
  y: 2,
  type: IslandType.Monster,
  monsters: [{ name: 'Lancer', level: 3, sprite: { idle: '', attack: '', death: '' } }],
  resources: [],
  occupants: [],
};

export const clearedMonsterIsland: Island = {
  id: 'monster-cleared-1',
  x: 2,
  y: 2,
  type: IslandType.Monster,
  monsters: [],
  resources: [],
  occupants: [],
};

export const specialIsland: Island = {
  id: 'special-1',
  x: 3,
  y: 3,
  type: IslandType.Special,
  resources: [],
  occupants: [],
};
