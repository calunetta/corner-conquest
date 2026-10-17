// Pure helpers for the fog variant upload route, kept out of route.ts (Next only allows HTTP
// handler exports there) and free of fs/Next imports so they can be unit tested directly.

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

/** PNG signature: 89 50 4E 47 0D 0A 1A 0A. */
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** GIF header starts with "GIF8" (GIF87a / GIF89a). */
const GIF_MAGIC = [0x47, 0x49, 0x46, 0x38];

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  return magic.every((byte, index) => bytes[index] === byte);
}

export function isPngBytes(bytes: Uint8Array): boolean {
  return startsWith(bytes, PNG_MAGIC);
}

export function isGifBytes(bytes: Uint8Array): boolean {
  return startsWith(bytes, GIF_MAGIC);
}

/** Lowercase id for file names and config keys, e.g. "Ember Haze!" -> "ember-haze". */
export function toVariantId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
