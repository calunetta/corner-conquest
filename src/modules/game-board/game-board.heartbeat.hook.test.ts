import { renderHook, act } from '@testing-library/react';
import { useHeartbeat, HEARTBEAT_INTERVAL_MS } from './game-board.heartbeat.hook';
import { writeHeartbeat } from './services/game-board.engine.service';
import { GameStatus } from '@/lib/types';
import type { Player } from '@/lib/types';

jest.mock('./services/game-board.engine.service', () => ({
  writeHeartbeat: jest.fn(),
}));

const mockWriteHeartbeat = writeHeartbeat as jest.Mock;

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

type HeartbeatProps = Parameters<typeof useHeartbeat>[0];

const defaultProps = (overrides?: Partial<HeartbeatProps>): HeartbeatProps => ({
  gameId: 'game_1',
  localPlayer: createPlayer(),
  status: GameStatus.Playing,
  ...overrides,
});

describe('useHeartbeat', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockWriteHeartbeat.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('uses a 15 second heartbeat interval', () => {
    expect(HEARTBEAT_INTERVAL_MS).toBe(15_000);
  });

  it('writes a heartbeat immediately on mount, before the first interval tick', () => {
    renderHook(() => useHeartbeat(defaultProps()));

    expect(mockWriteHeartbeat).toHaveBeenCalledTimes(1);
    expect(mockWriteHeartbeat).toHaveBeenCalledWith('game_1', 1);
  });

  it('writes again exactly once per interval while playing', () => {
    renderHook(() => useHeartbeat(defaultProps()));
    mockWriteHeartbeat.mockClear();

    act(() => {
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS - 1);
    });
    expect(mockWriteHeartbeat).toHaveBeenCalledTimes(0);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(mockWriteHeartbeat).toHaveBeenCalledTimes(1);
    expect(mockWriteHeartbeat).toHaveBeenLastCalledWith('game_1', 1);

    act(() => {
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 2);
    });
    expect(mockWriteHeartbeat).toHaveBeenCalledTimes(3);
  });

  it.each([
    ['waiting', GameStatus.Waiting],
    ['finished', GameStatus.Finished],
    ['undefined (game not loaded)', undefined],
  ])('does not write when the status is %s', (_label, status) => {
    renderHook(() => useHeartbeat(defaultProps({ status })));

    act(() => {
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 3);
    });

    expect(mockWriteHeartbeat).not.toHaveBeenCalled();
  });

  it('does not write when there is no local player (spectator or not yet loaded)', () => {
    renderHook(() => useHeartbeat(defaultProps({ localPlayer: null })));

    act(() => {
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 3);
    });

    expect(mockWriteHeartbeat).not.toHaveBeenCalled();
  });

  it('does not write for a local seat that is a bot', () => {
    renderHook(() => useHeartbeat(defaultProps({ localPlayer: createPlayer({ isBot: true }) })));

    act(() => {
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 3);
    });

    expect(mockWriteHeartbeat).not.toHaveBeenCalled();
  });

  it('stops writing when the status changes away from playing', () => {
    const { rerender } = renderHook((props: HeartbeatProps) => useHeartbeat(props), {
      initialProps: defaultProps(),
    });
    mockWriteHeartbeat.mockClear();

    rerender(defaultProps({ status: GameStatus.Finished }));
    act(() => {
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 2);
    });

    expect(mockWriteHeartbeat).not.toHaveBeenCalled();
  });

  it('clears the interval on unmount', () => {
    const { unmount } = renderHook(() => useHeartbeat(defaultProps()));
    mockWriteHeartbeat.mockClear();

    unmount();
    act(() => {
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 3);
    });

    expect(mockWriteHeartbeat).not.toHaveBeenCalled();
  });

  it('restarts for the new seat index when the local player changes seat', () => {
    const { rerender } = renderHook((props: HeartbeatProps) => useHeartbeat(props), {
      initialProps: defaultProps(),
    });
    mockWriteHeartbeat.mockClear();

    rerender(defaultProps({ localPlayer: createPlayer({ id: 2, playerId: 'player_3' }) }));

    expect(mockWriteHeartbeat).toHaveBeenCalledTimes(1);
    expect(mockWriteHeartbeat).toHaveBeenLastCalledWith('game_1', 2);
  });

  it('keeps the interval running when only unrelated props change', () => {
    const { rerender } = renderHook((props: HeartbeatProps) => useHeartbeat(props), {
      initialProps: defaultProps(),
    });
    mockWriteHeartbeat.mockClear();

    act(() => {
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS - 1000);
    });
    rerender(defaultProps({ localPlayer: createPlayer({ name: 'Renamed' }) }));
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockWriteHeartbeat).toHaveBeenCalledTimes(1);
  });

  it('logs and keeps ticking when a heartbeat write fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const writeError = new Error('network down');
    mockWriteHeartbeat.mockRejectedValueOnce(writeError);

    renderHook(() => useHeartbeat(defaultProps()));

    await act(async () => {
      await Promise.resolve();
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error writing heartbeat:', writeError);

    await act(async () => {
      jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS);
    });
    expect(mockWriteHeartbeat).toHaveBeenCalledTimes(2);

    consoleErrorSpy.mockRestore();
  });
});
