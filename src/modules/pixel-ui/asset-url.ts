const ASSET_ROOT = '/tiny-swords/';

/**
 * assetUrl('UI/Ribbons/Ribbon_Blue_3Slides.png') === '/tiny-swords/UI/Ribbons/Ribbon_Blue_3Slides.png'
 * Spaces become %20 (encodeURI). Input has no leading slash.
 */
export function assetUrl(path: string): string {
  return encodeURI(`${ASSET_ROOT}${path}`);
}
