import type { GameSettings } from '@/lib/types';
import { AbilityName, MAP_COLS, MAP_ROWS } from '@/lib/types';
import { BASE_CARDS } from './card-data';

export const defaultGameSettings: GameSettings = {
  victoryPointGoal: 30,
  vpPerIslandDiscovery: 1,
  initialDeployCost: 6,
  deployCostIncrement: 2,
  upgradeCost: 6,
  abilityCost: 15,
  baseResourceAmount: 1,
  resourceDensity: 0.6, // 60% chance for a tile to be resource vs monster
  availableCards: [...BASE_CARDS],
  availableAbilities: [AbilityName.Explorer, AbilityName.Collector],
  fogOfWar: true,
  gridSize: { rows: MAP_ROWS, cols: MAP_COLS },
};
