import { useEffect, useState } from 'react';
import type { Monster } from '@/lib/types';
import {
  MONSTER_ATTACK_CHANCE,
  MONSTER_WANDER_INTERVAL_MS,
  MONSTER_WANDER_OFFSET_RANGE,
} from './LobbyBackground.layout';
import { toLobbyMonsterViewModel } from './LobbyBackground.map';
import { randomWithin } from './LobbyBackground.random';
import type { LobbyMonsterViewModel, MonsterWanderState } from './LobbyBackground.types';

type WanderRoll = { isAttacking: true } | { isAttacking: false; offsetPercent: number };

const INITIAL_WANDER: MonsterWanderState = { isAttacking: false, isFlipped: false, offsetPercent: 0 };

// Random values are drawn here, outside the state updater, so the updater stays pure under StrictMode.
function rollWander(canAttack: boolean): WanderRoll {
  if (canAttack && Math.random() < MONSTER_ATTACK_CHANCE) return { isAttacking: true };

  return { isAttacking: false, offsetPercent: Math.round(randomWithin(MONSTER_WANDER_OFFSET_RANGE)) };
}

function applyWanderRoll(previous: MonsterWanderState, roll: WanderRoll): MonsterWanderState {
  if (roll.isAttacking) return { ...previous, isAttacking: true };

  // Facing flips when the monster steps left, so the sprite always looks where it moves.
  return {
    isAttacking: false,
    isFlipped: roll.offsetPercent < previous.offsetPercent,
    offsetPercent: roll.offsetPercent,
  };
}

/**
 * Lobby-owned copy of the wander behaviour of the real AnimatedMonster hook, so the lobby
 * can be tuned from LobbyBackground.layout.ts without touching game code.
 */
export function useLobbyMonster(monster: Monster): LobbyMonsterViewModel {
  const [wander, setWander] = useState<MonsterWanderState>(INITIAL_WANDER);

  const canAttack = Boolean(monster.sprite.attack);

  useEffect(() => {
    const wanderTimer = setInterval(() => {
      const roll = rollWander(canAttack);
      setWander((previous) => applyWanderRoll(previous, roll));
    }, randomWithin(MONSTER_WANDER_INTERVAL_MS));

    return () => clearInterval(wanderTimer);
  }, [canAttack]);

  return toLobbyMonsterViewModel(monster, wander);
}
