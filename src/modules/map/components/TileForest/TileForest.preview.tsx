'use client';

import { TileForest } from './TileForest';
import { emptyIsland, baseIsland, resourceIsland, monsterIslandWithMonsters, clearedMonsterIsland, specialIsland } from './TileForest.fixtures';
import type { ComponentPreview } from '@/testbed/testbed.types';

export const tileForestPreview: ComponentPreview = {
  slug: 'tile-forest',
  title: 'Tile Forest',
  group: 'Game map',
  states: [
    {
      name: 'Empty island (with forest)',
      render: () => <TileForest island={emptyIsland} isBase={false} />,
    },
    {
      name: 'Base island (with forest)',
      render: () => <TileForest island={baseIsland} isBase={true} />,
    },
    {
      name: 'Resource island (with forest)',
      render: () => <TileForest island={resourceIsland} isBase={false} />,
    },
    {
      name: 'Monster island with living monsters (with forest)',
      render: () => <TileForest island={monsterIslandWithMonsters} isBase={false} />,
    },
    {
      name: 'Cleared monster island (with forest)',
      render: () => <TileForest island={clearedMonsterIsland} isBase={false} />,
    },
    {
      name: 'Special island (with forest)',
      render: () => <TileForest island={specialIsland} isBase={false} />,
    },
  ],
};
