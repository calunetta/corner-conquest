import type { AdSlotDecision } from './AdSlot.hook';

/** Shared by the tests and the testbed preview. Deterministic. */
export const adsDisabledDecision: AdSlotDecision = {
  canRequestAd: false,
  showDevPlaceholder: false,
  requestMode: 'non-personalized',
};

export const consentUnknownDecision: AdSlotDecision = {
  canRequestAd: false,
  showDevPlaceholder: false,
  requestMode: 'non-personalized',
};

export const consentDeniedDecision: AdSlotDecision = {
  canRequestAd: false,
  showDevPlaceholder: false,
  requestMode: 'non-personalized',
};

export const consentGrantedDecision: AdSlotDecision = {
  canRequestAd: true,
  showDevPlaceholder: true,
  requestMode: 'non-personalized',
};
