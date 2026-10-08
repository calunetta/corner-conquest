'use client';

import type { ReactNode } from 'react';
import { TileForest } from './TileForest';
import { emptyIsland, baseIsland, resourceIsland, monsterIslandWithMonsters, clearedMonsterIsland, specialIsland } from './TileForest.fixtures';
import type { ComponentPreview } from '@/testbed/testbed.types';

/** Fixed-size stand-in for IslandTile's `relative aspect-square` button. Tree sizes are
 *  percentages of the tile side, so each state needs this sized box to be checkable. */
function TileBox({ children }: { children: ReactNode }) {
  return (
    <div className="relative rounded-lg border border-dashed border-white/40" style={{ width: 136, height: 136 }}>
      {children}
    </div>
  );
}

export const tileForestPreview: ComponentPreview = {
  slug: 'tile-forest',
  title: 'Tile Forest',
  group: 'Game map',
  states: [
    {
      name: 'Empty island (with forest)',
      render: () => (
        <TileBox>
          <TileForest island={emptyIsland} isBase={false} />
        </TileBox>
      ),
    },
    {
      name: 'Base island (with forest)',
      render: () => (
        <TileBox>
          <TileForest island={baseIsland} isBase={true} />
        </TileBox>
      ),
    },
    {
      name: 'Resource island (no forest by design)',
      render: () => (
        <TileBox>
          <TileForest island={resourceIsland} isBase={false} />
        </TileBox>
      ),
    },
    {
      name: 'Monster island with living monsters (no forest by design)',
      render: () => (
        <TileBox>
          <TileForest island={monsterIslandWithMonsters} isBase={false} />
        </TileBox>
      ),
    },
    {
      name: 'Cleared monster island (with forest)',
      render: () => (
        <TileBox>
          <TileForest island={clearedMonsterIsland} isBase={false} />
        </TileBox>
      ),
    },
    {
      name: 'Special island (with forest)',
      render: () => (
        <TileBox>
          <TileForest island={specialIsland} isBase={false} />
        </TileBox>
      ),
    },
  ],
};
