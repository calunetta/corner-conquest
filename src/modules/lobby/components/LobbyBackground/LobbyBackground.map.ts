import type { CSSProperties } from 'react';
import type { Monster } from '@/lib/types';
import { ResourceType } from '@/lib/types';
import { MONSTER_DATA } from '@/modules/game-rules';
import { RESOURCE_SPRITES } from '@/modules/map';
import { CLOUD_SIZE, RESOURCE_NODE_SLOTS } from './LobbyBackground.layout';
import type { CloudViewModel } from './LobbyBackground.types';

/** Level 4 in MONSTER_DATA is the Minotaur. */
const MONSTER_ISLAND_LEVEL = 4;

/** Index-aligned with RESOURCE_NODE_SLOTS. */
const RESOURCE_TYPES_BY_SLOT = [ResourceType.Food, ResourceType.Wood, ResourceType.Gold] as const;

export function toCloudStyle(cloud: CloudViewModel): CSSProperties {
  return {
    left: `${cloud.left}%`,
    top: `${cloud.top}%`,
    width: CLOUD_SIZE.width,
    height: CLOUD_SIZE.height,
    animationDuration: `${cloud.durationSeconds}s`,
    scale: cloud.scale,
  };
}

function toResourceNodeStyle(slot: (typeof RESOURCE_NODE_SLOTS)[number]): CSSProperties {
  return {
    top: slot.top,
    left: slot.left,
    width: `${slot.sizePercent}%`,
    height: `${slot.sizePercent}%`,
  };
}

/** The three resource nodes on the resource island, one per resource type. */
export function createResourceIslandNodes(): Array<{ key: string; src: string; style: CSSProperties }> {
  return RESOURCE_TYPES_BY_SLOT.map((resource, index) => ({
    key: resource,
    src: RESOURCE_SPRITES[resource].sprite,
    style: toResourceNodeStyle(RESOURCE_NODE_SLOTS[index]),
  }));
}

export function createMonsterIslandMonster(): Monster {
  const { name, sprite } = MONSTER_DATA[MONSTER_ISLAND_LEVEL];

  return { name, level: MONSTER_ISLAND_LEVEL, sprite };
}
