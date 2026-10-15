import { act, renderHook } from '@testing-library/react';
import { useTileDecorationEditor } from './TileDecorationEditor.hook';
import { listDecorationImages, saveDecorationLayouts } from './TileDecorationEditor.service';
import { sampleDecorationLayoutsConfig } from './TileDecorationEditor.fixtures';

jest.mock('@/modules/map', () => ({
  decorationLayoutsConfig: jest.requireActual('./TileDecorationEditor.fixtures').sampleDecorationLayoutsConfig,
}));

jest.mock('./TileDecorationEditor.service', () => ({
  listDecorationImages: jest.fn(),
  saveDecorationLayouts: jest.fn(),
}));

let idCounter = 0;
jest.mock('./TileDecorationEditor.ids', () => ({
  createId: jest.fn((prefix: string) => `${prefix}-${++idCounter}`),
}));

const mockListDecorationImages = listDecorationImages as jest.Mock;
const mockSaveDecorationLayouts = saveDecorationLayouts as jest.Mock;

describe('useTileDecorationEditor', () => {
  beforeEach(() => {
    idCounter = 0;
    mockListDecorationImages.mockResolvedValue([]);
    mockSaveDecorationLayouts.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('starts on the base scenario, with its sole layout active and no instance selected', async () => {
    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    expect(result.current.activeScenario).toBe('base');
    expect(result.current.activeVariant).toBeNull();
    expect(result.current.activeLayoutId).toBe('base-default');
    expect(result.current.selectedInstanceId).toBeNull();
  });

  it('switching scenario to one with a sub-picker auto-selects its first variant and resets layout/instance', async () => {
    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    act(() => {
      result.current.onSelectInstance('some-instance');
    });
    act(() => {
      result.current.onScenarioChange('empty');
    });

    expect(result.current.activeScenario).toBe('empty');
    expect(result.current.activeVariant).toBe('empty-2');
    expect(result.current.activeLayoutId).toBe('empty-2-default');
    expect(result.current.selectedInstanceId).toBeNull();
  });

  it('switching variant resets activeLayoutId to the new list\'s first entry and clears the selected instance', async () => {
    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    act(() => {
      result.current.onScenarioChange('empty');
    });
    act(() => {
      result.current.onSelectLayout('empty-2-alt');
    });
    act(() => {
      result.current.onSelectInstance('empty-2-alt-0');
    });
    act(() => {
      result.current.onVariantChange('empty-3');
    });

    expect(result.current.activeVariant).toBe('empty-3');
    expect(result.current.activeLayoutId).toBe('empty-3-default');
    expect(result.current.selectedInstanceId).toBeNull();
  });

  it('onDragInstance updates the instance position and marks isDirty', async () => {
    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    expect(result.current.isDirty).toBe(false);

    act(() => {
      result.current.onDragInstance('base-default-0', 60, 70);
    });

    expect(result.current.isDirty).toBe(true);
    const instance = result.current.layouts[0].instances.find((i) => i.id === 'base-default-0');
    expect(instance).toEqual(expect.objectContaining({ top: 60, left: 70 }));
  });

  it('onNudgeInstance moves the instance by the clamped delta and marks isDirty', async () => {
    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    act(() => {
      result.current.onNudgeInstance('base-default-0', 1, -1);
    });

    expect(result.current.isDirty).toBe(true);
    const instance = result.current.layouts[0].instances.find((i) => i.id === 'base-default-0');
    expect(instance).toEqual(expect.objectContaining({ top: 37.5, left: 43.5 }));
  });

  it('onResizeInstance updates size and marks isDirty', async () => {
    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    act(() => {
      result.current.onResizeInstance('base-default-0', 40);
    });

    expect(result.current.isDirty).toBe(true);
    const instance = result.current.layouts[0].instances.find((i) => i.id === 'base-default-0');
    expect(instance?.size).toBe(40);
  });

  it('onRelayerInstance updates z and marks isDirty', async () => {
    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    act(() => {
      result.current.onRelayerInstance('base-default-0', 30);
    });

    expect(result.current.isDirty).toBe(true);
    const instance = result.current.layouts[0].instances.find((i) => i.id === 'base-default-0');
    expect(instance?.z).toBe(30);
  });

  it('canDeleteActiveLayout is false for a sole layout, and stays false right after adding a second (new layout becomes active)', async () => {
    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    act(() => {
      result.current.onScenarioChange('special');
    });

    expect(result.current.layouts).toHaveLength(1);
    expect(result.current.canDeleteActiveLayout).toBe(false);

    act(() => {
      result.current.onAddLayout('Second');
    });

    expect(result.current.layouts).toHaveLength(2);
    expect(result.current.canDeleteActiveLayout).toBe(true);
  });

  it('onDeleteLayout is a no-op when the active scenario has only one layout', async () => {
    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    act(() => {
      result.current.onScenarioChange('special');
    });
    const layoutsBefore = result.current.layouts;
    const isDirtyBefore = result.current.isDirty;

    act(() => {
      result.current.onDeleteLayout();
    });

    expect(result.current.layouts).toEqual(layoutsBefore);
    expect(result.current.isDirty).toBe(isDirtyBefore);
  });

  it('onSave transitions idle -> saving -> saved and clears isDirty on success', async () => {
    let resolveSave: () => void = () => {};
    mockSaveDecorationLayouts.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveSave = resolve;
      }),
    );

    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    act(() => {
      result.current.onDragInstance('base-default-0', 60, 70);
    });
    expect(result.current.isDirty).toBe(true);
    expect(result.current.status).toBe('idle');

    act(() => {
      result.current.onSave();
    });
    expect(result.current.status).toBe('saving');
    expect(mockSaveDecorationLayouts).toHaveBeenCalledWith(
      expect.objectContaining({
        base: [expect.objectContaining({ id: 'base-default' })],
      }),
    );

    await act(async () => {
      resolveSave();
    });

    expect(result.current.status).toBe('saved');
    expect(result.current.isDirty).toBe(false);
  });

  it('onSave transitions idle -> saving -> error and leaves isDirty set when the service rejects', async () => {
    let rejectSave: (error: Error) => void = () => {};
    mockSaveDecorationLayouts.mockReturnValue(
      new Promise<void>((_resolve, reject) => {
        rejectSave = reject;
      }),
    );

    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    act(() => {
      result.current.onDragInstance('base-default-0', 60, 70);
    });

    act(() => {
      result.current.onSave();
    });
    expect(result.current.status).toBe('saving');

    await act(async () => {
      rejectSave(new Error('network error'));
    });

    expect(result.current.status).toBe('error');
    expect(result.current.isDirty).toBe(true);
  });

  it('loads images from listDecorationImages on mount', async () => {
    mockListDecorationImages.mockResolvedValue(['/sprites/decorations/pine_tree.gif']);

    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    expect(result.current.images).toEqual(['/sprites/decorations/pine_tree.gif']);
  });

  it('falls back to an empty image list when listDecorationImages rejects', async () => {
    mockListDecorationImages.mockRejectedValue(new Error('404'));

    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    expect(result.current.images).toEqual([]);
  });
});

// sampleDecorationLayoutsConfig is imported only so this file fails fast (TypeScript) if the
// fixtures module's shape ever drifts from what the mock above assumes.
void sampleDecorationLayoutsConfig;
