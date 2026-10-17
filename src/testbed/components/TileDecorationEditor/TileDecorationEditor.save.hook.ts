import { useCallback, useEffect, useRef, useState } from 'react';
import type { DecorationLayoutsConfig } from '@/modules/map';
import type { TileDecorationEditorViewModel } from './TileDecorationEditor.types';

const SAVED_BADGE_DURATION_MS = 2000;

interface SaveArgs {
  config: DecorationLayoutsConfig;
  /** Writes the decorations for whatever is being edited: the default file or one variant. */
  saveTarget: (decorations: DecorationLayoutsConfig) => Promise<unknown>;
  setIsDirty: (dirty: boolean) => void;
}

/** Saves the edited decorations and shows the saved/error badge for a short while. */
export function useDecorationSave({ config, saveTarget, setIsDirty }: SaveArgs) {
  const [status, setStatus] = useState<TileDecorationEditorViewModel['status']>('idle');
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestConfigRef = useRef(config);

  useEffect(() => {
    latestConfigRef.current = config;
  }, [config]);

  useEffect(() => () => {
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
  }, []);

  const onSave = useCallback(() => {
    const savedConfig = config;
    setStatus('saving');
    saveTarget(savedConfig)
      .then(() => {
        // An edit made while the request was in flight is not in savedConfig, so the editor must stay dirty.
        if (latestConfigRef.current === savedConfig) setIsDirty(false);
        setStatus('saved');
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => setStatus('idle'), SAVED_BADGE_DURATION_MS);
      })
      .catch((error: unknown) => {
        console.error('Failed to save decoration layouts', error);
        setStatus('error');
      });
  }, [config, saveTarget, setIsDirty]);

  return { status, onSave };
}
