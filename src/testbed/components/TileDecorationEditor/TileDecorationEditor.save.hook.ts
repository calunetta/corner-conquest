import { useCallback, useEffect, useRef, useState } from 'react';
import type { DecorationLayoutsConfig } from '@/modules/map';
import type { TileVariant, TileVariantsConfig } from '@/modules/map/components/TileVariants/TileVariants.config';
import { saveDecorationLayouts, saveVariantDecorations, SaveConflictError } from './TileDecorationEditor.service';
import type { TileDecorationEditorViewModel } from './TileDecorationEditor.types';

const SAVED_BADGE_DURATION_MS = 2000;

interface SaveArgs {
  config: DecorationLayoutsConfig;
  /** Writes the decorations for whatever is being edited: the default file or one variant. */
  saveTarget: (decorations: DecorationLayoutsConfig) => Promise<void>;
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
        if (error instanceof SaveConflictError) {
          setStatus('conflict');
          return;
        }
        console.error('Failed to save decoration layouts', error);
        setStatus('error');
      });
  }, [config, saveTarget, setIsDirty]);

  return { status, onSave };
}

interface SaveTargetArgs {
  selectedVariant: TileVariant | null;
  layoutsSha: string;
  variantsSha: string;
  setLayoutsSha: (sha: string) => void;
  setVariantsSha: (sha: string) => void;
  setBaseLayouts: (layouts: DecorationLayoutsConfig) => void;
  setTileConfig: (config: TileVariantsConfig) => void;
}

/** Writes the edited decorations to the variant that owns them, or to the default layouts file. */
export function useDecorationSaveTarget({
  selectedVariant,
  layoutsSha,
  variantsSha,
  setLayoutsSha,
  setVariantsSha,
  setBaseLayouts,
  setTileConfig,
}: SaveTargetArgs) {
  return useCallback(
    async (decorations: DecorationLayoutsConfig) => {
      if (selectedVariant) {
        const saved = await saveVariantDecorations(selectedVariant, decorations, variantsSha);
        setTileConfig(saved.config);
        setVariantsSha(saved.sha);
        return;
      }
      const saved = await saveDecorationLayouts(decorations, layoutsSha);
      setBaseLayouts(decorations);
      setLayoutsSha(saved.sha);
    },
    [selectedVariant, variantsSha, layoutsSha, setLayoutsSha, setVariantsSha, setBaseLayouts, setTileConfig],
  );
}
