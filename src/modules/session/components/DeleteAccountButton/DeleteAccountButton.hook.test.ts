import { act, renderHook } from '@testing-library/react';
import { usePlayer } from '../../player.provider';
import { deleteAccount } from '../../services/account.service';
import { useDeleteAccountButton } from './DeleteAccountButton.hook';

jest.mock('../../player.provider', () => ({ usePlayer: jest.fn() }));
jest.mock('../../services/account.service', () => ({ deleteAccount: jest.fn() }));

const USERNAME = 'alice';
const RECENT_LOGIN_MESSAGE =
  'Your account data was removed, but sign-in could not be fully deleted because your session is too old. Reload the page and try again.';
const CANCELLED_POPUP_MESSAGE =
  'Google sign-in was cancelled. Your account data was removed, but the sign-in itself was not deleted. Try again to finish.';
const GENERIC_MESSAGE = 'Could not delete your account. Please try again.';

function firebaseError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code });
}

describe('useDeleteAccountButton', () => {
  beforeEach(() => {
    jest.mocked(deleteAccount).mockReset().mockResolvedValue(undefined);
    jest.mocked(usePlayer).mockReturnValue({ username: USERNAME } as unknown as ReturnType<typeof usePlayer>);
  });

  it('starts closed on the confirm view', () => {
    const { result } = renderHook(() => useDeleteAccountButton());

    expect(result.current.isDialogOpen).toBe(false);
    expect(result.current.view).toBe('confirm');
  });

  it('opens the dialog and resets a previous error back to confirm', async () => {
    jest.mocked(deleteAccount).mockRejectedValue(firebaseError('auth/other'));
    const { result } = renderHook(() => useDeleteAccountButton());
    await act(async () => {
      await result.current.onConfirmDelete();
    });
    expect(result.current.view).toBe('error');

    act(() => result.current.onOpenChange(false));
    act(() => result.current.onOpenChange(true));

    expect(result.current.isDialogOpen).toBe(true);
    expect(result.current.view).toBe('confirm');
  });

  it('shows deleting while pending, calls deleteAccount with the username, then closes on success', async () => {
    let resolveDelete: () => void = () => undefined;
    jest.mocked(deleteAccount).mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDelete = resolve;
      }),
    );
    const { result } = renderHook(() => useDeleteAccountButton());
    act(() => result.current.onOpenChange(true));

    act(() => {
      void result.current.onConfirmDelete();
    });
    expect(result.current.view).toBe('deleting');
    expect(deleteAccount).toHaveBeenCalledWith(USERNAME);

    await act(async () => {
      resolveDelete();
    });

    expect(result.current.isDialogOpen).toBe(false);
  });

  it.each([
    ['auth/requires-recent-login', RECENT_LOGIN_MESSAGE],
    ['auth/popup-closed-by-user', CANCELLED_POPUP_MESSAGE],
    ['auth/cancelled-popup-request', CANCELLED_POPUP_MESSAGE],
    ['auth/unknown', GENERIC_MESSAGE],
  ])('maps %s to the error view with its message', async (code, message) => {
    jest.mocked(deleteAccount).mockRejectedValue(firebaseError(code));
    const { result } = renderHook(() => useDeleteAccountButton());
    act(() => result.current.onOpenChange(true));

    await act(async () => {
      await result.current.onConfirmDelete();
    });

    expect(result.current.view).toBe('error');
    expect(result.current.errorMessage).toBe(message);
    expect(result.current.isDialogOpen).toBe(true);
  });

  it('uses the generic message for an error without a code', async () => {
    jest.mocked(deleteAccount).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useDeleteAccountButton());

    await act(async () => {
      await result.current.onConfirmDelete();
    });

    expect(result.current.errorMessage).toBe(GENERIC_MESSAGE);
  });

  it('ignores onOpenChange while deleting', () => {
    jest.mocked(deleteAccount).mockReturnValue(new Promise<void>(() => undefined));
    const { result } = renderHook(() => useDeleteAccountButton());
    act(() => result.current.onOpenChange(true));
    act(() => {
      void result.current.onConfirmDelete();
    });

    act(() => result.current.onOpenChange(false));

    expect(result.current.isDialogOpen).toBe(true);
    expect(result.current.view).toBe('deleting');
  });
});
