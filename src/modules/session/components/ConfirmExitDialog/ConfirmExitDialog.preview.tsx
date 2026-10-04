'use client';

import { useState } from 'react';
import type { ComponentPreview } from '@/testbed';
import { Button } from '@/components/ui/button';
import { ConfirmExitDialog } from './ConfirmExitDialog';

/**
 * Wired to local state so the dialog can always be closed and reopened.
 * The dialog's AlertDialog handles the close callback.
 */
function InteractiveConfirmExitDialog(props: Omit<React.ComponentProps<typeof ConfirmExitDialog>, 'onClose'>) {
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
      <ConfirmExitDialog {...props} onClose={close} />
      {/* Radix's AlertDialog sets pointer-events:none on the rest of the app while modal;
          pointer-events-auto re-enables this button so it's always clickable. */}
      <Button onClick={close} variant="outline" className="fixed top-4 right-4 z-[60] pointer-events-auto">
        Close preview
      </Button>
    </>
  );
}

export const confirmExitDialogPreview: ComponentPreview = {
  slug: 'confirm-exit-dialog',
  title: 'Confirm Exit Dialog',
  group: 'Session',
  states: [
    {
      name: 'Default',
      render: () => (
        <InteractiveConfirmExitDialog
          onConfirm={() => console.warn('onConfirm')}
        />
      ),
    },
  ],
};
