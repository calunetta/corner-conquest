import type { Player, PlayerColor } from '@/lib/types';
import { AVATAR_CATALOG, isValidAvatarId } from '@/modules/avatars';
import { PLAYER_DATA } from '@/modules/game-rules';
import { toArmyIconId } from '@/modules/shared';

export interface VictoryViewModel {
  title: 'Victory!' | 'Game Over';
  subtitle: string;
  /** The winner's chosen faction, e.g. "The Legionnaires" (`PLAYER_DATA[color].name`) — the same
   *  name shown in CreateGameDialog's faction picker, not an invented label. */
  commanderLine: string;
  /** Registry army icon id, shown when the winner has no chosen avatar. */
  iconId: string;
  /** The chosen avatar image; null when the winner has no valid avatar, so the view shows iconId. */
  avatarSrc: string | null;
  color: PlayerColor;
  isBot: boolean;
}

const VICTORY_TITLE = 'Victory!';
const GAME_OVER_TITLE = 'Game Over';

/** Pure: no React, no I/O. */
export function toVictoryViewModel(winner: Player, isLocalWinner: boolean): VictoryViewModel {
  const reachedGoal = `reached ${winner.victoryPoints} Victory Points and conquered the archipelago.`;

  return {
    title: isLocalWinner ? VICTORY_TITLE : GAME_OVER_TITLE,
    subtitle: isLocalWinner ? `You ${reachedGoal}` : `${winner.name} ${reachedGoal}`,
    commanderLine: PLAYER_DATA[winner.color].name,
    iconId: toArmyIconId(winner.color),
    avatarSrc: isValidAvatarId(winner.avatarId) ? AVATAR_CATALOG[winner.avatarId].src : null,
    color: winner.color,
    isBot: winner.isBot,
  };
}
