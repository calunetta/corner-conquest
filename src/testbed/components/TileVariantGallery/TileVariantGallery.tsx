'use client';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toDeleteSummary } from './TileVariantGallery.map';
import { styles } from './TileVariantGallery.styles';
import { TileVariantGalleryGroup } from './TileVariantGalleryGroup';
import { useTileVariantGallery } from './TileVariantGallery.hook';

/** Every tile variant on one page, grouped by type, with a selection to delete. Reads the saved config file. */
export function TileVariantGallery() {
  const gallery = useTileVariantGallery();

  if (gallery.loadError) return <p role="alert" className={styles.failureList}>Could not load the tile variants: {gallery.loadError}</p>;
  if (!gallery.config) return <p className={styles.summary}>Loading the tile variants…</p>;

  const { selectedCount, isDeleting } = gallery;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className="flex flex-col gap-1">
          <h2 className={styles.title}>Tile Variant Gallery</h2>
          <p className={styles.summary}>
            {gallery.totalCount} variants · {selectedCount} selected
          </p>
        </div>
        <button type="button" className={styles.dangerButton} onClick={gallery.openConfirm} disabled={selectedCount === 0 || isDeleting}>
          Delete selected ({selectedCount})
        </button>
      </header>

      {isDeleting && <p className={styles.notice} role="status">Deleting…</p>}
      {gallery.notice && !isDeleting && <p className={styles.notice} role="status">{gallery.notice}</p>}
      {gallery.failures.length > 0 && (
        <ul className={styles.failureList} role="alert">
          {gallery.failures.map((failure) => (
            <li key={failure.id}>
              {failure.id}: {failure.message}
            </li>
          ))}
        </ul>
      )}

      {gallery.groups.map((group) => (
        <TileVariantGalleryGroup
          key={group.key}
          group={group}
          selected={gallery.selected}
          onToggleVariant={gallery.toggleVariant}
          onToggleGroup={gallery.toggleGroup}
          disabled={isDeleting}
        />
      ))}

      <AlertDialog open={gallery.isConfirming} onOpenChange={(open) => !open && gallery.closeConfirm()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tile variants?</AlertDialogTitle>
            <AlertDialogDescription>{toDeleteSummary(selectedCount)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void gallery.confirmDelete()}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
