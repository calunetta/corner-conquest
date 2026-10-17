import { PlayerColor } from '@/lib/types';

const ARMY_ICON_IDS: Record<PlayerColor, string> = {
  [PlayerColor.Blue]: 'army-blue',
  [PlayerColor.Red]: 'army-red',
  [PlayerColor.Purple]: 'army-purple',
  [PlayerColor.Yellow]: 'army-yellow',
};

const DEFAULT_ARMY_ICON_ID = 'army-blue';

/** Registry id of a player color's army (idle) icon, falling back to blue. */
export function toArmyIconId(color: PlayerColor): string {
  return ARMY_ICON_IDS[color] || DEFAULT_ARMY_ICON_ID;
}
