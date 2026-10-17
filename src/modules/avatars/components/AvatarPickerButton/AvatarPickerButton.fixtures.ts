import { toAvatarCells } from './AvatarPickerButton.map';
import type { AvatarPickerButtonViewModel } from './AvatarPickerButton.types';

const noop = () => undefined;

/** Shared by the tests and the testbed preview. Deterministic. */
export const noAvatarPicker: AvatarPickerButtonViewModel = {
  currentAvatarId: null,
  isDialogOpen: false,
  onOpenChange: noop,
  cells: toAvatarCells(null),
  isSaving: false,
  saveError: null,
  onSelect: noop,
};

export const chosenAvatarPicker: AvatarPickerButtonViewModel = {
  ...noAvatarPicker,
  currentAvatarId: 'human-03',
  cells: toAvatarCells('human-03'),
};

export const savingAvatarPicker: AvatarPickerButtonViewModel = {
  ...chosenAvatarPicker,
  isDialogOpen: true,
  isSaving: true,
};

export const errorAvatarPicker: AvatarPickerButtonViewModel = {
  ...chosenAvatarPicker,
  isDialogOpen: true,
  saveError: "Couldn't save your avatar. Try again.",
};
