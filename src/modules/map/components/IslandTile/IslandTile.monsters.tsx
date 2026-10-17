import type { Monster } from '@/lib/types';
import { AnimatedMonster } from '../AnimatedMonster';
import { PlacedVariantImage, type TileVariant } from '../TileVariants';
import { styles } from './IslandTile.styles';

interface MonsterIconsProps {
  monsters: Monster[];
  /** The monster-island variant, drawn behind the monsters. Null or a default variant draws nothing extra. */
  background: TileVariant | null;
}

export function MonsterIcons({ monsters, background }: MonsterIconsProps) {
  return (
    <>
      {background?.image && <PlacedVariantImage src={background.image} transform={background.transform} />}
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
