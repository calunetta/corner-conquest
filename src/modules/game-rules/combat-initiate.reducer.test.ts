import { PlayerColor, IslandType, MonsterName } from '@/lib/types';
import type { GameState } from '@/lib/types';
import { initializeGame, startGame, defaultGameSettings } from '@/modules/game-rules';
import { addPlayerToGame } from '@/lib/game-logic';
import { handleInitiateCombatAction } from './combat-initiate.reducer';

describe('handleInitiateCombatAction', () => {
  let game: GameState;

  beforeEach(() => {
    game = initializeGame(
      'game_test',
      'Combat Initiate Test',
      2,
      { playerId: 'p1', name: 'Attacker', color: PlayerColor.Blue },
      0,
      false,
      defaultGameSettings,
    );
    const added = addPlayerToGame(game, { playerId: 'p2', name: 'Defender' });
    game = added.newGameState!;
    game = startGame(game, 'Attacker');
  });

  it('sets a PvP combatState with phase rolling', () => {
    const attacker = game.players[0];
    const defender = game.players[1];

    const nextState = handleInitiateCombatAction(game, {
      attackingArmyId: attacker.armies[0].id,
      target: { type: 'player', defenderId: defender.id, defendingArmyId: defender.armies[0].id },
    });

    expect(nextState.combatState).toEqual({
      attackerId: attacker.id,
      attackingArmyId: attacker.armies[0].id,
      defenderId: defender.id,
      defendingArmyId: defender.armies[0].id,
      attackerRolls: [],
      defenderRolls: [],
      winnerId: null,
      phase: 'rolling',
    });
    expect(nextState.monsterCombatState).toBeNull();
  });

  it('sets a monsterCombatState with phase rolling when the target is a monster', () => {
    const attacker = game.players[0];
    const attackingArmy = attacker.armies[0];
    const currentTile = game.map[attackingArmy.position.y * game.settings.gridSize.cols + attackingArmy.position.x];
    currentTile.type = IslandType.Monster;
    currentTile.monsters = [{ name: MonsterName.Bear, level: 2, sprite: { idle: '', attack: '', death: '' } }];

    const nextState = handleInitiateCombatAction(game, {
      attackingArmyId: attackingArmy.id,
      target: { type: 'monster', monsterName: MonsterName.Bear },
    });

    expect(nextState.monsterCombatState?.monster.name).toBe(MonsterName.Bear);
    expect(nextState.monsterCombatState?.attackerId).toBe(attacker.id);
    expect(nextState.monsterCombatState?.phase).toBe('rolling');
    expect(nextState.combatState).toBeNull();
  });

  it('throws when the attacking army id does not exist', () => {
    const defender = game.players[1];
    expect(() =>
      handleInitiateCombatAction(game, {
        attackingArmyId: 9999,
        target: { type: 'player', defenderId: defender.id, defendingArmyId: defender.armies[0].id },
      }),
    ).toThrow('Attacking army not found.');
  });

  it('throws when the army already acted and has no extra move', () => {
    const attacker = game.players[0];
    const defender = game.players[1];
    attacker.armies[0].hasActed = true;
    attacker.hasExtraMove = false;

    expect(() =>
      handleInitiateCombatAction(game, {
        attackingArmyId: attacker.armies[0].id,
        target: { type: 'player', defenderId: defender.id, defendingArmyId: defender.armies[0].id },
      }),
    ).toThrow('This army has already acted this turn.');
  });

  it('allows an already-acted army to initiate combat when the player has an extra move', () => {
    const attacker = game.players[0];
    const defender = game.players[1];
    attacker.armies[0].hasActed = true;
    attacker.hasExtraMove = true;

    const nextState = handleInitiateCombatAction(game, {
      attackingArmyId: attacker.armies[0].id,
      target: { type: 'player', defenderId: defender.id, defendingArmyId: defender.armies[0].id },
    });

    expect(nextState.combatState?.phase).toBe('rolling');
  });

  it('throws when the target monster is not on the tile', () => {
    const attacker = game.players[0];
    const attackingArmy = attacker.armies[0];
    const currentTile = game.map[attackingArmy.position.y * game.settings.gridSize.cols + attackingArmy.position.x];
    currentTile.type = IslandType.Monster;
    currentTile.monsters = [{ name: MonsterName.Bear, level: 2, sprite: { idle: '', attack: '', death: '' } }];

    expect(() =>
      handleInitiateCombatAction(game, {
        attackingArmyId: attackingArmy.id,
        target: { type: 'monster', monsterName: MonsterName.Ogre },
      }),
    ).toThrow('Target monster not found on tile.');
  });

  it('throws when the tile has no monsters at all', () => {
    const attacker = game.players[0];
    const attackingArmy = attacker.armies[0];
    const currentTile = game.map[attackingArmy.position.y * game.settings.gridSize.cols + attackingArmy.position.x];
    currentTile.monsters = undefined;

    expect(() =>
      handleInitiateCombatAction(game, {
        attackingArmyId: attackingArmy.id,
        target: { type: 'monster', monsterName: MonsterName.Bear },
      }),
    ).toThrow('Target monster not found on tile.');
  });
});
