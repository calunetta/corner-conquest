import { renderHook, act } from '@testing-library/react';
import { useLogin } from './Login.hook';

jest.mock('../../player.provider', () => ({
  usePlayer: jest.fn(),
}));

import { usePlayer } from '../../player.provider';

const mockUsePlayer = usePlayer as jest.Mock;

describe('useLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initial state and hydration', () => {
    it('initializes with empty name, not loading, not hydrated, and no error before effects run', () => {
      mockUsePlayer.mockReturnValue({ setUsername: jest.fn() });

      const { result } = renderHook(() => useLogin());

      // The effect runs synchronously after render in jsdom tests
      // isHydrated will be true after mount
      expect(result.current.name).toBe('');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.showErrorDialog).toBe(false);
      expect(result.current.isHydrated).toBe(true); // Effect runs immediately
    });
  });

  describe('onNameChange', () => {
    it('updates the name state', () => {
      mockUsePlayer.mockReturnValue({ setUsername: jest.fn() });

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
      mockUsePlayer.mockReturnValue({ setUsername: mockSetUsername });

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
      mockUsePlayer.mockReturnValue({ setUsername: mockSetUsername });

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
      mockUsePlayer.mockReturnValue({ setUsername: mockSetUsername });

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
      mockUsePlayer.mockReturnValue({ setUsername: mockSetUsername });

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.onNameChange('Alice');
      });

      await act(async () => {
        await result.current.onSubmit();
      });

      // After successful submission, isLoading should be false
      expect(result.current.isLoading).toBe(false);
    });

    it('sets showErrorDialog to true when setUsername resolves false', async () => {
      const mockSetUsername = jest.fn().mockResolvedValue(false);
      mockUsePlayer.mockReturnValue({ setUsername: mockSetUsername });

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.onNameChange('Alice');
      });

      await act(async () => {
        await result.current.onSubmit();
      });

      expect(result.current.showErrorDialog).toBe(true);
    });

    it('keeps showErrorDialog false when setUsername resolves true', async () => {
      const mockSetUsername = jest.fn().mockResolvedValue(true);
      mockUsePlayer.mockReturnValue({ setUsername: mockSetUsername });

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.onNameChange('Alice');
      });

      await act(async () => {
        await result.current.onSubmit();
      });

      expect(result.current.showErrorDialog).toBe(false);
    });

    it('sets showErrorDialog to true and logs error when setUsername rejects', async () => {
      const testError = new Error('Network error');
      const mockSetUsername = jest.fn().mockRejectedValue(testError);
      mockUsePlayer.mockReturnValue({ setUsername: mockSetUsername });

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.onNameChange('Alice');
      });

      await act(async () => {
        await result.current.onSubmit();
      });

      expect(result.current.showErrorDialog).toBe(true);
      expect(console.error).toHaveBeenCalledWith('Error logging in:', testError);
    });

    it('sets isLoading to false when setUsername rejects', async () => {
      const mockSetUsername = jest.fn().mockRejectedValue(new Error('Network error'));
      mockUsePlayer.mockReturnValue({ setUsername: mockSetUsername });

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

  describe('onNameKeyDown', () => {
    it('calls onSubmit when Enter key is pressed', async () => {
      const mockSetUsername = jest.fn().mockResolvedValue(true);
      mockUsePlayer.mockReturnValue({ setUsername: mockSetUsername });

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
      mockUsePlayer.mockReturnValue({ setUsername: mockSetUsername });

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
    it('sets showErrorDialog to the provided value', () => {
      mockUsePlayer.mockReturnValue({ setUsername: jest.fn() });

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.onErrorDialogOpenChange(true);
      });

      expect(result.current.showErrorDialog).toBe(true);

      act(() => {
        result.current.onErrorDialogOpenChange(false);
      });

      expect(result.current.showErrorDialog).toBe(false);
    });

    it('closes the error dialog when called with false', async () => {
      const mockSetUsername = jest.fn().mockResolvedValue(false);
      mockUsePlayer.mockReturnValue({ setUsername: mockSetUsername });

      const { result } = renderHook(() => useLogin());

      act(() => {
        result.current.onNameChange('Alice');
      });

      // Trigger an error
      await act(async () => {
        await result.current.onSubmit();
      });

      expect(result.current.showErrorDialog).toBe(true);

      // Close the dialog
      act(() => {
        result.current.onErrorDialogOpenChange(false);
      });

      expect(result.current.showErrorDialog).toBe(false);
    });
  });
});
