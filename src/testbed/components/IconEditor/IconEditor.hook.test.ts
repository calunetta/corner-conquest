import { act, renderHook } from '@testing-library/react';
import type { IconOverridesConfig } from '@/modules/icons';
import { useIconEditor } from './IconEditor.hook';
import { listIconUploads, saveIconOverrides, uploadIconImage } from './IconEditor.service';
import type { IconEditorViewModel } from './IconEditor.types';

// The hook calls structuredClone when it initialises its state; jsdom (this project's test
// environment) does not provide it. Browsers do, so this shim exists only for the test run.
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
}

// The live registry has 56 entries; the hook's behaviour is asserted against the deterministic
// sample instead. Saved overrides start as sampleSavedOverrides: { info: { rotation: 45 } }.
jest.mock('@/modules/icons', () => {
  const fixtures = jest.requireActual('./IconEditor.fixtures');
  return {
    iconRegistry: fixtures.sampleIconRegistry,
    iconOverridesConfig: fixtures.sampleSavedOverrides,
  };
});

jest.mock('./IconEditor.service', () => ({
  listIconUploads: jest.fn(),
  uploadIconImage: jest.fn(),
  saveIconOverrides: jest.fn(),
}));

const mockListIconUploads = listIconUploads as jest.Mock;
const mockUploadIconImage = uploadIconImage as jest.Mock;
const mockSaveIconOverrides = saveIconOverrides as jest.Mock;

const SAVED_BADGE_DURATION_MS = 2000;
const UPLOADED_PATH = '/sprites/icon-overrides/swords-1700000000000.png';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function findIcon(result: { current: IconEditorViewModel }, iconId: string) {
  const icon = result.current.moduleGroups.flatMap((group) => group.icons).find((row) => row.id === iconId);
  if (!icon) throw new Error(`No row for icon ${iconId}`);
  return icon;
}

async function renderEditor() {
  const rendered = renderHook(() => useIconEditor());
  await act(async () => {});
  return rendered;
}

describe('useIconEditor', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockListIconUploads.mockResolvedValue([]);
    mockUploadIconImage.mockResolvedValue(UPLOADED_PATH);
    mockSaveIconOverrides.mockResolvedValue(undefined);
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts loading and stops once listIconUploads resolves', async () => {
      let resolveList!: (images: string[]) => void;
      mockListIconUploads.mockReturnValue(new Promise<string[]>((resolve) => { resolveList = resolve; }));

      const { result } = renderHook(() => useIconEditor());
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolveList([]);
      });
      expect(result.current.isLoading).toBe(false);
    });

    it('stops loading and logs the error when listIconUploads rejects', async () => {
      const failure = new Error('network down');
      mockListIconUploads.mockRejectedValue(failure);

      const { result } = await renderEditor();

      expect(result.current.isLoading).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to list icon uploads', failure);
    });

    it('shows the saved override and no dirty rows or unsaved changes', async () => {
      const { result } = await renderEditor();

      expect(findIcon(result, 'info')).toMatchObject({ rotation: 45, hasSavedOverride: true, isDirty: false });
      expect(findIcon(result, 'swords')).toMatchObject({ rotation: 0, size: 100, hasSavedOverride: false, isDirty: false });
      expect(result.current.isDirty).toBe(false);
      expect(result.current.status).toBe('idle');
    });

    it('groups the registry into modules with overriddenCount from the saved overrides', async () => {
      const { result } = await renderEditor();

      const counts = Object.fromEntries(result.current.moduleGroups.map((group) => [group.module, group.overriddenCount]));
      expect(counts).toEqual({ combat: 0, hud: 1, map: 0 });
    });
  });

  describe('rotation and size', () => {
    it('clamps rotation and marks only that icon dirty', async () => {
      const { result } = await renderEditor();

      act(() => {
        findIcon(result, 'swords').onRotationChange(500);
      });

      expect(findIcon(result, 'swords')).toMatchObject({ rotation: 359, isDirty: true });
      expect(findIcon(result, 'info')).toMatchObject({ rotation: 45, isDirty: false });
      expect(findIcon(result, 'zoom-in')).toMatchObject({ rotation: 0, isDirty: false });
      expect(result.current.isDirty).toBe(true);
    });

    it('clamps size to the 25-200 range and marks only that icon dirty', async () => {
      const { result } = await renderEditor();

      act(() => {
        findIcon(result, 'zoom-in').onSizeChange(10);
      });
      expect(findIcon(result, 'zoom-in')).toMatchObject({ size: 25, isDirty: true });

      act(() => {
        findIcon(result, 'zoom-in').onSizeChange(300);
      });
      expect(findIcon(result, 'zoom-in')).toMatchObject({ size: 200, isDirty: true });
      expect(findIcon(result, 'swords').isDirty).toBe(false);
    });

    it('editing a saved override back to its saved value makes the row clean again', async () => {
      const { result } = await renderEditor();

      act(() => {
        findIcon(result, 'info').onRotationChange(90);
      });
      expect(findIcon(result, 'info').isDirty).toBe(true);

      act(() => {
        findIcon(result, 'info').onRotationChange(45);
      });
      expect(findIcon(result, 'info')).toMatchObject({ rotation: 45, isDirty: false });
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('upload', () => {
    const file = new File(['png-bytes'], 'swords.png', { type: 'image/png' });

    it('sets isUploading while in flight, then clears it and sets the new src', async () => {
      const pending = deferred<string>();
      mockUploadIconImage.mockReturnValue(pending.promise);
      const { result } = await renderEditor();

      act(() => {
        findIcon(result, 'swords').onUpload(file);
      });
      expect(findIcon(result, 'swords')).toMatchObject({ isUploading: true, uploadError: null });
      expect(mockUploadIconImage).toHaveBeenCalledWith('swords', file);

      await act(async () => {
        pending.resolve(UPLOADED_PATH);
      });

      expect(findIcon(result, 'swords')).toMatchObject({
        isUploading: false,
        uploadError: null,
        currentSource: { kind: 'image', src: UPLOADED_PATH },
        isDirty: true,
      });
    });

    it('on failure sets uploadError, clears isUploading and leaves the prior draft untouched', async () => {
      mockUploadIconImage.mockRejectedValue(new Error('Failed to upload icon image: 500'));
      const { result } = await renderEditor();

      act(() => {
        findIcon(result, 'info').onRotationChange(90);
      });
      await act(async () => {
        findIcon(result, 'info').onUpload(file);
      });

      expect(findIcon(result, 'info')).toMatchObject({
        isUploading: false,
        uploadError: 'Failed to upload icon image: 500',
        rotation: 90,
        isDirty: true,
      });
      expect(findIcon(result, 'info').currentSource).toEqual({ kind: 'lucide', name: 'Info' });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to upload icon image', expect.any(Error));
    });

    it('uses a generic message when the rejection is not an Error', async () => {
      mockUploadIconImage.mockRejectedValue('boom');
      const { result } = await renderEditor();

      await act(async () => {
        findIcon(result, 'swords').onUpload(file);
      });

      expect(findIcon(result, 'swords').uploadError).toBe('Upload failed.');
    });
  });

  describe('reset', () => {
    it('removes the icon override entirely and marks the row dirty when a saved override exists', async () => {
      const { result } = await renderEditor();

      act(() => {
        findIcon(result, 'info').onReset();
      });

      expect(findIcon(result, 'info')).toMatchObject({ rotation: 0, size: 100, isDirty: true, hasSavedOverride: true });
      expect(result.current.isDirty).toBe(true);

      await act(async () => {
        result.current.onSave();
      });
      const [sentOverrides] = mockSaveIconOverrides.mock.calls[0] as [IconOverridesConfig];
      expect(sentOverrides).not.toHaveProperty('info');
    });
  });

  describe('save', () => {
    it('sends the whole draft, marks saved rows clean, and shows status "saved"', async () => {
      const { result } = await renderEditor();

      act(() => {
        findIcon(result, 'swords').onRotationChange(90);
      });
      await act(async () => {
        result.current.onSave();
      });

      expect(mockSaveIconOverrides).toHaveBeenCalledWith({ info: { rotation: 45 }, swords: { rotation: 90 } });
      expect(result.current.status).toBe('saved');
      expect(findIcon(result, 'swords')).toMatchObject({ hasSavedOverride: true, isDirty: false });
      expect(findIcon(result, 'info')).toMatchObject({ isDirty: false });
      expect(result.current.isDirty).toBe(false);
    });

    it('returns status to "idle" after the saved-badge duration', async () => {
      jest.useFakeTimers();
      const { result } = await renderEditor();

      await act(async () => {
        result.current.onSave();
      });
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

    it('shows status "saving" while the request is in flight', async () => {
      const pending = deferred<void>();
      mockSaveIconOverrides.mockReturnValue(pending.promise);
      const { result } = await renderEditor();

      act(() => {
        result.current.onSave();
      });
      expect(result.current.status).toBe('saving');

      await act(async () => {
        pending.resolve();
      });
      expect(result.current.status).toBe('saved');
    });

    it('keeps a row edited while the save was in flight dirty after the save resolves', async () => {
      const pending = deferred<void>();
      mockSaveIconOverrides.mockReturnValue(pending.promise);
      const { result } = await renderEditor();

      act(() => {
        findIcon(result, 'swords').onRotationChange(30);
      });
      act(() => {
        result.current.onSave();
      });
      act(() => {
        findIcon(result, 'swords').onRotationChange(60);
      });

      await act(async () => {
        pending.resolve();
      });

      expect(findIcon(result, 'swords')).toMatchObject({ rotation: 60, hasSavedOverride: true, isDirty: true });
      expect(result.current.isDirty).toBe(true);
    });

    it('on failure sets status "error" and leaves the draft untouched', async () => {
      const failure = new Error('Failed to save icon overrides: 500');
      mockSaveIconOverrides.mockRejectedValue(failure);
      const { result } = await renderEditor();

      act(() => {
        findIcon(result, 'swords').onRotationChange(90);
      });
      await act(async () => {
        result.current.onSave();
      });

      expect(result.current.status).toBe('error');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to save icon overrides', failure);
      expect(findIcon(result, 'swords')).toMatchObject({ rotation: 90, hasSavedOverride: false, isDirty: true });
      expect(result.current.isDirty).toBe(true);
    });
  });
});
