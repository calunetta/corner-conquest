import { PlayerColor } from '@/lib/types';
import type { GameState } from '@/lib/types';
import { GameStatus } from '@/lib/types';
import { initializeGame, defaultGameSettings, addPlayerToGame } from '@/modules/game-rules';

jest.mock('@/lib/firebase', () => ({
  db: {},
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({ id: 'generated-id' })),
  query: jest.fn(() => ({})),
  where: jest.fn(() => ({})),
  onSnapshot: jest.fn(),
  setDoc: jest.fn(),
  runTransaction: jest.fn(),
}));

import { db, collection, doc, query, where, onSnapshot, setDoc, runTransaction } from '@/lib/firebase';
// Imported after the mock so the service picks up the mocked `@/lib/firebase` module.
import { subscribeToOpenGames, createGameId, saveGame, joinOpenGame } from './lobby.service';

const mockOnSnapshot = onSnapshot as jest.Mock;
const mockRunTransaction = runTransaction as jest.Mock;
const mockSetDoc = setDoc as jest.Mock;
const mockDoc = doc as jest.Mock;
const mockCollection = collection as jest.Mock;
const mockQuery = query as jest.Mock;
const mockWhere = where as jest.Mock;

type FakeTransaction = {
  get: jest.Mock;
  set: jest.Mock;
};

/** Wires `runTransaction` to invoke its callback with a fake transaction reading `gameState`. */
function stubTransaction(gameState: GameState | null): FakeTransaction {
  const transaction: FakeTransaction = {
    get: jest.fn().mockResolvedValue({
      exists: () => gameState !== null,
      data: () => gameState,
    }),
    set: jest.fn(),
  };
  mockRunTransaction.mockImplementation(async (_db: unknown, callback: (t: FakeTransaction) => Promise<void>) => {
    await callback(transaction);
  });
  return transaction;
}

function buildWaitingGame(maxPlayers: number): GameState {
  return initializeGame(
    'game_test',
    'Lobby Service Test',
    maxPlayers,
    { playerId: 'host', name: 'Host', color: PlayerColor.Blue },
    0,
    false,
    defaultGameSettings,
  );
}

describe('lobby.service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('subscribeToOpenGames', () => {
    it('queries games where status === Waiting', () => {
      subscribeToOpenGames(jest.fn(), jest.fn());

      expect(mockCollection).toHaveBeenCalledWith(db, 'games');
      expect(mockWhere).toHaveBeenCalledWith('status', '==', GameStatus.Waiting);
      expect(mockQuery).toHaveBeenCalled();
    });

    it('builds the games array with id and settings patched from the snapshot (empty input: no docs)', () => {
      const onGames = jest.fn();
      mockOnSnapshot.mockImplementation((_q, successCallback) => {
        successCallback({ forEach: () => undefined });
        return jest.fn();
      });

      subscribeToOpenGames(onGames, jest.fn());

      expect(onGames).toHaveBeenCalledWith([]);
    });

    it('patches id from the doc snapshot id and falls back to defaultGameSettings when settings is missing', () => {
      const onGames = jest.fn();
      const docs = [
        { id: 'doc-1', data: () => ({ name: 'Game One', settings: undefined }) },
        { id: 'doc-2', data: () => ({ name: 'Game Two', settings: { victoryPointGoal: 99 } }) },
      ];
      mockOnSnapshot.mockImplementation((_q, successCallback) => {
        successCallback({ forEach: (cb: (d: unknown) => void) => docs.forEach(cb) });
        return jest.fn();
      });

      subscribeToOpenGames(onGames, jest.fn());

      const games = onGames.mock.calls[0][0] as GameState[];
      expect(games).toHaveLength(2);
      expect(games[0].id).toBe('doc-1');
      expect(games[0].settings).toBe(defaultGameSettings);
      expect(games[1].id).toBe('doc-2');
      expect(games[1].settings).toEqual({ victoryPointGoal: 99 });
    });

    it('calls onError when the listener itself fails', () => {
      const onError = jest.fn();
      const error = new Error('listener failed');
      mockOnSnapshot.mockImplementation((_q, _successCallback, errorCallback) => {
        errorCallback(error);
        return jest.fn();
      });

      subscribeToOpenGames(jest.fn(), onError);

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('returns the unsubscribe function returned by onSnapshot', () => {
      const unsubscribe = jest.fn();
      mockOnSnapshot.mockReturnValue(unsubscribe);

      const result = subscribeToOpenGames(jest.fn(), jest.fn());

      expect(result).toBe(unsubscribe);
    });
  });

  describe('createGameId', () => {
    it('reserves an id via doc(collection(db, "games")).id without writing', () => {
      const id = createGameId();

      expect(mockCollection).toHaveBeenCalledWith(db, 'games');
      expect(mockDoc).toHaveBeenCalled();
      expect(id).toBe('generated-id');
      expect(mockSetDoc).not.toHaveBeenCalled();
    });
  });

  describe('saveGame', () => {
    it('calls setDoc(doc(db, "games", game.id), game)', async () => {
      const game = buildWaitingGame(2);

      await saveGame(game);

      expect(mockDoc).toHaveBeenCalledWith(db, 'games', game.id);
      expect(mockSetDoc).toHaveBeenCalledWith(expect.anything(), game);
    });
  });

  describe('joinOpenGame', () => {
    it('throws "Game not found." when the match document does not exist', async () => {
      stubTransaction(null);

      await expect(joinOpenGame('game_test', { playerId: 'p2', name: 'Player 2' })).rejects.toThrow(
        'Game not found.',
      );
    });

    it('throws "This game has already started or is no longer available." when status is not Waiting', async () => {
      const game = buildWaitingGame(2);
      game.status = GameStatus.Playing;
      stubTransaction(game);

      await expect(joinOpenGame('game_test', { playerId: 'p2', name: 'Player 2' })).rejects.toThrow(
        'This game has already started or is no longer available.',
      );
    });

    it('throws "This game is full." when players.length >= maxPlayers (boundary)', async () => {
      // addPlayerToGame auto-starts the match (status -> Playing) the moment it fills the last seat,
      // so a Waiting game with players.length >= maxPlayers can't be reached through that reducer;
      // it is built directly here to exercise this service-level guard in isolation.
      const game = buildWaitingGame(2);
      game.status = GameStatus.Waiting;
      game.players = [...game.players, { ...game.players[0], playerId: 'p2', name: 'Player 2' }];
      stubTransaction(game);

      await expect(joinOpenGame('game_test', { playerId: 'p3', name: 'Player 3' })).rejects.toThrow(
        'This game is full.',
      );
    });

    it('resolves without writing when the player is already in game.players (silent no-op)', async () => {
      let game = buildWaitingGame(3);
      game = addPlayerToGame(game, { playerId: 'p2', name: 'Player 2' }).newGameState!;
      const transaction = stubTransaction(game);

      await expect(joinOpenGame('game_test', { playerId: 'p2', name: 'Player 2' })).resolves.toBeUndefined();

      expect(transaction.set).not.toHaveBeenCalled();
    });

    it('throws "Could not add player to game..." when addPlayerToGame cannot seat the player', async () => {
      // A game that is already full by every rule addPlayerToGame checks internally (no free color),
      // but whose players.length is still below maxPlayers so the row-level "This game is full." guard
      // above does not trip first: 4 players already seated vs. settings' own 4 colors, maxPlayers 5.
      let game = buildWaitingGame(5);
      game = addPlayerToGame(game, { playerId: 'p2', name: 'Player 2' }).newGameState!;
      game = addPlayerToGame(game, { playerId: 'p3', name: 'Player 3' }).newGameState!;
      game = addPlayerToGame(game, { playerId: 'p4', name: 'Player 4' }).newGameState!;
      stubTransaction(game);

      await expect(joinOpenGame('game_test', { playerId: 'p5', name: 'Player 5' })).rejects.toThrow(
        'Could not add player to game. The room might be full or color unavailable.',
      );
    });

    it('calls transaction.set with addPlayerToGame\'s newGameState on success', async () => {
      const game = buildWaitingGame(3);
      const transaction = stubTransaction(game);

      await joinOpenGame('game_test', { playerId: 'p2', name: 'Player 2' });

      expect(transaction.set).toHaveBeenCalledTimes(1);
      const [, writtenState] = transaction.set.mock.calls[0] as [unknown, GameState];
      expect(writtenState.players.map((p) => p.playerId)).toEqual(['host', 'p2']);
    });

    it("opens the match document at games/<gameId> using the app's db", async () => {
      const game = buildWaitingGame(2);
      stubTransaction(game);

      await joinOpenGame('game_test', { playerId: 'p2', name: 'Player 2' });

      expect(mockDoc).toHaveBeenCalledWith(db, 'games', 'game_test');
      expect(mockRunTransaction).toHaveBeenCalledWith(db, expect.any(Function));
    });
  });
});
