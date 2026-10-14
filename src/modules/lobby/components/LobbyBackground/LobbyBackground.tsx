'use client';

import type { CSSProperties } from 'react';
import Image from 'next/image';
import { PLAYER_DATA } from '@/modules/game-rules';
import { cn } from '@/lib/utils';
import { ISLAND_POSITIONS, ISLAND_WIDTH_PERCENT } from './LobbyBackground.layout';
import {
  BASE_OWNER_COLOR,
  createBaseKnight,
  createMonsterIslandMonster,
  createResourceIslandNodes,
  toCloudStyle,
} from './LobbyBackground.map';
import { styles } from './LobbyBackground.styles';
import { useLobbyBackground } from './LobbyBackground.hook';
import { useLobbyMonster } from './LobbyBackground.monster.hook';

// Built once at module load so the lists and monster keep a stable identity across renders.
const RESOURCE_NODES = createResourceIslandNodes();
const MONSTER = createMonsterIslandMonster();
const KNIGHT = createBaseKnight();
const BASE_CASTLE_SRC = PLAYER_DATA[BASE_OWNER_COLOR].base;

function islandStyle(position: { top: string; left: string }): CSSProperties {
  return { top: position.top, left: position.left, width: `${ISLAND_WIDTH_PERCENT}%` };
}

/** Decorative layer behind the login and lobby screens. Hidden from assistive tech and pointer-transparent. */
export function LobbyBackground() {
  const { clouds } = useLobbyBackground();
  const monster = useLobbyMonster(MONSTER);

  return (
    <div className={styles.root} aria-hidden>
      <div className={styles.sky} />
      <div className={styles.sea} />

      {clouds.map((cloud) => (
        <div key={cloud.id} className={styles.cloud} style={toCloudStyle(cloud)}>
          <Image src={cloud.sprite} alt="" fill className={styles.sprite} unoptimized />
        </div>
      ))}

      <div className={styles.island} style={islandStyle(ISLAND_POSITIONS.base)}>
        <div className={styles.islandSprite}>
          <Image src={BASE_CASTLE_SRC} alt="" fill className={styles.sprite} unoptimized />
        </div>
        <div className={styles.knight} style={KNIGHT.style}>
          <Image src={KNIGHT.src} alt="" fill className={styles.sprite} unoptimized />
        </div>
      </div>

      <div className={styles.island} style={islandStyle(ISLAND_POSITIONS.resource)}>
        {RESOURCE_NODES.map((node) => (
          <div key={node.key} className={styles.resourceNode} style={node.style}>
            <Image src={node.src} alt="" fill className={styles.sprite} unoptimized />
          </div>
        ))}
      </div>

      <div className={cn(styles.island, styles.monsterIsland)} style={islandStyle(ISLAND_POSITIONS.monster)}>
        <div className={styles.monsterSprite} style={monster.style}>
          <Image src={monster.spriteSrc} alt="" fill className={styles.sprite} unoptimized />
        </div>
      </div>
    </div>
  );
}
