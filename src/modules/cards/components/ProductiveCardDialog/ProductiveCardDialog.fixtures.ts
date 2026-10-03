import type { ProductiveCardDialogState } from '@/lib/types';
import { ResourceType } from '@/lib/types';

/** Three resource options, none selected yet — the dialog's default open state. */
export const productiveDialogState: NonNullable<ProductiveCardDialogState> = {
  isOpen: true,
  options: [
    { resource: ResourceType.Food, amount: 3 },
    { resource: ResourceType.Wood, amount: 2 },
    { resource: ResourceType.Gold, amount: 1 },
  ],
};
