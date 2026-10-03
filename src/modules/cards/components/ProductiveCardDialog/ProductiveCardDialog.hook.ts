import { useState } from 'react';
import type { ResourceType } from '@/lib/types';
import { toProductiveCardDialogViewModel } from './ProductiveCardDialog.map';
import type { ProductiveCardDialogProps, ProductiveCardDialogViewModel } from './ProductiveCardDialog.types';

export interface ProductiveCardDialogState_ {
  viewModel: ProductiveCardDialogViewModel | null;
  onSelectResource: (resource: ResourceType) => void;
  onConfirm: () => void;
}

export function useProductiveCardDialog(props: ProductiveCardDialogProps): ProductiveCardDialogState_ {
  const { state, onConfirm } = props;
  const [selectedResource, setSelectedResource] = useState<ResourceType | null>(null);

  const handleSelectResource = (resource: ResourceType): void => {
    setSelectedResource((previous) => (previous === resource ? null : resource));
  };

  const handleConfirm = (): void => {
    onConfirm(selectedResource);
  };

  return {
    viewModel: state ? toProductiveCardDialogViewModel(state, selectedResource) : null,
    onSelectResource: handleSelectResource,
    onConfirm: handleConfirm,
  };
}
