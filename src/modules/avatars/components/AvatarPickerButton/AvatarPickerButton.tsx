'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { RegistryIcon } from '@/modules/shared';
import { useAvatarPickerButton } from './AvatarPickerButton.hook';
import { styles } from './AvatarPickerButton.styles';
import type { AvatarPickerButtonViewModel } from './AvatarPickerButton.types';

export function AvatarPickerButtonView(vm: AvatarPickerButtonViewModel) {
  const currentCell = vm.cells.find((cell) => cell.isSelected);

  return (
    <Dialog open={vm.isDialogOpen} onOpenChange={vm.onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className={styles.triggerButton}>
          {currentCell ? (
            <Image src={currentCell.src} alt="" width={28} height={28} className={styles.triggerThumbnail} unoptimized />
          ) : (
            <RegistryIcon id="users" className={styles.triggerIcon} />
          )}
          <span className={styles.triggerMobileLabel}>Change your avatar</span>
          <span className={styles.triggerLabel}>Change Avatar</span>
        </Button>
      </DialogTrigger>
      <DialogContent className={styles.dialogContent}>
        <DialogHeader className={styles.dialogHeader}>
          <DialogTitle className={styles.dialogTitle}>Choose Your Avatar</DialogTitle>
          <DialogDescription className={styles.dialogDescription}>
            Pick the face your commander shows to other players.
          </DialogDescription>
        </DialogHeader>
        <div role="group" aria-label="Avatar picker" className={styles.avatarGrid}>
          {vm.cells.map((cell) => (
            <button
              key={cell.id}
              type="button"
              aria-pressed={cell.isSelected}
              aria-label={cell.ariaLabel}
              data-avatar-id={cell.id}
              onClick={() => vm.onSelect(cell.id)}
              className={cn(styles.avatarCell, cell.isSelected ? styles.avatarCellSelected : styles.avatarCellUnselected)}
            >
              <Image src={cell.src} alt="" width={64} height={64} className={styles.avatarImage} unoptimized />
              {cell.isSelected && vm.isSaving && (
                <span className={styles.savingOverlay}>
                  <RegistryIcon id="loader-2" className={styles.savingSpinner} />
                </span>
              )}
            </button>
          ))}
        </div>
        {vm.saveError && (
          <p role="alert" className={styles.errorText}>
            {vm.saveError}
          </p>
        )}
        <DialogFooter className={styles.dialogFooter}>
          <Button type="button" onClick={() => vm.onOpenChange(false)} disabled={vm.isSaving}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AvatarPickerButton() {
  return <AvatarPickerButtonView {...useAvatarPickerButton()} />;
}
