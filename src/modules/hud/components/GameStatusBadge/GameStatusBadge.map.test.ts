import type { GameState, Player } from '@/lib/types';
import { toGameStatusBadgeViewModel } from './GameStatusBadge.map';
import type { TurnTimer } from '../GameBoardHeader/GameBoardHeader.types';

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

describe('toGameStatusBadgeViewModel', () => {
  describe('isWaiting', () => {
    it('is true when status is waiting', () => {
      const gameState = {
        status: 'waiting' as const,
        maxPlayers: 4,
        players: [createPlayer(0, 'Player 1')],
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameStatusBadgeViewModel(gameState, false, turnTimer);

      expect(result.isWaiting).toBe(true);
    });

    it('is false when status is playing', () => {
      const gameState = {
        status: 'playing' as const,
        maxPlayers: 4,
        players: [createPlayer(0, 'Player 1')],
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameStatusBadgeViewModel(gameState, false, turnTimer);

      expect(result.isWaiting).toBe(false);
    });

    it('is false when status is finished', () => {
      const gameState = {
        status: 'finished' as const,
        maxPlayers: 4,
        players: [createPlayer(0, 'Player 1')],
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameStatusBadgeViewModel(gameState, false, turnTimer);

      expect(result.isWaiting).toBe(false);
    });
  });

  describe('turnLabel', () => {
    it('is "Your Turn" when isMyTurn is true', () => {
      const gameState = {
        status: 'playing' as const,
        maxPlayers: 4,
        players: [createPlayer(0, 'Player 1')],
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameStatusBadgeViewModel(gameState, true, turnTimer);

      expect(result.turnLabel).toBe('Your Turn');
    });

    it('is "<name>\'s Turn" when isMyTurn is false and player exists', () => {
      const gameState = {
        status: 'playing' as const,
        maxPlayers: 4,
        players: [createPlayer(0, 'Player 1'), createPlayer(1, 'Alice')],
        currentPlayerIndex: 1,
      } as GameState;

      const result = toGameStatusBadgeViewModel(gameState, false, turnTimer);

      expect(result.turnLabel).toBe("Alice's Turn");
    });

    it("is \"Player's Turn\" when player does not exist", () => {
      const gameState = {
        status: 'playing' as const,
        maxPlayers: 4,
        players: [createPlayer(0, 'Player 1')],
        currentPlayerIndex: 5,
      } as GameState;

      const result = toGameStatusBadgeViewModel(gameState, false, turnTimer);

      expect(result.turnLabel).toBe("Player's Turn");
    });

    it("is \"Player's Turn\" when players array is empty", () => {
      const gameState = {
        status: 'playing' as const,
        maxPlayers: 4,
        players: [] as Player[],
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameStatusBadgeViewModel(gameState, false, turnTimer);

      expect(result.turnLabel).toBe("Player's Turn");
    });
  });

  describe('formattedTime fallback', () => {
    it('uses turnTimer.formattedTime when available', () => {
      const gameState = {
        status: 'playing' as const,
        maxPlayers: 4,
        players: [createPlayer(0, 'Player 1')],
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameStatusBadgeViewModel(gameState, false, turnTimer);

      expect(result.formattedTime).toBe('01:30');
    });

    it('falls back to "02:00" when formattedTime is empty string', () => {
      const emptyTimer: TurnTimer = {
        timeLeft: 90000,
        formattedTime: '',
        turnDuration: 180000,
        isExpiring: false,
        percentage: 50,
      };

      const gameState = {
        status: 'playing' as const,
        maxPlayers: 4,
        players: [createPlayer(0, 'Player 1')],
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameStatusBadgeViewModel(gameState, false, emptyTimer);

      expect(result.formattedTime).toBe('02:00');
    });

    it('falls back to "02:00" when formattedTime is undefined', () => {
      const undefinedTimer = {
        timeLeft: 90000,
        formattedTime: undefined,
        turnDuration: 180000,
        isExpiring: false,
        percentage: 50,
      } as unknown as TurnTimer;

      const gameState = {
        status: 'playing' as const,
        maxPlayers: 4,
        players: [createPlayer(0, 'Player 1')],
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameStatusBadgeViewModel(gameState, false, undefinedTimer);

      expect(result.formattedTime).toBe('02:00');
    });
  });

  describe('isExpiring coercion', () => {
    it('coerces true to boolean', () => {
      const expiringTimer: TurnTimer = {
        timeLeft: 5000,
        formattedTime: '00:05',
        turnDuration: 180000,
        isExpiring: true,
        percentage: 2,
      };

      const gameState = {
        status: 'playing' as const,
        maxPlayers: 4,
        players: [createPlayer(0, 'Player 1')],
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameStatusBadgeViewModel(gameState, false, expiringTimer);

      expect(result.isExpiring).toBe(true);
    });

    it('coerces false to boolean', () => {
      const gameState = {
        status: 'playing' as const,
        maxPlayers: 4,
        players: [createPlayer(0, 'Player 1')],
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameStatusBadgeViewModel(gameState, false, turnTimer);

      expect(result.isExpiring).toBe(false);
    });
  });

  describe('player count fields', () => {
    it('includes playerCount and maxPlayers', () => {
      const gameState = {
        status: 'waiting' as const,
        maxPlayers: 4,
        players: [createPlayer(0, 'Player 1'), createPlayer(1, 'Player 2')],
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameStatusBadgeViewModel(gameState, false, turnTimer);

      expect(result.playerCount).toBe(2);
      expect(result.maxPlayers).toBe(4);
    });

    it('handles zero players', () => {
      const gameState = {
        status: 'waiting' as const,
        maxPlayers: 4,
        players: [] as Player[],
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameStatusBadgeViewModel(gameState, false, turnTimer);

      expect(result.playerCount).toBe(0);
      expect(result.maxPlayers).toBe(4);
    });

    it('handles full player count', () => {
      const gameState = {
        status: 'waiting' as const,
        maxPlayers: 2,
        players: [createPlayer(0, 'Player 1'), createPlayer(1, 'Player 2')],
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameStatusBadgeViewModel(gameState, false, turnTimer);

      expect(result.playerCount).toBe(2);
      expect(result.maxPlayers).toBe(2);
    });
  });

  describe('isMyTurn passthrough', () => {
    it('passes through isMyTurn true', () => {
      const gameState = {
        status: 'playing' as const,
        maxPlayers: 4,
        players: [createPlayer(0, 'Player 1')],
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameStatusBadgeViewModel(gameState, true, turnTimer);

      expect(result.isMyTurn).toBe(true);
    });

    it('passes through isMyTurn false', () => {
      const gameState = {
        status: 'playing' as const,
        maxPlayers: 4,
        players: [createPlayer(0, 'Player 1')],
        currentPlayerIndex: 0,
      } as GameState;

      const result = toGameStatusBadgeViewModel(gameState, false, turnTimer);

      expect(result.isMyTurn).toBe(false);
    });
  });
});
