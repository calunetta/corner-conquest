import { renderHook, act } from '@testing-library/react';
import { useStalenessCheck, STALE_THRESHOLD_MS, STALENESS_CHECK_INTERVAL_MS } from './game-board.staleness.hook';
import { handlePlayerExit } from '@/modules/game-rules';
import { GameStatus } from '@/lib/types';
import type { GameState, Player } from '@/lib/types';

jest.mock('@/modules/game-rules', () => ({
  handlePlayerExit: jest.fn(),
}));

const mockHandlePlayerExit = handlePlayerExit as jest.Mock;

const START_TIME = new Date('2026-10-10T12:00:00Z').getTime();
// The first interval tick fires at this instant; every heartbeat below is set relative to it.
const FIRST_CHECK_TIME = START_TIME + STALENESS_CHECK_INTERVAL_MS;

const createPlayer = (overrides?: Partial<Player>): Player =>
  ({
    id: 1,
    playerId: 'player_2',
    name: 'Player 2',
    color: 'red',
    isBot: false,
    isVacant: false,
    reclaimRequested: false,
    ...overrides,
  }) as Player;

const createGameState = (
  players: Player[],
  heartbeats: GameState['heartbeats'] = {},
  status: GameStatus = GameStatus.Playing,
): GameState => ({ id: 'game_1', status, players, heartbeats }) as unknown as GameState;

type StalenessProps = Parameters<typeof useStalenessCheck>[0];

const renderStalenessCheck = (initialProps: StalenessProps) =>
  renderHook((props: StalenessProps) => useStalenessCheck(props), { initialProps });

const advanceToNextCheck = () => {
  act(() => {
    jest.advanceTimersByTime(STALENESS_CHECK_INTERVAL_MS);
  });
};

describe('useStalenessCheck', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(START_TIME);
    mockHandlePlayerExit.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('uses a 120 second stale threshold checked every 20 seconds', () => {
    expect(STALE_THRESHOLD_MS).toBe(120_000);
    expect(STALENESS_CHECK_INTERVAL_MS).toBe(20_000);
  });

  it('does not exit a peer idle for ~100 seconds (below the 120s threshold)', () => {
    renderStalenessCheck({
      gameId: 'game_1',
      gameState: createGameState(
        [createPlayer({ id: 0, playerId: 'player_1' }), createPlayer({ id: 1, playerId: 'player_2' })],
        { 1: FIRST_CHECK_TIME - 100_000 },
      ),
      localPlayerId: 'player_1',
    });

    advanceToNextCheck();

    expect(mockHandlePlayerExit).not.toHaveBeenCalled();
  });

  it('exits a peer idle for ~121 seconds (above the 120s threshold)', () => {
    renderStalenessCheck({
      gameId: 'game_1',
      gameState: createGameState(
        [createPlayer({ id: 0, playerId: 'player_1' }), createPlayer({ id: 1, playerId: 'player_2' })],
        { 1: FIRST_CHECK_TIME - 121_000 },
      ),
      localPlayerId: 'player_1',
    });

    advanceToNextCheck();

    expect(mockHandlePlayerExit).toHaveBeenCalledTimes(1);
    expect(mockHandlePlayerExit).toHaveBeenCalledWith('game_1', 'player_2');
  });

  it('exits a human peer whose last heartbeat is older than the threshold', () => {
    renderStalenessCheck({
      gameId: 'game_1',
      gameState: createGameState(
        [createPlayer({ id: 0, playerId: 'player_1' }), createPlayer({ id: 1, playerId: 'player_2' })],
        { 1: FIRST_CHECK_TIME - STALE_THRESHOLD_MS - 1 },
      ),
      localPlayerId: 'player_1',
    });

    advanceToNextCheck();

    expect(mockHandlePlayerExit).toHaveBeenCalledTimes(1);
    expect(mockHandlePlayerExit).toHaveBeenCalledWith('game_1', 'player_2');
  });

  it('does not exit a peer whose heartbeat is exactly at the threshold (the comparison is strictly greater)', () => {
    renderStalenessCheck({
      gameId: 'game_1',
      gameState: createGameState(
        [createPlayer({ id: 0, playerId: 'player_1' }), createPlayer({ id: 1, playerId: 'player_2' })],
        { 1: FIRST_CHECK_TIME - STALE_THRESHOLD_MS },
      ),
      localPlayerId: 'player_1',
    });

    advanceToNextCheck();

    expect(mockHandlePlayerExit).not.toHaveBeenCalled();
  });

  it('does not exit a peer whose heartbeat is recent', () => {
    renderStalenessCheck({
      gameId: 'game_1',
      gameState: createGameState(
        [createPlayer({ id: 0, playerId: 'player_1' }), createPlayer({ id: 1, playerId: 'player_2' })],
        { 1: FIRST_CHECK_TIME - 1000 },
      ),
      localPlayerId: 'player_1',
    });

    advanceToNextCheck();

    expect(mockHandlePlayerExit).not.toHaveBeenCalled();
  });

  it('never exits the local player, even when its own heartbeat is stale', () => {
    renderStalenessCheck({
      gameId: 'game_1',
      gameState: createGameState(
        [createPlayer({ id: 0, playerId: 'player_1' }), createPlayer({ id: 1, playerId: 'player_2' })],
        { 0: FIRST_CHECK_TIME - STALE_THRESHOLD_MS - 5000, 1: FIRST_CHECK_TIME },
      ),
      localPlayerId: 'player_1',
    });

    advanceToNextCheck();

    expect(mockHandlePlayerExit).not.toHaveBeenCalled();
  });

  it('never exits a bot seat, even when its heartbeat entry is stale', () => {
    renderStalenessCheck({
      gameId: 'game_1',
      gameState: createGameState(
        [createPlayer({ id: 0, playerId: 'player_1' }), createPlayer({ id: 1, playerId: 'bot_1', isBot: true })],
        { 1: FIRST_CHECK_TIME - STALE_THRESHOLD_MS - 5000 },
      ),
      localPlayerId: 'player_1',
    });

    advanceToNextCheck();

    expect(mockHandlePlayerExit).not.toHaveBeenCalled();
  });

  it('skips a peer with no heartbeats entry (no heartbeat yet)', () => {
    renderStalenessCheck({
      gameId: 'game_1',
      gameState: createGameState(
        [createPlayer({ id: 0, playerId: 'player_1' }), createPlayer({ id: 1, playerId: 'player_2' })],
        {},
      ),
      localPlayerId: 'player_1',
    });

    advanceToNextCheck();

    expect(mockHandlePlayerExit).not.toHaveBeenCalled();
  });

  it('exits every stale human peer and only those, in seat order', () => {
    renderStalenessCheck({
      gameId: 'game_1',
      gameState: createGameState(
        [
          createPlayer({ id: 0, playerId: 'player_1' }),
          createPlayer({ id: 1, playerId: 'player_2' }),
          createPlayer({ id: 2, playerId: 'bot_3', isBot: true }),
          createPlayer({ id: 3, playerId: 'player_4' }),
          createPlayer({ id: 4, playerId: 'player_5' }),
        ],
        {
          1: FIRST_CHECK_TIME - STALE_THRESHOLD_MS - 1,
          3: FIRST_CHECK_TIME - 1000,
          4: FIRST_CHECK_TIME - STALE_THRESHOLD_MS - 60_000,
        },
      ),
      localPlayerId: 'player_1',
    });

    advanceToNextCheck();

    expect(mockHandlePlayerExit).toHaveBeenCalledTimes(2);
    expect(mockHandlePlayerExit.mock.calls).toEqual([
      ['game_1', 'player_2'],
      ['game_1', 'player_5'],
    ]);
  });

  it('does nothing before the first interval tick', () => {
    renderStalenessCheck({
      gameId: 'game_1',
      gameState: createGameState(
        [createPlayer({ id: 0, playerId: 'player_1' }), createPlayer({ id: 1, playerId: 'player_2' })],
        { 1: START_TIME - STALE_THRESHOLD_MS - 1 },
      ),
      localPlayerId: 'player_1',
    });

    act(() => {
      jest.advanceTimersByTime(STALENESS_CHECK_INTERVAL_MS - 1);
    });

    expect(mockHandlePlayerExit).not.toHaveBeenCalled();
  });

  it.each([
    ['waiting', GameStatus.Waiting],
    ['finished', GameStatus.Finished],
  ])('does not check peers when the game status is %s', (_label, status) => {
    renderStalenessCheck({
      gameId: 'game_1',
      gameState: createGameState(
        [createPlayer({ id: 0, playerId: 'player_1' }), createPlayer({ id: 1, playerId: 'player_2' })],
        { 1: START_TIME - STALE_THRESHOLD_MS - 1 },
        status,
      ),
      localPlayerId: 'player_1',
    });

    advanceToNextCheck();
    advanceToNextCheck();

    expect(mockHandlePlayerExit).not.toHaveBeenCalled();
  });

  it('does not check when there is no game state yet', () => {
    renderStalenessCheck({ gameId: 'game_1', gameState: null, localPlayerId: 'player_1' });

    advanceToNextCheck();

    expect(mockHandlePlayerExit).not.toHaveBeenCalled();
  });

  it('checks the latest snapshot on a tick without restarting the interval on each snapshot', () => {
    const { rerender } = renderStalenessCheck({
      gameId: 'game_1',
      gameState: createGameState(
        [createPlayer({ id: 0, playerId: 'player_1' }), createPlayer({ id: 1, playerId: 'player_2' })],
        {},
      ),
      localPlayerId: 'player_1',
    });

    // A new snapshot arrives mid-interval, after the peer has gone stale in it.
    const HALF_INTERVAL = STALENESS_CHECK_INTERVAL_MS / 2;
    act(() => {
      jest.advanceTimersByTime(HALF_INTERVAL);
    });
    rerender({
      gameId: 'game_1',
      gameState: createGameState(
        [createPlayer({ id: 0, playerId: 'player_1' }), createPlayer({ id: 1, playerId: 'player_2' })],
        { 1: FIRST_CHECK_TIME - STALE_THRESHOLD_MS - 1 },
      ),
      localPlayerId: 'player_1',
    });

    // The original interval still fires at one full tick, not half + a full interval.
    act(() => {
      jest.advanceTimersByTime(HALF_INTERVAL);
    });

    expect(mockHandlePlayerExit).toHaveBeenCalledTimes(1);
    expect(mockHandlePlayerExit).toHaveBeenCalledWith('game_1', 'player_2');
  });

  it('does not exit a peer whose heartbeat arrived again before the tick', () => {
    const { rerender } = renderStalenessCheck({
      gameId: 'game_1',
      gameState: createGameState(
        [createPlayer({ id: 0, playerId: 'player_1' }), createPlayer({ id: 1, playerId: 'player_2' })],
        { 1: START_TIME - STALE_THRESHOLD_MS - 1 },
      ),
      localPlayerId: 'player_1',
    });

    rerender({
      gameId: 'game_1',
      gameState: createGameState(
        [createPlayer({ id: 0, playerId: 'player_1' }), createPlayer({ id: 1, playerId: 'player_2' })],
        { 1: FIRST_CHECK_TIME },
      ),
      localPlayerId: 'player_1',
    });

    advanceToNextCheck();

    expect(mockHandlePlayerExit).not.toHaveBeenCalled();
  });

  it('stops checking after unmount', () => {
    const { unmount } = renderStalenessCheck({
      gameId: 'game_1',
      gameState: createGameState(
        [createPlayer({ id: 0, playerId: 'player_1' }), createPlayer({ id: 1, playerId: 'player_2' })],
        { 1: START_TIME - STALE_THRESHOLD_MS - 1 },
      ),
      localPlayerId: 'player_1',
    });

    unmount();
    act(() => {
      jest.advanceTimersByTime(STALENESS_CHECK_INTERVAL_MS * 3);
    });

    expect(mockHandlePlayerExit).not.toHaveBeenCalled();
  });

  it('stops checking when the status changes to finished', () => {
    const { rerender } = renderStalenessCheck({
      gameId: 'game_1',
      gameState: createGameState(
        [createPlayer({ id: 0, playerId: 'player_1' }), createPlayer({ id: 1, playerId: 'player_2' })],
        { 1: START_TIME - STALE_THRESHOLD_MS - 1 },
      ),
      localPlayerId: 'player_1',
    });

    rerender({
      gameId: 'game_1',
      gameState: createGameState(
        [createPlayer({ id: 0, playerId: 'player_1' }), createPlayer({ id: 1, playerId: 'player_2' })],
        { 1: START_TIME - STALE_THRESHOLD_MS - 1 },
        GameStatus.Finished,
      ),
      localPlayerId: 'player_1',
    });
    advanceToNextCheck();

    expect(mockHandlePlayerExit).not.toHaveBeenCalled();
  });

  it('does not throw and logs when handlePlayerExit rejects (plan: "log (don\'t throw) on failure")', async () => {
    // Reproduction: the hook calls `void handlePlayerExit(...)` with no catch, so the rejection is unhandled.
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const exitError = new Error('transaction aborted');
    mockHandlePlayerExit.mockRejectedValueOnce(exitError);

    renderStalenessCheck({
      gameId: 'game_1',
      gameState: createGameState(
        [createPlayer({ id: 0, playerId: 'player_1' }), createPlayer({ id: 1, playerId: 'player_2' })],
        { 1: START_TIME - STALE_THRESHOLD_MS - 1 },
      ),
      localPlayerId: 'player_1',
    });

    await act(async () => {
      jest.advanceTimersByTime(STALENESS_CHECK_INTERVAL_MS);
      await Promise.resolve();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String), exitError);
    consoleErrorSpy.mockRestore();
  });
});
