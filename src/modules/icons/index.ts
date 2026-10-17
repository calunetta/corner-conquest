import iconRegistryJson from './icon-registry.config.json';
import iconOverridesJson from './icon-overrides.config.json';
import type { IconOverridesConfig, IconRegistryEntry } from './icon-registry.types';

export type {
  IconSourceKind,
  IconDefaultSource,
  IconRegistryEntry,
  IconOverride,
  IconOverridesConfig,
} from './icon-registry.types';
export { ICON_OVERRIDES_CONFIG_PATH } from './icon-registry.types';
export { resolveIcon, toIconTransform } from './resolve-icon';
export type { ResolvedIcon } from './resolve-icon';
export { getLucideGlyph } from './lucide-glyphs';

export const iconRegistry = iconRegistryJson as IconRegistryEntry[];
export const iconOverridesConfig = iconOverridesJson as IconOverridesConfig;
