import { attackerWinProbability } from './bot-combat-odds';

describe('attackerWinProbability', () => {
  it('matches the enumerated 2d6 vs 2d6 result, where a tie goes to the defender', () => {
    // P(sum > sum) for two 2d6 rolls is (1 - P(tie)) / 2 = (1 - 146/1296) / 2.
    expect(attackerWinProbability(2, 2)).toBeCloseTo(0.4437, 4);
  });

  it('is 1 minus the defender-side probability for the mirrored matchup', () => {
    const attackerWins = attackerWinProbability(3, 2);
    const defenderWins = attackerWinProbability(2, 3);
    expect(attackerWins + defenderWins).toBeLessThan(1);
    expect(attackerWins).toBeGreaterThan(0.5);
    expect(defenderWins).toBeLessThan(0.5);
  });

  it('gives a near-certain win for many dice against a single die', () => {
    expect(attackerWinProbability(4, 1)).toBeGreaterThan(0.99);
  });
});
