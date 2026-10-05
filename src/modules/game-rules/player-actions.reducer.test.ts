import { PlayerColor, CardName, GameAction } from '@/lib/types';
import type { GameState } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from '@/modules/game-rules';
import { handleCancelAction, handleDeployAction, handleUpgradeAction } from './player-actions.reducer';
import { toLogMessage } from './log-entry';

function buildGame(): GameState {
  let game = initializeGame(
    'game_test',
    'Player Actions Test',
    1,
    { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue },
    0,
    false,
    defaultGameSettings,
  );
  game = startGame(game, 'Player 1');
  return game;
}

describe('handleDeployAction', () => {
  let game: GameState;

  beforeEach(() => {
    game = buildGame();
  });

  it('deploys a new army at base if the player has enough food', () => {
    const player = game.players[0];
    player.resources.food = 10;
    const initialArmies = player.armies.length;
    const cost = player.nextArmyCost;

    const nextState = handleDeployAction(game);
    const updatedPlayer = nextState.players[0];

    expect(updatedPlayer.armies.length).toBe(initialArmies + 1);
    expect(updatedPlayer.resources.food).toBe(10 - cost);
    expect(updatedPlayer.actionsThisTurn).toContain(GameAction.Deploy);
  });

  it('throws if not enough food (boundary)', () => {
    game.players[0].resources.food = 0;
    expect(() => handleDeployAction(game)).toThrow(/Not enough food/);
  });

  it('throws if the player already deployed this turn', () => {
    const player = game.players[0];
    player.resources.food = 10;
    player.actionsThisTurn.push(GameAction.Deploy);
    expect(() => handleDeployAction(game)).toThrow('You can only deploy one army per turn.');
  });

  it('throws when the max army size is reached (boundary)', () => {
    const player = game.players[0];
    player.resources.food = 100;
    player.armies = [0, 1, 2, 3, 4].map((id) => ({ id, position: { x: 0, y: 0 }, hasActed: false }));
    expect(() => handleDeployAction(game)).toThrow('You have reached the maximum army size.');
  });

  it('deploys for free when Reinforce is active and discards the card', () => {
    const player = game.players[0];
    player.resources.food = 10;
    player.reinforceActive = true;
    player.specialCards = [CardName.Reinforce];
    const costBefore = player.nextArmyCost;

    const nextState = handleDeployAction(game);
    const updatedPlayer = nextState.players[0];

    expect(updatedPlayer.resources.food).toBe(10);
    expect(updatedPlayer.reinforceActive).toBe(false);
    expect(updatedPlayer.specialCards).not.toContain(CardName.Reinforce);
    expect(nextState.discardPile).toContain(CardName.Reinforce);
    expect(updatedPlayer.nextArmyCost).toBe(costBefore); // Reinforce skips the cost increment
  });

  it('deploys at half cost when Efficient is active and discards the card', () => {
    const player = game.players[0];
    player.resources.food = 10;
    player.efficientActive = true;
    player.specialCards = [CardName.Efficient];
    const costBefore = player.nextArmyCost;

    const nextState = handleDeployAction(game);
    const updatedPlayer = nextState.players[0];

    expect(updatedPlayer.resources.food).toBe(10 - Math.ceil(costBefore / 2));
    expect(updatedPlayer.efficientActive).toBe(false);
    expect(updatedPlayer.specialCards).not.toContain(CardName.Efficient);
    expect(nextState.discardPile).toContain(CardName.Efficient);
  });

  it('does not apply Reinforce or Efficient if a card was already used this turn', () => {
    const player = game.players[0];
    player.resources.food = 10;
    player.reinforceActive = true;
    player.specialCards = [CardName.Reinforce];
    player.actionsThisTurn.push(GameAction.UseCard);
    const cost = player.nextArmyCost;

    const nextState = handleDeployAction(game);
    const updatedPlayer = nextState.players[0];

    expect(updatedPlayer.resources.food).toBe(10 - cost);
    expect(updatedPlayer.specialCards).toContain(CardName.Reinforce);
  });
});

describe('handleUpgradeAction', () => {
  let game: GameState;

  beforeEach(() => {
    game = buildGame();
  });

  it('upgrades the player attack power by 1, spending wood', () => {
    const player = game.players[0];
    player.resources.wood = 20;
    const initialPower = player.attackPower;

    const nextState = handleUpgradeAction(game);
    const updatedPlayer = nextState.players[0];

    expect(updatedPlayer.attackPower).toBe(initialPower + 1);
    expect(updatedPlayer.actionsThisTurn).toContain(GameAction.Upgrade);
  });

  it('prevents upgrading beyond attack power 4 (boundary)', () => {
    const player = game.players[0];
    player.resources.wood = 50;
    player.attackPower = 4;
    expect(() => handleUpgradeAction(game)).toThrow(/maximum attack power/);
  });

  it('throws if the player already upgraded this turn', () => {
    const player = game.players[0];
    player.resources.wood = 20;
    player.actionsThisTurn.push(GameAction.Upgrade);
    expect(() => handleUpgradeAction(game)).toThrow('You can only upgrade once per turn.');
  });

  it('throws if not enough wood (boundary)', () => {
    game.players[0].resources.wood = 0;
    expect(() => handleUpgradeAction(game)).toThrow(/Not enough wood/);
  });

  it('upgrades at half cost when Master Builder is active and discards the card', () => {
    const player = game.players[0];
    player.resources.wood = 20;
    player.masterBuilderActive = true;
    player.specialCards = [CardName.MasterBuilder];
    const cost = game.settings.upgradeCost;

    const nextState = handleUpgradeAction(game);
    const updatedPlayer = nextState.players[0];

    expect(updatedPlayer.resources.wood).toBe(20 - Math.ceil(cost / 2));
    expect(updatedPlayer.masterBuilderActive).toBe(false);
    expect(updatedPlayer.specialCards).not.toContain(CardName.MasterBuilder);
    expect(nextState.discardPile).toContain(CardName.MasterBuilder);
  });
});

describe('handleCancelAction', () => {
  let game: GameState;

  beforeEach(() => {
    game = buildGame();
  });

  it('restores a discarded card to hand, reverts its flag, and logs the cancellation', () => {
    const player = game.players[0];
    player.reinforceActive = true;
    player.actionsThisTurn.push(GameAction.UseCard);
    game.discardPile = [CardName.Reinforce];

    const nextState = handleCancelAction(game, { cardName: CardName.Reinforce });
    const updatedPlayer = nextState.players[0];

    expect(updatedPlayer.reinforceActive).toBe(false);
    expect(updatedPlayer.specialCards).toContain(CardName.Reinforce);
    expect(nextState.discardPile).not.toContain(CardName.Reinforce);
    expect(updatedPlayer.actionsThisTurn).not.toContain(GameAction.UseCard);
    expect(nextState.log.some((entry) => toLogMessage(entry).includes('cancelled their action'))).toBe(true);
  });

  it('un-scouts tiles listed in scoutedTiles', () => {
    const player = game.players[0];
    player.revealedTiles = ['0-0', '1-1', '2-2'];
    game.discardPile = [CardName.Scout];

    const nextState = handleCancelAction(game, { cardName: CardName.Scout, scoutedTiles: ['1-1', '2-2'] });

    expect(nextState.players[0].revealedTiles).toEqual(['0-0']);
  });

  it('is a no-op when called with no payload (empty input)', () => {
    const player = game.players[0];
    player.reinforceActive = true;
    const logBefore = [...game.log];
    const discardBefore = [...game.discardPile];

    const nextState = handleCancelAction(game);

    expect(nextState.players[0].reinforceActive).toBe(true);
    expect(nextState.log).toEqual(logBefore); // snapshot copy: nothing was appended
    expect(nextState.discardPile).toEqual(discardBefore);
  });

  it('still reverts the card flag but restores nothing when the card is not in the discard pile (invalid input)', () => {
    const player = game.players[0];
    player.efficientActive = true;
    game.discardPile = [];

    const nextState = handleCancelAction(game, { cardName: CardName.Efficient });

    expect(nextState.players[0].efficientActive).toBe(false); // flag still reverted
    expect(nextState.players[0].specialCards).not.toContain(CardName.Efficient); // nothing to restore
  });
});
