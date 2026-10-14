import type { Island, Player, ResourceType } from '@/lib/types';
import { IslandType, ResourceType as ResourceTypeEnum } from '@/lib/types';
import { RESOURCE_GAIN_SPRITES } from '@/modules/shared';
import type { PulseState } from '@/modules/shared';
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

// sheep.gif has large transparent canvas padding, so its node box is scaled up to keep the
// visible sprite the same size as the other resources.
const FOOD_SCALE = 1.45;
// The farming badge is ~65% of the node's own (uninflated) box. No px floor: a floor makes
// the badge bigger than its node at small tile sizes, so mobile hides the badge instead.
const BADGE_SIZE_RATIO = 0.65;

// Float math leaks into the CSS percent strings unless rounded: 65 / 1.45 = 44.827586206896555
// (Food badge), and (39 * 1.45).toFixed(1) gives '56.5' where the spec needs 56.6, so Math.round is used instead.
function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function toNodeSize(type: ResourceType, slotSize: number): string {
  const isFood = type === ResourceTypeEnum.Food;
  return `${roundToOneDecimal(isFood ? slotSize * FOOD_SCALE : slotSize)}%`;
}

// Badge size depends only on the node's type, so every slot tier of one resource shows the same badge.
function toBadgeSize(type: ResourceType): string {
  const badgePercent = roundToOneDecimal(BADGE_SIZE_RATIO * 100);
  const isFood = type === ResourceTypeEnum.Food;
  return `${isFood ? roundToOneDecimal(badgePercent / FOOD_SCALE) : badgePercent}%`;
}

// Keyed by resource type, not node: every node of a pulsing type gets the same pulse, so a dual-slot
// gain animates both of its nodes together.
function toGainPulse(
  type: ResourceType,
  gainPulses: Partial<Record<ResourceType, PulseState>>,
): ResourceNodeViewModel['gainPulse'] {
  const pulse = gainPulses[type];
  if (!pulse?.isActive) return null;
  return { token: pulse.token, spriteSrc: RESOURCE_GAIN_SPRITES[type] };
}

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
  gainPulses: Partial<Record<ResourceType, PulseState>>,
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

    const nodeSize = toNodeSize(node.type, slot.size);

    const slotStyleEntries: Array<[string, string]> = [];
    if (slot.top) slotStyleEntries.push(['top', slot.top]);
    if (slot.bottom) slotStyleEntries.push(['bottom', slot.bottom]);
    if (slot.left) slotStyleEntries.push(['left', slot.left]);
    if (slot.right) slotStyleEntries.push(['right', slot.right]);
    if (slot.transform) slotStyleEntries.push(['transform', slot.transform]);
    const slotStyle = Object.fromEntries(slotStyleEntries);

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
            size: toBadgeSize(node.type),
          }
        : null,
      gainPulse: toGainPulse(node.type, gainPulses),
    };
  });
}
