import { 
  handleUseCard, 
  handleGainWealth, 
  handleSabotagePlayer, 
  handleStealResource, 
  handleUseProductiveCard 
} from '../actions/card';
import { handleMoveAction } from '../actions/movement';
import { handleCancelAction } from '../actions/player';
import { initializeGame, startGame, defaultGameSettings } from '../game-initializer';
import { addPlayerToGame } from '../game-logic';
import { PlayerColor, ResourceType, CardName, GameAction } from '../types';

describe('Special Cards Logic', () => {
  let game = initializeGame('game_test', 'Cards Test', 2, { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue }, 0, false, defaultGameSettings);

  beforeEach(() => {
    game = initializeGame('game_test', 'Cards Test', 2, { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue }, 0, false, defaultGameSettings);
    const added = addPlayerToGame(game, { playerId: 'p2', name: 'Player 2' });
    game = added.newGameState!;
    game = startGame(game, 'Player 1');
  });

  it('activates Extra Move card giving player an additional move', () => {
    const player = game.players[0];
    player.specialCards = ['Extra Move'];

    const nextState = handleUseCard(game, { cardName: 'Extra Move' });
    const updatedPlayer = nextState.players[0];

    expect(updatedPlayer.hasExtraMove).toBe(true);
    expect(updatedPlayer.specialCards).not.toContain('Extra Move');
    expect(nextState.discardPile).toContain('Extra Move');
  });

  it('activates Wealthy card to grant 5 resources of choice', () => {
    const player = game.players[0];
    player.specialCards = ['Wealthy'];
    const initialGems = player.resources.gems;

    const nextState = handleGainWealth(game, ResourceType.Gems);
    const updatedPlayer = nextState.players[0];

    expect(updatedPlayer.resources.gems).toBe(initialGems + 5);
    expect(updatedPlayer.specialCards).not.toContain('Wealthy');
    expect(nextState.discardPile).toContain('Wealthy');
  });

  it('activates Sabotage card on target player', () => {
    const player = game.players[0];
    const opponent = game.players[1];
    player.specialCards = ['Sabotage'];

    const nextState = handleSabotagePlayer(game, opponent.id);
    const updatedOpponent = nextState.players[1];

    expect(updatedOpponent.isSabotaged).toBe(true);
    expect(player.specialCards).not.toContain('Sabotage');
  });

  it('activates Steal Resource card', () => {
    const player = game.players[0];
    const opponent = game.players[1];
    player.specialCards = ['Steal Resource'];
    opponent.resources.iron = 10;
    const initialIron = player.resources.iron;

    const nextState = handleStealResource(game, { targetPlayerId: opponent.id, resource: ResourceType.Iron });

    expect(nextState.players[0].resources.iron).toBe(initialIron + 2);
    expect(nextState.players[1].resources.iron).toBe(8);
  });

  it('cancels active card restoring state and card back to hand', () => {
    const player = game.players[0];
    player.specialCards = ['Reinforce'];
    handleUseCard(game, { cardName: 'Reinforce' });
    expect(game.players[0].reinforceActive).toBe(true);

    const cancelledState = handleCancelAction(game, { cardName: 'Reinforce' });
    expect(cancelledState.players[0].reinforceActive).toBe(false);
  });

  it('moves army to non-adjacent tile and consumes Teleport card', () => {
    const player = game.players[0];
    player.specialCards = ['Teleport'];
    const army = player.armies[0];
    expect(army.position).toEqual({ x: 0, y: 0 });

    // Teleport to (4, 4) - far away non-adjacent tile
    const nextState = handleMoveAction(game, 4, 4, army, true);
    const updatedPlayer = nextState.players[0];

    expect(updatedPlayer.armies[0].position).toEqual({ x: 4, y: 4 });
    expect(updatedPlayer.specialCards).not.toContain('Teleport');
    expect(nextState.discardPile).toContain('Teleport');
    expect(updatedPlayer.actionsThisTurn).toContain(GameAction.UseCard);
  });
});
