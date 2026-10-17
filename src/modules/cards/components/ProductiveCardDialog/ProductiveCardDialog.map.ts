import type { ProductiveCardDialogState, ResourceType } from '@/lib/types';
import { getResourceDisplayName, toResourceIconId } from '@/modules/shared';
import type { ProductiveCardDialogViewModel, ProductiveOptionViewModel } from './ProductiveCardDialog.types';


/** Pure. `state` is the dialog's own non-null shape; callers check for null first. */
export function toProductiveCardDialogViewModel(
  state: NonNullable<ProductiveCardDialogState>,
  selectedResource: ResourceType | null,
): ProductiveCardDialogViewModel {
  const options: ProductiveOptionViewModel[] = state.options.map((option) => ({
    resource: option.resource,
    amount: option.amount,
    iconId: toResourceIconId(option.resource),
    displayName: getResourceDisplayName(option.resource),
    isSelected: selectedResource === option.resource,
  }));

  const confirmLabel = selectedResource
    ? `Double ${getResourceDisplayName(selectedResource)} Harvest`
    : 'Harvest Normally (Skip 2x)';

  return { options, confirmLabel };
}
