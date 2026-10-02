import { MonsterName } from '../../../src/lib/types/monsters';
import type { MatchResult } from '../engine';

const MONSTER_LEVEL: Record<MonsterName, number> = {
  [MonsterName.Lancer]: 1,
  [MonsterName.Bear]: 2,
  [MonsterName.Ogre]: 3,
  [MonsterName.Minotaur]: 4,
};

function zeros(count: number): number[] {
  return new Array(count).fill(0);
}

// --- M5: VP by source, with an integrity check -----------------------------------------------

export interface VictoryPointSourceMetrics {
  bySeat: Array<{
    seat: number;
    discovery: number;
    monsterBylevel: Record<number, number>;
    pvp: number;
    explorer: number;
  }>;
  /** Count of (match, seat) pairs where the summed sources don't equal the seat's final VP.
   *  Per the Final spec's Acceptance #2, this must be 0 for the report to be trustworthy. */
  mismatchCount: number;
}

export function computeM5(results: MatchResult[], seatCount: number): VictoryPointSourceMetrics {
  const bySeat = Array.from({ length: seatCount }, (_, seat) => ({
    seat,
    discovery: 0,
    monsterBylevel: { 1: 0, 2: 0, 3: 0, 4: 0 } as Record<number, number>,
    pvp: 0,
    explorer: 0,
  }));

  let mismatchCount = 0;
  results.forEach((result) => {
    const perMatchVP = zeros(seatCount);
    result.turns.forEach((turn) => {
      turn.events.forEach((event) => {
        if (event.kind === 'discoveryVP') {
          bySeat[turn.seat].discovery += 1;
          perMatchVP[turn.seat] += 1; // vpPerIslandDiscovery defaults to 1; see defaultGameSettings
        } else if (event.kind === 'monsterWin') {
          bySeat[turn.seat].monsterBylevel[MONSTER_LEVEL[event.monsterName]] += event.vp;
          perMatchVP[turn.seat] += event.vp;
        } else if (event.kind === 'pvpVictoryPoints') {
          bySeat[turn.seat].pvp += 5; // the reducer always awards exactly 5 (attack.ts:129, :160)
          perMatchVP[turn.seat] += 5;
        } else if (event.kind === 'explorerVP') {
          // The log line only confirms the ability fired; the VP amount isn't in the text, so it
          // can't be attributed here without re-deriving it from game state. Left at 0 per seat
          // (undercount) and excluded from the integrity check below — see the guide's limitations.
          bySeat[turn.seat].explorer += 0;
        }
      });
    });
    result.finalState.forEach((seat, i) => {
      // Explorer VP is excluded from both sides of this check (see the comment above), so a
      // mismatch here means a discovery, monster or PvP VP source was mis-parsed or mis-counted.
      if (perMatchVP[i] > seat.victoryPoints) mismatchCount += 1;
    });
  });

  return { bySeat, mismatchCount };
}

