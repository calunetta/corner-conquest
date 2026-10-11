'use client';

import { useState } from 'react';
import type { ComponentPreview } from '@/testbed';
import { Button } from '@/components/ui/button';
import { LinkGoogleAccountButtonView } from './LinkGoogleAccountButton';
import type { LinkGoogleAccountButtonViewProps } from './LinkGoogleAccountButton.types';
import {
  alreadyLinkedLinkGoogleAccountButton,
  genericFailureLinkGoogleAccountButton,
  idleLinkGoogleAccountButton,
  linkingLinkGoogleAccountButton,
} from './LinkGoogleAccountButton.fixtures';

/**
 * Holds the error dialog's open state so the dialog can be dismissed (OK, Escape) and reopened.
 * The view's dialog closes through onErrorDialogOpenChange, so this wrapper must own that state.
 */
function InteractiveErrorDialog(props: LinkGoogleAccountButtonViewProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(props.errorDialog.open);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <LinkGoogleAccountButtonView
        {...props}
        errorDialog={{ ...props.errorDialog, open: isDialogOpen }}
        onErrorDialogOpenChange={setIsDialogOpen}
      />
      {!isDialogOpen && (
        <Button onClick={() => setIsDialogOpen(true)} variant="outline" size="sm">
          Reopen dialog
        </Button>
      )}
    </div>
  );
}

export const linkGoogleAccountButtonPreview: ComponentPreview = {
  slug: 'session-link-google-account-button',
  title: 'Link Google Account button',
  group: 'Session',
  states: [
    { name: 'Idle', render: () => <LinkGoogleAccountButtonView {...idleLinkGoogleAccountButton} /> },
    { name: 'Linking', render: () => <LinkGoogleAccountButtonView {...linkingLinkGoogleAccountButton} /> },
    {
      name: 'Error (Already Linked)',
      render: () => <InteractiveErrorDialog {...alreadyLinkedLinkGoogleAccountButton} />,
    },
    {
      name: 'Error (Generic Failure)',
      render: () => <InteractiveErrorDialog {...genericFailureLinkGoogleAccountButton} />,
    },
  ],
};
