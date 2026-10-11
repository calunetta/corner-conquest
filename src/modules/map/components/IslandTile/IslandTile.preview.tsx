'use client';

import type { Player } from '@/lib/types';
import { IslandTileView } from './IslandTile';
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
  gameStateFixture,
  occupiedResourceIsland,
  resourceIslandWithTwoNodesAndThreeOccupants,
  resourceIslandWithThreeNodesAndThreeOccupants,
  emptyIslandWithThreeOccupants,
  emptyIslandWithTwoOccupants,
} from './IslandTile.fixtures';
import { GameBoardProvider } from '@/modules/game-board';
import type { ComponentPreview } from '@/testbed/testbed.types';
import type { IslandTileViewModel } from './IslandTile.types';
import type { Island } from '@/lib/types';

const noop = () => undefined;

// Placeholder border images - single pixel transparent PNGs as data URIs
const BORDER_PLACEHOLDER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const createViewModel = (island: IslandTileViewModel['island']): IslandTileViewModel => ({
  island,
  isSelected: false,
  isPossibleMove: false,
  isTeleportTarget: false,
  isScoutTarget: false,
  isTileVisible: true,
  isBase: island.type === 'base',
  baseOwner: null,
  tilePlayerColor: null,
  isClickable: false,
  deathAnimationOnTile: undefined,
  borderImageSequence: [BORDER_PLACEHOLDER, BORDER_PLACEHOLDER, BORDER_PLACEHOLDER],
  onClick: noop,
});

const createViewModelWithState = (
  island: IslandTileViewModel['island'],
  overrides: Partial<IslandTileViewModel> = {},
): IslandTileViewModel => ({
  ...createViewModel(island),
  ...overrides,
});

/** A Base tile whose crest renders: `baseOwner` is what selects castle_<color>.png over the Home fallback. */
const createBaseViewModel = (island: IslandTileViewModel['island'], baseOwner: Player): IslandTileViewModel =>
  createViewModelWithState(island, { isBase: true, baseOwner });

/** Wrapper that provides GameBoardProvider context. */
function WithGameBoardContext({ viewModel }: { viewModel: IslandTileViewModel }) {
  return (
    <GameBoardProvider
      gameId="preview_game"
      playerId={localPlayerFixture.playerId}
      serverGameState={gameStateFixture}
      localPlayerFromServer={localPlayerFixture}
      isMyTurn={false}
      isHost={true}
      setGameState={async () => {}}
      onExit={() => {}}
    >
      <IslandTileView {...viewModel} />
    </GameBoardProvider>
  );
}

/** One state rendering `island` with default view-model flags. */
const islandState = (name: string, island: Island) => ({
  name,
  render: () => <WithGameBoardContext viewModel={createViewModel(island)} />,
});

/** One state rendering `island` with per-state flags (selected, fogged, ...). */
const flaggedIslandState = (name: string, island: Island, overrides: Partial<IslandTileViewModel>) => ({
  name,
  render: () => <WithGameBoardContext viewModel={createViewModelWithState(island, overrides)} />,
});

export const islandTilePreview: ComponentPreview = {
  slug: 'island-tile',
  title: 'Island Tile',
  group: 'Game map',
  states: [
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
  ],
};
