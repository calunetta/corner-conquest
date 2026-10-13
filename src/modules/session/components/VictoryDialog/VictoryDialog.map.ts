import type { Player, PlayerColor } from '@/lib/types';
import { toPlayerIdleSprite } from '@/modules/shared';

export interface VictoryViewModel {
  title: 'Victory!' | 'Game Over';
  subtitle: string;
  /** e.g. "blue Commander". Rendered with the `capitalize` Tailwind class, not title-cased here. */
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
    commanderLine: `${winner.color} Commander`,
    spriteSrc: toPlayerIdleSprite(winner.color),
    color: winner.color,
    isBot: winner.isBot,
  };
}
