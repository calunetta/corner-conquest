import type { Army, AttackSelectionDialogState } from '@/lib/types';
import { toPlayerIdleSprite } from '@/modules/shared';
import type {
  AttackArmyOptionViewModel,
  AttackSelectionViewModel,
  ArmyStatus,
} from './AttackSelectionDialog.types';

function toArmyStatus(army: Army, defendingPlayerPositions: { armyId: number }[]): ArmyStatus {
  if (army.hasActed) return 'acted';
  const isPositioned = defendingPlayerPositions.some((position) => position.armyId === army.id);
  return isPositioned ? 'positioned' : 'ready';
}

/** Pure. Null exactly when `state` is null. Mirrors legacy AttackSelectionDialog.tsx exactly. */
export function toAttackSelectionViewModel(
  state: AttackSelectionDialogState,
  isMyTurn: boolean,
): AttackSelectionViewModel | null {
  // isMyTurn is part of the contract signature for symmetry with toArmySelectionViewModel,
  // but every army button's disabled state is `!isMyTurn` uniformly here (no per-army
  // exception), so the view reads `props.isMyTurn` directly instead of per-option.
  void isMyTurn;
  if (!state) return null;

  const { armies, defendingPlayer } = state;
  const armyOptions: AttackArmyOptionViewModel[] = armies.map((army) => ({
    id: army.id,
    status: toArmyStatus(army, defendingPlayer.positions),
    sprite: toPlayerIdleSprite(defendingPlayer.color),
  }));

  return { defendingPlayerName: defendingPlayer.name, armies: armyOptions };
}
