import type { ComponentPreview } from '@/testbed';
import { RESOURCE_GAIN_SPRITES } from '@/modules/shared';
import { PlayerInfoView } from './PlayerInfo';
import { currentPlayerWithBuffs, botPlayerNoBuffs, playerNearGoal } from './PlayerInfo.fixtures';
import type { PlayerInfoViewModel } from './PlayerInfo.types';

/** Same card as "Current player with buffs", with only Gold's chip mid-gain-animation. The
 *  reduced-motion fallback (ring instead of GIF) is CSS-only, so check it by setting the OS or
 *  DevTools "prefers-reduced-motion: reduce" emulation; no separate forced state exists. */
const currentPlayerGoldGainActive: PlayerInfoViewModel = {
  ...currentPlayerWithBuffs,
  resources: currentPlayerWithBuffs.resources.map((resource) =>
    resource.type === 'gold'
      ? { ...resource, gainPulse: { token: 1, spriteSrc: RESOURCE_GAIN_SPRITES.gold } }
      : resource,
  ),
};

export const playerInfoPreview: ComponentPreview = {
  slug: 'hud-player-info',
  title: 'Player info',
  group: 'HUD',
  states: [
    { name: 'Current player with buffs', render: () => <PlayerInfoView {...currentPlayerWithBuffs} /> },
    { name: 'Gold gain active', render: () => <PlayerInfoView {...currentPlayerGoldGainActive} /> },
    { name: 'Bot player, no buffs', render: () => <PlayerInfoView {...botPlayerNoBuffs} /> },
    { name: 'Near victory goal', render: () => <PlayerInfoView {...playerNearGoal} /> },
    {
      name: 'Non-current player (no turn badge)',
      render: () => <PlayerInfoView {...{ ...currentPlayerWithBuffs, isCurrentPlayer: false, turnBadge: null }} />,
    },
  ],
};
