'use client';

import { useState } from 'react';
import type { ComponentPreview } from '@/testbed';
import { Button } from '@/components/ui/button';
import { AbilitiesDialog } from './AbilitiesDialog';
import {
  gameStateWithAffordableAbilities,
  playerWhoCanAffordAbilities,
  playerWithExplorerAndNoGold,
  playerWithExplorerAndCanAffordCollector,
  gameStateNotMyTurn,
} from './AbilitiesDialog.fixtures';

/**
 * Wired to local state so the dialog can always be closed and reopened.
 */
function InteractiveAbilitiesDialog(
  props: Omit<React.ComponentProps<typeof AbilitiesDialog>, 'onClose'>,
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

  return <AbilitiesDialog {...props} onClose={close} />;
}

export const abilitiesDialogPreview: ComponentPreview = {
  slug: 'cards-abilities-dialog',
  title: 'Abilities Dialog',
  group: 'Cards',
  states: [
    {
      name: 'Neither ability owned, can afford both',
      render: () => (
        <InteractiveAbilitiesDialog
          player={playerWhoCanAffordAbilities}
          gameState={gameStateWithAffordableAbilities}
          onBuyAbility={() => console.warn('onBuyAbility')}
          isMyTurn={true}
        />
      ),
    },
    {
      name: 'Neither owned, cannot afford',
      render: () => (
        <InteractiveAbilitiesDialog
          player={playerWithExplorerAndNoGold}
          gameState={gameStateWithAffordableAbilities}
          onBuyAbility={() => console.warn('onBuyAbility')}
          isMyTurn={true}
        />
      ),
    },
    {
      name: 'One owned, one buyable',
      render: () => (
        <InteractiveAbilitiesDialog
          player={playerWithExplorerAndCanAffordCollector}
          gameState={gameStateWithAffordableAbilities}
          onBuyAbility={() => console.warn('onBuyAbility')}
          isMyTurn={true}
        />
      ),
    },
    {
      name: 'Not my turn (no buy buttons)',
      render: () => (
        <InteractiveAbilitiesDialog
          player={playerWhoCanAffordAbilities}
          gameState={gameStateNotMyTurn}
          onBuyAbility={() => console.warn('onBuyAbility')}
          isMyTurn={false}
        />
      ),
    },
  ],
};
