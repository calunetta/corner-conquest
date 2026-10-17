/** Lobby ad slot is off by default. Same pattern as isTestbedEnabled (src/testbed/testbed.config.ts). */
export function isAdsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ADS_ENABLED === 'true';
}

/**
 * True outside a production build. Governs the dev-only placeholder box that stands in for the
 * real ad network until Phase 1B wires one — never true in production, regardless of the flag.
 */
export function isAdPlaceholderVisible(): boolean {
  return process.env.NODE_ENV !== 'production';
}
