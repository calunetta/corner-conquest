/**
 * Win probability of a dice-sum combat, used by bots to judge a fight before committing to it.
 * Mirrors the game's roll rules: each side rolls its dice and sums them, and the attacker wins only
 * on a strictly higher total. A tie goes to the defender (PvP) or the monster, so it is not counted.
 */

/** Probability distribution of the sum of `diceCount` six-sided dice, indexed by the sum. */
function sumDistribution(diceCount: number): number[] {
  let distribution = [1];
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

/** P(attacker total > defender total), summing over each attacker total and the defender totals below it. */
function probabilityStrictlyGreater(attacker: number[], defender: number[]): number {
  let probability = 0;
  for (let attackerSum = 0; attackerSum < attacker.length; attackerSum += 1) {
    for (let defenderSum = 0; defenderSum < attackerSum; defenderSum += 1) {
      probability += attacker[attackerSum] * (defender[defenderSum] ?? 0);
    }
  }
  return probability;
}

/** Attacker's win probability given the dice each side rolls. */
export function attackerWinProbability(attackerDice: number, defenderDice: number): number {
  return probabilityStrictlyGreater(sumDistribution(attackerDice), sumDistribution(defenderDice));
}
