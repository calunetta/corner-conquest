import { PLAYER_COLORS, PLAYER_DATA } from '@/modules/game-rules';
import type { FactionOption } from './CreateGameDialog.types';

/** One entry per faction, in `PLAYER_COLORS` order, for the faction picker grid. */
export function toFactionOptions(): FactionOption[] {
  return PLAYER_COLORS.map((color) => ({
    color,
    name: PLAYER_DATA[color].name,
    spriteSrc: PLAYER_DATA[color].sprite.idle,
  }));
}
