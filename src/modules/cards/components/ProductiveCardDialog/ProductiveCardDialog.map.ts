import type { ProductiveCardDialogState, ResourceType } from '@/lib/types';
import { RESOURCE_SPRITES, getResourceDisplayName } from '@/components/icons';
import type { ProductiveCardDialogViewModel, ProductiveOptionViewModel } from './ProductiveCardDialog.types';

const FALLBACK_SPRITE = '/sprites/mine.png';

/** Pure. `state` is the dialog's own non-null shape; callers check for null first. */
export function toProductiveCardDialogViewModel(
  state: NonNullable<ProductiveCardDialogState>,
  selectedResource: ResourceType | null,
): ProductiveCardDialogViewModel {
  const options: ProductiveOptionViewModel[] = state.options.map((option) => ({
    resource: option.resource,
    amount: option.amount,
    sprite: RESOURCE_SPRITES[option.resource] || FALLBACK_SPRITE,
    displayName: getResourceDisplayName(option.resource),
    isSelected: selectedResource === option.resource,
  }));

  const confirmLabel = selectedResource
    ? `Double ${getResourceDisplayName(selectedResource)} Harvest`
    : 'Harvest Normally (Skip 2x)';

  return { options, confirmLabel };
}
