import type { ComponentPreview } from '@/testbed';
import { PlayerInfoView } from './PlayerInfo';
import { currentPlayerWithBuffs, botPlayerNoBuffs, playerNearGoal } from './PlayerInfo.fixtures';

export const playerInfoPreview: ComponentPreview = {
  slug: 'hud-player-info',
  title: 'Player info',
  group: 'HUD',
  states: [
    { name: 'Current player with buffs', render: () => <PlayerInfoView {...currentPlayerWithBuffs} /> },
    { name: 'Bot player, no buffs', render: () => <PlayerInfoView {...botPlayerNoBuffs} /> },
    { name: 'Near victory goal', render: () => <PlayerInfoView {...playerNearGoal} /> },
    {
      name: 'Non-current player (no turn badge)',
      render: () => <PlayerInfoView {...{ ...currentPlayerWithBuffs, isCurrentPlayer: false, turnBadge: null }} />,
    },
  ],
};
