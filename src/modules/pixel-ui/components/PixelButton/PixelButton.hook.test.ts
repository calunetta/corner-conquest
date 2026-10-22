import { act, renderHook } from '@testing-library/react';
import type { KeyboardEvent } from 'react';
import { KEY_PRESS_MS, usePixelButtonVisual } from './PixelButton.hook';

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
