import type { ComponentPreview } from '@/testbed';
import { ActionsPanelView } from './ActionsPanel';
import { myTurnNoSelection, armySelectedCanAttack, cardActionInProgress, extraMoveActive } from './ActionsPanel.fixtures';

export const actionsPanelPreview: ComponentPreview = {
  slug: 'hud-actions-panel',
  title: 'Actions panel',
  group: 'HUD',
  states: [
    { name: 'My turn, no selection', render: () => <ActionsPanelView {...myTurnNoSelection} /> },
    { name: 'Army selected, can attack', render: () => <ActionsPanelView {...armySelectedCanAttack} /> },
    { name: 'Card action in progress', render: () => <ActionsPanelView {...cardActionInProgress} /> },
    { name: 'Extra Move active', render: () => <ActionsPanelView {...extraMoveActive} /> },
  ],
};
