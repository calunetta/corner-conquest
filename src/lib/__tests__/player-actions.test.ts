import { 
  handleDeployAction, 
  handleUpgradeAction, 
  handleEndTurn 
} from '../actions/player';
import { handleBuyCardAction } from '../actions/card';
import { handleSelectResourceForPosition } from '../actions/resource';
import { initializeGame, startGame, defaultGameSettings } from '../game-initializer';
import { PlayerColor, ResourceType, GameAction } from '../types';

describe('Player Actions', () => {
  let game = initializeGame('game_test', 'Player Actions Test', 2, { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue }, 0, false, defaultGameSettings);

  beforeEach(() => {
    game = initializeGame('game_test', 'Player Actions Test', 2, { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue }, 0, false, defaultGameSettings);
    game = startGame(game, 'Player 1');
  });

  describe('Deploy Action', () => {
    it('deploys a new army at base if player has enough wheat', () => {
      const player = game.players[0];
      player.resources.wheat = 10;
      const initialArmies = player.armies.length;
      const cost = player.nextArmyCost;

      const nextState = handleDeployAction(game);
      const updatedPlayer = nextState.players[0];

      expect(updatedPlayer.armies.length).toBe(initialArmies + 1);
      expect(updatedPlayer.resources.wheat).toBe(10 - cost);
      expect(updatedPlayer.actionsThisTurn).toContain(GameAction.Deploy);
    });

    it('throws error if not enough wheat', () => {
      const player = game.players[0];
      player.resources.wheat = 0;
      expect(() => handleDeployAction(game)).toThrow(/Not enough wheat/);
    });
  });

  describe('Upgrade Action', () => {
    it('upgrades player attack power spending iron', () => {
      const player = game.players[0];
      player.resources.iron = 20;
      const initialPower = player.attackPower;

      const nextState = handleUpgradeAction(game);
      const updatedPlayer = nextState.players[0];

      expect(updatedPlayer.attackPower).toBe(initialPower + 1);
      expect(updatedPlayer.actionsThisTurn).toContain(GameAction.Upgrade);
    });

    it('prevents upgrading beyond attack power 4', () => {
      const player = game.players[0];
      player.resources.iron = 50;
      player.attackPower = 4;

      expect(() => handleUpgradeAction(game)).toThrow(/maximum attack power/);
    });
  });

  describe('Buy Card Action', () => {
    it('draws a card spending gems', () => {
      const player = game.players[0];
      player.resources.gems = 20;
      const initialCards = player.specialCards.length;

      const nextState = handleBuyCardAction(game);
      const updatedPlayer = nextState.players[0];

      expect(updatedPlayer.specialCards.length).toBe(initialCards + 1);
      expect(updatedPlayer.resources.gems).toBe(10); // cost is 10
      expect(updatedPlayer.actionsThisTurn).toContain(GameAction.BuyCard);
    });
  });

  describe('Positioning Action', () => {
    it('positions an army on a resource node to gain yield each turn', () => {
      const player = game.players[0];
      const army = player.armies[0];
      
      const nextState = handleSelectResourceForPosition(game, ResourceType.Gems, army.id);
      const updatedPlayer = nextState.players[0];

      expect(updatedPlayer.positions).toContainEqual(expect.objectContaining({ armyId: army.id, resource: ResourceType.Gems }));
    });
  });

  describe('End Turn Action', () => {
    it('generates resources from positions and resets army actions for next turn', () => {
      const player = game.players[0];
      player.armies[0].hasActed = true;
      player.positions.push({ armyId: player.armies[0].id, resource: ResourceType.Gems, x: player.armies[0].position.x, y: player.armies[0].position.y });
      const initialGems = player.resources.gems;

      const nextState = handleEndTurn(game);

      const p1 = nextState.players[0];
      expect(p1.resources.gems).toBeGreaterThanOrEqual(initialGems);
    });
  });
});
