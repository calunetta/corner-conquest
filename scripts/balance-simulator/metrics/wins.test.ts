import { computeM3, computeM4 } from './wins';
import { match, seatFinal } from './test-fixtures';

describe('computeM3', () => {
  it('counts decided matches and wins per seat, with a Wilson interval', () => {
    const results = [
      match({ winnerSeat: 0, finalState: [] }),
      match({ winnerSeat: 0, finalState: [] }),
      match({ winnerSeat: 1, finalState: [] }),
      match({ outcome: 'capped', winnerSeat: null, finalState: [] }),
    ];

    const m3 = computeM3(results, 2);

    expect(m3.decidedMatches).toBe(3);
    expect(m3.bySeat.map((s) => s.wins)).toEqual([2, 1]);
    expect(m3.bySeat[0].wilson.proportion).toBeCloseTo(2 / 3, 10);
  });

  it('only computes a chi-square test once there are at least 5x the seat count of decided matches', () => {
    const fewDecided = Array.from({ length: 9 }, () => match({ winnerSeat: 0, finalState: [] })); // < 5*2
    const enoughDecided = Array.from({ length: 10 }, () => match({ winnerSeat: 0, finalState: [] })); // >= 5*2

    expect(computeM3(fewDecided, 2).chiSquare).toBeNull();
    expect(computeM3(enoughDecided, 2).chiSquare).not.toBeNull();
  });
});

describe('computeM4', () => {
  it('computes mean final VP per seat, winner margin and winner overshoot', () => {
    const results = [
      match({ winnerSeat: 0, finalState: [seatFinal({ victoryPoints: 32 }), seatFinal({ victoryPoints: 20 })] }),
      match({ winnerSeat: 1, finalState: [seatFinal({ victoryPoints: 10 }), seatFinal({ victoryPoints: 31 })] }),
    ];

    const m4 = computeM4(results, 2, 30);

    expect(m4.meanFinalVictoryPoints).toEqual([21, 25.5]); // (32+10)/2, (20+31)/2
    expect(m4.meanWinnerMargin).toBe(16.5); // (32-20=12, 31-10=21) -> mean 16.5
    expect(m4.meanWinnerOvershoot).toBe(1.5); // (32-30=2, 31-30=1) -> mean 1.5
  });
});
