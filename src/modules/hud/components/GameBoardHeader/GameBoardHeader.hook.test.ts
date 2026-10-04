import { renderHook } from '@testing-library/react';
import { useGameBoard } from '@/modules/game-board';
import type { Player } from '@/lib/types';
import { useGameBoardHeader } from './GameBoardHeader.hook';

jest.mock('@/modules/game-board', () => ({ useGameBoard: jest.fn() }));

const createPlayer = (id: number, name: string): Player =>
  ({
    id,
    name,
    color: 'blue',
    victoryPoints: 0,
  }) as unknown as Player;

describe('useGameBoardHeader', () => {
  it('combines gameState and handlers into GameBoardHeaderViewProps', () => {
    const players = [createPlayer(0, 'Player 1'), createPlayer(1, 'Alice')];
    const handleExitClick = jest.fn();
    const handleStartGame = jest.fn();

    jest.mocked(useGameBoard).mockReturnValue({
      gameState: {
        status: 'playing',
        name: 'Test Game',
        players,
        settings: { victoryPointGoal: 50 },
        currentPlayerIndex: 1,
      },
      isHost: true,
      isMyTurn: true,
      uiState: { isExiting: false },
      turnTimer: {
        timeLeft: 90000,
        formattedTime: '01:30',
        turnDuration: 180000,
        isExpiring: false,
        percentage: 50,
      },
      handleExitClick,
      handleStartGame,
    } as unknown as ReturnType<typeof useGameBoard>);

    const { result } = renderHook(() => useGameBoardHeader());

    expect(result.current.gameName).toBe('Test Game');
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.victoryPointGoal).toBe(50);
    expect(result.current.canStartGame).toBe(false);
    expect(result.current.turnPlayerName).toBe('Alice');
    expect(result.current.isMyTurn).toBe(true);
    expect(result.current.turnTimer.formattedTime).toBe('01:30');
    expect(result.current.turnTimer.isExpiring).toBe(false);
    expect(result.current.isExiting).toBe(false);
    expect(result.current.onExitClick).toBe(handleExitClick);
    expect(result.current.onStartGame).toBe(handleStartGame);
  });

  it('returns canStartGame true when waiting, isHost, and 2+ players', () => {
    const players = [createPlayer(0, 'Player 1'), createPlayer(1, 'Player 2')];
    const handleExitClick = jest.fn();
    const handleStartGame = jest.fn();

    jest.mocked(useGameBoard).mockReturnValue({
      gameState: {
        status: 'waiting',
        name: 'Test Game',
        players,
        settings: { victoryPointGoal: 50 },
        currentPlayerIndex: 0,
      },
      isHost: true,
      isMyTurn: false,
      uiState: { isExiting: false },
      turnTimer: {
        timeLeft: 90000,
        formattedTime: '01:30',
        turnDuration: 180000,
        isExpiring: false,
        percentage: 50,
      },
      handleExitClick,
      handleStartGame,
    } as unknown as ReturnType<typeof useGameBoard>);

    const { result } = renderHook(() => useGameBoardHeader());

    expect(result.current.canStartGame).toBe(true);
  });

  it('exposes isExiting from uiState', () => {
    jest.mocked(useGameBoard).mockReturnValue({
      gameState: {
        status: 'playing',
        name: 'Test Game',
        players: [createPlayer(0, 'Player 1')],
        settings: { victoryPointGoal: 50 },
        currentPlayerIndex: 0,
      },
      isHost: false,
      isMyTurn: false,
      uiState: { isExiting: true },
      turnTimer: {
        timeLeft: 90000,
        formattedTime: '01:30',
        turnDuration: 180000,
        isExpiring: false,
        percentage: 50,
      },
      handleExitClick: jest.fn(),
      handleStartGame: jest.fn(),
    } as unknown as ReturnType<typeof useGameBoard>);

    const { result } = renderHook(() => useGameBoardHeader());

    expect(result.current.isExiting).toBe(true);
  });
});
