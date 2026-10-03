'use client';

import { useState } from 'react';
import type { ComponentPreview } from '@/testbed';
import { Button } from '@/components/ui/button';
import { CardsDialog } from './CardsDialog';
import { playerWithNoCards, playerWithSeveralCards, playerWhoUsedACardThisTurn } from './CardsDialog.fixtures';

/**
 * Wired to local state so the dialog can always be closed and reopened.
 * The dialog's AlertDialog handles the close callback.
 */
function InteractiveCardsDialog(
  props: Omit<React.ComponentProps<typeof CardsDialog>, 'onClose'>,
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

  return <CardsDialog {...props} onClose={close} />;
}

export const cardsDialogPreview: ComponentPreview = {
  slug: 'cards-cards-dialog',
  title: 'Cards Dialog',
  group: 'Cards',
  states: [
    {
      name: 'No cards',
      render: () => (
        <InteractiveCardsDialog
          player={playerWithNoCards}
          onUseCard={() => console.warn('onUseCard')}
          canUseCards={true}
        />
      ),
    },
    {
      name: 'Several cards, none usable',
      render: () => (
        <InteractiveCardsDialog
          player={playerWithSeveralCards}
          onUseCard={() => console.warn('onUseCard')}
          canUseCards={false}
        />
      ),
    },
    {
      name: 'Usable cards, can use',
      render: () => (
        <InteractiveCardsDialog
          player={playerWithSeveralCards}
          onUseCard={() => console.warn('onUseCard')}
          canUseCards={true}
        />
      ),
    },
    {
      name: 'Usable cards, already used one this turn',
      render: () => (
        <InteractiveCardsDialog
          player={playerWhoUsedACardThisTurn}
          onUseCard={() => console.warn('onUseCard')}
          canUseCards={true}
        />
      ),
    },
  ],
};
