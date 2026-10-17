import type { PlayerColor } from '@/lib/types';
import { CENTRED_TRANSFORM, type TileVariant, type TileVariantType } from '@/modules/map/components/TileVariants/TileVariants.config';

/** A blank variant for the editor: centred, no image yet, and a colour when it is a base castle. */
export function newDraft(type: TileVariantType, color: PlayerColor | null): TileVariant {
  return {
    id: '',
    type,
    name: '',
    image: null,
    transform: { ...CENTRED_TRANSFORM },
    color: type === 'base' ? color : null,
  };
}

/** The label a variant gets in the editor's list. */
export function toListLabel(variant: TileVariant): string {
  const colour = variant.color ? ` · ${variant.color}` : '';
  return `${variant.name || 'Untitled'}${colour}`;
}
