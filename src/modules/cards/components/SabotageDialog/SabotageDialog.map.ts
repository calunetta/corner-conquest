import type { Player } from '@/lib/types';
import { toPlayerIdleSprite } from '@/modules/shared';
import type { SabotageDialogViewModel } from './SabotageDialog.types';

/** Pure. Mirrors legacy SabotageDialog.tsx's derived data exactly. */
export function toSabotageDialogViewModel(players: Player[]): SabotageDialogViewModel {
  return {
    targets: players.map((player) => ({
      id: player.id,
      name: player.name,
      sprite: toPlayerIdleSprite(player.color),
    })),
  };
}
