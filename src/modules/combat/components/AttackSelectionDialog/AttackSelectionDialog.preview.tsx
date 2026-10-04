'use client';

import { useState } from 'react';
import type { ComponentPreview } from '@/testbed';
import { Button } from '@/components/ui/button';
import { AttackSelectionDialog } from './AttackSelectionDialog';
import type { AttackSelectionDialogProps } from './AttackSelectionDialog.types';
import { allReadyState, mixedStatusState, notMyTurnState } from './AttackSelectionDialog.fixtures';

/**
 * Wired to local state so the dialog can always be left: the AlertDialog's
 * close button and the preview's own reopen button are both backed by the
 * same `setIsOpen` toggle.
 */
function InteractiveAttackSelectionDialog(props: Omit<AttackSelectionDialogProps, 'onClose'>) {
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
      <AttackSelectionDialog {...props} onClose={close} />
      {/* Radix's AlertDialog sets pointer-events:none on the rest of the app while modal;
          pointer-events-auto re-enables this button so it's always clickable. */}
      <Button onClick={close} variant="outline" className="fixed top-4 right-4 z-[60] pointer-events-auto">
        Close preview
      </Button>
    </>
  );
}

export const attackSelectionDialogPreview: ComponentPreview = {
  slug: 'combat-attack-selection-dialog',
  title: 'Attack Selection Dialog',
  group: 'Combat',
  states: [
    {
      name: 'All ready',
      render: () => (
        <InteractiveAttackSelectionDialog
          state={allReadyState}
          onSelectTarget={(armyId) => console.warn('onSelectTarget', armyId)}
          isMyTurn={true}
        />
      ),
    },
    {
      name: 'Mixed statuses (acted/positioned/ready)',
      render: () => (
        <InteractiveAttackSelectionDialog
          state={mixedStatusState}
          onSelectTarget={(armyId) => console.warn('onSelectTarget', armyId)}
          isMyTurn={true}
        />
      ),
    },
    {
      name: 'Not my turn',
      render: () => (
        <InteractiveAttackSelectionDialog
          state={notMyTurnState}
          onSelectTarget={(armyId) => console.warn('onSelectTarget', armyId)}
          isMyTurn={false}
        />
      ),
    },
  ],
};
