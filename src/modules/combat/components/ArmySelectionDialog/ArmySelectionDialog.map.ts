import type { Army, ArmySelectionDialogState, Player } from '@/lib/types';
import { toPlayerIdleSprite } from '@/modules/shared';
import type { ArmyOptionViewModel, ArmySelectionViewModel, ArmyStatus } from './ArmySelectionDialog.types';

function toArmyStatus(army: Army, player: Player): ArmyStatus {
  if (army.hasActed) return 'acted';
  const isPositioned = player.positions.some((position) => position.armyId === army.id);
  return isPositioned ? 'positioned' : 'ready';
}

/** Pure. Null exactly when `state` is null. Mirrors legacy ArmySelectionDialog.tsx exactly. */
export function toArmySelectionViewModel(
  state: ArmySelectionDialogState,
  player: Player,
  isMyTurn: boolean,
  selectedArmyId: number | null | undefined,
): ArmySelectionViewModel | null {
  if (!state) return null;

  const armies: ArmyOptionViewModel[] = state.armies.map((army) => ({
    id: army.id,
    status: toArmyStatus(army, player),
    isSelectable: (!army.hasActed || player.hasExtraMove) && isMyTurn,
    isSelected: selectedArmyId === army.id,
    sprite: toPlayerIdleSprite(player.color),
  }));

  return { x: state.x, y: state.y, armies };
}
