'use client';

import { useState } from 'react';
import type { ComponentPreview } from '@/testbed';
import { Button } from '@/components/ui/button';
import { MonsterCombatDialog } from './MonsterCombatDialog';
import type { MonsterCombatDialogProps } from './MonsterCombatDialog.types';
import {
  attackScreenNoCards,
  attackScreenAllCards,
  resultsPlayerWins,
  resultsMonsterWins,
  spectatorWaiting,
} from './MonsterCombatDialog.fixtures';

/**
 * Wired to local state so the dialog can always be left: the spectator screen
 * has no in-dialog close control, so closing is backed by the same
 * "Close preview" / "Reopen dialog" toggle the attack/results screens use.
 */
function InteractiveMonsterCombatDialog(props: Omit<MonsterCombatDialogProps, 'onClose' | 'onCancel'>) {
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
      <MonsterCombatDialog {...props} onClose={close} onCancel={close} />
      {/* Radix's AlertDialog sets pointer-events:none on the rest of the app while modal;
          pointer-events-auto re-enables this button so it's always clickable, even on the
          spectator screen which has no in-dialog close control of its own. */}
      <Button onClick={close} variant="outline" className="fixed top-4 right-4 z-[60] pointer-events-auto">
        Close preview
      </Button>
    </>
  );
}

export const monsterCombatDialogPreview: ComponentPreview = {
  slug: 'combat-monster-combat-dialog',
  title: 'Monster Combat Dialog',
  group: 'Combat',
  states: [
    {
      name: 'Attack screen — no tactical cards',
      render: () => (
        <InteractiveMonsterCombatDialog
          gameState={attackScreenNoCards}
          onRoll={(payload) => console.warn('onRoll', payload)}
          isMyTurn={true}
          localPlayerId={0}
        />
      ),
    },
    {
      name: 'Attack screen — all three tactical cards available',
      render: () => (
        <InteractiveMonsterCombatDialog
          gameState={attackScreenAllCards}
          onRoll={(payload) => console.warn('onRoll', payload)}
          isMyTurn={true}
          localPlayerId={0}
        />
      ),
    },
    {
      name: 'Results — player wins',
      render: () => (
        <InteractiveMonsterCombatDialog
          gameState={resultsPlayerWins}
          onRoll={(payload) => console.warn('onRoll', payload)}
          isMyTurn={true}
          localPlayerId={0}
        />
      ),
    },
    {
      name: 'Results — monster wins',
      render: () => (
        <InteractiveMonsterCombatDialog
          gameState={resultsMonsterWins}
          onRoll={(payload) => console.warn('onRoll', payload)}
          isMyTurn={true}
          localPlayerId={0}
        />
      ),
    },
    {
      name: 'Spectator — waiting',
      render: () => (
        <InteractiveMonsterCombatDialog
          gameState={spectatorWaiting}
          onRoll={(payload) => console.warn('onRoll', payload)}
          isMyTurn={false}
          localPlayerId={1}
        />
      ),
    },
  ],
};
