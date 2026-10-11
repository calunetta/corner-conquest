import { renderHook, act } from '@testing-library/react';
import { usePlayer } from '../../player.provider';
import { useLinkGoogleAccountButton } from './LinkGoogleAccountButton.hook';

jest.mock('../../player.provider', () => ({ usePlayer: jest.fn() }));

const CLOSED_DIALOG = { open: false, title: '', description: '' };

const ALREADY_LINKED_DESCRIPTION =
  'This Google account is already linked to a different Corner Conquest profile. Sign out and sign in with that Google account instead, or link a different one.';

const LINK_FAILED_DESCRIPTION = 'Could not link your Google account. Please try again.';

const mockLinkWithGoogle = jest.fn();

function firebaseError(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code });
}

function mockPlayerContext(): void {
  jest.mocked(usePlayer).mockReturnValue({ linkWithGoogle: mockLinkWithGoogle } as unknown as ReturnType<
    typeof usePlayer
  >);
}

describe('useLinkGoogleAccountButton', () => {
  beforeEach(() => {
    mockLinkWithGoogle.mockReset().mockResolvedValue(undefined);
    mockPlayerContext();
  });

  it('starts idle with no dialog open', () => {
    const { result } = renderHook(() => useLinkGoogleAccountButton());

    expect(result.current.isLinking).toBe(false);
    expect(result.current.errorDialog).toEqual(CLOSED_DIALOG);
  });

  it('calls linkWithGoogle exactly once per click', async () => {
    const { result } = renderHook(() => useLinkGoogleAccountButton());

    await act(async () => {
      await result.current.onLink();
    });

    expect(mockLinkWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('is linking while the popup promise is pending, and stops once it resolves', async () => {
    let resolveLink: () => void = () => undefined;
    mockLinkWithGoogle.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveLink = resolve;
      }),
    );
    const { result } = renderHook(() => useLinkGoogleAccountButton());

    act(() => {
      void result.current.onLink();
    });
    expect(result.current.isLinking).toBe(true);

    await act(async () => {
      resolveLink();
    });

    expect(result.current.isLinking).toBe(false);
    expect(result.current.errorDialog).toEqual(CLOSED_DIALOG);
  });

  it('opens no dialog when the link resolves (success is shown by the header, not a dialog)', async () => {
    const { result } = renderHook(() => useLinkGoogleAccountButton());

    await act(async () => {
      await result.current.onLink();
    });

    expect(result.current.errorDialog).toEqual(CLOSED_DIALOG);
  });

  it.each(['auth/popup-closed-by-user', 'auth/cancelled-popup-request'])(
    'stays silent when the player cancels the popup (%s)',
    async (code) => {
      mockLinkWithGoogle.mockRejectedValue(firebaseError(code));
      const { result } = renderHook(() => useLinkGoogleAccountButton());

      await act(async () => {
        await result.current.onLink();
      });

      expect(result.current.errorDialog).toEqual(CLOSED_DIALOG);
      expect(result.current.isLinking).toBe(false);
    },
  );

  it('opens the "Account Already Linked" dialog on auth/credential-already-in-use', async () => {
    mockLinkWithGoogle.mockRejectedValue(firebaseError('auth/credential-already-in-use'));
    const { result } = renderHook(() => useLinkGoogleAccountButton());

    await act(async () => {
      await result.current.onLink();
    });

    expect(result.current.errorDialog).toEqual({
      open: true,
      title: 'Account Already Linked',
      description: ALREADY_LINKED_DESCRIPTION,
    });
    expect(result.current.isLinking).toBe(false);
  });

  it.each([
    ['a network failure', firebaseError('auth/network-request-failed')],
    ['an unknown Firebase code', firebaseError('auth/internal-error')],
    ['a plain Error without a code', new Error('boom')],
    ['a thrown null', null],
  ])('opens the "Linking Failed" dialog on %s', async (_label, error) => {
    mockLinkWithGoogle.mockRejectedValue(error);
    const { result } = renderHook(() => useLinkGoogleAccountButton());

    await act(async () => {
      await result.current.onLink();
    });

    expect(result.current.errorDialog).toEqual({
      open: true,
      title: 'Linking Failed',
      description: LINK_FAILED_DESCRIPTION,
    });
  });

  it('closes the open dialog when onErrorDialogOpenChange(false) is called', async () => {
    mockLinkWithGoogle.mockRejectedValue(firebaseError('auth/credential-already-in-use'));
    const { result } = renderHook(() => useLinkGoogleAccountButton());
    await act(async () => {
      await result.current.onLink();
    });

    act(() => {
      result.current.onErrorDialogOpenChange(false);
    });

    expect(result.current.errorDialog.open).toBe(false);
  });

  it('can link again after the error dialog is dismissed', async () => {
    mockLinkWithGoogle.mockRejectedValueOnce(firebaseError('auth/network-request-failed'));
    const { result } = renderHook(() => useLinkGoogleAccountButton());
    await act(async () => {
      await result.current.onLink();
    });
    act(() => {
      result.current.onErrorDialogOpenChange(false);
    });

    await act(async () => {
      await result.current.onLink();
    });

    expect(mockLinkWithGoogle).toHaveBeenCalledTimes(2);
    expect(result.current.isLinking).toBe(false);
  });
});
