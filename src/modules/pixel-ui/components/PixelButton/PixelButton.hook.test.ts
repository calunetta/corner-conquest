import { act, renderHook } from '@testing-library/react';
import type { KeyboardEvent } from 'react';
import { KEY_PRESS_MS, usePixelButtonVisual } from './PixelButton.hook';
import type { ConsumerHandlers } from './PixelButton.types';

const keyEvent = (key: string) => ({ key }) as KeyboardEvent<HTMLButtonElement>;

const setup = (isDisabled = false) =>
  renderHook(({ disabled }: { disabled: boolean }) => usePixelButtonVisual(disabled), {
    initialProps: { disabled: isDisabled },
  });

describe('usePixelButtonVisual', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('pointer', () => {
    it('starts in the regular state', () => {
      const { result } = setup();

      expect(result.current.visual).toBe('regular');
    });

    it('pointer enter gives hover', () => {
      const { result } = setup();

      act(() => result.current.handlers.onPointerEnter?.({} as never));

      expect(result.current.visual).toBe('hover');
    });

    it('pointer down over a hovered button gives pressed', () => {
      const { result } = setup();

      act(() => result.current.handlers.onPointerEnter?.({} as never));
      act(() => result.current.handlers.onPointerDown?.({} as never));

      expect(result.current.visual).toBe('pressed');
    });

    it('pointer up after a press returns to hover while still hovered', () => {
      const { result } = setup();

      act(() => result.current.handlers.onPointerEnter?.({} as never));
      act(() => result.current.handlers.onPointerDown?.({} as never));
      act(() => result.current.handlers.onPointerUp?.({} as never));

      expect(result.current.visual).toBe('hover');
    });

    it('pointer leave from a hovered button gives regular', () => {
      const { result } = setup();

      act(() => result.current.handlers.onPointerEnter?.({} as never));
      act(() => result.current.handlers.onPointerLeave?.({} as never));

      expect(result.current.visual).toBe('regular');
    });

    it('pointer leave during a press clears both hover and pressed', () => {
      const { result } = setup();

      act(() => result.current.handlers.onPointerEnter?.({} as never));
      act(() => result.current.handlers.onPointerDown?.({} as never));
      act(() => result.current.handlers.onPointerLeave?.({} as never));

      expect(result.current.visual).toBe('regular');
    });

    it('pointer cancel clears hover and pressed', () => {
      const { result } = setup();

      act(() => result.current.handlers.onPointerEnter?.({} as never));
      act(() => result.current.handlers.onPointerDown?.({} as never));
      act(() => result.current.handlers.onPointerCancel?.({} as never));

      expect(result.current.visual).toBe('regular');
    });

    it('pointer cancel after hover without a press gives regular', () => {
      const { result } = setup();

      act(() => result.current.handlers.onPointerEnter?.({} as never));
      act(() => result.current.handlers.onPointerCancel?.({} as never));

      expect(result.current.visual).toBe('regular');
    });
  });

  describe('keyboard', () => {
    it('Enter keydown gives pressed, then regular after KEY_PRESS_MS', () => {
      const { result } = setup();

      act(() => result.current.handlers.onKeyDown?.(keyEvent('Enter')));
      expect(result.current.visual).toBe('pressed');

      act(() => jest.advanceTimersByTime(KEY_PRESS_MS - 1));
      expect(result.current.visual).toBe('pressed');

      act(() => jest.advanceTimersByTime(1));
      expect(result.current.visual).toBe('regular');
    });

    it('Space keydown gives pressed, then regular after KEY_PRESS_MS', () => {
      const { result } = setup();

      act(() => result.current.handlers.onKeyDown?.(keyEvent(' ')));
      expect(result.current.visual).toBe('pressed');

      act(() => jest.advanceTimersByTime(KEY_PRESS_MS));
      expect(result.current.visual).toBe('regular');
    });

    it('a key press over a hovered button releases back to hover', () => {
      const { result } = setup();

      act(() => result.current.handlers.onPointerEnter?.({} as never));
      act(() => result.current.handlers.onKeyDown?.(keyEvent('Enter')));
      act(() => jest.advanceTimersByTime(KEY_PRESS_MS));

      expect(result.current.visual).toBe('hover');
    });

    it.each(['a', 'Escape', 'Tab', 'Shift', 'ArrowDown'])('%s keydown is ignored', (key) => {
      const { result } = setup();

      act(() => result.current.handlers.onKeyDown?.(keyEvent(key)));

      expect(result.current.visual).toBe('regular');
      expect(jest.getTimerCount()).toBe(0);
    });

    it('a second Enter keydown restarts the press window', () => {
      const { result } = setup();

      act(() => result.current.handlers.onKeyDown?.(keyEvent('Enter')));
      act(() => jest.advanceTimersByTime(KEY_PRESS_MS - 10));
      act(() => result.current.handlers.onKeyDown?.(keyEvent('Enter')));
      act(() => jest.advanceTimersByTime(KEY_PRESS_MS - 1));
      expect(result.current.visual).toBe('pressed');

      act(() => jest.advanceTimersByTime(1));
      expect(result.current.visual).toBe('regular');
    });
  });

  describe('blur and unmount', () => {
    it('blur clears a key press and its timer', () => {
      const { result } = setup();

      act(() => result.current.handlers.onKeyDown?.(keyEvent('Enter')));
      act(() => result.current.handlers.onBlur?.({} as never));

      expect(result.current.visual).toBe('regular');
      expect(jest.getTimerCount()).toBe(0);
    });

    it('blur clears hover', () => {
      const { result } = setup();

      act(() => result.current.handlers.onPointerEnter?.({} as never));
      act(() => result.current.handlers.onBlur?.({} as never));

      expect(result.current.visual).toBe('regular');
    });

    it('unmount during the key press timer clears the timer without error', () => {
      const { result, unmount } = setup();

      act(() => result.current.handlers.onKeyDown?.(keyEvent('Enter')));
      expect(jest.getTimerCount()).toBe(1);

      expect(() => unmount()).not.toThrow();
      expect(jest.getTimerCount()).toBe(0);
      expect(() => act(() => jest.advanceTimersByTime(KEY_PRESS_MS))).not.toThrow();
    });
  });

  describe('consumer handlers', () => {
    const CONSUMER_HANDLERS = [
      'onPointerEnter',
      'onPointerLeave',
      'onPointerDown',
      'onPointerUp',
      'onPointerCancel',
      'onKeyDown',
      'onBlur',
    ] as const;

    const setupWithConsumer = (consumer: Record<string, jest.Mock>, isDisabled = false) =>
      renderHook(
        ({ disabled }: { disabled: boolean }) =>
          usePixelButtonVisual(disabled, consumer as ConsumerHandlers),
        { initialProps: { disabled: isDisabled } },
      );

    it.each(CONSUMER_HANDLERS)('%s: consumer handler is called once with the event', (name) => {
      const consumer = { [name]: jest.fn() };
      const { result } = setupWithConsumer(consumer);
      const event = { key: 'Enter' } as never;

      act(() => (result.current.handlers[name] as (e: never) => void)(event));

      expect(consumer[name]).toHaveBeenCalledTimes(1);
      expect(consumer[name]).toHaveBeenCalledWith(event);
    });

    // Order is only observable where the hook does a synchronous side effect (the press timer).
    // Visual state updates apply on re-render, so pointer-handler ordering is a code-review property
    // of the wrappers in usePixelButtonVisual, not something this hook test can observe.
    it('onKeyDown: consumer runs before the hook starts the press timer', () => {
      const timersSeenByConsumer: number[] = [];
      const consumer = { onKeyDown: jest.fn(() => timersSeenByConsumer.push(jest.getTimerCount())) };
      const { result } = setupWithConsumer(consumer);

      act(() => result.current.handlers.onKeyDown?.(keyEvent('Enter')));

      expect(timersSeenByConsumer).toEqual([0]);
      expect(jest.getTimerCount()).toBe(1);
    });

    it('onBlur: consumer runs before the hook clears the press timer', () => {
      const timersSeenByConsumer: number[] = [];
      const consumer = { onBlur: jest.fn(() => timersSeenByConsumer.push(jest.getTimerCount())) };
      const { result } = setupWithConsumer(consumer);

      act(() => result.current.handlers.onKeyDown?.(keyEvent('Enter')));
      act(() => result.current.handlers.onBlur?.({} as never));

      expect(timersSeenByConsumer).toEqual([1]);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('consumer onKeyDown is called for Enter and the 100 ms press still releases', () => {
      const consumer = { onKeyDown: jest.fn() };
      const { result } = setupWithConsumer(consumer);

      act(() => result.current.handlers.onKeyDown?.(keyEvent('Enter')));
      expect(consumer.onKeyDown).toHaveBeenCalledTimes(1);
      expect(result.current.visual).toBe('pressed');

      act(() => jest.advanceTimersByTime(KEY_PRESS_MS));
      expect(result.current.visual).toBe('regular');
    });

    it('consumer onKeyDown is called for a non-activation key and the visual stays regular', () => {
      const consumer = { onKeyDown: jest.fn() };
      const { result } = setupWithConsumer(consumer);

      act(() => result.current.handlers.onKeyDown?.(keyEvent('a')));

      expect(consumer.onKeyDown).toHaveBeenCalledTimes(1);
      expect(result.current.visual).toBe('regular');
      expect(jest.getTimerCount()).toBe(0);
    });

    it('consumer preventDefault does not stop the visual update', () => {
      const consumer = {
        onPointerEnter: jest.fn((event: { preventDefault: () => void }) => event.preventDefault()),
      };
      const { result } = setupWithConsumer(consumer);
      const preventDefault = jest.fn();

      act(() => result.current.handlers.onPointerEnter?.({ preventDefault } as never));

      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(result.current.visual).toBe('hover');
    });

    it('blur with a consumer that has no onBlur clears hover', () => {
      const consumer = { onPointerEnter: jest.fn() };
      const { result } = setupWithConsumer(consumer);

      act(() => result.current.handlers.onPointerEnter?.({} as never));
      act(() => result.current.handlers.onBlur?.({} as never));

      expect(result.current.visual).toBe('regular');
    });

    it('onKeyUp is not returned by the hook (the view spreads it from the consumer)', () => {
      const { result } = setupWithConsumer({ onKeyUp: jest.fn() });

      expect(result.current.handlers).not.toHaveProperty('onKeyUp');
    });

    it('keeps the visual disabled and still forwards every handler to the consumer', () => {
      const consumer = Object.fromEntries(CONSUMER_HANDLERS.map((name) => [name, jest.fn()]));
      const { result } = setupWithConsumer(consumer, true);

      for (const name of CONSUMER_HANDLERS) {
        act(() => (result.current.handlers[name] as (e: never) => void)({ key: 'Enter' } as never));
        expect(result.current.visual).toBe('disabled');
        expect(consumer[name]).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('disabled', () => {
    it('is disabled from the first render', () => {
      const { result } = setup(true);

      expect(result.current.visual).toBe('disabled');
    });

    it('stays disabled for every pointer and keyboard event', () => {
      const { result } = setup(true);
      const { handlers } = result.current;

      act(() => handlers.onPointerEnter?.({} as never));
      expect(result.current.visual).toBe('disabled');
      act(() => handlers.onPointerDown?.({} as never));
      expect(result.current.visual).toBe('disabled');
      act(() => handlers.onPointerUp?.({} as never));
      expect(result.current.visual).toBe('disabled');
      act(() => handlers.onPointerLeave?.({} as never));
      expect(result.current.visual).toBe('disabled');
      act(() => handlers.onPointerCancel?.({} as never));
      expect(result.current.visual).toBe('disabled');
      act(() => handlers.onKeyDown?.(keyEvent('Enter')));
      expect(result.current.visual).toBe('disabled');
      act(() => handlers.onBlur?.({} as never));
      expect(result.current.visual).toBe('disabled');
    });

    it('becoming disabled while pressed, then re-enabled, does not resurface the press', () => {
      const { result, rerender } = setup();

      act(() => result.current.handlers.onPointerEnter?.({} as never));
      act(() => result.current.handlers.onPointerDown?.({} as never));
      expect(result.current.visual).toBe('pressed');

      rerender({ disabled: true });
      expect(result.current.visual).toBe('disabled');

      rerender({ disabled: false });
      expect(result.current.visual).toBe('regular');
    });

    it('becoming disabled during a key press, then re-enabled, cancels the release timer', () => {
      const { result, rerender } = setup();

      act(() => result.current.handlers.onKeyDown?.(keyEvent('Enter')));
      rerender({ disabled: true });
      expect(jest.getTimerCount()).toBe(0);

      rerender({ disabled: false });
      expect(result.current.visual).toBe('regular');
    });
  });
});
