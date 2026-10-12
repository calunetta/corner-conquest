import { PlayerColor, GameAction, ResourceType } from '@/lib/types';
import type { GameState } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from './game-setup.reducer';
import { applyBotPurchases } from './bot-purchases.reducer';

/** A 1-human + 1-bot game, started, with the bot as the current player and 0 resources/flags
 *  reset so only the field a test sets can trigger a purchase branch. */
function buildBotTurnGame(): GameState {
  let game = initializeGame(
    'game_test',
    'Bot Purchases Test',
    1,
    { playerId: 'p1', name: 'Player 1', color: PlayerColor.Blue },
    1,
    false,
    defaultGameSettings,
  );
  game = startGame(game, 'Player 1');
  game.currentPlayerIndex = 1;
  return game;
}

describe('applyBotPurchases — Deploy pre-check', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Always restore, even if an assertion above throws — otherwise an un-restored spy from a
    // failing test leaks its call count into the next test's spy (jest.spyOn on an already-mocked
    // method returns the same mock instance rather than a fresh one).
    consoleErrorSpy.mockRestore();
  });

  // BUG 2 repro (plan.md Bug 2): bot-purchases.reducer.ts:30-32 computes deployCost from
  // efficientActive/reinforceActive with no canUseCard gate, so it still believes the discount
  // applies even after the bot already spent its one card-use action this turn. The pre-check
  // then wrongly thinks the bot can afford Deploy, dispatches it, and handleDeployAction (which
  // does gate on canUseCard) charges the full cost instead and throws "Not enough food.".
  it('does not propose Deploy when the bot already used its card this turn and the discount no longer applies', () => {
    const game = buildBotTurnGame();
    const bot = game.players[1];
    bot.nextArmyCost = 6; // defaultGameSettings.initialDeployCost
    bot.resources[ResourceType.Food] = 3; // affordable at the discounted (half) cost, not at full cost
    bot.efficientActive = true;
    bot.actionsThisTurn = [GameAction.UseCard]; // the bot already used its one card-use action this turn

    const finalState = applyBotPurchases(game);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(finalState.players[1].armies).toHaveLength(1); // no Deploy was attempted or applied
    expect(finalState.players[1].resources[ResourceType.Food]).toBe(3); // nothing was spent
  });

  // Regression guard: the legitimate case (no card used yet this turn) must keep working once the
  // canUseCard gate is added — the discount still applies and Deploy still succeeds.
  it('still deploys at the discounted cost when the bot has not used a card yet this turn', () => {
    const game = buildBotTurnGame();
    const bot = game.players[1];
    bot.nextArmyCost = 6;
    bot.resources[ResourceType.Food] = 3; // affordable only at the discounted (half) cost
    bot.efficientActive = true;
    bot.actionsThisTurn = [];

    const finalState = applyBotPurchases(game);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(finalState.players[1].armies).toHaveLength(2); // Deploy succeeded
    expect(finalState.players[1].resources[ResourceType.Food]).toBe(0); // full 3-food discounted cost spent
  });

  // Symmetric case for the reinforceActive branch (bot-purchases.reducer.ts:31): the canUseCard
  // gate must apply here too, not just to efficientActive.
  it('does not propose Deploy when the bot already used its card this turn and the free-deploy discount no longer applies', () => {
    const game = buildBotTurnGame();
    const bot = game.players[1];
    bot.nextArmyCost = 6;
    bot.resources[ResourceType.Food] = 3; // affordable at the free (reinforce) cost, not at full cost
    bot.reinforceActive = true;
    bot.actionsThisTurn = [GameAction.UseCard]; // the bot already used its one card-use action this turn

    const finalState = applyBotPurchases(game);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(finalState.players[1].armies).toHaveLength(1); // no Deploy was attempted or applied
    expect(finalState.players[1].resources[ResourceType.Food]).toBe(3); // nothing was spent
  });

  // Regression guard, symmetric to the efficientActive case above: the legitimate reinforceActive
  // case (no card used yet this turn) must keep working — the free deploy still succeeds.
  it('still deploys for free when reinforceActive and the bot has not used a card yet this turn', () => {
    const game = buildBotTurnGame();
    const bot = game.players[1];
    bot.nextArmyCost = 6;
    bot.resources[ResourceType.Food] = 0; // only affordable because Reinforce makes it free
    bot.reinforceActive = true;
    bot.actionsThisTurn = [];

    const finalState = applyBotPurchases(game);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(finalState.players[1].armies).toHaveLength(2); // Deploy succeeded
    expect(finalState.players[1].resources[ResourceType.Food]).toBe(0); // nothing was spent, deploy was free
  });

  // Precedence (plan.md's Decisions section, the stated reason for reordering the ternary):
  // when both reinforceActive and efficientActive are true at once (possible — card-effects.reducer.ts
  // doesn't push GameAction.UseCard for immediate-effect cards), Reinforce must win, giving a free
  // deploy, not Efficient's half-cost. With 0 food, only the free (Reinforce) branch is affordable.
  it('resolves deployCost via Reinforce (free), not Efficient (half-cost), when both discount flags are active', () => {
    const game = buildBotTurnGame();
    const bot = game.players[1];
    bot.nextArmyCost = 6;
    bot.resources[ResourceType.Food] = 0; // affordable only if Reinforce (free) wins, not Efficient (half-cost: 3)
    bot.reinforceActive = true;
    bot.efficientActive = true;
    bot.actionsThisTurn = [];

    const finalState = applyBotPurchases(game);

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(finalState.players[1].armies).toHaveLength(2); // Deploy succeeded at the free (Reinforce) cost
    expect(finalState.players[1].resources[ResourceType.Food]).toBe(0); // nothing was spent
  });
});
