'use client';

import { IslandTileView } from './IslandTile';
import {
  baseIslandOwnedByLocalPlayer,
  baseIslandOwnedByOpponent,
  resourceIsland,
  monsterIslandWithLivingMonster,
  specialIsland,
  emptyIsland,
  localPlayerFixture,
  gameStateFixture,
  occupiedResourceIsland,
} from './IslandTile.fixtures';
import { GameBoardProvider } from '@/modules/game-board';
import type { ComponentPreview } from '@/testbed/testbed.types';
import type { IslandTileViewModel } from './IslandTile.types';

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

export const islandTilePreview: ComponentPreview = {
  slug: 'island-tile',
  title: 'Island Tile',
  group: 'Game map',
  states: [
    {
      name: 'Empty island',
      render: () => <WithGameBoardContext viewModel={createViewModel(emptyIsland)} />,
    },
    {
      name: 'Base island owned by local player',
      render: () =>
        <WithGameBoardContext
          viewModel={createViewModelWithState(baseIslandOwnedByLocalPlayer, {
            isBase: true,
          })}
        />,
    },
    {
      name: 'Base island owned by opponent',
      render: () =>
        <WithGameBoardContext
          viewModel={createViewModelWithState(baseIslandOwnedByOpponent, {
            isBase: true,
          })}
        />,
    },
    {
      name: 'Resource island',
      render: () => <WithGameBoardContext viewModel={createViewModel(resourceIsland)} />,
    },
    {
      name: 'Monster island',
      render: () => <WithGameBoardContext viewModel={createViewModel(monsterIslandWithLivingMonster)} />,
    },
    {
      name: 'Special island',
      render: () => <WithGameBoardContext viewModel={createViewModel(specialIsland)} />,
    },
    {
      name: 'Selected tile',
      render: () =>
        <WithGameBoardContext
          viewModel={createViewModelWithState(emptyIsland, {
            isSelected: true,
            isClickable: true,
          })}
        />,
    },
    {
      name: 'Possible move',
      render: () =>
        <WithGameBoardContext
          viewModel={createViewModelWithState(emptyIsland, {
            isPossibleMove: true,
            isClickable: true,
          })}
        />,
    },
    {
      name: 'Teleport target',
      render: () =>
        <WithGameBoardContext
          viewModel={createViewModelWithState(emptyIsland, {
            isTeleportTarget: true,
            isClickable: true,
          })}
        />,
    },
    {
      name: 'Scout target (fogged)',
      render: () =>
        <WithGameBoardContext
          viewModel={createViewModelWithState(emptyIsland, {
            isScoutTarget: true,
            isTileVisible: false,
            isClickable: true,
          })}
        />,
    },
    {
      name: 'Occupied resource island (collector overlay test)',
      render: () => <WithGameBoardContext viewModel={createViewModel(occupiedResourceIsland)} />,
    },
  ],
};
