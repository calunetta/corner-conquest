import { useState } from 'react';
import { usePlayer } from '@/modules/session';
import type { AvatarId } from '../../avatar-catalog';
import { toAvatarCells } from './AvatarPickerButton.map';
import type { AvatarPickerButtonViewModel } from './AvatarPickerButton.types';

export const AVATAR_SAVE_ERROR = "Couldn't save your avatar. Try again.";

/** Dialog state and save flow for the lobby's avatar picker; persistence lives in `usePlayer`. */
export function useAvatarPickerButton(): AvatarPickerButtonViewModel {
  const { avatarId, setAvatarId } = usePlayer();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) setSaveError(null);
  };

  const handleSelect = async (id: AvatarId) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const didSave = await setAvatarId(id);
      if (!didSave) setSaveError(AVATAR_SAVE_ERROR);
    } catch {
      setSaveError(AVATAR_SAVE_ERROR);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    currentAvatarId: avatarId,
    isDialogOpen,
    onOpenChange: handleOpenChange,
    cells: toAvatarCells(avatarId),
    isSaving,
    saveError,
    onSelect: handleSelect,
  };
}
