import { CardName, GameAction } from '@/lib/types';
import type { PendingAction } from '@/lib/types/dialogs';
import { SANDBOX_LOCAL_PLAYER_ID } from './CardPlaySandbox.fixtures';
import {
  toCardUseLogEntry,
  toFollowUpDialogAction,
  toPendingActionForCard,
  toSandboxPlayer,
} from './CardPlaySandbox.map';

describe('toSandboxPlayer', () => {
  it('uses the local identity and the given hand', () => {
    const cards = [CardName.ExtraMove, CardName.Scout];
    const player = toSandboxPlayer(cards, false);
    expect(player.id).toBe(0);
    expect(player.playerId).toBe(SANDBOX_LOCAL_PLAYER_ID);
    expect(player.specialCards).toEqual(cards);
  });

  it.each([
    [false, []],
    [true, [GameAction.UseCard]],
  ])('hasUsedCard=%s gives actionsThisTurn %j', (hasUsedCard, expected) => {
    expect(toSandboxPlayer([], hasUsedCard).actionsThisTurn).toEqual(expected);
  });

  it('accepts an empty hand', () => {
    expect(toSandboxPlayer([], false).specialCards).toEqual([]);
  });
});

describe('toCardUseLogEntry', () => {
  it('builds a structured card entry for the local player', () => {
    expect(toCardUseLogEntry(CardName.Teleport, 4)).toEqual({
      kind: 'structured',
      turn: 4,
      category: 'cards',
      message: "You used 'Teleport'.",
      playerId: SANDBOX_LOCAL_PLAYER_ID,
      cardName: CardName.Teleport,
    });
  });
});

describe('toPendingActionForCard', () => {
  it('Teleport -> teleport pending', () => {
    expect(toPendingActionForCard(CardName.Teleport)).toEqual({ type: 'teleport', cardName: CardName.Teleport });
  });

  it('Scout -> scout pending with count 3 and no scouted tiles', () => {
    expect(toPendingActionForCard(CardName.Scout)).toEqual({
      type: 'scout',
      cardName: CardName.Scout,
      count: 3,
      scoutedTiles: [],
    });
  });

  it.each([
    [CardName.Sabotage, 'sabotage'],
    [CardName.Wealthy, 'wealthy'],
    [CardName.StealResource, 'steal-resource'],
  ])('%s -> runtime pending type %s', (cardName, type) => {
    expect(toPendingActionForCard(cardName)).toEqual({ type, cardName } as unknown as PendingAction);
  });

  it.each([CardName.ExtraMove, CardName.Reinforce, CardName.Overcome])('%s -> null', (cardName) => {
    expect(toPendingActionForCard(cardName)).toBeNull();
  });
});

describe('toFollowUpDialogAction', () => {
  it.each([
    [CardName.Sabotage, { type: 'SET_SABOTAGE_DIALOG', state: { isOpen: true } }],
    [CardName.Wealthy, { type: 'SET_WEALTHY_DIALOG', state: { isOpen: true } }],
    [CardName.StealResource, { type: 'SET_STEAL_RESOURCE_DIALOG', state: { isOpen: true } }],
  ])('%s opens its dialog', (cardName, expected) => {
    expect(toFollowUpDialogAction(cardName)).toEqual(expected);
  });

  it.each([CardName.Teleport, CardName.Scout, CardName.ExtraMove])('%s has no dialog', (cardName) => {
    expect(toFollowUpDialogAction(cardName)).toBeNull();
  });
});
