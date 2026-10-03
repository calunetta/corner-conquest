import { PlayerColor, CardName, ResourceType, GameAction } from '@/lib/types';
import type { GameState } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from '@/lib/game-initializer';
import { addPlayerToGame } from '@/lib/game-logic';
import { handleGainWealth, handleSabotagePlayer, handleStealResource } from './card-targeted-effects.reducer';

function buildGame(): GameState {
  let game = initializeGame(
    'game_test',
    'Card Targeted Effects Test',
    2,
    { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue },
    0,
    false,
    defaultGameSettings,
  );
  const added = addPlayerToGame(game, { playerId: 'p2', name: 'Player 2' });
  game = added.newGameState!;
  game = startGame(game, 'Player 1');
  return game;
}

describe('handleSabotagePlayer', () => {
  let game: GameState;

  beforeEach(() => {
    game = buildGame();
  });

  it('sabotages the target player and discards the Sabotage card', () => {
    const player = game.players[0];
    const opponent = game.players[1];
    player.specialCards = [CardName.Sabotage];

    const nextState = handleSabotagePlayer(game, opponent.id);

    expect(nextState.players[1].isSabotaged).toBe(true);
    expect(nextState.players[0].specialCards).not.toContain(CardName.Sabotage);
    expect(nextState.discardPile).toContain(CardName.Sabotage);
    expect(nextState.players[0].actionsThisTurn).toContain(GameAction.UseCard);
  });

  it('is a no-op when the target player id does not exist (invalid input)', () => {
    const player = game.players[0];
    player.specialCards = [CardName.Sabotage];

    const nextState = handleSabotagePlayer(game, 9999);

    expect(nextState.players[0].specialCards).toContain(CardName.Sabotage);
    expect(nextState.players[0].actionsThisTurn).not.toContain(GameAction.UseCard);
  });
});

describe('handleGainWealth', () => {
  let game: GameState;

  beforeEach(() => {
    game = buildGame();
  });

  it.each([ResourceType.Food, ResourceType.Wood, ResourceType.Gold])(
    'grants 5 %s and discards the Wealthy card',
    (resource) => {
      const player = game.players[0];
      player.specialCards = [CardName.Wealthy];
      const initialAmount = player.resources[resource];

      const nextState = handleGainWealth(game, resource);

      expect(nextState.players[0].resources[resource]).toBe(initialAmount + 5);
      expect(nextState.players[0].specialCards).not.toContain(CardName.Wealthy);
      expect(nextState.discardPile).toContain(CardName.Wealthy);
    },
  );

  it('throws on an invalid resource type (invalid input)', () => {
    const player = game.players[0];
    player.specialCards = [CardName.Wealthy];
    expect(() => handleGainWealth(game, 'diamonds' as ResourceType)).toThrow('Invalid resource type: diamonds');
  });
});

describe('handleStealResource', () => {
  let game: GameState;

  beforeEach(() => {
    game = buildGame();
  });

  it('steals up to 2 of the resource from the target and discards the card', () => {
    const player = game.players[0];
    const opponent = game.players[1];
    player.specialCards = [CardName.StealResource];
    opponent.resources.wood = 10;
    const initialWood = player.resources.wood;

    const nextState = handleStealResource(game, { targetPlayerId: opponent.id, resource: ResourceType.Wood });

    expect(nextState.players[0].resources.wood).toBe(initialWood + 2);
    expect(nextState.players[1].resources.wood).toBe(8);
    expect(nextState.players[0].specialCards).not.toContain(CardName.StealResource);
    expect(nextState.discardPile).toContain(CardName.StealResource);
  });

  it('steals the full amount when the target has less than the cap (boundary)', () => {
    const player = game.players[0];
    const opponent = game.players[1];
    player.specialCards = [CardName.StealResource];
    opponent.resources.wood = 1;

    const nextState = handleStealResource(game, { targetPlayerId: opponent.id, resource: ResourceType.Wood });

    expect(nextState.players[0].resources.wood).toBe(1);
    expect(nextState.players[1].resources.wood).toBe(0);
  });

  it('logs but still discards the card when the target has none of the resource (boundary: 0)', () => {
    const player = game.players[0];
    const opponent = game.players[1];
    player.specialCards = [CardName.StealResource];
    opponent.resources.wood = 0;

    const nextState = handleStealResource(game, { targetPlayerId: opponent.id, resource: ResourceType.Wood });

    expect(nextState.players[0].resources.wood).toBe(0);
    expect(nextState.discardPile).toContain(CardName.StealResource);
    expect(nextState.log.some((entry) => entry.includes('they had none'))).toBe(true);
  });

  it('is a no-op (no throw, no discard) when the target player id does not exist (invalid input)', () => {
    const player = game.players[0];
    player.specialCards = [CardName.StealResource];

    const nextState = handleStealResource(game, { targetPlayerId: 9999, resource: ResourceType.Wood });

    expect(nextState.players[0].specialCards).toContain(CardName.StealResource);
  });
});
