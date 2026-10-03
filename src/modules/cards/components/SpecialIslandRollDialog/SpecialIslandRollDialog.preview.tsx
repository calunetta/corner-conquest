'use client';

import { useState } from 'react';
import type { ComponentPreview } from '@/testbed';
import { Button } from '@/components/ui/button';
import { SpecialIslandRollDialog } from './SpecialIslandRollDialog';
import { notRolledState, rolledWithCardState, rolledWithoutCardState } from './SpecialIslandRollDialog.fixtures';

/**
 * Wired to local state so the dialog can always be closed and reopened.
 */
function InteractiveSpecialIslandRollDialog(
  props: Omit<React.ComponentProps<typeof SpecialIslandRollDialog>, 'onClose'>,
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

  return <SpecialIslandRollDialog {...props} onClose={close} />;
}

export const specialIslandRollDialogPreview: ComponentPreview = {
  slug: 'cards-special-island-roll-dialog',
  title: 'Special Island Roll Dialog',
  group: 'Cards',
  states: [
    {
      name: 'Not yet rolled',
      render: () => (
        <InteractiveSpecialIslandRollDialog
          state={notRolledState}
          onRoll={() => console.warn('onRoll')}
        />
      ),
    },
    {
      name: 'Rolled 3/6 with a card',
      render: () => (
        <InteractiveSpecialIslandRollDialog
          state={rolledWithCardState}
          onRoll={() => console.warn('onRoll')}
        />
      ),
    },
    {
      name: 'Rolled other, no card',
      render: () => (
        <InteractiveSpecialIslandRollDialog
          state={rolledWithoutCardState}
          onRoll={() => console.warn('onRoll')}
        />
      ),
    },
  ],
};
