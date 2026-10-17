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

/** A default variant put back to its original look: built-in art, centred, no decorations. Its id and colour stay. */
export function toRevertedDefault(variant: TileVariant): TileVariant {
  return { ...variant, name: 'Default', image: null, transform: { ...CENTRED_TRANSFORM }, decorations: undefined };
}

/** Opens the decoration editor on this variant. The decoration editor reads `art` from the URL. */
export function toDecorationEditorHref(variant: TileVariant): string {
  return `/testbed/tile-decoration-editor?state=Editor&art=${encodeURIComponent(variant.id)}`;
}

/** True when the draft differs from the saved variant, so opening the decoration editor would drop edits. */
export function hasUnsavedChanges(draft: TileVariant, saved: TileVariant | undefined): boolean {
  return JSON.stringify(draft) !== JSON.stringify(saved ?? null);
}
