import { act, renderHook } from '@testing-library/react';
import { useGameBoardState } from './game-board.state.hook';
import type { GameBoardStateArgs } from './game-board.hook.types';
import type { GameState, Player } from '@/lib/types';
import { IslandType } from '@/lib/types';

const createPlayer = (overrides?: Partial<Player>): Player =>
  ({
    id: 0,
    playerId: 'player_1',
    name: 'Player 1',
    isBot: false,
    isVacant: false,
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

// Only the fields useGameBoardState reads (players, currentPlayerIndex, status, heartbeats) matter here.
const createGameState = (players: Player[], overrides?: Partial<GameState>): GameState =>
  ({
    id: 'game_test',
    status: 'waiting',
    currentPlayerIndex: 0,
    players,
    heartbeats: {},
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
        [hostPlayer, createPlayer({ id: 1, playerId: 'player_2', name: 'Joiner', isBot: false, isVacant: false })],
        { status: 'playing', heartbeats: { 1: 1000 } },
      );
      rerender(createArgs(reclaimedState, true));

      expect(result.current.localGameState?.players[1].isBot).toBe(false);
      expect(result.current.localGameState?.players[1].isVacant).toBe(false);
      expect(result.current.localGameState?.heartbeats[1]).toBe(1000);
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
        [hostPlayer, createPlayer({ id: 1, playerId: 'player_2', name: 'Joiner', isBot: false, isVacant: false })],
        { status: 'playing', heartbeats: { 1: 1000 } },
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

  describe('possibleMoves for the selected army', () => {
    const GRID = 3;

    // A 3x3 board of Resource tiles with one army at the centre (1,1). From the centre every other
    // tile is within move radius 2, so an unacted army has 8 possible moves.
    const createBoardState = (armyHasActed: boolean): GameState => {
      const map = Array.from({ length: GRID * GRID }, (_, i) => ({
        id: `${i % GRID}-${Math.floor(i / GRID)}`,
        x: i % GRID,
        y: Math.floor(i / GRID),
        type: IslandType.Resource,
        resources: [],
        occupants: [],
      }));
      const army = { id: 1, position: { x: 1, y: 1 }, hasActed: armyHasActed };
      const host = createPlayer({ id: 0, playerId: 'player_1', name: 'Host', armies: [army] });
      return createGameState([host], {
        status: 'playing',
        map,
        baseTiles: [],
        settings: { gridSize: { rows: GRID, cols: GRID } },
      } as unknown as Partial<GameState>);
    };

    it('lists every other tile within radius 2 for a freshly selected army that has not acted', () => {
      const { result } = renderHook((args: GameBoardStateArgs) => useGameBoardState(args), {
        initialProps: createArgs(createBoardState(false), true),
      });

      act(() => result.current.dispatch({ type: 'SET_SELECTED_ARMY', armyId: 1 }));

      const coords = result.current.uiState.possibleMoves.map((p) => `${p.x},${p.y}`).sort();
      expect(coords).toEqual(['0,0', '0,1', '0,2', '1,0', '1,2', '2,0', '2,1', '2,2']);
    });

    it('clears possibleMoves when the selection is cleared', () => {
      const { result } = renderHook((args: GameBoardStateArgs) => useGameBoardState(args), {
        initialProps: createArgs(createBoardState(false), true),
      });
      act(() => result.current.dispatch({ type: 'SET_SELECTED_ARMY', armyId: 1 }));
      expect(result.current.uiState.possibleMoves).toHaveLength(8);

      act(() => result.current.dispatch({ type: 'SET_SELECTED_ARMY', armyId: null }));

      expect(result.current.selectedArmy).toBeNull();
      expect(result.current.uiState.possibleMoves).toEqual([]);
    });

    it('returns no possibleMoves when it is not the local player turn, even with an unacted army selected', () => {
      const { result } = renderHook((args: GameBoardStateArgs) => useGameBoardState(args), {
        initialProps: createArgs(createBoardState(false), false),
      });

      act(() => result.current.dispatch({ type: 'SET_SELECTED_ARMY', armyId: 1 }));

      expect(result.current.selectedArmy?.id).toBe(1);
      expect(result.current.uiState.possibleMoves).toEqual([]);
    });

    it('does not render the pre-action possibleMoves in the same render that marks the selected army as acted', () => {
      const renders: { hasActed: boolean | null; possibleMoves: { x: number; y: number }[] }[] = [];
      const { result } = renderHook(
        (args: GameBoardStateArgs) => {
          const state = useGameBoardState(args);
          renders.push({
            hasActed: state.selectedArmy?.hasActed ?? null,
            possibleMoves: state.uiState.possibleMoves,
          });
          return state;
        },
        { initialProps: createArgs(createBoardState(false), true) },
      );

      act(() => result.current.dispatch({ type: 'SET_SELECTED_ARMY', armyId: 1 }));
      expect(result.current.uiState.possibleMoves).toHaveLength(8);

      // Mirrors the position action: the buffered state is replaced with one where the army has acted.
      renders.length = 0;
      act(() => result.current.setLocalGameState(createBoardState(true)));

      // The army is still selected and now hasActed; the move list must clear in that same render.
      expect(renders[0]).toEqual({ hasActed: true, possibleMoves: [] });
      expect(result.current.uiState.possibleMoves).toEqual([]);
    });
  });
});
