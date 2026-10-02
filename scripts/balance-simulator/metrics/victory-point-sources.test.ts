import { MonsterName } from '../../../src/lib/types/monsters';
import { computeM5 } from './victory-point-sources';
import { events, match, seatFinal, turn } from './test-fixtures';

describe('computeM5', () => {
  it('tallies discovery, monster and PvP VP by seat', () => {
    const results = [
      match({
        turns: [
          turn({ seat: 0, events: events({ kind: 'discoveryVP' }) }),
          turn({ seat: 0, events: events({ kind: 'monsterWin', monsterName: MonsterName.Bear, vp: 5 }) }),
          turn({ seat: 1, events: events({ kind: 'pvpVictoryPoints' }) }),
        ],
        finalState: [seatFinal({ victoryPoints: 6 }), seatFinal({ victoryPoints: 5 })],
      }),
    ];

    const m5 = computeM5(results, 2);

    expect(m5.bySeat[0].discovery).toBe(1);
    expect(m5.bySeat[0].monsterBylevel[2]).toBe(5); // Bear is level 2
    expect(m5.bySeat[1].pvp).toBe(5);
  });

  it('integrity: reports zero mismatches when summed sources never exceed the seat final VP', () => {
    const results = [
      match({
        turns: [turn({ seat: 0, events: events({ kind: 'discoveryVP' }) })],
        finalState: [seatFinal({ victoryPoints: 1 })],
      }),
    ];

    expect(computeM5(results, 1).mismatchCount).toBe(0);
  });

  it('integrity: flags a mismatch when parsed sources exceed the recorded final VP', () => {
    // Two discovery events (2 VP) but the match only ends with 1 VP recorded: a parsing or
    // double-counting bug would produce exactly this shape.
    const results = [
      match({
        turns: [
          turn({ seat: 0, events: events({ kind: 'discoveryVP' }) }),
          turn({ seat: 0, events: events({ kind: 'discoveryVP' }) }),
        ],
        finalState: [seatFinal({ victoryPoints: 1 })],
      }),
    ];

    expect(computeM5(results, 1).mismatchCount).toBe(1);
  });
});
