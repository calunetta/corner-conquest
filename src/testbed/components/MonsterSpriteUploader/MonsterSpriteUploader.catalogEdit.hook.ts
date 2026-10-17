import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toCatalogEntryKey } from '@/modules/game-rules';
import type { MonsterCatalogEntry } from '@/modules/game-rules';
import { AddMonsterError, deleteMonster, updateMonster } from './MonsterSpriteUploader.service';
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

/** Level/Boss edits and removals of uploaded catalog rows. One request runs at a time; the server's
 *  returned entry replaces the row it names, and a removed row is dropped, so no re-fetch is needed. */
export function useCatalogEdit(setCatalog: Dispatch<SetStateAction<MonsterCatalogEntry[]>>): CatalogEditState {
  const [pendingCatalogKey, setPendingCatalogKey] = useState<string | null>(null);
  const [catalogEditError, setCatalogEditError] = useState<string | null>(null);
  const [removeArmedKey, setRemoveArmedKey] = useState<string | null>(null);

  const runRequest = (rowKey: string, request: Promise<void>): void => {
    setPendingCatalogKey(rowKey);
    setCatalogEditError(null);
    request
      .catch((error: unknown) => {
        if (error instanceof AddMonsterError) {
          setCatalogEditError(error.message);
          return;
        }
        setCatalogEditError('Could not update — see console.');
        console.error(error);
      })
      .finally(() => setPendingCatalogKey(null));
  };

  const onCatalogEdit = (edit: CatalogEdit): void => {
    if (pendingCatalogKey !== null) return;
    const rowKey = toCatalogEntryKey(edit.name, edit.level);
    runRequest(
      rowKey,
      updateMonster(edit).then((entry) => {
        setCatalog((previous) =>
          previous.map((existing) => (toCatalogEntryKey(existing.name, existing.level) === rowKey ? entry : existing)),
        );
      }),
    );
  };

  const onCatalogRemove = (removal: CatalogRemoval): void => {
    if (pendingCatalogKey !== null) return;
    const rowKey = toCatalogEntryKey(removal.name, removal.level);
    setRemoveArmedKey(null);
    runRequest(
      rowKey,
      deleteMonster(removal).then(() => {
        setCatalog((previous) => previous.filter((existing) => toCatalogEntryKey(existing.name, existing.level) !== rowKey));
      }),
    );
  };

  const onArmRemove = (removal: CatalogRemoval | null): void =>
    setRemoveArmedKey(removal ? toCatalogEntryKey(removal.name, removal.level) : null);

  return { pendingCatalogKey, catalogEditError, removeArmedKey, onCatalogEdit, onArmRemove, onCatalogRemove };
}
