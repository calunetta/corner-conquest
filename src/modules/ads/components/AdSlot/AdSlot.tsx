'use client';

import { styles } from './AdSlot.styles';
import { useAdSlot } from './AdSlot.hook';
import type { AdSlotDecision } from './AdSlot.hook';

/** Pure view: renders the dev placeholder or nothing, decided entirely by its props. */
type AdSlotViewProps = Pick<AdSlotDecision, 'showDevPlaceholder' | 'consentLabel'>;

export function AdSlotView({ showDevPlaceholder, consentLabel }: AdSlotViewProps) {
  if (!showDevPlaceholder) return null;

  return (
    <div className={styles.placeholder} data-testid="ad-slot-placeholder">
      {`Ad slot (dev placeholder — non-personalized) · consent: ${consentLabel}`}
    </div>
  );
}

/** Connected component: one line, delegates to useAdSlot(). */
export function AdSlot() {
  return <AdSlotView {...useAdSlot()} />;
}
