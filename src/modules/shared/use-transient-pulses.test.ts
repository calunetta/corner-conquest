import { act, renderHook } from '@testing-library/react';
import { useTransientPulses } from './use-transient-pulses';

const DURATION_MS = 800;

type Props = { triggers: { key: string }[] };

function renderPulses(initialTriggers: { key: string }[]) {
  return renderHook(({ triggers }: Props) => useTransientPulses(triggers, DURATION_MS), {
    initialProps: { triggers: initialTriggers },
  });
}

describe('useTransientPulses', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns an empty record when nothing has been triggered (empty input)', () => {
    const { result } = renderPulses([]);

    expect(result.current).toEqual({});
  });

  it('marks a triggered key active with token 1 immediately', () => {
    const { result } = renderPulses([{ key: 'gold' }]);

    expect(result.current.gold).toEqual({ isActive: true, token: 1 });
  });

  it('clears the key to inactive exactly at durationMs, keeping its token', () => {
    const { result } = renderPulses([{ key: 'gold' }]);

    act(() => jest.advanceTimersByTime(DURATION_MS - 1));
    expect(result.current.gold).toEqual({ isActive: true, token: 1 });

    act(() => jest.advanceTimersByTime(1));
    expect(result.current.gold).toEqual({ isActive: false, token: 1 });
  });

  it('leaves a key that was never triggered absent from the record', () => {
    const { result } = renderPulses([{ key: 'gold' }]);

    expect(result.current.wood).toBeUndefined();
  });

  it('restarts the countdown when the same key is retriggered before it clears, bumping the token', () => {
    const { result, rerender } = renderPulses([{ key: 'gold' }]);

    act(() => jest.advanceTimersByTime(500));
    rerender({ triggers: [{ key: 'gold' }] });

    expect(result.current.gold).toEqual({ isActive: true, token: 2 });

    // 500ms after the retrigger the original 800ms schedule has passed, but the restarted one has not.
    act(() => jest.advanceTimersByTime(500));
    expect(result.current.gold).toEqual({ isActive: true, token: 2 });

    act(() => jest.advanceTimersByTime(300));
    expect(result.current.gold).toEqual({ isActive: false, token: 2 });
  });

  it('leaves no stacked timers behind after a retrigger (only one pending timer per key)', () => {
    const { rerender } = renderPulses([{ key: 'gold' }]);

    rerender({ triggers: [{ key: 'gold' }] });
    rerender({ triggers: [{ key: 'gold' }] });

    expect(jest.getTimerCount()).toBe(1);
  });

  it('pulses two different keys and clears each independently on its own schedule', () => {
    const { result, rerender } = renderPulses([{ key: 'gold' }]);

    act(() => jest.advanceTimersByTime(400));
    rerender({ triggers: [{ key: 'wood' }] });

    expect(result.current.gold).toEqual({ isActive: true, token: 1 });
    expect(result.current.wood).toEqual({ isActive: true, token: 1 });

    act(() => jest.advanceTimersByTime(400));
    expect(result.current.gold).toEqual({ isActive: false, token: 1 });
    expect(result.current.wood).toEqual({ isActive: true, token: 1 });

    act(() => jest.advanceTimersByTime(400));
    expect(result.current.wood).toEqual({ isActive: false, token: 1 });
  });

  it('does not re-pulse when rerendered with the same triggers array reference (stable reference is a no-op)', () => {
    const triggers = [{ key: 'gold' }];
    const { result, rerender } = renderPulses(triggers);
    act(() => jest.advanceTimersByTime(100));

    rerender({ triggers });

    expect(result.current.gold).toEqual({ isActive: true, token: 1 });
  });

  it('clears all pending timers on unmount', () => {
    const { unmount } = renderPulses([{ key: 'gold' }, { key: 'wood' }]);
    expect(jest.getTimerCount()).toBe(2);

    unmount();

    expect(jest.getTimerCount()).toBe(0);
  });

  it('does not mutate the triggers array passed in (pure input)', () => {
    const triggers = [{ key: 'gold' }];
    const before = JSON.parse(JSON.stringify(triggers));

    renderPulses(triggers);

    expect(triggers).toEqual(before);
  });
});
