'use client';

import { useState } from 'react';
import type { ComponentPreview } from '@/testbed';
import { Button } from '@/components/ui/button';
import { MonsterSelectionDialog } from './MonsterSelectionDialog';
import type { MonsterSelectionDialogProps } from './MonsterSelectionDialog.types';
import { singleMonsterState, multipleMonstersState, notMyTurnState } from './MonsterSelectionDialog.fixtures';

/**
 * Wired to local state so the dialog can always be left: the AlertDialog's
 * close button and the preview's own reopen button are both backed by the
 * same `setIsOpen` toggle.
 */
function InteractiveMonsterSelectionDialog(props: Omit<MonsterSelectionDialogProps, 'onClose'>) {
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
      <MonsterSelectionDialog {...props} onClose={close} />
      {/* Radix's AlertDialog sets pointer-events:none on the rest of the app while modal;
          pointer-events-auto re-enables this button so it's always clickable. */}
      <Button onClick={close} variant="outline" className="fixed top-4 right-4 z-[60] pointer-events-auto">
        Close preview
      </Button>
    </>
  );
}

export const monsterSelectionDialogPreview: ComponentPreview = {
  slug: 'combat-monster-selection-dialog',
  title: 'Monster Selection Dialog',
  group: 'Combat',
  states: [
    {
      name: 'Single monster',
      render: () => (
        <InteractiveMonsterSelectionDialog
          state={singleMonsterState}
          onSelectTarget={(monsterName) => console.warn('onSelectTarget', monsterName)}
          isMyTurn={true}
        />
      ),
    },
    {
      name: 'Multiple monsters, mixed levels',
      render: () => (
        <InteractiveMonsterSelectionDialog
          state={multipleMonstersState}
          onSelectTarget={(monsterName) => console.warn('onSelectTarget', monsterName)}
          isMyTurn={true}
        />
      ),
    },
    {
      name: 'Not my turn',
      render: () => (
        <InteractiveMonsterSelectionDialog
          state={notMyTurnState}
          onSelectTarget={(monsterName) => console.warn('onSelectTarget', monsterName)}
          isMyTurn={false}
        />
      ),
    },
  ],
};
