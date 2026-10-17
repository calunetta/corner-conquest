import type { ComponentPreview } from '@/testbed';
import { AdSlotView } from './AdSlot';
import {
  adsDisabledDecision,
  consentDeniedDecision,
  consentGrantedDecision,
  consentUnknownDecision,
} from './AdSlot.fixtures';

export const adSlotPreview: ComponentPreview = {
  slug: 'ads-ad-slot',
  title: 'Ad slot',
  group: 'Ads',
  states: [
    { name: 'Flag off (renders nothing)', render: () => <AdSlotView {...adsDisabledDecision} /> },
    { name: 'Flag on, consent unknown (renders nothing)', render: () => <AdSlotView {...consentUnknownDecision} /> },
    {
      name: 'Flag on, consent denied (GDPR applies, renders nothing)',
      render: () => <AdSlotView {...consentDeniedDecision} />,
    },
    {
      name: 'Flag on, consent granted (GDPR does not apply)',
      render: () => <AdSlotView {...consentGrantedDecision} />,
    },
  ],
};
