'use client';

import { useState } from 'react';
import type { ComponentPreview } from '@/testbed';
import { Button } from '@/components/ui/button';
import { DeleteAccountButtonView } from './DeleteAccountButton';
import type { DeleteAccountButtonViewProps } from './DeleteAccountButton.types';
import {
  closedDeleteAccountButton,
  confirmDeleteAccountButton,
  deletingDeleteAccountButton,
  errorDeleteAccountButton,
} from './DeleteAccountButton.fixtures';

/**
 * Owns the dialog's open state so Cancel, OK and Escape work in the testbed.
 * The 'deleting' state ignores close requests, as the real hook does.
 */
function InteractiveDialog(props: DeleteAccountButtonViewProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(props.isDialogOpen);

  const handleOpenChange = (open: boolean): void => {
    if (props.view === 'deleting') {
      return;
    }
    setIsDialogOpen(open);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <DeleteAccountButtonView {...props} isDialogOpen={isDialogOpen} onOpenChange={handleOpenChange} />
      {!isDialogOpen && (
        <Button onClick={() => setIsDialogOpen(true)} variant="outline" size="sm">
          Reopen dialog
        </Button>
      )}
    </div>
  );
}

export const deleteAccountButtonPreview: ComponentPreview = {
  slug: 'session-delete-account-button',
  title: 'Delete Account button',
  group: 'Session',
  states: [
    { name: 'Trigger', render: () => <DeleteAccountButtonView {...closedDeleteAccountButton} /> },
    { name: 'Confirm', render: () => <InteractiveDialog {...confirmDeleteAccountButton} /> },
    { name: 'Deleting', render: () => <InteractiveDialog {...deletingDeleteAccountButton} /> },
    { name: 'Error', render: () => <InteractiveDialog {...errorDeleteAccountButton} /> },
    { name: 'Closed', render: () => <InteractiveDialog {...closedDeleteAccountButton} /> },
  ],
};
