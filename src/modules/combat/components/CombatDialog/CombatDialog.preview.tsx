'use client';

import type { ComponentPreview } from '@/testbed';
import { CombatDialog } from './CombatDialog';
import {
  rollingPhaseAttackerNoCards,
  rollingPhaseAttackerBothCards,
  rollingPhaseSpectator,
  resultsPhaseAttackerWins,
  resultsPhaseDrawn,
} from './CombatDialog.fixtures';

export const combatDialogPreview: ComponentPreview = {
  slug: 'combat-combat-dialog',
  title: 'Combat Dialog',
  group: 'Combat',
  states: [
    {
      name: 'Rolling — attacker, no cards',
      render: () => (
        <CombatDialog
          gameState={rollingPhaseAttackerNoCards}
          onRoll={(payload) => console.warn('onRoll', payload)}
          onClose={() => console.warn('onClose')}
          isMyTurn={true}
          localPlayerId={0}
        />
      ),
    },
    {
      name: 'Rolling — attacker, both cards',
      render: () => (
        <CombatDialog
          gameState={rollingPhaseAttackerBothCards}
          onRoll={(payload) => console.warn('onRoll', payload)}
          onClose={() => console.warn('onClose')}
          isMyTurn={true}
          localPlayerId={0}
        />
      ),
    },
    {
      name: 'Rolling — spectator waiting',
      render: () => (
        <CombatDialog
          gameState={rollingPhaseSpectator}
          onRoll={(payload) => console.warn('onRoll', payload)}
          onClose={() => console.warn('onClose')}
          isMyTurn={false}
          localPlayerId={1}
        />
      ),
    },
    {
      name: 'Results — attacker wins',
      render: () => (
        <CombatDialog
          gameState={resultsPhaseAttackerWins}
          onRoll={(payload) => console.warn('onRoll', payload)}
          onClose={() => console.warn('onClose')}
          isMyTurn={true}
          localPlayerId={0}
        />
      ),
    },
    {
      name: 'Results — draw',
      render: () => (
        <CombatDialog
          gameState={resultsPhaseDrawn}
          onRoll={(payload) => console.warn('onRoll', payload)}
          onClose={() => console.warn('onClose')}
          isMyTurn={true}
          localPlayerId={0}
        />
      ),
    },
  ],
};
