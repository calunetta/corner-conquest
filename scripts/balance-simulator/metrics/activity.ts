import { AbilityName } from '../../../src/lib/types/cards';
import type { MatchResult } from '../engine';

// --- M6/M7 (simplified): event counts, not resource amounts or card names for card purchases --
//
// The Final spec asks for resource *amounts* by type and per-card-name purchase counts. The log
// lines carry resource amounts as free text (e.g. "collected 2 wheat, 1 iron."), but the parser
// built for this phase only classifies *which kind* of event occurred for collection/card
// purchases, not its payload — adding amount extraction was out of budget for this phase. Ability
// purchases and card consumption (M8) do carry their name, since that detail was already needed
// elsewhere and cheap to add. See docs/balance-simulator-guide.md's "Known limitations".

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
    abilitiesBoughtByName: Record<AbilityName, number>;
    cardsBought: number;
    finalArmies: number;
    finalAttackPower: number;
  }>;
}

const SIMPLE_EVENT_FIELDS = {
  autoCollect: 'autoCollectEvents',
  collectorGather: 'collectorEvents',
  productiveCollect: 'productiveEvents',
  wealthyGranted: 'wealthyGrantedEvents',
  stealGranted: 'stealGrantedEvents',
  deployed: 'deployed',
  upgraded: 'upgraded',
  cardBought: 'cardsBought',
} as const;

function emptySeatRow(seat: number): ActivityMetrics['bySeat'][number] {
  return {
    seat,
    autoCollectEvents: 0,
    collectorEvents: 0,
    productiveEvents: 0,
    wealthyGrantedEvents: 0,
    stealGrantedEvents: 0,
    deployed: 0,
    upgraded: 0,
    abilitiesBoughtByName: { [AbilityName.Explorer]: 0, [AbilityName.Collector]: 0 },
    cardsBought: 0,
    finalArmies: 0,
    finalAttackPower: 0,
  };
}

export function computeActivity(results: MatchResult[], seatCount: number): ActivityMetrics {
  const bySeat = Array.from({ length: seatCount }, (_, seat) => emptySeatRow(seat));

  results.forEach((result) => {
    result.turns.forEach((turn) => {
      turn.events.forEach((event) => {
        if (event.kind === 'abilityBought') {
          bySeat[turn.seat].abilitiesBoughtByName[event.abilityName] += 1;
          return;
        }
        const field = SIMPLE_EVENT_FIELDS[event.kind as keyof typeof SIMPLE_EVENT_FIELDS];
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
