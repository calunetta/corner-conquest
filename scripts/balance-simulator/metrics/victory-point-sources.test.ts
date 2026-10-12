import { MonsterName } from '../../../src/lib/types/monsters';
import { computeM5 } from './victory-point-sources';
import { events, match, seatFinal, turn } from './test-fixtures';

describe('computeM5', () => {
  it('tallies discovery, monster and PvP VP by seat, attributing PvP VP via winnerPlayerId/seatPlayerIds (not the acting turn.seat)', () => {
    const results = [
      match({
        seatPlayerIds: ['bot_0', 'bot_1'],
        turns: [
          turn({ seat: 0, events: events({ kind: 'discoveryVP' }) }),
          turn({ seat: 0, events: events({ kind: 'monsterWin', monsterName: MonsterName.Bear, vp: 5 }) }),
          turn({ seat: 1, events: events({ kind: 'pvpVictoryPoints', winnerPlayerId: 'bot_1' }) }),
        ],
        finalState: [seatFinal({ victoryPoints: 6 }), seatFinal({ victoryPoints: 5 })],
      }),
    ];

    const m5 = computeM5(results, 2);

    expect(m5.bySeat[0].discovery).toBe(1);
    expect(m5.bySeat[0].monsterBylevel[2]).toBe(5); // Bear is level 2
    expect(m5.bySeat[1].pvp).toBe(5);
  });

  // BUG 1 repro (plan.md Bug 1): the defender can win PvP combat on the attacker's own turn
  // (combat-player-resolve.reducer.ts's winner is resolved independently of currentPlayerIndex).
  // Today, computeM5 credits turn.seat (the attacker, seat 0) instead of the real winner
  // (the defender, seat 1) — so the attacker's perMatchVP is inflated past their real final VP
  // (flagged as a mismatch) while the defender's real VP goes uncredited.
  it('credits PvP VP to the real winner (defender) via winnerPlayerId, not to the attacker whose turn it is', () => {
    const results = [
      match({
        seatPlayerIds: ['bot_0', 'bot_1'],
        turns: [
          // Seat 0 (the attacker) is the acting seat this turn, but the defender (seat 1, bot_1)
          // is the one who actually won the combat and received the 5 VP.
          turn({ seat: 0, events: events({ kind: 'pvpVictoryPoints', winnerPlayerId: 'bot_1' }) }),
        ],
        finalState: [seatFinal({ victoryPoints: 0 }), seatFinal({ victoryPoints: 5 })],
      }),
    ];

    const m5 = computeM5(results, 2);

    expect(m5.bySeat[0].pvp).toBe(0); // the attacker's seat must NOT be credited
    expect(m5.bySeat[1].pvp).toBe(5); // the defender's seat must be credited
    expect(m5.mismatchCount).toBe(0);
  });

  it('does not credit any seat, and does not throw, when winnerPlayerId cannot be resolved to a seat', () => {
    const unresolvable = [
      match({
        seatPlayerIds: ['bot_0', 'bot_1'],
        turns: [turn({ seat: 0, events: events({ kind: 'pvpVictoryPoints', winnerPlayerId: 'bot_unknown' }) })],
        finalState: [seatFinal({ victoryPoints: 0 }), seatFinal({ victoryPoints: 0 })],
      }),
    ];
    const noPlayerId = [
      match({
        seatPlayerIds: ['bot_0', 'bot_1'],
        turns: [turn({ seat: 0, events: events({ kind: 'pvpVictoryPoints' }) })],
        finalState: [seatFinal({ victoryPoints: 0 }), seatFinal({ victoryPoints: 0 })],
      }),
    ];

    expect(() => computeM5(unresolvable, 2)).not.toThrow();
    expect(() => computeM5(noPlayerId, 2)).not.toThrow();

    const m5Unresolvable = computeM5(unresolvable, 2);
    expect(m5Unresolvable.bySeat[0].pvp).toBe(0);
    expect(m5Unresolvable.bySeat[1].pvp).toBe(0);
    expect(m5Unresolvable.mismatchCount).toBe(0);

    const m5NoPlayerId = computeM5(noPlayerId, 2);
    expect(m5NoPlayerId.bySeat[0].pvp).toBe(0);
    expect(m5NoPlayerId.bySeat[1].pvp).toBe(0);
    expect(m5NoPlayerId.mismatchCount).toBe(0);
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
