'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_TILE_VARIANTS_CONFIG, type TileVariantsConfig } from '@/modules/map/components/TileVariants/TileVariants.config';
import { loadConfig, type ApiResult, type ConfigResult, type ConfigSnapshot } from './TileVariantEditor.api';

/**
 * The variant config as the live file has it. Every change sends the sha the editor loaded, so a change made
 * elsewhere is never overwritten: the editor reloads the newer config and reports that the change was not saved.
 */
export function useSavedVariantConfig(report: (message: string) => void) {
  const [config, setConfig] = useState<TileVariantsConfig>(DEFAULT_TILE_VARIANTS_CONFIG);
  const [sha, setSha] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const applySnapshot = (snapshot: ConfigSnapshot) => {
    setConfig(snapshot.config);
    setSha(snapshot.sha);
  };

  const reloadSaved = async () => {
    const result = await loadConfig();
    if (result.ok) applySnapshot(result.value);
    else report(`Could not load the saved variants: ${result.message}`);
  };

  useEffect(() => {
    let isCurrent = true;
    loadConfig().then((result) => {
      if (!isCurrent) return;
      if (result.ok) applySnapshot(result.value);
      else report(`Could not load the saved variants: ${result.message}`);
    });
    return () => {
      isCurrent = false;
    };
    // Loaded once when the editor opens; each save returns the new sha.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Runs one config change against the sha the editor holds. `onSaved` gets the pull request link, if any. */
  const changeConfig = async (
    action: (baseSha: string) => Promise<ConfigResult>,
    onSaved: (pullRequestUrl: string | null) => void,
  ) => {
    if (sha === null) {
      report('The variants are still loading. Try again in a moment.');
      return;
    }
    setBusy(true);
    const result = await action(sha);
    setBusy(false);

    if (result.ok) {
      applySnapshot(result.value);
      onSaved(result.value.pullRequestUrl);
      return;
    }
    if (result.newer) applySnapshot(result.newer);
    report(result.newer ? `${result.message} Your change was not saved.` : result.message);
  };

  /** Runs a picture upload or delete, then reloads the saved config so its sha stays current. */
  const changePicture = async <T,>(action: () => Promise<ApiResult<T>>, onDone: (value: T) => void) => {
    setBusy(true);
    const result = await action();
    if (result.ok) await reloadSaved();
    setBusy(false);
    if (result.ok) onDone(result.value);
    else report(result.message);
  };

  return { config, busy, changeConfig, changePicture };
}
