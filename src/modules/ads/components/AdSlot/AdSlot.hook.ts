'use client';

import { useConsentSignal } from '@/modules/consent';
import type { ConsentSignal } from '@/modules/consent';
import { isAdPlaceholderVisible, isAdsEnabled } from '../../ads.config';

/** What AdSlot should do, decided before any ad network exists. */
export interface AdSlotDecision {
  /**
   * True once the flag is on and the consent signal allows a non-personalized ad request.
   * Fails closed on 'unknown' and on gdprApplies === true. Phase 1B's real ad tag renders when
   * this is true, in every environment.
   */
  canRequestAd: boolean;
  /** canRequestAd && isAdPlaceholderVisible(): stands in for the real ad until Phase 1B. */
  showDevPlaceholder: boolean;
  /** Always 'non-personalized'. Phase 1B's ad loader reads this field. */
  requestMode: 'non-personalized';
}

/**
 * The consent store cannot tell "banner shown" from "user decided" when GDPR applies, so only an
 * explicit gdprApplies === false passes. Everything else is treated as denied.
 */
function allowsNonPersonalizedRequest(signal: ConsentSignal): boolean {
  return signal.status === 'ready' && signal.gdprApplies === false;
}

/** Decides whether AdSlot may request (or, today, placeholder-render) a non-personalized ad. */
export function useAdSlot(): AdSlotDecision {
  const consentSignal = useConsentSignal();
  const canRequestAd = isAdsEnabled() && allowsNonPersonalizedRequest(consentSignal);

  return {
    canRequestAd,
    showDevPlaceholder: canRequestAd && isAdPlaceholderVisible(),
    requestMode: 'non-personalized',
  };
}
