/**
 * Deterministic randomness for the balance simulator.
 *
 * The real game calls `Math.random()` directly (see `src/lib/game-initializer.ts` and
 * `src/lib/actions/attack.ts`), so the only way to make a simulated match reproducible is to
 * temporarily replace the global `Math.random` with a seeded generator, run the match, then
 * restore it. `withSeededRandom` does exactly that and nothing else.
 */

/** FNV-1a: a small, fast, well-distributed string hash. Good enough to seed a PRNG, not for security. */
function hashToUint32(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Combines the run seed with everything that should make two streams independent. */
export function deriveSeed(parts: ReadonlyArray<string | number>): number {
  return hashToUint32(parts.join(':'));
}

/** Mulberry32: a tiny, fast PRNG with good-enough statistical quality for simulation, not crypto. */
function createMulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Runs `run` with `Math.random` replaced by a seeded generator, then always restores it. */
export function withSeededRandom<T>(seed: number, run: () => T): T {
  const originalRandom = Math.random;
  Math.random = createMulberry32(seed);
  try {
    return run();
  } finally {
    Math.random = originalRandom;
  }
}
