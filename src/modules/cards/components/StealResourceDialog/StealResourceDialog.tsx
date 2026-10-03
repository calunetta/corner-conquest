'use client';

import { AlertDialog, AlertDialogContent } from '@/components/ui/alert-dialog';
import { useStealResourceDialog } from './StealResourceDialog.hook';
import { PlayerSelectionStep } from './PlayerSelectionStep';
import { ResourceSelectionStep } from './ResourceSelectionStep';
import { styles } from './StealResourceDialog.styles';
import type { StealResourceDialogProps } from './StealResourceDialog.types';

export function StealResourceDialog(props: StealResourceDialogProps) {
  const { step, onSelectPlayer, onSelectResource, onBack, onSteal, onClose } = useStealResourceDialog(props);

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className={styles.content}>
        {step.kind === 'player' ? (
          <PlayerSelectionStep options={step.options} onSelectPlayer={onSelectPlayer} onClose={onClose} />
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
