'use client';

import type { ComponentPreview } from '@/testbed';
import { MonsterCombatDialog } from './MonsterCombatDialog';
import {
  attackScreenNoCards,
  attackScreenAllCards,
  resultsPlayerWins,
  resultsMonsterWins,
  spectatorWaiting,
} from './MonsterCombatDialog.fixtures';

export const monsterCombatDialogPreview: ComponentPreview = {
  slug: 'combat-monster-combat-dialog',
  title: 'Monster Combat Dialog',
  group: 'Combat',
  states: [
    {
      name: 'Attack screen — no tactical cards',
      render: () => (
        <MonsterCombatDialog
          gameState={attackScreenNoCards}
          onRoll={(payload) => console.warn('onRoll', payload)}
          onClose={() => console.warn('onClose')}
          onCancel={() => console.warn('onCancel')}
          isMyTurn={true}
          localPlayerId={0}
        />
      ),
    },
    {
      name: 'Attack screen — all three tactical cards available',
      render: () => (
        <MonsterCombatDialog
          gameState={attackScreenAllCards}
          onRoll={(payload) => console.warn('onRoll', payload)}
          onClose={() => console.warn('onClose')}
          onCancel={() => console.warn('onCancel')}
          isMyTurn={true}
          localPlayerId={0}
        />
      ),
    },
    {
      name: 'Results — player wins',
      render: () => (
        <MonsterCombatDialog
          gameState={resultsPlayerWins}
          onRoll={(payload) => console.warn('onRoll', payload)}
          onClose={() => console.warn('onClose')}
          onCancel={() => console.warn('onCancel')}
          isMyTurn={true}
          localPlayerId={0}
        />
      ),
    },
    {
      name: 'Results — monster wins',
      render: () => (
        <MonsterCombatDialog
          gameState={resultsMonsterWins}
          onRoll={(payload) => console.warn('onRoll', payload)}
          onClose={() => console.warn('onClose')}
          onCancel={() => console.warn('onCancel')}
          isMyTurn={true}
          localPlayerId={0}
        />
      ),
    },
    {
      name: 'Spectator — waiting',
      render: () => (
        <MonsterCombatDialog
          gameState={spectatorWaiting}
          onRoll={(payload) => console.warn('onRoll', payload)}
          onClose={() => console.warn('onClose')}
          onCancel={() => console.warn('onCancel')}
          isMyTurn={false}
          localPlayerId={1}
        />
      ),
    },
  ],
};
