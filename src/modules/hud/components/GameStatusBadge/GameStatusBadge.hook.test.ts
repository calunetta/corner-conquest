import { renderHook } from '@testing-library/react';
import { useGameBoard } from '@/modules/game-board';
import type { Player } from '@/lib/types';
import { useGameStatusBadge } from './GameStatusBadge.hook';

jest.mock('@/modules/game-board', () => ({ useGameBoard: jest.fn() }));

const createPlayer = (id: number, name: string): Player =>
  ({
    id,
    name,
    color: 'blue',
    victoryPoints: 0,
  }) as unknown as Player;

describe('useGameStatusBadge', () => {
  it('builds the view model from the board context', () => {
    const players = [createPlayer(0, 'Player 1'), createPlayer(1, 'Alice')];

    jest.mocked(useGameBoard).mockReturnValue({
      gameState: {
        status: 'playing',
        maxPlayers: 4,
        players,
        currentPlayerIndex: 1,
      },
      isMyTurn: false,
      turnTimer: {
        timeLeft: 90000,
        formattedTime: '01:30',
        turnDuration: 180000,
        isExpiring: false,
        percentage: 50,
      },
    } as unknown as ReturnType<typeof useGameBoard>);

    const { result } = renderHook(() => useGameStatusBadge());

    expect(result.current.isWaiting).toBe(false);
    expect(result.current.playerCount).toBe(2);
    expect(result.current.maxPlayers).toBe(4);
    expect(result.current.turnLabel).toBe("Alice's Turn");
    expect(result.current.isMyTurn).toBe(false);
    expect(result.current.formattedTime).toBe('01:30');
    expect(result.current.isExpiring).toBe(false);
  });

  it('returns correct view model for waiting status', () => {
    const players = [createPlayer(0, 'Player 1'), createPlayer(1, 'Player 2')];

    jest.mocked(useGameBoard).mockReturnValue({
      gameState: {
        status: 'waiting',
        maxPlayers: 4,
        players,
        currentPlayerIndex: 0,
      },
      isMyTurn: false,
      turnTimer: {
        timeLeft: 90000,
        formattedTime: '01:30',
        turnDuration: 180000,
        isExpiring: false,
        percentage: 50,
      },
    } as unknown as ReturnType<typeof useGameBoard>);

    const { result } = renderHook(() => useGameStatusBadge());

    expect(result.current.isWaiting).toBe(true);
  });
});
