import { AbilityName, CardName } from '../../src/lib/types/cards';
import { MonsterName } from '../../src/lib/types/monsters';

/**
 * Turns one `state.log` line from a bot's turn into a structured event, by matching the exact
 * strings the game's reducers push (`src/lib/actions/*.ts`). Each case below is tested against
 * the literal template string from its source line, so a reducer wording change breaks the test
 * here instead of silently going uncounted.
 *
 * Patterns are checked in order top to bottom; more specific wording (e.g. "automatically
 * collected") is listed before a more general one it would otherwise also match ("collected").
 */
export type LogEvent =
  | { kind: 'discoveryVP' }
  | { kind: 'monsterWin'; monsterName: MonsterName; vp: number }
  | { kind: 'monsterLoss'; monsterName: MonsterName }
  | { kind: 'pvpVictoryPoints' }
  | { kind: 'pvpResult' }
  | { kind: 'explorerVP' }
  | { kind: 'collectorGather' }
  | { kind: 'autoCollect' }
  | { kind: 'productiveCollect' }
  | { kind: 'wealthyGranted' }
  | { kind: 'stealGranted' }
  | { kind: 'deployed' }
  | { kind: 'upgraded' }
  | { kind: 'abilityBought'; abilityName: AbilityName }
  | { kind: 'cardBought'; cardName: CardName }
  | { kind: 'specialIslandCardFound'; cardName: CardName }
  | { kind: 'drawLostToFullHand' }
  | { kind: 'cardActivated' } // not a "consumed" event — see card.ts:61
  | { kind: 'cardConsumed'; cardName: CardName }
  | { kind: 'sabotageSkip' };

const MONSTER_NAMES = Object.values(MonsterName) as string[];
const CARD_NAMES = Object.values(CardName) as string[];

function findMonsterName(line: string): MonsterName | undefined {
  return MONSTER_NAMES.find((name) => line.includes(name)) as MonsterName | undefined;
}

/** Extracts the quoted card name from `bought a special card: "X"!` or `found a card: "X"!`. */
function findQuotedCardName(line: string): CardName | undefined {
  const quoted = line.match(/"([^"]+)"/)?.[1];
  return CARD_NAMES.find((name) => name === quoted) as CardName | undefined;
}

/** `has acquired the 'Explorer' passive ability!` — the ability names stored in GameState
 *  (AbilityName.Explorer = 'explorer') are lowercase, but the log line title-cases them. */
function findAbilityName(line: string): AbilityName | undefined {
  const quoted = line.match(/'([^']+)' passive ability/)?.[1]?.toLowerCase();
  return Object.values(AbilityName).find((name) => name === quoted);
}

/** One (pattern, builder) pair. A line can match more than one matcher (e.g. a successful steal is
 *  both a granted-resource event for M6 and a card-consumption event for M8). */
const MATCHERS: ReadonlyArray<{ test: (line: string) => boolean; build: (line: string) => LogEvent }> = [
  { test: (l) => l.includes('discovered a new island and gains'), build: () => ({ kind: 'discoveryVP' }) },
  {
    test: (l) => l.includes('defeated the') && l.includes('for') && l.endsWith('VP!'),
    build: (l) => {
      const vp = Number(l.match(/for (\d+) VP!$/)?.[1] ?? 0);
      return { kind: 'monsterWin', monsterName: findMonsterName(l)!, vp };
    },
  },
  {
    test: (l) => l.includes('was defeated by the'),
    build: (l) => ({ kind: 'monsterLoss', monsterName: findMonsterName(l)! }),
  },
  { test: (l) => l.includes('receives 5 VP for defeating'), build: () => ({ kind: 'pvpVictoryPoints' }) },
  { test: (l) => l.includes('defeated') && l.includes('in battle!'), build: () => ({ kind: 'pvpResult' }) },
  { test: (l) => l.includes("Explorer ability generated"), build: () => ({ kind: 'explorerVP' }) },
  { test: (l) => l.includes("Collector ability gathered"), build: () => ({ kind: 'collectorGather' }) },
  { test: (l) => l.includes('automatically collected'), build: () => ({ kind: 'autoCollect' }) },
  // Productive's own line also contains the word "collected"; it must be checked after "automatically collected".
  { test: (l) => / collected .+\.$/.test(l) && !l.includes('automatically'), build: () => ({ kind: 'productiveCollect' }) },
  {
    test: (l) => l.includes(`used '${CardName.Wealthy}' to gain`),
    build: () => ({ kind: 'wealthyGranted' }),
  },
  { test: (l) => l.includes('stole') && l.includes('from'), build: () => ({ kind: 'stealGranted' }) },
  { test: (l) => l.includes('deployed a new army!'), build: () => ({ kind: 'deployed' }) },
  { test: (l) => l.includes("upgraded their army's attack power"), build: () => ({ kind: 'upgraded' }) },
  {
    test: (l) => l.includes('passive ability!'),
    build: (l) => ({ kind: 'abilityBought', abilityName: findAbilityName(l)! }),
  },
  {
    test: (l) => l.includes('bought a special card:'),
    build: (l) => ({ kind: 'cardBought', cardName: findQuotedCardName(l)! }),
  },
  {
    test: (l) => l.includes('discovered a special island and found a card:'),
    build: (l) => ({ kind: 'specialIslandCardFound', cardName: findQuotedCardName(l)! }),
  },
  {
    test: (l) => l.includes('discovered a special island, but their hand is full!'),
    build: () => ({ kind: 'drawLostToFullHand' }),
  },
  { test: (l) => l.includes("'s turn was skipped due to Sabotage!"), build: () => ({ kind: 'sabotageSkip' }) },
  // Card.ts:61 "activated" fires before the card's effect resolves; it is never a consumption event.
  { test: (l) => / activated '.+'\.$/.test(l), build: () => ({ kind: 'cardActivated' }) },

  // Card consumption, one matcher per exact wording. Order does not matter among these: their
  // substrings don't overlap each other (each names a different card or a different sentence).
  { test: (l) => l.includes("used 'Extra Move'."), build: () => ({ kind: 'cardConsumed', cardName: CardName.ExtraMove }) },
  {
    test: (l) => l.includes('card to scout ahead.'),
    build: () => ({ kind: 'cardConsumed', cardName: CardName.Scout }),
  },
  {
    test: (l) => l.includes('sabotaged') && l.includes('miss their next turn'),
    build: () => ({ kind: 'cardConsumed', cardName: CardName.Sabotage }),
  },
  {
    test: (l) => l.includes(`used '${CardName.Wealthy}' to gain`),
    build: () => ({ kind: 'cardConsumed', cardName: CardName.Wealthy }),
  },
  {
    test: (l) => l.includes('stole') && l.includes('from'),
    build: () => ({ kind: 'cardConsumed', cardName: CardName.StealResource }),
  },
  {
    test: (l) => l.includes("used 'Efficient' to deploy!"),
    build: () => ({ kind: 'cardConsumed', cardName: CardName.Efficient }),
  },
  {
    test: (l) => l.includes("used 'Reinforce' to deploy for free!"),
    build: () => ({ kind: 'cardConsumed', cardName: CardName.Reinforce }),
  },
  {
    test: (l) => l.includes("used 'Master Builder' for a cheaper upgrade!"),
    build: () => ({ kind: 'cardConsumed', cardName: CardName.MasterBuilder }),
  },
  {
    test: (l) => l.includes("used 'Overcome' to win the battle automatically!") || l.includes("used the 'Overcome' card to win automatically!"),
    build: () => ({ kind: 'cardConsumed', cardName: CardName.Overcome }),
  },
  {
    test: (l) => l.includes("used 'War Chief' for +2 power!"),
    build: () => ({ kind: 'cardConsumed', cardName: CardName.WarChief }),
  },
  {
    test: (l) => l.includes("used the 'Decide Dice Roll' card!"),
    build: () => ({ kind: 'cardConsumed', cardName: CardName.DecideDiceRoll }),
  },
  {
    test: (l) => l.includes('teleported an army!'),
    build: () => ({ kind: 'cardConsumed', cardName: CardName.Teleport }),
  },
];

/** Returns every event a log line represents; empty for lines the simulator doesn't need
 *  (turn announcements, errors, flavor text). A line can produce more than one event. */
export function parseLogLine(line: string): LogEvent[] {
  return MATCHERS.filter(({ test }) => test(line)).map(({ build }) => build(line));
}
