import { useEffect, useState } from 'react';
import { loadDecorationLayouts, loadTileVariants } from './TileDecorationEditor.service';
import type { DecorationSnapshots } from './TileDecorationEditor.hook';

type SnapshotsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; value: DecorationSnapshots };

/** Loads the saved decoration layouts and tile variants once, with the shas the editor's saves send back. */
export function useDecorationSnapshots(): SnapshotsState {
  const [state, setState] = useState<SnapshotsState>({ status: 'loading' });

  useEffect(() => {
    let isCurrent = true;
    Promise.all([loadDecorationLayouts(), loadTileVariants()])
      .then(([layouts, variants]) => {
        if (isCurrent) setState({ status: 'ready', value: { layouts, variants } });
      })
      .catch((error: unknown) => {
        if (isCurrent) setState({ status: 'error', message: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      isCurrent = false;
    };
  }, []);

  return state;
}
