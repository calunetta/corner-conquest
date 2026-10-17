import { flaggedIslandState, islandState } from '../IslandTile/IslandTile.preview.shared';
import {
  monsterIslandWithLivingMonster,
  resourceIslandWithThreeNodesAndThreeOccupants,
} from '../IslandTile/IslandTile.fixtures';
import { TileFogRevealLab } from './TileFog.preview.lab';
import { TileFogVariantGallery } from './TileFog.preview.gallery';
import type { ComponentPreview } from '@/testbed/testbed.types';

export const tileFogPreview: ComponentPreview = {
  slug: 'tile-fog',
  title: 'Tile Fog',
  group: 'Game map',
  states: [
    {
      name: 'All fog variants (covered)',
      render: () => <TileFogVariantGallery />,
    },
    {
      name: '[Reveal lab] Interactive: reveal a covered tile, tune timing',
      render: () => <TileFogRevealLab />,
    },
    flaggedIslandState('Covered: resource island beneath fog', resourceIslandWithThreeNodesAndThreeOccupants, {
      isTileVisible: false,
    }),
    flaggedIslandState('Covered: monster island beneath fog', monsterIslandWithLivingMonster, {
      isTileVisible: false,
    }),
    islandState('Revealed: resource island, fog gone', resourceIslandWithThreeNodesAndThreeOccupants),
  ],
};
