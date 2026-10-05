import { renderHook, act } from '@testing-library/react';
import { PlayerColor } from '@/lib/types';
import type { GameSettings } from '@/lib/types';
import { defaultGameSettings } from '@/modules/game-rules';
import { useCreateGameDialog } from './CreateGameDialog.hook';
import type { CreateGameDialogProps } from './CreateGameDialog.types';

const createProps = (overrides: Partial<CreateGameDialogProps> = {}): CreateGameDialogProps => ({
  open: true,
  onOpenChange: jest.fn(),
  onCreateGame: jest.fn().mockResolvedValue(true),
  ...overrides,
});

describe('useCreateGameDialog', () => {
  it('maxPlayers defaults to 4 with debugMode false', () => {
    const { result } = renderHook(() => useCreateGameDialog(createProps()));

    expect(result.current.maxPlayers).toBe(4);
    expect(result.current.debugMode).toBe(false);
  });

  it('flipping maxPlayers to 1 sets debugMode true', () => {
    const { result } = renderHook(() => useCreateGameDialog(createProps()));

    act(() => {
      result.current.onMaxPlayersChange(1);
    });

    expect(result.current.debugMode).toBe(true);
  });

  it('flipping maxPlayers back to another format sets debugMode false', () => {
    const { result } = renderHook(() => useCreateGameDialog(createProps()));

    act(() => {
      result.current.onMaxPlayersChange(1);
    });
    expect(result.current.debugMode).toBe(true);

    act(() => {
      result.current.onMaxPlayersChange(3);
    });

    expect(result.current.debugMode).toBe(false);
  });

  it('onSubmit is a no-op when gameName is blank (invalid input)', async () => {
    const onCreateGame = jest.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useCreateGameDialog(createProps({ onCreateGame })));

    await act(async () => {
      result.current.onSubmit();
      await Promise.resolve();
    });

    expect(onCreateGame).not.toHaveBeenCalled();
  });

  it('onSubmit is a no-op when gameName is only whitespace (invalid input)', async () => {
    const onCreateGame = jest.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useCreateGameDialog(createProps({ onCreateGame })));

    act(() => {
      result.current.onGameNameChange('   ');
    });

    await act(async () => {
      result.current.onSubmit();
      await Promise.resolve();
    });

    expect(onCreateGame).not.toHaveBeenCalled();
  });

  it('onSubmit is a no-op while isCreating is already true', async () => {
    let resolveCreate: (value: boolean) => void = () => undefined;
    const onCreateGame = jest.fn(
      () =>
        new Promise<boolean>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const { result } = renderHook(() => useCreateGameDialog(createProps({ onCreateGame })));

    act(() => {
      result.current.onGameNameChange('My Game');
    });

    act(() => {
      result.current.onSubmit();
    });
    expect(result.current.isCreating).toBe(true);

    act(() => {
      result.current.onSubmit();
    });

    expect(onCreateGame).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCreate(true);
      await Promise.resolve();
    });
  });

  it('onSubmit calls onCreateGame with numBots=0 and debugMode as set, for a multiplayer room', async () => {
    const onCreateGame = jest.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useCreateGameDialog(createProps({ onCreateGame })));

    act(() => {
      result.current.onGameNameChange('Multi Game');
      result.current.onPlayerColorChange(PlayerColor.Red);
    });

    await act(async () => {
      result.current.onSubmit();
      await Promise.resolve();
    });

    expect(onCreateGame).toHaveBeenCalledWith('Multi Game', 4, PlayerColor.Red, 0, false, defaultGameSettings);
  });

  it('onSubmit calls onCreateGame with numBots=1 and fogOfWar=!debugMode for a solo room', async () => {
    const onCreateGame = jest.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useCreateGameDialog(createProps({ onCreateGame })));

    act(() => {
      result.current.onMaxPlayersChange(1);
      result.current.onGameNameChange('Solo Game');
    });
    expect(result.current.debugMode).toBe(true);

    await act(async () => {
      result.current.onSubmit();
      await Promise.resolve();
    });

    const expectedSettings: GameSettings = { ...defaultGameSettings, fogOfWar: false };
    expect(onCreateGame).toHaveBeenCalledWith('Solo Game', 1, PlayerColor.Blue, 1, true, expectedSettings);
  });

  it('a successful create closes the dialog (onOpenChange(false))', async () => {
    const onOpenChange = jest.fn();
    const onCreateGame = jest.fn().mockResolvedValue(true);
    const { result } = renderHook(() => useCreateGameDialog(createProps({ onOpenChange, onCreateGame })));

    act(() => {
      result.current.onGameNameChange('My Game');
    });

    await act(async () => {
      result.current.onSubmit();
      await Promise.resolve();
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(result.current.isCreating).toBe(false);
  });

  it('a failed create does not close the dialog', async () => {
    const onOpenChange = jest.fn();
    const onCreateGame = jest.fn().mockResolvedValue(false);
    const { result } = renderHook(() => useCreateGameDialog(createProps({ onOpenChange, onCreateGame })));

    act(() => {
      result.current.onGameNameChange('My Game');
    });

    await act(async () => {
      result.current.onSubmit();
      await Promise.resolve();
    });

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(result.current.isCreating).toBe(false);
  });

  it('onOpenCustomize opens the settings sheet', () => {
    const { result } = renderHook(() => useCreateGameDialog(createProps()));

    act(() => {
      result.current.onOpenCustomize();
    });

    expect(result.current.isCustomizing).toBe(true);
  });

  it('a settings-save closes the sheet and stores the new settings', () => {
    const { result } = renderHook(() => useCreateGameDialog(createProps()));
    const newSettings: GameSettings = { ...defaultGameSettings, victoryPointGoal: 99 };

    act(() => {
      result.current.onOpenCustomize();
    });
    expect(result.current.isCustomizing).toBe(true);

    act(() => {
      result.current.onSettingsSave(newSettings);
    });

    expect(result.current.isCustomizing).toBe(false);
    expect(result.current.customSettings).toEqual(newSettings);
  });

  it('factionOptions mirrors CreateGameDialog.map.toFactionOptions()', () => {
    const { result } = renderHook(() => useCreateGameDialog(createProps()));

    expect(result.current.factionOptions.length).toBeGreaterThan(0);
    expect(result.current.factionOptions[0].color).toBe(PlayerColor.Blue);
  });

  it('formatOptions mirrors CreateGameDialog.map.toFormatOptions()', () => {
    const { result } = renderHook(() => useCreateGameDialog(createProps()));

    expect(result.current.formatOptions).toHaveLength(4);
    expect(result.current.formatOptions.map((opt) => opt.value)).toEqual([1, 2, 3, 4]);
  });
});
