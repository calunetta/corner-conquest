import type { ComponentPreview } from '@/testbed';
import { MobileActionsBar } from './MobileActionsBar';
import {
  myTurnNoSelection,
  armySelectedCanAttack,
  cardActionInProgress,
  extraMoveActive,
  notMyTurn,
} from './ActionsPanel.fixtures';

export const mobileActionsBarPreview: ComponentPreview = {
  slug: 'hud-mobile-actions-bar',
  title: 'Mobile actions bar',
  group: 'HUD',
  states: [
    { name: 'My turn, no selection', render: () => <MobileActionsBar {...myTurnNoSelection} /> },
    { name: 'Army selected, can attack', render: () => <MobileActionsBar {...armySelectedCanAttack} /> },
    { name: 'Card action in progress', render: () => <MobileActionsBar {...cardActionInProgress} /> },
    { name: 'Extra Move active', render: () => <MobileActionsBar {...extraMoveActive} /> },
    { name: 'Not my turn', render: () => <MobileActionsBar {...notMyTurn} /> },
  ],
};
