import { renderHook, act } from '@testing-library/react';
import { useMonsterCombatDialog } from './MonsterCombatDialog.hook';
import {
  attackScreenNoCards,
  attackScreenAllCards,
  resultsPlayerWins,
} from './MonsterCombatDialog.fixtures';
import type { GameState, PlayerColor } from '@/lib/types';

describe('useMonsterCombatDialog', () => {
  describe('default state', () => {
    it('initializes with selectedCard as "none"', () => {
      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState: attackScreenNoCards,
          onRoll: jest.fn(),
          onClose: jest.fn(),
          onCancel: jest.fn(),
          isMyTurn: true,
          localPlayerId: 0,
        }),
      );

      expect(result.current.selectedCard).toBe('none');
    });

    it('initializes with decidedValue as 6', () => {
      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState: attackScreenNoCards,
          onRoll: jest.fn(),
          onClose: jest.fn(),
          onCancel: jest.fn(),
          isMyTurn: true,
          localPlayerId: 0,
        }),
      );

      expect(result.current.decidedValue).toBe(6);
    });

    it('initializes viewModel from gameState', () => {
      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState: attackScreenNoCards,
          onRoll: jest.fn(),
          onClose: jest.fn(),
          onCancel: jest.fn(),
          isMyTurn: true,
          localPlayerId: 0,
        }),
      );

      expect(result.current.viewModel).not.toBeNull();
      expect(result.current.viewModel?.screen.kind).toBe('attack');
    });
  });

  describe('null viewModel', () => {
    it('sets viewModel to null when monsterCombatState is absent', () => {
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

      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState,
          onRoll: jest.fn(),
          onClose: jest.fn(),
          onCancel: jest.fn(),
          isMyTurn: true,
          localPlayerId: 0,
        }),
      );

      expect(result.current.viewModel).toBeNull();
    });

    it('onAttack does not throw when viewModel is null', () => {
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

      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState,
          onRoll: jest.fn(),
          onClose: jest.fn(),
          onCancel: jest.fn(),
          isMyTurn: true,
          localPlayerId: 0,
        }),
      );

      expect(() => {
        act(() => {
          result.current.onAttack();
        });
      }).not.toThrow();
    });
  });

  describe('onSelectCard', () => {
    it('updates selectedCard to "overcome"', () => {
      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState: attackScreenAllCards,
          onRoll: jest.fn(),
          onClose: jest.fn(),
          onCancel: jest.fn(),
          isMyTurn: true,
          localPlayerId: 0,
        }),
      );

      act(() => {
        result.current.onSelectCard('overcome');
      });

      expect(result.current.selectedCard).toBe('overcome');
    });

    it('updates selectedCard to "warchief"', () => {
      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState: attackScreenAllCards,
          onRoll: jest.fn(),
          onClose: jest.fn(),
          onCancel: jest.fn(),
          isMyTurn: true,
          localPlayerId: 0,
        }),
      );

      act(() => {
        result.current.onSelectCard('warchief');
      });

      expect(result.current.selectedCard).toBe('warchief');
    });

    it('updates selectedCard to "decide"', () => {
      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState: attackScreenAllCards,
          onRoll: jest.fn(),
          onClose: jest.fn(),
          onCancel: jest.fn(),
          isMyTurn: true,
          localPlayerId: 0,
        }),
      );

      act(() => {
        result.current.onSelectCard('decide');
      });

      expect(result.current.selectedCard).toBe('decide');
    });

    it('updates selectedCard back to "none"', () => {
      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState: attackScreenAllCards,
          onRoll: jest.fn(),
          onClose: jest.fn(),
          onCancel: jest.fn(),
          isMyTurn: true,
          localPlayerId: 0,
        }),
      );

      act(() => {
        result.current.onSelectCard('overcome');
      });

      expect(result.current.selectedCard).toBe('overcome');

      act(() => {
        result.current.onSelectCard('none');
      });

      expect(result.current.selectedCard).toBe('none');
    });
  });

  describe('onDecidedValueChange', () => {
    it('updates decidedValue to 3', () => {
      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState: attackScreenAllCards,
          onRoll: jest.fn(),
          onClose: jest.fn(),
          onCancel: jest.fn(),
          isMyTurn: true,
          localPlayerId: 0,
        }),
      );

      act(() => {
        result.current.onDecidedValueChange(3);
      });

      expect(result.current.decidedValue).toBe(3);
    });

    it('updates decidedValue to 1', () => {
      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState: attackScreenAllCards,
          onRoll: jest.fn(),
          onClose: jest.fn(),
          onCancel: jest.fn(),
          isMyTurn: true,
          localPlayerId: 0,
        }),
      );

      act(() => {
        result.current.onDecidedValueChange(1);
      });

      expect(result.current.decidedValue).toBe(1);
    });

    it('updates decidedValue to 6', () => {
      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState: attackScreenAllCards,
          onRoll: jest.fn(),
          onClose: jest.fn(),
          onCancel: jest.fn(),
          isMyTurn: true,
          localPlayerId: 0,
        }),
      );

      act(() => {
        result.current.onDecidedValueChange(2);
      });

      expect(result.current.decidedValue).toBe(2);

      act(() => {
        result.current.onDecidedValueChange(6);
      });

      expect(result.current.decidedValue).toBe(6);
    });
  });

  describe('onAttack', () => {
    it('calls onRoll with selectedCard "none" payload', () => {
      const onRoll = jest.fn();
      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState: attackScreenNoCards,
          onRoll,
          onClose: jest.fn(),
          onCancel: jest.fn(),
          isMyTurn: true,
          localPlayerId: 0,
        }),
      );

      act(() => {
        result.current.onAttack();
      });

      expect(onRoll).toHaveBeenCalledWith({
        monster: attackScreenNoCards.monsterCombatState!.monster,
        useDecideCard: false,
        decidedValue: 6,
        useOvercomeCard: false,
        useWarChief: false,
      });
    });

    it('calls onRoll with selectedCard "overcome" payload', () => {
      const onRoll = jest.fn();
      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState: attackScreenAllCards,
          onRoll,
          onClose: jest.fn(),
          onCancel: jest.fn(),
          isMyTurn: true,
          localPlayerId: 0,
        }),
      );

      act(() => {
        result.current.onSelectCard('overcome');
      });

      act(() => {
        result.current.onAttack();
      });

      expect(onRoll).toHaveBeenCalledWith({
        monster: attackScreenAllCards.monsterCombatState!.monster,
        useDecideCard: false,
        decidedValue: 6,
        useOvercomeCard: true,
        useWarChief: false,
      });
    });

    it('calls onRoll with selectedCard "warchief" payload', () => {
      const onRoll = jest.fn();
      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState: attackScreenAllCards,
          onRoll,
          onClose: jest.fn(),
          onCancel: jest.fn(),
          isMyTurn: true,
          localPlayerId: 0,
        }),
      );

      act(() => {
        result.current.onSelectCard('warchief');
      });

      act(() => {
        result.current.onAttack();
      });

      expect(onRoll).toHaveBeenCalledWith({
        monster: attackScreenAllCards.monsterCombatState!.monster,
        useDecideCard: false,
        decidedValue: 6,
        useOvercomeCard: false,
        useWarChief: true,
      });
    });

    it('calls onRoll with selectedCard "decide" payload and current decidedValue', () => {
      const onRoll = jest.fn();
      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState: attackScreenAllCards,
          onRoll,
          onClose: jest.fn(),
          onCancel: jest.fn(),
          isMyTurn: true,
          localPlayerId: 0,
        }),
      );

      act(() => {
        result.current.onSelectCard('decide');
      });

      act(() => {
        result.current.onDecidedValueChange(4);
      });

      act(() => {
        result.current.onAttack();
      });

      expect(onRoll).toHaveBeenCalledWith({
        monster: attackScreenAllCards.monsterCombatState!.monster,
        useDecideCard: true,
        decidedValue: 4,
        useOvercomeCard: false,
        useWarChief: false,
      });
    });

    it('does not call onRoll when monster is absent', () => {
      const onRoll = jest.fn();
      const gameState = {
        ...attackScreenNoCards,
        monsterCombatState: { ...attackScreenNoCards.monsterCombatState, monster: undefined },
      } as unknown as GameState;

      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState,
          onRoll,
          onClose: jest.fn(),
          onCancel: jest.fn(),
          isMyTurn: true,
          localPlayerId: 0,
        }),
      );

      act(() => {
        result.current.onAttack();
      });

      expect(onRoll).not.toHaveBeenCalled();
    });
  });

  describe('onCancel', () => {
    it('calls props.onClose', () => {
      const onClose = jest.fn();
      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState: attackScreenNoCards,
          onRoll: jest.fn(),
          onClose,
          onCancel: jest.fn(),
          isMyTurn: true,
          localPlayerId: 0,
        }),
      );

      act(() => {
        result.current.onCancel();
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call props.onCancel', () => {
      const onCancel = jest.fn();
      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState: attackScreenNoCards,
          onRoll: jest.fn(),
          onClose: jest.fn(),
          onCancel,
          isMyTurn: true,
          localPlayerId: 0,
        }),
      );

      act(() => {
        result.current.onCancel();
      });

      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('onContinue', () => {
    it('calls props.onClose', () => {
      const onClose = jest.fn();
      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState: resultsPlayerWins,
          onRoll: jest.fn(),
          onClose,
          onCancel: jest.fn(),
          isMyTurn: true,
          localPlayerId: 0,
        }),
      );

      act(() => {
        result.current.onContinue();
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('with undefined localPlayerId', () => {
    it('sets isAttacker based on isMyTurn when localPlayerId is undefined', () => {
      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState: attackScreenNoCards,
          onRoll: jest.fn(),
          onClose: jest.fn(),
          onCancel: jest.fn(),
          isMyTurn: true,
          localPlayerId: undefined,
        }),
      );

      expect(result.current.viewModel?.isAttacker).toBe(true);
    });

    it('sets isAttacker false when isMyTurn is false and localPlayerId is undefined', () => {
      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState: attackScreenNoCards,
          onRoll: jest.fn(),
          onClose: jest.fn(),
          onCancel: jest.fn(),
          isMyTurn: false,
          localPlayerId: undefined,
        }),
      );

      expect(result.current.viewModel?.isAttacker).toBe(false);
    });
  });

  describe('with default props', () => {
    it('defaults isMyTurn to false when not provided', () => {
      const { result } = renderHook(() =>
        useMonsterCombatDialog({
          gameState: attackScreenNoCards,
          onRoll: jest.fn(),
          onClose: jest.fn(),
          onCancel: jest.fn(),
        }),
      );

      // With default isMyTurn=false and no localPlayerId, isAttacker should be false
      expect(result.current.viewModel?.isAttacker).toBe(false);
    });
  });
});
