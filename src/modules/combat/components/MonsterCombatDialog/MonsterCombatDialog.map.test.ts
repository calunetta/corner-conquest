import { toMonsterCombatViewModel } from './MonsterCombatDialog.map';
import {
  attackScreenNoCards,
  attackScreenAllCards,
  resultsPlayerWins,
  resultsMonsterWins,
  spectatorWaiting,
} from './MonsterCombatDialog.fixtures';
import type { GameState, PlayerColor } from '@/lib/types';
import { GameAction } from '@/lib/types';

describe('toMonsterCombatViewModel', () => {
  describe('null handling', () => {
    it('returns null when no monsterCombatState', () => {
      const gameState: GameState = {
        id: 'test',
        name: 'Test',
        status: 'playing',
        players: [
          {
            id: 0,
            playerId: 'p0',
            name: 'Alice',
            color: 'blue' as PlayerColor,
            isBot: false,
            armies: [],
            resources: { wheat: 0, iron: 0, gems: 0 },
            armyCount: 1,
            attackPower: 0,
            nextArmyCost: 6,
            victoryPoints: 0,
            specialCards: [],
            positions: [],
            hasExtraMove: false,
            actionsThisTurn: [],
            passiveAbilities: {},
            isSabotaged: false,
            reinforceActive: false,
            efficientActive: false,
            masterBuilderActive: false,
            revealedTiles: [],
          },
        ],
        map: [],
        baseTiles: [],
        currentPlayerIndex: 0,
        turn: 1,
        log: [],
        discardPile: [],
        specialCardsDeck: [],
        settings: { gridSize: { rows: 5, cols: 5 }, victoryPointGoal: 30 },
        deathAnimations: [],
        winner: null,
        combatState: null,
        monsterCombatState: null,
      } as unknown as GameState;

      const result = toMonsterCombatViewModel(gameState, false, undefined);
      expect(result).toBeNull();
    });
  });

  describe('isAttacker determination', () => {
    it('uses localPlayerId when defined', () => {
      const result = toMonsterCombatViewModel(attackScreenNoCards, false, 0);
      expect(result).not.toBeNull();
      expect(result?.isAttacker).toBe(true);
    });

    it('uses isMyTurn when localPlayerId is undefined', () => {
      const result = toMonsterCombatViewModel(attackScreenNoCards, true, undefined);
      expect(result).not.toBeNull();
      expect(result?.isAttacker).toBe(true);
    });

    it('sets isAttacker false when localPlayerId does not match attackerId', () => {
      const result = toMonsterCombatViewModel(attackScreenNoCards, true, 1);
      expect(result).not.toBeNull();
      expect(result?.isAttacker).toBe(false);
    });

    it('sets isAttacker false when isMyTurn is false and localPlayerId is undefined', () => {
      const result = toMonsterCombatViewModel(attackScreenNoCards, false, undefined);
      expect(result).not.toBeNull();
      expect(result?.isAttacker).toBe(false);
    });
  });

  describe('screen selection order', () => {
    it('shows results screen when phase is results, regardless of isAttacker true', () => {
      const result = toMonsterCombatViewModel(resultsPlayerWins, true, 0);
      expect(result).not.toBeNull();
      expect(result?.screen.kind).toBe('results');
    });

    it('shows results screen when phase is results, regardless of isAttacker false', () => {
      const result = toMonsterCombatViewModel(resultsPlayerWins, false, undefined);
      expect(result).not.toBeNull();
      expect(result?.screen.kind).toBe('results');
    });

    it('shows spectator screen when rolling and not attacker', () => {
      const result = toMonsterCombatViewModel(spectatorWaiting, false, undefined);
      expect(result).not.toBeNull();
      expect(result?.screen.kind).toBe('spectator');
    });

    it('shows attack screen when rolling and is attacker', () => {
      const result = toMonsterCombatViewModel(attackScreenNoCards, true, 0);
      expect(result).not.toBeNull();
      expect(result?.screen.kind).toBe('attack');
    });
  });

  describe('attack screen view model', () => {
    it('formats title with monster name and level', () => {
      const result = toMonsterCombatViewModel(attackScreenNoCards, true, 0);
      expect(result?.screen.kind).toBe('attack');
      if (result?.screen.kind === 'attack') {
        expect(result.screen.data.title).toBe('Monster Encounter: Bear (Lvl 2)');
      }
    });

    it('formats title as Monster Encounter when monster is undefined', () => {
      const state = {
        ...attackScreenNoCards,
        monsterCombatState: { ...attackScreenNoCards.monsterCombatState, monster: undefined },
      } as unknown as GameState;
      const result = toMonsterCombatViewModel(state, true, 0);
      expect(result?.screen.kind).toBe('attack');
      if (result?.screen.kind === 'attack') {
        expect(result.screen.data.title).toBe('Monster Encounter');
      }
    });

    it('includes attacker name and color in attack view model', () => {
      const result = toMonsterCombatViewModel(attackScreenNoCards, true, 0);
      expect(result?.screen.kind).toBe('attack');
      if (result?.screen.kind === 'attack') {
        expect(result.screen.data.attackerName).toBe('Alice');
        expect(result.screen.data.attackerColor).toBe('blue');
      }
    });

    it('calculates attacker power label correctly', () => {
      const result = toMonsterCombatViewModel(attackScreenNoCards, true, 0);
      expect(result?.screen.kind).toBe('attack');
      if (result?.screen.kind === 'attack') {
        // attacker.attackPower is 0, so power is 0 + 1 = 1
        expect(result.screen.data.attackerPowerLabel).toBe('Power: 1 (1 Die)');
      }
    });

    it('formats power label with plural Dice when power > 1', () => {
      const state = {
        ...attackScreenNoCards,
        players: attackScreenNoCards.players.map(p =>
          p.id === 0 ? { ...p, attackPower: 2 } : p,
        ),
      } as GameState;
      const result = toMonsterCombatViewModel(state, true, 0);
      if (result?.screen.kind === 'attack') {
        expect(result.screen.data.attackerPowerLabel).toBe('Power: 3 (3 Dice)');
      }
    });

    it('includes monster name, sprite, and power label in attack view model', () => {
      const result = toMonsterCombatViewModel(attackScreenNoCards, true, 0);
      expect(result?.screen.kind).toBe('attack');
      if (result?.screen.kind === 'attack') {
        expect(result.screen.data.monster).not.toBeNull();
        expect(result.screen.data.monster?.name).toBe('Bear');
        expect(result.screen.data.monster?.sprite).toBe('/sprites/bear_attack.gif');
        expect(result.screen.data.monster?.powerLabel).toBe('Power: 2 (2 Dice)');
      }
    });

    it('sets monster to null when undefined', () => {
      const state = {
        ...attackScreenNoCards,
        monsterCombatState: { ...attackScreenNoCards.monsterCombatState, monster: undefined },
      } as unknown as GameState;
      const result = toMonsterCombatViewModel(state, true, 0);
      if (result?.screen.kind === 'attack') {
        expect(result.screen.data.monster).toBeNull();
      }
    });

    it('canAttack is true when monster exists', () => {
      const result = toMonsterCombatViewModel(attackScreenNoCards, true, 0);
      if (result?.screen.kind === 'attack') {
        expect(result.screen.data.canAttack).toBe(true);
      }
    });

    it('canAttack is false when monster is undefined', () => {
      const state = {
        ...attackScreenNoCards,
        monsterCombatState: { ...attackScreenNoCards.monsterCombatState, monster: undefined },
      } as unknown as GameState;
      const result = toMonsterCombatViewModel(state, true, 0);
      if (result?.screen.kind === 'attack') {
        expect(result.screen.data.canAttack).toBe(false);
      }
    });

    describe('card flags', () => {
      it('all card flags are false when no cards', () => {
        const result = toMonsterCombatViewModel(attackScreenNoCards, true, 0);
        if (result?.screen.kind === 'attack') {
          expect(result.screen.data.hasOvercomeCard).toBe(false);
          expect(result.screen.data.hasWarChiefCard).toBe(false);
          expect(result.screen.data.hasDecideCard).toBe(false);
          expect(result.screen.data.canSelectCard).toBe(false);
        }
      });

      it('card flags are true when all cards present', () => {
        const result = toMonsterCombatViewModel(attackScreenAllCards, true, 0);
        if (result?.screen.kind === 'attack') {
          expect(result.screen.data.hasOvercomeCard).toBe(true);
          expect(result.screen.data.hasWarChiefCard).toBe(true);
          expect(result.screen.data.hasDecideCard).toBe(true);
          expect(result.screen.data.canSelectCard).toBe(true);
        }
      });

      it('card flags are false when attacker already used a card', () => {
        const state = {
          ...attackScreenAllCards,
          players: attackScreenAllCards.players.map(p =>
            p.id === 0
              ? { ...p, actionsThisTurn: [GameAction.UseCard] }
              : p,
          ),
        } as GameState;
        const result = toMonsterCombatViewModel(state, true, 0);
        if (result?.screen.kind === 'attack') {
          expect(result.screen.data.hasOvercomeCard).toBe(false);
          expect(result.screen.data.hasWarChiefCard).toBe(false);
          expect(result.screen.data.hasDecideCard).toBe(false);
          expect(result.screen.data.canSelectCard).toBe(false);
        }
      });
    });
  });

  describe('results screen view model', () => {
    it('isPlayerWinner is true when winnerId equals attackerId', () => {
      const result = toMonsterCombatViewModel(resultsPlayerWins, true, 0);
      if (result?.screen.kind === 'results') {
        expect(result.screen.data.isPlayerWinner).toBe(true);
      }
    });

    it('isPlayerWinner is false when winnerId does not equal attackerId', () => {
      const result = toMonsterCombatViewModel(resultsMonsterWins, false, undefined);
      if (result?.screen.kind === 'results') {
        expect(result.screen.data.isPlayerWinner).toBe(false);
      }
    });

    it('attacker sprite is attack sprite when player wins', () => {
      const result = toMonsterCombatViewModel(resultsPlayerWins, true, 0);
      if (result?.screen.kind === 'results') {
        expect(result.screen.data.attacker.sprite).toBe('/sprites/blue_attack.gif');
        expect(result.screen.data.attacker.isWinner).toBe(true);
      }
    });

    it('attacker sprite is death sprite when player loses', () => {
      const result = toMonsterCombatViewModel(resultsMonsterWins, true, 0);
      if (result?.screen.kind === 'results') {
        expect(result.screen.data.attacker.sprite).toBe('/sprites/death.gif');
        expect(result.screen.data.attacker.isWinner).toBe(false);
      }
    });

    it('monster sprite is death sprite when player wins', () => {
      const result = toMonsterCombatViewModel(resultsPlayerWins, true, 0);
      if (result?.screen.kind === 'results') {
        expect(result.screen.data.monster?.sprite).toBe('/sprites/death.gif');
        expect(result.screen.data.monster?.isWinner).toBe(false);
      }
    });

    it('monster sprite is attack sprite when player loses', () => {
      const result = toMonsterCombatViewModel(resultsMonsterWins, true, 0);
      if (result?.screen.kind === 'results') {
        expect(result.screen.data.monster?.sprite).toBe('/sprites/bear_attack.gif');
        expect(result.screen.data.monster?.isWinner).toBe(true);
      }
    });

    it('includes attacker rolls and total', () => {
      const result = toMonsterCombatViewModel(resultsPlayerWins, true, 0);
      if (result?.screen.kind === 'results') {
        expect(result.screen.data.attacker.rolls).toEqual([5, 4, 3]);
        expect(result.screen.data.attacker.total).toBe(12);
      }
    });

    it('includes monster rolls and total', () => {
      const result = toMonsterCombatViewModel(resultsPlayerWins, true, 0);
      if (result?.screen.kind === 'results') {
        expect(result.screen.data.monster?.rolls).toEqual([2, 2, 1]);
        expect(result.screen.data.monster?.total).toBe(5);
      }
    });

    it('formats outcome text when player wins', () => {
      const result = toMonsterCombatViewModel(resultsPlayerWins, true, 0);
      if (result?.screen.kind === 'results') {
        expect(result.screen.data.outcomeText).toBe('Alice Defeated the Monster!');
      }
    });

    it('formats outcome text when monster wins', () => {
      const result = toMonsterCombatViewModel(resultsMonsterWins, true, 0);
      if (result?.screen.kind === 'results') {
        expect(result.screen.data.outcomeText).toBe('The Monster prevailed!');
      }
    });

    it('includes empty rolls and zero total when no rolls yet', () => {
      const state = {
        ...attackScreenNoCards,
        monsterCombatState: { ...attackScreenNoCards.monsterCombatState, phase: 'results', winnerId: null },
      } as GameState;
      const result = toMonsterCombatViewModel(state, true, 0);
      if (result?.screen.kind === 'results') {
        expect(result.screen.data.attacker.rolls).toEqual([]);
        expect(result.screen.data.attacker.total).toBe(0);
        expect(result.screen.data.monster?.rolls).toEqual([]);
        expect(result.screen.data.monster?.total).toBe(0);
      }
    });

    it('sets monster to null when undefined', () => {
      const state = {
        ...resultsPlayerWins,
        monsterCombatState: { ...resultsPlayerWins.monsterCombatState, monster: undefined },
      } as unknown as GameState;
      const result = toMonsterCombatViewModel(state, true, 0);
      if (result?.screen.kind === 'results') {
        expect(result.screen.data.monster).toBeNull();
      }
    });
  });

  describe('spectator screen view model', () => {
    it('includes attacker name', () => {
      const result = toMonsterCombatViewModel(spectatorWaiting, false, undefined);
      if (result?.screen.kind === 'spectator') {
        expect(result.screen.data.attackerName).toBe('Alice');
      }
    });

    it('formats monsterLabel with name and level', () => {
      const result = toMonsterCombatViewModel(spectatorWaiting, false, undefined);
      if (result?.screen.kind === 'spectator') {
        expect(result.screen.data.monsterLabel).toBe('Bear (Lvl 2)');
      }
    });

    it('falls back to "the monster" when monster is undefined', () => {
      const state = {
        ...spectatorWaiting,
        monsterCombatState: { ...spectatorWaiting.monsterCombatState, monster: undefined },
      } as unknown as GameState;
      const result = toMonsterCombatViewModel(state, false, undefined);
      if (result?.screen.kind === 'spectator') {
        expect(result.screen.data.monsterLabel).toBe('the monster');
      }
    });
  });
});
