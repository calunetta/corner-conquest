// Pure helpers for deleting a decoration image. Shared by the dev-only delete route and the editor, so both
// remove the same instances. No fs or React here.
import type { DecorationLayout, DecorationLayoutsConfig, DecorationScenarioKey } from './decoration-layouts.types';
import type { TileVariant, TileVariantsConfig } from './components/TileVariants/TileVariants.config';

export const DECORATION_IMAGE_DIR = '/sprites/decorations/';
const IMAGE_EXTENSIONS = ['.gif', '.png', '.jpg', '.jpeg', '.webp'];

/** True for a single file directly inside public/sprites/decorations/. Rejects paths that could escape it. */
export function isDecorationImagePath(value: string | null): value is string {
  if (!value || !value.startsWith(DECORATION_IMAGE_DIR)) return false;
  const fileName = value.slice(DECORATION_IMAGE_DIR.length);
  if (!fileName || fileName.includes('/') || fileName.includes('\\') || fileName.includes('..')) return false;
  return IMAGE_EXTENSIONS.some((extension) => fileName.toLowerCase().endsWith(extension));
}

/** Drops every instance that draws `image`. Returns the layout and how many instances were dropped. */
export function removeImageFromLayout(layout: DecorationLayout, image: string): { layout: DecorationLayout; removed: number } {
  const instances = layout.instances.filter((instance) => instance.image !== image);
  return { layout: { ...layout, instances }, removed: layout.instances.length - instances.length };
}

function removeImageFromLayoutList(layouts: DecorationLayout[], image: string): { layouts: DecorationLayout[]; removed: number } {
  let removed = 0;
  const next = layouts.map((layout) => {
    const result = removeImageFromLayout(layout, image);
    removed += result.removed;
    return result.layout;
  });
  return { layouts: next, removed };
}

export function removeImageFromLayouts(
  config: DecorationLayoutsConfig,
  image: string,
): { config: DecorationLayoutsConfig; removed: number } {
  let removed = 0;
  const next = {} as DecorationLayoutsConfig;
  for (const key of Object.keys(config) as DecorationScenarioKey[]) {
    const result = removeImageFromLayoutList(config[key], image);
    next[key] = result.layouts;
    removed += result.removed;
  }
  return { config: next, removed };
}

/** Drops the image from each variant's own decoration layouts. The variant pictures themselves are not touched. */
export function removeImageFromVariants(
  config: TileVariantsConfig,
  image: string,
): { config: TileVariantsConfig; removed: number } {
  let removed = 0;
  const variants = config.variants.map((variant: TileVariant) => {
    if (!variant.decorations) return variant;
    const decorations = {} as NonNullable<TileVariant['decorations']>;
    for (const key of Object.keys(variant.decorations) as DecorationScenarioKey[]) {
      const result = removeImageFromLayoutList(variant.decorations[key] ?? [], image);
      decorations[key] = result.layouts;
      removed += result.removed;
    }
    return { ...variant, decorations };
  });
  return { config: { ...config, variants }, removed };
}
