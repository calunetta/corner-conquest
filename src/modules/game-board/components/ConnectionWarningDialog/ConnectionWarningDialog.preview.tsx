'use client';

import { useState } from 'react';
import type { ComponentPreview } from '@/testbed';
import { Button } from '@/components/ui/button';
import { ConnectionWarningDialogView } from './ConnectionWarningDialog';
import type { ConnectionWarningViewModel } from './ConnectionWarningDialog.types';
import { openWarningViewModel, openExpiringViewModel } from './ConnectionWarningDialog.fixtures';

/**
 * The warning has no close control by design (non-interactive, Escape suppressed), so the
 * preview wrapper supplies the only exit: a "Close preview" button outside the dialog,
 * and a "Reopen dialog" button once closed.
 */
function InteractiveConnectionWarningDialog(viewModel: ConnectionWarningViewModel) {
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
      <ConnectionWarningDialogView {...viewModel} />
      {/* Radix's AlertDialog sets pointer-events:none on the rest of the app while modal;
          pointer-events-auto re-enables this button so it stays clickable above the overlay. */}
      <Button onClick={close} variant="outline" className="fixed top-4 right-4 z-[60] pointer-events-auto">
        Close preview
      </Button>
    </>
  );
}

export const connectionWarningDialogPreview: ComponentPreview = {
  slug: 'game-board-connection-warning',
  title: 'Connection warning dialog',
  group: 'Game Board',
  states: [
    { name: 'Warning', render: () => <InteractiveConnectionWarningDialog {...openWarningViewModel} /> },
    { name: 'Expiring', render: () => <InteractiveConnectionWarningDialog {...openExpiringViewModel} /> },
  ],
};
