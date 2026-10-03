import type { Island, GameSettings, IslandResource } from '@/lib/types';
import { IslandType, ResourceType, MAP_COLS, MAP_ROWS } from '@/lib/types';
import { MONSTER_DATA, generateMonsters } from './monster-catalog';

export function generateIslandTerrain(map2D: Island[][], settings: GameSettings): Island[][] {
  const center = { x: Math.floor(MAP_COLS / 2), y: Math.floor(MAP_ROWS / 2) };

  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      // Skip tiles already IslandType.Base
      if (map2D[y][x].type === IslandType.Base && map2D[y][x].owner !== undefined) continue;

      let islandType: IslandType;

      if (x === center.x && y === center.y) {
        islandType = IslandType.Monster;
        const bossMonsterData = MONSTER_DATA[4];
        map2D[y][x].monsters = [{
          name: bossMonsterData.name,
          level: 4,
          sprite: bossMonsterData.sprite,
        }];
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
        const resourceTypes: ResourceType[] = [ResourceType.Food, ResourceType.Wood, ResourceType.Gold];
        const availableResources = [...resourceTypes];

        const numResourceTypes = (distance <= 3 && Math.random() < 0.4) ? 2 : 1;
        const islandResources: IslandResource[] = [];

        if (numResourceTypes === 1) {
          const randomIndex = Math.floor(Math.random() * availableResources.length);
          const selectedResourceType = availableResources[randomIndex];
          islandResources.push({ type: selectedResourceType, amount: 2 * settings.baseResourceAmount });
        } else {
          for (let i = 0; i < numResourceTypes; i++) {
            const randomIndex = Math.floor(Math.random() * availableResources.length);
            const selectedResourceType = availableResources.splice(randomIndex, 1)[0];
            const amount = (Math.random() < 0.5 ? 1 : 2) * settings.baseResourceAmount;
            islandResources.push({ type: selectedResourceType, amount });
          }
        }
        map2D[y][x].resources = islandResources;
      } else if (islandType === IslandType.Monster) {
        map2D[y][x].monsters = generateMonsters(x, y);
      }
    }
  }

  return map2D;
}
