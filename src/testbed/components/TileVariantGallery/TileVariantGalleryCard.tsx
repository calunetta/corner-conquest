'use client';

import { BaseCrest } from '@/modules/map/components/IslandTile/IslandTile.base';
import { SpecialIslandArt } from '@/modules/map/components/IslandTile/IslandTile.special';
import { TileDecorations } from '@/modules/map/components/TileDecorations';
import { PlacedVariantImage } from '@/modules/map/components/TileVariants';
import type { TileVariant } from '@/modules/map/components/TileVariants/TileVariants.config';
import { isDeletable, toTileSample, toVariantLabel } from './TileVariantGallery.map';
import { styles } from './TileVariantGallery.styles';

interface TileVariantGalleryCardProps {
  variant: TileVariant;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

/** The variant's own picture, or the game's built-in castle or special island. Other types use only their decorations. */
function VariantArt({ variant }: { variant: TileVariant }) {
  if (variant.image) return <PlacedVariantImage src={variant.image} transform={variant.transform} />;
  if (variant.type === 'base') return <BaseCrest color={variant.color ?? undefined} variant={variant} />;
  if (variant.type === 'special') {
    return <SpecialIslandArt variant={variant} reveal={undefined} onRevealHidden={() => undefined} />;
  }
  return null;
}

export function TileVariantGalleryCard({ variant, isSelected, onToggle }: TileVariantGalleryCardProps) {
  const sample = toTileSample(variant);
  const deletable = isDeletable(variant);

  return (
    <li className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`} data-testid="gallery-card">
      <div className={styles.tile}>
        <VariantArt variant={variant} />
        <TileDecorations island={sample.island} isBase={sample.isBase} layouts={sample.layouts} />
      </div>
      <div className="flex flex-col gap-0.5">
        <span className={styles.name}>{variant.name || 'Untitled'}</span>
        <span className={styles.id}>{variant.id}</span>
        <span className={styles.label}>{toVariantLabel(variant)}</span>
      </div>
      {deletable ? (
        <label className={styles.selectRow}>
          <input type="checkbox" checked={isSelected} onChange={() => onToggle(variant.id)} aria-label={`Select ${variant.name || variant.id}`} />
          Select for deletion
        </label>
      ) : (
        <span className={styles.defaultNote}>Default variant: cannot be deleted</span>
      )}
    </li>
  );
}
