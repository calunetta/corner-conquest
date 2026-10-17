import { useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { toCatalogEntryKey } from '@/modules/game-rules';
import type { MonsterCatalogEntry } from '@/modules/game-rules';
import { AddMonsterError, updateMonster } from './MonsterSpriteUploader.service';
import type { CatalogEdit } from './MonsterSpriteUploader.types';

export interface CatalogEditState {
  pendingCatalogKey: string | null;
  catalogEditError: string | null;
  onCatalogEdit: (edit: CatalogEdit) => void;
}

/** Level/Boss edits to uploaded catalog rows. One edit runs at a time; the server's returned entry
 *  replaces the row it names, so the list never needs a re-fetch. */
export function useCatalogEdit(setCatalog: Dispatch<SetStateAction<MonsterCatalogEntry[]>>): CatalogEditState {
  const [pendingCatalogKey, setPendingCatalogKey] = useState<string | null>(null);
  const [catalogEditError, setCatalogEditError] = useState<string | null>(null);

  const onCatalogEdit = (edit: CatalogEdit): void => {
    if (pendingCatalogKey !== null) return;
    const rowKey = toCatalogEntryKey(edit.name, edit.level);
    setPendingCatalogKey(rowKey);
    setCatalogEditError(null);
    updateMonster(edit)
      .then((entry) => {
        setCatalog((previous) =>
          previous.map((existing) => (toCatalogEntryKey(existing.name, existing.level) === rowKey ? entry : existing)),
        );
      })
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

  return { pendingCatalogKey, catalogEditError, onCatalogEdit };
}
