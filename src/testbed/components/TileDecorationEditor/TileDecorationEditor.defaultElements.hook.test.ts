import { act, renderHook } from '@testing-library/react';
import { useDefaultElementsEditor } from './TileDecorationEditor.defaultElements.hook';
import { saveDefaultElements } from './TileDecorationEditor.service';

jest.mock('./TileDecorationEditor.service', () => ({
  saveDefaultElements: jest.fn(),
}));

const mockSaveDefaultElements = saveDefaultElements as jest.Mock;

describe('useDefaultElementsEditor', () => {
  beforeEach(() => {
    mockSaveDefaultElements.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('starts on the knight row with no slot selected', () => {
    const { result } = renderHook(() => useDefaultElementsEditor());

    expect(result.current.activeRowId).toBe('knight');
    expect(result.current.selectedSlotId).toBeNull();
  });

  it('switching activeRowId clears selectedSlotId', () => {
    const { result } = renderHook(() => useDefaultElementsEditor());

    act(() => {
      result.current.onSelectSlot('br');
    });
    expect(result.current.selectedSlotId).toBe('br');

    act(() => {
      result.current.onSelectRow('boat');
    });

    expect(result.current.activeRowId).toBe('boat');
    expect(result.current.selectedSlotId).toBeNull();
  });

  it('onSave sets status saving then saved on success', async () => {
    let resolveSave: () => void = () => {};
    mockSaveDefaultElements.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSave = resolve;
      }),
    );

    const { result } = renderHook(() => useDefaultElementsEditor());

    act(() => {
      result.current.onSave();
    });

    expect(result.current.status).toBe('saving');
    expect(mockSaveDefaultElements).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSave();
    });

    expect(result.current.status).toBe('saved');
  });

  it('onSave sets status saving then error when the service rejects', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const saveError = new Error('network error');
    let rejectSave: (error: Error) => void = () => {};
    mockSaveDefaultElements.mockReturnValue(
      new Promise<void>((_resolve, reject) => {
        rejectSave = reject;
      }),
    );

    const { result } = renderHook(() => useDefaultElementsEditor());

    act(() => {
      result.current.onSave();
    });
    expect(result.current.status).toBe('saving');

    await act(async () => {
      rejectSave(saveError);
    });

    expect(result.current.status).toBe('error');
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save default elements', saveError);
    consoleErrorSpy.mockRestore();
  });

  it('an edit made while a save is in flight keeps isDirty true after it resolves', async () => {
    let resolveSave: () => void = () => {};
    mockSaveDefaultElements.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSave = resolve;
      }),
    );

    const { result } = renderHook(() => useDefaultElementsEditor());

    act(() => {
      result.current.onNudgeSlot('br', 1, 0);
    });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.onSave();
    });
    expect(result.current.status).toBe('saving');

    act(() => {
      result.current.onNudgeSlot('br', 1, 0);
    });

    await act(async () => {
      resolveSave();
    });

    expect(result.current.status).toBe('saved');
    expect(result.current.isDirty).toBe(true);
  });
});
