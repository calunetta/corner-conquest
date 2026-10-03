import { PlayerColor, CardName, ResourceType, GameAction } from '@/lib/types';
import type { GameState } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from '@/modules/game-rules';
import { addPlayerToGame } from '@/modules/game-rules';
import { handleScoutAction, handleUseCard, handleUseProductiveCard } from './card-effects.reducer';

function buildGame(): GameState {
  let game = initializeGame(
    'game_test',
    'Card Effects Test',
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

describe('handleUseCard', () => {
  let game: GameState;

  beforeEach(() => {
    game = buildGame();
  });

  it('throws when the player does not hold the card (invalid input)', () => {
    game.players[0].specialCards = [];
    expect(() => handleUseCard(game, { cardName: CardName.Reinforce })).toThrow(
      `You do not have the ${CardName.Reinforce} card.`,
    );
  });

  it('throws when a card was already used this turn', () => {
    const player = game.players[0];
    player.specialCards = [CardName.Reinforce, CardName.ExtraMove];
    player.actionsThisTurn.push(GameAction.UseCard);
    expect(() => handleUseCard(game, { cardName: CardName.ExtraMove })).toThrow(
      'You can only use one card per turn.',
    );
  });

  it.each([
    [CardName.Reinforce, 'reinforceActive'],
    [CardName.Efficient, 'efficientActive'],
    [CardName.MasterBuilder, 'masterBuilderActive'],
  ] as const)('activates %s by flipping %s, without discarding or consuming the turn action', (cardName, flag) => {
    const player = game.players[0];
    player.specialCards = [cardName];

    const nextState = handleUseCard(game, { cardName });
    const updatedPlayer = nextState.players[0];

    expect(updatedPlayer[flag]).toBe(true);
    expect(updatedPlayer.specialCards).toContain(cardName);
    expect(updatedPlayer.actionsThisTurn).not.toContain(GameAction.UseCard);
  });

  it('activates Extra Move: sets hasExtraMove, discards the card, consumes the turn action', () => {
    const player = game.players[0];
    player.specialCards = [CardName.ExtraMove];

    const nextState = handleUseCard(game, { cardName: CardName.ExtraMove });
    const updatedPlayer = nextState.players[0];

    expect(updatedPlayer.hasExtraMove).toBe(true);
    expect(updatedPlayer.specialCards).not.toContain(CardName.ExtraMove);
    expect(nextState.discardPile).toContain(CardName.ExtraMove);
    expect(updatedPlayer.actionsThisTurn).toContain(GameAction.UseCard);
  });

  it('a Scout-flagged card consumes the turn action and discards the card', () => {
    const player = game.players[0];
    player.specialCards = [CardName.Scout];

    const nextState = handleUseCard(game, { cardName: CardName.Scout, isScout: true });
    const updatedPlayer = nextState.players[0];

    expect(updatedPlayer.specialCards).not.toContain(CardName.Scout);
    expect(nextState.discardPile).toContain(CardName.Scout);
    expect(updatedPlayer.actionsThisTurn).toContain(GameAction.UseCard);
  });

  it('a card that is neither an immediate effect, Extra Move, nor flagged as scout is a no-op (stays in hand)', () => {
    const player = game.players[0];
    player.specialCards = [CardName.Overcome];

    const nextState = handleUseCard(game, { cardName: CardName.Overcome });
    const updatedPlayer = nextState.players[0];

    expect(updatedPlayer.specialCards).toContain(CardName.Overcome);
    expect(updatedPlayer.actionsThisTurn).not.toContain(GameAction.UseCard);
  });
});

describe('handleUseProductiveCard', () => {
  let game: GameState;

  beforeEach(() => {
    game = buildGame();
  });

  it('doubles the harvest on the selected resource where the player is positioned', () => {
    const player = game.players[0];
    player.specialCards = [CardName.Productive];
    player.resources = { food: 0, wood: 0, gold: 0 };
    player.positions = [{ x: 0, y: 0, resource: ResourceType.Food, armyId: 0 }];

    const nextState = handleUseProductiveCard(game, ResourceType.Food);

    expect(nextState.players[0].resources.food).toBe(2); // base tile has 1 Food, doubled
    expect(nextState.players[0].specialCards).not.toContain(CardName.Productive);
    expect(nextState.discardPile).toContain(CardName.Productive);
    expect(nextState.players[0].actionsThisTurn).toContain(GameAction.UseCard);
    expect(nextState.players[0].positions).toHaveLength(0);
    expect(nextState.productiveDialogState).toBeNull();
  });

  it('does not double a resource where the player is not positioned', () => {
    const player = game.players[0];
    player.specialCards = [CardName.Productive];
    player.resources = { food: 0, wood: 0, gold: 0 };
    player.positions = [{ x: 0, y: 0, resource: ResourceType.Food, armyId: 0 }];

    const nextState = handleUseProductiveCard(game, ResourceType.Gold);

    expect(nextState.players[0].resources.food).toBe(1); // collected normally, not doubled
    expect(nextState.players[0].resources.gold).toBe(0);
  });

  it('a null selection (dismissed dialog) collects all positioned resources without doubling (empty input)', () => {
    const player = game.players[0];
    player.specialCards = [CardName.Productive];
    player.resources = { food: 0, wood: 0, gold: 0 };
    player.positions = [{ x: 0, y: 0, resource: ResourceType.Food, armyId: 0 }];

    const nextState = handleUseProductiveCard(game, null);

    expect(nextState.players[0].resources.food).toBe(1);
    expect(nextState.players[0].specialCards).toContain(CardName.Productive); // no card consumed
    expect(nextState.players[0].actionsThisTurn).not.toContain(GameAction.UseCard);
  });

  it('clears the positioned tile\'s positionedBy entry for the player after collecting', () => {
    const player = game.players[0];
    player.specialCards = [CardName.Productive];
    player.positions = [{ x: 0, y: 0, resource: ResourceType.Food, armyId: 0 }];
    const tile = game.map[0 * game.settings.gridSize.cols + 0];
    tile.positionedBy = [{ playerId: player.id, resource: ResourceType.Food }];

    handleUseProductiveCard(game, ResourceType.Food);

    expect(tile.positionedBy).toEqual([]);
  });

  it('is a no-op on resources when the player has no positions at all (boundary)', () => {
    const player = game.players[0];
    player.specialCards = [CardName.Productive];
    player.resources = { food: 0, wood: 0, gold: 0 };
    player.positions = [];

    const nextState = handleUseProductiveCard(game, ResourceType.Food);

    expect(nextState.players[0].resources).toEqual({ food: 0, wood: 0, gold: 0 });
  });
});

describe('handleScoutAction', () => {
  let game: GameState;

  beforeEach(() => {
    game = buildGame();
  });

  it('reveals a tile without consuming a move', () => {
    const player = game.players[0];
    const army = player.armies[0];
    const armyPosBefore = { ...army.position };

    const nextState = handleScoutAction(game, 3, 3);

    expect(nextState.players[0].revealedTiles).toContain('3-3');
    expect(nextState.players[0].armies[0].position).toEqual(armyPosBefore);
    expect(nextState.players[0].armies[0].hasActed).toBe(false);
  });

  it('does not duplicate an already-revealed tile (boundary)', () => {
    const player = game.players[0];
    player.revealedTiles = ['3-3'];

    const nextState = handleScoutAction(game, 3, 3);

    expect(nextState.players[0].revealedTiles.filter((t) => t === '3-3')).toHaveLength(1);
  });
});
