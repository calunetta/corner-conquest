import { PlayerColor, CardName, ResourceType } from '@/lib/types';
import type { GameState } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from './game-setup.reducer';
import { applyBotCardStrategy } from './bot-card-strategy.reducer';

/** A 1-human + 1-bot game, started, with the bot as the current player. */
function buildBotTurnGame(): GameState {
  let game = initializeGame(
    'game_test',
    'Bot Card Strategy Test',
    1,
    { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue },
    1,
    false,
    defaultGameSettings,
  );
  game = startGame(game, 'Player 1');
  game.currentPlayerIndex = 1;
  return game;
}

describe('applyBotCardStrategy', () => {
  it('a bot holding Productive with a pending dialog for its own seat resolves it (reproduces the stalled auto-collection bug)', () => {
    const game = buildBotTurnGame();
    const bot = game.players[1];
    bot.specialCards = [CardName.Productive];
    const armyPos = bot.armies[0].position;
    bot.positions.push({
      armyId: bot.armies[0].id,
      resource: ResourceType.Gold,
      x: armyPos.x,
      y: armyPos.y,
    });
    const tile = game.map[armyPos.y * game.settings.gridSize.cols + armyPos.x];
    tile.positionedBy = [{ playerId: bot.id, resource: ResourceType.Gold }];
    // Mirrors what handleEndTurn does on rotation into a Productive-holding player
    // (player-turn.reducer.ts:92-93): it arms the dialog instead of auto-collecting.
    game.productiveDialogState = { playerId: bot.id };
    const goldBefore = bot.resources.gold;

    const nextState = applyBotCardStrategy(game);

    expect(nextState.productiveDialogState).toBeNull();
    expect(nextState.players[1].resources.gold).toBeGreaterThan(goldBefore);
    expect(nextState.players[1].positions).toHaveLength(0); // cleared on collect, same as the human flow
  });

  it('a bot holding Productive with no positioned armies still resolves (clears) the pending dialog (boundary: empty positions)', () => {
    const game = buildBotTurnGame();
    const bot = game.players[1];
    bot.specialCards = [CardName.Productive];
    bot.positions = [];
    game.productiveDialogState = { playerId: bot.id };

    const nextState = applyBotCardStrategy(game);

    expect(nextState.productiveDialogState).toBeNull();
  });

  it('a bot without Productive and no pending dialog is unaffected (boundary: invalid/no-op input)', () => {
    const game = buildBotTurnGame();
    const bot = game.players[1];
    bot.specialCards = [];
    game.productiveDialogState = null;

    const nextState = applyBotCardStrategy(game);

    expect(nextState.productiveDialogState).toBeNull();
  });
});
