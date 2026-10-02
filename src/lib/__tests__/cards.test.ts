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
    const initialGold = player.resources.gold;

    const nextState = handleGainWealth(game, ResourceType.Gold);
    const updatedPlayer = nextState.players[0];

    expect(updatedPlayer.resources.gold).toBe(initialGold + 5);
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
    opponent.resources.wood = 10;
    const initialWood = player.resources.wood;

    const nextState = handleStealResource(game, { targetPlayerId: opponent.id, resource: ResourceType.Wood });

    expect(nextState.players[0].resources.wood).toBe(initialWood + 2);
    expect(nextState.players[1].resources.wood).toBe(8);
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

  it('activates Extra Move to grant exactly 1 bonus action across any army and re-disables already-acted armies after use', () => {
    const player = game.players[0];
    player.armies = [
      { id: 0, position: { x: 0, y: 0 }, hasActed: true },
      { id: 1, position: { x: 0, y: 0 }, hasActed: true },
    ];
    player.specialCards = ['Extra Move'];

    // 1. Activate Extra Move card
    let state = handleUseCard(game, { cardName: 'Extra Move' });
    expect(state.players[0].hasExtraMove).toBe(true);
    // Other armies retain hasActed: true
    expect(state.players[0].armies[0].hasActed).toBe(true);
    expect(state.players[0].armies[1].hasActed).toBe(true);

    // 2. Army 0 uses the bonus action to move to (1, 0)
    state = handleMoveAction(state, 1, 0, state.players[0].armies[0]);
    expect(state.players[0].hasExtraMove).toBe(false);
    expect(state.players[0].armies[0].hasActed).toBe(true);
    expect(state.players[0].armies[1].hasActed).toBe(true);

    // 3. Attempting to move Army 1 should fail because Extra Move was consumed
    expect(() => {
      handleMoveAction(state, 0, 1, state.players[0].armies[1]);
    }).toThrow(/already acted/i);
  });

  it('only doubles harvest on resource where player is positioned when using Productive card', () => {
    const player = game.players[0];
    player.specialCards = ['Productive'];
    player.resources = { food: 0, wood: 0, gold: 0 };
    // Position only on Food at base (0,0)
    player.positions = [{ x: 0, y: 0, resource: ResourceType.Food, armyId: 0 }];

    // Base (0,0) has 1 Food, 1 Wood, 1 Gold
    // Request doubling Food (valid positioned resource)
    const nextState = handleUseProductiveCard(game, ResourceType.Food);
    expect(nextState.players[0].resources.food).toBe(2); // 1 * 2 = 2
    expect(nextState.players[0].specialCards).not.toContain('Productive');
    expect(nextState.discardPile).toContain('Productive');
  });

  it('does not double un-positioned resource when using Productive card', () => {
    const player = game.players[0];
    player.specialCards = ['Productive'];
    player.resources = { food: 0, wood: 0, gold: 0 };
    // Position only on Food at base (0,0)
    player.positions = [{ x: 0, y: 0, resource: ResourceType.Food, armyId: 0 }];

    // Request doubling Gold (which player is NOT positioned on)
    const nextState = handleUseProductiveCard(game, ResourceType.Gold);
    // Gold is not doubled because player is not positioned on Gold; Food collected normally
    expect(nextState.players[0].resources.food).toBe(1);
    expect(nextState.players[0].resources.gold).toBe(0);
  });
});
