import type { Player } from '@/lib/types';
import type { Island } from '@/lib/types';
import { IslandTileView } from './IslandTile';
import { localPlayerFixture, gameStateFixture } from './IslandTile.fixtures';
import { GameBoardProvider } from '@/modules/game-board';
import type { IslandTileViewModel } from './IslandTile.types';

/** Shared view-model builders and the GameBoardProvider wrapper for IslandTile's preview
 *  states, split out so IslandTile.preview.tsx and IslandTile.preview.slot-lab.tsx (the
 *  interactive lab) can both use them without either file growing past max-lines. */

const noop = () => undefined;

// Placeholder border images - single pixel transparent PNGs as data URIs
const BORDER_PLACEHOLDER = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

export const createViewModel = (island: IslandTileViewModel['island']): IslandTileViewModel => ({
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

export const createViewModelWithState = (
  island: IslandTileViewModel['island'],
  overrides: Partial<IslandTileViewModel> = {},
): IslandTileViewModel => ({
  ...createViewModel(island),
  ...overrides,
});

/** A Base tile whose crest renders: `baseOwner` is what selects castle_<color>.png over the Home fallback. */
export const createBaseViewModel = (island: IslandTileViewModel['island'], baseOwner: Player): IslandTileViewModel =>
  createViewModelWithState(island, { isBase: true, baseOwner });

/** Wrapper that provides GameBoardProvider context. */
export function WithGameBoardContext({ viewModel }: { viewModel: IslandTileViewModel }) {
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
export const islandState = (name: string, island: Island) => ({
  name,
  render: () => <WithGameBoardContext viewModel={createViewModel(island)} />,
});

/** One state rendering `island` with per-state flags (selected, fogged, ...). */
export const flaggedIslandState = (name: string, island: Island, overrides: Partial<IslandTileViewModel>) => ({
  name,
  render: () => <WithGameBoardContext viewModel={createViewModelWithState(island, overrides)} />,
});
