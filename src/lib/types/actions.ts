export const MAP_ROWS = 6;
export const MAP_COLS = 5;
export const HAND_LIMIT = 7;

export const GameAction = {
  // Shared Game State Actions
  Deploy: 'deploy',
  Move: 'move',
  InitiateCombat: 'initiate-combat',
  SelectResourcePosition: 'select-resource-position',
  BuyCard: 'buy-card',
  Upgrade: 'upgrade',
  EndTurn: 'end-turn',
  BuyAbility: 'buy-ability',
  UseProductiveCard: 'use-productive-card',
  SabotagePlayer: 'sabotage-player',
  GainWealth: 'gain-wealth',
  StealResource: 'steal-resource',
  RollOnSpecialIsland: 'roll-on-special-island',
  CloseSpecialIslandDialog: 'close-special-island-dialog',
  CombatRoll: 'combat-roll',
  CloseCombat: 'close-combat',
  MonsterCombatRoll: 'monster-combat-roll',
  CloseMonsterCombat: 'close-monster-combat',
  UseCard: 'use-card',
  Scout: 'scout',
  HostLeave: 'host-leave',
  CancelAction: 'cancel-action',

  // Local UI Actions (prefixed with 'local:')
  local_DeselectArmy: 'local:deselect-army',
  local_CancelAction: 'local:cancel-action',
  local_ShowCards: 'local:show-cards',
  local_CloseCards: 'local:close-cards',
  local_OpenAbilitiesShop: 'local:open-abilities-shop',
  local_CloseAbilitiesShop: 'local:close-abilities-shop',
  local_UseCard: 'local:use-card',
  local_Position: 'local:position',
  local_Attack: 'local:attack',
} as const;

export type GameAction = (typeof GameAction)[keyof typeof GameAction];
