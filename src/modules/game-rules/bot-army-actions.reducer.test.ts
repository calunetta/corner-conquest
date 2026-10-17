import { PlayerColor, IslandType } from '@/lib/types';
import type { GameState, ResourceType } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from './game-setup.reducer';
import { applyBotArmyActions } from './bot-army-actions.reducer';
import { getFirstMonsterAtLevel, toMonster } from './monster-catalog';
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
    // Attack power 3 gives the bot 4 dice against the human's 2, a ~94% fight, so the attack
    // outscores a resource position (see game-design.md, Final spec).
    bot.attackPower = 3;
    humanArmy.position = { ...botArmy.position };
    const sharedTile = game.map[botArmy.position.y * game.settings.gridSize.cols + botArmy.position.x];
    sharedTile.occupants.push({ playerId: human.id, armyId: humanArmy.id });

    const finalState = applyBotArmyActions(game);

    expect(finalState.combatState).toBeNull();
    expect(finalState.log.some((entry) => toLogMessage(entry).includes('in battle!'))).toBe(true);
  });

  it('declines an even fight (about 42% to win) and positions on the resource instead', () => {
    const game = buildBotTurnGame();
    const bot = game.players[1];
    const human = game.players[0];
    const botArmy = bot.armies[0];
    const humanArmy = human.armies[0];

    humanArmy.position = { ...botArmy.position };
    const sharedTile = game.map[botArmy.position.y * game.settings.gridSize.cols + botArmy.position.x];
    sharedTile.occupants.push({ playerId: human.id, armyId: humanArmy.id });

    const finalState = applyBotArmyActions(game);

    expect(finalState.log.some((entry) => toLogMessage(entry).includes('in battle!'))).toBe(false);
    expect(finalState.players[1].armies[0].position).not.toEqual(botArmy.position);
  });

  it('re-positions when its only option is a cleared, eligible position and no move is available', () => {
    const game = buildBotTurnGame();
    // Fog off: unrevealed neighbours would otherwise be exploration moves (priority 6) that beat a position (4).
    game.settings = { ...game.settings, fogOfWar: false };
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

  it('explores an unrevealed tile before re-positioning (fog exploration 6 beats position 4)', () => {
    const game = buildBotTurnGame();
    const bot = game.players[1];
    const botArmy = bot.armies[0];

    const neighborX = botArmy.position.x - 1;
    const neighborY = botArmy.position.y;
    const neighborTile = game.map[neighborY * game.settings.gridSize.cols + neighborX];
    neighborTile.type = IslandType.Special;
    expect(bot.revealedTiles).not.toContain(neighborTile.id);
    const startPosition = { ...botArmy.position };

    const finalState = applyBotArmyActions(game);

    // Every unrevealed move ties at 6; the army leaves its base for one of them instead of positioning.
    const destination = finalState.players[1].armies[0].position;
    expect(destination).not.toEqual(startPosition);
    const destinationTile = finalState.map[destination.y * game.settings.gridSize.cols + destination.x];
    expect(bot.revealedTiles).not.toContain(destinationTile.id);
    expect(finalState.players[1].positions).toHaveLength(0);
  });

  it('moves onto its own base to defend it when an enemy army is within one tile of the base', () => {
    const game = buildBotTurnGame();
    const bot = game.players[1];
    const human = game.players[0];
    const botArmy = bot.armies[0];
    const humanArmy = human.armies[0];
    const cols = game.settings.gridSize.cols;
    const base = game.baseTiles.find((b) => b.owner === bot.id)!;

    // Army starts beside the base; the base is empty; an enemy army sits next to the base on a revealed tile.
    const baseTile = game.map[base.y * cols + base.x];
    baseTile.occupants = [];
    const enemyX = base.x + 1 < cols ? base.x + 1 : base.x - 1;
    const enemyTile = game.map[base.y * cols + enemyX];
    enemyTile.occupants = [{ playerId: human.id, armyId: humanArmy.id }];
    bot.revealedTiles = [...bot.revealedTiles, enemyTile.id];
    humanArmy.position = { x: enemyX, y: base.y };
    const beside = base.y + 1 < game.settings.gridSize.rows ? base.y + 1 : base.y - 1;
    botArmy.position = { x: base.x, y: beside };

    const finalState = applyBotArmyActions(game);

    expect(finalState.players[1].armies[0].position).toEqual({ x: base.x, y: base.y });
  });

  it('attacks a monster it can beat, and clears it', () => {
    const game = buildBotTurnGame();
    game.settings = { ...game.settings, fogOfWar: false };
    const bot = game.players[1];
    const botArmy = bot.armies[0];
    const cols = game.settings.gridSize.cols;
    const monster = toMonster(getFirstMonsterAtLevel(1)!);
    const monsterX = botArmy.position.x - 1;
    // Two attack power gives the bot 3 dice against the monster's single die, about 96% to win.
    bot.attackPower = 2;
    const monsterTile = game.map[botArmy.position.y * cols + monsterX];
    monsterTile.type = IslandType.Empty;
    monsterTile.resources = [];
    monsterTile.monsters = [monster];
    botArmy.position = { x: monsterX, y: botArmy.position.y };
    // Every die rolls 6, so the bot's 2 dice always beat the level-1 monster's single die.
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.99);

    try {
      const finalState = applyBotArmyActions(game);

      expect(finalState.monsterCombatState).toBeNull();
      expect(finalState.map[monsterTile.y * cols + monsterX].monsters ?? []).toHaveLength(0);
    } finally {
      randomSpy.mockRestore();
    }
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
