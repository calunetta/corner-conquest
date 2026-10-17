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
    flaggedIslandState('Covered: resource island beneath fog', resourceIslandWithThreeNodesAndThreeOccupants, {
      isTileVisible: false,
    }),
    flaggedIslandState('Covered: monster island beneath fog', monsterIslandWithLivingMonster, {
      isTileVisible: false,
    }),
    flaggedIslandState('Covered: monster island, neutral grey fog (setting on)', monsterIslandWithLivingMonster, {
      isTileVisible: false,
      isNeutralFog: true,
    }),
    islandState('Revealed: resource island, fog gone', resourceIslandWithThreeNodesAndThreeOccupants),
  ],
};

/** The fog editor (dev tools): variant gallery with uploads and speed, plus the reveal lab that saves timing. */
export const tileFogEditorPreview: ComponentPreview = {
  slug: 'tile-fog-editor',
  title: 'Fog Editor',
  group: 'Dev tools',
  devTool: true,
  states: [
    {
      name: 'All fog variants (covered)',
      render: () => <TileFogVariantGallery />,
    },
    {
      name: '[Reveal lab] Interactive: reveal a covered tile, tune timing',
      render: () => <TileFogRevealLab />,
    },
  ],
};
