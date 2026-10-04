import { renderHook, act } from '@testing-library/react';
import { usePlayerProvider } from './player.hook';

jest.mock('./services/player-session.service', () => ({
  findUsernameOwner: jest.fn(),
  reserveUsername: jest.fn(),
  releaseUsername: jest.fn(),
}));

import * as service from './services/player-session.service';

const mockFindUsernameOwner = service.findUsernameOwner as jest.Mock;
const mockReserveUsername = service.reserveUsername as jest.Mock;
const mockReleaseUsername = service.releaseUsername as jest.Mock;

describe('usePlayerProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('playerId initialization', () => {
    it('loads playerId from localStorage if it exists', () => {
      localStorage.setItem('playerId', 'stored_player_id');

      const { result } = renderHook(() => usePlayerProvider());

      expect(result.current.playerId).toBe('stored_player_id');
    });

    it('creates a new playerId if localStorage is empty', () => {
      const { result } = renderHook(() => usePlayerProvider());

      expect(result.current.playerId).toBeTruthy();
      expect(result.current.playerId).toMatch(/^player_\d+_[a-z0-9]+$/);
    });

    it('stores the created playerId in localStorage', () => {
      const { result } = renderHook(() => usePlayerProvider());

      expect(localStorage.getItem('playerId')).toBe(result.current.playerId);
    });
  });

  describe('validateSession', () => {
    it('sets username when the stored username ownership matches the playerId', async () => {
      localStorage.setItem('playerId', 'player_123');
      localStorage.setItem('username', 'testuser');

      mockFindUsernameOwner.mockResolvedValue('player_123');

      const { result } = renderHook(() => usePlayerProvider());

      // The effect runs and validates the session
      await act(async () => {
        // Wait for the effect to complete
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.username).toBe('testuser');
    });

    it('clears username when the stored username ownership does not match the playerId', async () => {
      localStorage.setItem('playerId', 'player_123');
      localStorage.setItem('username', 'othersuser');

      mockFindUsernameOwner.mockResolvedValue('other_player_id');

      const { result } = renderHook(() => usePlayerProvider());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.username).toBeNull();
      expect(localStorage.getItem('username')).toBeNull();
    });

    it('clears username when the username does not exist in the database', async () => {
      localStorage.setItem('playerId', 'player_123');
      localStorage.setItem('username', 'deleted_user');

      mockFindUsernameOwner.mockResolvedValue(null);

      const { result } = renderHook(() => usePlayerProvider());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.username).toBeNull();
      expect(localStorage.getItem('username')).toBeNull();
    });

    it('clears username on service error', async () => {
      localStorage.setItem('playerId', 'player_123');
      localStorage.setItem('username', 'testuser');

      mockFindUsernameOwner.mockRejectedValue(new Error('Firestore error'));

      const { result } = renderHook(() => usePlayerProvider());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.username).toBeNull();
      expect(localStorage.getItem('username')).toBeNull();
    });
  });

  describe('setUsername', () => {
    it('returns true and reserves the username when it is available', async () => {
      localStorage.setItem('playerId', 'player_123');

      mockFindUsernameOwner.mockResolvedValue(null);
      mockReserveUsername.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlayerProvider());

      let setUsernameResult = false;
      await act(async () => {
        setUsernameResult = await result.current.setUsername('newuser');
      });

      expect(setUsernameResult).toBe(true);
      expect(result.current.username).toBe('newuser');
      expect(mockReserveUsername).toHaveBeenCalledWith('newuser', 'player_123');
    });

    it('returns false when the username is taken by another playerId', async () => {
      localStorage.setItem('playerId', 'player_123');

      mockFindUsernameOwner.mockResolvedValue('other_player_id');

      const { result } = renderHook(() => usePlayerProvider());

      let setUsernameResult = false;
      await act(async () => {
        setUsernameResult = await result.current.setUsername('taken_user');
      });

      expect(setUsernameResult).toBe(false);
      expect(result.current.username).toBeNull();
      expect(mockReserveUsername).not.toHaveBeenCalled();
    });

    it('returns true when re-reserving the same username', async () => {
      localStorage.setItem('playerId', 'player_123');

      mockFindUsernameOwner.mockResolvedValue('player_123');
      mockReserveUsername.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlayerProvider());

      let setUsernameResult = false;
      await act(async () => {
        setUsernameResult = await result.current.setUsername('sameuser');
      });

      expect(setUsernameResult).toBe(true);
      expect(result.current.username).toBe('sameuser');
    });

    it('releases the old username when changing to a new one', async () => {
      localStorage.setItem('playerId', 'player_123');
      localStorage.setItem('username', 'olduser');

      // Mock findUsernameOwner to return the playerId for olduser, then null for newuser
      mockFindUsernameOwner
        .mockResolvedValueOnce('player_123') // for olduser validation
        .mockResolvedValueOnce(null); // for newuser availability check
      mockReserveUsername.mockResolvedValue(undefined);
      mockReleaseUsername.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlayerProvider());

      // Wait for the initial effects to validate olduser
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(result.current.username).toBe('olduser');

      // Now change the username
      await act(async () => {
        await result.current.setUsername('newuser');
      });

      expect(mockReleaseUsername).toHaveBeenCalledWith('olduser');
      expect(result.current.username).toBe('newuser');
    });

    it('does not release the old username when setting the same username', async () => {
      localStorage.setItem('playerId', 'player_123');
      localStorage.setItem('username', 'sameuser');

      mockFindUsernameOwner.mockResolvedValue('player_123');
      mockReserveUsername.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlayerProvider());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      jest.clearAllMocks();

      await act(async () => {
        await result.current.setUsername('sameuser');
      });

      expect(mockReleaseUsername).not.toHaveBeenCalled();
    });

    it('persists the username to localStorage on success', async () => {
      localStorage.setItem('playerId', 'player_123');

      mockFindUsernameOwner.mockResolvedValue(null);
      mockReserveUsername.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlayerProvider());

      await act(async () => {
        await result.current.setUsername('persisteduser');
      });

      expect(localStorage.getItem('username')).toBe('persisteduser');
    });

    it('returns false on service error', async () => {
      localStorage.setItem('playerId', 'player_123');

      mockFindUsernameOwner.mockRejectedValue(new Error('Firestore error'));

      const { result } = renderHook(() => usePlayerProvider());

      let setUsernameResult = false;
      await act(async () => {
        setUsernameResult = await result.current.setUsername('newuser');
      });

      expect(setUsernameResult).toBe(false);
    });
  });

  describe('logout', () => {
    it('releases the username when logged in', async () => {
      localStorage.setItem('playerId', 'player_123');
      localStorage.setItem('username', 'testuser');

      mockFindUsernameOwner.mockResolvedValue('player_123');
      mockReleaseUsername.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlayerProvider());

      // Wait for the initial effects to run and validate the session
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(result.current.username).toBe('testuser');

      // Now call logout
      await act(async () => {
        await result.current.logout();
      });

      expect(mockReleaseUsername).toHaveBeenCalledWith('testuser');
      expect(result.current.username).toBeNull();
      expect(localStorage.getItem('username')).toBeNull();
    });

    it('does nothing if no username is set', async () => {
      localStorage.setItem('playerId', 'player_123');

      const { result } = renderHook(() => usePlayerProvider());

      // Wait for effects to run
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockReleaseUsername).not.toHaveBeenCalled();
    });

    it('clears username from state and localStorage', async () => {
      localStorage.setItem('playerId', 'player_123');
      localStorage.setItem('username', 'testuser');

      mockReleaseUsername.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlayerProvider());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      jest.clearAllMocks();

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.username).toBeNull();
      expect(localStorage.getItem('username')).toBeNull();
    });

    it('handles errors from releaseUsername gracefully', async () => {
      localStorage.setItem('playerId', 'player_123');
      localStorage.setItem('username', 'testuser');

      mockReleaseUsername.mockRejectedValue(new Error('Firestore error'));

      const { result } = renderHook(() => usePlayerProvider());

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      jest.clearAllMocks();

      await act(async () => {
        await expect(result.current.logout()).resolves.not.toThrow();
      });

      // Username should still be cleared despite the error
      expect(result.current.username).toBeNull();
      expect(localStorage.getItem('username')).toBeNull();
    });
  });

  describe('beforeunload listener', () => {
    it('attaches and removes the beforeunload listener', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      localStorage.setItem('playerId', 'player_123');

      const { unmount } = renderHook(() => usePlayerProvider());

      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('calls logout when beforeunload fires (best-effort)', async () => {
      localStorage.setItem('playerId', 'player_123');
      localStorage.setItem('username', 'testuser');

      mockFindUsernameOwner.mockResolvedValue('player_123');
      mockReleaseUsername.mockResolvedValue(undefined);

      const { result } = renderHook(() => usePlayerProvider());

      // Wait for effects to mount and validate session
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Verify the hook initialized with the stored username
      expect(result.current.username).toBe('testuser');

      // Clear mocks after initialization
      jest.clearAllMocks();

      // Simulate beforeunload event
      act(() => {
        const event = new Event('beforeunload');
        window.dispatchEvent(event);
      });

      // The beforeunload handler fires logout(), which is async
      // Give it a chance to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Verify that releaseUsername was called via logout
      expect(mockReleaseUsername).toHaveBeenCalledWith('testuser');
    });
  });
});
