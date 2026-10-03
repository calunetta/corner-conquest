'use client';

import { useState } from 'react';
import type { ComponentPreview } from '@/testbed';
import { Button } from '@/components/ui/button';
import { SabotageDialog } from './SabotageDialog';
import { sabotageTargets, sabotageFullGrid, sabotageWithLongNames } from './SabotageDialog.fixtures';

/**
 * Wired to local state so the dialog can always be closed and reopened.
 * The dialog's AlertDialog handles the close callback.
 */
function InteractiveSabotageDialog(
  props: Omit<React.ComponentProps<typeof SabotageDialog>, 'onClose'>,
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

  return <SabotageDialog {...props} onClose={close} />;
}

export const sabotageDialogPreview: ComponentPreview = {
  slug: 'sabotage-dialog',
  title: 'Sabotage Dialog',
  group: 'Cards',
  states: [
    {
      name: 'Two opponents',
      render: () => (
        <InteractiveSabotageDialog
          players={sabotageTargets.slice(0, 2)}
          onSabotage={() => console.warn('onSabotage')}
        />
      ),
    },
    {
      name: 'Full grid (4 opponents)',
      render: () => (
        <InteractiveSabotageDialog
          players={sabotageFullGrid}
          onSabotage={() => console.warn('onSabotage')}
        />
      ),
    },
    {
      name: 'Long player name truncation',
      render: () => (
        <InteractiveSabotageDialog
          players={sabotageWithLongNames}
          onSabotage={() => console.warn('onSabotage')}
        />
      ),
    },
  ],
};
