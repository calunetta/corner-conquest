import { PlayerColor } from '@/lib/types';
import type { GameState, Monster } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from '@/modules/game-rules';
import { addPlayerToGame } from '@/modules/game-rules';
import { toLogMessage } from '../log-entry';

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

/** The state the service wrote in the last `transaction.set` call. */
function writtenStateOf(transaction: FakeTransaction): GameState {
  const [, writtenState] = transaction.set.mock.calls[0] as [unknown, GameState];
  return writtenState;
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

/** An in-progress match (status Playing) with the host plus the given human players. */
function buildStartedGame(extraPlayerIds: string[]): GameState {
  return startGame(buildLobbyGame(extraPlayerIds), 'Host');
}

/** Marks a seat the way a previous exit conversion would have, so the test starts from a converted seat. */
function convertSeatFixture(game: GameState, playerId: string): void {
  const seat = game.players.find((p) => p.playerId === playerId)!;
  seat.isBot = true;
  seat.isVacant = true;
}

/** Deep copy of plain game data, so assertions compare against the state before the call. */
function snapshotOf<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
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
    const game = buildStartedGame(['p2']);
    const transaction = stubTransaction(game);

    await handlePlayerExit('game_test', 'nobody');

    expect(transaction.delete).not.toHaveBeenCalled();
    expect(transaction.set).not.toHaveBeenCalled();
  });

  it("opens the match document at games/<gameId> using the app's db", async () => {
    const game = buildLobbyGame(['p2']);
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

  describe('in progress (status Playing): bot takeover', () => {
    it('converts the host seat to a bot and keeps the match when other humans remain', async () => {
      const game = buildStartedGame(['p2', 'p3']);
      game.currentPlayerIndex = 2; // Player 3's turn, so the host's seat is not the active turn
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'host');

      expect(transaction.delete).not.toHaveBeenCalled();
      expect(transaction.set).toHaveBeenCalledTimes(1);
      const written = writtenStateOf(transaction);
      expect(written.players.map((p) => p.playerId)).toEqual(['host', 'p2', 'p3']);
      expect(written.players.map((p) => p.id)).toEqual([0, 1, 2]);
      expect(written.players[0]).toMatchObject({ name: 'Host', isBot: true, isVacant: true, lastSeenAt: null });
      expect(written.players.map((p) => p.isBot)).toEqual([true, false, false]);
      expect(written.currentPlayerIndex).toBe(2);
    });

    it('converts a non-host seat to a bot without removing it, renumbering it, or touching the map', async () => {
      const game = buildStartedGame(['p2', 'p3']);
      game.currentPlayerIndex = 0; // Host's turn; Player 2 is not the active seat
      const centerTile = game.map[2 * game.settings.gridSize.cols + 2];
      centerTile.occupants.push({ playerId: 1, armyId: 7 });
      const mapBefore = snapshotOf(game.map);
      const baseTilesBefore = snapshotOf(game.baseTiles);
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'p2');

      expect(transaction.delete).not.toHaveBeenCalled();
      const written = writtenStateOf(transaction);
      expect(written.players.map((p) => p.playerId)).toEqual(['host', 'p2', 'p3']);
      expect(written.players.map((p) => p.id)).toEqual([0, 1, 2]);
      expect(written.players.map((p) => p.isBot)).toEqual([false, true, false]);
      expect(written.players[1]).toMatchObject({ name: 'Player 2', isVacant: true, lastSeenAt: null });
      expect(written.players[2].isVacant).toBe(false);
      expect(written.baseTiles).toEqual(baseTilesBefore);
      expect(written.map).toEqual(mapBefore);
      expect(written.currentPlayerIndex).toBe(0);
    });

    it('clears the stored heartbeat of the converted seat', async () => {
      const game = buildStartedGame(['p2']);
      game.players[1].lastSeenAt = 1_700_000_000_000;
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'p2');

      expect(writtenStateOf(transaction).players[1].lastSeenAt).toBeNull();
    });

    it('appends exactly one system log entry naming the seat that left', async () => {
      const game = buildStartedGame(['p2', 'p3']);
      game.currentPlayerIndex = 0;
      const logLengthBefore = game.log.length;
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'p2');

      const written = writtenStateOf(transaction);
      expect(written.log).toHaveLength(logLengthBefore + 1);
      expect(toLogMessage(written.log[written.log.length - 1])).toBe(
        'Player 2 has left the game. A bot is taking over their seat.',
      );
    });

    it("keeps the turn on the converted seat when it was the current player's turn (3-player match, middle seat)", async () => {
      const game = buildStartedGame(['p2', 'p3']);
      game.currentPlayerIndex = 1; // Player 2's turn
      const turnBefore = game.turn;
      const logLengthBefore = game.log.length;
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'p2');

      const written = writtenStateOf(transaction);
      expect(written.players[1].isBot).toBe(true);
      expect(written.currentPlayerIndex).toBe(1);
      expect(written.players[2].name).toBe('Player 3');
      expect(written.turn).toBe(turnBefore);
      const newLogMessages = written.log.slice(logLengthBefore).map(toLogMessage);
      expect(newLogMessages).toEqual(['Player 2 has left the game. A bot is taking over their seat.']);
    });

    it('keeps the turn on the converted seat when it was the current player turn (2-player match)', async () => {
      const game = buildStartedGame(['p2']);
      game.currentPlayerIndex = 1; // Player 2 (guest) is mid-turn
      const turnBefore = game.turn;
      const logLengthBefore = game.log.length;
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'p2');

      const written = writtenStateOf(transaction);
      expect(written.players[1]).toMatchObject({ isBot: true, isVacant: true, lastSeenAt: null });
      expect(written.currentPlayerIndex).toBe(1);
      expect(written.turn).toBe(turnBefore);
      const newLogMessages = written.log.slice(logLengthBefore).map(toLogMessage);
      expect(newLogMessages).toEqual(['Player 2 has left the game. A bot is taking over their seat.']);
    });

    it('keeps the turn on the last seat (no wrap to the host) when the converted seat was the last seat and the current player', async () => {
      const game = buildStartedGame(['p2', 'p3']);
      game.currentPlayerIndex = 2; // Player 3's turn, the last seat
      const turnBefore = game.turn;
      const logLengthBefore = game.log.length;
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'p3');

      const written = writtenStateOf(transaction);
      expect(written.players[2].isBot).toBe(true);
      expect(written.currentPlayerIndex).toBe(2);
      expect(written.turn).toBe(turnBefore);
      const newLogMessages = written.log.slice(logLengthBefore).map(toLogMessage);
      expect(newLogMessages).toEqual(['Player 3 has left the game. A bot is taking over their seat.']);
    });

    it('does not move currentPlayerIndex when a seat other than the current one is converted', async () => {
      const game = buildStartedGame(['p2', 'p3']);
      game.currentPlayerIndex = 2; // Player 3's turn; Player 2 (seat 1) is converted
      const turnBefore = game.turn;
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'p2');

      const written = writtenStateOf(transaction);
      expect(written.currentPlayerIndex).toBe(2);
      expect(written.players[2].name).toBe('Player 3');
      expect(written.turn).toBe(turnBefore);
    });

    it.each([
      ['host', 'host'],
      ['non-host', 'p2'],
    ])('deletes the match when the %s is the last human and the other seat is already a bot', async (_role, leavingId) => {
      const game = buildStartedGame(['p2']);
      const otherSeatId = leavingId === 'host' ? 'p2' : 'host';
      convertSeatFixture(game, otherSeatId);
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', leavingId);

      expect(transaction.delete).toHaveBeenCalledTimes(1);
      expect(transaction.set).not.toHaveBeenCalled();
    });

    it('converts the last human seat only when another human still remains (boundary: two humans, one leaves)', async () => {
      const game = buildStartedGame(['p2']);
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'host');

      expect(transaction.delete).not.toHaveBeenCalled();
      expect(transaction.set).toHaveBeenCalledTimes(1);
      expect(writtenStateOf(transaction).players.map((p) => p.isBot)).toEqual([true, false]);
    });

    it('is a no-op for a seat that is already a bot: writes nothing and adds no duplicate log entry', async () => {
      const game = buildStartedGame(['p2', 'p3']);
      game.currentPlayerIndex = 0;
      const firstTransaction = stubTransaction(game);
      await handlePlayerExit('game_test', 'p2');
      const afterFirstExit = writtenStateOf(firstTransaction);
      const logAfterFirstExit = snapshotOf(afterFirstExit.log);
      const secondTransaction = stubTransaction(afterFirstExit);

      await handlePlayerExit('game_test', 'p2');

      expect(secondTransaction.delete).not.toHaveBeenCalled();
      expect(secondTransaction.set).not.toHaveBeenCalled();
      expect(afterFirstExit.log).toEqual(logAfterFirstExit);
    });

    it('is a no-op when the departing id belongs to a bot created at match setup', async () => {
      // Bots are seated at setup only in single-player matches (maxPlayers 1 with numBots > 0).
      const game = startGame(
        initializeGame(
          'game_test',
          'Player Exit Test',
          1,
          { playerId: 'host', name: 'Host', color: PlayerColor.Blue },
          1,
          false,
          defaultGameSettings,
        ),
        'Host',
      );
      const setupBot = game.players.find((p) => p.isBot)!;
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', setupBot.playerId);

      expect(transaction.delete).not.toHaveBeenCalled();
      expect(transaction.set).not.toHaveBeenCalled();
    });

    it('is a no-op for an unknown player in a match in progress (invalid input)', async () => {
      const game = buildStartedGame(['p2', 'p3']);
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'nobody');

      expect(transaction.delete).not.toHaveBeenCalled();
      expect(transaction.set).not.toHaveBeenCalled();
    });

    describe('combatState and monsterCombatState are kept, not cleared, for a converted seat', () => {
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

      it('keeps a combat in which the converted seat is the attacker', async () => {
        const game = buildStartedGame(['p2', 'p3']);
        game.combatState = combat(1, 2);
        const transaction = stubTransaction(game);

        await handlePlayerExit('game_test', 'p2');

        expect(writtenStateOf(transaction).combatState).toMatchObject({ attackerId: 1, defenderId: 2 });
      });

      it('keeps a monster fight in which the converted seat is the attacker', async () => {
        const game = buildStartedGame(['p2', 'p3']);
        game.monsterCombatState = {
          attackerId: 1,
          attackerPosition: { x: 0, y: 0 },
          monster: { name: 'Goblin' as Monster['name'], level: 1, sprite: { idle: '', attack: '', death: '' } },
          attackerRolls: [],
          monsterRolls: [],
          winnerId: null,
          phase: 'rolling' as const,
        };
        const transaction = stubTransaction(game);

        await handlePlayerExit('game_test', 'p2');

        expect(writtenStateOf(transaction).monsterCombatState).toMatchObject({ attackerId: 1 });
      });
    });
  });

  describe('lobby (status Waiting): unchanged splice and delete', () => {
    it('deletes the match document when the last human leaves, leaving only bots', async () => {
      const game = initializeGame(
        'game_test',
        'Player Exit Test',
        2,
        { playerId: 'host', name: 'Host', color: PlayerColor.Blue },
        1,
        false,
        defaultGameSettings,
      ); // status Waiting: host (human) + 1 bot
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

    it('a non-host leaving writes the updated document instead of deleting it', async () => {
      const game = buildLobbyGame(['p2', 'p3']);
      expect(game.status).toBe('waiting');
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'p2');

      expect(transaction.delete).not.toHaveBeenCalled();
      expect(transaction.set).toHaveBeenCalledTimes(1);
      const written = writtenStateOf(transaction);
      expect(written.players.map((p) => p.playerId)).toEqual(['host', 'p3']);
      expect(written.status).toBe('waiting');
    });

    it('the host leaving while another human remains does not delete the document and reindexes the survivor', async () => {
      const game = buildLobbyGame(['p2']);
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'host');

      expect(transaction.delete).not.toHaveBeenCalled();
      expect(transaction.set).toHaveBeenCalledTimes(1);
      const written = writtenStateOf(transaction);
      expect(written.players.map((p) => p.playerId)).toEqual(['p2']);
      expect(written.players[0].id).toBe(0);
      expect(written.players[0].isBot).toBe(false);
    });

    it('removes a non-host seat, reindexes players and baseTiles, and appends the left message', async () => {
      const game = buildLobbyGame(['p2', 'p3']);
      expect(game.baseTiles.map((b) => b.owner)).toEqual([0, 1, 2]);
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'p2');

      expect(transaction.delete).not.toHaveBeenCalled();
      const written = writtenStateOf(transaction);
      expect(written.players.map((p) => p.playerId)).toEqual(['host', 'p3']);
      expect(written.players.map((p) => p.id)).toEqual([0, 1]); // reindexed contiguous 0..n-1
      expect(written.players.every((p) => p.isBot === false)).toBe(true); // removed, not converted
      expect(written.baseTiles.map((b) => b.owner)).toEqual([0, 1]);
      expect(written.log.map(toLogMessage)).toContain('Player 2 has left the game.');
    });

    it('after reindexing, every remaining occupant and position references a surviving seat', async () => {
      const game = buildLobbyGame(['p2', 'p3']);
      const centerTile = game.map[2 * game.settings.gridSize.cols + 2];
      centerTile.positionedBy = [
        { playerId: 0, resource: 'food' },
        { playerId: 1, resource: 'wood' },
        { playerId: 2, resource: 'gold' },
      ];
      centerTile.occupants.push({ playerId: 1, armyId: 7 });
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'p2');

      const written = writtenStateOf(transaction);
      written.map.forEach((tile) => {
        tile.occupants.forEach((o) => expect(o.playerId).toBeLessThan(written.players.length));
        (tile.positionedBy || []).forEach((p) => expect(p.playerId).toBeLessThan(written.players.length));
      });
      const writtenCenter = written.map[2 * game.settings.gridSize.cols + 2];
      expect(writtenCenter.positionedBy).toEqual([
        { playerId: 0, resource: 'food' },
        { playerId: 1, resource: 'gold' }, // was seat 2, renumbered to 1
      ]);
    });

    it("ends the exiting player's turn within the same transaction when they were the current player", async () => {
      const game = buildLobbyGame(['p2', 'p3']);
      game.currentPlayerIndex = 1; // Player 2's turn
      const turnBefore = game.turn;
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'p2');

      const written = writtenStateOf(transaction);
      expect(written.players.map((p) => p.name)).toEqual(['Host', 'Player 3']);
      // The turn passes to the player who was next in order (Player 3, now index 1); no seat is skipped.
      expect(written.currentPlayerIndex).toBe(1);
      expect(written.turn).toBe(turnBefore);
      expect(written.log.map(toLogMessage)).toContain("It's now Player 3's turn.");
    });

    it('when the exiting current player is the last seat, the turn wraps to the host', async () => {
      const game = buildLobbyGame(['p2', 'p3']);
      game.currentPlayerIndex = 2; // Player 3, the last seat, is current and leaves
      const turnBefore = game.turn;
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'p3');

      const written = writtenStateOf(transaction);
      expect(written.players.map((p) => p.name)).toEqual(['Host', 'Player 2']);
      expect(written.currentPlayerIndex).toBe(0);
      expect(written.turn).toBe(turnBefore + 1);
    });

    it('decrements currentPlayerIndex without ending the turn when a lower seat leaves during a later turn', async () => {
      const game = buildLobbyGame(['p2', 'p3']);
      game.currentPlayerIndex = 2; // Player 3's turn; Player 2 (seat 1) leaves
      const turnBefore = game.turn;
      const logLengthBefore = game.log.length;
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'p2');

      const written = writtenStateOf(transaction);
      expect(written.currentPlayerIndex).toBe(1);
      expect(written.players[1].name).toBe('Player 3'); // still Player 3's turn, at its new index
      expect(written.turn).toBe(turnBefore);
      // Only the "has left the game" line was appended; handleEndTurn would also have logged "It's now ...".
      expect(written.log).toHaveLength(logLengthBefore + 1);
    });

    it('does not advance the turn when the departing player was not the current player', async () => {
      const game = buildLobbyGame(['p2', 'p3']);
      game.currentPlayerIndex = 0; // Host's turn; Player 2 (seat 1) is leaving, not the current player
      const turnBefore = game.turn;
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'p2');

      const written = writtenStateOf(transaction);
      expect(written.currentPlayerIndex).toBe(0); // still the host's turn
      expect(written.turn).toBe(turnBefore);
    });

    it("removes exactly the departing player's occupants and positions and renumbers the survivors", async () => {
      const game = buildLobbyGame(['p2', 'p3']);
      const centerTile = game.map[2 * game.settings.gridSize.cols + 2];
      centerTile.positionedBy = [
        { playerId: 0, resource: 'food' },
        { playerId: 1, resource: 'wood' },
        { playerId: 2, resource: 'gold' },
      ];
      centerTile.occupants.push({ playerId: 1, armyId: 7 });
      const transaction = stubTransaction(game);

      await handlePlayerExit('game_test', 'p2');

      const written = writtenStateOf(transaction);
      const allOccupants = written.map.flatMap((tile) => tile.occupants);
      // Survivors keep one army each (Host seat 0, Player 3 now seat 1); Player 2's two entries are gone.
      expect(allOccupants).toHaveLength(2);
      expect(allOccupants).toEqual(
        expect.arrayContaining([
          { playerId: 0, armyId: 0 },
          { playerId: 1, armyId: 0 },
        ]),
      );
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
        const game = buildLobbyGame(['p2', 'p3']);
        game.combatState = combat(attackerId, defenderId);
        const transaction = stubTransaction(game);

        await handlePlayerExit('game_test', 'p2');

        expect(writtenStateOf(transaction).combatState).toBeNull();
      });

      it('decrements attacker and defender ids above the exiting seat when they are not in the combat', async () => {
        const game = buildLobbyGame(['p2', 'p3']);
        game.combatState = combat(2, 0); // Player 3 attacks the Host; Player 2 (seat 1) leaves
        const transaction = stubTransaction(game);

        await handlePlayerExit('game_test', 'p2');

        expect(writtenStateOf(transaction).combatState).toMatchObject({ attackerId: 1, defenderId: 0 });
      });

      it('leaves ids at or below the exiting seat untouched (boundary: seat 0 stays)', async () => {
        const game = buildLobbyGame(['p2', 'p3']);
        game.combatState = combat(0, 2); // Host attacks Player 3; Player 2 leaves
        const transaction = stubTransaction(game);

        await handlePlayerExit('game_test', 'p2');

        expect(writtenStateOf(transaction).combatState).toMatchObject({ attackerId: 0, defenderId: 1 });
      });
    });

    describe('monsterCombatState handling', () => {
      const monsterCombat = (attackerId: number) => ({
        attackerId,
        attackerPosition: { x: 0, y: 0 },
        monster: {
          name: 'Goblin' as Monster['name'],
          level: 1,
          sprite: { idle: '', attack: '', death: '' },
        },
        attackerRolls: [],
        monsterRolls: [],
        winnerId: null,
        phase: 'rolling' as const,
      });

      it('clears monsterCombatState when the exiting player (seat 1) is the attacker', async () => {
        const game = buildLobbyGame(['p2', 'p3']);
        game.monsterCombatState = monsterCombat(1);
        const transaction = stubTransaction(game);

        await handlePlayerExit('game_test', 'p2');

        expect(writtenStateOf(transaction).monsterCombatState).toBeNull();
      });

      it('decrements attackerId above the exiting seat when it is not the exiting player', async () => {
        const game = buildLobbyGame(['p2', 'p3']);
        game.monsterCombatState = monsterCombat(2); // Player 3 fights a monster; Player 2 (seat 1) leaves
        const transaction = stubTransaction(game);

        await handlePlayerExit('game_test', 'p2');

        expect(writtenStateOf(transaction).monsterCombatState).toMatchObject({ attackerId: 1 });
      });

      it('leaves attackerId at or below the exiting seat untouched (boundary: seat 0 stays)', async () => {
        const game = buildLobbyGame(['p2', 'p3']);
        game.monsterCombatState = monsterCombat(0); // Host fights a monster; Player 2 (seat 1) leaves
        const transaction = stubTransaction(game);

        await handlePlayerExit('game_test', 'p2');

        expect(writtenStateOf(transaction).monsterCombatState).toMatchObject({ attackerId: 0 });
      });
    });
  });
});
