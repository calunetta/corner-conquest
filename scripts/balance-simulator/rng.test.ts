import { deriveSeed, withSeededRandom } from './rng';

describe('deriveSeed', () => {
  it('is deterministic for the same parts', () => {
    expect(deriveSeed([1, 2, 'map'])).toBe(deriveSeed([1, 2, 'map']));
  });

  it('differs when any part differs', () => {
    const base = deriveSeed([1, 2, 'map']);
    expect(deriveSeed([1, 2, 'play'])).not.toBe(base);
    expect(deriveSeed([1, 3, 'map'])).not.toBe(base);
    expect(deriveSeed([2, 2, 'map'])).not.toBe(base);
  });

  it('gives map and play seeds independent streams for the same match index', () => {
    const mapSeed = deriveSeed([1, 2, 'on', 0, 'map']);
    const playSeed = deriveSeed([1, 2, 'on', 0, 'play']);
    expect(mapSeed).not.toBe(playSeed);
  });
});

describe('withSeededRandom', () => {
  it('produces the same sequence of values for the same seed', () => {
    const draw = (seed: number) =>
      withSeededRandom(seed, () => [Math.random(), Math.random(), Math.random()]);

    expect(draw(42)).toEqual(draw(42));
  });

  it('produces a different sequence for a different seed', () => {
    const draw = (seed: number) => withSeededRandom(seed, () => Math.random());

    expect(draw(1)).not.toBe(draw(2));
  });

  it('always restores the original Math.random, even if the run throws', () => {
    const originalRandom = Math.random;

    expect(() =>
      withSeededRandom(1, () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect(Math.random).toBe(originalRandom);
  });

  it('produces values in [0, 1), like the real Math.random', () => {
    withSeededRandom(7, () => {
      for (let i = 0; i < 1000; i += 1) {
        const value = Math.random();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });
  });

  it('keeps the seeded generator installed across every await inside an async run, and restores it after', async () => {
    // Regression test: an earlier version restored Math.random as soon as the async callback
    // returned its pending Promise, not once it settled, so a later `await` inside it ran with
    // the real Math.random instead of the seeded one.
    const originalRandom = Math.random;
    const seenDuringRun: number[] = [];

    const draw = (seed: number) =>
      withSeededRandom(seed, async () => {
        seenDuringRun.push(Math.random());
        await Promise.resolve(); // yields, so a broken implementation would restore Math.random here
        seenDuringRun.push(Math.random());
        await new Promise((resolve) => setTimeout(resolve, 0));
        seenDuringRun.push(Math.random());
        return seenDuringRun.length;
      });

    const first = await draw(99);
    const valuesFromFirstRun = [...seenDuringRun];
    seenDuringRun.length = 0;
    const second = await draw(99);

    expect(first).toBe(3);
    expect(second).toBe(3);
    expect(seenDuringRun).toEqual(valuesFromFirstRun); // same seed, same sequence, across every await
    expect(Math.random).toBe(originalRandom); // restored once the async run actually finished
  });
});
