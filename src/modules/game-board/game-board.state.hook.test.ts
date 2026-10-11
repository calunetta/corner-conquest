import { renderHook } from '@testing-library/react';
import { useGameBoardState } from './game-board.state.hook';
import type { GameBoardStateArgs } from './game-board.hook.types';
import type { GameState, Player } from '@/lib/types';

const createPlayer = (overrides?: Partial<Player>): Player =>
  ({
    id: 0,
    playerId: 'player_1',
    name: 'Player 1',
    isBot: false,
    isVacant: false,
    lastSeenAt: null,
    reclaimRequested: false,
    color: 'blue',
    armies: [],
    resources: { gold: 100, wood: 50, food: 30 },
    armyCount: 10,
    attackPower: 1,
    nextArmyCost: 2,
    victoryPoints: 0,
    specialCards: [],
    positions: [],
    revealedTiles: [],
    hasExtraMove: false,
    actionsThisTurn: [],
    passiveAbilities: {},
    isSabotaged: false,
    reinforceActive: false,
    efficientActive: false,
    ...overrides,
  }) as unknown as Player;

// Only the fields useGameBoardState reads (players, currentPlayerIndex, status) matter here.
const createGameState = (players: Player[], overrides?: Partial<GameState>): GameState =>
  ({
    id: 'game_test',
    status: 'waiting',
    currentPlayerIndex: 0,
    players,
    ...overrides,
  }) as unknown as GameState;

const hostPlayer = createPlayer({ id: 0, playerId: 'player_1', name: 'Host' });
const joinedPlayer = createPlayer({ id: 1, playerId: 'player_2', name: 'Joiner' });

const createArgs = (serverGameState: GameState, isMyTurn: boolean): GameBoardStateArgs => ({
  serverGameState,
  localPlayerFromServer: hostPlayer,
  playerId: 'player_1',
  isMyTurn,
});

describe('useGameBoardState', () => {
  describe('when it is not the local player turn', () => {
    it('tracks each new serverGameState live, so a joining player becomes visible', () => {
      const soloState = createGameState([hostPlayer]);
      const { result, rerender } = renderHook((args: GameBoardStateArgs) => useGameBoardState(args), {
        initialProps: createArgs(soloState, false),
      });

      expect(result.current.gameStateForDisplay).toBe(soloState);
      expect(result.current.localGameState).toBeNull();

      const twoPlayerState = createGameState([hostPlayer, joinedPlayer]);
      rerender(createArgs(twoPlayerState, false));

      expect(result.current.gameStateForDisplay).toBe(twoPlayerState);
      expect(result.current.gameStateForDisplay.players).toHaveLength(2);
      expect(result.current.localGameState).toBeNull();
    });
  });

  describe('when it is the local player turn', () => {
    it('buffers a clone of serverGameState and displays that clone', () => {
      const serverState = createGameState([hostPlayer, joinedPlayer], { status: 'playing' });
      const { result } = renderHook((args: GameBoardStateArgs) => useGameBoardState(args), {
        initialProps: createArgs(serverState, true),
      });

      expect(result.current.localGameState).not.toBeNull();
      expect(result.current.localGameState).not.toBe(serverState);
      expect(result.current.localGameState).toEqual(serverState);
      expect(result.current.gameStateForDisplay).toBe(result.current.localGameState);
    });

    it('drops the buffer and displays live serverGameState when the turn ends', () => {
      const serverState = createGameState([hostPlayer, joinedPlayer], { status: 'playing' });
      const { result, rerender } = renderHook((args: GameBoardStateArgs) => useGameBoardState(args), {
        initialProps: createArgs(serverState, true),
      });
      expect(result.current.localGameState).not.toBeNull();

      const latestServerState = createGameState([hostPlayer, joinedPlayer], { status: 'playing', currentPlayerIndex: 1 });
      rerender(createArgs(latestServerState, false));

      expect(result.current.localGameState).toBeNull();
      expect(result.current.gameStateForDisplay).toBe(latestServerState);
    });
  });
});
