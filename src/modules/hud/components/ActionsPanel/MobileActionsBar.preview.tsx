import type { ReactNode } from 'react';
import type { ComponentPreview } from '@/testbed';
import { MobileActionsBar } from './MobileActionsBar';
import { WithEventLogBoard, sampleEventLogGameState } from './MobileEventLogSheet.preview';
import {
  myTurnNoSelection,
  armySelectedCanAttack,
  cardActionInProgress,
  extraMoveActive,
  notMyTurn,
} from './ActionsPanel.fixtures';

/** The "Log" button opens the Event Log sheet, which reads the board context, so every state supplies one. */
function WithBoard({ children }: { children: ReactNode }) {
  return <WithEventLogBoard gameState={sampleEventLogGameState}>{children}</WithEventLogBoard>;
}

export const mobileActionsBarPreview: ComponentPreview = {
  slug: 'hud-mobile-actions-bar',
  title: 'Mobile actions bar',
  group: 'HUD',
  states: [
    { name: 'My turn, no selection', render: () => <WithBoard><MobileActionsBar {...myTurnNoSelection} /></WithBoard> },
    { name: 'Army selected, can attack', render: () => <WithBoard><MobileActionsBar {...armySelectedCanAttack} /></WithBoard> },
    { name: 'Card action in progress', render: () => <WithBoard><MobileActionsBar {...cardActionInProgress} /></WithBoard> },
    { name: 'Extra Move active', render: () => <WithBoard><MobileActionsBar {...extraMoveActive} /></WithBoard> },
    { name: 'Not my turn', render: () => <WithBoard><MobileActionsBar {...notMyTurn} /></WithBoard> },
  ],
};
