import { renderHook, act } from '@testing-library/react';
import { useTurnTimer, TURN_DURATION } from './turn-timer.hook';
import { GameAction } from '@/lib/types';

describe('useTurnTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('countdown ticking', () => {
    it('starts at TURN_DURATION (120s) and decrements by 1 each second', () => {
      const { result } = renderHook(() =>
        useTurnTimer({ isMyTurn: true, gameStatus: 'playing' })
      );

      expect(result.current.timeLeft).toBe(120);
      expect(result.current.formattedTime).toBe('02:00');

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.timeLeft).toBe(119);
      expect(result.current.formattedTime).toBe('01:59');
    });

    it('continues counting down over multiple intervals', () => {
      const { result } = renderHook(() =>
        useTurnTimer({ isMyTurn: true, gameStatus: 'playing' })
      );

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.timeLeft).toBe(115);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(result.current.timeLeft).toBe(110);
    });
  });

  describe('auto end-turn at 0', () => {
    it('calls onAction(GameAction.EndTurn) when countdown reaches 0', () => {
      const onAction = jest.fn();
      const { result } = renderHook(() =>
        useTurnTimer({ isMyTurn: true, gameStatus: 'playing', onAction })
      );

      expect(result.current.timeLeft).toBe(120);

      act(() => {
        jest.advanceTimersByTime(120 * 1000);
      });

      expect(result.current.timeLeft).toBe(0);
      expect(onAction).toHaveBeenCalledTimes(1);
      expect(onAction).toHaveBeenCalledWith(GameAction.EndTurn);
    });

    it('does not call onAction if onAction is not provided', () => {
      const { result } = renderHook(() =>
        useTurnTimer({ isMyTurn: true, gameStatus: 'playing' })
      );

      act(() => {
        jest.advanceTimersByTime(120 * 1000);
      });

      expect(result.current.timeLeft).toBe(0);
      // No error should be thrown
    });

    it('clears the timer after calling onAction at 0', () => {
      const onAction = jest.fn();
      const { result } = renderHook(() =>
        useTurnTimer({ isMyTurn: true, gameStatus: 'playing', onAction })
      );

      act(() => {
        jest.advanceTimersByTime(120 * 1000);
      });

      expect(result.current.timeLeft).toBe(0);

      // Advance more time - timeLeft should stay at 0, onAction should not be called again
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.timeLeft).toBe(0);
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('isExpiring flag', () => {
    it('is true when timeLeft <= 20 and isMyTurn and gameStatus is playing', () => {
      const { result } = renderHook(() =>
        useTurnTimer({ isMyTurn: true, gameStatus: 'playing' })
      );

      expect(result.current.isExpiring).toBe(false);

      // Advance to 21 seconds left
      act(() => {
        jest.advanceTimersByTime(99 * 1000);
      });

      expect(result.current.timeLeft).toBe(21);
      expect(result.current.isExpiring).toBe(false);

      // Advance to 20 seconds left
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(result.current.timeLeft).toBe(20);
      expect(result.current.isExpiring).toBe(true);
    });

    it('is false when timeLeft <= 20 but isMyTurn is false', () => {
      const { result, rerender } = renderHook(
        ({ isMyTurn, gameStatus }) => useTurnTimer({ isMyTurn, gameStatus }),
        { initialProps: { isMyTurn: true, gameStatus: 'playing' } }
      );

      act(() => {
        jest.advanceTimersByTime(100 * 1000);
      });

      expect(result.current.timeLeft).toBe(20);
      expect(result.current.isExpiring).toBe(true);

      // Change to not my turn
      rerender({ isMyTurn: false, gameStatus: 'playing' });

      expect(result.current.isExpiring).toBe(false);
    });

    it('is false when timeLeft <= 20 but gameStatus is not playing', () => {
      const { result, rerender } = renderHook(
        ({ isMyTurn, gameStatus }) => useTurnTimer({ isMyTurn, gameStatus }),
        { initialProps: { isMyTurn: true, gameStatus: 'playing' } }
      );

      act(() => {
        jest.advanceTimersByTime(100 * 1000);
      });

      expect(result.current.timeLeft).toBe(20);
      expect(result.current.isExpiring).toBe(true);

      // Change game status
      rerender({ isMyTurn: true, gameStatus: 'ended' });

      expect(result.current.isExpiring).toBe(false);
    });
  });

  describe('reset on isMyTurn change', () => {
    it('resets timeLeft to TURN_DURATION when isMyTurn becomes true', () => {
      const { result, rerender } = renderHook(
        ({ isMyTurn, gameStatus }) => useTurnTimer({ isMyTurn, gameStatus }),
        { initialProps: { isMyTurn: false, gameStatus: 'playing' } }
      );

      expect(result.current.timeLeft).toBe(120);

      // Start my turn and advance time
      rerender({ isMyTurn: true, gameStatus: 'playing' });

      act(() => {
        jest.advanceTimersByTime(30 * 1000);
      });

      expect(result.current.timeLeft).toBe(90);

      // On next turn, it should still count down
      act(() => {
        jest.advanceTimersByTime(10 * 1000);
      });

      expect(result.current.timeLeft).toBe(80);
    });

    it('resets timeLeft to TURN_DURATION when isMyTurn becomes false', () => {
      const { result, rerender } = renderHook(
        ({ isMyTurn, gameStatus }) => useTurnTimer({ isMyTurn, gameStatus }),
        { initialProps: { isMyTurn: true, gameStatus: 'playing' } }
      );

      act(() => {
        jest.advanceTimersByTime(30 * 1000);
      });

      expect(result.current.timeLeft).toBe(90);

      // Turn ends
      rerender({ isMyTurn: false, gameStatus: 'playing' });

      expect(result.current.timeLeft).toBe(120);
      expect(result.current.formattedTime).toBe('02:00');
    });

    it('clears the timer when isMyTurn becomes false', () => {
      const onAction = jest.fn();
      const { rerender } = renderHook(
        ({ isMyTurn, gameStatus }) => useTurnTimer({ isMyTurn, gameStatus, onAction }),
        { initialProps: { isMyTurn: true, gameStatus: 'playing' } }
      );

      act(() => {
        jest.advanceTimersByTime(30 * 1000);
      });

      // Turn ends
      rerender({ isMyTurn: false, gameStatus: 'playing' });

      // Advance time - should not call onAction
      act(() => {
        jest.advanceTimersByTime(200 * 1000);
      });

      expect(onAction).not.toHaveBeenCalled();
    });
  });

  describe('reset on gameStatus change', () => {
    it('resets timeLeft when gameStatus changes from playing to ended', () => {
      const { result, rerender } = renderHook(
        ({ isMyTurn, gameStatus }) => useTurnTimer({ isMyTurn, gameStatus }),
        { initialProps: { isMyTurn: true, gameStatus: 'playing' } }
      );

      act(() => {
        jest.advanceTimersByTime(30 * 1000);
      });

      expect(result.current.timeLeft).toBe(90);

      rerender({ isMyTurn: true, gameStatus: 'ended' });

      expect(result.current.timeLeft).toBe(120);
    });

    it('clears the timer when gameStatus changes to non-playing', () => {
      const onAction = jest.fn();
      const { rerender } = renderHook(
        ({ isMyTurn, gameStatus }) => useTurnTimer({ isMyTurn, gameStatus, onAction }),
        { initialProps: { isMyTurn: true, gameStatus: 'playing' } }
      );

      act(() => {
        jest.advanceTimersByTime(30 * 1000);
      });

      rerender({ isMyTurn: true, gameStatus: 'paused' });

      // Advance time - should not call onAction
      act(() => {
        jest.advanceTimersByTime(200 * 1000);
      });

      expect(onAction).not.toHaveBeenCalled();
    });
  });

  describe('formattedTime', () => {
    it('formats time as MM:SS', () => {
      const { result } = renderHook(() =>
        useTurnTimer({ isMyTurn: true, gameStatus: 'playing' })
      );

      expect(result.current.formattedTime).toBe('02:00');

      act(() => {
        jest.advanceTimersByTime(1 * 1000);
      });

      expect(result.current.formattedTime).toBe('01:59');

      act(() => {
        jest.advanceTimersByTime(59 * 1000);
      });

      expect(result.current.formattedTime).toBe('01:00');

      act(() => {
        jest.advanceTimersByTime(60 * 1000);
      });

      expect(result.current.formattedTime).toBe('00:00');
    });

    it('pads single-digit minutes and seconds with leading zeros', () => {
      const { result } = renderHook(() =>
        useTurnTimer({ isMyTurn: true, gameStatus: 'playing' })
      );

      act(() => {
        jest.advanceTimersByTime(70 * 1000);
      });

      // 50 seconds left -> 00:50
      expect(result.current.formattedTime).toBe('00:50');
    });
  });

  describe('percentage calculation', () => {
    it('returns 100 at start', () => {
      const { result } = renderHook(() =>
        useTurnTimer({ isMyTurn: true, gameStatus: 'playing' })
      );

      expect(result.current.percentage).toBe(100);
    });

    it('decreases as time runs out', () => {
      const { result } = renderHook(() =>
        useTurnTimer({ isMyTurn: true, gameStatus: 'playing' })
      );

      act(() => {
        jest.advanceTimersByTime(60 * 1000);
      });

      // Half of 120s used
      expect(result.current.percentage).toBe(50);
    });

    it('returns 0 when time is up', () => {
      const { result } = renderHook(() =>
        useTurnTimer({ isMyTurn: true, gameStatus: 'playing' })
      );

      act(() => {
        jest.advanceTimersByTime(120 * 1000);
      });

      expect(result.current.percentage).toBe(0);
    });
  });

  describe('turnDuration constant', () => {
    it('returns TURN_DURATION constant', () => {
      const { result } = renderHook(() =>
        useTurnTimer({ isMyTurn: true, gameStatus: 'playing' })
      );

      expect(result.current.turnDuration).toBe(120);
      expect(result.current.turnDuration).toBe(TURN_DURATION);
    });
  });

  describe('timer not active when not my turn', () => {
    it('does not tick when isMyTurn is false and gameStatus is playing', () => {
      const { result } = renderHook(() =>
        useTurnTimer({ isMyTurn: false, gameStatus: 'playing' })
      );

      expect(result.current.timeLeft).toBe(120);

      act(() => {
        jest.advanceTimersByTime(10 * 1000);
      });

      // Should still be at 120, not counting down
      expect(result.current.timeLeft).toBe(120);
    });

    it('does not tick when gameStatus is not playing', () => {
      const { result } = renderHook(() =>
        useTurnTimer({ isMyTurn: true, gameStatus: 'paused' })
      );

      expect(result.current.timeLeft).toBe(120);

      act(() => {
        jest.advanceTimersByTime(10 * 1000);
      });

      expect(result.current.timeLeft).toBe(120);
    });
  });

  describe('cleanup on unmount', () => {
    it('clears the timer when unmounting', () => {
      const { unmount } = renderHook(() =>
        useTurnTimer({ isMyTurn: true, gameStatus: 'playing' })
      );

      act(() => {
        jest.advanceTimersByTime(30 * 1000);
      });

      unmount();

      // Advance more time - should not cause errors
      act(() => {
        jest.advanceTimersByTime(200 * 1000);
      });

      // No assertion needed; this just verifies no errors occur
    });
  });

  describe('onAction callback updates', () => {
    it('uses the latest onAction callback', () => {
      const onAction1 = jest.fn();
      const { rerender } = renderHook(
        ({ isMyTurn, gameStatus, onAction }) =>
          useTurnTimer({ isMyTurn, gameStatus, onAction }),
        { initialProps: { isMyTurn: true, gameStatus: 'playing', onAction: onAction1 } }
      );

      act(() => {
        jest.advanceTimersByTime(30 * 1000);
      });

      const onAction2 = jest.fn();
      rerender({ isMyTurn: true, gameStatus: 'playing', onAction: onAction2 });

      act(() => {
        jest.advanceTimersByTime(90 * 1000);
      });

      // Should call the second callback
      expect(onAction1).not.toHaveBeenCalled();
      expect(onAction2).toHaveBeenCalledWith(GameAction.EndTurn);
    });
  });
});
