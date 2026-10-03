import type { GameState } from '@/lib/types';

/** Starts a player-vs-player or player-vs-monster combat, unchanged from the legacy `attack.ts`. */
export function handleInitiateCombatAction(
  state: GameState,
  payload: {
    attackingArmyId: number;
    target:
      | { type: 'player'; defenderId: number; defendingArmyId: number }
      | { type: 'monster'; monsterName: string };
  },
): GameState {
  const { players, currentPlayerIndex, map, settings } = state;
  const attacker = players[currentPlayerIndex];
  const attackingArmy = attacker.armies.find((a) => a.id === payload.attackingArmyId);

  if (!attackingArmy) throw new Error('Attacking army not found.');
  if (attackingArmy.hasActed && !attacker.hasExtraMove) {
    throw new Error('This army has already acted this turn.');
  }

  if (payload.target.type === 'player') {
    const { defenderId, defendingArmyId } = payload.target;
    state.combatState = {
      attackerId: attacker.id,
      attackingArmyId: attackingArmy.id,
      defenderId,
      defendingArmyId,
      attackerRolls: [],
      defenderRolls: [],
      winnerId: null,
      phase: 'rolling',
    };
  } else {
    const { monsterName } = payload.target;
    const currentTile = map[attackingArmy.position.y * settings.gridSize.cols + attackingArmy.position.x];
    const monster = currentTile.monsters?.find((m) => m.name === monsterName);
    if (!monster) throw new Error('Target monster not found on tile.');

    state.monsterCombatState = {
      attackerId: attacker.id,
      attackerPosition: attackingArmy.position,
      monster,
      attackerRolls: [],
      monsterRolls: [],
      winnerId: null,
      phase: 'rolling',
    };
  }

  return state;
}
