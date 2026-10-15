import { act, renderHook } from '@testing-library/react';
import { useTileDecorationEditor } from './TileDecorationEditor.hook';
import { listDecorationImages, saveDecorationLayouts } from './TileDecorationEditor.service';

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

const SAVED_BADGE_DURATION_MS = 2000;
const TREE_IMAGE = '/sprites/decorations/tree.gif';

describe('useTileDecorationEditor', () => {
  let consoleErrorSpy: jest.SpyInstance | undefined;

  beforeEach(() => {
    idCounter = 0;
    mockListDecorationImages.mockResolvedValue([]);
    mockSaveDecorationLayouts.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleErrorSpy?.mockRestore();
    consoleErrorSpy = undefined;
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

  it('onSelectLayout activates the chosen layout and clears the selected instance', async () => {
    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    act(() => {
      result.current.onScenarioChange('empty');
    });
    act(() => {
      result.current.onSelectInstance('empty-2-default-0');
    });
    act(() => {
      result.current.onSelectLayout('empty-2-alt');
    });

    expect(result.current.activeLayoutId).toBe('empty-2-alt');
    expect(result.current.selectedInstanceId).toBeNull();
    expect(result.current.isDirty).toBe(false);
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

  it('onAddInstance appends a default-positioned instance, selects it and marks isDirty', async () => {
    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    act(() => {
      result.current.onAddInstance(TREE_IMAGE);
    });

    const instances = result.current.layouts[0].instances;
    expect(instances).toHaveLength(3);
    expect(instances[2]).toEqual({
      id: 'base-instance-1',
      image: TREE_IMAGE,
      top: 45,
      left: 45,
      size: 25,
      z: 12,
    });
    expect(result.current.selectedInstanceId).toBe('base-instance-1');
    expect(result.current.isDirty).toBe(true);
  });

  it('onRemoveInstance clears the selection when the removed instance was selected', async () => {
    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    act(() => {
      result.current.onSelectInstance('base-default-0');
    });
    act(() => {
      result.current.onRemoveInstance('base-default-0');
    });

    expect(result.current.layouts[0].instances.map((i) => i.id)).toEqual(['base-default-1']);
    expect(result.current.selectedInstanceId).toBeNull();
    expect(result.current.isDirty).toBe(true);
  });

  it('onRemoveInstance keeps the selection when a different instance is removed', async () => {
    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    act(() => {
      result.current.onSelectInstance('base-default-1');
    });
    act(() => {
      result.current.onRemoveInstance('base-default-0');
    });

    expect(result.current.layouts[0].instances.map((i) => i.id)).toEqual(['base-default-1']);
    expect(result.current.selectedInstanceId).toBe('base-default-1');
  });

  it('canDeleteActiveLayout is false for a sole layout and true once a second layout is added', async () => {
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

  it('onDeleteLayout removes the active layout when several exist, activates the first remaining one and marks isDirty', async () => {
    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    act(() => {
      result.current.onScenarioChange('empty');
    });
    expect(result.current.activeLayoutId).toBe('empty-2-default');

    act(() => {
      result.current.onDeleteLayout();
    });

    expect(result.current.layouts.map((layout) => layout.id)).toEqual(['empty-2-alt']);
    expect(result.current.activeLayoutId).toBe('empty-2-alt');
    expect(result.current.canDeleteActiveLayout).toBe(false);
    expect(result.current.isDirty).toBe(true);
  });

  it('onDuplicateLayout adds a copy with new layout and instance ids, activates it, and leaves the original untouched', async () => {
    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    act(() => {
      result.current.onDuplicateLayout();
    });

    expect(result.current.layouts).toHaveLength(2);
    const copy = result.current.layouts[1];
    expect(copy.id).toBe('base-layout-1');
    expect(copy.name).toBe('Default copy');
    expect(result.current.activeLayoutId).toBe('base-layout-1');
    expect(copy.instances).toEqual([
      { id: 'base-instance-2', image: expect.any(String), top: 36.5, left: 44.5, size: 15, z: 10 },
      { id: 'base-instance-3', image: expect.any(String), top: 37.5, left: 42.5, size: 15, z: 10 },
    ]);
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.onDragInstance('base-instance-2', 90, 90);
    });

    const original = result.current.layouts[0];
    expect(original.id).toBe('base-default');
    expect(original.instances[0]).toEqual(expect.objectContaining({ id: 'base-default-0', top: 36.5, left: 44.5 }));
    expect(result.current.layouts[1].instances[0]).toEqual(
      expect.objectContaining({ id: 'base-instance-2', top: 90, left: 90 }),
    );
  });

  it('onRenameLayout renames the active layout only, keeps its id and marks isDirty', async () => {
    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    act(() => {
      result.current.onRenameLayout('Renamed');
    });

    expect(result.current.layouts[0]).toEqual(expect.objectContaining({ id: 'base-default', name: 'Renamed' }));
    expect(result.current.isDirty).toBe(true);
  });

  it('onSave calls saveDecorationLayouts with the edited config and transitions idle -> saving -> saved, clearing isDirty on success', async () => {
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

    expect(mockSaveDecorationLayouts).toHaveBeenCalledTimes(1);
    const savedConfig = mockSaveDecorationLayouts.mock.calls[0][0];
    expect(savedConfig.base[0]).toEqual(expect.objectContaining({ id: 'base-default' }));
    expect(savedConfig.base[0].instances[0]).toEqual(expect.objectContaining({ id: 'base-default-0', top: 60, left: 70 }));

    await act(async () => {
      resolveSave();
    });

    expect(result.current.status).toBe('saved');
    expect(result.current.isDirty).toBe(false);
  });

  it('onSave keeps isDirty set when an edit lands while the save is in flight', async () => {
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
    act(() => {
      result.current.onSave();
    });
    expect(result.current.status).toBe('saving');

    act(() => {
      result.current.onDragInstance('base-default-0', 80, 90);
    });

    await act(async () => {
      resolveSave();
    });

    expect(result.current.status).toBe('saved');
    expect(result.current.isDirty).toBe(true);
    const instance = result.current.layouts[0].instances.find((i) => i.id === 'base-default-0');
    expect(instance).toEqual(expect.objectContaining({ top: 80, left: 90 }));
  });

  it('returns status from saved to idle exactly 2000ms after a successful save', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    act(() => {
      result.current.onSave();
    });
    await act(async () => {});
    expect(result.current.status).toBe('saved');

    act(() => {
      jest.advanceTimersByTime(SAVED_BADGE_DURATION_MS - 1);
    });
    expect(result.current.status).toBe('saved');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current.status).toBe('idle');
  });

  it('a second successful save cancels the first save\'s revert timer, so status stays saved until 2000ms after the second save', async () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    act(() => {
      result.current.onSave();
    });
    await act(async () => {});
    expect(result.current.status).toBe('saved');

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    act(() => {
      result.current.onSave();
    });
    await act(async () => {});
    expect(result.current.status).toBe('saved');

    // First save's original 2000ms mark is at elapsed 2000; the second save's own mark is at elapsed 3000.
    act(() => {
      jest.advanceTimersByTime(1001);
    });
    expect(result.current.status).toBe('saved');

    act(() => {
      jest.advanceTimersByTime(998);
    });
    expect(result.current.status).toBe('saved');

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current.status).toBe('idle');
  });

  it('onSave transitions idle -> saving -> error, leaves isDirty set and logs the failure when the service rejects', async () => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const saveError = new Error('network error');
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
      rejectSave(saveError);
    });

    expect(result.current.status).toBe('error');
    expect(result.current.isDirty).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save decoration layouts', saveError);
  });

  it('loads images from listDecorationImages on mount', async () => {
    mockListDecorationImages.mockResolvedValue(['/sprites/decorations/pine_tree.gif']);

    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    expect(result.current.images).toEqual(['/sprites/decorations/pine_tree.gif']);
  });

  it('falls back to an empty image list and logs the failure when listDecorationImages rejects', async () => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const listError = new Error('404');
    mockListDecorationImages.mockRejectedValue(listError);

    const { result } = renderHook(() => useTileDecorationEditor());
    await act(async () => {});

    expect(result.current.images).toEqual([]);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to list decoration images', listError);
  });
});
