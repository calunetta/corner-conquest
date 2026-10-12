import { renderHook, act } from '@testing-library/react';
import { useGameBoard } from '../../game-board.provider';
import { useToast } from '@/modules/shared';
import { writeHeartbeat } from '../../services/game-board.engine.service';
import { GameStatus } from '@/lib/types';
import type { GameState, Player } from '@/lib/types';
import {
  useConnectionWarning,
  WARNING_THRESHOLD_MS,
  playConnectionWarningTone,
} from './ConnectionWarningDialog.hook';

jest.mock('../../game-board.provider', () => ({ useGameBoard: jest.fn() }));
jest.mock('../../services/game-board.engine.service', () => ({ writeHeartbeat: jest.fn() }));
jest.mock('@/modules/shared', () => ({ useToast: jest.fn() }));

const START_TIME = new Date('2026-10-12T12:00:00Z').getTime();

const createPlayer = (overrides?: Partial<Player>): Player =>
  ({
    id: 0,
    playerId: 'player_1',
    name: 'Player 1',
    color: 'blue',
    isBot: false,
    isVacant: false,
    lastSeenAt: START_TIME,
    reclaimRequested: false,
    ...overrides,
  }) as Player;

const createGameState = (status: GameStatus = GameStatus.Playing): GameState =>
  ({ id: 'game_1', status, players: [] }) as unknown as GameState;

const mockUseGameBoard = (localPlayer: Player, status: GameStatus = GameStatus.Playing) => {
  jest.mocked(useGameBoard).mockReturnValue({
    gameState: createGameState(status),
    localPlayer,
  } as unknown as ReturnType<typeof useGameBoard>);
};

describe('useConnectionWarning', () => {
  const mockToast = jest.fn();

  beforeEach(() => {
    jest.mocked(useToast).mockReturnValue({ toast: mockToast } as unknown as ReturnType<typeof useToast>);
  });

  let mockOscillator: {
    frequency: { value: number };
    connect: jest.Mock;
    start: jest.Mock;
    stop: jest.Mock;
    onended: (() => void) | null;
  };
  let mockAudioContext: {
    createOscillator: jest.Mock;
    destination: unknown;
    currentTime: number;
    close: jest.Mock;
  };
  let audioContextConstructor: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(START_TIME);

    mockOscillator = {
      frequency: { value: 0 },
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      onended: null,
    };
    mockAudioContext = {
      createOscillator: jest.fn(() => mockOscillator),
      destination: {},
      currentTime: 0,
      close: jest.fn(),
    };
    audioContextConstructor = jest.fn(() => mockAudioContext);
    (window as unknown as { AudioContext: unknown }).AudioContext = audioContextConstructor;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  });

  it('stays closed through multiple ticks while the player is connected', () => {
    mockUseGameBoard(createPlayer({ lastSeenAt: START_TIME }));

    const { result } = renderHook(() => useConnectionWarning());

    expect(result.current.isOpen).toBe(false);

    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    expect(result.current.isOpen).toBe(false);

    act(() => {
      jest.advanceTimersByTime(5_000);
    });
    expect(result.current.isOpen).toBe(false);
    expect(audioContextConstructor).not.toHaveBeenCalled();
  });

  it('opens once lastSeenAt ages past WARNING_THRESHOLD_MS and plays the tone exactly once', () => {
    mockUseGameBoard(createPlayer({ lastSeenAt: START_TIME - WARNING_THRESHOLD_MS }));

    const { result } = renderHook(() => useConnectionWarning());

    act(() => {
      jest.advanceTimersByTime(1_000);
    });

    expect(result.current.isOpen).toBe(true);
    expect(audioContextConstructor).toHaveBeenCalledTimes(1);

    // Further ticks while it stays open must not replay the tone.
    act(() => {
      jest.advanceTimersByTime(3_000);
    });
    expect(result.current.isOpen).toBe(true);
    expect(audioContextConstructor).toHaveBeenCalledTimes(1);
  });

  it('closes on the render after a fresh heartbeat lands, without waiting for the next tick', () => {
    mockUseGameBoard(createPlayer({ lastSeenAt: START_TIME - WARNING_THRESHOLD_MS }));

    const { result, rerender } = renderHook(() => useConnectionWarning());

    act(() => {
      jest.advanceTimersByTime(1_000);
    });
    expect(result.current.isOpen).toBe(true);

    mockUseGameBoard(createPlayer({ lastSeenAt: Date.now() }));
    rerender();

    expect(result.current.isOpen).toBe(false);
  });

  it('re-arms the tone on a recovery then a relapse (fires once more, not zero more times)', () => {
    mockUseGameBoard(createPlayer({ lastSeenAt: START_TIME - WARNING_THRESHOLD_MS }));

    const { result, rerender } = renderHook(() => useConnectionWarning());

    act(() => {
      jest.advanceTimersByTime(1_000);
    });
    expect(result.current.isOpen).toBe(true);
    expect(audioContextConstructor).toHaveBeenCalledTimes(1);

    // Recovers: fresh heartbeat closes the dialog.
    mockUseGameBoard(createPlayer({ lastSeenAt: Date.now() }));
    rerender();
    expect(result.current.isOpen).toBe(false);

    // Relapses: ages past the threshold again.
    const relapseTime = Date.now();
    mockUseGameBoard(createPlayer({ lastSeenAt: relapseTime - WARNING_THRESHOLD_MS }));
    rerender();

    act(() => {
      jest.advanceTimersByTime(1_000);
    });

    expect(result.current.isOpen).toBe(true);
    expect(audioContextConstructor).toHaveBeenCalledTimes(2);
  });

  it('closes when isBot flips true (post-conversion) even if lastSeenAt is still old', () => {
    mockUseGameBoard(createPlayer({ lastSeenAt: START_TIME - WARNING_THRESHOLD_MS }));

    const { result, rerender } = renderHook(() => useConnectionWarning());

    act(() => {
      jest.advanceTimersByTime(1_000);
    });
    expect(result.current.isOpen).toBe(true);

    mockUseGameBoard(createPlayer({ lastSeenAt: START_TIME - WARNING_THRESHOLD_MS, isBot: true }));
    rerender();

    expect(result.current.isOpen).toBe(false);
  });

  it('steps the countdownLabel down once per tick while the dialog is open', () => {
    mockUseGameBoard(createPlayer({ lastSeenAt: START_TIME - 24_000 }));

    const { result } = renderHook(() => useConnectionWarning());

    act(() => {
      jest.advanceTimersByTime(1_000);
    });
    expect(result.current.countdownLabel).toBe('Taking over in 0:20');

    act(() => {
      jest.advanceTimersByTime(1_000);
    });
    expect(result.current.countdownLabel).toBe('Taking over in 0:19');
  });

  it('clears the interval on unmount', () => {
    mockUseGameBoard(createPlayer({ lastSeenAt: START_TIME }));
    const clearIntervalSpy = jest.spyOn(window, 'clearInterval');

    const { unmount } = renderHook(() => useConnectionWarning());
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });

  it('closes when gameState.status leaves playing even if lastSeenAt is still old', () => {
    mockUseGameBoard(createPlayer({ lastSeenAt: START_TIME - WARNING_THRESHOLD_MS }));

    const { result, rerender } = renderHook(() => useConnectionWarning());

    act(() => {
      jest.advanceTimersByTime(1_000);
    });
    expect(result.current.isOpen).toBe(true);

    mockUseGameBoard(createPlayer({ lastSeenAt: START_TIME - WARNING_THRESHOLD_MS }), GameStatus.Finished);
    rerender();

    expect(result.current.isOpen).toBe(false);
  });

  it('plays the tone once when the dialog is already open at mount', () => {
    mockUseGameBoard(createPlayer({ lastSeenAt: START_TIME - WARNING_THRESHOLD_MS - 1 }));

    renderHook(() => useConnectionWarning());

    expect(audioContextConstructor).toHaveBeenCalledTimes(1);
  });

  it('closes the AudioContext once the oscillator finishes playing', () => {
    mockUseGameBoard(createPlayer({ lastSeenAt: START_TIME - WARNING_THRESHOLD_MS - 1 }));

    renderHook(() => useConnectionWarning());

    expect(mockAudioContext.close).not.toHaveBeenCalled();
    mockOscillator.onended?.();

    expect(mockAudioContext.close).toHaveBeenCalledTimes(1);
  });

  describe('onDismiss', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('sets isDismissing to true synchronously and calls writeHeartbeat with gameState.id and localPlayer.id', () => {
      jest.mocked(writeHeartbeat).mockReturnValue(new Promise(() => {}));
      mockUseGameBoard(createPlayer({ lastSeenAt: START_TIME }));

      const { result } = renderHook(() => useConnectionWarning());

      act(() => {
        result.current.onDismiss();
      });

      expect(result.current.isDismissing).toBe(true);
      expect(writeHeartbeat).toHaveBeenCalledWith('game_1', 0);
    });

    it('resolving writeHeartbeat resets isDismissing to false and does not call toast', async () => {
      jest.mocked(writeHeartbeat).mockResolvedValue(undefined);
      mockUseGameBoard(createPlayer({ lastSeenAt: START_TIME }));

      const { result } = renderHook(() => useConnectionWarning());

      await act(async () => {
        result.current.onDismiss();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.isDismissing).toBe(false);
      expect(mockToast).not.toHaveBeenCalled();
    });

    it('rejecting writeHeartbeat resets isDismissing to false and shows the destructive toast', async () => {
      jest.mocked(writeHeartbeat).mockRejectedValue(new Error('offline'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockUseGameBoard(createPlayer({ lastSeenAt: START_TIME - WARNING_THRESHOLD_MS - 1 }));

      const { result } = renderHook(() => useConnectionWarning());
      expect(result.current.isOpen).toBe(true);

      await act(async () => {
        result.current.onDismiss();
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.isDismissing).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({
        title: "Still can't reach you",
        description: 'Check your connection and try again.',
        variant: 'destructive',
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error forcing heartbeat:', expect.any(Error));
    });

    it('does not show the toast when the dialog already closed via another path before the write rejects', async () => {
      let rejectWrite: (error: Error) => void = () => {};
      jest.mocked(writeHeartbeat).mockReturnValue(
        new Promise((_resolve, reject) => {
          rejectWrite = reject;
        }),
      );
      jest.spyOn(console, 'error').mockImplementation(() => {});
      mockUseGameBoard(createPlayer({ lastSeenAt: START_TIME - WARNING_THRESHOLD_MS }));

      const { result, rerender } = renderHook(() => useConnectionWarning());

      act(() => {
        jest.advanceTimersByTime(1_000);
      });
      expect(result.current.isOpen).toBe(true);

      act(() => {
        result.current.onDismiss();
      });
      expect(result.current.isDismissing).toBe(true);

      // Dialog closes through the normal recovery path (a fresh heartbeat lands through the
      // Firestore subscription) while the forced write from onDismiss is still in flight.
      mockUseGameBoard(createPlayer({ lastSeenAt: Date.now() }));
      rerender();
      expect(result.current.isOpen).toBe(false);

      await act(async () => {
        rejectWrite(new Error('offline'));
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(mockToast).not.toHaveBeenCalled();
    });

    it('keeps the countdown ticking while isDismissing is true', () => {
      jest.mocked(writeHeartbeat).mockReturnValue(new Promise(() => {}));
      mockUseGameBoard(createPlayer({ lastSeenAt: START_TIME - 24_000 }));

      const { result } = renderHook(() => useConnectionWarning());

      act(() => {
        result.current.onDismiss();
      });
      expect(result.current.isDismissing).toBe(true);

      act(() => {
        jest.advanceTimersByTime(1_000);
      });

      expect(result.current.countdownLabel).toBe('Taking over in 0:20');
      expect(result.current.isDismissing).toBe(true);
    });
  });
});

describe('playConnectionWarningTone error paths', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    delete (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext;
  });

  it('logs the error and does not throw when AudioContext construction fails', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (window as unknown as { AudioContext: unknown }).AudioContext = jest.fn(() => {
      throw new Error('autoplay blocked');
    });

    expect(() => playConnectionWarningTone()).not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error playing connection warning tone:',
      expect.any(Error),
    );
  });

  it('falls back to webkitAudioContext when window.AudioContext is undefined', () => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
    const oscillator = {
      frequency: { value: 0 },
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      onended: null,
    };
    const audioContext = {
      createOscillator: jest.fn(() => oscillator),
      destination: {},
      currentTime: 0,
      close: jest.fn(),
    };
    const webkitConstructor = jest.fn(() => audioContext);
    (window as unknown as { webkitAudioContext: unknown }).webkitAudioContext = webkitConstructor;

    playConnectionWarningTone();

    expect(webkitConstructor).toHaveBeenCalledTimes(1);
    expect(oscillator.start).toHaveBeenCalledTimes(1);
  });
});
