import type { GameState, Player } from '@/lib/types';
import { withSyncedSeatManagement } from './game-board.state.map';

const createPlayer = (overrides?: Partial<Player>): Player =>
  ({
    id: 0,
    playerId: 'player_1',
    name: 'Player 1',
    isBot: false,
    isVacant: false,
    reclaimRequested: false,
    color: 'blue',
    armies: [],
    resources: { gold: 100, wood: 50, food: 30 },
    armyCount: 10,
    ...overrides,
  }) as unknown as Player;

const createGameState = (
  players: Player[],
  heartbeats: GameState['heartbeats'] = {},
  overrides?: Partial<GameState>,
): GameState =>
  ({
    id: 'game_test',
    status: 'playing',
    currentPlayerIndex: 0,
    players,
    heartbeats,
    ...overrides,
  }) as unknown as GameState;

const LOCAL_PLAYER_ID = 'player_1';
const GUEST_PLAYER_ID = 'player_2';

// Host (seat 0, local) and a guest seat that a bot is currently playing.
const botSeat = (): Player =>
  createPlayer({ id: 1, playerId: GUEST_PLAYER_ID, name: 'Guest', isBot: true, isVacant: true });

// The same guest seat after the guest reclaimed it: the seat-management fields flipped.
const reclaimedSeat = (overrides?: Partial<Player>): Player =>
  createPlayer({
    id: 1,
    playerId: GUEST_PLAYER_ID,
    name: 'Guest',
    isBot: false,
    isVacant: false,
    reclaimRequested: true,
    ...overrides,
  });

const hostSeat = (overrides?: Partial<Player>): Player =>
  createPlayer({ id: 0, playerId: LOCAL_PLAYER_ID, name: 'Host', ...overrides });

describe('withSyncedSeatManagement', () => {
  describe('when another seat changed its seat-management fields on the server', () => {
    it('copies the three seat-management fields onto that seat in a new state object', () => {
      const localState = createGameState([hostSeat(), botSeat()]);
      const serverState = createGameState([hostSeat(), reclaimedSeat()]);

      const result = withSyncedSeatManagement(localState, serverState, LOCAL_PLAYER_ID);

      expect(result).not.toBe(localState);
      expect(result.players[1].isBot).toBe(false);
      expect(result.players[1].isVacant).toBe(false);
      expect(result.players[1].reclaimRequested).toBe(true);
    });

    it('leaves every other field of the synced seat untouched', () => {
      const localArmies = [{ id: 'army_local', position: { x: 1, y: 1 } }] as unknown as Player['armies'];
      const localState = createGameState([hostSeat(), botSeat()]);
      localState.players[1] = { ...localState.players[1], armies: localArmies };
      const serverState = createGameState([hostSeat(), reclaimedSeat({ name: 'Renamed on server' })]);

      const result = withSyncedSeatManagement(localState, serverState, LOCAL_PLAYER_ID);

      expect(result.players[1].name).toBe('Guest');
      expect(result.players[1].armies).toBe(localArmies);
      expect(result.players[1].resources).toEqual({ gold: 100, wood: 50, food: 30 });
    });

    it('keeps the local player seat as the same object even when the server disagrees about it', () => {
      const localHost = hostSeat();
      const localState = createGameState([localHost, botSeat()]);
      const serverState = createGameState([hostSeat({ isBot: true, reclaimRequested: true }), reclaimedSeat()]);

      const result = withSyncedSeatManagement(localState, serverState, LOCAL_PLAYER_ID);

      expect(result.players[0]).toBe(localHost);
      expect(result.players[0].isBot).toBe(false);
      expect(result.players[1].isBot).toBe(false);
    });

    it('does not mutate the local or server state it was given', () => {
      const localState = createGameState([hostSeat(), botSeat()], { 1: 1_000 });
      const serverState = createGameState([hostSeat(), reclaimedSeat()], { 1: 2_000 });
      const localBefore = JSON.stringify(localState);
      const serverBefore = JSON.stringify(serverState);

      withSyncedSeatManagement(localState, serverState, LOCAL_PLAYER_ID);

      expect(JSON.stringify(localState)).toBe(localBefore);
      expect(JSON.stringify(serverState)).toBe(serverBefore);
    });
  });

  describe('when no seat-management field differs', () => {
    it('returns the exact same localGameState reference', () => {
      const localState = createGameState([hostSeat(), botSeat()]);
      const serverState = createGameState([hostSeat(), botSeat()]);

      const result = withSyncedSeatManagement(localState, serverState, LOCAL_PLAYER_ID);

      expect(result).toBe(localState);
    });

    it('returns the same reference when only a non-seat-management field differs on the server', () => {
      // Gameplay fields are deliberately not synced; a difference there must not look like a change.
      const localState = createGameState([hostSeat(), botSeat()]);
      const serverState = createGameState([hostSeat(), botSeat()], {}, { currentPlayerIndex: 1 });

      const result = withSyncedSeatManagement(localState, serverState, LOCAL_PLAYER_ID);

      expect(result).toBe(localState);
    });
  });

  describe('when only one of the three seat-management fields differs', () => {
    it.each([
      ['isBot', { isBot: false }],
      ['isVacant', { isVacant: false }],
      ['reclaimRequested', { reclaimRequested: true }],
    ] as const)('syncs the seat when only %s differs', (field, serverOverride) => {
      const localState = createGameState([hostSeat(), botSeat()]);
      const serverSeat = createPlayer({
        id: 1,
        playerId: GUEST_PLAYER_ID,
        name: 'Guest',
        isBot: true,
        isVacant: true,
        reclaimRequested: false,
        ...serverOverride,
      });
      const serverState = createGameState([hostSeat(), serverSeat]);

      const result = withSyncedSeatManagement(localState, serverState, LOCAL_PLAYER_ID);

      expect(result).not.toBe(localState);
      expect(result.players[1][field]).toBe(serverSeat[field]);
    });
  });

  describe('when the server seat at an index belongs to a different player', () => {
    it('leaves that seat unchanged and returns the same reference when nothing else differs', () => {
      const localGuest = botSeat();
      const localState = createGameState([hostSeat(), localGuest]);
      const serverState = createGameState([
        hostSeat(),
        createPlayer({ id: 1, playerId: 'player_3', name: 'Someone else', isBot: false }),
      ]);

      const result = withSyncedSeatManagement(localState, serverState, LOCAL_PLAYER_ID);

      expect(result).toBe(localState);
      expect(result.players[1]).toBe(localGuest);
    });
  });

  describe('when the server state has fewer seats than the local state', () => {
    it('leaves the seat without a server counterpart unchanged', () => {
      const localGuest = botSeat();
      const localState = createGameState([hostSeat(), localGuest]);
      const serverState = createGameState([hostSeat()]);

      const result = withSyncedSeatManagement(localState, serverState, LOCAL_PLAYER_ID);

      expect(result).toBe(localState);
      expect(result.players[1]).toBe(localGuest);
    });
  });

  describe('when there are no seats', () => {
    it('returns the same localGameState reference for an empty players array', () => {
      const localState = createGameState([]);
      const serverState = createGameState([]);

      const result = withSyncedSeatManagement(localState, serverState, LOCAL_PLAYER_ID);

      expect(result).toBe(localState);
    });
  });

  describe('when the local player id is null', () => {
    it('syncs every seat, since no seat is the local player', () => {
      const localState = createGameState([hostSeat(), botSeat()]);
      const serverState = createGameState([hostSeat({ isBot: true }), reclaimedSeat()]);

      const result = withSyncedSeatManagement(localState, serverState, null);

      expect(result.players[0].isBot).toBe(true);
      expect(result.players[1].isBot).toBe(false);
    });
  });

  describe('heartbeats sync (syncedHeartbeats)', () => {
    it("flows a reclaimed peer's new heartbeats entry into the local buffer", () => {
      const localState = createGameState([hostSeat(), botSeat()], {});
      const serverState = createGameState([hostSeat(), reclaimedSeat()], { 1: 1_700_000_000_000 });

      const result = withSyncedSeatManagement(localState, serverState, LOCAL_PLAYER_ID);

      expect(result).not.toBe(localState);
      expect(result.heartbeats[1]).toBe(1_700_000_000_000);
    });

    it('preserves the local player seat\'s own heartbeats entry from local, never overwriting it from server, even when they differ', () => {
      const localState = createGameState([hostSeat(), botSeat()], { 0: 1_000 });
      const serverState = createGameState([hostSeat(), botSeat()], { 0: 9_999 });

      const result = withSyncedSeatManagement(localState, serverState, LOCAL_PLAYER_ID);

      expect(result.heartbeats[0]).toBe(1_000);
    });

    it('returns the exact same localGameState reference when only the local seat\'s own heartbeat differs on the server', () => {
      const localState = createGameState([hostSeat(), botSeat()], { 0: 1_000 });
      const serverState = createGameState([hostSeat(), botSeat()], { 0: 9_999 });

      const result = withSyncedSeatManagement(localState, serverState, LOCAL_PLAYER_ID);

      expect(result).toBe(localState);
    });

    it('returns the same heartbeats reference (no change) when every entry already matches', () => {
      const localState = createGameState([hostSeat(), botSeat()], { 0: 1_000, 1: 2_000 });
      const serverState = createGameState([hostSeat(), botSeat()], { 0: 1_000, 1: 2_000 });

      const result = withSyncedSeatManagement(localState, serverState, LOCAL_PLAYER_ID);

      expect(result).toBe(localState);
      expect(result.heartbeats).toBe(localState.heartbeats);
    });

    it('removes a local heartbeats entry that was cleared on the server (e.g. convertSeatToBot)', () => {
      const localState = createGameState([hostSeat(), botSeat()], { 1: 1_000 });
      const serverState = createGameState([hostSeat(), botSeat()], {});

      const result = withSyncedSeatManagement(localState, serverState, LOCAL_PLAYER_ID);

      expect(result).not.toBe(localState);
      expect(result.heartbeats[1]).toBeUndefined();
    });
  });
});
