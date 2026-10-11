import { initializeGame, startGame, defaultGameSettings } from '../../src/modules/game-rules';
import { PlayerColor, GameStatus } from '../../src/lib/types';
import type { GameState } from '../../src/lib/types';
import type { takeBotTurn as TakeBotTurn } from '../../src/modules/game-rules';
import { silenceConsoleAndCaptureAnomalies } from './anomaly-capture';
import { parseLogLine, type LogEvent } from './log-parsers';
import { createFirestoreCapture, snapshotSeat, toFinalState } from './match-snapshot';
import { deriveSeed, withSeededRandom } from './rng';

const SEAT_COLORS = [PlayerColor.Blue, PlayerColor.Red, PlayerColor.Purple, PlayerColor.Yellow];

export interface MatchConfig {
  players: number;
  fog: boolean;
  /** Per-match seed, e.g. `deriveSeed([runSeed, players, fog, matchIndex, 'map'])`. */
  mapSeed: number;
  playSeed: number;
  maxRounds: number;
}

/** One console.warn/console.error call the dispatcher made during a single bot turn — its own
 *  "something unexpected happened" signal (game-rules.reducer.ts:133 and :136-140). */
export interface Anomaly {
  kind: 'unhandledAction' | 'reducerError';
  /** console args joined to one string; an Error argument contributes its .message. */
  message: string;
}

/** What one seat looked like right after its own turn — the raw material M6/M10 are built from. */
export interface TurnSnapshot {
  seat: number;
  round: number;
  events: LogEvent[];
  armyPositions: Array<{ x: number; y: number }>;
  hasArmyOffOwnBase: boolean;
  heldPositions: number; // count of this seat's resource-collection spots after the turn
  heldPositionsOnOwnBase: number;
  attackPower: number;
  anomalies: Anomaly[];
}

export interface SeatFinalState {
  victoryPoints: number;
  attackPower: number;
  armyCount: number;
  heldCards: string[]; // CardName values still in hand at game end
  hasProductiveInHand: boolean;
  hasHeldPositions: boolean;
}

export interface MatchResult {
  outcome: 'finished' | 'capped';
  rounds: number;
  botTurns: number;
  /** Set whenever (and only whenever) `outcome === 'finished'`; `null` for a capped match. */
  winnerSeat: number | null;
  turns: TurnSnapshot[];
  finalState: SeatFinalState[];
}

/**
 * Plays one complete bot-vs-bot match through the real reducers and `takeBotTurn`, with
 * `src/lib/firebase.ts` stubbed so no write ever reaches a real or local Firestore project.
 *
 * **Not safe to call concurrently** (e.g. via `Promise.all`) within one test file: `jest.doMock`
 * and `jest.resetModules` act on the whole file's shared module registry, so two in-flight calls
 * race each other's mock and can make one match read another's captured state. Always `await` one
 * `runMatch` before starting the next — `cli.ts`'s `runAll` already does this with a sequential
 * `for` loop, not `Promise.all`.
 */
export async function runMatch(config: MatchConfig): Promise<MatchResult> {
  const { stub, readCapturedState } = createFirestoreCapture();
  jest.resetModules();
  jest.doMock('../../src/lib/firebase', () => stub);
  jest.doMock('@/lib/firebase', () => stub);
  // Imported dynamically, after doMock, so bot-turn.service's `@/lib/firebase` resolves to the stub above.
  const { takeBotTurn: takeBotTurnWithStub }: { takeBotTurn: typeof TakeBotTurn } = await import(
    '../../src/modules/game-rules'
  );

  // Also records every warn/error call — the dispatcher's only two anomaly signals
  // (game-rules.reducer.ts:133 and :136-140) — into `recordedAnomalies`, drained once per bot turn
  // below. See anomaly-capture.ts for why console.* is silenced during the run at all.
  const { recordedAnomalies, restore: restoreConsole } = silenceConsoleAndCaptureAnomalies();

  try {
    let state: GameState = withSeededRandom(config.mapSeed, () => {
      const host = { playerId: 'bot_0', name: 'Bot 0', color: SEAT_COLORS[0] };
      const settings = { ...defaultGameSettings, fogOfWar: config.fog };
      const initialized = initializeGame('sim_match', 'Balance Simulation', 1, host, config.players - 1, false, settings);
      initialized.players.forEach((player, seat) => {
        player.isBot = true;
        player.name = `Bot ${seat}`;
      });
      return startGame(initialized, 'Bot 0');
    });

    const turns: TurnSnapshot[] = [];
    let botTurns = 0;

    await withSeededRandom(config.playSeed, async () => {
      while (state.status === GameStatus.Playing && state.turn <= config.maxRounds) {
        const actingSeat = state.currentPlayerIndex;
        const round = state.turn;
        const logLengthBeforeTurn = state.log.length;
        recordedAnomalies.length = 0;

        await takeBotTurnWithStub(state);
        const nextState = readCapturedState();
        if (!nextState) throw new Error(`takeBotTurn for seat ${actingSeat} never wrote a state (setDoc not called).`);

        const newLogLines = nextState.log
          .slice(logLengthBeforeTurn)
          .map((entry) => (typeof entry === 'string' ? entry : entry.message));
        const events = newLogLines.flatMap((line) => parseLogLine(line));

        turns.push(snapshotSeat(actingSeat, round, events, nextState, [...recordedAnomalies]));
        botTurns += 1;
        state = nextState;
      }
    });

    const finished = state.status === GameStatus.Finished;
    return {
      outcome: finished ? 'finished' : 'capped',
      rounds: state.turn,
      botTurns,
      winnerSeat: finished && state.winner ? state.winner.id : null,
      turns,
      finalState: state.players.map(toFinalState),
    };
  } finally {
    restoreConsole();
    jest.dontMock('../../src/lib/firebase');
    jest.dontMock('@/lib/firebase');
  }
}

/** Builds the two independent seeds for match `index` of a (players, fog) config, per the Final spec. */
export function deriveMatchSeeds(runSeed: number, players: number, fog: boolean, index: number) {
  const fogLabel = fog ? 'on' : 'off';
  return {
    mapSeed: deriveSeed([runSeed, players, fogLabel, index, 'map']),
    playSeed: deriveSeed([runSeed, players, fogLabel, index, 'play']),
  };
}
