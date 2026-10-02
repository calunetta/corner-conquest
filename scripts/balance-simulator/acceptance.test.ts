import { CardName } from '../../src/lib/types/cards';
import { computeConfigMetrics } from './metrics/index';
import { deriveMatchSeeds, runMatch } from './engine';

/**
 * Encodes the Final spec's Acceptance #3 (Faithfulness) directly against real matches, not
 * synthetic fixtures: in an all-bot match, `src/lib/bot-logic.ts` only ever actively plays
 * Reinforce, Efficient, MasterBuilder and Wealthy (verified by reading the file — it calls
 * `GameAction.UseCard` for exactly those four), and Sabotage only targets `!p.isBot` players
 * (bot-logic.ts:70), so it can never fire when every seat is a bot. Every other card can only
 * enter a bot's hand through chance (a bought card or a Special island), never be played.
 */
describe('Acceptance #3: faithfulness (real matches, not fixtures)', () => {
  // Matches must run one at a time: runMatch shares jest.doMock state across calls within this
  // file, and Promise.all would make concurrent matches race each other's Firestore stub (found
  // by writing this exact test — see engine.ts's runMatch doc comment and progress.md).
  async function runMatchesSequentially(count: number) {
    const results = [];
    for (let i = 0; i < count; i += 1) {
      results.push(await runMatch({ players: 3, fog: true, maxRounds: 60, ...deriveMatchSeeds(1, 3, true, i) }));
    }
    return results;
  }

  const NEVER_CONSUMED_BY_BOTS: CardName[] = [
    CardName.Productive,
    CardName.Sabotage,
    CardName.Overcome,
    CardName.WarChief,
    CardName.DecideDiceRoll,
    CardName.ExtraMove,
    CardName.StealResource,
    CardName.Scout,
    CardName.Teleport,
  ];

  it('never consumes a card bot-logic.ts has no code path to play, across real matches', async () => {
    const results = await runMatchesSequentially(20);
    const metrics = computeConfigMetrics(results, 3, true, 30);

    NEVER_CONSUMED_BY_BOTS.forEach((cardName) => {
      expect(metrics.m8.byCard[cardName].consumed).toBe(0);
    });
  });

  it('never skips a turn to Sabotage in an all-bot match', async () => {
    const results = await runMatchesSequentially(20);

    const sabotageSkips = results
      .flatMap((r) => r.turns)
      .flatMap((t) => t.events)
      .filter((e) => e.kind === 'sabotageSkip').length;

    expect(sabotageSkips).toBe(0);
  });
});
