import { PlayerColor, IslandType } from '@/lib/types';
import type { GameState, ResourceType } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from './game-setup.reducer';
import { applyBotArmyActions } from './bot-army-actions.reducer';
import { toLogMessage } from './log-entry';

/** A 1-human + 1-bot game, started, with the bot as the current player. */
function buildBotTurnGame(): GameState {
  let game = initializeGame(
    'game_test',
    'Bot Army Actions Test',
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

describe('applyBotArmyActions', () => {
  it('prefers attacking an enemy sharing its tile over re-positioning on the same (eligible) tile', () => {
    const game = buildBotTurnGame();
    const bot = game.players[1];
    const human = game.players[0];
    const botArmy = bot.armies[0];
    const humanArmy = human.armies[0];

    // Bot's own base tile is a positionable Resource/Base tile with open spots; put the human
    // army there too, so both an attack action (priority ~8) and a position action (priority 6)
    // are available for the same army this loop.
    humanArmy.position = { ...botArmy.position };
    const sharedTile = game.map[botArmy.position.y * game.settings.gridSize.cols + botArmy.position.x];
    sharedTile.occupants.push({ playerId: human.id, armyId: humanArmy.id });

    const finalState = applyBotArmyActions(game);

    expect(finalState.combatState).toBeNull();
    expect(finalState.log.some((entry) => toLogMessage(entry).includes('in battle!'))).toBe(true);
  });

  it('re-positions when its only option is a cleared, eligible position and no move is available', () => {
    const game = buildBotTurnGame();
    const bot = game.players[1];
    const botArmy = bot.armies[0];
    // The bot's own base tile is Base type with 3 open resource spots and no monster; every
    // neighboring tile is still the default Empty type, so getPossibleMoves returns nothing.

    const finalState = applyBotArmyActions(game);

    const updatedBot = finalState.players[1];
    expect(updatedBot.positions).toHaveLength(1);
    expect(updatedBot.positions[0].armyId).toBe(botArmy.id);
    expect(finalState.log.some((entry) => toLogMessage(entry).includes('positioned an army on'))).toBe(true);
  });

  it('re-positions rather than wandering onto an unrevealed tile when both are priority 6 (regression: game-design finding 1)', () => {
    const game = buildBotTurnGame();
    const bot = game.players[1];
    const botArmy = bot.armies[0];

    // Give the bot an unrevealed, non-Empty neighbor tile so a fog-of-war move (priority 6) ties
    // with the position action (also priority 6). The position action is pushed first in the
    // code for the same army, so a stable sort must keep it ahead of the move.
    const neighborX = botArmy.position.x - 1;
    const neighborY = botArmy.position.y;
    const neighborTile = game.map[neighborY * game.settings.gridSize.cols + neighborX];
    neighborTile.type = IslandType.Special;
    expect(bot.revealedTiles).not.toContain(neighborTile.id);

    const finalState = applyBotArmyActions(game);

    const updatedBot = finalState.players[1];
    expect(updatedBot.positions).toHaveLength(1);
    expect(updatedBot.positions[0].armyId).toBe(botArmy.id);
    // The army did not move off its base tile to chase the unrevealed tile.
    expect(updatedBot.armies[0].position).toEqual(botArmy.position);
  });

  it('does nothing when the bot has no unacted armies (boundary)', () => {
    const game = buildBotTurnGame();
    const bot = game.players[1];
    bot.armies[0].hasActed = true;

    const finalState = applyBotArmyActions(game);

    expect(finalState.players[1].positions).toHaveLength(0);
    expect(finalState.players[1].armies[0].position).toEqual(bot.armies[0].position);
  });

  it('does not position on a resource that is not open (boundary: all spots already taken)', () => {
    const game = buildBotTurnGame();
    const bot = game.players[1];
    const botArmy = bot.armies[0];
    const tile = game.map[botArmy.position.y * game.settings.gridSize.cols + botArmy.position.x];
    tile.positionedBy = tile.resources.map((r) => ({ playerId: 9, resource: r.type as ResourceType }));

    const finalState = applyBotArmyActions(game);

    expect(finalState.players[1].positions).toHaveLength(0);
  });
});
