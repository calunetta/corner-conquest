import type { Player, PlayerColor, GameSettings, CardName } from '@/lib/types';
import { ResourceType, AbilityName } from '@/lib/types';
import { BASE_CARDS } from './card-data';

export function createPlayer(
  seatIndex: number,
  playerId: string,
  name: string,
  color: PlayerColor,
  isBot: boolean,
  basePos: { x: number; y: number },
  settings: GameSettings,
  debugMode: boolean,
): Player {
  let startingCards: CardName[] = [];
  if (debugMode && !isBot) { // Only give debug cards to the human player
    startingCards = [...new Set(BASE_CARDS)];
  }

  const revealedTiles: string[] = [];
  if (settings.fogOfWar) {
    revealedTiles.push(`${basePos.x}-${basePos.y}`);
  }

  const startingResources = debugMode && !isBot
    ? { [ResourceType.Food]: 20, [ResourceType.Wood]: 20, [ResourceType.Gold]: 20 }
    : { [ResourceType.Food]: 0, [ResourceType.Wood]: 0, [ResourceType.Gold]: 0 };

  return {
    id: seatIndex,
    playerId,
    name,
    color,
    isBot,
    armies: [{ id: 0, position: basePos, hasActed: false }],
    resources: startingResources,
    armyCount: 1,
    attackPower: 0,
    nextArmyCost: settings.initialDeployCost,
    victoryPoints: 0,
    specialCards: startingCards,
    positions: [],
    hasExtraMove: false,
    actionsThisTurn: [],
    passiveAbilities: { [AbilityName.Explorer]: false, [AbilityName.Collector]: false },
    isSabotaged: false,
    efficientActive: false,
    masterBuilderActive: false,
    reinforceActive: false,
    revealedTiles,
  };
}
