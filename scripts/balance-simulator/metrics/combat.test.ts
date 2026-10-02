import { MonsterName } from '../../../src/lib/types/monsters';
import { attackerWinProbabilityVsMonster } from '../combat-odds';
import { computeM9 } from './combat';
import { events, match, seatFinal, turn } from './test-fixtures';

describe('computeM9', () => {
  it('groups monster fights by (monster, attacker dice) and only reports cells with 30+ attempts', () => {
    const smallCellTurns = Array.from({ length: 10 }, () =>
      turn({ seat: 0, attackPower: 1, events: events({ kind: 'monsterWin', monsterName: MonsterName.Bear, vp: 5 }) }),
    );
    const bigCellTurns = Array.from({ length: 30 }, (_, i) =>
      turn({
        seat: 0,
        attackPower: 2,
        events: events(
          i < 20
            ? { kind: 'monsterWin', monsterName: MonsterName.Ogre, vp: 7 }
            : { kind: 'monsterLoss', monsterName: MonsterName.Ogre },
        ),
      }),
    );
    const results = [match({ turns: [...smallCellTurns, ...bigCellTurns], finalState: [seatFinal()] })];

    const m9 = computeM9(results);

    expect(m9.monsterCells).toHaveLength(1); // the 10-attempt Bear cell is below the 30-attempt threshold
    const [ogreCell] = m9.monsterCells;
    expect(ogreCell.attempts).toBe(30);
    expect(ogreCell.observedWinPct).toBeCloseTo((20 / 30) * 100, 5);
    expect(ogreCell.expectedWinPct).toBeCloseTo(attackerWinProbabilityVsMonster(3, 3) * 100, 5); // AP 2 -> 3 dice; Ogre is level 3
  });

  it('computes a pooled z across every monster fight, win or loss, regardless of cell size', () => {
    const results = [
      match({
        turns: [
          turn({ seat: 0, attackPower: 0, events: events({ kind: 'monsterWin', monsterName: MonsterName.Lancer, vp: 2 }) }),
          turn({ seat: 0, attackPower: 0, events: events({ kind: 'monsterLoss', monsterName: MonsterName.Lancer }) }),
        ],
        finalState: [seatFinal()],
      }),
    ];

    const m9 = computeM9(results);
    expect(m9.pooledZ.expectedWins).toBeCloseTo(attackerWinProbabilityVsMonster(1, 1) * 2, 10);
  });
});
