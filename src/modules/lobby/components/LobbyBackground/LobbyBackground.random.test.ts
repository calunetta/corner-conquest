import { randomWithin } from './LobbyBackground.random';

describe('randomWithin', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    { draw: 0, range: { min: 3000, max: 5500 }, expected: 3000 },
    { draw: 0.5, range: { min: 3000, max: 5500 }, expected: 4250 },
    { draw: 0, range: { min: -15, max: 15 }, expected: -15 },
    { draw: 0.5, range: { min: -15, max: 15 }, expected: 0 },
    { draw: 0.25, range: { min: 0.6, max: 1 }, expected: 0.7 },
  ])('maps a draw of $draw onto the range $range.min..$range.max as $expected', ({ draw, range, expected }) => {
    jest.spyOn(Math, 'random').mockReturnValue(draw);

    expect(randomWithin(range)).toBeCloseTo(expected, 10);
  });

  it('returns the minimum for a zero-width range whatever the draw', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9);

    expect(randomWithin({ min: 7, max: 7 })).toBe(7);
  });

  it('stays inside the range for draws at the lower edge of Math.random', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0);
    const range = { min: -15, max: 15 };

    const value = randomWithin(range);

    expect(value).toBeGreaterThanOrEqual(range.min);
    expect(value).toBeLessThanOrEqual(range.max);
  });
});
