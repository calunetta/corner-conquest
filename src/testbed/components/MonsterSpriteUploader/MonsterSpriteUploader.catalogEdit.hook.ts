import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toCatalogEntryKey } from '@/modules/game-rules';
import type { MonsterCatalogEntry } from '@/modules/game-rules';
import { AddMonsterError, deleteMonster, loadCatalog, updateMonster, type CatalogSnapshot } from './MonsterSpriteUploader.service';
import type { CatalogEdit, CatalogRemoval } from './MonsterSpriteUploader.types';

export interface CatalogEditState {
  pendingCatalogKey: string | null;
  catalogEditError: string | null;
  /** Key of the row whose remove is waiting for confirmation, or null. */
  removeArmedKey: string | null;
  onCatalogEdit: (edit: CatalogEdit) => void;
  onArmRemove: (removal: CatalogRemoval | null) => void;
  onCatalogRemove: (removal: CatalogRemoval) => void;
}

/**
 * Loads the saved catalog and applies level/Boss edits and removals of uploaded rows. Each change sends the
 * sha of the catalog the editor holds; a change made elsewhere is refused, and the newer list is loaded instead.
 */
export function useCatalogEdit(setCatalog: Dispatch<SetStateAction<MonsterCatalogEntry[]>>) {
  const [catalogSha, setCatalogSha] = useState<string | null>(null);
  const [pendingCatalogKey, setPendingCatalogKey] = useState<string | null>(null);
  const [catalogEditError, setCatalogEditError] = useState<string | null>(null);
  const [removeArmedKey, setRemoveArmedKey] = useState<string | null>(null);

  const applySnapshot = (snapshot: CatalogSnapshot): void => {
    setCatalog(snapshot.entries);
    setCatalogSha(snapshot.sha);
  };

  useEffect(() => {
    let isCurrent = true;
    loadCatalog()
      .then((snapshot) => {
        if (isCurrent) applySnapshot(snapshot);
      })
      .catch((error: unknown) => {
        if (isCurrent) setCatalogEditError(`Could not load the saved catalog: ${error instanceof Error ? error.message : String(error)}`);
      });
    return () => {
      isCurrent = false;
    };
    // Loaded once when the uploader opens; each change returns the new sha.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runRequest = (rowKey: string, request: Promise<void>): void => {
    setPendingCatalogKey(rowKey);
    setCatalogEditError(null);
    request
      .catch((error: unknown) => {
        if (error instanceof AddMonsterError) {
          if (error.newer) applySnapshot(error.newer);
          setCatalogEditError(error.newer ? `${error.message} Your change was not saved.` : error.message);
          return;
        }
        setCatalogEditError('Could not update — see console.');
        console.error(error);
      })
      .finally(() => setPendingCatalogKey(null));
  };

  const onCatalogEdit = (edit: CatalogEdit): void => {
    if (pendingCatalogKey !== null || catalogSha === null) return;
    const rowKey = toCatalogEntryKey(edit.name, edit.level);
    runRequest(
      rowKey,
      updateMonster(edit, catalogSha).then((saved) => applySnapshot(saved)),
    );
  };

  const onCatalogRemove = (removal: CatalogRemoval): void => {
    if (pendingCatalogKey !== null || catalogSha === null) return;
    setRemoveArmedKey(null);
    runRequest(
      toCatalogEntryKey(removal.name, removal.level),
      deleteMonster(removal, catalogSha).then((saved) => applySnapshot(saved)),
    );
  };

  const onArmRemove = (removal: CatalogRemoval | null): void =>
    setRemoveArmedKey(removal ? toCatalogEntryKey(removal.name, removal.level) : null);

  const state: CatalogEditState = { pendingCatalogKey, catalogEditError, removeArmedKey, onCatalogEdit, onArmRemove, onCatalogRemove };
  return { ...state, catalogSha, applySnapshot };
}
