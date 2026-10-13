'use client';

import {
  baseIslandOwnedByLocalPlayer,
  baseIslandOwnedByOpponent,
  baseIslandWithThreeResources,
  baseIslandWithResourcesAndOccupants,
  resourceIsland,
  monsterIslandWithLivingMonster,
  specialIsland,
  emptyIsland,
  localPlayerFixture,
  opponentPlayerFixture,
  occupiedResourceIsland,
  resourceIslandWithTwoNodesAndThreeOccupants,
  resourceIslandWithThreeNodesAndThreeOccupants,
  emptyIslandWithThreeOccupants,
  emptyIslandWithTwoOccupants,
  resourceIslandSlotTuningSingle,
  resourceIslandSlotTuningDual,
  resourceIslandSlotTuningTriple,
  resourceIslandSlotTuningQuad,
  emptyIslandSlotTuningGrove2,
  emptyIslandSlotTuningGrove3,
  baseIslandSlotTuningAll,
} from './IslandTile.fixtures';
import { createBaseViewModel, WithGameBoardContext, islandState, flaggedIslandState } from './IslandTile.preview.shared';
import { IslandTileSlotLab } from './IslandTile.preview.slot-lab';
import type { ComponentPreview } from '@/testbed/testbed.types';

export const islandTilePreview: ComponentPreview = {
  slug: 'island-tile',
  title: 'Island Tile',
  group: 'Game map',
  states: [
    {
      name: '[Slot lab] Interactive: pick type, resources, farming, occupants',
      render: () => <IslandTileSlotLab />,
    },
    islandState('Empty island', emptyIsland),
    {
      name: 'Base island owned by local player',
      render: () => <WithGameBoardContext viewModel={createBaseViewModel(baseIslandOwnedByLocalPlayer, localPlayerFixture)} />,
    },
    {
      name: 'Base island owned by opponent',
      render: () => <WithGameBoardContext viewModel={createBaseViewModel(baseIslandOwnedByOpponent, opponentPlayerFixture)} />,
    },
    {
      name: 'Base island with resources',
      render: () => <WithGameBoardContext viewModel={createBaseViewModel(baseIslandWithThreeResources, localPlayerFixture)} />,
    },
    {
      name: 'Base island with resources and occupants',
      render: () => <WithGameBoardContext viewModel={createBaseViewModel(baseIslandWithResourcesAndOccupants, localPlayerFixture)} />,
    },
    islandState('Resource island', resourceIsland),
    islandState('Monster island', monsterIslandWithLivingMonster),
    islandState('Special island', specialIsland),
    flaggedIslandState('Selected tile', emptyIsland, { isSelected: true, isClickable: true }),
    flaggedIslandState('Possible move', emptyIsland, { isPossibleMove: true, isClickable: true }),
    flaggedIslandState('Teleport target', emptyIsland, { isTeleportTarget: true, isClickable: true }),
    flaggedIslandState('Scout target (fogged)', emptyIsland, { isScoutTarget: true, isTileVisible: false, isClickable: true }),
    islandState('Occupied resource island (collector overlay test)', occupiedResourceIsland),
    islandState('Resource island, 2 nodes + occupants on all corners', resourceIslandWithTwoNodesAndThreeOccupants),
    islandState('Resource island, 3 nodes + occupants on all corners', resourceIslandWithThreeNodesAndThreeOccupants),
    islandState('Empty island, 3-tree grove + 3 occupants (br/tr/tl)', emptyIslandWithThreeOccupants),
    islandState('Empty island, 3-tree grove + 2 occupants (br/tr)', emptyIslandWithTwoOccupants),
    islandState('[Slot tuning] Resource island, 1 node + occupants on all 4 corners', resourceIslandSlotTuningSingle),
    islandState('[Slot tuning] Resource island, 2 nodes + occupants on all 4 corners', resourceIslandSlotTuningDual),
    islandState('[Slot tuning] Resource island, 3 nodes + occupants on all 4 corners', resourceIslandSlotTuningTriple),
    islandState('[Slot tuning] Resource island, 4 nodes (max, 1 farmed) + occupants on all 4 corners', resourceIslandSlotTuningQuad),
    islandState('[Slot tuning] Empty island, 2-tree grove + occupants on all 4 corners', emptyIslandSlotTuningGrove2),
    islandState('[Slot tuning] Empty island, 3-tree grove + occupants on all 4 corners', emptyIslandSlotTuningGrove3),
    {
      name: '[Slot tuning] Base island, resources + forest + occupants on all 4 corners',
      render: () => <WithGameBoardContext viewModel={createBaseViewModel(baseIslandSlotTuningAll, localPlayerFixture)} />,
    },
  ],
};
