
import type { CardName } from "./types";

export const BASE_CARDS: CardName[] = [
  'Extra Move', 'Steal Resource', 'Sabotage', 'Reinforce',
  'Scout', 'Overcome', 'Wealthy', 'Productive', 'Efficient',
  'Master Builder', 'War Chief',
  'Decide Dice Roll', 'Teleport'
];

// More copies of common cards, fewer of rare ones.
export const SPECIAL_CARDS: CardName[] = [
  'Extra Move', 'Extra Move', 'Extra Move',
  'Steal Resource', 'Steal Resource',
  'Reinforce', 'Reinforce',
  'Wealthy', 'Wealthy',
  'Productive', 'Productive',
  'Efficient',
  'Master Builder',
  'War Chief',
  'Decide Dice Roll',
  'Scout',
  'Overcome',
  'Sabotage',
  'Teleport', // Only one copy
];


export const USABLE_CARDS: CardName[] = [
    'Extra Move',
    'Steal Resource',
    'Teleport',
    'Sabotage',
    'Reinforce',
    'Scout',
    'Wealthy',
    'Efficient',
    'Master Builder',
];

export const SPECIAL_CARD_DESCRIPTIONS: Record<CardName, string> = {
    'Extra Move': 'Allows one army to perform one extra Move action this turn. If used on an army that has not yet acted, it does not exhaust them.',
    'Steal Resource': 'Steal 2 resources of one type from another player.',
    'Sabotage': 'Choose an opponent to lose their next turn.',
    'Reinforce': 'Your next deployment this turn costs 0 Wheat.',
    'Scout': 'Reveal any 3 hidden tiles on the map. Does not grant discovery VP.',
    'Overcome': 'Automatically win your next battle (player or monster). This card is used during the combat dialog.',
    'Wealthy': 'Gain 5 resources of your choice.',
    'Productive': 'Double your resource collection from all positioned armies for one turn. You will be prompted at the start of your turn.',
    'Efficient': 'Your next deployment costs 50% less Wheat.',
    'Master Builder': 'Your next army upgrade costs 50% less Iron.',
    'War Chief': 'Gain +2 attack power for your next battle. This card is used during the combat dialog.',
    'Decide Dice Roll': 'When attacking a monster, choose the value of one of your dice. This card is used during the monster combat dialog.',
    'Teleport': 'Move one of your armies to any tile on the map. This action ends the army\'s turn and does not grant discovery VP.'
};
