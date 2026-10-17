import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toCatalogEntryKey } from '@/modules/game-rules';
import { clampLevelForBossFlag } from './MonsterSpriteUploader.map';
import { styles } from './MonsterSpriteUploader.styles';
import type { CatalogEdit, MonsterCatalogRowViewModel, MonsterLevel } from './MonsterSpriteUploader.types';

const THUMBNAIL_SIZE_PX = 32;

interface MonsterSpriteUploaderCatalogListProps {
  rows: MonsterCatalogRowViewModel[];
  pendingCatalogKey: string | null;
  catalogEditError: string | null;
  onCatalogEdit: (edit: CatalogEdit) => void;
}

/** Catalog rows. Uploaded rows get Level and Boss controls; seed rows stay read-only with a "Seed"
 *  badge. No row has a delete control. */
export function MonsterSpriteUploaderCatalogList({
  rows,
  pendingCatalogKey,
  catalogEditError,
  onCatalogEdit,
}: MonsterSpriteUploaderCatalogListProps) {
  return (
    <section className={styles.catalogSection} aria-labelledby="monster-catalog-heading">
      <h3 id="monster-catalog-heading" className={styles.sectionHeading}>
        Catalog
      </h3>
      <ul className={styles.catalogList}>
        {rows.map((row) => {
          const rowKey = toCatalogEntryKey(row.name, row.level);
          const isPending = pendingCatalogKey === rowKey;
          const changeLevel = (nextLevel: MonsterLevel): void => {
            if (nextLevel !== row.level) onCatalogEdit({ name: row.name, level: row.level, nextLevel, nextIsBoss: row.isBoss });
          };
          const changeBoss = (nextIsBoss: boolean): void =>
            onCatalogEdit({
              name: row.name,
              level: row.level,
              nextLevel: clampLevelForBossFlag(row.level, nextIsBoss) ?? row.level,
              nextIsBoss,
            });
          return (
            <li key={rowKey} className={styles.catalogRow} data-testid="monster-catalog-row">
              <Image
                src={row.idleSprite}
                alt=""
                width={THUMBNAIL_SIZE_PX}
                height={THUMBNAIL_SIZE_PX}
                className={styles.catalogThumbnail}
                unoptimized
              />
              <span className={styles.catalogName}>{row.name}</span>
              {row.isEditable ? (
                <span className={styles.catalogControls}>
                  <Select value={String(row.level)} disabled={isPending} onValueChange={(value) => changeLevel(Number(value) as MonsterLevel)}>
                    <SelectTrigger aria-label={`Level of ${row.name}`} className={styles.catalogLevelTrigger}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {row.levelOptions.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Switch aria-label={`Boss ${row.name}`} checked={row.isBoss} disabled={isPending} onCheckedChange={changeBoss} />
                  {row.isBoss && (
                    <Badge variant="outline" className={styles.bossBadge}>
                      Boss
                    </Badge>
                  )}
                </span>
              ) : (
                <span className={styles.catalogBadges}>
                  <Badge variant="outline">Lvl {row.level}</Badge>
                  {row.isBoss && (
                    <Badge variant="outline" className={styles.bossBadge}>
                      Boss
                    </Badge>
                  )}
                  <Badge variant="secondary">Seed</Badge>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {catalogEditError && (
        <p role="alert" className={styles.fieldError}>
          {catalogEditError}
        </p>
      )}
    </section>
  );
}
