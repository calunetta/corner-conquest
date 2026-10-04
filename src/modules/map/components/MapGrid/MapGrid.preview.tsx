'use client';

import type { GameState } from '@/lib/types';
import { MapGridView } from './MapGrid';
import { MapGrid } from './MapGrid';
import { populatedMapGrid } from './MapGrid.fixtures';
import { GameBoardProvider } from '@/modules/game-board';
import { buildPlayer, buildGameState } from '../../board-context.fixtures';
import { PlayerColor } from '@/lib/types';
import type { ComponentPreview } from '@/testbed/testbed.types';
import type { MapGridViewModel } from './MapGrid.types';

const localPlayer = buildPlayer({ id: 0, playerId: 'p0', color: PlayerColor.Blue });

const GRID_SIZE = 5;

const BASE_SETTINGS = {
  victoryPointGoal: 30, vpPerIslandDiscovery: 1, initialDeployCost: 2, deployCostIncrement: 1,
  upgradeCost: 2, abilityCost: 10, baseResourceAmount: 1, resourceDensity: 0.5,
  availableCards: [], availableAbilities: [], fogOfWar: true, gridSize: { rows: GRID_SIZE, cols: GRID_SIZE },
} as GameState['settings'];

const populatedGameState = buildGameState({
  players: [localPlayer],
  map: populatedMapGrid.map,
  settings: BASE_SETTINGS,
});

const emptyGameState = buildGameState({
  players: [localPlayer],
  map: [],
});

/** Wrapper that provides GameBoardProvider context. */
function WithGameBoardContext({
  viewModel,
}: {
  viewModel: MapGridViewModel;
}) {
  return (
    <GameBoardProvider
      gameId="preview_game"
      playerId={localPlayer.playerId}
      serverGameState={populatedGameState}
      localPlayerFromServer={localPlayer}
      isMyTurn={false}
      isHost={true}
      setGameState={async () => {}}
      onExit={() => {}}
    >
      <MapGridView {...viewModel} />
    </GameBoardProvider>
  );
}

/** Wrapper showing empty map with connected MapGrid component. */
function WithEmptyMap() {
  return (
    <GameBoardProvider
      gameId="preview_game"
      playerId={localPlayer.playerId}
      serverGameState={emptyGameState}
      localPlayerFromServer={localPlayer}
      isMyTurn={false}
      isHost={true}
      setGameState={async () => {}}
      onExit={() => {}}
    >
      <MapGrid />
    </GameBoardProvider>
  );
}

export const mapGridPreview: ComponentPreview = {
  slug: 'map-grid',
  title: 'Map Grid',
  group: 'Game map',
  states: [
    {
      name: 'Populated board',
      render: () => <WithGameBoardContext viewModel={populatedMapGrid} />,
    },
    {
      name: 'Empty map (renders nothing)',
      render: () => <WithEmptyMap />,
    },
  ],
};
