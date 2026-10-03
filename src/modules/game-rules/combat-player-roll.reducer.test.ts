import { PlayerColor, CardName, GameAction } from '@/lib/types';
import type { GameState } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from '@/modules/game-rules';
import { addPlayerToGame } from '@/lib/game-logic';
import { handleInitiateCombatAction } from './combat-initiate.reducer';
import { handleCombatRoll } from './combat-player-roll.reducer';

describe('handleCombatRoll', () => {
  let game: GameState;

  beforeEach(() => {
    game = initializeGame(
      'game_test',
      'Combat Roll Test',
      2,
      { playerId: 'p1', name: 'Attacker', color: PlayerColor.Blue },
      0,
      false,
      defaultGameSettings,
    );
    const added = addPlayerToGame(game, { playerId: 'p2', name: 'Defender' });
    game = added.newGameState!;
    game = startGame(game, 'Attacker');

    const attacker = game.players[0];
    const defender = game.players[1];
    game = handleInitiateCombatAction(game, {
      attackingArmyId: attacker.armies[0].id,
      target: { type: 'player', defenderId: defender.id, defendingArmyId: defender.armies[0].id },
    });
  });

  it('returns the state unchanged when there is no combatState (boundary: no combat in progress)', () => {
    const freshState = initializeGame(
      'game_test2',
      'No Combat',
      1,
      { playerId: 'p1', name: 'Solo', color: PlayerColor.Blue },
      0,
      false,
      defaultGameSettings,
    );
    const result = handleCombatRoll(freshState, { useWarChief: false, useOvercome: false });
    expect(result).toBe(freshState);
  });

  it('returns the state unchanged when the defender id does not resolve to a player (invalid input)', () => {
    game.combatState!.defenderId = 9999;
    const result = handleCombatRoll(game, { useWarChief: false, useOvercome: false });
    expect(result).toBe(game);
    expect(result.combatState?.phase).toBe('rolling');
  });

  it('returns the state unchanged when the attacking army id does not resolve to an army (invalid input)', () => {
    game.combatState!.attackingArmyId = 9999;
    const result = handleCombatRoll(game, { useWarChief: false, useOvercome: false });
    expect(result).toBe(game);
    expect(result.combatState?.phase).toBe('rolling');
  });

  it('rolls produce non-empty arrays, a winnerId, and move the phase to results', () => {
    const nextState = handleCombatRoll(game, { useWarChief: false, useOvercome: false });

    expect(nextState.combatState?.attackerRolls.length).toBeGreaterThan(0);
    expect(nextState.combatState?.defenderRolls.length).toBeGreaterThan(0);
    expect(nextState.combatState?.phase).toBe('results');
    expect(nextState.combatState?.winnerId).not.toBeNull();
  });

  it('accepts a plain boolean payload as the useWarChief flag (legacy call shape)', () => {
    const attacker = game.players[0];
    attacker.specialCards = [CardName.WarChief];

    const nextState = handleCombatRoll(game, true);

    // attacker.attackPower is 0, so without War Chief there'd be exactly 1 roll; +2 bonus power -> 3.
    expect(nextState.combatState?.attackerRolls).toHaveLength(3);
    expect(nextState.players[0].specialCards).not.toContain(CardName.WarChief);
  });

  it("Overcome card auto-wins the battle and discards the card", () => {
    const attacker = game.players[0];
    attacker.specialCards = [CardName.Overcome];

    const nextState = handleCombatRoll(game, { useOvercome: true });

    expect(nextState.combatState?.attackerRolls).toEqual([6, 6]);
    expect(nextState.combatState?.defenderRolls).toEqual([1]);
    expect(nextState.combatState?.winnerId).toBe(attacker.id);
    expect(nextState.combatState?.phase).toBe('results');
    expect(nextState.players[0].specialCards).not.toContain(CardName.Overcome);
    expect(nextState.discardPile).toContain(CardName.Overcome);
  });

  it('War Chief adds +2 power (one extra die) and discards the card', () => {
    const attacker = game.players[0];
    attacker.specialCards = [CardName.WarChief];

    const nextState = handleCombatRoll(game, { useWarChief: true });

    // attackPower 0 + 1 + 2 bonus = 3 dice, vs. 1 without the card.
    expect(nextState.combatState?.attackerRolls).toHaveLength(3);
    expect(nextState.players[0].specialCards).not.toContain(CardName.WarChief);
    expect(nextState.discardPile).toContain(CardName.WarChief);
  });

  it('a second card cannot be used the same turn (actionsThisTurn already has UseCard)', () => {
    const attacker = game.players[0];
    attacker.specialCards = [CardName.Overcome];
    attacker.actionsThisTurn = [GameAction.UseCard];

    const nextState = handleCombatRoll(game, { useOvercome: true });

    // Overcome was blocked, so the normal 1-die roll happened instead of the [6,6] auto-win.
    expect(nextState.combatState?.attackerRolls).toHaveLength(1);
    expect(nextState.players[0].specialCards).toContain(CardName.Overcome);
    expect(nextState.discardPile).not.toContain(CardName.Overcome);
  });

  it('consumes the extra move and logs it when the attacker has one', () => {
    const attacker = game.players[0];
    attacker.hasExtraMove = true;

    const nextState = handleCombatRoll(game, {});

    expect(nextState.players[0].hasExtraMove).toBe(false);
    expect(nextState.log).toContain(`${attacker.name} used their Extra Move in battle.`);
  });
});
