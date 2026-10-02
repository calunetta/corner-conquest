import {
  attackerWinProbabilityVsMonster,
  attackerWinProbabilityVsPlayer,
  tieProbability,
} from './combat-odds';

describe('combat odds (1 die vs 1 die, hand-enumerated: 36 equally likely outcomes)', () => {
  // win=15/36, tie=6/36, lose=15/36
  it('matches the enumerated tie probability', () => {
    expect(tieProbability(1, 1)).toBeCloseTo(6 / 36, 10);
  });

  it('vs monster: ties go to the monster, so the attacker only wins strict majorities', () => {
    expect(attackerWinProbabilityVsMonster(1, 1)).toBeCloseTo(15 / 36, 10);
  });

  it('vs player: ties go to the defender, so the attacker also only wins strict majorities', () => {
    expect(attackerWinProbabilityVsPlayer(1, 1)).toBeCloseTo(15 / 36, 10);
  });
});

describe('combat odds (2 dice vs 1 die, hand-enumerated: 216 equally likely outcomes)', () => {
  // win=181/216, tie=15/216, lose=20/216
  it('matches the enumerated win probability', () => {
    expect(attackerWinProbabilityVsMonster(2, 1)).toBeCloseTo(181 / 216, 10);
  });
});

describe('symmetry and sanity', () => {
  it('an attacker with far more dice almost always wins', () => {
    expect(attackerWinProbabilityVsMonster(5, 1)).toBeGreaterThan(0.99);
  });

  it('an attacker with zero dice (sum is always 0) can only win vs a weaker side, never tie-break in its favor', () => {
    expect(attackerWinProbabilityVsMonster(0, 1)).toBe(0);
  });

  it('win + loss-or-tie-to-defender probabilities sum to 1 for a symmetric matchup', () => {
    const attackerWins = attackerWinProbabilityVsPlayer(3, 3);
    const tie = tieProbability(3, 3);
    // By symmetry, P(attacker < defender) must equal P(attacker wins), since the dice are identical.
    expect(attackerWins * 2 + tie).toBeCloseTo(1, 10);
  });

  it('caches repeated dice-count lookups without changing the result', () => {
    const first = attackerWinProbabilityVsMonster(3, 2);
    const second = attackerWinProbabilityVsMonster(3, 2);
    expect(second).toBe(first);
  });
});
