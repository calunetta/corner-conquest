import type { ComponentPreview } from '@/testbed';
import { AdSlotView } from './AdSlot';
import {
  adsDisabledDecision,
  consentUnknownDecision,
  gdprAppliesDecision,
  gdprDoesNotApplyDecision,
  productionDecision,
} from './AdSlot.fixtures';

export const adSlotPreview: ComponentPreview = {
  slug: 'ads-ad-slot',
  title: 'Ad slot',
  group: 'Ads',
  states: [
    { name: 'Flag off (renders nothing)', render: () => <AdSlotView {...adsDisabledDecision} /> },
    { name: 'Flag on, consent unknown', render: () => <AdSlotView {...consentUnknownDecision} /> },
    { name: 'Flag on, GDPR applies', render: () => <AdSlotView {...gdprAppliesDecision} /> },
    { name: 'Flag on, GDPR does not apply', render: () => <AdSlotView {...gdprDoesNotApplyDecision} /> },
    { name: 'Production build (renders nothing)', render: () => <AdSlotView {...productionDecision} /> },
  ],
};
