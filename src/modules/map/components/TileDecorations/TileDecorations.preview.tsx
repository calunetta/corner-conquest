'use client';

import type { ReactNode } from 'react';
import { TileDecorations } from './TileDecorations';
import {
  emptyIsland,
  baseIsland,
  resourceIsland,
  monsterIslandWithMonsters,
  clearedMonsterIsland,
  specialIsland,
} from './TileDecorations.fixtures';
import type { ComponentPreview } from '@/testbed/testbed.types';

/** Fixed-size stand-in for IslandTile's `relative aspect-square` button. Decoration sizes are
 *  percentages of the tile side, so each state needs this sized box to be checkable. */
function TileBox({ children }: { children: ReactNode }) {
  return (
    <div className="relative rounded-lg border border-dashed border-white/40" style={{ width: 136, height: 136 }}>
      {children}
    </div>
  );
}

export const tileDecorationsPreview: ComponentPreview = {
  slug: 'tile-decorations',
  title: 'Tile Decorations',
  group: 'Game map',
  states: [
    {
      name: 'Empty island (decorated)',
      render: () => (
        <TileBox>
          <TileDecorations island={emptyIsland} isBase={false} />
        </TileBox>
      ),
    },
    {
      name: 'Base island (decorated)',
      render: () => (
        <TileBox>
          <TileDecorations island={baseIsland} isBase={true} />
        </TileBox>
      ),
    },
    {
      name: 'Special island (decorated)',
      render: () => (
        <TileBox>
          <TileDecorations island={specialIsland} isBase={false} />
        </TileBox>
      ),
    },
    {
      name: 'Resource island (empty by default)',
      render: () => (
        <TileBox>
          <TileDecorations island={resourceIsland} isBase={false} />
        </TileBox>
      ),
    },
    {
      name: 'Monster island with living monsters (empty by default)',
      render: () => (
        <TileBox>
          <TileDecorations island={monsterIslandWithMonsters} isBase={false} />
        </TileBox>
      ),
    },
    {
      name: 'Cleared monster island (decorated)',
      render: () => (
        <TileBox>
          <TileDecorations island={clearedMonsterIsland} isBase={false} />
        </TileBox>
      ),
    },
  ],
};
