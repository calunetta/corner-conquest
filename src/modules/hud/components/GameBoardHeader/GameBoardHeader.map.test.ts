import { ResourceType } from '@/lib/types';
import type { GameState, Player } from '@/lib/types';
import { toResources } from '../PlayerInfo/PlayerInfo.map';
import { toGameBoardHeaderViewModel } from './GameBoardHeader.map';
import type { TurnTimer } from './GameBoardHeader.types';

const createPlayer = (id: number, name: string): Player =>
  ({
    id,
    name,
    color: 'blue',
    victoryPoints: 0,
  }) as unknown as Player;

const turnTimer: TurnTimer = {
  timeLeft: 90000,
  formattedTime: '01:30',
  turnDuration: 180000,
  isExpiring: false,
  percentage: 50,
};

describe('toGameBoardHeaderViewModel', () => {
  describe('canStartGame', () => {
    it('is true when status is waiting, isHost is true, and players > 1', () => {
      const gameState = {
        status: 'waiting',
        name: 'Test Game',
        players: [createPlayer(0, 'Player 1'), createPlayer(1, 'Player 2')],
        settings: { victoryPointGoal: 50 },
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameBoardHeaderViewModel(gameState, true, false, turnTimer, null);

      expect(result.canStartGame).toBe(true);
    });

    it('is false when status is not waiting', () => {
      const gameState = {
        status: 'playing' as const,
        name: 'Test Game',
        players: [createPlayer(0, 'Player 1'), createPlayer(1, 'Player 2')],
        settings: { victoryPointGoal: 50 },
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameBoardHeaderViewModel(gameState, true, false, turnTimer, null);

      expect(result.canStartGame).toBe(false);
    });

    it('is false when isHost is false', () => {
      const gameState = {
        status: 'waiting' as const,
        name: 'Test Game',
        players: [createPlayer(0, 'Player 1'), createPlayer(1, 'Player 2')],
        settings: { victoryPointGoal: 50 },
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameBoardHeaderViewModel(gameState, false, false, turnTimer, null);

      expect(result.canStartGame).toBe(false);
    });

    it('is false when players.length <= 1', () => {
      const gameState = {
        status: 'waiting' as const,
        name: 'Test Game',
        players: [createPlayer(0, 'Player 1')],
        settings: { victoryPointGoal: 50 },
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameBoardHeaderViewModel(gameState, true, false, turnTimer, null);

      expect(result.canStartGame).toBe(false);
    });

    it('is false when players array is empty', () => {
      const gameState = {
        status: 'waiting' as const,
        name: 'Test Game',
        players: [] as Player[],
        settings: { victoryPointGoal: 50 },
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameBoardHeaderViewModel(gameState, true, false, turnTimer, null);

      expect(result.canStartGame).toBe(false);
    });
  });

  describe('isPlaying', () => {
    it('is true when status is playing', () => {
      const gameState = {
        status: 'playing' as const,
        name: 'Test Game',
        players: [createPlayer(0, 'Player 1')],
        settings: { victoryPointGoal: 50 },
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameBoardHeaderViewModel(gameState, false, false, turnTimer, null);

      expect(result.isPlaying).toBe(true);
    });

    it('is false when status is waiting', () => {
      const gameState = {
        status: 'waiting' as const,
        name: 'Test Game',
        players: [createPlayer(0, 'Player 1')],
        settings: { victoryPointGoal: 50 },
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameBoardHeaderViewModel(gameState, false, false, turnTimer, null);

      expect(result.isPlaying).toBe(false);
    });

    it('is false when status is finished', () => {
      const gameState = {
        status: 'finished' as const,
        name: 'Test Game',
        players: [createPlayer(0, 'Player 1')],
        settings: { victoryPointGoal: 50 },
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameBoardHeaderViewModel(gameState, false, false, turnTimer, null);

      expect(result.isPlaying).toBe(false);
    });
  });

  describe('turnPlayerName', () => {
    it('returns the current player name when index is valid', () => {
      const gameState = {
        status: 'playing' as const,
        name: 'Test Game',
        players: [createPlayer(0, 'Player 1'), createPlayer(1, 'Alice')],
        settings: { victoryPointGoal: 50 },
        currentPlayerIndex: 1,
      } as GameState;

      const result = toGameBoardHeaderViewModel(gameState, false, false, turnTimer, null);

      expect(result.turnPlayerName).toBe('Alice');
    });

    it('returns undefined when currentPlayerIndex is out of range', () => {
      const gameState = {
        status: 'playing' as const,
        name: 'Test Game',
        players: [createPlayer(0, 'Player 1')],
        settings: { victoryPointGoal: 50 },
        currentPlayerIndex: 5,
      } as GameState;

      const result = toGameBoardHeaderViewModel(gameState, false, false, turnTimer, null);

      expect(result.turnPlayerName).toBeUndefined();
    });

    it('returns undefined when players array is empty', () => {
      const gameState = {
        status: 'playing' as const,
        name: 'Test Game',
        players: [] as Player[],
        settings: { victoryPointGoal: 50 },
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameBoardHeaderViewModel(gameState, false, false, turnTimer, null);

      expect(result.turnPlayerName).toBeUndefined();
    });
  });

  describe('passthrough properties', () => {
    it('passes through gameName from gameState.name', () => {
      const gameState = {
        status: 'playing' as const,
        name: 'My Test Game',
        players: [createPlayer(0, 'Player 1')],
        settings: { victoryPointGoal: 50 },
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameBoardHeaderViewModel(gameState, false, false, turnTimer, null);

      expect(result.gameName).toBe('My Test Game');
    });

    it('passes through victoryPointGoal from gameState.settings', () => {
      const gameState = {
        status: 'playing' as const,
        name: 'Test Game',
        players: [createPlayer(0, 'Player 1')],
        settings: { victoryPointGoal: 75 },
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameBoardHeaderViewModel(gameState, false, false, turnTimer, null);

      expect(result.victoryPointGoal).toBe(75);
    });

    it('passes through isMyTurn unchanged', () => {
      const gameState = {
        status: 'playing' as const,
        name: 'Test Game',
        players: [createPlayer(0, 'Player 1')],
        settings: { victoryPointGoal: 50 },
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameBoardHeaderViewModel(gameState, false, true, turnTimer, null);

      expect(result.isMyTurn).toBe(true);
    });
  });

  describe('turnTimer passthrough', () => {
    it('passes through formattedTime and isExpiring unchanged', () => {
      const gameState = {
        status: 'playing' as const,
        name: 'Test Game',
        players: [createPlayer(0, 'Player 1')],
        settings: { victoryPointGoal: 50 },
        currentPlayerIndex: 0,
      } as GameState;

      const expiringTimer: TurnTimer = {
        timeLeft: 5000,
        formattedTime: '00:05',
        turnDuration: 180000,
        isExpiring: true,
        percentage: 2,
      };

      const result = toGameBoardHeaderViewModel(gameState, false, false, expiringTimer, null);

      expect(result.turnTimer.formattedTime).toBe('00:05');
      expect(result.turnTimer.isExpiring).toBe(true);
    });
  });

  describe('resources', () => {
    const gameState = {
      status: 'playing' as const,
      name: 'Test Game',
      players: [createPlayer(0, 'Player 1')],
      settings: { victoryPointGoal: 50 },
      currentPlayerIndex: 0,
    } as GameState;

    const localPlayer = {
      id: 0,
      name: 'Player 1',
      color: 'blue',
      victoryPoints: 0,
      resources: { food: 4, wood: 2, gold: 1 },
    } as unknown as Player;

    it('is an empty array when localPlayer is null', () => {
      const result = toGameBoardHeaderViewModel(gameState, false, false, turnTimer, null);

      expect(result.resources).toEqual([]);
    });

    it('matches toResources output for the local player', () => {
      const result = toGameBoardHeaderViewModel(gameState, false, false, turnTimer, localPlayer);

      expect(result.resources).toEqual(toResources(localPlayer));
    });

    it('lists food, wood and gold with the local player values', () => {
      const result = toGameBoardHeaderViewModel(gameState, false, false, turnTimer, localPlayer);

      expect(result.resources).toEqual([
        { type: ResourceType.Food, label: 'Food', value: 4 },
        { type: ResourceType.Wood, label: 'Wood', value: 2 },
        { type: ResourceType.Gold, label: 'Gold', value: 1 },
      ]);
    });

    it('is zero for each resource when the local player has no resources data', () => {
      const playerWithoutResources = {
        id: 0,
        name: 'Player 1',
        color: 'blue',
        victoryPoints: 0,
      } as unknown as Player;

      const result = toGameBoardHeaderViewModel(
        gameState,
        false,
        false,
        turnTimer,
        playerWithoutResources,
      );

      expect(result.resources).toEqual([
        { type: ResourceType.Food, label: 'Food', value: 0 },
        { type: ResourceType.Wood, label: 'Wood', value: 0 },
        { type: ResourceType.Gold, label: 'Gold', value: 0 },
      ]);
    });
  });
});
