import type { GameAction, GameState, ResourceType } from '@/lib/types';

/** Picks a uniformly random element, or null for an empty array. */
export function selectRandom<T>(array: T[]): T | null {
  if (array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

export function canAfford(player: GameState['players'][0], cost: number, resource: ResourceType): boolean {
  return player.resources[resource] >= cost;
}

/** A candidate move for the bot's army-actions loop, scored and sorted by `priority` (higher is better). */
export type BotAction = {
  name: string;
  priority: number;
  action: GameAction;
  payload?: unknown;
};
