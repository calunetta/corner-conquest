import type { ComponentPreview } from '@/testbed';
import { GameBoardHeaderView } from './GameBoardHeader';
import {
  waitingCanStartProps,
  waitingCannotStartProps,
  waitingNotHostProps,
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
    { name: 'Waiting – host, can start', render: () => <GameBoardHeaderView {...waitingCanStartProps} /> },
    { name: 'Waiting – host, cannot start', render: () => <GameBoardHeaderView {...waitingCannotStartProps} /> },
    { name: 'Waiting – not host', render: () => <GameBoardHeaderView {...waitingNotHostProps} /> },
    { name: 'Playing – opponent turn', render: () => <GameBoardHeaderView {...playingOpponentTurnProps} /> },
    { name: 'Playing – my turn, expiring', render: () => <GameBoardHeaderView {...playingMyTurnExpiringProps} /> },
    { name: 'Playing – my turn, not expiring', render: () => <GameBoardHeaderView {...playingMyTurnNotExpiringProps} /> },
    { name: 'Playing – with resources', render: () => <GameBoardHeaderView {...playingMyTurnNotExpiringProps} /> },
    { name: 'Exiting', render: () => <GameBoardHeaderView {...exitingProps} /> },
  ],
};
