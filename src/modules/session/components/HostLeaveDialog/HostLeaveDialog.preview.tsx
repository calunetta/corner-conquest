'use client';

import { useState } from 'react';
import type { ComponentPreview } from '@/testbed';
import { Button } from '@/components/ui/button';
import { HostLeaveDialog } from './HostLeaveDialog';
import { inProgressProps, lastPlayerProps, newHostTakesOverProps } from './HostLeaveDialog.fixtures';

/**
 * Wired to local state so the dialog can always be closed and reopened.
 * The dialog's AlertDialog handles the close callback via the open prop.
 */
function InteractiveHostLeaveDialog(
  props: Omit<React.ComponentProps<typeof HostLeaveDialog>, 'onClose'>,
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
      <HostLeaveDialog {...props} open={isOpen} onClose={close} />
      {/* Radix's AlertDialog sets pointer-events:none on the rest of the app while modal;
          pointer-events-auto re-enables this button so it's always clickable. */}
      <Button onClick={close} variant="outline" className="fixed top-4 right-4 z-[60] pointer-events-auto">
        Close preview
      </Button>
    </>
  );
}

export const hostLeaveDialogPreview: ComponentPreview = {
  slug: 'host-leave-dialog',
  title: 'Host Leave Dialog',
  group: 'Session',
  states: [
    {
      name: 'In-progress game',
      render: () => (
        <InteractiveHostLeaveDialog
          {...inProgressProps}
          onConfirm={async () => console.warn('onConfirm')}
        />
      ),
    },
    {
      name: 'Last player remaining',
      render: () => (
        <InteractiveHostLeaveDialog
          {...lastPlayerProps}
          onConfirm={async () => console.warn('onConfirm')}
        />
      ),
    },
    {
      name: 'Mid-lobby (new host takes over)',
      render: () => (
        <InteractiveHostLeaveDialog
          {...newHostTakesOverProps}
          onConfirm={async () => console.warn('onConfirm')}
        />
      ),
    },
  ],
};
