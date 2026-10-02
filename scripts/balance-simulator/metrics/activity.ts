import type { MatchResult } from '../engine';

// --- M6/M7 (simplified): event counts, not resource amounts or card names for purchases ------
//
// The Final spec asks for resource *amounts* by type and per-ability-name purchase counts. The
// log lines carry that detail in free text (e.g. "collected 2 wheat, 1 iron."), but the parser
// built for this phase only classifies *which kind* of event occurred, not its payload — adding
// amount/resource-type extraction was out of budget for this phase. What follows is the honest,
// smaller thing actually computed: how often each kind of event happened per seat. See
// docs/balance-simulator-guide.md's "Known limitations" section.

export interface ActivityMetrics {
  bySeat: Array<{
    seat: number;
    autoCollectEvents: number;
    collectorEvents: number;
    productiveEvents: number;
    wealthyGrantedEvents: number;
    stealGrantedEvents: number;
    deployed: number;
    upgraded: number;
    abilitiesBought: number;
    cardsBought: number;
    finalArmies: number;
    finalAttackPower: number;
  }>;
}

export function computeActivity(results: MatchResult[], seatCount: number): ActivityMetrics {
  const bySeat = Array.from({ length: seatCount }, (_, seat) => ({
    seat,
    autoCollectEvents: 0,
    collectorEvents: 0,
    productiveEvents: 0,
    wealthyGrantedEvents: 0,
    stealGrantedEvents: 0,
    deployed: 0,
    upgraded: 0,
    abilitiesBought: 0,
    cardsBought: 0,
    finalArmies: 0,
    finalAttackPower: 0,
  }));

  const tally: Record<string, keyof (typeof bySeat)[number]> = {
    autoCollect: 'autoCollectEvents',
    collectorGather: 'collectorEvents',
    productiveCollect: 'productiveEvents',
    wealthyGranted: 'wealthyGrantedEvents',
    stealGranted: 'stealGrantedEvents',
    deployed: 'deployed',
    upgraded: 'upgraded',
    abilityBought: 'abilitiesBought',
    cardBought: 'cardsBought',
  };

  results.forEach((result) => {
    result.turns.forEach((turn) => {
      turn.events.forEach((event) => {
        const field = tally[event.kind];
        if (field) (bySeat[turn.seat][field] as number) += 1;
      });
    });
    result.finalState.forEach((seat, i) => {
      bySeat[i].finalArmies += seat.armyCount;
      bySeat[i].finalAttackPower += seat.attackPower;
    });
  });

  bySeat.forEach((seat) => {
    seat.finalArmies = results.length === 0 ? 0 : seat.finalArmies / results.length;
    seat.finalAttackPower = results.length === 0 ? 0 : seat.finalAttackPower / results.length;
  });

  return { bySeat };
}

