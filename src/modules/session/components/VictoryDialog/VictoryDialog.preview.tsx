'use client';

import { useState } from 'react';
import type { ComponentPreview } from '@/testbed';
import { Button } from '@/components/ui/button';
import { VictoryDialog } from './VictoryDialog';
import type { VictoryDialogProps } from './VictoryDialog.types';
import { botWinner, humanWinner } from './VictoryDialog.fixtures';

/**
 * VictoryDialog has no close control (Escape and outside click are no-ops by design),
 * so the preview wrapper owns the open state. "Close preview" is always reachable and
 * "Reopen dialog" appears once closed, so the viewer can leave and return to this state.
 */
function InteractiveVictoryDialog(props: Omit<VictoryDialogProps, 'onReturnToLobby'>) {
  const [isOpen, setIsOpen] = useState(true);
  const close = () => setIsOpen(false);

  return (
    <>
      {isOpen ? (
        <VictoryDialog {...props} onReturnToLobby={() => console.warn('onReturnToLobby')} />
      ) : (
        <Button onClick={() => setIsOpen(true)} variant="outline">
          Reopen dialog
        </Button>
      )}
      {/* Radix's AlertDialog sets pointer-events:none on the rest of the app while modal;
          pointer-events-auto re-enables this button so it's always clickable. */}
      <Button onClick={close} variant="outline" className="fixed top-4 right-4 z-[60] pointer-events-auto">
        Close preview
      </Button>
    </>
  );
}

export const victoryDialogPreview: ComponentPreview = {
  slug: 'session-victory-dialog',
  title: 'Victory Dialog',
  group: 'Session',
  states: [
    {
      name: 'You won',
      render: () => <InteractiveVictoryDialog winner={humanWinner} isLocalWinner={true} isExiting={false} />,
    },
    {
      name: 'Opponent won',
      render: () => <InteractiveVictoryDialog winner={humanWinner} isLocalWinner={false} isExiting={false} />,
    },
    {
      name: 'Bot winner',
      render: () => <InteractiveVictoryDialog winner={botWinner} isLocalWinner={false} isExiting={false} />,
    },
    {
      name: 'Returning',
      render: () => <InteractiveVictoryDialog winner={humanWinner} isLocalWinner={true} isExiting={true} />,
    },
  ],
};
