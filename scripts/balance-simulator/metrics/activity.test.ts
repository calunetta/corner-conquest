import { AbilityName } from '../../../src/lib/types/cards';
import { computeActivity } from './activity';
import { events, match, seatFinal, turn } from './test-fixtures';

describe('computeActivity', () => {
  it('tallies each event kind per seat and averages final armies and attack power', () => {
    const results = [
      match({
        turns: [
          turn({ seat: 0, events: events({ kind: 'deployed' }, { kind: 'autoCollect' }) }),
          turn({ seat: 0, events: events({ kind: 'upgraded' }) }),
        ],
        finalState: [seatFinal({ armyCount: 3, attackPower: 2 })],
      }),
      match({ turns: [], finalState: [seatFinal({ armyCount: 5, attackPower: 4 })] }),
    ];

    const [seat0] = computeActivity(results, 1).bySeat;

    expect(seat0.deployed).toBe(1);
    expect(seat0.autoCollectEvents).toBe(1);
    expect(seat0.upgraded).toBe(1);
    expect(seat0.finalArmies).toBe(4); // (3+5)/2
    expect(seat0.finalAttackPower).toBe(3); // (2+4)/2
  });

  it('tallies abilities bought by name', () => {
    const results = [
      match({
        turns: [
          turn({ seat: 0, events: events({ kind: 'abilityBought', abilityName: AbilityName.Explorer }) }),
          turn({ seat: 0, events: events({ kind: 'abilityBought', abilityName: AbilityName.Explorer }) }),
        ],
        finalState: [seatFinal()],
      }),
    ];

    const [seat0] = computeActivity(results, 1).bySeat;
    expect(seat0.abilitiesBoughtByName[AbilityName.Explorer]).toBe(2);
    expect(seat0.abilitiesBoughtByName[AbilityName.Collector]).toBe(0);
  });

  it('returns a zeroed row per seat when there are no matches', () => {
    const [seat0, seat1] = computeActivity([], 2).bySeat;
    expect(seat0.deployed).toBe(0);
    expect(seat1.deployed).toBe(0);
  });
});
