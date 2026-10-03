import type { Player } from '@/lib/types';
import { CardName, GameAction, PlayerColor } from '@/lib/types';

const buildPlayer = (overrides: Partial<Player> & { id: number; playerId: string }): Player =>
  ({
    name: `Player ${overrides.id}`,
    color: PlayerColor.Blue,
    isBot: false,
    armies: [],
    resources: { food: 0, wood: 0, gold: 0 },
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
    ...overrides,
  }) as Player;

/** No special cards at all: triggers the empty-state copy. */
export const playerWithNoCards = buildPlayer({ id: 0, playerId: 'p0', name: 'Ada', specialCards: [] });

/** A mix of usable and non-usable cards, with one duplicate. */
export const playerWithSeveralCards = buildPlayer({
  id: 1,
  playerId: 'p1',
  name: 'Bo',
  specialCards: [CardName.StealResource, CardName.StealResource, CardName.Sabotage, CardName.Overcome],
});

/** Already used a card this turn: canUseCardAbility becomes false even when canUseCards is true. */
export const playerWhoUsedACardThisTurn = buildPlayer({
  id: 2,
  playerId: 'p2',
  name: 'Cy',
  specialCards: [CardName.Sabotage],
  actionsThisTurn: [GameAction.UseCard],
});
