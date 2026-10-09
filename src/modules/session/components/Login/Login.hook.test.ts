import { renderHook, act } from '@testing-library/react';
import { useLogin } from './Login.hook';
import type { LoginMode } from './Login.types';

jest.mock('../../player.provider', () => ({
  usePlayer: jest.fn(),
}));

import { usePlayer } from '../../player.provider';

const mockUsePlayer = usePlayer as jest.Mock;

const CLOSED_DIALOG = { open: false, title: '', description: '' };

const USERNAME_TAKEN_DIALOG = {
  open: true,
  title: 'Username Taken',
  description: 'This username is already in use. Please choose a different one.',
};

const SIGN_IN_FAILED_DIALOG = {
  open: true,
  title: 'Sign-In Failed',
  description: 'Could not sign in with Google. Please try again.',
};

/** Player context as the hook reads it. Defaults to a settled guest session (auth resolved, not signed in). */
function mockPlayerContext(overrides: Record<string, unknown> = {}): void {
  mockUsePlayer.mockReturnValue({
    setUsername: jest.fn(),
    signInWithGoogle: jest.fn(),
    isAuthLoading: false,
    isGuest: true,
    ...overrides,
  });
}

describe('useLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initial state and hydration', () => {
    it('initializes with empty name, not loading, hydrated, and a closed error dialog', () => {
      mockPlayerContext();

      const { result } = renderHook(() => useLogin());

      expect(result.current.name).toBe('');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.errorDialog).toEqual(CLOSED_DIALOG);
      expect(result.current.isHydrated).toBe(true);
    });
  });

  describe('mode derivation', () => {
    it.each<[string, { isAuthLoading: boolean; isGuest: boolean }, LoginMode]>([
      ['loading while auth is resolving, even when the stale context says guest', { isAuthLoading: true, isGuest: true }, 'loading'],
      ['loading while auth is resolving, even when the stale context says account', { isAuthLoading: true, isGuest: false }, 'loading'],
      ['guest once auth has resolved without an account', { isAuthLoading: false, isGuest: true }, 'guest'],
      ['account once auth has resolved with a signed-in account', { isAuthLoading: false, isGuest: false }, 'account'],
    ])('returns %s', (_label, authState, expectedMode) => {
      mockPlayerContext(authState);

      const { result } = renderHook(() => useLogin());

      expect(result.current.mode).toBe(expectedMode);
    });

    it('re-derives mode when the player context changes from loading to guest', () => {
      mockPlayerContext({ isAuthLoading: true, isGuest: false });
      const { result, rerender } = renderHook(() => useLogin());
      expect(result.current.mode).toBe('loading');

      mockPlayerContext({ isAuthLoading: false, isGuest: true });
      rerender();

      expect(result.current.mode).toBe('guest');
    });
  });

  describe('onNameChange', () => {
    it('updates the name state', () => {
      mockPlayerContext();

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.onNameChange('Alice');
      });

      expect(result.current.name).toBe('Alice');

      act(() => {
        result.current.onNameChange('Bob');
      });

      expect(result.current.name).toBe('Bob');
    });
  });

  describe('onSubmit', () => {
    it('does not call setUsername for blank name', async () => {
      const mockSetUsername = jest.fn();
      mockPlayerContext({ setUsername: mockSetUsername });

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.onNameChange('');
      });

      await act(async () => {
        await result.current.onSubmit();
      });

      expect(mockSetUsername).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('does not call setUsername for whitespace-only name', async () => {
      const mockSetUsername = jest.fn();
      mockPlayerContext({ setUsername: mockSetUsername });

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.onNameChange('   ');
      });

      await act(async () => {
        await result.current.onSubmit();
      });

      expect(mockSetUsername).not.toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
    });

    it('trims the name before calling setUsername', async () => {
      const mockSetUsername = jest.fn().mockResolvedValue(true);
      mockPlayerContext({ setUsername: mockSetUsername });

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.onNameChange('  Alice  ');
      });

      await act(async () => {
        await result.current.onSubmit();
      });

      expect(mockSetUsername).toHaveBeenCalledWith('Alice');
    });

    it('sets isLoading to false after successful submission', async () => {
      const mockSetUsername = jest.fn().mockResolvedValue(true);
      mockPlayerContext({ setUsername: mockSetUsername });

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.onNameChange('Alice');
      });

      await act(async () => {
        await result.current.onSubmit();
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('keeps the error dialog closed when setUsername resolves true', async () => {
      const mockSetUsername = jest.fn().mockResolvedValue(true);
      mockPlayerContext({ setUsername: mockSetUsername });

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.onNameChange('Alice');
      });

      await act(async () => {
        await result.current.onSubmit();
      });

      expect(result.current.errorDialog).toEqual(CLOSED_DIALOG);
    });

    it('opens the "Username Taken" dialog when setUsername resolves false', async () => {
      const mockSetUsername = jest.fn().mockResolvedValue(false);
      mockPlayerContext({ setUsername: mockSetUsername });

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.onNameChange('Alice');
      });

      await act(async () => {
        await result.current.onSubmit();
      });

      expect(result.current.errorDialog).toEqual(USERNAME_TAKEN_DIALOG);
    });

    it('opens the "Username Taken" dialog and logs the error when setUsername rejects', async () => {
      const testError = new Error('Network error');
      const mockSetUsername = jest.fn().mockRejectedValue(testError);
      mockPlayerContext({ setUsername: mockSetUsername });

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.onNameChange('Alice');
      });

      await act(async () => {
        await result.current.onSubmit();
      });

      expect(result.current.errorDialog).toEqual(USERNAME_TAKEN_DIALOG);
      expect(console.error).toHaveBeenCalledWith('Error logging in:', testError);
    });

    it('sets isLoading to false when setUsername rejects', async () => {
      const mockSetUsername = jest.fn().mockRejectedValue(new Error('Network error'));
      mockPlayerContext({ setUsername: mockSetUsername });

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.onNameChange('Alice');
      });

      await act(async () => {
        await result.current.onSubmit();
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('onGoogleSignIn', () => {
    it('calls signInWithGoogle once and never touches setUsername', async () => {
      const mockSignIn = jest.fn().mockResolvedValue(true);
      const mockSetUsername = jest.fn();
      mockPlayerContext({ signInWithGoogle: mockSignIn, setUsername: mockSetUsername });

      const { result } = renderHook(() => useLogin());

      await act(async () => {
        await result.current.onGoogleSignIn();
      });

      expect(mockSignIn).toHaveBeenCalledTimes(1);
      expect(mockSetUsername).not.toHaveBeenCalled();
    });

    it('success: keeps the error dialog closed and resets isLoading', async () => {
      mockPlayerContext({ signInWithGoogle: jest.fn().mockResolvedValue(true) });

      const { result } = renderHook(() => useLogin());

      await act(async () => {
        await result.current.onGoogleSignIn();
      });

      expect(result.current.errorDialog).toEqual(CLOSED_DIALOG);
      expect(result.current.isLoading).toBe(false);
    });

    it('failure: opens the "Sign-In Failed" dialog when signInWithGoogle resolves false', async () => {
      mockPlayerContext({ signInWithGoogle: jest.fn().mockResolvedValue(false) });

      const { result } = renderHook(() => useLogin());

      await act(async () => {
        await result.current.onGoogleSignIn();
      });

      expect(result.current.errorDialog).toEqual(SIGN_IN_FAILED_DIALOG);
      expect(result.current.isLoading).toBe(false);
    });

    it('sets isLoading to true while the sign-in is pending, then back to false', async () => {
      let resolveSignIn: (value: boolean) => void = () => {};
      const pendingSignIn = new Promise<boolean>((resolve) => {
        resolveSignIn = resolve;
      });
      mockPlayerContext({ signInWithGoogle: jest.fn().mockReturnValue(pendingSignIn) });

      const { result } = renderHook(() => useLogin());

      act(() => {
        void result.current.onGoogleSignIn();
      });
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveSignIn(true);
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('a failed sign-in after a name error replaces the "Username Taken" dialog with "Sign-In Failed"', async () => {
      mockPlayerContext({
        setUsername: jest.fn().mockResolvedValue(false),
        signInWithGoogle: jest.fn().mockResolvedValue(false),
      });

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.onNameChange('Alice');
      });
      await act(async () => {
        await result.current.onSubmit();
      });
      expect(result.current.errorDialog).toEqual(USERNAME_TAKEN_DIALOG);

      await act(async () => {
        await result.current.onGoogleSignIn();
      });

      expect(result.current.errorDialog).toEqual(SIGN_IN_FAILED_DIALOG);
    });
  });

  describe('onNameKeyDown', () => {
    it('calls onSubmit when Enter key is pressed', async () => {
      const mockSetUsername = jest.fn().mockResolvedValue(true);
      mockPlayerContext({ setUsername: mockSetUsername });

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.onNameChange('Alice');
      });

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' }) as unknown as React.KeyboardEvent<HTMLInputElement>;

      await act(async () => {
        result.current.onNameKeyDown(enterEvent);
      });

      expect(mockSetUsername).toHaveBeenCalledWith('Alice');
    });

    it('does not call onSubmit for non-Enter keys', async () => {
      const mockSetUsername = jest.fn().mockResolvedValue(true);
      mockPlayerContext({ setUsername: mockSetUsername });

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.onNameChange('Alice');
      });

      const tabEvent = { key: 'Tab' } as React.KeyboardEvent<HTMLInputElement>;

      await act(async () => {
        result.current.onNameKeyDown(tabEvent);
      });

      expect(mockSetUsername).not.toHaveBeenCalled();
    });
  });

  describe('onErrorDialogOpenChange', () => {
    it('sets the dialog open flag to the provided value', () => {
      mockPlayerContext();

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.onErrorDialogOpenChange(true);
      });

      expect(result.current.errorDialog.open).toBe(true);

      act(() => {
        result.current.onErrorDialogOpenChange(false);
      });

      expect(result.current.errorDialog.open).toBe(false);
    });

    it('closing after a failure keeps the dialog title and description', async () => {
      mockPlayerContext({ signInWithGoogle: jest.fn().mockResolvedValue(false) });

      const { result } = renderHook(() => useLogin());

      await act(async () => {
        await result.current.onGoogleSignIn();
      });

      act(() => {
        result.current.onErrorDialogOpenChange(false);
      });

      expect(result.current.errorDialog).toEqual({ ...SIGN_IN_FAILED_DIALOG, open: false });
    });
  });
});
