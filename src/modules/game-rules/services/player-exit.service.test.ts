import { PlayerColor } from '@/lib/types';
import type { GameState } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from '@/lib/game-initializer';
import { addPlayerToGame } from '@/lib/game-logic';

jest.mock('@/lib/firebase', () => ({
  db: {},
  doc: jest.fn(() => ({})),
  runTransaction: jest.fn(),
}));

import { db, doc, runTransaction } from '@/lib/firebase';
// Imported after the mock so the service picks up the mocked `@/lib/firebase` module.
import { handlePlayerExit } from './player-exit.service';

const mockRunTransaction = runTransaction as jest.Mock;

type FakeTransaction = {
  get: jest.Mock;
  delete: jest.Mock;
  set: jest.Mock;
};

/** Wires `runTransaction` to invoke its callback with a fake transaction reading `gameState`. */
function stubTransaction(gameState: GameState | null): FakeTransaction {
  const transaction: FakeTransaction = {
    get: jest.fn().mockResolvedValue({
      exists: () => gameState !== null,
      data: () => gameState,
    }),
    delete: jest.fn(),
    set: jest.fn(),
  };
  mockRunTransaction.mockImplementation(async (_db: unknown, callback: (t: FakeTransaction) => Promise<void>) => {
    await callback(transaction);
  });
  return transaction;
}

function buildTwoPlayerGame(): GameState {
  let game = initializeGame(
    'game_test',
    'Player Exit Test',
    2,
    { playerId: 'host', name: 'Host', color: PlayerColor.Blue },
    0,
    false,
    defaultGameSettings,
  );
  const added = addPlayerToGame(game, { playerId: 'p2', name: 'Player 2' });
  game = added.newGameState!;
  return game;
}

function buildThreePlayerGame(): GameState {
  let game = initializeGame(
    'game_test',
    'Player Exit Test',
    3,
    { playerId: 'host', name: 'Host', color: PlayerColor.Blue },
    0,
    false,
    defaultGameSettings,
  );
  const added = addPlayerToGame(game, { playerId: 'p2', name: 'Player 2' });
  game = added.newGameState!;
  const added2 = addPlayerToGame(game, { playerId: 'p3', name: 'Player 3' });
  game = added2.newGameState!;
  return game;
}

/** A lobby (status Waiting) that is not full, so addPlayerToGame never auto-starts it. */
function buildLobbyGame(extraPlayerIds: string[]): GameState {
  let game = initializeGame(
    'game_test',
    'Player Exit Test',
    4,
    { playerId: 'host', name: 'Host', color: PlayerColor.Blue },
    0,
    false,
    defaultGameSettings,
  );
  extraPlayerIds.forEach((id, i) => {
    game = addPlayerToGame(game, { playerId: id, name: `Player ${i + 2}` }).newGameState!;
  });
  return game;
}

function buildHostWithBotGame(): GameState {
  return initializeGame(
    'game_test',
    'Player Exit Test',
    1,
    { playerId: 'host', name: 'Host', color: PlayerColor.Blue },
    1,
    false,
    defaultGameSettings,
  );
}

describe('handlePlayerExit', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('is a no-op when the match document does not exist (empty input)', async () => {
    const transaction = stubTransaction(null);

    await handlePlayerExit('game_test', 'host');

    expect(transaction.delete).not.toHaveBeenCalled();
    expect(transaction.set).not.toHaveBeenCalled();
  });

  it('is a no-op when the departing player is not found in the match (invalid input)', async () => {
    const game = buildTwoPlayerGame();
    const transaction = stubTransaction(game);

    await handlePlayerExit('game_test', 'nobody');

    expect(transaction.delete).not.toHaveBeenCalled();
    expect(transaction.set).not.toHaveBeenCalled();
  });

  it('deletes the match document when the host leaves mid-game (status Playing)', async () => {
    let game = buildTwoPlayerGame();
    game = startGame(game, 'Host');
    const transaction = stubTransaction(game);

    await handlePlayerExit('game_test', 'host');

    expect(transaction.delete).toHaveBeenCalledTimes(1);
    expect(transaction.set).not.toHaveBeenCalled();
  });

  it('deletes the match document when the last human leaves, even in the lobby, leaving only bots', async () => {
    const game = buildHostWithBotGame(); // status Waiting: host (human) + 1 bot
    const transaction = stubTransaction(game);

    await handlePlayerExit('game_test', 'host');

    expect(transaction.delete).toHaveBeenCalledTimes(1);
    expect(transaction.set).not.toHaveBeenCalled();
  });

  it('deletes the match document when the host leaves and no other player remains at all (boundary)', async () => {
    const game = initializeGame(
      'game_test',
      'Player Exit Test',
      2,
      { playerId: 'host', name: 'Host', color: PlayerColor.Blue },
      0,
      false,
      defaultGameSettings,
    ); // status Waiting, only the host has joined
    const transaction = stubTransaction(game);

    await handlePlayerExit('game_test', 'host');

    expect(transaction.delete).toHaveBeenCalledTimes(1);
    expect(transaction.set).not.toHaveBeenCalled();
  });

  it('reindexes players, baseTiles and map references and writes the document when a non-host, non-last player leaves', async () => {
    let game = buildThreePlayerGame();
    game = startGame(game, 'Host'); // Player 2 (seat 1) is the one leaving, not the host
    const transaction = stubTransaction(game);

    await handlePlayerExit('game_test', 'p2');

    expect(transaction.delete).not.toHaveBeenCalled();
    expect(transaction.set).toHaveBeenCalledTimes(1);
    const [, writtenState] = transaction.set.mock.calls[0] as [unknown, GameState];

    expect(writtenState.players).toHaveLength(2);
    expect(writtenState.players.map((p) => p.playerId)).toEqual(['host', 'p3']);
    expect(writtenState.players.map((p) => p.id)).toEqual([0, 1]); // reindexed contiguous 0..n-1
    expect(writtenState.baseTiles.map((b) => b.owner)).toEqual([0, 1]);
    expect(writtenState.log.some((entry) => entry.includes('Player 2 has left the game.'))).toBe(true);

    // After reindexing, every remaining occupant/position reference must point at one of the two
    // surviving seats (0 or 1) — none left dangling at or beyond the departed seat's old index.
    writtenState.map.forEach((tile) => {
      tile.occupants.forEach((o) => expect(o.playerId).toBeLessThan(writtenState.players.length));
      (tile.positionedBy || []).forEach((p) => expect(p.playerId).toBeLessThan(writtenState.players.length));
    });
  });

  it("ends the exiting player's turn within the same transaction when they were the current player", async () => {
    let game = buildThreePlayerGame();
    game = startGame(game, 'Host');
    game.currentPlayerIndex = 1; // Player 2's turn
    const turnBefore = game.turn;
    const transaction = stubTransaction(game);

    await handlePlayerExit('game_test', 'p2');

    const [, writtenState] = transaction.set.mock.calls[0] as [unknown, GameState];

    expect(writtenState.players.map((p) => p.name)).toEqual(['Host', 'Player 3']);
    // The turn passes to the player who was next in order (Player 3, now index 1); no seat is skipped.
    expect(writtenState.currentPlayerIndex).toBe(1);
    expect(writtenState.players[writtenState.currentPlayerIndex].name).toBe('Player 3');
    expect(writtenState.turn).toBe(turnBefore); // no wrap past the last seat
    expect(writtenState.log).toContain("It's now Player 3's turn.");
  });

  it('when the exiting current player is the last seat, the turn wraps to the host', async () => {
    let game = buildThreePlayerGame();
    game = startGame(game, 'Host');
    game.currentPlayerIndex = 2; // Player 3, the last seat, is current and leaves
    const turnBefore = game.turn;
    const transaction = stubTransaction(game);

    await handlePlayerExit('game_test', 'p3');

    const [, writtenState] = transaction.set.mock.calls[0] as [unknown, GameState];

    expect(writtenState.players.map((p) => p.name)).toEqual(['Host', 'Player 2']);
    // Wrap-around: the next player in order after the last seat is the host.
    expect(writtenState.currentPlayerIndex).toBe(0);
    expect(writtenState.players[0].name).toBe('Host');
    expect(writtenState.turn).toBe(turnBefore + 1); // handleEndTurn wrapped past the last seat
  });

  it('decrements currentPlayerIndex without ending the turn when a lower seat leaves during a later seat\'s turn', async () => {
    let game = buildThreePlayerGame();
    game = startGame(game, 'Host');
    game.currentPlayerIndex = 2; // Player 3's turn; Player 2 (seat 1) leaves
    const turnBefore = game.turn;
    const logLengthBefore = game.log.length;
    const transaction = stubTransaction(game);

    await handlePlayerExit('game_test', 'p2');

    const [, writtenState] = transaction.set.mock.calls[0] as [unknown, GameState];

    expect(writtenState.currentPlayerIndex).toBe(1);
    expect(writtenState.players[1].name).toBe('Player 3'); // still Player 3's turn, at its new index
    expect(writtenState.turn).toBe(turnBefore);
    // Only the "has left the game" line was appended; handleEndTurn would also have logged "It's now ...".
    expect(writtenState.log).toHaveLength(logLengthBefore + 1);
  });

  it('does not advance the turn when the departing player was not the current player', async () => {
    let game = buildThreePlayerGame();
    game = startGame(game, 'Host');
    game.currentPlayerIndex = 0; // Host's turn; Player 2 (seat 1) is leaving, not the current player
    const turnBefore = game.turn;
    const transaction = stubTransaction(game);

    await handlePlayerExit('game_test', 'p2');

    const [, writtenState] = transaction.set.mock.calls[0] as [unknown, GameState];

    expect(writtenState.currentPlayerIndex).toBe(0); // still the host's turn
    expect(writtenState.turn).toBe(turnBefore);
  });

  it('removes exactly the departing player\'s occupants and positions and renumbers the survivors', async () => {
    let game = buildThreePlayerGame();
    game = startGame(game, 'Host');
    const centerTile = game.map[2 * game.settings.gridSize.cols + 2];
    centerTile.positionedBy = [
      { playerId: 0, resource: 'food' },
      { playerId: 1, resource: 'wood' },
      { playerId: 2, resource: 'gold' },
    ];
    centerTile.occupants.push({ playerId: 1, armyId: 7 });
    const transaction = stubTransaction(game);

    await handlePlayerExit('game_test', 'p2');

    const [, writtenState] = transaction.set.mock.calls[0] as [unknown, GameState];
    const allOccupants = writtenState.map.flatMap((tile) => tile.occupants);
    // Survivors keep one army each (Host seat 0, Player 3 now seat 1); Player 2's two entries are gone.
    expect(allOccupants).toHaveLength(2);
    expect(allOccupants).toEqual(
      expect.arrayContaining([
        { playerId: 0, armyId: 0 },
        { playerId: 1, armyId: 0 },
      ]),
    );
    const writtenCenter = writtenState.map[2 * game.settings.gridSize.cols + 2];
    expect(writtenCenter.positionedBy).toEqual([
      { playerId: 0, resource: 'food' },
      { playerId: 1, resource: 'gold' }, // was seat 2, renumbered to 1
    ]);
  });

  describe('combatState handling', () => {
    const combat = (attackerId: number, defenderId: number) => ({
      attackerId,
      attackingArmyId: 0,
      defenderId,
      defendingArmyId: 0,
      attackerRolls: [],
      defenderRolls: [],
      winnerId: null,
      phase: 'rolling' as const,
    });

    it.each([
      ['the attacker', 1, 2],
      ['the defender', 2, 1],
    ])('clears combatState when the exiting player (seat 1) is %s', async (_role, attackerId, defenderId) => {
      let game = buildThreePlayerGame();
      game = startGame(game, 'Host');
      game.combatState = combat(attackerId, defenderId);
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'p2');

      const [, writtenState] = transaction.set.mock.calls[0] as [unknown, GameState];
      expect(writtenState.combatState).toBeNull();
    });

    it('decrements attacker and defender ids above the exiting seat when they are not in the combat', async () => {
      let game = buildThreePlayerGame();
      game = startGame(game, 'Host');
      game.combatState = combat(2, 0); // Player 3 attacks the Host; Player 2 (seat 1) leaves
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'p2');

      const [, writtenState] = transaction.set.mock.calls[0] as [unknown, GameState];
      expect(writtenState.combatState).toMatchObject({ attackerId: 1, defenderId: 0 });
    });

    it('leaves ids at or below the exiting seat untouched (boundary: seat 0 and lower stay)', async () => {
      let game = buildThreePlayerGame();
      game = startGame(game, 'Host');
      game.combatState = combat(0, 2); // Host attacks Player 3; Player 2 leaves
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'p2');

      const [, writtenState] = transaction.set.mock.calls[0] as [unknown, GameState];
      expect(writtenState.combatState).toMatchObject({ attackerId: 0, defenderId: 1 });
    });
  });

  describe('lobby (status Waiting)', () => {
    it('a non-host leaving writes the updated document instead of deleting it', async () => {
      const game = buildLobbyGame(['p2', 'p3']);
      expect(game.status).toBe('waiting');
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'p2');

      expect(transaction.delete).not.toHaveBeenCalled();
      expect(transaction.set).toHaveBeenCalledTimes(1);
      const [, writtenState] = transaction.set.mock.calls[0] as [unknown, GameState];
      expect(writtenState.players.map((p) => p.playerId)).toEqual(['host', 'p3']);
      expect(writtenState.status).toBe('waiting');
    });

    it('the host leaving while another human remains does not delete the document', async () => {
      const game = buildLobbyGame(['p2']);
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'host');

      expect(transaction.delete).not.toHaveBeenCalled();
      expect(transaction.set).toHaveBeenCalledTimes(1);
      const [, writtenState] = transaction.set.mock.calls[0] as [unknown, GameState];
      expect(writtenState.players.map((p) => p.playerId)).toEqual(['p2']);
      expect(writtenState.players[0].id).toBe(0);
    });
  });

  it("opens the match document at games/<gameId> using the app's db", async () => {
    const game = buildTwoPlayerGame();
    stubTransaction(game);

    await handlePlayerExit('game_test', 'nobody');

    expect(doc).toHaveBeenCalledWith(db, 'games', 'game_test');
    expect(mockRunTransaction).toHaveBeenCalledWith(db, expect.any(Function));
  });

  it('swallows a transaction error and logs it instead of rejecting (never crashes the caller)', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRunTransaction.mockRejectedValue(new Error('transaction aborted'));

    await expect(handlePlayerExit('game_test', 'host')).resolves.toBeUndefined();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error leaving game:', expect.any(Error));
    consoleErrorSpy.mockRestore();
  });
});
