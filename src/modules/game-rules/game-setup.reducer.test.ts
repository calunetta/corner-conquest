import { initializeGame, startGame, defaultGameSettings } from './game-setup.reducer';
import { GameStatus, IslandType, PlayerColor, MAP_COLS, MAP_ROWS } from '@/lib/types';

describe('Game Setup Reducer', () => {
  it('creates a game with valid initial state and corner bases', () => {
    const creator = { playerId: 'user_1', name: 'Alice', color: PlayerColor.Blue };
    const game = initializeGame('game_123', 'Test Match', 2, creator, 0, false, defaultGameSettings);

    expect(game.id).toBe('game_123');
    expect(game.name).toBe('Test Match');
    expect(game.status).toBe(GameStatus.Waiting);
    expect(game.players.length).toBe(1);
    expect(game.players[0].name).toBe('Alice');
    expect(game.players[0].color).toBe(PlayerColor.Blue);
    expect(game.map.length).toBe(MAP_COLS * MAP_ROWS);

    // Creator base tile
    const creatorBase = game.map.find(i => i.type === IslandType.Base && i.owner === 0);
    expect(creatorBase).toBeDefined();
    expect(creatorBase?.occupants.length).toBe(1);
    expect(creatorBase?.resources.length).toBe(3); // Food, Wood, Gold

    // Special card deck
    expect(game.specialCardsDeck.length).toBeGreaterThan(0);
    expect(game.discardPile).toEqual([]);
  });

  it('creates bot players when numBots is greater than 0', () => {
    const creator = { playerId: 'user_1', name: 'Alice', color: PlayerColor.Blue };
    const game = initializeGame('game_bot', 'Bot Match', 1, creator, 3, false, defaultGameSettings);

    expect(game.players.length).toBe(4);
    expect(game.players.filter(p => p.isBot).length).toBe(3);
    expect(game.baseTiles.length).toBe(4);
  });

  it('starts game correctly transitioning status to Playing and turn 1', () => {
    const creator = { playerId: 'user_1', name: 'Alice', color: PlayerColor.Blue };
    const game = initializeGame('game_123', 'Test Match', 2, creator, 0, false, defaultGameSettings);
    const started = startGame(game, 'Alice');

    expect(started.status).toBe(GameStatus.Playing);
    expect(started.turn).toBe(1);
    expect(started.log[started.log.length - 1]).toContain('started the game');
  });
});
