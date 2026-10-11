import { computeAnomalies } from './anomalies';
import { match, seatFinal, turn } from './test-fixtures';

describe('computeAnomalies', () => {
  it('returns all-zero metrics and no rows for zero matches', () => {
    expect(computeAnomalies([])).toEqual({
      totalAnomalies: 0,
      matchesWithAnomalies: 0,
      totalMatches: 0,
      byMessage: [],
    });
  });

  it('returns zero anomalies for matches whose turns all have an empty anomalies array', () => {
    const results = [
      match({ turns: [turn({ seat: 0 }), turn({ seat: 1 })], finalState: [seatFinal(), seatFinal()] }),
    ];

    const metrics = computeAnomalies(results);

    expect(metrics.totalAnomalies).toBe(0);
    expect(metrics.matchesWithAnomalies).toBe(0);
    expect(metrics.totalMatches).toBe(1);
    expect(metrics.byMessage).toEqual([]);
  });

  it('counts two turns in the same match bearing the same message as one row with count 2', () => {
    const anomaly = { kind: 'unhandledAction' as const, message: 'Action Foo is not a shared game state action or is unhandled.' };
    const results = [
      match({
        turns: [
          turn({ seat: 0, round: 1, anomalies: [anomaly] }),
          turn({ seat: 0, round: 2, anomalies: [anomaly] }),
        ],
        finalState: [seatFinal()],
      }),
    ];

    const metrics = computeAnomalies(results);

    expect(metrics.totalAnomalies).toBe(2);
    expect(metrics.matchesWithAnomalies).toBe(1);
    expect(metrics.byMessage).toHaveLength(1);
    expect(metrics.byMessage[0]).toEqual({
      kind: 'unhandledAction',
      message: anomaly.message,
      count: 2,
      exampleSeat: 0,
      exampleRound: 1,
    });
  });

  it('keeps two distinct messages as two separate rows', () => {
    const results = [
      match({
        turns: [
          turn({ seat: 0, round: 1, anomalies: [{ kind: 'unhandledAction', message: 'first message' }] }),
          turn({ seat: 1, round: 1, anomalies: [{ kind: 'reducerError', message: 'second message' }] }),
        ],
        finalState: [seatFinal(), seatFinal()],
      }),
    ];

    const metrics = computeAnomalies(results);

    expect(metrics.totalAnomalies).toBe(2);
    expect(metrics.byMessage).toHaveLength(2);
    expect(metrics.byMessage).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'unhandledAction', message: 'first message', count: 1 }),
        expect.objectContaining({ kind: 'reducerError', message: 'second message', count: 1 }),
      ]),
    );
  });

  it('counts a match once as "with anomalies" even when it has multiple anomalous turns', () => {
    const results = [
      match({
        turns: [
          turn({ seat: 0, round: 1, anomalies: [{ kind: 'unhandledAction', message: 'm1' }] }),
          turn({ seat: 0, round: 2, anomalies: [{ kind: 'unhandledAction', message: 'm2' }] }),
        ],
        finalState: [seatFinal()],
      }),
      match({ turns: [turn({ seat: 0 })], finalState: [seatFinal()] }), // no anomalies
    ];

    const metrics = computeAnomalies(results);

    expect(metrics.totalMatches).toBe(2);
    expect(metrics.matchesWithAnomalies).toBe(1);
    expect(metrics.totalAnomalies).toBe(2);
  });

  it('treats the same message under different kinds as two separate rows', () => {
    const results = [
      match({
        turns: [
          turn({ seat: 0, round: 1, anomalies: [{ kind: 'unhandledAction', message: 'same text' }] }),
          turn({ seat: 1, round: 1, anomalies: [{ kind: 'reducerError', message: 'same text' }] }),
        ],
        finalState: [seatFinal(), seatFinal()],
      }),
    ];

    const metrics = computeAnomalies(results);

    expect(metrics.byMessage).toHaveLength(2);
  });

  it('sorts byMessage rows by count descending', () => {
    const results = [
      match({
        turns: [
          turn({ seat: 0, round: 1, anomalies: [{ kind: 'unhandledAction', message: 'rare' }] }),
          turn({ seat: 0, round: 2, anomalies: [{ kind: 'reducerError', message: 'common' }] }),
          turn({ seat: 0, round: 3, anomalies: [{ kind: 'reducerError', message: 'common' }] }),
          turn({ seat: 0, round: 4, anomalies: [{ kind: 'reducerError', message: 'common' }] }),
        ],
        finalState: [seatFinal()],
      }),
    ];

    const metrics = computeAnomalies(results);

    expect(metrics.byMessage.map((row) => row.message)).toEqual(['common', 'rare']);
  });
});
