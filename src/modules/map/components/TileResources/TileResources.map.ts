import type { Island, Player, ResourceType } from '@/lib/types';
import { IslandType, ResourceType as ResourceTypeEnum } from '@/lib/types';
import type { ResourceNodeViewModel } from './TileResources.types';
import {
  SINGLE_RESOURCE_SLOT,
  DUAL_RESOURCE_SLOTS,
  TRIPLE_RESOURCE_SLOTS,
  BASE_RESOURCE_SLOTS,
} from '../../island-tile-slots.types';
import type { SlotDef } from '../../island-tile-slots.types';

export const FARM_SPRITES = {
  blue: '/sprites/farm_blue.gif',
  red: '/sprites/farm_red.gif',
  purple: '/sprites/farm_purple.gif',
  yellow: '/sprites/farm_yellow.gif',
} as const;

export const RESOURCE_SPRITES = {
  [ResourceTypeEnum.Food]: {
    sprite: '/sprites/sheep.gif',
    activeSprite: '/sprites/sheep.gif',
  },
  [ResourceTypeEnum.Wood]: {
    sprite: '/sprites/tree.gif',
    activeSprite: '/sprites/tree.gif',
  },
  [ResourceTypeEnum.Gold]: {
    sprite: '/sprites/mine.png',
    activeSprite: '/sprites/mine_active.png',
  },
} as const;

// The farming badge is ~55% of the node's reference size, never smaller than 22px.
const BADGE_SIZE_RATIO = 0.55;
const BADGE_MIN_SIZE = 22;

function getSlot(idx: number, total: number, isBase: boolean): SlotDef {
  if (isBase) {
    return BASE_RESOURCE_SLOTS[idx % BASE_RESOURCE_SLOTS.length];
  }
  if (total === 1) {
    return SINGLE_RESOURCE_SLOT;
  }
  if (total === 2) {
    return DUAL_RESOURCE_SLOTS[idx % DUAL_RESOURCE_SLOTS.length];
  }
  return TRIPLE_RESOURCE_SLOTS[idx % TRIPLE_RESOURCE_SLOTS.length];
}

export function toTileResourcesViewModel(
  island: Island,
  isBase: boolean,
  players: Player[],
): ResourceNodeViewModel[] | null {
  const { resources, positionedBy = [], type: islandType, monsters } = island;

  // Monsters on tile suppress resources until defeated
  if (islandType === IslandType.Monster && monsters && monsters.length > 0) {
    return null;
  }

  if (!resources || resources.length === 0) {
    return null;
  }

  // Expand resource amounts into individual distinct nodes
  interface ExpandedResourceNode {
    type: ResourceType;
    nodeIndex: number;
    totalForType: number;
  }

  const expandedNodes: ExpandedResourceNode[] = [];
  resources.forEach((r) => {
    const count = isBase ? 1 : Math.max(1, r.amount || 1);
    for (let i = 0; i < count; i++) {
      expandedNodes.push({
        type: r.type,
        nodeIndex: i,
        totalForType: count,
      });
    }
  });

  return expandedNodes.map((node, idx) => {
    const slot = getSlot(idx, expandedNodes.length, isBase);
    const positionInfo = positionedBy.find((p) => p.resource === node.type);
    const positionedPlayer = positionInfo ? players.find((p) => p.id === positionInfo.playerId) : null;

    const isFarmedNode = !!positionedPlayer;
    const spriteConfig = RESOURCE_SPRITES[node.type];
    const spriteSrc = isFarmedNode ? spriteConfig.activeSprite : spriteConfig.sprite;

    // Food sprite (sheep.gif) has large transparent canvas padding, so scale its bounding box by 1.45x
    const nodeSize =
      node.type === ResourceTypeEnum.Food ? Math.round(slot.size * 1.45) : slot.size;

    const slotStyleEntries: Array<[string, string]> = [];
    if (slot.top) slotStyleEntries.push(['top', slot.top]);
    if (slot.bottom) slotStyleEntries.push(['bottom', slot.bottom]);
    if (slot.left) slotStyleEntries.push(['left', slot.left]);
    if (slot.right) slotStyleEntries.push(['right', slot.right]);
    if (slot.transform) slotStyleEntries.push(['transform', slot.transform]);
    if (slot.width) slotStyleEntries.push(['width', slot.width]);
    if (slot.height) slotStyleEntries.push(['height', slot.height]);
    const slotStyle = Object.fromEntries(slotStyleEntries);

    // Badge geometry uses the pre-Food-scale slot size so every resource type gets the same badge.
    const uninflatedSize = slot.size;
    const badgeSize = Math.max(BADGE_MIN_SIZE, Math.round(uninflatedSize * BADGE_SIZE_RATIO));
    const badgeSide: 'left' | 'right' =
      slot.right !== undefined && slot.left === undefined ? 'left' : 'right';
    const badgeOffset = Math.round((nodeSize - uninflatedSize) / 2 - badgeSize / 2);

    return {
      type: node.type,
      key: `resource-node-${node.type}-${idx}`,
      spriteSrc,
      nodeSize,
      slotStyle: slotStyle as Record<string, string>,
      farmingCollector: positionedPlayer
        ? {
            color: positionedPlayer.color,
            sprite: FARM_SPRITES[positionedPlayer.color],
            size: badgeSize,
            side: badgeSide,
            offset: badgeOffset,
          }
        : null,
    };
  });
}
