import { PlayerColor } from '@/lib/types';

const COLLECTOR_IDLE_SPRITES: Record<PlayerColor, string> = {
  [PlayerColor.Blue]: '/sprites/collector_blue_idle.gif',
  [PlayerColor.Red]: '/sprites/collector_red_idle.gif',
  [PlayerColor.Purple]: '/sprites/collector_purple_idle.gif',
  [PlayerColor.Yellow]: '/sprites/collector_yellow_idle.gif',
};

const DEFAULT_COLLECTOR_IDLE_SPRITE = '/sprites/collector_blue_idle.gif';

/** A player color's "army positioned on a resource" collector sprite, falling back to blue. */
export function toCollectorIdleSprite(color: PlayerColor): string {
  return COLLECTOR_IDLE_SPRITES[color] || DEFAULT_COLLECTOR_IDLE_SPRITE;
}
