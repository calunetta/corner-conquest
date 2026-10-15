import type { Island } from '@/lib/types';
import { IslandType } from '@/lib/types';
import type { DecorationLayoutsConfig } from '../../decoration-layouts.types';

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

/** Small sample config, independent of the real migrated data, for tests/previews that don't
 *  need every scenario's real art — only that a layout with instances and one with none both
 *  resolve and render. */
export const decorationLayoutsConfigFixture: DecorationLayoutsConfig = {
  base: [
    {
      id: 'base-default',
      name: 'Default',
      instances: [
        { id: 'base-default-0', image: '/sprites/decorations/pine_tree.gif', top: 36.5, left: 44.5, size: 15, z: 10 },
      ],
    },
  ],
  special: [
    {
      id: 'special-default',
      name: 'Default',
      instances: [
        { id: 'special-default-0', image: '/sprites/decorations/pine_tree.gif', top: 13, left: 8, size: 16, z: 10 },
      ],
    },
  ],
  'empty-2': [
    {
      id: 'empty-2-default',
      name: 'Default',
      instances: [
        { id: 'empty-2-default-0', image: '/sprites/decorations/pine_tree.gif', top: 32, left: 38, size: 28, z: 12 },
        { id: 'empty-2-default-1', image: '/sprites/decorations/spring_tree.gif', top: 38, left: 62, size: 28, z: 14 },
      ],
    },
  ],
  'empty-3': [
    {
      id: 'empty-3-default',
      name: 'Default',
      instances: [
        { id: 'empty-3-default-0', image: '/sprites/decorations/pine_tree.gif', top: 32, left: 38, size: 28, z: 12 },
        { id: 'empty-3-default-1', image: '/sprites/decorations/spring_tree.gif', top: 38, left: 62, size: 28, z: 14 },
        { id: 'empty-3-default-2', image: '/sprites/decorations/autmn_tree.gif', top: 60, left: 58, size: 28, z: 13 },
      ],
    },
  ],
  'resource-1': [{ id: 'resource-1-default', name: 'Default', instances: [] }],
  'resource-2': [{ id: 'resource-2-default', name: 'Default', instances: [] }],
  'resource-3': [{ id: 'resource-3-default', name: 'Default', instances: [] }],
  'resource-4': [{ id: 'resource-4-default', name: 'Default', instances: [] }],
  'monster-alive': [{ id: 'monster-alive-default', name: 'Default', instances: [] }],
  'monster-cleared': [
    {
      id: 'monster-cleared-default-2trees',
      name: 'Default (2 trees)',
      instances: [
        { id: 'monster-cleared-default-2trees-0', image: '/sprites/decorations/pine_tree.gif', top: 32, left: 38, size: 28, z: 12 },
        { id: 'monster-cleared-default-2trees-1', image: '/sprites/decorations/spring_tree.gif', top: 38, left: 62, size: 28, z: 14 },
      ],
    },
    {
      id: 'monster-cleared-default-3trees',
      name: 'Default (3 trees)',
      instances: [
        { id: 'monster-cleared-default-3trees-0', image: '/sprites/decorations/pine_tree.gif', top: 32, left: 38, size: 28, z: 12 },
        { id: 'monster-cleared-default-3trees-1', image: '/sprites/decorations/spring_tree.gif', top: 38, left: 62, size: 28, z: 14 },
        { id: 'monster-cleared-default-3trees-2', image: '/sprites/decorations/autmn_tree.gif', top: 60, left: 58, size: 28, z: 13 },
      ],
    },
  ],
};
