export const SPECIAL_CARDS = [
  'Extra Move', 'Steal Resource', 'Extra VP', 'Sabatoge', 'Reinforce', 
  'Scout', 'Overcome', 'Wealthy', 'Productive', 'Efficient',
  'Master Builder', 'War Chief', 'Diplomat', 'Explorer', 'Collector'
];

export const SPECIAL_CARD_DESCRIPTIONS: Record<string, string> = {
    'Extra Move': 'Take an extra move action this turn.',
    'Steal Resource': 'Steal 2 resources of one type from another player.',
    'Extra VP': 'Gain 2 free Victory Points.',
    'Sabatoge': 'Choose an opponent to lose their next turn.',
    'Reinforce': 'Deploy a new army for free.',
    'Scout': 'Reveal any 3 hidden tiles on the map.',
    'Overcome': 'Automatically win your next battle (player or monster).',
    'Wealthy': 'Gain 5 resources of your choice.',
    'Productive': 'Double your resource collection for one turn.',
    'Efficient': 'Your next deployment costs 50% less food.',
    'Master Builder': 'Your next upgrade costs 50% less iron.',
    'War Chief': 'Gain +2 attack power for your next battle.',
    'Diplomat': 'Force a truce. No players can attack you for one round.',
    'Explorer': 'Gain 1 VP for each island you have a unit on.',
    'Collector': 'Gain 1 resource of each type for each island you have a unit on.'
}
