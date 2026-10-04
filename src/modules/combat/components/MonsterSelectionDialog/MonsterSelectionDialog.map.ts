import type { MonsterSelectionDialogState } from '@/lib/types';
import type { MonsterSelectionViewModel } from './MonsterSelectionDialog.types';

/** Pure. Null exactly when `state` is null. Mirrors legacy MonsterSelectionDialog.tsx exactly. */
export function toMonsterSelectionViewModel(
  state: MonsterSelectionDialogState,
): MonsterSelectionViewModel | null {
  if (!state) return null;

  return {
    monsters: state.monsters.map((monster) => ({
      name: monster.name,
      sprite: monster.sprite.idle,
      label: `${monster.name} (Lvl ${monster.level})`,
      powerLabel: `Power: ${monster.level} Dice`,
    })),
  };
}
