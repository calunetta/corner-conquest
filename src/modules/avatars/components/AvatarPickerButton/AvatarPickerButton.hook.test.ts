import { renderHook, act } from '@testing-library/react';
import { usePlayer } from '@/modules/session';
import { AVATAR_SAVE_ERROR, useAvatarPickerButton } from './AvatarPickerButton.hook';

jest.mock('@/modules/session');

const mockUsePlayer = usePlayer as jest.Mock;

describe('useAvatarPickerButton', () => {
  const setAvatarId = jest.fn();

  beforeEach(() => {
    setAvatarId.mockReset().mockResolvedValue(true);
    mockUsePlayer.mockReset().mockReturnValue({ avatarId: null, setAvatarId });
  });

  it('starts closed, idle, without error and without a current avatar', () => {
    const { result } = renderHook(() => useAvatarPickerButton());

    expect(result.current.currentAvatarId).toBeNull();
    expect(result.current.isDialogOpen).toBe(false);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.saveError).toBeNull();
    expect(result.current.cells).toHaveLength(25);
    expect(result.current.cells.some((cell) => cell.isSelected)).toBe(false);
  });

  it('exposes the stored avatar as current and selected cell', () => {
    mockUsePlayer.mockReturnValue({ avatarId: 'human-07', setAvatarId });
    const { result } = renderHook(() => useAvatarPickerButton());

    expect(result.current.currentAvatarId).toBe('human-07');
    expect(result.current.cells.filter((cell) => cell.isSelected).map((cell) => cell.id)).toEqual(['human-07']);
  });

  it('opens and closes the dialog through onOpenChange', () => {
    const { result } = renderHook(() => useAvatarPickerButton());

    act(() => result.current.onOpenChange(true));
    expect(result.current.isDialogOpen).toBe(true);

    act(() => result.current.onOpenChange(false));
    expect(result.current.isDialogOpen).toBe(false);
  });

  it('onSelect saves through usePlayer().setAvatarId with the chosen id', async () => {
    const { result } = renderHook(() => useAvatarPickerButton());

    await act(async () => {
      await result.current.onSelect('human-05');
    });

    expect(setAvatarId).toHaveBeenCalledTimes(1);
    expect(setAvatarId).toHaveBeenCalledWith('human-05');
    expect(result.current.saveError).toBeNull();
    expect(result.current.isSaving).toBe(false);
  });

  it('sets isSaving while the save is in flight and clears it afterwards', async () => {
    let resolveSave: (didSave: boolean) => void = () => undefined;
    setAvatarId.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveSave = resolve;
        }),
    );
    const { result } = renderHook(() => useAvatarPickerButton());

    act(() => {
      void result.current.onSelect('human-02');
    });
    expect(result.current.isSaving).toBe(true);

    await act(async () => {
      resolveSave(true);
    });
    expect(result.current.isSaving).toBe(false);
  });

  it('sets AVATAR_SAVE_ERROR when the save returns false', async () => {
    setAvatarId.mockResolvedValue(false);
    const { result } = renderHook(() => useAvatarPickerButton());

    await act(async () => {
      await result.current.onSelect('human-05');
    });

    expect(AVATAR_SAVE_ERROR).toBe("Couldn't save your avatar. Try again.");
    expect(result.current.saveError).toBe(AVATAR_SAVE_ERROR);
    expect(result.current.isSaving).toBe(false);
  });

  it('clears a previous error when a new save starts and succeeds', async () => {
    setAvatarId.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const { result } = renderHook(() => useAvatarPickerButton());

    await act(async () => {
      await result.current.onSelect('human-05');
    });
    expect(result.current.saveError).toBe(AVATAR_SAVE_ERROR);

    await act(async () => {
      await result.current.onSelect('human-06');
    });
    expect(result.current.saveError).toBeNull();
  });

  it('closing the dialog clears the error', async () => {
    setAvatarId.mockResolvedValue(false);
    const { result } = renderHook(() => useAvatarPickerButton());
    act(() => result.current.onOpenChange(true));
    await act(async () => {
      await result.current.onSelect('human-05');
    });
    expect(result.current.saveError).toBe(AVATAR_SAVE_ERROR);

    act(() => result.current.onOpenChange(false));

    expect(result.current.saveError).toBeNull();
  });

  it('opening the dialog keeps an existing error', async () => {
    setAvatarId.mockResolvedValue(false);
    const { result } = renderHook(() => useAvatarPickerButton());
    await act(async () => {
      await result.current.onSelect('human-05');
    });

    act(() => result.current.onOpenChange(true));

    expect(result.current.saveError).toBe(AVATAR_SAVE_ERROR);
  });

  it('keeps the dialog open after a failed save (returns false)', async () => {
    setAvatarId.mockResolvedValue(false);
    const { result } = renderHook(() => useAvatarPickerButton());
    act(() => result.current.onOpenChange(true));

    await act(async () => {
      await result.current.onSelect('human-05');
    });

    expect(result.current.isDialogOpen).toBe(true);
  });

  it('when setAvatarId rejects: sets AVATAR_SAVE_ERROR, resets isSaving, keeps the dialog open', async () => {
    setAvatarId.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useAvatarPickerButton());
    act(() => result.current.onOpenChange(true));

    await act(async () => {
      await result.current.onSelect('human-05');
    });

    expect(result.current.saveError).toBe(AVATAR_SAVE_ERROR);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.isDialogOpen).toBe(true);
  });
});
