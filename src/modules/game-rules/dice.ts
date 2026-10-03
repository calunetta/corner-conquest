const DIE_FACES = 6;

/** Rolls `count` six-sided dice (minimum 1 die). Shared by every combat reducer. */
export function rollDice(count: number): number[] {
  return Array.from({ length: Math.max(1, count) }, () => Math.floor(Math.random() * DIE_FACES) + 1);
}
