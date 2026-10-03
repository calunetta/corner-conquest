'use client';

import { useState } from 'react';
import type { ComponentPreview } from '@/testbed';
import { Button } from '@/components/ui/button';
import { CombatDialog } from './CombatDialog';
import type { CombatDialogProps } from './CombatDialog.types';
import {
  rollingPhaseAttackerNoCards,
  rollingPhaseAttackerBothCards,
  rollingPhaseSpectator,
  resultsPhaseAttackerWins,
  resultsPhaseDrawn,
} from './CombatDialog.fixtures';

/**
 * Wired to local state so the dialog can always be left: closing from inside
 * (the rolling phase has no in-dialog close control) is backed by the same
 * "Close preview" / "Reopen dialog" toggle the AlertDialog itself uses.
 */
function InteractiveCombatDialog(props: Omit<CombatDialogProps, 'onClose'>) {
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
      <CombatDialog {...props} onClose={close} />
      {/* Radix's AlertDialog sets pointer-events:none on the rest of the app while modal;
          pointer-events-auto re-enables this button so it's always clickable, even in the
          rolling phase which has no in-dialog close control of its own. */}
      <Button onClick={close} variant="outline" className="fixed top-4 right-4 z-[60] pointer-events-auto">
        Close preview
      </Button>
    </>
  );
}

export const combatDialogPreview: ComponentPreview = {
  slug: 'combat-combat-dialog',
  title: 'Combat Dialog',
  group: 'Combat',
  states: [
    {
      name: 'Rolling — attacker, no cards',
      render: () => (
        <InteractiveCombatDialog
          gameState={rollingPhaseAttackerNoCards}
          onRoll={(payload) => console.warn('onRoll', payload)}
          isMyTurn={true}
          localPlayerId={0}
        />
      ),
    },
    {
      name: 'Rolling — attacker, both cards',
      render: () => (
        <InteractiveCombatDialog
          gameState={rollingPhaseAttackerBothCards}
          onRoll={(payload) => console.warn('onRoll', payload)}
          isMyTurn={true}
          localPlayerId={0}
        />
      ),
    },
    {
      name: 'Rolling — spectator waiting',
      render: () => (
        <InteractiveCombatDialog
          gameState={rollingPhaseSpectator}
          onRoll={(payload) => console.warn('onRoll', payload)}
          isMyTurn={false}
          localPlayerId={1}
        />
      ),
    },
    {
      name: 'Results — attacker wins',
      render: () => (
        <InteractiveCombatDialog
          gameState={resultsPhaseAttackerWins}
          onRoll={(payload) => console.warn('onRoll', payload)}
          isMyTurn={true}
          localPlayerId={0}
        />
      ),
    },
    {
      name: 'Results — draw',
      render: () => (
        <InteractiveCombatDialog
          gameState={resultsPhaseDrawn}
          onRoll={(payload) => console.warn('onRoll', payload)}
          isMyTurn={true}
          localPlayerId={0}
        />
      ),
    },
  ],
};
