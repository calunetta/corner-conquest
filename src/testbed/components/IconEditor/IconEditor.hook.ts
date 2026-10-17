import { useCallback, useEffect, useRef, useState } from 'react';
import { iconOverridesConfig, iconRegistry } from '@/modules/icons';
import type { IconOverridesConfig } from '@/modules/icons';
import { clampRotation, clampSize, toModuleGroups } from './IconEditor.map';
import { listIconUploads, saveIconOverrides, uploadIconImage } from './IconEditor.service';
import type { IconEditorStatus, IconEditorViewModel, IconRowHandlers, IconUploadState } from './IconEditor.types';

const SAVED_BADGE_DURATION_MS = 2000;

/** Adapts the icon registry and overrides config into the editor's view model: per-icon
 *  rotation/size/upload/reset handlers, derived dirty state (no previous-config ref needed —
 *  see plan.md's Decisions), and the global save. */
export function useIconEditor(): IconEditorViewModel {
  const [isLoading, setIsLoading] = useState(true);
  const [savedOverrides, setSavedOverrides] = useState<IconOverridesConfig>(() => structuredClone(iconOverridesConfig));
  const [draftOverrides, setDraftOverrides] = useState<IconOverridesConfig>(() => structuredClone(iconOverridesConfig));
  const [uploadStates, setUploadStates] = useState<Record<string, IconUploadState>>({});
  const [status, setStatus] = useState<IconEditorStatus>('idle');
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listIconUploads()
      .then(() => setIsLoading(false))
      .catch((error: unknown) => {
        console.error('Failed to list icon uploads', error);
        setIsLoading(false);
      });
  }, []);

  useEffect(() => () => {
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
  }, []);

  const onRotationChange = useCallback((iconId: string, rotation: number) => {
    setDraftOverrides((previous) => ({
      ...previous,
      [iconId]: { ...previous[iconId], rotation: clampRotation(rotation) },
    }));
  }, []);

  const onSizeChange = useCallback((iconId: string, size: number) => {
    setDraftOverrides((previous) => ({
      ...previous,
      [iconId]: { ...previous[iconId], size: clampSize(size) },
    }));
  }, []);

  const onUpload = useCallback((iconId: string, file: File) => {
    setUploadStates((previous) => ({ ...previous, [iconId]: { isUploading: true, error: null } }));

    uploadIconImage(iconId, file)
      .then((path) => {
        setUploadStates((previous) => ({ ...previous, [iconId]: { isUploading: false, error: null } }));
        setDraftOverrides((previous) => ({ ...previous, [iconId]: { ...previous[iconId], src: path } }));
      })
      .catch((error: unknown) => {
        console.error('Failed to upload icon image', error);
        const message = error instanceof Error ? error.message : 'Upload failed.';
        setUploadStates((previous) => ({ ...previous, [iconId]: { isUploading: false, error: message } }));
      });
  }, []);

  const onReset = useCallback((iconId: string) => {
    setDraftOverrides((previous) => {
      const next = { ...previous };
      delete next[iconId];
      return next;
    });
  }, []);

  const onSave = useCallback(() => {
    const overridesToSave = draftOverrides;
    setStatus('saving');

    saveIconOverrides(overridesToSave)
      .then(() => {
        setSavedOverrides(overridesToSave);
        setStatus('saved');
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => setStatus('idle'), SAVED_BADGE_DURATION_MS);
      })
      .catch((error: unknown) => {
        console.error('Failed to save icon overrides', error);
        setStatus('error');
      });
  }, [draftOverrides]);

  const makeHandlers = useCallback(
    (iconId: string): IconRowHandlers => ({
      onRotationChange: (rotation) => onRotationChange(iconId, rotation),
      onSizeChange: (size) => onSizeChange(iconId, size),
      onUpload: (file) => onUpload(iconId, file),
      onReset: () => onReset(iconId),
    }),
    [onRotationChange, onSizeChange, onUpload, onReset],
  );

  const moduleGroups = toModuleGroups(iconRegistry, draftOverrides, savedOverrides, uploadStates, makeHandlers);
  const isDirty = moduleGroups.some((group) => group.icons.some((icon) => icon.isDirty));

  return { isLoading, moduleGroups, isDirty, status, onSave };
}
