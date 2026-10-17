import { AVATAR_OPTIONS } from '../../avatar-catalog';
import type { AvatarId } from '../../avatar-catalog';
import type { AvatarCellViewModel } from './AvatarPickerButton.types';

export function toAvatarCells(selectedId: AvatarId | null): AvatarCellViewModel[] {
  return AVATAR_OPTIONS.map((option) => ({
    id: option.id,
    src: option.src,
    position: option.position,
    ariaLabel: `Avatar ${option.position} of ${AVATAR_OPTIONS.length}`,
    isSelected: option.id === selectedId,
  }));
}
