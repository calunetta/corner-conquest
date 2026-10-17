'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_FOG_TIMING, type FogTiming } from './TileFog.config';
import { loadTimingDefaults, saveTimingDefaults, type SavedTiming } from './TileFog.preview.api';
import type { Status } from './TileFog.preview.status';

/**
 * The lab's timing, kept in step with the saved file. Each save sends the sha it loaded, so a copy that
 * changed elsewhere is never overwritten silently: the lab shows the newer version instead.
 */
export function useSavedFogTiming(setStatus: (status: Status) => void) {
  const [timing, setTiming] = useState<FogTiming>(DEFAULT_FOG_TIMING);
  const [baseSha, setBaseSha] = useState<string | null>(null);

  const applySaved = (saved: SavedTiming) => {
    setTiming(saved.timing);
    setBaseSha(saved.sha);
  };

  useEffect(() => {
    let isCurrent = true;
    loadTimingDefaults().then((result) => {
      if (!isCurrent) return;
      if (result.ok) applySaved(result.value);
      else setStatus({ kind: 'error', message: `Could not load saved timing: ${result.message}` });
    });
    return () => {
      isCurrent = false;
    };
    // Loaded once when the lab opens; each save refreshes the sha itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (baseSha === null) {
      setStatus({ kind: 'error', message: 'Saved timing is still loading. Try again in a moment.' });
      return;
    }
    setStatus({ kind: 'busy' });
    const result = await saveTimingDefaults(timing, baseSha);

    if (result.ok) {
      setStatus({
        kind: 'ok',
        message: result.pullRequestUrl ? `Timing sent to a pull request: ${result.pullRequestUrl}` : 'Timing saved as defaults.',
      });
      const refreshed = await loadTimingDefaults();
      if (refreshed.ok) applySaved(refreshed.value);
      return;
    }

    if (result.conflict && result.newer) applySaved(result.newer);
    setStatus({
      kind: 'error',
      message: result.conflict
        ? `${result.message} Your slider values were not saved; the newer version is loaded, re-apply and save again.`
        : result.message,
    });
  };

  return { timing, setTiming, save };
}
