import { PlayerColor, IslandType, MonsterName, CardName, GameAction } from '@/lib/types';
import type { GameState, Monster } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from '@/modules/game-rules';
import { handleInitiateCombatAction } from './combat-initiate.reducer';
import { handleMonsterCombatRoll } from './combat-monster-roll.reducer';

function buildGame(): GameState {
  return startGame(
    initializeGame(
      'game_test',
      'Monster Roll Test',
      1,
      { playerId: 'p1', name: 'Attacker', color: PlayerColor.Blue },
      0,
      false,
      defaultGameSettings,
    ),
    'Attacker',
  );
}

function placeMonsterOnArmyTile(game: GameState, monster: Monster) {
  const attacker = game.players[0];
  const attackingArmy = attacker.armies[0];
  const tile = game.map[attackingArmy.position.y * game.settings.gridSize.cols + attackingArmy.position.x];
  tile.type = IslandType.Monster;
  tile.monsters = [monster];
  return { attacker, attackingArmy, tile };
}

describe('handleMonsterCombatRoll', () => {
  let game: GameState;
  let monster: Monster;

  beforeEach(() => {
    game = buildGame();
    monster = { name: MonsterName.Bear, level: 2, sprite: { idle: '', attack: '', death: '' } };
    const { attackingArmy } = placeMonsterOnArmyTile(game, monster);
    game = handleInitiateCombatAction(game, {
      attackingArmyId: attackingArmy.id,
      target: { type: 'monster', monsterName: monster.name },
    });
  });

  it('returns the state unchanged when there is no monsterCombatState (boundary: no combat in progress)', () => {
    const freshState = buildGame();
    const result = handleMonsterCombatRoll(freshState, {
      monster,
      useDecideCard: false,
      decidedValue: 0,
      useOvercomeCard: false,
      useWarChief: false,
    });
    expect(result).toBe(freshState);
  });

  it('returns the state unchanged when no army is positioned at the recorded attacker position (invalid input)', () => {
    game.monsterCombatState!.attackerPosition = { x: 9999, y: 9999 };
    const result = handleMonsterCombatRoll(game, {
      monster,
      useDecideCard: false,
      decidedValue: 0,
      useOvercomeCard: false,
      useWarChief: false,
    });
    expect(result).toBe(game);
  });

  it('resolves the monster combat roll: non-empty rolls on both sides, phase becomes results', () => {
    const nextState = handleMonsterCombatRoll(game, {
      monster,
      useWarChief: false,
      useOvercomeCard: false,
      useDecideCard: false,
      decidedValue: 0,
    });

    expect(nextState.monsterCombatState?.attackerRolls.length).toBeGreaterThan(0);
    expect(nextState.monsterCombatState?.monsterRolls.length).toBeGreaterThan(0);
    expect(nextState.monsterCombatState?.phase).toBe('results');
  });

  it('Overcome card wins unconditionally and discards the card', () => {
    const attacker = game.players[0];
    attacker.specialCards = [CardName.Overcome];

    const nextState = handleMonsterCombatRoll(game, {
      monster,
      useWarChief: false,
      useOvercomeCard: true,
      useDecideCard: false,
      decidedValue: 0,
    });

    expect(nextState.monsterCombatState?.winnerId).toBe(attacker.id);
    expect(nextState.monsterCombatState?.phase).toBe('results');
    expect(nextState.players[0].specialCards).not.toContain(CardName.Overcome);
    expect(nextState.discardPile).toContain(CardName.Overcome);
    expect(nextState.players[0].actionsThisTurn).toContain(GameAction.UseCard);
  });

  it('throws when Overcome is requested but not held', () => {
    const attacker = game.players[0];
    attacker.specialCards = [];

    expect(() =>
      handleMonsterCombatRoll(game, {
        monster,
        useWarChief: false,
        useOvercomeCard: true,
        useDecideCard: false,
        decidedValue: 0,
      }),
    ).toThrow('Overcome card not found, but was attempted to be used.');
  });

  describe('Decide Dice Roll card clamps decidedValue into [1, 6]', () => {
    it.each([
      ['above range clamps to 6', 50, 6],
      ['below range clamps to 1', -5, 1],
      ['zero is falsy and defaults to 6', 0, 6],
      ['in-range value passes through', 4, 4],
    ])('%s', (_label, decidedValue, expected) => {
      const attacker = game.players[0];
      attacker.specialCards = [CardName.DecideDiceRoll];

      const nextState = handleMonsterCombatRoll(game, {
        monster,
        useWarChief: false,
        useOvercomeCard: false,
        useDecideCard: true,
        decidedValue,
      });

      expect(nextState.monsterCombatState?.attackerRolls[0]).toBe(expected);
      expect(nextState.players[0].specialCards).not.toContain(CardName.DecideDiceRoll);
    });
  });

  it('War Chief adds +2 to combat score and discards the card', () => {
    const attacker = game.players[0];
    attacker.specialCards = [CardName.WarChief];

    const nextState = handleMonsterCombatRoll(game, {
      monster,
      useWarChief: true,
      useOvercomeCard: false,
      useDecideCard: false,
      decidedValue: 0,
    });

    // attackPower 0 + 1 = 1 die roll. War Chief adds flat +2 to the score.
    expect(nextState.monsterCombatState?.attackerRolls).toHaveLength(1);
    const attackerScore = nextState.monsterCombatState!.attackerRolls.reduce((a, b) => a + b, 0) + 2;
    const monsterScore = nextState.monsterCombatState!.monsterRolls.reduce((a, b) => a + b, 0);
    expect(nextState.monsterCombatState?.winnerId).toBe(attackerScore > monsterScore ? attacker.id : null);
    expect(nextState.players[0].specialCards).not.toContain(CardName.WarChief);
    expect(nextState.discardPile).toContain(CardName.WarChief);
  });

  it('War Chief blocks Decide Dice Roll (only one card can be used per action)', () => {
    const attacker = game.players[0];
    attacker.specialCards = [CardName.WarChief, CardName.DecideDiceRoll];

    const nextState = handleMonsterCombatRoll(game, {
      monster,
      useWarChief: true,
      useOvercomeCard: false,
      useDecideCard: true,
      decidedValue: 5,
    });

    // War Chief is used first (processingly), blocking Decide Dice Roll from being used.
    // So the roll should be a normal 1d roll (attackPower 0 + 1), and War Chief adds +2.
    expect(nextState.monsterCombatState?.attackerRolls).toHaveLength(1);
    const attackerScore = nextState.monsterCombatState!.attackerRolls[0] + 2; // Normal roll + War Chief bonus
    const monsterScore = nextState.monsterCombatState!.monsterRolls.reduce((a, b) => a + b, 0);
    expect(nextState.monsterCombatState?.winnerId).toBe(attackerScore > monsterScore ? attacker.id : null);
    expect(nextState.players[0].specialCards).toContain(CardName.DecideDiceRoll); // Decide not used
    expect(nextState.discardPile).toContain(CardName.WarChief); // War Chief was used
  });
  it('an unacted army that uses the extra move for its bonus attack stays unacted, so it keeps its normal action', () => {
    const attacker = game.players[0];
    attacker.hasExtraMove = true;
    expect(attacker.armies[0].hasActed).toBe(false);

    const nextState = handleMonsterCombatRoll(game, {
      monster,
      useDecideCard: false,
      decidedValue: 0,
      useOvercomeCard: false,
      useWarChief: false,
    });

    expect(nextState.players[0].hasExtraMove).toBe(false);
    expect(nextState.players[0].armies[0].hasActed).toBe(false);
  });

  it('an already-acted army that uses the extra move for its bonus attack stays acted', () => {
    const attacker = game.players[0];
    attacker.armies[0].hasActed = true;
    attacker.hasExtraMove = true;

    const nextState = handleMonsterCombatRoll(game, {
      monster,
      useDecideCard: false,
      decidedValue: 0,
      useOvercomeCard: false,
      useWarChief: false,
    });

    expect(nextState.players[0].hasExtraMove).toBe(false);
    expect(nextState.players[0].armies[0].hasActed).toBe(true);
  });

  it('an army attacking a monster without an extra move is marked acted by its roll', () => {
    const attacker = game.players[0];
    expect(attacker.hasExtraMove).toBe(false);
    expect(attacker.armies[0].hasActed).toBe(false);

    const nextState = handleMonsterCombatRoll(game, {
      monster,
      useDecideCard: false,
      decidedValue: 0,
      useOvercomeCard: false,
      useWarChief: false,
    });

    expect(nextState.players[0].armies[0].hasActed).toBe(true);
  });
});
