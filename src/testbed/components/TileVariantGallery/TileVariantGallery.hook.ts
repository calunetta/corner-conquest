'use client';

import { useEffect, useMemo, useState } from 'react';
import type { TileVariantsConfig } from '@/modules/map/components/TileVariants/TileVariants.config';
import { deleteVariant, loadConfig, type ConfigSnapshot } from '../TileVariantEditor/TileVariantEditor.api';
import {
  deleteVariantsInOrder,
  groupVariants,
  pruneSelection,
  toggleGroupSelection,
  toggleSelected,
} from './TileVariantGallery.map';
import type { DeleteFailure, RemoveOutcome, VariantGroup } from './TileVariantGallery.types';

/** Deletes one variant. A conflict counts as a failure, and the newer sha is kept for the next delete. */
async function removeVariant(id: string, baseSha: string): Promise<RemoveOutcome> {
  const result = await deleteVariant(id, baseSha);
  if (result.ok) return { ok: true, sha: result.value.sha };
  return { ok: false, message: result.message, sha: result.newer?.sha ?? baseSha };
}

/**
 * The saved variant list with a selection for deletion. Deleting runs one request per id, then reloads the
 * list from the file so the gallery shows what is actually saved. Ids that failed stay selected for a retry.
 */
export function useTileVariantGallery() {
  const [config, setConfig] = useState<TileVariantsConfig | null>(null);
  const [sha, setSha] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [failures, setFailures] = useState<DeleteFailure[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const applySnapshot = (snapshot: ConfigSnapshot) => {
    setConfig(snapshot.config);
    setSha(snapshot.sha);
    setSelected((previous) => pruneSelection(previous, snapshot.config));
  };

  const reload = async (isCurrent: () => boolean = () => true) => {
    const result = await loadConfig();
    if (!isCurrent()) return;
    if (result.ok) {
      applySnapshot(result.value);
      setLoadError(null);
    } else {
      setLoadError(result.message);
    }
  };

  useEffect(() => {
    let isCurrent = true;
    void reload(() => isCurrent);
    return () => {
      isCurrent = false;
    };
    // Loaded once when the gallery opens; each delete reloads it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups: VariantGroup[] = useMemo(() => (config ? groupVariants(config) : []), [config]);
  const totalCount = config?.variants.length ?? 0;

  const toggleVariant = (id: string) => setSelected((previous) => toggleSelected(previous, id));
  const toggleGroup = (group: VariantGroup) => setSelected((previous) => toggleGroupSelection(previous, group));

  const openConfirm = () => {
    if (selected.size > 0) setIsConfirming(true);
  };
  const closeConfirm = () => setIsConfirming(false);

  async function confirmDelete() {
    const ids = [...selected];
    setIsConfirming(false);
    setIsDeleting(true);
    setFailures([]);
    setNotice(null);

    const run = await deleteVariantsInOrder(ids, sha, removeVariant);
    setFailures(run.failures);
    setSelected(new Set(run.failures.map((failure) => failure.id)));
    setNotice(`Deleted ${run.deletedIds.length} of ${ids.length}.`);
    await reload();
    setIsDeleting(false);
  }

  return {
    config,
    loadError,
    groups,
    totalCount,
    selected,
    selectedCount: selected.size,
    isConfirming,
    isDeleting,
    failures,
    notice,
    toggleVariant,
    toggleGroup,
    openConfirm,
    closeConfirm,
    confirmDelete,
  };
}
