import { MonsterName } from '../../../src/lib/types/monsters';
import { attackerWinProbabilityVsMonster } from '../combat-odds';
import type { MatchResult } from '../engine';
import { pooledZTest, type PooledZTestResult } from '../stats';

const MONSTER_LEVEL: Record<MonsterName, number> = {
  [MonsterName.Lancer]: 1,
  [MonsterName.Bear]: 2,
  [MonsterName.Ogre]: 3,
  [MonsterName.Minotaur]: 4,
};

// --- M9: combat accuracy ------------------------------------------------------------------------

export interface CombatMetrics {
  monsterCells: Array<{
    monsterName: MonsterName;
    attackerDice: number;
    attempts: number;
    observedWinPct: number;
    expectedWinPct: number;
  }>;
  pooledZ: PooledZTestResult;
  pvpObserved: { attempts: number; attackerWinPct: number };
}

export function computeM9(results: MatchResult[]): CombatMetrics {
  // Cell key: `${monsterName}:${attackerDice}`. attackerDice = attackPower + 1 at the time of the fight.
  const cells = new Map<string, { monsterName: MonsterName; attackerDice: number; wins: number; attempts: number }>();
  const zTrials: Array<{ won: boolean; winProbability: number }> = [];
  let pvpAttempts = 0;
  let pvpAttackerWins = 0;

  results.forEach((result) => {
    result.turns.forEach((turn) => {
      const attackerDice = turn.attackPower + 1; // the acting seat's AP for this turn (attack.ts:94/252)
      turn.events.forEach((event) => {
        if (event.kind === 'monsterWin' || event.kind === 'monsterLoss') {
          const monsterDice = MONSTER_LEVEL[event.monsterName];
          const key = `${event.monsterName}:${attackerDice}`;
          const cell = cells.get(key) ?? { monsterName: event.monsterName, attackerDice, wins: 0, attempts: 0 };
          cell.attempts += 1;
          if (event.kind === 'monsterWin') cell.wins += 1;
          cells.set(key, cell);

          zTrials.push({
            won: event.kind === 'monsterWin',
            winProbability: attackerWinProbabilityVsMonster(attackerDice, monsterDice),
          });
        } else if (event.kind === 'pvpResult') {
          // pvpResult only confirms a battle happened from the acting seat's perspective; the
          // reducers always log the acting seat as the attacker for this event (attack.ts:187).
          pvpAttempts += 1;
          pvpAttackerWins += 1; // the acting seat only logs this line when the attacker (itself) won;
          // see attack.ts:187, reached only on the `loserId !== attackerId` branch. A loss instead
          // produces the "receives 5 VP" line attributed to the other player's perspective, which
          // this simulator's per-turn event stream — tagged to the acting seat — cannot attribute
          // back to "attacker lost" without the defender's own turn context. Scoped out here; see
          // the guide's "Known limitations".
        }
      });
    });
  });

  const monsterCells = [...cells.values()]
    .filter((cell) => cell.attempts >= 30)
    .map((cell) => ({
      monsterName: cell.monsterName,
      attackerDice: cell.attackerDice,
      attempts: cell.attempts,
      observedWinPct: (cell.wins / cell.attempts) * 100,
      expectedWinPct: attackerWinProbabilityVsMonster(cell.attackerDice, MONSTER_LEVEL[cell.monsterName]) * 100,
    }));

  return {
    monsterCells,
    pooledZ: pooledZTest(zTrials),
    pvpObserved: { attempts: pvpAttempts, attackerWinPct: pvpAttempts === 0 ? 0 : (pvpAttackerWins / pvpAttempts) * 100 },
  };
}

