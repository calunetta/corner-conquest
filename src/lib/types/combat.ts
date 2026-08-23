import { Monster } from './monsters';

export type CombatPhase = 'rolling' | 'results';

export type CombatState = {
  attackerId: number;
  attackingArmyId: number;
  defenderId: number;
  defendingArmyId: number;
  attackerRolls: number[];
  defenderRolls: number[];
  winnerId: number | null;
  phase: CombatPhase;
};

export type MonsterCombatState = {
  attackerId: number;
  attackerPosition: { x: number; y: number };
  monster: Monster;
  attackerRolls: number[];
  monsterRolls: number[];
  winnerId: number | null;
  phase: CombatPhase;
};

export type DeathAnimation = {
  id: string; // "army-playerId-armyId" or "monster-x-y-name"
  x: number;
  y: number;
  sprite: string;
  createdAt?: number;
};
