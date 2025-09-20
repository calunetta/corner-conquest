
export enum GameAction {
  Deploy = 'deploy',
  Collect = 'collect',
  Move = 'move',
  Attack = 'attack',
  Position = 'position',
  BuyCard = 'buy-card',
  Upgrade = 'upgrade',
  OpenAbilitiesShop = 'open-abilities-shop',
  CloseAbilitiesShop = 'close-abilities-shop',
  ShowCards = 'show-cards',
  CloseCards = 'close-cards',
  UseCard = 'use-card',
  ConfirmUseCard = 'confirm-use-card',
  EndTurn = 'end-turn',
  Teleport = 'teleport',
  BuyAbility = 'buy-ability',
  CancelAction = 'cancel-action',
  DeselectArmy = 'deselect-army',
  TileClick = 'tile-click',
  SelectResourcePosition = 'select-resource-position',
  ConfirmCollection = 'confirm-collection',
  SelectArmy = 'select-army',
  SelectDefender = 'select-defender',
  CombatRoll = 'combat-roll',
  CloseCombat = 'close-combat',
  CloseCombatViewer = 'close-combat-viewer',
  MonsterCombatRoll = 'monster-combat-roll',
  CloseMonsterCombat = 'close-monster-combat',
  CloseMonsterCombatViewer = 'close-monster-combat-viewer',
  StealResource = 'steal-resource',
  SabotagePlayer = 'sabotage-player',
  GainWealth = 'gain-wealth',
}

export enum CardName {
  ExtraMove = 'Extra Move',
  StealResource = 'Steal Resource',
  Sabotage = 'Sabotage',
  Reinforce = 'Reinforce',
  Scout = 'Scout',
  Overcome = 'Overcome',
  Wealthy = 'Wealthy',
  Productive = 'Productive',
  Efficient = 'Efficient',
  MasterBuilder = 'Master Builder',
  WarChief = 'War Chief',
  DecideDiceRoll = 'Decide Dice Roll',
  Teleport = 'Teleport',
}

export enum AbilityName {
  Explorer = 'explorer',
  Collector = 'collector',
}

export enum ResourceType {
    Gems = 'gems',
    Iron = 'iron',
    Food = 'food',
}

export enum IslandType {
    Base = 'base',
    Resource = 'resource',
    Monster = 'monster',
    Special = 'special',
    Empty = 'empty',
}

export enum PlayerColor {
    Blue = 'blue',
    Red = 'red',
    Purple = 'purple',
    Yellow = 'yellow',
}

export enum GameStatus {
    Waiting = 'waiting',
    Playing = 'playing',
    Finished = 'finished',
}

export enum MonsterNameEnum {
    Lancer = 'Lancer',
    Bear = 'Bear',
    Ogre = 'Ogre',
    Minotaur = 'Minotaur',
}
