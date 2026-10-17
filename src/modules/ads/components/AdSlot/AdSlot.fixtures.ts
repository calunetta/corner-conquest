import type { AdSlotDecision } from './AdSlot.hook';

/** Shared by the tests and the testbed preview. Deterministic. */
export const adsDisabledDecision: AdSlotDecision = {
  canRequestAd: false,
  showDevPlaceholder: false,
  consentLabel: 'unknown',
  requestMode: 'non-personalized',
};

export const productionDecision: AdSlotDecision = {
  canRequestAd: false,
  showDevPlaceholder: false,
  consentLabel: 'unknown',
  requestMode: 'non-personalized',
};

export const consentUnknownDecision: AdSlotDecision = {
  canRequestAd: false,
  showDevPlaceholder: true,
  consentLabel: 'unknown',
  requestMode: 'non-personalized',
};

export const gdprAppliesDecision: AdSlotDecision = {
  canRequestAd: false,
  showDevPlaceholder: true,
  consentLabel: 'gdpr applies',
  requestMode: 'non-personalized',
};

export const gdprDoesNotApplyDecision: AdSlotDecision = {
  canRequestAd: true,
  showDevPlaceholder: true,
  consentLabel: 'gdpr does not apply',
  requestMode: 'non-personalized',
};
