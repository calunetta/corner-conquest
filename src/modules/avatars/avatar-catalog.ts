export const AVATAR_IDS = [
  'human-01', 'human-02', 'human-03', 'human-04', 'human-05',
  'human-06', 'human-07', 'human-08', 'human-09', 'human-10',
  'human-11', 'human-12', 'human-13', 'human-14', 'human-15',
  'human-16', 'human-17', 'human-18', 'human-19', 'human-20',
  'human-21', 'human-22', 'human-23', 'human-24', 'human-25',
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

export interface AvatarCatalogEntry {
  id: AvatarId;
  /** 1-indexed position; also the ordinal used in "Avatar {position} of 25". */
  position: number;
  /** Bundled asset path, e.g. "/tiny-swords/UI Elements/UI Elements/Human Avatars/Avatars_01.png". */
  src: string;
}

// The folder names contain literal spaces; keep the path in one place.
const AVATAR_ASSET_BASE = '/tiny-swords/UI Elements/UI Elements/Human Avatars';

function toCatalogEntry(id: AvatarId, index: number): AvatarCatalogEntry {
  const position = index + 1;
  return {
    id,
    position,
    src: `${AVATAR_ASSET_BASE}/Avatars_${String(position).padStart(2, '0')}.png`,
  };
}

export const AVATAR_OPTIONS: readonly AvatarCatalogEntry[] = AVATAR_IDS.map(toCatalogEntry);

export const AVATAR_CATALOG = Object.fromEntries(
  AVATAR_OPTIONS.map((entry) => [entry.id, entry]),
) as Record<AvatarId, AvatarCatalogEntry>;

export function isValidAvatarId(id: string | null | undefined): id is AvatarId {
  return typeof id === 'string' && Object.hasOwn(AVATAR_CATALOG, id);
}

/** Resolves the image to show for a player: the chosen avatar if `avatarId` is a known id,
 *  else `colorSpriteSrc` (the caller's already-computed existing fallback). */
export function toAvatarSrc(avatarId: string | null | undefined, colorSpriteSrc: string): string {
  if (!isValidAvatarId(avatarId)) return colorSpriteSrc;
  return AVATAR_CATALOG[avatarId].src;
}
