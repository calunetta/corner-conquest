'use client';

import { useConsentSignal } from '@/modules/consent';
import type { ConsentSignal } from '@/modules/consent';
import { isAdPlaceholderVisible, isAdsEnabled } from '../../ads.config';

/** Consent state as shown on the dev placeholder. */
export type AdConsentLabel = 'unknown' | 'gdpr applies' | 'gdpr does not apply';

/** What AdSlot should do, decided before any ad network exists. */
export interface AdSlotDecision {
  /**
   * True once the flag is on and the consent signal allows a non-personalized ad request.
   * Fails closed on 'unknown' and on gdprApplies === true. Phase 1B's real ad tag renders when
   * this is true, in every environment.
   */
  canRequestAd: boolean;
  /**
   * Flag on and not a production build. Ignores consent: no real ad is requested yet, so there is
   * nothing for consent to gate. The placeholder shows consentLabel instead.
   */
  showDevPlaceholder: boolean;
  /** Consent state, shown on the placeholder so the team can see how consent resolves. */
  consentLabel: AdConsentLabel;
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

function toConsentLabel(signal: ConsentSignal): AdConsentLabel {
  if (signal.status !== 'ready' || signal.gdprApplies === undefined) return 'unknown';
  return signal.gdprApplies ? 'gdpr applies' : 'gdpr does not apply';
}

/** Decides whether AdSlot may request an ad, and whether the dev placeholder shows. */
export function useAdSlot(): AdSlotDecision {
  const consentSignal = useConsentSignal();

  return {
    canRequestAd: isAdsEnabled() && allowsNonPersonalizedRequest(consentSignal),
    showDevPlaceholder: isAdsEnabled() && isAdPlaceholderVisible(),
    consentLabel: toConsentLabel(consentSignal),
    requestMode: 'non-personalized',
  };
}
