import { PlayerColor, AbilityName, GameAction, HAND_LIMIT } from '@/lib/types';
import type { GameState } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from '@/lib/game-initializer';
import {
  handleBuyAbility,
  handleBuyCardAction,
  handleCloseSpecialIslandDialog,
  handleRollOnSpecialIsland,
} from './card-acquisition.reducer';

function buildGame(): GameState {
  let game = initializeGame(
    'game_test',
    'Card Acquisition Test',
    1,
    { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue },
    0,
    false,
    defaultGameSettings,
  );
  game = startGame(game, 'Player 1');
  return game;
}

describe('handleBuyCardAction', () => {
  let game: GameState;

  beforeEach(() => {
    game = buildGame();
  });

  it('draws a card spending 10 gold', () => {
    const player = game.players[0];
    player.resources.gold = 20;
    const initialCards = player.specialCards.length;

    const nextState = handleBuyCardAction(game);
    const updatedPlayer = nextState.players[0];

    expect(updatedPlayer.specialCards.length).toBe(initialCards + 1);
    expect(updatedPlayer.resources.gold).toBe(10);
    expect(updatedPlayer.actionsThisTurn).toContain(GameAction.BuyCard);
  });

  it('throws when the player already bought a card this turn', () => {
    game.players[0].resources.gold = 20;
    game.players[0].actionsThisTurn.push(GameAction.BuyCard);
    expect(() => handleBuyCardAction(game)).toThrow('You can only buy one card per turn.');
  });

  it('throws when the player cannot afford the card (boundary: gold < 10)', () => {
    game.players[0].resources.gold = 9;
    expect(() => handleBuyCardAction(game)).toThrow('Not enough gold to buy a card.');
  });

  it('logs and returns without drawing when the hand is already at HAND_LIMIT (boundary)', () => {
    const player = game.players[0];
    player.resources.gold = 20;
    player.specialCards = new Array(HAND_LIMIT).fill('Scout');

    const nextState = handleBuyCardAction(game);

    expect(nextState.players[0].specialCards.length).toBe(HAND_LIMIT);
    expect(nextState.players[0].resources.gold).toBe(20);
    expect(nextState.log.some((entry) => entry.includes('hand is full'))).toBe(true);
  });

  it('logs and returns without drawing when both the deck and discard pile are empty (invalid/empty input)', () => {
    const player = game.players[0];
    player.resources.gold = 20;
    game.specialCardsDeck = [];
    game.discardPile = [];

    const nextState = handleBuyCardAction(game);

    expect(nextState.players[0].resources.gold).toBe(20);
    expect(nextState.log.some((entry) => entry.includes('none left'))).toBe(true);
  });

  it('reshuffles the discard pile into the deck when the deck is empty but the discard pile is not', () => {
    const player = game.players[0];
    player.resources.gold = 20;
    game.specialCardsDeck = [];
    game.discardPile = ['Scout', 'Wealthy'];

    const nextState = handleBuyCardAction(game);

    expect(nextState.players[0].specialCards.length).toBe(1);
    expect(nextState.discardPile).toEqual([]);
    expect(nextState.log.some((entry) => entry.includes('Reshuffling'))).toBe(true);
  });
});

describe('handleBuyAbility', () => {
  let game: GameState;

  beforeEach(() => {
    game = buildGame();
  });

  it('deducts gold and sets the passive ability flag', () => {
    const player = game.players[0];
    player.resources.gold = 20;

    const nextState = handleBuyAbility(game, AbilityName.Explorer);

    expect(nextState.players[0].passiveAbilities.explorer).toBe(true);
    expect(nextState.players[0].resources.gold).toBe(20 - game.settings.abilityCost);
  });

  it('throws when the player cannot afford the ability (boundary)', () => {
    game.players[0].resources.gold = game.settings.abilityCost - 1;
    expect(() => handleBuyAbility(game, AbilityName.Explorer)).toThrow('Not enough gold to buy this ability.');
  });

  it('throws when the player already has the ability', () => {
    const player = game.players[0];
    player.resources.gold = 100;
    player.passiveAbilities.explorer = true;
    expect(() => handleBuyAbility(game, AbilityName.Explorer)).toThrow('You already have this ability.');
  });

  it('throws when the ability is not available in this match (invalid input)', () => {
    const player = game.players[0];
    player.resources.gold = 100;
    game.settings = { ...game.settings, availableAbilities: [] };
    expect(() => handleBuyAbility(game, AbilityName.Collector)).toThrow('This ability is not available in this match.');
  });
});

describe('handleRollOnSpecialIsland', () => {
  let game: GameState;

  beforeEach(() => {
    game = buildGame();
  });

  it.each([3, 6])('a forced roll of %i draws a card', (roll) => {
    const initialCards = game.players[0].specialCards.length;
    const nextState = handleRollOnSpecialIsland(game, { roll });
    expect(nextState.players[0].specialCards.length).toBe(initialCards + 1);
    expect(nextState.log.some((entry) => entry.includes(`rolled a ${roll} and found a card`))).toBe(true);
  });

  it.each([1, 2, 4, 5])('a forced roll of %i draws nothing', (roll) => {
    const initialCards = game.players[0].specialCards.length;
    const nextState = handleRollOnSpecialIsland(game, { roll });
    expect(nextState.players[0].specialCards.length).toBe(initialCards);
    expect(nextState.log.some((entry) => entry.includes('found nothing'))).toBe(true);
  });

  it('logs without drawing when the hand is full even on a winning roll (boundary)', () => {
    const player = game.players[0];
    player.specialCards = new Array(HAND_LIMIT).fill('Scout');
    const nextState = handleRollOnSpecialIsland(game, { roll: 3 });
    expect(nextState.players[0].specialCards.length).toBe(HAND_LIMIT);
    expect(nextState.log.some((entry) => entry.includes('hand is full'))).toBe(true);
  });

  it('logs when the deck and discard pile are both empty on a winning roll (empty input)', () => {
    game.specialCardsDeck = [];
    game.discardPile = [];
    const nextState = handleRollOnSpecialIsland(game, { roll: 6 });
    expect(nextState.log.some((entry) => entry.includes('deck is completely empty'))).toBe(true);
  });

  it('reshuffles the discard pile into the deck on a winning roll when the deck is empty', () => {
    game.specialCardsDeck = [];
    game.discardPile = ['Scout'];
    const nextState = handleRollOnSpecialIsland(game, { roll: 3 });
    expect(nextState.players[0].specialCards.length).toBe(1);
    expect(nextState.discardPile).toEqual([]);
  });
});

describe('handleCloseSpecialIslandDialog', () => {
  it('is a no-op that returns the given state unchanged', () => {
    const game = buildGame();
    expect(handleCloseSpecialIslandDialog(game)).toBe(game);
  });
});
