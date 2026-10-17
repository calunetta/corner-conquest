import iconRegistryJson from './icon-registry.config.json';
import iconOverridesJson from './icon-overrides.config.json';
import type { IconDefaultSource, IconOverridesConfig, IconRegistryEntry } from './icon-registry.types';

export interface ResolvedIcon {
  /** What to render: an uploaded override's image src if one is saved for this id, else the
   *  registry's own default (a lucide glyph name or an image src). */
  source: IconDefaultSource;
  /** CSS transform for the element that wraps the rendered icon, e.g. "rotate(0deg) scale(1)". */
  transform: string;
}

const PERCENT_PER_UNIT = 100;

const iconRegistry = iconRegistryJson as IconRegistryEntry[];
const iconOverrides = iconOverridesJson as IconOverridesConfig;

/** `rotate(${rotation}deg) scale(${size / 100})`. Shared by resolveIcon and IconEditorRow. */
export function toIconTransform(rotation: number, size: number): string {
  return `rotate(${rotation}deg) scale(${size / PERCENT_PER_UNIT})`;
}

function findRegistryEntry(id: string): IconRegistryEntry {
  const entry = iconRegistry.find((candidate) => candidate.id === id);
  if (!entry) {
    throw new Error(`Unknown icon id "${id}": not in icon-registry.config.json`);
  }
  return entry;
}

/**
 * Looks up `id` in `iconRegistry` and applies any matching entry in `iconOverridesConfig`
 * (src/rotation/size override the registry default when present). An uploaded `src` replaces
 * the default source whatever its kind, so a lucide entry can be replaced by an image.
 *
 * Throws only if `id` is not in `iconRegistry`.
 */
export function resolveIcon(id: string): ResolvedIcon {
  const entry = findRegistryEntry(id);

  const override = iconOverrides[id];
  const rotation = override?.rotation ?? entry.defaultRotation;
  const size = override?.size ?? entry.defaultSize;
  const source: IconDefaultSource = override?.src
    ? { kind: 'image', src: override.src }
    : entry.defaultSource;

  return {
    source,
    transform: toIconTransform(rotation, size),
  };
}
