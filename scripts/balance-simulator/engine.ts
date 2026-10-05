import { initializeGame, startGame, defaultGameSettings } from '../../src/modules/game-rules';
import { PlayerColor, GameStatus } from '../../src/lib/types';
import type { GameState, Player } from '../../src/lib/types';
import type { takeBotTurn as TakeBotTurn } from '../../src/modules/game-rules';
import { parseLogLine, type LogEvent } from './log-parsers';
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

/** `src/modules/game-rules/services/bot-turn.service.ts`'s `setDoc` is the only way to read the
 *  state it produces each turn: it deep-clones its argument internally and never mutates it
 *  (see plan.md's "Verified context"). */
function createFirestoreCapture() {
  let lastWrittenState: GameState | null = null;
  const stub = {
    db: {},
    doc: () => ({}),
    setDoc: async (_ref: unknown, state: GameState) => {
      lastWrittenState = state;
    },
    updateDoc: async () => {},
    // Only `handlePlayerExit` (src/lib/actions/player.ts:272) uses this, and bot turns never call
    // it. A clear failure here is better than the simulator silently producing a wrong state.
    runTransaction: async () => {
      throw new Error('Unexpected runTransaction call: handlePlayerExit should be unreachable from takeBotTurn.');
    },
  };
  return { stub, readCapturedState: () => lastWrittenState };
}

function isOwnBase(seat: number, position: { x: number; y: number }, state: GameState): boolean {
  const base = state.baseTiles.find((b) => b.owner === seat);
  return base !== undefined && base.x === position.x && base.y === position.y;
}

function snapshotSeat(seat: number, round: number, events: LogEvent[], state: GameState): TurnSnapshot {
  const player = state.players.find((p) => p.id === seat) as Player;
  const armyPositions = player.armies.map((army) => ({ x: army.position.x, y: army.position.y }));
  const heldPositionsOnOwnBase = player.positions.filter((position) => isOwnBase(seat, position, state)).length;

  return {
    seat,
    round,
    events,
    armyPositions,
    hasArmyOffOwnBase: armyPositions.some((position) => !isOwnBase(seat, position, state)),
    heldPositions: player.positions.length,
    heldPositionsOnOwnBase,
    attackPower: player.attackPower,
  };
}

function toFinalState(player: Player): SeatFinalState {
  return {
    victoryPoints: player.victoryPoints,
    attackPower: player.attackPower,
    armyCount: player.armies.length,
    heldCards: [...player.specialCards],
    hasProductiveInHand: player.specialCards.includes('Productive'),
    hasHeldPositions: player.positions.length > 0,
  };
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

  // Per the Final spec, silence every console.* during the run — the reducers log a caught
  // error instead of throwing
  // (src/lib/actions/index.ts:94), which happens on real, confirmed bot-logic bugs (see
  // docs/ai/tasks/2026-10-02-bot-balance-simulator/progress.md) and would otherwise spam a run's
  // output without being a simulator problem.
  const silencedMethods = (['log', 'warn', 'error'] as const).map((method) =>
    jest.spyOn(console, method).mockImplementation(() => {}),
  );

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

        await takeBotTurnWithStub(state);
        const nextState = readCapturedState();
        if (!nextState) throw new Error(`takeBotTurn for seat ${actingSeat} never wrote a state (setDoc not called).`);

        const newLogLines = nextState.log
          .slice(logLengthBeforeTurn)
          .map((entry) => (typeof entry === 'string' ? entry : entry.message));
        const events = newLogLines.flatMap((line) => parseLogLine(line));

        turns.push(snapshotSeat(actingSeat, round, events, nextState));
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
    silencedMethods.forEach((spy) => spy.mockRestore());
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
