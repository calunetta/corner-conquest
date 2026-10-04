import type { GameState, Player } from '@/lib/types';
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

      const result = toGameBoardHeaderViewModel(gameState, true, false, turnTimer);

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

      const result = toGameBoardHeaderViewModel(gameState, true, false, turnTimer);

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

      const result = toGameBoardHeaderViewModel(gameState, false, false, turnTimer);

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

      const result = toGameBoardHeaderViewModel(gameState, true, false, turnTimer);

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

      const result = toGameBoardHeaderViewModel(gameState, false, false, turnTimer);

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

      const result = toGameBoardHeaderViewModel(gameState, false, false, turnTimer);

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

      const result = toGameBoardHeaderViewModel(gameState, false, false, turnTimer);

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

      const result = toGameBoardHeaderViewModel(gameState, false, false, turnTimer);

      expect(result.turnPlayerName).toBeUndefined();
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

      const result = toGameBoardHeaderViewModel(gameState, false, false, expiringTimer);

      expect(result.turnTimer.formattedTime).toBe('00:05');
      expect(result.turnTimer.isExpiring).toBe(true);
    });
  });
});
