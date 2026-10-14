import type { Player, PlayerColor } from '@/lib/types';
import { PLAYER_DATA } from '@/modules/game-rules';
import { toPlayerIdleSprite } from '@/modules/shared';

export interface VictoryViewModel {
  title: 'Victory!' | 'Game Over';
  subtitle: string;
  /** The winner's chosen faction, e.g. "The Legionnaires" (`PLAYER_DATA[color].name`) — the same
   *  name shown in CreateGameDialog's faction picker, not an invented label. */
  commanderLine: string;
  spriteSrc: string;
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
    spriteSrc: toPlayerIdleSprite(winner.color),
    color: winner.color,
    isBot: winner.isBot,
  };
}
