import { PlayerColor } from '@/lib/types';

const COLLECTOR_ICON_IDS: Record<PlayerColor, string> = {
  [PlayerColor.Blue]: 'collector-blue',
  [PlayerColor.Red]: 'collector-red',
  [PlayerColor.Purple]: 'collector-purple',
  [PlayerColor.Yellow]: 'collector-yellow',
};

const DEFAULT_COLLECTOR_ICON_ID = 'collector-blue';

/** Registry id of a player color's "army positioned on a resource" collector icon, falling back to blue. */
export function toCollectorIconId(color: PlayerColor): string {
  return COLLECTOR_ICON_IDS[color] || DEFAULT_COLLECTOR_ICON_ID;
}
