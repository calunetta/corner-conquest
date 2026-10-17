import type { GameSettings, Player } from '@/lib/types';
import { AVATAR_CATALOG, isValidAvatarId } from '@/modules/avatars';
import type { SettingsSummaryRow } from './LobbyGameRow.types';

const PERCENT_MULTIPLIER = 100;

/** Same order and labels as the legacy SettingsDisplay. */
export function toSettingsSummaryRows(settings: GameSettings): SettingsSummaryRow[] {
  return [
    { label: 'Victory Point Goal', value: String(settings.victoryPointGoal) },
    { label: 'Fog of War', value: settings.fogOfWar ? 'Enabled' : 'Disabled' },
    { label: 'Resource Density', value: `${Math.round(settings.resourceDensity * PERCENT_MULTIPLIER)}%` },
    { label: 'VP per Discovery', value: String(settings.vpPerIslandDiscovery) },
    { label: 'Initial Deploy Cost', value: String(settings.initialDeployCost) },
    { label: 'Upgrade Cost', value: String(settings.upgradeCost) },
    { label: 'Ability Cost', value: String(settings.abilityCost) },
  ];
}

export interface PlayerAvatarViewModel {
  playerId: string;
  name: string;
  color: Player['color'];
  /** null => render the AvatarFallback letter. */
  avatarSrc: string | null;
}

export function toPlayerAvatars(players: Player[]): PlayerAvatarViewModel[] {
  return players.map((player) => ({
    playerId: player.playerId,
    name: player.name,
    color: player.color,
    avatarSrc: isValidAvatarId(player.avatarId) ? AVATAR_CATALOG[player.avatarId].src : null,
  }));
}
