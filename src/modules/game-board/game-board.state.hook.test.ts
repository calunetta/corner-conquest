import { act, renderHook } from '@testing-library/react';
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

  describe('when the local player is seated at index 0 but the match has not started', () => {
    it('does not buffer while solo and waiting, so a joining player becomes visible', () => {
      // The match creator always owns seat 0, so isMyTurn is already true while solo and
      // still 'waiting' for the room to fill - this must not trigger the turn buffer.
      const soloWaitingState = createGameState([hostPlayer]);
      const { result, rerender } = renderHook((args: GameBoardStateArgs) => useGameBoardState(args), {
        initialProps: createArgs(soloWaitingState, true),
      });

      expect(result.current.localGameState).toBeNull();
      expect(result.current.gameStateForDisplay).toBe(soloWaitingState);

      const twoPlayerWaitingState = createGameState([hostPlayer, joinedPlayer]);
      rerender(createArgs(twoPlayerWaitingState, true));

      expect(result.current.localGameState).toBeNull();
      expect(result.current.gameStateForDisplay).toBe(twoPlayerWaitingState);
      expect(result.current.gameStateForDisplay.players).toHaveLength(2);
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

    it('shows a guest reclaiming their bot-held seat mid-turn, without waiting for the turn to end', () => {
      const botHeldState = createGameState(
        [hostPlayer, createPlayer({ id: 1, playerId: 'player_2', name: 'Joiner', isBot: true, isVacant: true })],
        { status: 'playing' },
      );
      const { result, rerender } = renderHook((args: GameBoardStateArgs) => useGameBoardState(args), {
        initialProps: createArgs(botHeldState, true),
      });
      const hostBufferBefore = result.current.localGameState?.players[0];

      const reclaimedState = createGameState(
        [
          hostPlayer,
          createPlayer({ id: 1, playerId: 'player_2', name: 'Joiner', isBot: false, isVacant: false, lastSeenAt: 1000 }),
        ],
        { status: 'playing' },
      );
      rerender(createArgs(reclaimedState, true));

      expect(result.current.localGameState?.players[1].isBot).toBe(false);
      expect(result.current.localGameState?.players[1].isVacant).toBe(false);
      expect(result.current.localGameState?.players[1].lastSeenAt).toBe(1000);
      expect(result.current.gameStateForDisplay).toBe(result.current.localGameState);
      expect(result.current.localGameState?.players[0]).toBe(hostBufferBefore);
    });

    it('keeps the local turn-holder optimistic change to another seat when a new serverGameState arrives', () => {
      const botHeldState = createGameState(
        [hostPlayer, createPlayer({ id: 1, playerId: 'player_2', name: 'Joiner', isBot: true, isVacant: true })],
        { status: 'playing' },
      );
      const { result, rerender } = renderHook((args: GameBoardStateArgs) => useGameBoardState(args), {
        initialProps: createArgs(botHeldState, true),
      });
      const buffered = result.current.localGameState;
      expect(buffered).not.toBeNull();
      const optimisticGold = 777;
      act(() => {
        result.current.setLocalGameState({
          ...buffered!,
          players: [buffered!.players[0], { ...buffered!.players[1], resources: { gold: optimisticGold, wood: 0, food: 0 } }],
        } as GameState);
      });

      const reclaimedState = createGameState(
        [
          hostPlayer,
          createPlayer({ id: 1, playerId: 'player_2', name: 'Joiner', isBot: false, isVacant: false, lastSeenAt: 1000 }),
        ],
        { status: 'playing' },
      );
      rerender(createArgs(reclaimedState, true));

      expect(result.current.localGameState?.players[1].isBot).toBe(false);
      expect(result.current.localGameState?.players[1].resources.gold).toBe(optimisticGold);
    });

    it('does not replace the buffer when the new serverGameState has no seat-management change', () => {
      const serverState = createGameState([hostPlayer, joinedPlayer], { status: 'playing' });
      const { result, rerender } = renderHook((args: GameBoardStateArgs) => useGameBoardState(args), {
        initialProps: createArgs(serverState, true),
      });
      const bufferBefore = result.current.localGameState;

      rerender(createArgs(createGameState([hostPlayer, joinedPlayer], { status: 'playing' }), true));

      expect(result.current.localGameState).toBe(bufferBefore);
    });
  });
});
