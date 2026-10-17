// Pure config for the fog: no React here, so the dev-only API routes can import it on the server.
import fogTimingConfig from './fog-timing.config.json';
import fogVariantsConfig from './fog-variants.config.json';

/** Tunable fog and reveal timing and placement. Defaults live in fog-timing.config.json. */
export interface FogTiming {
  /** When the fade starts, measured from the start of the gif's one pass. */
  fadeStartMs: number;
  /** How long the fade lasts. Clamped so it ends with the gif's pass (see clampFogTiming). */
  fadeMs: number;
  /** Fog layer scale; the fog overflows the tile a little at 1.15. */
  scale: number;
  /** Fog position within the tile, in percent of the tile's size. */
  offsetXPct: number;
  offsetYPct: number;
  /** Delay before the tile's content starts fading in, from the moment of discovery. */
  revealDelayMs: number;
  /** How long the content takes to fade in. */
  revealFadeMs: number;
}

/** One fog look: a still frame shown while covered and the gif played on discovery. */
export interface FogVariant {
  id: string;
  name: string;
  /** Public path of the still frame (PNG). Should match the first frame of `animation`. */
  still: string;
  /** Public path of the animated fog (GIF). */
  animation: string;
  /** Delay of every frame in `animation`, in ms. Set by the speed control. */
  frameDelayMs: number;
  /** One full pass of `animation` (frame count x frameDelayMs). The fade must end inside it. */
  passMs: number;
}

/** Bounds of the testbed's frame-delay control. */
export const FRAME_DELAY_RANGE = { min: 50, max: 1000, step: 25 };

/** Slider and validation bounds, shared by the testbed controls and the config route. */
export const FOG_TIMING_RANGES: Record<keyof FogTiming, { min: number; max: number; step: number }> = {
  fadeStartMs: { min: 0, max: 1900, step: 25 },
  fadeMs: { min: 100, max: 2000, step: 25 },
  scale: { min: 0.8, max: 1.5, step: 0.01 },
  offsetXPct: { min: -50, max: 50, step: 1 },
  offsetYPct: { min: -50, max: 50, step: 1 },
  revealDelayMs: { min: 0, max: 1000, step: 25 },
  revealFadeMs: { min: 100, max: 2000, step: 25 },
};

export const DEFAULT_FOG_TIMING: FogTiming = fogTimingConfig;
export const DEFAULT_FOG_VARIANTS: FogVariant[] = fogVariantsConfig.variants;

export function isFogTiming(value: unknown): value is FogTiming {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (Object.keys(FOG_TIMING_RANGES) as (keyof FogTiming)[]).every((key) => {
    const field = record[key];
    const { min, max } = FOG_TIMING_RANGES[key];
    return typeof field === 'number' && Number.isFinite(field) && field >= min && field <= max;
  });
}

/** Keeps the fade inside the gif's pass, so the fog is gone before the loop restarts. */
export function clampFogTiming(timing: FogTiming, passMs: number): FogTiming {
  const fadeStartMs = Math.min(timing.fadeStartMs, passMs - FOG_TIMING_RANGES.fadeMs.min);
  const fadeMs = Math.min(timing.fadeMs, passMs - fadeStartMs);
  return { ...timing, fadeStartMs, fadeMs };
}

/**
 * Picks a variant for a tile from a stable seed, so the same tile always shows the same fog.
 * Multiplicative (Knuth) hashing spreads neighbouring seeds across all variants.
 */
export function toFogVariant(variants: FogVariant[], seed: number): FogVariant {
  const hash = Math.imul(Math.trunc(seed), 2654435761) >>> 0;
  return variants[hash % variants.length];
}
