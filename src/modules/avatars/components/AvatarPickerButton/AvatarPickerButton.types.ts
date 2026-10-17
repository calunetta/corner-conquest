import type { AvatarId } from '../../avatar-catalog';

export interface AvatarCellViewModel {
  id: AvatarId;
  src: string;
  position: number;
  ariaLabel: string;
  isSelected: boolean;
}

export interface AvatarPickerButtonViewModel {
  currentAvatarId: AvatarId | null;
  isDialogOpen: boolean;
  onOpenChange: (open: boolean) => void;
  cells: AvatarCellViewModel[];
  isSaving: boolean;
  /** "Couldn't save your avatar. Try again." when set. */
  saveError: string | null;
  onSelect: (id: AvatarId) => void;
}
