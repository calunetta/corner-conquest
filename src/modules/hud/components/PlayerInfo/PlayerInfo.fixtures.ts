import type { Player } from '@/lib/types';
import { CardName } from '@/lib/types';
import type { PlayerInfoViewModel } from './PlayerInfo.types';

const samplePlayer: Player = {
  id: 0,
  playerId: 'player-0',
  name: 'You',
  color: 'blue',
  isBot: false,
  armies: [
    { id: 0, position: { x: 5, y: 5 }, hasActed: false },
    { id: 1, position: { x: 6, y: 5 }, hasActed: true },
  ],
  resources: { food: 15, wood: 8, gold: 10 },
  armyCount: 2,
  attackPower: 2,
  nextArmyCost: 10,
  victoryPoints: 18,
  specialCards: [CardName.Scout, CardName.Reinforce],
  positions: [{ x: 5, y: 5, resource: 'food', armyId: 0 }],
  passiveAbilities: { collector: true, explorer: false },
  isSabotaged: false,
  reinforceActive: true,
  efficientActive: false,
  masterBuilderActive: false,
  hasExtraMove: false,
  actionsThisTurn: [],
  revealedTiles: [],
};

export const currentPlayerWithBuffs: PlayerInfoViewModel = {
  name: 'You',
  color: 'blue',
  isBot: false,
  isCurrentPlayer: true,
  spriteSrc: '/sprites/blue.gif',
  armyCount: 2,
  positionedCount: 1,
  victoryPoints: 18,
  vpGoal: 30,
  vpPercent: 60,
  specialCardsCount: 2,
  specialCards: [CardName.Scout, CardName.Reinforce],
  attackPower: 2,
  resources: [
    { type: 'food', label: 'Food', value: 15 },
    { type: 'wood', label: 'Wood', value: 8 },
    { type: 'gold', label: 'Gold', value: 10 },
  ],
  buffs: [
    { id: 'collector', label: 'Collector', description: 'Collector: +1 extra food on harvest' },
    { id: 'reinforce', label: 'Reinforce', description: 'Reinforce active: next deploy is free' },
  ],
  turnBadge: {
    showCountdown: true,
    formattedTime: '1:23',
    isExpiring: false,
  },
};

export const botPlayerNoBuffs: PlayerInfoViewModel = {
  name: 'Bot Rex',
  color: 'red',
  isBot: true,
  isCurrentPlayer: false,
  spriteSrc: '/sprites/red.gif',
  armyCount: 3,
  positionedCount: 0,
  victoryPoints: 12,
  vpGoal: 30,
  vpPercent: 40,
  specialCardsCount: 1,
  specialCards: [CardName.Scout],
  attackPower: 1,
  resources: [
    { type: 'food', label: 'Food', value: 5 },
    { type: 'wood', label: 'Wood', value: 3 },
    { type: 'gold', label: 'Gold', value: 7 },
  ],
  buffs: [],
  turnBadge: null,
};

export const playerNearGoal: PlayerInfoViewModel = {
  name: 'Mira',
  color: 'purple',
  isBot: false,
  isCurrentPlayer: false,
  spriteSrc: '/sprites/purple.gif',
  armyCount: 4,
  positionedCount: 2,
  victoryPoints: 29,
  vpGoal: 30,
  vpPercent: 97,
  specialCardsCount: 3,
  specialCards: [CardName.ExtraMove, CardName.StealResource, CardName.Sabotage],
  attackPower: 4,
  resources: [
    { type: 'food', label: 'Food', value: 25 },
    { type: 'wood', label: 'Wood', value: 20 },
    { type: 'gold', label: 'Gold', value: 30 },
  ],
  buffs: [
    { id: 'explorer', label: 'Explorer', description: 'Explorer: +1 extra movement range' },
    { id: 'efficient', label: 'Efficient', description: 'Efficient active: next deploy 50% off' },
  ],
  turnBadge: null,
};

export { samplePlayer };
