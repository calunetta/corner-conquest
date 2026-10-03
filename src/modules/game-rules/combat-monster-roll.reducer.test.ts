import { PlayerColor, IslandType, MonsterName, CardName, GameAction } from '@/lib/types';
import type { GameState, Monster } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from '@/lib/game-initializer';
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
});
