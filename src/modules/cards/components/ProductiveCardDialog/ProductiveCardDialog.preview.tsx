'use client';

import { useState } from 'react';
import type { ComponentPreview } from '@/testbed';
import { Button } from '@/components/ui/button';
import { ProductiveCardDialog } from './ProductiveCardDialog';
import { productiveDialogState } from './ProductiveCardDialog.fixtures';

/**
 * Wrapper with close affordance (pointer-events-auto + z-[60], since ProductiveCardDialog
 * has no onOpenChange and is intentionally non-dismissible via the dialog itself).
 */
function InteractiveProductiveCardDialog() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} variant="outline">
        Reopen dialog
      </Button>
    );
  }

  return (
    <>
      <ProductiveCardDialog
        state={productiveDialogState}
        onConfirm={(resource) => {
          console.warn('onConfirm', resource);
          setIsOpen(false);
        }}
      />
      <Button onClick={() => setIsOpen(false)} variant="outline" className="fixed top-4 right-4 z-[60] pointer-events-auto">
        Close preview
      </Button>
    </>
  );
}

export const productiveCardDialogPreview: ComponentPreview = {
  slug: 'cards-productive-card-dialog',
  title: 'Productive Card Dialog',
  group: 'Cards',
  states: [
    {
      name: 'Default (no selection)',
      render: () => <InteractiveProductiveCardDialog />,
    },
    {
      name: 'Interactive (click resources to select/toggle)',
      render: () => <InteractiveProductiveCardDialog />,
    },
  ],
};
