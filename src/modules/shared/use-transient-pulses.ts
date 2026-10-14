import { useEffect, useRef, useState } from 'react';

export interface PulseState {
  isActive: boolean;
  /** Changes every time this key (re)pulses; use as a React `key` to force a GIF to restart. */
  token: number;
}

type PulseTrigger = { key: string };

/** For each `{ key }` in `triggers`, marks that key active and bumps its token, clearing it back
 *  to inactive `durationMs` later. Retriggering a key before it clears restarts its timer. A
 *  stable `triggers` reference across renders is a no-op. */
export function useTransientPulses(triggers: PulseTrigger[], durationMs: number): Record<string, PulseState> {
  const [pulses, setPulses] = useState<Record<string, PulseState>>({});
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (triggers.length === 0) return;

    setPulses((previous) =>
      triggers.reduce<Record<string, PulseState>>(
        (next, { key }) => ({ ...next, [key]: { isActive: true, token: (next[key]?.token ?? 0) + 1 } }),
        previous,
      ),
    );

    triggers.forEach(({ key }) => {
      const pendingTimer = timersRef.current.get(key);
      if (pendingTimer !== undefined) clearTimeout(pendingTimer);

      const timer = setTimeout(() => {
        timersRef.current.delete(key);
        setPulses((previous) => ({
          ...previous,
          [key]: { isActive: false, token: previous[key]?.token ?? 0 },
        }));
      }, durationMs);
      timersRef.current.set(key, timer);
    });
  }, [triggers, durationMs]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  return pulses;
}
