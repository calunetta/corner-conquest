import { renderHook, act } from '@testing-library/react';
import { PlayerColor } from '@/lib/types';
import type { GameSettings, GameState } from '@/lib/types';
import { defaultGameSettings } from '@/modules/game-rules';
import { usePlayer } from '@/hooks/use-player';

const mockToast = jest.fn();
jest.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: mockToast }) }));
jest.mock('@/hooks/use-player');

jest.mock('../../services/lobby.service', () => ({
  subscribeToOpenGames: jest.fn(),
  createGameId: jest.fn(),
  saveGame: jest.fn(),
  joinOpenGame: jest.fn(),
}));

import {
  subscribeToOpenGames,
  createGameId,
  saveGame,
  joinOpenGame,
} from '../../services/lobby.service';
import { useLobby } from './Lobby.hook';

const mockSubscribeToOpenGames = subscribeToOpenGames as jest.Mock;
const mockCreateGameId = createGameId as jest.Mock;
const mockSaveGame = saveGame as jest.Mock;
const mockJoinOpenGame = joinOpenGame as jest.Mock;
const mockUsePlayer = usePlayer as jest.Mock;

const games: GameState[] = [];

describe('useLobby', () => {
  const unsubscribe = jest.fn();

  beforeEach(() => {
    mockToast.mockClear();
    unsubscribe.mockClear();
    mockSubscribeToOpenGames.mockReset().mockReturnValue(unsubscribe);
    mockCreateGameId.mockReset().mockReturnValue('new-game-id');
    mockSaveGame.mockReset().mockResolvedValue(undefined);
    mockJoinOpenGame.mockReset().mockResolvedValue(undefined);
    mockUsePlayer.mockReset().mockReturnValue({
      playerId: 'player-1',
      username: 'Ada',
      logout: jest.fn(),
    });
  });

  it('subscribes to open games on mount', () => {
    renderHook(() => useLobby({ onJoinGame: jest.fn() }));

    expect(mockSubscribeToOpenGames).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useLobby({ onJoinGame: jest.fn() }));

    unmount();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('sets games and clears isGamesLoading when the subscription delivers a list', () => {
    let onGamesCallback: (games: GameState[]) => void = () => undefined;
    mockSubscribeToOpenGames.mockImplementation((onGames) => {
      onGamesCallback = onGames;
      return unsubscribe;
    });

    const { result } = renderHook(() => useLobby({ onJoinGame: jest.fn() }));
    expect(result.current.isGamesLoading).toBe(true);

    act(() => {
      onGamesCallback(games);
    });

    expect(result.current.isGamesLoading).toBe(false);
    expect(result.current.games).toBe(games);
  });

  it("toasts 'Lobby Error' on subscription error", () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    let onErrorCallback: (error: Error) => void = () => undefined;
    mockSubscribeToOpenGames.mockImplementation((_onGames, onError) => {
      onErrorCallback = onError;
      return unsubscribe;
    });

    renderHook(() => useLobby({ onJoinGame: jest.fn() }));

    act(() => {
      onErrorCallback(new Error('listener failed'));
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Lobby Error', variant: 'destructive' }),
    );
    consoleErrorSpy.mockRestore();
  });

  describe('onCreateGame', () => {
    const settings: GameSettings = defaultGameSettings;

    it('returns false without calling createGameId when playerId is missing (invalid input)', async () => {
      mockUsePlayer.mockReturnValue({ playerId: null, username: 'Ada', logout: jest.fn() });
      const { result } = renderHook(() => useLobby({ onJoinGame: jest.fn() }));

      let created: boolean | undefined;
      await act(async () => {
        created = await result.current.onCreateGame('My Game', 2, PlayerColor.Blue, 0, false, settings);
      });

      expect(created).toBe(false);
      expect(mockCreateGameId).not.toHaveBeenCalled();
    });

    it('returns false without calling createGameId when username is missing (invalid input)', async () => {
      mockUsePlayer.mockReturnValue({ playerId: 'player-1', username: null, logout: jest.fn() });
      const { result } = renderHook(() => useLobby({ onJoinGame: jest.fn() }));

      let created: boolean | undefined;
      await act(async () => {
        created = await result.current.onCreateGame('My Game', 2, PlayerColor.Blue, 0, false, settings);
      });

      expect(created).toBe(false);
      expect(mockCreateGameId).not.toHaveBeenCalled();
    });

    it('a solo game (maxPlayers === 1) saves twice: once waiting, once started', async () => {
      const onJoinGame = jest.fn();
      const { result } = renderHook(() => useLobby({ onJoinGame }));

      let created: boolean | undefined;
      await act(async () => {
        created = await result.current.onCreateGame('Solo Game', 1, PlayerColor.Blue, 1, true, settings);
      });

      expect(created).toBe(true);
      expect(mockSaveGame).toHaveBeenCalledTimes(2);
      const [firstSaved] = mockSaveGame.mock.calls[0] as [GameState];
      const [secondSaved] = mockSaveGame.mock.calls[1] as [GameState];
      expect(firstSaved.status).toBe('waiting');
      expect(secondSaved.status).toBe('playing');
      expect(onJoinGame).toHaveBeenCalledWith('new-game-id');
    });

    it('a multiplayer game (maxPlayers > 1) saves once and does not start', async () => {
      const onJoinGame = jest.fn();
      const { result } = renderHook(() => useLobby({ onJoinGame }));

      let created: boolean | undefined;
      await act(async () => {
        created = await result.current.onCreateGame('Multi Game', 4, PlayerColor.Blue, 0, false, settings);
      });

      expect(created).toBe(true);
      expect(mockSaveGame).toHaveBeenCalledTimes(1);
      const [savedGame] = mockSaveGame.mock.calls[0] as [GameState];
      expect(savedGame.status).toBe('waiting');
      expect(onJoinGame).toHaveBeenCalledWith('new-game-id');
    });

    it('toasts an error and returns false when saveGame rejects', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSaveGame.mockRejectedValue(new Error('offline'));
      const onJoinGame = jest.fn();
      const { result } = renderHook(() => useLobby({ onJoinGame }));

      let created: boolean | undefined;
      await act(async () => {
        created = await result.current.onCreateGame('My Game', 2, PlayerColor.Blue, 0, false, settings);
      });

      expect(created).toBe(false);
      expect(onJoinGame).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error', variant: 'destructive' }));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('onJoinGame (join flow)', () => {
    it('sets isJoiningGame while the join is in flight and clears it after success', async () => {
      let resolveJoin: () => void = () => undefined;
      mockJoinOpenGame.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            resolveJoin = resolve;
          }),
      );
      const onJoinGame = jest.fn();
      const { result } = renderHook(() => useLobby({ onJoinGame }));

      act(() => {
        void result.current.onJoinGame('game-1');
      });

      expect(result.current.isJoiningGame).toBe('game-1');

      await act(async () => {
        resolveJoin();
        await Promise.resolve();
      });

      expect(result.current.isJoiningGame).toBeNull();
      expect(onJoinGame).toHaveBeenCalledWith('game-1');
    });

    it('calls the prop onJoinGame on success', async () => {
      const onJoinGame = jest.fn();
      const { result } = renderHook(() => useLobby({ onJoinGame }));

      await act(async () => {
        await result.current.onJoinGame('game-1');
      });

      expect(mockJoinOpenGame).toHaveBeenCalledWith('game-1', { playerId: 'player-1', name: 'Ada' });
      expect(onJoinGame).toHaveBeenCalledWith('game-1');
    });

    it('toasts the thrown message and clears isJoiningGame on failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockJoinOpenGame.mockRejectedValue(new Error('This game is full.'));
      const onJoinGame = jest.fn();
      const { result } = renderHook(() => useLobby({ onJoinGame }));

      await act(async () => {
        await result.current.onJoinGame('game-1');
      });

      expect(onJoinGame).not.toHaveBeenCalled();
      expect(result.current.isJoiningGame).toBeNull();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Could Not Join',
          description: 'This game is full.',
          variant: 'destructive',
        }),
      );
      consoleErrorSpy.mockRestore();
    });

    it("shows the fallback 'An unknown error occurred.' message when a non-Error is thrown", async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      // Exercises the non-Error branch intentionally: production code can only guarantee the
      // service throws, not that it throws an Error instance.
      mockJoinOpenGame.mockRejectedValue('a plain string');
      const { result } = renderHook(() => useLobby({ onJoinGame: jest.fn() }));

      await act(async () => {
        await result.current.onJoinGame('game-1');
      });

      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'An unknown error occurred.' }),
      );
      consoleErrorSpy.mockRestore();
    });

    it('no-ops when playerId is missing (invalid input)', async () => {
      mockUsePlayer.mockReturnValue({ playerId: null, username: 'Ada', logout: jest.fn() });
      const { result } = renderHook(() => useLobby({ onJoinGame: jest.fn() }));

      await act(async () => {
        await result.current.onJoinGame('game-1');
      });

      expect(mockJoinOpenGame).not.toHaveBeenCalled();
    });
  });

  describe('dialog state and logout', () => {
    it('onOpenCreateDialog opens the dialog', () => {
      const { result } = renderHook(() => useLobby({ onJoinGame: jest.fn() }));

      act(() => {
        result.current.onOpenCreateDialog();
      });

      expect(result.current.isCreateDialogOpen).toBe(true);
    });

    it('onCreateDialogChange sets the dialog open state directly', () => {
      const { result } = renderHook(() => useLobby({ onJoinGame: jest.fn() }));

      act(() => {
        result.current.onCreateDialogChange(true);
      });
      expect(result.current.isCreateDialogOpen).toBe(true);

      act(() => {
        result.current.onCreateDialogChange(false);
      });
      expect(result.current.isCreateDialogOpen).toBe(false);
    });

    it('onLogout forwards to usePlayer().logout', () => {
      const logout = jest.fn();
      mockUsePlayer.mockReturnValue({ playerId: 'player-1', username: 'Ada', logout });
      const { result } = renderHook(() => useLobby({ onJoinGame: jest.fn() }));

      result.current.onLogout();

      expect(logout).toHaveBeenCalledTimes(1);
    });
  });
});
