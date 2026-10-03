import type { Player } from '@/lib/types';
import { CardName } from '@/lib/types';
import { toPlayerInfoViewModel } from './PlayerInfo.map';

const createPlayer = (overrides: Partial<Player> = {}): Player =>
  ({
    id: 0,
    playerId: 'player-0',
    name: 'Test Player',
    color: 'blue',
    isBot: false,
    armies: [
      { id: 0, position: { x: 0, y: 0 }, hasActed: false },
      { id: 1, position: { x: 1, y: 1 }, hasActed: true },
    ],
    resources: { food: 10, wood: 5, gold: 3 },
    armyCount: 2,
    attackPower: 1,
    nextArmyCost: 10,
    victoryPoints: 5,
    specialCards: [CardName.Scout, CardName.Reinforce],
    positions: [{ x: 0, y: 0, resource: 'food', armyId: 0 }],
    passiveAbilities: { collector: false, explorer: false },
    isSabotaged: false,
    reinforceActive: false,
    efficientActive: false,
    masterBuilderActive: false,
    hasExtraMove: false,
    actionsThisTurn: [],
    revealedTiles: [],
    ...overrides,
  }) as Player;

const mockTurnTimer = { formattedTime: '1:30', isExpiring: false };

describe('toPlayerInfoViewModel', () => {
  describe('basic player info', () => {
    it('includes correct player properties', () => {
      const player = createPlayer({ name: 'Alice', color: 'red', isBot: true });
      let result = toPlayerInfoViewModel(player, false, 10, mockTurnTimer, false);
      expect(result.name).toBe('Alice');
      expect(result.color).toBe('red');
      expect(result.isBot).toBe(true);
      result = toPlayerInfoViewModel(player, true, 10, mockTurnTimer, false);
      expect(result.isCurrentPlayer).toBe(true);
    });
  });
  describe('army and position counts', () => {
    it('uses armies.length when armies is populated', () => {
      const player = createPlayer({
        armies: [
          { id: 0, position: { x: 0, y: 0 }, hasActed: false },
          { id: 1, position: { x: 1, y: 1 }, hasActed: false },
          { id: 2, position: { x: 2, y: 2 }, hasActed: false },
        ],
      });
      const result = toPlayerInfoViewModel(player, true, 10, mockTurnTimer, false);
      expect(result.armyCount).toBe(3);
    });
    it('falls back to armyCount property when armies is undefined', () => {
      const player = createPlayer({});
      (player as unknown as { armies?: unknown }).armies = undefined;
      (player as unknown as { armyCount: number }).armyCount = 5;
      const result = toPlayerInfoViewModel(player, true, 10, mockTurnTimer, false);
      expect(result.armyCount).toBe(5);
    });
    it('falls back to 0 when armies is undefined and armyCount is missing', () => {
      const player = createPlayer({});
      (player as unknown as { armies?: unknown }).armies = undefined;
      (player as unknown as { armyCount?: number }).armyCount = undefined;
      const result = toPlayerInfoViewModel(player, true, 10, mockTurnTimer, false);
      expect(result.armyCount).toBe(0);
    });
    it('counts positioned armies from positions array', () => {
      const player = createPlayer({
        positions: [
          { x: 0, y: 0, resource: 'food', armyId: 0 },
          { x: 1, y: 1, resource: 'wood', armyId: 1 },
          { x: 2, y: 2, resource: 'gold', armyId: 2 },
        ],
      });
      const result = toPlayerInfoViewModel(player, true, 10, mockTurnTimer, false);
      expect(result.positionedCount).toBe(3);
    });
    it('handles no positioned armies', () => {
      const player = createPlayer({ positions: [] });
      const result = toPlayerInfoViewModel(player, true, 10, mockTurnTimer, false);
      expect(result.positionedCount).toBe(0);
    });
  });
  describe('victory points and vpPercent', () => {
    it('clamps and calculates vpPercent correctly', () => {
      let player = createPlayer({ victoryPoints: 20 });
      let result = toPlayerInfoViewModel(player, false, 10, mockTurnTimer, false);
      expect(result.vpPercent).toBe(100);
      player = createPlayer({ victoryPoints: 0 });
      result = toPlayerInfoViewModel(player, false, 10, mockTurnTimer, false);
      expect(result.vpPercent).toBe(0);
      player = createPlayer({ victoryPoints: 15 });
      result = toPlayerInfoViewModel(player, false, 30, mockTurnTimer, false);
      expect(result.vpPercent).toBe(50);
    });
    it('handles vpGoal === 0 by returning 100 (matches legacy behavior for single zero)', () => {
      // Legacy: Math.min(100, Math.max(0, Math.round((5 / 0) * 100))) = 100 (Infinity clamps to 100)
      // This edge case is prevented defensively in the new implementation.
      const player = createPlayer({ victoryPoints: 5 });
      const result = toPlayerInfoViewModel(player, false, 0, mockTurnTimer, false);
      expect(result.vpPercent).toBe(100);
    });
    it('handles vpGoal === 0 AND victoryPoints === 0 by returning 100 (found-bug fix)', () => {
      // Legacy: Math.min(100, Math.max(0, Math.round((0 / 0) * 100))) = NaN (0/0 = NaN, NaN propagates through)
      // New code returns 100 instead to prevent NaN from breaking progress-bar width styling.
      const player = createPlayer({ victoryPoints: 0 });
      const result = toPlayerInfoViewModel(player, false, 0, mockTurnTimer, false);
      expect(result.vpPercent).toBe(100);
    });
  });
  describe('special cards', () => {
    it('counts and returns special cards', () => {
      const player1 = createPlayer({ specialCards: [CardName.Scout, CardName.Reinforce, CardName.ExtraMove] });
      let result = toPlayerInfoViewModel(player1, true, 10, mockTurnTimer, false);
      expect(result.specialCardsCount).toBe(3);
      const player2 = createPlayer({ specialCards: [] });
      result = toPlayerInfoViewModel(player2, true, 10, mockTurnTimer, false);
      expect(result.specialCardsCount).toBe(0);
    });
  });
  describe('resources', () => {
    it('returns resources in order: Food, Wood, Gold', () => {
      const player = createPlayer({ resources: { food: 20, wood: 15, gold: 5 } });
      const result = toPlayerInfoViewModel(player, true, 10, mockTurnTimer, false);
      expect(result.resources).toHaveLength(3);
      expect(result.resources[0]).toEqual({ type: 'food', label: 'Food', value: 20 });
      expect(result.resources[1]).toEqual({ type: 'wood', label: 'Wood', value: 15 });
      expect(result.resources[2]).toEqual({ type: 'gold', label: 'Gold', value: 5 });
    });
    it('handles zero and missing resource values', () => {
      const player = createPlayer({ resources: {} as Record<string, number> });
      const result = toPlayerInfoViewModel(player, true, 10, mockTurnTimer, false);
      expect(result.resources[0].value).toBe(0);
      expect(result.resources[1].value).toBe(0);
      expect(result.resources[2].value).toBe(0);
    });
  });
  describe('buffs', () => {
    const buffCases: Array<[string, Partial<Player>, string]> = [
      ['collector', { passiveAbilities: { collector: true, explorer: false } }, 'Collector'],
      ['explorer', { passiveAbilities: { collector: false, explorer: true } }, 'Explorer'],
      ['reinforce', { reinforceActive: true }, 'Reinforce'],
      ['efficient', { efficientActive: true }, 'Efficient'],
      ['builder', { masterBuilderActive: true }, 'Builder'],
      ['extra-move', { hasExtraMove: true }, 'Extra Move'],
      ['sabotaged', { isSabotaged: true }, 'Sabotaged'],
    ];
    it.each(buffCases)('includes %s buff when condition is true', (buffId: string, overrides: Partial<Player>, label: string) => {
      const player = createPlayer(overrides);
      const result = toPlayerInfoViewModel(player, true, 10, mockTurnTimer, false);
      const buff = result.buffs.find(b => b.id === buffId);
      expect(buff).toBeDefined();
      expect(buff?.label).toBe(label);
    });
    it('maintains buff order correctly', () => {
      const player = createPlayer({
        passiveAbilities: { collector: true, explorer: true },
        reinforceActive: true,
        efficientActive: true,
        masterBuilderActive: true,
        hasExtraMove: true,
        isSabotaged: true,
      });
      const result = toPlayerInfoViewModel(player, true, 10, mockTurnTimer, false);
      expect(result.buffs.map(b => b.id)).toEqual(['collector', 'explorer', 'reinforce', 'efficient', 'builder', 'extra-move', 'sabotaged']);
    });
    it('returns empty buffs array when no buffs are active', () => {
      const player = createPlayer({
        passiveAbilities: { collector: false, explorer: false },
        reinforceActive: false,
        efficientActive: false,
        masterBuilderActive: false,
        hasExtraMove: false,
        isSabotaged: false,
      });
      const result = toPlayerInfoViewModel(player, true, 10, mockTurnTimer, false);
      expect(result.buffs).toEqual([]);
    });
  });
  describe('turn badge', () => {
    it('returns null when isCurrentPlayer is false', () => {
      const result = toPlayerInfoViewModel(createPlayer(), false, 10, mockTurnTimer, false);
      expect(result.turnBadge).toBe(null);
    });
    it('returns turn badge with correct values when isCurrentPlayer true and isMyTurn true', () => {
      const result = toPlayerInfoViewModel(createPlayer(), true, 10, mockTurnTimer, true);
      expect(result.turnBadge).not.toBe(null);
      expect(result.turnBadge?.showCountdown).toBe(true);
      expect(result.turnBadge?.formattedTime).toBe('1:30');
      expect(result.turnBadge?.isExpiring).toBe(false);
    });
    it('has showCountdown false when isCurrentPlayer true but isMyTurn false', () => {
      const result = toPlayerInfoViewModel(createPlayer(), true, 10, mockTurnTimer, false);
      expect(result.turnBadge?.showCountdown).toBe(false);
    });
    it('passes through turnTimer values correctly', () => {
      const customTimer = { formattedTime: '2:45', isExpiring: true };
      const result = toPlayerInfoViewModel(createPlayer(), true, 10, customTimer, true);
      expect(result.turnBadge?.formattedTime).toBe('2:45');
      expect(result.turnBadge?.isExpiring).toBe(true);
    });
  });
});
