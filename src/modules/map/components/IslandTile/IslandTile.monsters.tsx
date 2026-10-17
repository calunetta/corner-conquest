import Image from 'next/image';
import type { Monster } from '@/lib/types';
import { AnimatedMonster } from '../AnimatedMonster';
import { styles } from './IslandTile.styles';

interface MonsterIconsProps {
  monsters: Monster[];
  /** The monster-island variant, drawn behind the monsters. Null keeps the built-in look. */
  backgroundSrc: string | null;
}

export function MonsterIcons({ monsters, backgroundSrc }: MonsterIconsProps) {
  return (
    <>
      {backgroundSrc && <Image src={backgroundSrc} alt="" fill className={styles.monsterBackground} unoptimized />}
      <div className={styles.monsterStack}>
        {monsters.map((monster, i) => (
          <div key={`${monster.name}-${i}`} className={styles.monsterSlot}>
            <AnimatedMonster monster={monster} />
          </div>
        ))}
      </div>
    </>
  );
}
