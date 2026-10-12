'use client';

import type { ReactNode } from 'react';
import { TileResourcesView } from './TileResources';
import { singleNodeFixture } from './TileResources.fixtures';
import {
  multipleResourceNodes,
  withCollectorNode,
  dualFarmedNodes,
  tripleFarmedNodes,
  baseFarmedNodes,
  quadNodes,
  quadFarmedNodes,
} from './TileResources.preview.nodes';
import type { ComponentPreview } from '@/testbed/testbed.types';
import { useIsMobile } from '@/modules/shared';

/** Square stand-in for IslandTile's `relative aspect-square` tile, sized with the same clamp()
 *  ranges MapGrid uses, so the percent-of-tile sizing resolves against a realistic box. */
function TileBox({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const side = isMobile ? 'clamp(46px, 13.5vw, 68px)' : 'clamp(94px, 12.5vh, 136px)';

  return (
    <div
      className="relative rounded-lg border border-dashed border-white/40"
      style={{ width: side, aspectRatio: '1 / 1' }}
    >
      {children}
    </div>
  );
}

export const tileResourcesPreview: ComponentPreview = {
  slug: 'tile-resources',
  title: 'Tile Resources',
  group: 'Game map',
  states: [
    {
      name: 'Single food resource',
      render: () => (
        <TileBox>
          <TileResourcesView nodes={[singleNodeFixture]} />
        </TileBox>
      ),
    },
    {
      name: 'Multiple resources',
      render: () => (
        <TileBox>
          <TileResourcesView nodes={multipleResourceNodes} />
        </TileBox>
      ),
    },
    {
      name: 'Resource with collector',
      render: () => (
        <TileBox>
          <TileResourcesView nodes={withCollectorNode} />
        </TileBox>
      ),
    },
    {
      name: 'Resource with collector, dual slots',
      render: () => (
        <TileBox>
          <TileResourcesView nodes={dualFarmedNodes} />
        </TileBox>
      ),
    },
    {
      name: 'Resource with collector, triple slots',
      render: () => (
        <TileBox>
          <TileResourcesView nodes={tripleFarmedNodes} />
        </TileBox>
      ),
    },
    {
      name: 'Base resource with collector',
      render: () => (
        <TileBox>
          <TileResourcesView nodes={baseFarmedNodes} />
        </TileBox>
      ),
    },
    {
      name: '4 nodes (max), no collector',
      render: () => (
        <TileBox>
          <TileResourcesView nodes={quadNodes} />
        </TileBox>
      ),
    },
    {
      name: '4 nodes (max) with collector',
      render: () => (
        <TileBox>
          <TileResourcesView nodes={quadFarmedNodes} />
        </TileBox>
      ),
    },
    {
      // Mobile suppression: the connected TileResources passes showFarmingCollector={!isMobile},
      // so this is what a phone shows for the same node.
      name: 'Resource with collector, mobile (badge hidden)',
      render: () => (
        <TileBox>
          <TileResourcesView nodes={withCollectorNode} showFarmingCollector={false} />
        </TileBox>
      ),
    },
    {
      name: 'No resources',
      render: () => (
        <TileBox>
          <TileResourcesView nodes={null} />
        </TileBox>
      ),
    },
  ],
};
