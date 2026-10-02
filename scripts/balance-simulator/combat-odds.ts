/**
 * Expected win probability for the game's dice-based combat (`src/lib/actions/attack.ts`): each
 * side rolls N six-sided dice and sums them; the higher total wins; a tie goes to the side the
 * game favors (the defender in PvP, the monster in monster combat — see `docs/README.md` §6.4).
 */

/** Probability distribution of the sum of `diceCount` six-sided dice, as `sumProbabilities[sum]`. */
function sumDistribution(diceCount: number): number[] {
  let distribution = [1]; // P(sum = 0) = 1 for zero dice
  for (let die = 0; die < diceCount; die += 1) {
    const next = new Array(distribution.length + 6).fill(0);
    for (let sum = 0; sum < distribution.length; sum += 1) {
      for (let face = 1; face <= 6; face += 1) {
        next[sum + face] += distribution[sum] / 6;
      }
    }
    distribution = next;
  }
  return distribution;
}

const distributionCache = new Map<number, number[]>();

function cachedSumDistribution(diceCount: number): number[] {
  const cached = distributionCache.get(diceCount);
  if (cached) return cached;
  const computed = sumDistribution(Math.max(0, diceCount));
  distributionCache.set(diceCount, computed);
  return computed;
}

/** P(attackerDice total > defenderDice total). Does not include the tie-break: the caller adds
 *  P(tie) to whichever side wins ties for its matchup. */
function probabilityStrictlyGreater(a: number[], b: number[]): number {
  let probability = 0;
  for (let aSum = 0; aSum < a.length; aSum += 1) {
    if (a[aSum] === 0) continue;
    for (let bSum = 0; bSum < aSum; bSum += 1) {
      probability += a[aSum] * (b[bSum] ?? 0);
    }
  }
  return probability;
}

function probabilityTie(a: number[], b: number[]): number {
  let probability = 0;
  const length = Math.min(a.length, b.length);
  for (let sum = 0; sum < length; sum += 1) {
    probability += a[sum] * b[sum];
  }
  return probability;
}

/** Attacker's win probability when ties go to the monster (monster combat; `attack.ts:263`). */
export function attackerWinProbabilityVsMonster(attackerDice: number, monsterDice: number): number {
  const attacker = cachedSumDistribution(attackerDice);
  const monster = cachedSumDistribution(monsterDice);
  return probabilityStrictlyGreater(attacker, monster);
}

/** Attacker's win probability when ties go to the defender (PvP combat; `attack.ts:100`). */
export function attackerWinProbabilityVsPlayer(attackerDice: number, defenderDice: number): number {
  const attacker = cachedSumDistribution(attackerDice);
  const defender = cachedSumDistribution(defenderDice);
  return probabilityStrictlyGreater(attacker, defender);
}

/** Exposed for tests: P(tie), to cross-check that win + loss + tie-to-one-side sums to 1. */
export function tieProbability(diceA: number, diceB: number): number {
  return probabilityTie(cachedSumDistribution(diceA), cachedSumDistribution(diceB));
}
