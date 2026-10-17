import type { CSSProperties } from 'react';
import type { Monster } from '@/lib/types';
import { PlayerColor, ResourceType } from '@/lib/types';
import { PLAYER_DATA, getFirstMonsterAtLevel, toMonster } from '@/modules/game-rules';
import type { MonsterCatalogEntry } from '@/modules/game-rules';
import { RESOURCE_SPRITES } from '@/modules/map';
import {
  CLOUD_SIZE,
  KNIGHT_POSITION,
  KNIGHT_SIZE_PERCENT,
  MONSTER_POSITION,
  MONSTER_SIZE_PERCENT,
  RESOURCE_NODE_SLOTS,
} from './LobbyBackground.layout';
import type { CloudViewModel, LobbyMonsterViewModel, MonsterWanderState } from './LobbyBackground.types';

const MONSTER_ISLAND_LEVEL = 4;

/** Defense in depth: used only if the catalog has no level-4 entry, so decorative art can never crash the login screen. */
const LOBBY_MONSTER_FALLBACK: MonsterCatalogEntry = {
  name: 'Minotaur',
  level: 4,
  isBoss: true,
  sprite: { idle: '/monster/boss-minotaur-lvl4-idle.gif', attack: '/monster/boss-minotaur-lvl4-attack.gif' },
};

/** Owner of the base island's castle; the knight standing beside it uses the same colour. */
export const BASE_OWNER_COLOR = PlayerColor.Blue;

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
  return toMonster(getFirstMonsterAtLevel(MONSTER_ISLAND_LEVEL) ?? LOBBY_MONSTER_FALLBACK);
}

/** The knight on the base island, drawn in the base owner's idle sprite. */
export function createBaseKnight(): { src: string; style: CSSProperties } {
  return {
    src: PLAYER_DATA[BASE_OWNER_COLOR].sprite.idle,
    style: {
      top: KNIGHT_POSITION.top,
      left: KNIGHT_POSITION.left,
      width: `${KNIGHT_SIZE_PERCENT}%`,
      height: `${KNIGHT_SIZE_PERCENT}%`,
    },
  };
}

function toMonsterTransform(wander: MonsterWanderState): string {
  const flip = wander.isFlipped ? 'scaleX(-1)' : '';
  // The attack pose keeps the facing but does not wander sideways.
  if (wander.isAttacking) return flip;

  return `translateX(${wander.offsetPercent}%) ${flip}`.trim();
}

export function toLobbyMonsterViewModel(monster: Monster, wander: MonsterWanderState): LobbyMonsterViewModel {
  return {
    spriteSrc: wander.isAttacking ? monster.sprite.attack : monster.sprite.idle,
    style: {
      top: MONSTER_POSITION.top,
      left: MONSTER_POSITION.left,
      width: `${MONSTER_SIZE_PERCENT}%`,
      height: `${MONSTER_SIZE_PERCENT}%`,
      transform: toMonsterTransform(wander),
    },
  };
}
