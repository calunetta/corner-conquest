'use client';

import { isDeletable, isGroupFullySelected } from './TileVariantGallery.map';
import { styles } from './TileVariantGallery.styles';
import { TileVariantGalleryCard } from './TileVariantGalleryCard';
import type { VariantGroup } from './TileVariantGallery.types';

interface TileVariantGalleryGroupProps {
  group: VariantGroup;
  selected: ReadonlySet<string>;
  onToggleVariant: (id: string) => void;
  onToggleGroup: (group: VariantGroup) => void;
  disabled: boolean;
}

export function TileVariantGalleryGroup({ group, selected, onToggleVariant, onToggleGroup, disabled }: TileVariantGalleryGroupProps) {
  const hasDeletable = group.variants.some(isDeletable);
  const isFullySelected = isGroupFullySelected(selected, group);

  return (
    <section className={styles.group} aria-label={group.label}>
      <div className={styles.groupHeader}>
        <h3 className={styles.groupTitle}>
          {group.label} ({group.variants.length})
        </h3>
        {hasDeletable && (
          <button type="button" className={styles.button} onClick={() => onToggleGroup(group)} disabled={disabled}>
            {isFullySelected ? 'Clear group' : 'Select all in group'}
          </button>
        )}
      </div>
      <ul className={styles.grid}>
        {group.variants.map((variant) => (
          <TileVariantGalleryCard
            key={variant.id}
            variant={variant}
            isSelected={selected.has(variant.id)}
            onToggle={disabled ? () => undefined : onToggleVariant}
          />
        ))}
      </ul>
    </section>
  );
}
