'use client';

import { useState } from 'react';
import type { ComponentPreview } from '@/testbed';
import { Button } from '@/components/ui/button';
import { WealthyDialog } from './WealthyDialog';

/**
 * Wired to local state so the dialog can always be closed and reopened.
 * The dialog's AlertDialog handles the close callback.
 */
function InteractiveWealthyDialog(
  props: Omit<React.ComponentProps<typeof WealthyDialog>, 'onClose'>,
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

  return <WealthyDialog {...props} onClose={close} />;
}

export const wealthyDialogPreview: ComponentPreview = {
  slug: 'wealthy-dialog',
  title: 'Wealthy Dialog',
  group: 'Cards',
  states: [
    {
      name: 'All resources available',
      render: () => (
        <InteractiveWealthyDialog
          onSelectResource={() => console.warn('onSelectResource')}
        />
      ),
    },
  ],
};
