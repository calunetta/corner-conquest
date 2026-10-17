import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { styles } from './MonsterSpriteUploader.styles';
import type { MonsterCatalogRowViewModel } from './MonsterSpriteUploader.types';

const THUMBNAIL_SIZE_PX = 32;

interface MonsterSpriteUploaderCatalogListProps {
  rows: MonsterCatalogRowViewModel[];
}

/** Read-only catalog rows. Seed rows carry a "Seed" badge; no row has a delete control. */
export function MonsterSpriteUploaderCatalogList({ rows }: MonsterSpriteUploaderCatalogListProps) {
  return (
    <section className={styles.catalogSection} aria-labelledby="monster-catalog-heading">
      <h3 id="monster-catalog-heading" className={styles.sectionHeading}>
        Catalog
      </h3>
      <ul className={styles.catalogList}>
        {rows.map((row) => (
          <li key={`${row.name}|${row.level}`} className={styles.catalogRow} data-testid="monster-catalog-row">
            <Image
              src={row.idleSprite}
              alt=""
              width={THUMBNAIL_SIZE_PX}
              height={THUMBNAIL_SIZE_PX}
              className={styles.catalogThumbnail}
              unoptimized
            />
            <span className={styles.catalogName}>{row.name}</span>
            <span className={styles.catalogBadges}>
              <Badge variant="outline">Lvl {row.level}</Badge>
              {row.isBoss && (
                <Badge variant="outline" className={styles.bossBadge}>
                  Boss
                </Badge>
              )}
              {row.isSeed && <Badge variant="secondary">Seed</Badge>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
