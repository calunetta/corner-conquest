export const CardName = {
  ExtraMove: 'Extra Move',
  StealResource: 'Steal Resource',
  Sabotage: 'Sabotage',
  Reinforce: 'Reinforce',
  Scout: 'Scout',
  Overcome: 'Overcome',
  Wealthy: 'Wealthy',
  Productive: 'Productive',
  Efficient: 'Efficient',
  MasterBuilder: 'Master Builder',
  WarChief: 'War Chief',
  DecideDiceRoll: 'Decide Dice Roll',
  Teleport: 'Teleport',
} as const;
export type CardName = (typeof CardName)[keyof typeof CardName];

export const AbilityName = {
  Explorer: 'explorer',
  Collector: 'collector',
} as const;
export type AbilityName = (typeof AbilityName)[keyof typeof AbilityName];

export const ResourceType = {
  Gems: 'gems',
  Iron: 'iron',
  Wheat: 'wheat',
} as const;
export type ResourceType = (typeof ResourceType)[keyof typeof ResourceType];

export type PassiveAbilities = {
  [key in AbilityName]?: boolean;
};
