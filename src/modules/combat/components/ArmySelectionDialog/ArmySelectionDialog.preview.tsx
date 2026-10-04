'use client';

import { useState } from 'react';
import type { ComponentPreview } from '@/testbed';
import { Button } from '@/components/ui/button';
import { ArmySelectionDialog } from './ArmySelectionDialog';
import type { ArmySelectionDialogProps } from './ArmySelectionDialog.types';
import {
  allReadyState,
  allReadyPlayer,
  mixedStatusState,
  mixedStatusPlayer,
  oneSelectedState,
  oneSelectedPlayer,
  oneSelectedArmyId,
  notMyTurnState,
  notMyTurnPlayer,
} from './ArmySelectionDialog.fixtures';

/**
 * Wired to local state so the dialog can always be left: the AlertDialog's
 * close button and the preview's own reopen button are both backed by the
 * same `setIsOpen` toggle.
 */
function InteractiveArmySelectionDialog(props: Omit<ArmySelectionDialogProps, 'onClose'>) {
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
      <ArmySelectionDialog {...props} onClose={close} />
      {/* Radix's AlertDialog sets pointer-events:none on the rest of the app while modal;
          pointer-events-auto re-enables this button so it's always clickable. */}
      <Button onClick={close} variant="outline" className="fixed top-4 right-4 z-[60] pointer-events-auto">
        Close preview
      </Button>
    </>
  );
}

export const armySelectionDialogPreview: ComponentPreview = {
  slug: 'combat-army-selection-dialog',
  title: 'Army Selection Dialog',
  group: 'Combat',
  states: [
    {
      name: 'All ready',
      render: () => (
        <InteractiveArmySelectionDialog
          state={allReadyState}
          player={allReadyPlayer}
          onSelectArmy={(armyId) => console.warn('onSelectArmy', armyId)}
          isMyTurn={true}
        />
      ),
    },
    {
      name: 'Mixed statuses (acted/positioned/ready)',
      render: () => (
        <InteractiveArmySelectionDialog
          state={mixedStatusState}
          player={mixedStatusPlayer}
          onSelectArmy={(armyId) => console.warn('onSelectArmy', armyId)}
          isMyTurn={true}
        />
      ),
    },
    {
      name: 'One selected',
      render: () => (
        <InteractiveArmySelectionDialog
          state={oneSelectedState}
          player={oneSelectedPlayer}
          onSelectArmy={(armyId) => console.warn('onSelectArmy', armyId)}
          isMyTurn={true}
          selectedArmyId={oneSelectedArmyId}
        />
      ),
    },
    {
      name: 'Not my turn',
      render: () => (
        <InteractiveArmySelectionDialog
          state={notMyTurnState}
          player={notMyTurnPlayer}
          onSelectArmy={(armyId) => console.warn('onSelectArmy', armyId)}
          isMyTurn={false}
        />
      ),
    },
  ],
};
