import type { ComponentPreview } from '@/testbed';
import { GameBoardHeaderView } from './GameBoardHeader';
import {
  waitingCanStartProps,
  waitingCannotStartProps,
  playingMyTurnNotExpiringProps,
  playingMyTurnExpiringProps,
  playingOpponentTurnProps,
  exitingProps,
} from './GameBoardHeader.fixtures';

export const gameBoardHeaderPreview: ComponentPreview = {
  slug: 'hud-game-board-header',
  title: 'Game board header',
  group: 'HUD',
  states: [
    { name: 'Waiting – can start', render: () => <GameBoardHeaderView {...waitingCanStartProps} /> },
    { name: 'Waiting – cannot start', render: () => <GameBoardHeaderView {...waitingCannotStartProps} /> },
    { name: 'Playing – my turn', render: () => <GameBoardHeaderView {...playingMyTurnNotExpiringProps} /> },
    { name: 'Playing – my turn expiring', render: () => <GameBoardHeaderView {...playingMyTurnExpiringProps} /> },
    { name: 'Playing – opponent turn', render: () => <GameBoardHeaderView {...playingOpponentTurnProps} /> },
    { name: 'Exiting', render: () => <GameBoardHeaderView {...exitingProps} /> },
  ],
};
