import type { PlayerColor } from '@/lib/types';
import { PLAYER_DATA } from '@/modules/game-rules';

const DEFAULT_IDLE_SPRITE = '/sprites/blue_idle.gif';

/**
 * A player color's idle sprite, falling back to the blue idle sprite when the
 * color has no entry. Mirrors the 4 duplicated call sites this replaces
 * (ArmySelectionDialog, AttackSelectionDialog, SabotageDialog, StealResourceDialog).
 */
export function toPlayerIdleSprite(color: PlayerColor): string {
  return PLAYER_DATA[color]?.sprite.idle || DEFAULT_IDLE_SPRITE;
}
