import { AbilityName, CardName } from '../../src/lib/types/cards';
import { MonsterName } from '../../src/lib/types/monsters';
import { parseLogLine } from './log-parsers';

// Each case below is the literal template string from its `state.log.push(...)` call, with the
// interpolations filled in by hand, so a wording change in the reducer breaks this test instead
// of silently going uncounted by the simulator. The `// source:` comment names the exact line.

describe('parseLogLine', () => {
  it('parses a discovery (movement.ts:55)', () => {
    expect(parseLogLine('Bot 0 discovered a new island and gains 1 VP!')).toEqual([{ kind: 'discoveryVP' }]);
  });

  it('parses a monster win, extracting the monster name and VP (attack.ts:307)', () => {
    expect(parseLogLine('Bot 0 defeated the Bear for 5 VP!')).toEqual([
      { kind: 'monsterWin', monsterName: MonsterName.Bear, vp: 5 },
    ]);
  });

  it('parses a monster loss, extracting the monster name (attack.ts:337)', () => {
    expect(parseLogLine('Bot 0 was defeated by the Minotaur!')).toEqual([
      { kind: 'monsterLoss', monsterName: MonsterName.Minotaur },
    ]);
  });

  it('parses the PvP victory-point line (attack.ts:129 and :160, identical text)', () => {
    expect(parseLogLine('Bot 0 receives 5 VP for defeating Bot 1!')).toEqual([{ kind: 'pvpVictoryPoints' }]);
  });

  it('parses the PvP result line, attributed to the acting seat (attack.ts:187)', () => {
    expect(parseLogLine('Bot 0 defeated Bot 1 in battle!')).toEqual([{ kind: 'pvpResult' }]);
  });

  it('parses the Explorer ability line (player.ts:213)', () => {
    expect(parseLogLine("Bot 0's Explorer ability generated 2 VP.")).toEqual([{ kind: 'explorerVP' }]);
  });

  it('parses the Collector ability line (player.ts:236)', () => {
    expect(parseLogLine("Bot 0's Collector ability gathered 1 gold.")).toEqual([{ kind: 'collectorGather' }]);
  });

  it('parses an automatic resource collection (player.ts:153)', () => {
    expect(parseLogLine('Bot 0 automatically collected 2 wheat.')).toEqual([{ kind: 'autoCollect' }]);
  });

  it('parses a Productive-doubled collection, distinct from a plain auto-collect (card.ts:107)', () => {
    expect(parseLogLine('Bot 0 collected 2 wheat (doubled by Productive).')).toEqual([{ kind: 'productiveCollect' }]);
  });

  it('parses Wealthy as a granted-resource event (card.ts:148)', () => {
    expect(parseLogLine("Bot 0 used 'Wealthy' to gain 5 gems.")).toEqual([
      { kind: 'wealthyGranted' },
      { kind: 'cardConsumed', cardName: CardName.Wealthy },
    ]);
  });

  it('parses a successful steal as a granted-resource event (card.ts:174)', () => {
    expect(parseLogLine('Bot 0 stole 3 iron from Bot 1!')).toEqual([
      { kind: 'stealGranted' },
      { kind: 'cardConsumed', cardName: CardName.StealResource },
    ]);
  });

  it('parses a deploy purchase (player.ts:99)', () => {
    expect(parseLogLine('Bot 0 deployed a new army!')).toEqual([{ kind: 'deployed' }]);
  });

  it('parses an upgrade purchase (player.ts:134)', () => {
    expect(parseLogLine("Bot 0 upgraded their army's attack power to 2.")).toEqual([{ kind: 'upgraded' }]);
  });

  it('parses an ability purchase, including which ability (card.ts:204)', () => {
    expect(parseLogLine("Bot 0 has acquired the 'Explorer' passive ability!")).toEqual([
      { kind: 'abilityBought', abilityName: AbilityName.Explorer },
    ]);
    expect(parseLogLine("Bot 0 has acquired the 'Collector' passive ability!")).toEqual([
      { kind: 'abilityBought', abilityName: AbilityName.Collector },
    ]);
  });

  it('parses a card purchase, including which card (card.ts:41)', () => {
    expect(parseLogLine('Bot 0 bought a special card: "Scout"!')).toEqual([
      { kind: 'cardBought', cardName: CardName.Scout },
    ]);
  });

  it('parses a card found on a Special island, including which card (movement.ts:82)', () => {
    expect(parseLogLine('Bot 0 discovered a special island and found a card: "Teleport"!')).toEqual([
      { kind: 'specialIslandCardFound', cardName: CardName.Teleport },
    ]);
  });

  it('parses a draw lost to a full hand (movement.ts:66)', () => {
    expect(parseLogLine('Bot 0 discovered a special island, but their hand is full!')).toEqual([
      { kind: 'drawLostToFullHand' },
    ]);
  });

  it('parses a Sabotage skip (player.ts:181)', () => {
    expect(parseLogLine("Bot 1's turn was skipped due to Sabotage!")).toEqual([{ kind: 'sabotageSkip' }]);
  });

  it('parses "activated" as its own event, never as a consumption (card.ts:61)', () => {
    expect(parseLogLine("Bot 0 activated 'Reinforce'.")).toEqual([{ kind: 'cardActivated' }]);
  });

  it.each([
    ["Bot 0 used 'Extra Move'.", CardName.ExtraMove], // card.ts:67
    ["Bot 0 used the 'Scout' card to scout ahead.", CardName.Scout], // card.ts:70
    ['Bot 0 sabotaged Bot 1! They will miss their next turn.', CardName.Sabotage], // card.ts:128
    ["Bot 0 used 'Wealthy' to gain 5 gems.", CardName.Wealthy], // card.ts:148
    ['Bot 0 stole 3 iron from Bot 1!', CardName.StealResource], // card.ts:174
    ["Bot 0 used 'Efficient' to deploy!", CardName.Efficient], // player.ts:73
    ["Bot 0 used 'Reinforce' to deploy for free!", CardName.Reinforce], // player.ts:84
    ["Bot 0 used 'Master Builder' for a cheaper upgrade!", CardName.MasterBuilder], // player.ts:123
    ['Bot 0 used \'Overcome\' to win the battle automatically!', CardName.Overcome], // attack.ts:71
    ["Bot 0 used 'War Chief' for +2 power!", CardName.WarChief], // attack.ts:86 and :232
    ["Bot 0 used the 'Overcome' card to win automatically!", CardName.Overcome], // attack.ts:217
    ["Bot 0 used the 'Decide Dice Roll' card!", CardName.DecideDiceRoll], // attack.ts:242
    ['Bot 0 teleported an army!', CardName.Teleport], // movement.ts:109
  ])('parses %p as consuming %s', (line, cardName) => {
    expect(parseLogLine(line)).toContainEqual({ kind: 'cardConsumed', cardName });
  });

  it('returns no events for lines the simulator does not need', () => {
    expect(parseLogLine("It's now Bot 1's turn.")).toEqual([]);
    expect(parseLogLine('The deck is empty. Reshuffling the discard pile...')).toEqual([]);
    expect(parseLogLine('🎉 Bot 0 has reached 30 Victory Points and won the game!')).toEqual([]);
  });

  it('does not double-count a failed steal as a granted resource (card.ts:176)', () => {
    expect(parseLogLine('Bot 0 tried to steal iron from Bot 1, but they had none.')).toEqual([]);
  });
});
