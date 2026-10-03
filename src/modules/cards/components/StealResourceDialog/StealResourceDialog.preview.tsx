'use client';

import { useState, useEffect } from 'react';
import type { ComponentPreview } from '@/testbed';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogContent } from '@/components/ui/alert-dialog';
import { StealResourceDialog } from './StealResourceDialog';
import { PlayerSelectionStep } from './PlayerSelectionStep';
import { ResourceSelectionStep } from './ResourceSelectionStep';
import { stealTargets } from './StealResourceDialog.fixtures';
import { styles } from './StealResourceDialog.styles';
import { useStealResourceDialog } from './StealResourceDialog.hook';
import type { ResourceType } from '@/lib/types';

/**
 * Wired to local state so the dialog can always be closed and reopened.
 * The dialog's AlertDialog handles the close callback.
 */
function InteractiveStealResourceDialog({
  players,
}: {
  players: typeof stealTargets;
}) {
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
    <StealResourceDialog
      players={players}
      onSteal={() => console.warn('onSteal')}
      onClose={close}
    />
  );
}

/**
 * Custom wrapper that uses the hook but drives it to specific states via useEffect.
 */
function StealResourceDialogAtStep({
  players,
  selectedPlayerId,
  selectedResource,
}: {
  players: typeof stealTargets;
  selectedPlayerId?: number;
  selectedResource?: ResourceType;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const { step, onSelectPlayer, onSelectResource, onBack, onSteal } = useStealResourceDialog({
    players,
    onSteal: () => console.warn('onSteal'),
    onClose: () => setIsOpen(false),
  });

  useEffect(() => {
    if (selectedPlayerId !== undefined) {
      onSelectPlayer(selectedPlayerId);
    }
  }, [selectedPlayerId, onSelectPlayer]);

  useEffect(() => {
    if (selectedResource !== undefined && selectedPlayerId !== undefined) {
      onSelectResource(selectedResource);
    }
  }, [selectedResource, selectedPlayerId, onSelectResource]);

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} variant="outline">
        Reopen dialog
      </Button>
    );
  }

  const close = () => setIsOpen(false);

  return (
    <AlertDialog open={true} onOpenChange={close}>
      <AlertDialogContent className={styles.content}>
        {step.kind === 'player' ? (
          <PlayerSelectionStep options={step.options} onSelectPlayer={onSelectPlayer} onClose={close} />
        ) : (
          <ResourceSelectionStep
            playerName={step.playerName}
            options={step.options}
            canConfirm={step.canConfirm}
            selectedDisplayName={step.options.find((option) => option.isSelected)?.displayName ?? null}
            onSelectResource={onSelectResource}
            onBack={onBack}
            onSteal={onSteal}
          />
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const stealResourceDialogPreview: ComponentPreview = {
  slug: 'steal-resource-dialog',
  title: 'Steal Resource Dialog',
  group: 'Cards',
  states: [
    {
      name: 'Player selection step',
      render: () => (
        <InteractiveStealResourceDialog
          players={stealTargets}
        />
      ),
    },
    {
      name: 'Resource step, all available',
      render: () => (
        <StealResourceDialogAtStep
          players={stealTargets}
          selectedPlayerId={0}
        />
      ),
    },
    {
      name: 'Resource step, one unavailable (0 units)',
      render: () => (
        <StealResourceDialogAtStep
          players={stealTargets}
          selectedPlayerId={1}
        />
      ),
    },
    {
      name: 'Resource selected, ready to steal',
      render: () => (
        <StealResourceDialogAtStep
          players={stealTargets}
          selectedPlayerId={0}
          selectedResource="wood"
        />
      ),
    },
  ],
};
