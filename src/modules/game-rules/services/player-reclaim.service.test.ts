import { PlayerColor } from '@/lib/types';
import type { GameState } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from '@/modules/game-rules';
import { addPlayerToGame } from '@/modules/game-rules';

jest.mock('@/lib/firebase', () => ({
  db: {},
  doc: jest.fn(() => ({})),
  runTransaction: jest.fn(),
}));

import { db, doc, runTransaction } from '@/lib/firebase';
// Imported after the mock so the service picks up the mocked `@/lib/firebase` module.
import { handleSeatReclaim } from './player-reclaim.service';

const mockRunTransaction = runTransaction as jest.Mock;

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
  mockRunTransaction.mockImplementation(async (_db: unknown, callback: (t: FakeTransaction) => Promise<boolean>) =>
    callback(transaction),
  );
  return transaction;
}

/** The state the service wrote in the last `transaction.set` call. */
function writtenStateOf(transaction: FakeTransaction): GameState {
  const [, writtenState] = transaction.set.mock.calls[0] as [unknown, GameState];
  return writtenState;
}

/** A started match with the host (index 0) and one more human (index 1). */
function buildStartedGame(): GameState {
  let game = initializeGame(
    'game_test',
    'Reclaim Test',
    4,
    { playerId: 'host', name: 'Host', color: PlayerColor.Blue },
    0,
    false,
    defaultGameSettings,
  );
  game = addPlayerToGame(game, { playerId: 'p2', name: 'Player 2' }).newGameState!;
  return startGame(game, 'Host');
}

/** Marks the seat the way a previous exit conversion would have, so the test starts from a converted seat. */
function convertSeat(game: GameState, playerId: string): void {
  const seat = game.players.find((p) => p.playerId === playerId)!;
  seat.isBot = true;
  seat.isVacant = true;
}

describe('handleSeatReclaim', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("opens the match document at games/<gameId> using the app's db", async () => {
    stubTransaction(buildStartedGame());

    await handleSeatReclaim('game_test', 'p2');

    expect(doc).toHaveBeenCalledWith(db, 'games', 'game_test');
    expect(mockRunTransaction).toHaveBeenCalledWith(db, expect.any(Function));
  });

  describe('when it is not the vacant seat\'s turn', () => {
    it('hands the seat back immediately: clears isBot and isVacant and resolves true', async () => {
      const game = buildStartedGame();
      convertSeat(game, 'p2');
      game.currentPlayerIndex = 0;
      const transaction = stubTransaction(game);

      const result = await handleSeatReclaim('game_test', 'p2');

      expect(result).toBe(true);
      const written = writtenStateOf(transaction);
      expect(written.players[1]).toMatchObject({ playerId: 'p2', isBot: false, isVacant: false });
      expect(written.players[1].reclaimRequested).toBe(false);
    });

    it('leaves the other seats untouched', async () => {
      const game = buildStartedGame();
      convertSeat(game, 'p2');
      game.currentPlayerIndex = 0;
      const transaction = stubTransaction(game);

      await handleSeatReclaim('game_test', 'p2');

      const written = writtenStateOf(transaction);
      expect(written.players[0]).toMatchObject({ playerId: 'host', isBot: false, isVacant: false });
    });
  });

  describe("when it is the vacant seat's own turn", () => {
    it('sets reclaimRequested and does NOT flip isBot or isVacant, and resolves true', async () => {
      const game = buildStartedGame();
      convertSeat(game, 'p2');
      game.currentPlayerIndex = 1;
      const transaction = stubTransaction(game);

      const result = await handleSeatReclaim('game_test', 'p2');

      expect(result).toBe(true);
      const written = writtenStateOf(transaction);
      expect(written.players[1]).toMatchObject({
        playerId: 'p2',
        isBot: true,
        isVacant: true,
        reclaimRequested: true,
      });
    });
  });

  describe('no-op cases (resolve false, never write)', () => {
    it('resolves false without writing when the seat is not vacant (the human still holds it)', async () => {
      const game = buildStartedGame();
      game.players[1].isVacant = false;
      const transaction = stubTransaction(game);

      const result = await handleSeatReclaim('game_test', 'p2');

      expect(result).toBe(false);
      expect(transaction.set).not.toHaveBeenCalled();
    });

    it('resolves false without writing when the playerId is not in the match (invalid input)', async () => {
      const game = buildStartedGame();
      convertSeat(game, 'p2');
      const transaction = stubTransaction(game);

      const result = await handleSeatReclaim('game_test', 'nobody');

      expect(result).toBe(false);
      expect(transaction.set).not.toHaveBeenCalled();
    });

    it('resolves false without writing when the playerId is empty (invalid input)', async () => {
      const game = buildStartedGame();
      convertSeat(game, 'p2');
      const transaction = stubTransaction(game);

      const result = await handleSeatReclaim('game_test', '');

      expect(result).toBe(false);
      expect(transaction.set).not.toHaveBeenCalled();
    });

    it('resolves false without writing when the playerId belongs to a seat that is not vacant (the host)', async () => {
      const game = buildStartedGame();
      convertSeat(game, 'p2');
      const transaction = stubTransaction(game);

      const result = await handleSeatReclaim('game_test', 'host');

      expect(result).toBe(false);
      expect(transaction.set).not.toHaveBeenCalled();
    });

    it('resolves false without writing when the match document does not exist', async () => {
      const transaction = stubTransaction(null);

      const result = await handleSeatReclaim('game_test', 'p2');

      expect(result).toBe(false);
      expect(transaction.set).not.toHaveBeenCalled();
    });
  });

  it('propagates a transaction error to the caller instead of swallowing it', async () => {
    mockRunTransaction.mockRejectedValue(new Error('transaction aborted'));

    await expect(handleSeatReclaim('game_test', 'p2')).rejects.toThrow('transaction aborted');
  });
});
