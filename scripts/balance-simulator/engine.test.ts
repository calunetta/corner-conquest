import { deriveMatchSeeds, runMatch } from './engine';

jest.setTimeout(30000);

describe('deriveMatchSeeds', () => {
  it('gives independent map and play seeds', () => {
    const seeds = deriveMatchSeeds(1, 2, true, 0);
    expect(seeds.mapSeed).not.toBe(seeds.playSeed);
  });

  it('is deterministic for the same inputs', () => {
    expect(deriveMatchSeeds(1, 2, true, 0)).toEqual(deriveMatchSeeds(1, 2, true, 0));
  });

  it('differs between fog on and fog off for the same run', () => {
    expect(deriveMatchSeeds(1, 2, true, 0)).not.toEqual(deriveMatchSeeds(1, 2, false, 0));
  });
});

describe('runMatch', () => {
  it('plays a 2-bot match to completion or a round cap, writing no real Firestore data', async () => {
    const seeds = deriveMatchSeeds(1, 2, true, 0);
    const result = await runMatch({ players: 2, fog: true, maxRounds: 150, ...seeds });

    expect(['finished', 'capped']).toContain(result.outcome);
    expect(result.botTurns).toBeGreaterThan(0);
    expect(result.finalState).toHaveLength(2);
    if (result.outcome === 'finished') {
      expect(result.winnerSeat).not.toBeNull();
      expect([0, 1]).toContain(result.winnerSeat);
    } else {
      expect(result.winnerSeat).toBeNull();
    }
  });

  it('is deterministic: identical config produces an identical result', async () => {
    const seeds = deriveMatchSeeds(7, 3, false, 2);
    const config = { players: 3, fog: false, maxRounds: 40, ...seeds };

    const first = await runMatch(config);
    const second = await runMatch(config);

    expect(second).toEqual(first);
  });

  it('caps a match that cannot finish within maxRounds', async () => {
    const seeds = deriveMatchSeeds(1, 2, true, 0);
    const result = await runMatch({ players: 2, fog: true, maxRounds: 1, ...seeds });

    expect(result.outcome).toBe('capped');
    expect(result.rounds).toBeLessThanOrEqual(2); // the loop may finish round 1 before re-checking the cap
    expect(result.winnerSeat).toBeNull();
  });

  it('records a snapshot for every bot turn, each tagged with its acting seat', async () => {
    const seeds = deriveMatchSeeds(3, 2, true, 0);
    const result = await runMatch({ players: 2, fog: true, maxRounds: 10, ...seeds });

    expect(result.turns.length).toBe(result.botTurns);
    result.turns.forEach((turn) => {
      expect([0, 1]).toContain(turn.seat);
      expect(turn.round).toBeGreaterThanOrEqual(1);
    });
  });
});
