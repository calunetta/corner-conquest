export type IconSourceKind = 'lucide' | 'image';

/** A lucide glyph is named by its exported component name (e.g. "Swords"); an image icon is a
 *  public path (e.g. "/sprites/icon_fight.png"). One shape, so a future render site needs one
 *  lookup regardless of which kind the icon originally was. */
export type IconDefaultSource = { kind: 'lucide'; name: string } | { kind: 'image'; src: string };

export interface IconRegistryEntry {
  /** Stable, unique. kebab-case of the lucide name ("check-circle") or the image's basename
   *  without extension ("icon-fight"). */
  id: string;
  /** Human-readable, shown verbatim as the row label. */
  label: string;
  /** Grouping key for the Accordion sections; lowercase module-folder name, or "legacy" for the
   *  two LEGACY_PATHS-exempt files. */
  module: string;
  defaultSource: IconDefaultSource;
  /** Degrees, 0-359. Always 0 for every seeded entry (no icon is pre-rotated today). */
  defaultRotation: number;
  /** Percent, 25-200. Always 100 for every seeded entry. */
  defaultSize: number;
}

/** `src` is present once the icon has an uploaded replacement image; omitted means "still the
 *  registry's own default image" even if rotation/size are overridden. */
export interface IconOverride {
  src?: string;
  rotation?: number;
  size?: number;
}

export type IconOverridesConfig = Record<string, IconOverride>;

/** Repo-relative path of icon-overrides.config.json, used by the save API route
 *  (`path.join(process.cwd(), ICON_OVERRIDES_CONFIG_PATH)`). */
export const ICON_OVERRIDES_CONFIG_PATH = 'src/modules/icons/icon-overrides.config.json';
