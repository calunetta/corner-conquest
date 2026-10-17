import type { Island, GameSettings, IslandResource } from '@/lib/types';
import { IslandType, ResourceType, MAP_COLS, MAP_ROWS } from '@/lib/types';
import { generateMonsters, pickBossMonster } from './monster-catalog';

function generateTileResources(distance: number, baseResourceAmount: number): IslandResource[] {
  const resourceTypes: ResourceType[] = [ResourceType.Food, ResourceType.Wood, ResourceType.Gold];
  const availableResources = [...resourceTypes];

  const numResourceTypes = (distance <= 3 && Math.random() < 0.4) ? 2 : 1;
  const islandResources: IslandResource[] = [];

  if (numResourceTypes === 1) {
    const randomIndex = Math.floor(Math.random() * availableResources.length);
    const selectedResourceType = availableResources[randomIndex];
    islandResources.push({ type: selectedResourceType, amount: 2 * baseResourceAmount });
  } else {
    for (let i = 0; i < numResourceTypes; i++) {
      const randomIndex = Math.floor(Math.random() * availableResources.length);
      const selectedResourceType = availableResources.splice(randomIndex, 1)[0];
      const amount = (Math.random() < 0.5 ? 1 : 2) * baseResourceAmount;
      islandResources.push({ type: selectedResourceType, amount });
    }
  }
  return islandResources;
}

export function generateIslandTerrain(map2D: Island[][], settings: GameSettings): Island[][] {
  const center = { x: Math.floor(MAP_COLS / 2), y: Math.floor(MAP_ROWS / 2) };

  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      // Skip tiles already IslandType.Base
      if (map2D[y][x].type === IslandType.Base && map2D[y][x].owner !== undefined) continue;

      let islandType: IslandType;

      if (x === center.x && y === center.y) {
        islandType = IslandType.Monster;
        // Falls back to a regular roll if the boss pool is ever empty; the center's own distance is 0.
        const bossMonster = pickBossMonster();
        map2D[y][x].monsters = bossMonster ? [bossMonster] : generateMonsters(x, y);
        map2D[y][x].type = islandType;
        continue;
      }

      const distance = Math.abs(x - center.x) + Math.abs(y - center.y);

      const rand = Math.random();
      if (distance <= 1) {
        if (rand < settings.resourceDensity - 0.1) islandType = IslandType.Resource;
        else if (rand < 0.8) islandType = IslandType.Special;
        else islandType = IslandType.Monster;
      } else {
        if (rand < settings.resourceDensity) islandType = IslandType.Resource;
        else if (rand < 0.95) islandType = IslandType.Monster;
        else islandType = IslandType.Special;
      }

      map2D[y][x].type = islandType;

      if (islandType === IslandType.Resource) {
        map2D[y][x].resources = generateTileResources(distance, settings.baseResourceAmount);
      } else if (islandType === IslandType.Monster) {
        const monsters = generateMonsters(x, y);
        if (monsters.length === 0) {
          // No monster could be spawned for this slot, so the tile is a regular Resource tile.
          map2D[y][x].type = IslandType.Resource;
          map2D[y][x].resources = generateTileResources(distance, settings.baseResourceAmount);
        } else {
          map2D[y][x].monsters = monsters;
        }
      }
    }
  }

  return map2D;
}
