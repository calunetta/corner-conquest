import type { ComponentPreview } from '@/testbed';
import { GameStatusBadgeView } from './GameStatusBadge';
import {
  waitingViewModel,
  playingMyTurnNotExpiringViewModel,
  playingMyTurnExpiringViewModel,
  playingOpponentTurnViewModel,
} from './GameStatusBadge.fixtures';

export const gameStatusBadgePreview: ComponentPreview = {
  slug: 'hud-game-status-badge',
  title: 'Game status badge',
  group: 'HUD',
  states: [
    { name: 'Waiting', render: () => <GameStatusBadgeView {...waitingViewModel} /> },
    { name: 'Playing – my turn', render: () => <GameStatusBadgeView {...playingMyTurnNotExpiringViewModel} /> },
    { name: 'Playing – my turn expiring', render: () => <GameStatusBadgeView {...playingMyTurnExpiringViewModel} /> },
    { name: 'Playing – opponent turn', render: () => <GameStatusBadgeView {...playingOpponentTurnViewModel} /> },
  ],
};
