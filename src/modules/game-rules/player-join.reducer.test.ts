import { PlayerColor, GameStatus } from '@/lib/types';
import {
  initializeGame,
  startGame,
  defaultGameSettings,
  addPlayerToGame,
} from './index';
import { toLogMessage } from './log-entry';

describe('player-join.reducer: addPlayerToGame', () => {
  describe('full game branch', () => {
    it('rejects joining when game is already full', () => {
      const game = initializeGame(
        'game_test',
        'Full Game Test',
        2,
        { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue },
        0,
        false,
        defaultGameSettings
      );

      // Add second player to fill the game
      const added = addPlayerToGame(game, { playerId: 'p2', name: 'Player 2' });
      const fullGame = added.newGameState!;

      // Now game is full (2/2 players)
      expect(fullGame.players.length).toBe(2);
      expect(fullGame.status).toBe(GameStatus.Playing);

      // Try to add third player — should be rejected
      const result = addPlayerToGame(fullGame, { playerId: 'p3', name: 'Player 3' });

      expect(result.newGameState).toBeNull();
      expect(result.newBaseTile).toBeNull();
    });
  });

  describe('color exhausted branch', () => {
    it('rejects joining when all player colors are taken', () => {
      // Create game with 4 players (all colors used) — maxPlayers=1, numBots=3 creates 1+3 players
      const game = initializeGame(
        'game_test',
        'Color Exhausted Test',
        1,
        { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue },
        3, // 3 bots fill remaining colors
        false,
        defaultGameSettings
      );

      // Verify all colors are assigned
      expect(game.players.length).toBe(4);
      const usedColors = game.players.map(p => p.color);
      expect(usedColors).toContain(PlayerColor.Blue);
      expect(usedColors).toContain(PlayerColor.Red);
      expect(usedColors).toContain(PlayerColor.Purple);
      expect(usedColors).toContain(PlayerColor.Yellow);

      // Try to join — should reject because all colors are taken
      const result = addPlayerToGame(game, { playerId: 'p5', name: 'Player 5' });

      expect(result.newGameState).toBeNull();
      expect(result.newBaseTile).toBeNull();
    });
  });

  describe('already joined branch', () => {
    it('returns original game state without changes when same playerId joins twice', () => {
      const game = initializeGame(
        'game_test',
        'Already Joined Test',
        2,
        { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue },
        0,
        false,
        defaultGameSettings
      );

      const initialGameState = JSON.stringify(game);

      // Attempt to add same playerId again
      const result = addPlayerToGame(game, { playerId: 'p1', name: 'Player 1 (again)' });

      expect(result.newBaseTile).toBeNull();
      expect(result.newGameState).toBe(game); // Returns original object reference
      expect(JSON.stringify(result.newGameState)).toBe(initialGameState);
      expect(game.players.length).toBe(1); // Still 1 player
    });
  });

  describe('status check branch', () => {
    it('rejects joining when game status is not Waiting', () => {
      const game = initializeGame(
        'game_test',
        'Status Check Test',
        2,
        { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue },
        0,
        false,
        defaultGameSettings
      );

      // Add second player and start game
      const added = addPlayerToGame(game, { playerId: 'p2', name: 'Player 2' });
      const playingGame = startGame(added.newGameState!, 'Player 1');

      expect(playingGame.status).toBe(GameStatus.Playing);

      // Try to join a playing game
      const result = addPlayerToGame(playingGame, { playerId: 'p3', name: 'Player 3' });

      expect(result.newGameState).toBeNull();
      expect(result.newBaseTile).toBeNull();
    });
  });

  describe('successful join', () => {
    it('accepts a valid join and transitions game status to Playing when last seat is filled', () => {
      let game = initializeGame(
        'game_test',
        'Last Seat Test',
        2,
        { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue },
        0,
        false,
        defaultGameSettings
      );

      expect(game.players.length).toBe(1);
      expect(game.status).toBe(GameStatus.Waiting);

      // Add second player (last available seat)
      const result = addPlayerToGame(game, { playerId: 'p2', name: 'Player 2' });

      expect(result.newGameState).not.toBeNull();
      expect(result.newBaseTile).not.toBeNull();

      game = result.newGameState!;

      // Game should now be full and playing
      expect(game.players.length).toBe(2);
      expect(game.status).toBe(GameStatus.Playing);
      expect(game.turn).toBe(1);
      expect(game.log.some((entry) => toLogMessage(entry) === 'The game is full. Starting now.')).toBe(true);
    });

    it('accepts a valid join and keeps game in Waiting status when seats remain', () => {
      let game = initializeGame(
        'game_test',
        'Waiting Status Test',
        3,
        { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue },
        0,
        false,
        defaultGameSettings
      );

      expect(game.players.length).toBe(1);
      expect(game.status).toBe(GameStatus.Waiting);

      // Add second player (still room for more)
      const result = addPlayerToGame(game, { playerId: 'p2', name: 'Player 2' });

      expect(result.newGameState).not.toBeNull();
      expect(result.newBaseTile).not.toBeNull();

      game = result.newGameState!;

      // Game should still be waiting
      expect(game.players.length).toBe(2);
      expect(game.status).toBe(GameStatus.Waiting);
      expect(game.log.some((entry) => toLogMessage(entry).includes('has joined the game'))).toBe(true);
    });

    it('assigns distinct colors to each player', () => {
      let game = initializeGame(
        'game_test',
        'Color Assignment Test',
        4,
        { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue },
        0,
        false,
        defaultGameSettings
      );

      let added = addPlayerToGame(game, { playerId: 'p2', name: 'Player 2' });
      game = added.newGameState!;

      added = addPlayerToGame(game, { playerId: 'p3', name: 'Player 3' });
      game = added.newGameState!;

      const colors = game.players.map(p => p.color);
      expect(new Set(colors).size).toBe(3); // All different
    });

    it('places base tile at the correct corner based on seat index', () => {
      const cols = defaultGameSettings.gridSize.cols;
      const rows = defaultGameSettings.gridSize.rows;

      let game = initializeGame(
        'game_test',
        'Base Placement Test',
        2,
        { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue },
        0,
        false,
        defaultGameSettings
      );

      // First player base should be at (0, 0)
      expect(game.baseTiles[0]).toEqual({ owner: 0, x: 0, y: 0 });

      // Add second player
      const result = addPlayerToGame(game, { playerId: 'p2', name: 'Player 2' });
      game = result.newGameState!;

      // Second player base should be at (cols-1, rows-1)
      expect(result.newBaseTile).toEqual({
        owner: 1,
        x: cols - 1,
        y: rows - 1,
      });
      expect(game.baseTiles[1]).toEqual(result.newBaseTile);
    });
  });
});
