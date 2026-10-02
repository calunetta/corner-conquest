import type { MatchResult } from '../engine';
import { computeActivity, type ActivityMetrics } from './activity';
import { computeM10, type BotHealthMetrics } from './bot-health';
import { computeM9, type CombatMetrics } from './combat';
import { computeM8, type CardMetrics } from './cards';
import { computeM1, computeM2, type LengthMetrics, type OutcomeMetrics } from './outcomes';
import { computeM5, type VictoryPointSourceMetrics } from './victory-point-sources';
import { computeM3, computeM4, type VictoryPointMetrics, type WinMetrics } from './wins';

// --- Putting it together ------------------------------------------------------------------------

export interface ConfigMetrics {
  players: number;
  fog: boolean;
  m1: OutcomeMetrics;
  m2: LengthMetrics;
  m3: WinMetrics;
  m4: VictoryPointMetrics;
  m5: VictoryPointSourceMetrics;
  activity: ActivityMetrics; // the simplified M6+M7
  m8: CardMetrics;
  m9: CombatMetrics;
  m10: BotHealthMetrics;
  /** True when any M10 health flag fired; per the Final spec, M5-M7 flags are then suppressed
   *  in the report (the numbers are still shown) because a sick bot makes balance numbers noise. */
  gatedByBotHealth: boolean;
}

const M10_NEVER_LEFT_THRESHOLD = 10;
const M10_BASE_POSITIONS_THRESHOLD = 50;
const M10_TRAPPED_THRESHOLD = 10;

export function computeConfigMetrics(
  results: MatchResult[],
  players: number,
  fog: boolean,
  victoryPointGoal: number,
): ConfigMetrics {
  const m10 = computeM10(results, players);
  const gatedByBotHealth =
    m10.neverLeftBasePct > M10_NEVER_LEFT_THRESHOLD ||
    m10.basePositionsPct > M10_BASE_POSITIONS_THRESHOLD ||
    m10.trappedPct > M10_TRAPPED_THRESHOLD;

  return {
    players,
    fog,
    m1: computeM1(results),
    m2: computeM2(results),
    m3: computeM3(results, players),
    m4: computeM4(results, players, victoryPointGoal),
    m5: computeM5(results, players),
    activity: computeActivity(results, players),
    m8: computeM8(results),
    m9: computeM9(results),
    m10,
    gatedByBotHealth,
  };
}
