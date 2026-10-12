import { PlayerColor, IslandType, CardName, ResourceType } from '@/lib/types';
import type { GameState } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from '../src/modules/game-rules/game-setup.reducer';
import { planNextStep } from './bot-ui-actions';

/** A 1-human + 1-bot game, started, with the bot (seat 1) as the current player. Mirrors
 *  bot-army-actions.reducer.test.ts's fixture, since planNextStep runs the same reducers. */
function buildBotTurnGame(): GameState {
  let game = initializeGame(
    'game_test',
    'Bot UI Actions Test',
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

/** Blocks `isArmyEligibleToPosition` on the bot's own base tile, so applyBotArmyActions's
 *  position action (priority 6) never competes with the move/attack action under test. */
function blockPositionOnHomeTile(game: GameState, botArmyPosition: { x: number; y: number }): void {
  const cols = game.settings.gridSize.cols;
  const tile = game.map[botArmyPosition.y * cols + botArmyPosition.x];
  tile.positionedBy = tile.resources.map((r) => ({ playerId: 9, resource: r.type }));
}

/** `generateIslandTerrain` (map-generation.ts) randomly assigns every non-base tile a
 *  Resource/Special/Monster type, never Empty — so without this, an unrevealed random
 *  neighbor's fog-of-war priority boost (bot-army-actions.reducer.ts:73-74, priority 6) can beat
 *  a deliberately-placed, already-revealed target tile. Resets every tile within the bot's move
 *  radius of `from` back to Empty (`getPossibleMoves` skips Empty tiles outright), so only a tile
 *  the test explicitly re-types afterward is ever reachable. */
function clearMoveRadius(game: GameState, from: { x: number; y: number }): void {
  const cols = game.settings.gridSize.cols;
  const rows = game.settings.gridSize.rows;
  const radius = 2;
  for (let i = -radius; i <= radius; i++) {
    for (let j = -radius; j <= radius; j++) {
      if (Math.abs(i) + Math.abs(j) > radius || (i === 0 && j === 0)) continue;
      const x = from.x + i;
      const y = from.y + j;
      if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
      const tile = game.map[y * cols + x];
      if (tile.type === IslandType.Base && tile.owner !== undefined) continue;
      tile.type = IslandType.Empty;
      tile.monsters = [];
      tile.resources = [];
      tile.occupants = [];
      tile.positionedBy = [];
    }
  }
}

const BOT_SEAT = 1;

describe('planNextStep', () => {
  it('returns all-empty arrays when a bot phase makes no change', () => {
    const game = buildBotTurnGame();
    const bot = game.players[BOT_SEAT];
    // No special cards to activate; applyBotCardStrategy is a pure no-op.
    expect(bot.specialCards).toHaveLength(0);

    const result = planNextStep(game, BOT_SEAT, 'cardStrategy');

    expect(result.events).toEqual([]);
    expect(result.moves).toEqual([]);
    expect(result.positions).toEqual([]);
    expect(result.attacks).toEqual([]);
    expect(result.wealthyResource).toBeNull();
  });

  it('returns a deployed event and no moves/positions/attacks for a step that deploys', () => {
    const game = buildBotTurnGame();
    const bot = game.players[BOT_SEAT];
    bot.resources[ResourceType.Food] = bot.nextArmyCost; // exactly affordable
    bot.resources[ResourceType.Wood] = 0; // too poor to also upgrade
    bot.resources[ResourceType.Gold] = 0; // too poor to also buy an ability

    const result = planNextStep(game, BOT_SEAT, 'purchases');

    expect(result.events).toEqual([{ kind: 'deployed' }]);
    expect(result.moves).toEqual([]);
    expect(result.positions).toEqual([]);
    expect(result.attacks).toEqual([]);
    expect(result.wealthyResource).toBeNull();
  });

  it('returns a populated moves (with from/to) and empty events for a plain, already-revealed reposition', () => {
    const game = buildBotTurnGame();
    const bot = game.players[BOT_SEAT];
    const botArmy = bot.armies[0];
    blockPositionOnHomeTile(game, botArmy.position);
    clearMoveRadius(game, botArmy.position);

    const cols = game.settings.gridSize.cols;
    const neighborX = botArmy.position.x - 1;
    const neighborY = botArmy.position.y;
    const neighborTile = game.map[neighborY * cols + neighborX];
    neighborTile.type = IslandType.Resource;
    neighborTile.resources = []; // not eligible for positioning, keeps this a plain move
    bot.revealedTiles.push(neighborTile.id); // already discovered: no discoveryVP log on arrival

    const result = planNextStep(game, BOT_SEAT, 'armyActions');

    expect(result.moves).toEqual([
      { armyId: botArmy.id, from: { x: botArmy.position.x, y: botArmy.position.y }, to: { x: neighborX, y: neighborY } },
    ]);
    expect(result.events).toEqual([]);
    expect(result.positions).toEqual([]);
    expect(result.attacks).toEqual([]);
    expect(result.wealthyResource).toBeNull();
  });

  it('returns both a populated moves and a discoveryVP event for a move onto a never-revealed tile', () => {
    const game = buildBotTurnGame();
    const bot = game.players[BOT_SEAT];
    const botArmy = bot.armies[0];
    blockPositionOnHomeTile(game, botArmy.position);
    clearMoveRadius(game, botArmy.position);

    const cols = game.settings.gridSize.cols;
    const neighborX = botArmy.position.x - 1;
    const neighborY = botArmy.position.y;
    const neighborTile = game.map[neighborY * cols + neighborX];
    neighborTile.type = IslandType.Resource;
    neighborTile.resources = [];
    // Not pushed to bot.revealedTiles or any other player's: first discovery.

    const result = planNextStep(game, BOT_SEAT, 'armyActions');

    expect(result.moves).toEqual([
      { armyId: botArmy.id, from: { x: botArmy.position.x, y: botArmy.position.y }, to: { x: neighborX, y: neighborY } },
    ]);
    expect(result.events).toEqual([{ kind: 'discoveryVP' }]);
    expect(result.positions).toEqual([]);
    expect(result.attacks).toEqual([]);
    expect(result.wealthyResource).toBeNull();
  });

  it('returns a populated positions and empty events/moves/attacks for a SelectResourcePosition step', () => {
    const game = buildBotTurnGame();
    const bot = game.players[BOT_SEAT];
    const botArmy = bot.armies[0];
    // The bot's own base tile is Base type with open resource spots and no monster; every
    // neighboring tile is Empty, so getPossibleMoves returns nothing (same setup as
    // bot-army-actions.reducer.test.ts's "re-positions when its only option..." case).

    const result = planNextStep(game, BOT_SEAT, 'armyActions');

    // Base tile's resources are seeded [Food, Wood, Gold] (game-setup.reducer.ts) with none
    // positioned yet, so findAvailableResourceSpot picks Food first.
    expect(result.positions).toEqual([
      { armyId: botArmy.id, at: { x: botArmy.position.x, y: botArmy.position.y }, resource: ResourceType.Food },
    ]);
    expect(result.events).toEqual([]);
    expect(result.moves).toEqual([]);
    expect(result.attacks).toEqual([]);
    expect(result.wealthyResource).toBeNull();
  });

  it('returns a populated attacks for an InitiateCombat step, inferred from hasActed flipping', () => {
    const game = buildBotTurnGame();
    const bot = game.players[BOT_SEAT];
    const human = game.players[0];
    const botArmy = bot.armies[0];
    const humanArmy = human.armies[0];

    // Put the human's army on the bot's own tile, so attack (priority 8+) outranks positioning.
    humanArmy.position = { ...botArmy.position };
    const sharedTile = game.map[botArmy.position.y * game.settings.gridSize.cols + botArmy.position.x];
    sharedTile.occupants.push({ playerId: human.id, armyId: humanArmy.id });

    const result = planNextStep(game, BOT_SEAT, 'armyActions');

    expect(result.attacks).toEqual([{ armyId: botArmy.id, at: { x: botArmy.position.x, y: botArmy.position.y } }]);
    expect(result.moves).toEqual([]);
    expect(result.positions).toEqual([]);
    expect(result.state.combatState).toBeNull();
  });

  it('returns a non-null wealthyResource and the matching events for a Wealthy card step', () => {
    const game = buildBotTurnGame();
    const bot = game.players[BOT_SEAT];
    bot.specialCards = [CardName.Wealthy];
    bot.resources[ResourceType.Food] = 0; // poorer than nextArmyCost: Wealthy targets food

    const result = planNextStep(game, BOT_SEAT, 'cardStrategy');

    expect(result.wealthyResource).toBe(ResourceType.Food);
    expect(result.events).toEqual([
      { kind: 'wealthyGranted' },
      { kind: 'cardConsumed', cardName: CardName.Wealthy },
    ]);
    expect(result.moves).toEqual([]);
    expect(result.positions).toEqual([]);
    expect(result.attacks).toEqual([]);
  });

  it('does not mutate the input state (pure diffing against a clone)', () => {
    const game = buildBotTurnGame();
    const bot = game.players[BOT_SEAT];
    const armyPositionBefore = { ...bot.armies[0].position };
    const logLengthBefore = game.log.length;

    planNextStep(game, BOT_SEAT, 'armyActions');

    expect(game.players[BOT_SEAT].armies[0].position).toEqual(armyPositionBefore);
    expect(game.log.length).toBe(logLengthBefore);
  });
});
