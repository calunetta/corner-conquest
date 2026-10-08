import type { PlayerColor } from '@/lib/types';

/** Text color class for a player's name substring inside a log message. Mirrors PlayerInfo.styles.ts's Record<PlayerColor, string> pattern. */
export const playerTextColors: Record<PlayerColor, string> = {
  blue: 'text-blue-400',
  red: 'text-red-400',
  purple: 'text-purple-400',
  yellow: 'text-yellow-400',
};
