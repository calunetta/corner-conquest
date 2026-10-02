'use client';

import { useState } from 'react';
import { SabotageDialog } from '@/features/game/dialogs/SabotageDialog';
import { PlayerColor, type Player } from '@/lib/types';
import { Button } from '@/components/ui/button';
import type { ComponentPreview } from '../testbed.types';

function createFixturePlayer(
  id: number,
  name: string,
  color: (typeof PlayerColor)[keyof typeof PlayerColor],
): Player {
  return {
    id,
    playerId: `fixture-player-${id}`,
    name,
    color,
    isBot: false,
    armies: [],
    resources: { food: 0, wood: 0, gold: 0 },
    armyCount: 1,
    attackPower: 0,
    nextArmyCost: 6,
    victoryPoints: 0,
    specialCards: [],
    positions: [],
    hasExtraMove: false,
    actionsThisTurn: [],
    passiveAbilities: {},
    isSabotaged: false,
    reinforceActive: false,
    efficientActive: false,
    masterBuilderActive: false,
    revealedTiles: [],
  } as Player;
}

/** Wired to local state, so the dialog can actually be opened and closed. */
function InteractiveSabotageDialog({ players }: { players: Player[] }) {
  const [isOpen, setIsOpen] = useState(true);

  const handleSabotage = () => {
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      {isOpen ? (
        <SabotageDialog
          players={players}
          onSabotage={handleSabotage}
          onClose={handleClose}
        />
      ) : (
        <Button onClick={() => setIsOpen(true)} variant="outline">
          Reopen dialog
        </Button>
      )}
    </div>
  );
}

export const sabotageDialogPreview: ComponentPreview = {
  slug: 'sabotage-dialog',
  title: 'Sabotage Dialog',
  group: 'Legacy / Dialogs',
  states: [
    {
      name: 'Two opponents',
      render: () => (
        <InteractiveSabotageDialog
          players={[
            createFixturePlayer(1, 'Red Player', PlayerColor.Red),
            createFixturePlayer(2, 'Purple Player', PlayerColor.Purple),
          ]}
        />
      ),
    },
    {
      name: 'Full grid (4 opponents)',
      render: () => (
        <InteractiveSabotageDialog
          players={[
            createFixturePlayer(1, 'Red', PlayerColor.Red),
            createFixturePlayer(2, 'Blue', PlayerColor.Blue),
            createFixturePlayer(3, 'Purple', PlayerColor.Purple),
            createFixturePlayer(4, 'Yellow', PlayerColor.Yellow),
          ]}
        />
      ),
    },
    {
      name: 'Long player name truncation',
      render: () => (
        <InteractiveSabotageDialog
          players={[
            createFixturePlayer(
              1,
              'CommanderWithAVeryLongNameThatShouldTruncate',
              PlayerColor.Red,
            ),
            createFixturePlayer(2, 'Short', PlayerColor.Blue),
            createFixturePlayer(
              3,
              'AnotherPlayerWithAnExtremelyLongNameForTruncationTesting',
              PlayerColor.Purple,
            ),
          ]}
        />
      ),
    },
  ],
};
