import { PlayerColor, CardName, IslandType, MonsterName } from '@/lib/types';
import type { GameState } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from './game-setup.reducer';
import { decideBotTurn } from './bot-turn.reducer';
import { toLogMessage } from './log-entry';

/** A 1-human + 1-bot game, started, with the bot as the current player. */
function buildBotTurnGame(): GameState {
  let game = initializeGame(
    'game_test',
    'Bot Turn Test',
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

describe('decideBotTurn', () => {
  it('a bot with Reinforce in hand activates it pre-turn', () => {
    const game = buildBotTurnGame();
    const bot = game.players[1];
    bot.specialCards.push(CardName.Reinforce);

    const finalState = decideBotTurn(game);

    expect(finalState.log.map(toLogMessage)).toContain(`${bot.name} activated '${CardName.Reinforce}'.`);
  });

  it('a bot on the same tile as an enemy army attacks instead of moving away', () => {
    const game = buildBotTurnGame();
    const bot = game.players[1];
    const human = game.players[0];
    const botArmy = bot.armies[0];
    const humanArmy = human.armies[0];
    const sharedPosition = { x: 2, y: 2 };

    botArmy.position = { ...sharedPosition };
    humanArmy.position = { ...sharedPosition };
    const tile = game.map[sharedPosition.y * game.settings.gridSize.cols + sharedPosition.x];
    tile.type = IslandType.Empty;
    tile.resources = [];
    tile.monsters = [];
    tile.occupants = [
      { playerId: bot.id, armyId: botArmy.id },
      { playerId: human.id, armyId: humanArmy.id },
    ];

    const finalState = decideBotTurn(game);

    // Combat resolves and clears to null in every outcome; the "in battle!" line is only ever
    // logged by handleCloseCombat, so its presence proves the bot attacked rather than moved away.
    expect(finalState.combatState).toBeNull();
    expect(finalState.log.some((entry) => toLogMessage(entry).includes('in battle!'))).toBe(true);
  });

  it('a monster-combat triggered mid-army-actions auto-resolves via MonsterCombatRoll and CloseMonsterCombat', () => {
    const game = buildBotTurnGame();
    const bot = game.players[1];
    const botArmy = bot.armies[0];
    const position = { x: 2, y: 2 };

    botArmy.position = { ...position };
    const tile = game.map[position.y * game.settings.gridSize.cols + position.x];
    tile.type = IslandType.Monster;
    tile.resources = [];
    tile.occupants = [{ playerId: bot.id, armyId: botArmy.id }];
    tile.monsters = [{ name: MonsterName.Lancer, level: 1, sprite: { idle: '', attack: '', death: '' } }];

    const finalState = decideBotTurn(game);

    expect(finalState.monsterCombatState).toBeNull();
  });

  it('a bot with every army already acted ends its turn without looping forever (outer guard: unactedArmies.length === 0, empty input)', () => {
    const game = buildBotTurnGame();
    const bot = game.players[1];
    bot.armies.forEach((army) => {
      army.hasActed = true;
    });

    const finalState = decideBotTurn(game);

    // handleEndTurn ran exactly once: current player advanced from the bot (seat 1) back to the
    // human (seat 0), and its log line was appended.
    expect(finalState.currentPlayerIndex).toBe(0);
    expect(finalState.log.map(toLogMessage)).toContain("It's now Player 1's turn.");
  });

  it('a bot with an unacted army that has zero scoreable actions ends its turn without looping forever (inner guard: possibleActions.length === 0)', () => {
    const game = buildBotTurnGame();
    const bot = game.players[1];
    const botArmy = bot.armies[0];
    expect(botArmy.hasActed).toBe(false);
    const cols = game.settings.gridSize.cols;
    const origin = { x: 0, y: 0 };
    botArmy.position = { ...origin };

    // Every tile within the army's move radius (including its own) is Empty: no enemy, no
    // monster, nothing to position on, and getPossibleMoves skips Empty tiles entirely, so the
    // loop's possibleActions array for this army is []. In-bounds offsets from (0,0) within
    // manhattan distance 2 (the move radius), plus the origin itself.
    const reachableOffsets = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 1 },
    ];
    reachableOffsets.forEach(({ x, y }) => {
      const tile = game.map[y * cols + x];
      tile.type = IslandType.Empty;
      tile.resources = [];
      tile.monsters = [];
      tile.occupants = [];
    });
    game.map[origin.y * cols + origin.x].occupants = [{ playerId: bot.id, armyId: botArmy.id }];

    const finalState = decideBotTurn(game);

    expect(finalState.currentPlayerIndex).toBe(0);
    expect(finalState.log.map(toLogMessage)).toContain("It's now Player 1's turn.");
    // The army never got a chance to act (no move, attack or position had a candidate).
    expect(finalState.players[1].armies[0].hasActed).toBe(false);
  });

  it('does not mutate the state passed in (pure reducer)', () => {
    const game = buildBotTurnGame();
    const logLengthBefore = game.log.length;
    const currentPlayerIndexBefore = game.currentPlayerIndex;

    decideBotTurn(game);

    expect(game.log).toHaveLength(logLengthBefore);
    expect(game.currentPlayerIndex).toBe(currentPlayerIndexBefore);
  });
});
