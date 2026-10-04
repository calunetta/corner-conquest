'use client';

import { useState } from 'react';
import type { ComponentPreview } from '@/testbed';
import { Button } from '@/components/ui/button';
import { PositionDialog } from './PositionDialog';
import { singleResource, multipleResources } from './PositionDialog.fixtures';

/**
 * Wired to local state so the dialog can always be closed and reopened.
 * The dialog's AlertDialog handles the close callback.
 */
function InteractivePositionDialog(
  props: Omit<React.ComponentProps<typeof PositionDialog>, 'onClose'>,
) {
  const [isOpen, setIsOpen] = useState(true);
  const close = () => setIsOpen(false);

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} variant="outline">
        Reopen dialog
      </Button>
    );
  }

  return (
    <>
      <PositionDialog {...props} onClose={close} />
      {/* Radix's AlertDialog sets pointer-events:none on the rest of the app while modal;
          pointer-events-auto re-enables this button so it's always clickable. */}
      <Button onClick={close} variant="outline" className="fixed top-4 right-4 z-[60] pointer-events-auto">
        Close preview
      </Button>
    </>
  );
}

export const positionDialogPreview: ComponentPreview = {
  slug: 'position-dialog',
  title: 'Position Dialog',
  group: 'Combat',
  states: [
    {
      name: 'Single resource',
      render: () => (
        <InteractivePositionDialog
          resources={singleResource}
          onSelect={() => console.warn('onSelect')}
        />
      ),
    },
    {
      name: 'Multiple resource types',
      render: () => (
        <InteractivePositionDialog
          resources={multipleResources}
          onSelect={() => console.warn('onSelect')}
        />
      ),
    },
  ],
};
