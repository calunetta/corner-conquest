
export const BASE_CARDS = [
  'Extra Move', 'Steal Resource', 'Sabatoge', 'Reinforce', 
  'Scout', 'Overcome', 'Wealthy', 'Productive', 'Efficient',
  'Master Builder', 'War Chief',
  'Decide Dice Roll', 'Teleport'
];

// More copies of common cards, fewer of rare ones.
export const SPECIAL_CARDS = [
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
  'Sabatoge',
  'Teleport', // Only one copy
];


export const USABLE_CARDS = [
    'Extra Move', 
    'Steal Resource', 
    'Teleport', 
    'Sabatoge', 
    'Reinforce', 
    'Scout', 
    'Wealthy', 
    'Productive', 
    'Efficient',
    'Master Builder',
    'War Chief',
];

export const SPECIAL_CARD_DESCRIPTIONS: Record<string, string> = {
    'Extra Move': 'Take an extra move action this turn.',
    'Steal Resource': 'Steal 2 resources of one type from another player.',
    'Sabatoge': 'Choose an opponent to lose their next turn.',
    'Reinforce': 'Deploy a new army for free.',
    'Scout': 'Reveal any 3 hidden tiles on the map.',
    'Overcome': 'Automatically win your next battle (player or monster).',
    'Wealthy': 'Gain 5 resources of your choice.',
    'Productive': 'Double your resource collection for one turn.',
    'Efficient': 'Your next deployment costs 50% less food.',
    'Master Builder': 'Your next upgrade costs 50% less iron.',
    'War Chief': 'Gain +2 attack power for your next battle.',
    'Explorer': 'Passively gain 1 VP per turn for each island you have a unit on.',
    'Collector': 'Passively gain 1 resource of each type from each island you have a unit on.',
    'Decide Dice Roll': 'When attacking a monster, choose the value of one of your dice.',
    'Teleport': 'Move one of your armies to any tile on the map.'
}
