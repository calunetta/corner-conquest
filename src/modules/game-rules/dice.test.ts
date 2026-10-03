import { rollDice } from './dice';

describe('rollDice', () => {
  it.each([
    ['zero count clamps to 1 die', 0, 1],
    ['negative count clamps to 1 die', -1, 1],
    ['positive count returns that many dice', 3, 3],
  ])('%s', (_label, count, expectedLength) => {
    expect(rollDice(count)).toHaveLength(expectedLength);
  });

  it('every rolled value is between 1 and 6 inclusive', () => {
    const rolls = rollDice(50);
    rolls.forEach((value) => {
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    });
  });

  it('maps Math.random() === 0 to a roll of 1 (lower boundary)', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(rollDice(1)).toEqual([1]);
    jest.spyOn(Math, 'random').mockRestore();
  });

  it('maps Math.random() just under 1 to a roll of 6 (upper boundary)', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9999);
    expect(rollDice(1)).toEqual([6]);
    jest.spyOn(Math, 'random').mockRestore();
  });
});
