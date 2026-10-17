import { useEffect, useRef, useState } from 'react';
import { clampFogTiming, type FogTiming } from './TileFog.config';

/**
 * covered: still first frame. lifting: the gif plays its pass. fadingOut: the layer fades while the
 * gif is still playing. cleared: nothing rendered, so the gif's loop never shows again.
 */
export type FogPhase = 'covered' | 'lifting' | 'fadingOut' | 'cleared';

export interface FogPhaseState {
  phase: FogPhase;
  /** Bumps on every discovery so the gif element remounts and plays from its first frame. */
  liftId: number;
}

/** Runs one fog pass when a covered tile becomes discovered. Never on mount, never while covered. */
export function useFogPhase(
  isCovered: boolean,
  prefersReducedMotion: boolean,
  timing: FogTiming,
  passMs: number,
): FogPhaseState {
  const [phase, setPhase] = useState<FogPhase>(isCovered ? 'covered' : 'cleared');
  const [liftId, setLiftId] = useState(0);
  const wasCoveredRef = useRef(isCovered);
  const { fadeStartMs, fadeMs } = clampFogTiming(timing, passMs);

  useEffect(() => {
    if (isCovered) {
      wasCoveredRef.current = true;
      setPhase('covered');
      return undefined;
    }
    if (!wasCoveredRef.current || prefersReducedMotion) {
      setPhase('cleared');
      return undefined;
    }

    wasCoveredRef.current = false;
    setLiftId((id) => id + 1);
    setPhase('lifting');
    const fadeTimer = setTimeout(() => setPhase('fadingOut'), fadeStartMs);
    const clearTimer = setTimeout(() => setPhase('cleared'), fadeStartMs + fadeMs);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(clearTimer);
    };
  }, [isCovered, prefersReducedMotion, fadeStartMs, fadeMs]);

  return { phase, liftId };
}
