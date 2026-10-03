import { GameAction } from '@/lib/types';
import { toCombatDialogViewModel } from './CombatDialog.map';
import {
  rollingPhaseAttackerNoCards,
  rollingPhaseAttackerBothCards,
  rollingPhaseSpectator,
  resultsPhaseAttackerWins,
  resultsPhaseDrawn,
} from './CombatDialog.fixtures';

describe('CombatDialog.map', () => {
  describe('toCombatDialogViewModel', () => {
    describe('null cases', () => {
      it('returns null when there is no combatState', () => {
        const result = toCombatDialogViewModel(
          { ...rollingPhaseAttackerNoCards, combatState: null },
          0,
          true
        );
        expect(result).toBeNull();
      });

      it('returns null when defenderId matches no player', () => {
        const gameState = {
          ...rollingPhaseAttackerNoCards,
          combatState: {
            ...rollingPhaseAttackerNoCards.combatState!,
            defenderId: 999, // non-existent player
          },
        };
        const result = toCombatDialogViewModel(gameState, 0, true);
        expect(result).toBeNull();
      });
    });

    describe('canPerformAction', () => {
      it('is true when isMyTurn && localPlayerId === attackerId', () => {
        const result = toCombatDialogViewModel(rollingPhaseAttackerNoCards, 0, true);
        expect(result?.canPerformAction).toBe(true);
      });

      it('is false when isMyTurn but localPlayerId !== attackerId', () => {
        const result = toCombatDialogViewModel(rollingPhaseAttackerNoCards, 1, true);
        expect(result?.canPerformAction).toBe(false);
      });

      it('is false when localPlayerId === attackerId but !isMyTurn', () => {
        const result = toCombatDialogViewModel(rollingPhaseAttackerNoCards, 0, false);
        expect(result?.canPerformAction).toBe(false);
      });

      it('is false when both conditions fail', () => {
        const result = toCombatDialogViewModel(rollingPhaseAttackerNoCards, 1, false);
        expect(result?.canPerformAction).toBe(false);
      });
    });

    describe('canSelectCard', () => {
      it('is false when phase === "results"', () => {
        const result = toCombatDialogViewModel(resultsPhaseAttackerWins, 0, true);
        expect(result?.canSelectCard).toBe(false);
      });

      it('is false when attacker already used a card (canUseCard = false)', () => {
        const gameState = {
          ...rollingPhaseAttackerBothCards,
          players: rollingPhaseAttackerBothCards.players.map(p =>
            p.id === 0 ? { ...p, actionsThisTurn: [GameAction.UseCard] } : p
          ),
        };
        const result = toCombatDialogViewModel(gameState, 0, true);
        expect(result?.canSelectCard).toBe(false);
      });

      it('is false when attacker has neither special card', () => {
        const result = toCombatDialogViewModel(rollingPhaseAttackerNoCards, 0, true);
        expect(result?.canSelectCard).toBe(false);
      });

      it('is true when canPerformAction && canUseCard && has at least one card', () => {
        const result = toCombatDialogViewModel(rollingPhaseAttackerBothCards, 0, true);
        expect(result?.canSelectCard).toBe(true);
      });

      it('is false when canPerformAction && canUseCard but canPerformAction is false', () => {
        const result = toCombatDialogViewModel(rollingPhaseAttackerBothCards, 1, true);
        expect(result?.canSelectCard).toBe(false);
      });
    });

    describe('winner', () => {
      it('returns { name, color } when winnerId is set', () => {
        const result = toCombatDialogViewModel(resultsPhaseAttackerWins, 0, true);
        expect(result?.winner).toEqual({
          name: 'Alice',
          color: 'blue',
        });
      });

      it('returns null when winnerId is null (draw)', () => {
        const result = toCombatDialogViewModel(resultsPhaseDrawn, 0, true);
        expect(result?.winner).toBeNull();
      });

      it('returns the correct winner when defender wins', () => {
        const gameState = {
          ...resultsPhaseAttackerWins,
          combatState: {
            ...resultsPhaseAttackerWins.combatState!,
            winnerId: 1,
          },
        };
        const result = toCombatDialogViewModel(gameState, 0, true);
        expect(result?.winner).toEqual({
          name: 'Bob',
          color: 'red',
        });
      });
    });

    describe('isWinner flags', () => {
      it('sets attacker.isWinner=true when winnerId === attackerId', () => {
        const result = toCombatDialogViewModel(resultsPhaseAttackerWins, 0, true);
        expect(result?.attacker.isWinner).toBe(true);
        expect(result?.defender.isWinner).toBe(false);
      });

      it('sets defender.isWinner=true when winnerId === defenderId', () => {
        const gameState = {
          ...resultsPhaseAttackerWins,
          combatState: {
            ...resultsPhaseAttackerWins.combatState!,
            winnerId: 1,
          },
        };
        const result = toCombatDialogViewModel(gameState, 0, true);
        expect(result?.attacker.isWinner).toBe(false);
        expect(result?.defender.isWinner).toBe(true);
      });

      it('sets both isWinner=false when winnerId is null (draw)', () => {
        const result = toCombatDialogViewModel(resultsPhaseDrawn, 0, true);
        expect(result?.attacker.isWinner).toBe(false);
        expect(result?.defender.isWinner).toBe(false);
      });
    });

    describe('sprites', () => {
      it('uses attack sprite for both in rolling phase', () => {
        const result = toCombatDialogViewModel(rollingPhaseAttackerNoCards, 0, true);
        expect(result?.phase).toBe('rolling');
        expect(result?.isCombatOver).toBe(false);
        expect(result?.attacker.sprite).toContain('attack');
        expect(result?.defender.sprite).toContain('attack');
      });

      it('uses death sprite for loser in results phase', () => {
        const result = toCombatDialogViewModel(resultsPhaseAttackerWins, 0, true);
        expect(result?.phase).toBe('results');
        expect(result?.isCombatOver).toBe(true);
        // Attacker won, so defender should have death sprite
        expect(result?.attacker.sprite).toContain('attack');
        expect(result?.defender.sprite).toContain('death');
      });

      it('uses death sprite for attacker when defender wins', () => {
        const gameState = {
          ...resultsPhaseAttackerWins,
          combatState: {
            ...resultsPhaseAttackerWins.combatState!,
            winnerId: 1,
          },
        };
        const result = toCombatDialogViewModel(gameState, 0, true);
        expect(result?.attacker.sprite).toContain('death');
        expect(result?.defender.sprite).toContain('attack');
      });

      it('uses attack sprite for both in draw (no loser)', () => {
        const result = toCombatDialogViewModel(resultsPhaseDrawn, 0, true);
        expect(result?.attacker.sprite).toContain('attack');
        expect(result?.defender.sprite).toContain('attack');
      });
    });

    describe('totals', () => {
      it('calculates correct total for empty rolls (rolling phase)', () => {
        const result = toCombatDialogViewModel(rollingPhaseAttackerNoCards, 0, true);
        expect(result?.attacker.total).toBe(0);
        expect(result?.defender.total).toBe(0);
      });

      it('calculates correct total for non-empty rolls', () => {
        const result = toCombatDialogViewModel(resultsPhaseAttackerWins, 0, true);
        expect(result?.attacker.total).toBe(12); // 5 + 4 + 3
        expect(result?.defender.total).toBe(5); // 2 + 2 + 1
      });

      it('calculates correct total for equal rolls (draw)', () => {
        const result = toCombatDialogViewModel(resultsPhaseDrawn, 0, true);
        expect(result?.attacker.total).toBe(9); // 3 + 3 + 3
        expect(result?.defender.total).toBe(9); // 3 + 3 + 3
      });
    });

    describe('rolls arrays', () => {
      it('includes all rolls in the arrays', () => {
        const result = toCombatDialogViewModel(resultsPhaseAttackerWins, 0, true);
        expect(result?.attacker.rolls).toEqual([5, 4, 3]);
        expect(result?.defender.rolls).toEqual([2, 2, 1]);
      });

      it('returns empty arrays in rolling phase', () => {
        const result = toCombatDialogViewModel(rollingPhaseAttackerNoCards, 0, true);
        expect(result?.attacker.rolls).toEqual([]);
        expect(result?.defender.rolls).toEqual([]);
      });
    });

    describe('hasOvercomeCard / hasWarChiefCard', () => {
      it('sets both to false when attacker has neither card', () => {
        const result = toCombatDialogViewModel(rollingPhaseAttackerNoCards, 0, true);
        expect(result?.hasOvercomeCard).toBe(false);
        expect(result?.hasWarChiefCard).toBe(false);
      });

      it('sets both to true when attacker has both cards', () => {
        const result = toCombatDialogViewModel(rollingPhaseAttackerBothCards, 0, true);
        expect(result?.hasOvercomeCard).toBe(true);
        expect(result?.hasWarChiefCard).toBe(true);
      });

      it('sets only hasOvercomeCard when attacker has only Overcome', () => {
        const result = toCombatDialogViewModel(rollingPhaseSpectator, 0, true);
        expect(result?.hasOvercomeCard).toBe(true);
        expect(result?.hasWarChiefCard).toBe(false);
      });
    });

    describe('phase and isCombatOver', () => {
      it('returns phase="rolling" and isCombatOver=false in rolling phase', () => {
        const result = toCombatDialogViewModel(rollingPhaseAttackerNoCards, 0, true);
        expect(result?.phase).toBe('rolling');
        expect(result?.isCombatOver).toBe(false);
      });

      it('returns phase="results" and isCombatOver=true in results phase', () => {
        const result = toCombatDialogViewModel(resultsPhaseAttackerWins, 0, true);
        expect(result?.phase).toBe('results');
        expect(result?.isCombatOver).toBe(true);
      });
    });

    describe('combatant names and colors', () => {
      it('uses attacker player name and color', () => {
        const result = toCombatDialogViewModel(rollingPhaseAttackerNoCards, 0, true);
        expect(result?.attacker.name).toBe('Alice');
        expect(result?.attacker.color).toBe('blue');
      });

      it('uses defender player name and color', () => {
        const result = toCombatDialogViewModel(rollingPhaseAttackerNoCards, 0, true);
        expect(result?.defender.name).toBe('Bob');
        expect(result?.defender.color).toBe('red');
      });
    });

    describe('inputs are not mutated', () => {
      it('does not mutate the gameState', () => {
        const gameState = JSON.parse(JSON.stringify(rollingPhaseAttackerNoCards));
        const originalGameState = JSON.parse(JSON.stringify(rollingPhaseAttackerNoCards));

        toCombatDialogViewModel(gameState, 0, true);

        expect(gameState).toEqual(originalGameState);
      });

      it('does not mutate the combatState', () => {
        const gameState = { ...rollingPhaseAttackerNoCards };
        const originalCombatState = JSON.parse(JSON.stringify(gameState.combatState));

        toCombatDialogViewModel(gameState, 0, true);

        expect(gameState.combatState).toEqual(originalCombatState);
      });
    });
  });
});
