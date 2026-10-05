import { Bot, Crown, Swords, Users } from 'lucide-react';
import { PLAYER_COLORS, PLAYER_DATA } from '@/modules/game-rules';
import type { FactionOption, FormatOption } from './CreateGameDialog.types';

/** One entry per faction, in `PLAYER_COLORS` order, for the faction picker grid. */
export function toFactionOptions(): FactionOption[] {
  return PLAYER_COLORS.map((color) => ({
    color,
    name: PLAYER_DATA[color].name,
    spriteSrc: PLAYER_DATA[color].sprite.idle,
  }));
}

/** Match format options for the 2x2 card grid. Values: 1 (solo), 2 (duel), 3 (skirmish), 4 (conquest). */
export function toFormatOptions(): FormatOption[] {
  return [
    {
      value: 1,
      title: 'Solo vs. Bot AI',
      meta: 'Training match',
      icon: Bot,
    },
    {
      value: 2,
      title: '2 Players',
      meta: '1v1 Duel',
      icon: Swords,
    },
    {
      value: 3,
      title: '3 Players',
      meta: 'Archipelago Skirmish',
      icon: Users,
    },
    {
      value: 4,
      title: '4 Players',
      meta: 'Grand Conquest',
      icon: Crown,
    },
  ];
}
