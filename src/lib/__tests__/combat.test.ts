import { 
  handleInitiateCombatAction, 
  handleCombatRoll, 
  handleMonsterCombatRoll, 
  handleCloseCombat, 
  handleCloseMonsterCombat 
} from '../actions/attack';
import { initializeGame, startGame, defaultGameSettings } from '../game-initializer';
import { addPlayerToGame } from '../game-logic';
import { PlayerColor, IslandType, MonsterName } from '../types';

describe('Combat System', () => {
  let game = initializeGame('game_test', 'Combat Test', 2, { playerId: 'p1', name: 'Attacker', color: PlayerColor.Blue }, 0, false, defaultGameSettings);

  beforeEach(() => {
    game = initializeGame('game_test', 'Combat Test', 2, { playerId: 'p1', name: 'Attacker', color: PlayerColor.Blue }, 0, false, defaultGameSettings);
    const added = addPlayerToGame(game, { playerId: 'p2', name: 'Defender' });
    game = added.newGameState!;
    game = startGame(game, 'Attacker');
  });

  describe('PvP Combat', () => {
    it('initiates player combat state correctly', () => {
      const attacker = game.players[0];
      const defender = game.players[1];
      const attackingArmy = attacker.armies[0];
      const defendingArmy = defender.armies[0];

      const nextState = handleInitiateCombatAction(game, {
        attackingArmyId: attackingArmy.id,
        target: { type: 'player', defenderId: defender.id, defendingArmyId: defendingArmy.id }
      });

      expect(nextState.combatState).toBeDefined();
      expect(nextState.combatState?.attackerId).toBe(attacker.id);
      expect(nextState.combatState?.defenderId).toBe(defender.id);
      expect(nextState.combatState?.phase).toBe('rolling');
    });

    it('resolves rolls and calculates winner in combat roll', () => {
      const attacker = game.players[0];
      const defender = game.players[1];
      
      handleInitiateCombatAction(game, {
        attackingArmyId: attacker.armies[0].id,
        target: { type: 'player', defenderId: defender.id, defendingArmyId: defender.armies[0].id }
      });

      const nextState = handleCombatRoll(game, { useWarChief: false, useOvercome: false });

      expect(nextState.combatState?.attackerRolls.length).toBeGreaterThan(0);
      expect(nextState.combatState?.defenderRolls.length).toBeGreaterThan(0);
      expect(nextState.combatState?.phase).toBe('results');
      expect(nextState.combatState?.winnerId).not.toBeNull();
    });
  });

  describe('Monster Combat', () => {
    it('initiates monster combat state on monster island', () => {
      const attacker = game.players[0];
      const attackingArmy = attacker.armies[0];
      
      // Place a monster on the army's tile
      const currentTile = game.map[attackingArmy.position.y * game.settings.gridSize.cols + attackingArmy.position.x];
      currentTile.type = IslandType.Monster;
      currentTile.monsters = [{
        name: MonsterName.Bear,
        level: 2,
        sprite: { idle: '', attack: '', death: '' }
      }];

      const nextState = handleInitiateCombatAction(game, {
        attackingArmyId: attackingArmy.id,
        target: { type: 'monster', monsterName: MonsterName.Bear }
      });

      expect(nextState.monsterCombatState).toBeDefined();
      expect(nextState.monsterCombatState?.monster.name).toBe(MonsterName.Bear);
      expect(nextState.monsterCombatState?.phase).toBe('rolling');
    });

    it('resolves monster combat roll and determines outcome', () => {
      const attacker = game.players[0];
      const attackingArmy = attacker.armies[0];
      const currentTile = game.map[attackingArmy.position.y * game.settings.gridSize.cols + attackingArmy.position.x];
      currentTile.type = IslandType.Monster;
      const monster = {
        name: MonsterName.Bear,
        level: 2,
        sprite: { idle: '', attack: '', death: '' }
      };
      currentTile.monsters = [monster];

      handleInitiateCombatAction(game, {
        attackingArmyId: attackingArmy.id,
        target: { type: 'monster', monsterName: MonsterName.Bear }
      });

      const nextState = handleMonsterCombatRoll(game, { 
        monster, 
        useWarChief: false, 
        useOvercomeCard: false, 
        useDecideCard: false, 
        decidedValue: 0 
      });

      expect(nextState.monsterCombatState?.attackerRolls.length).toBeGreaterThan(0);
      expect(nextState.monsterCombatState?.monsterRolls.length).toBeGreaterThan(0);
      expect(nextState.monsterCombatState?.phase).toBe('results');
    });
  });
});
