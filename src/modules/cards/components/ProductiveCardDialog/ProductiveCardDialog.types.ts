import type { ProductiveCardDialogState, ResourceType } from '@/lib/types';

export interface ProductiveCardDialogProps {
  state: ProductiveCardDialogState;
  onConfirm: (selectedResource: ResourceType | null) => void;
  // No onClose: this dialog is intentionally non-dismissible (see plan.md Decisions).
}

export interface ProductiveOptionViewModel {
  resource: ResourceType;
  amount: number;
  sprite: string;
  displayName: string;
  isSelected: boolean;
}

export interface ProductiveCardDialogViewModel {
  options: ProductiveOptionViewModel[];
  confirmLabel: string;
}
