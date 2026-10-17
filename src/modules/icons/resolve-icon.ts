import iconRegistryJson from './icon-registry.config.json';
import iconOverridesJson from './icon-overrides.config.json';
import type { IconOverridesConfig, IconRegistryEntry } from './icon-registry.types';

export interface ResolvedIcon {
  /** Public path to render, e.g. "/sprites/icon_fight.png" or an uploaded override's path. */
  src: string;
  /** CSS transform to apply to the element that wraps the <Image>, e.g. "rotate(0deg) scale(1)". */
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
 * Looks up `id` in `iconRegistry`, applies any matching entry in `iconOverridesConfig`
 * (src/rotation/size override the registry default when present), and returns the resolved
 * image src and CSS transform.
 *
 * Throws if `id` is not in `iconRegistry`, or if the matching entry's `defaultSource.kind`
 * is `'lucide'` (this resolver only resolves image icons; the three current call sites are
 * all image-kind registry entries).
 */
export function resolveIcon(id: string): ResolvedIcon {
  const entry = findRegistryEntry(id);
  if (entry.defaultSource.kind !== 'image') {
    throw new Error(`Icon "${id}" is a lucide icon; resolveIcon only resolves image icons`);
  }

  const override = iconOverrides[id];
  const rotation = override?.rotation ?? entry.defaultRotation;
  const size = override?.size ?? entry.defaultSize;

  return {
    src: override?.src ?? entry.defaultSource.src,
    transform: toIconTransform(rotation, size),
  };
}
