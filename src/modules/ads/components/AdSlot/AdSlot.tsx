'use client';

import { styles } from './AdSlot.styles';
import { useAdSlot } from './AdSlot.hook';
import type { AdSlotDecision } from './AdSlot.hook';

/** Pure view: renders the dev placeholder or nothing, decided entirely by its prop. */
export function AdSlotView({ showDevPlaceholder }: Pick<AdSlotDecision, 'showDevPlaceholder'>) {
  if (!showDevPlaceholder) return null;

  return (
    <div className={styles.placeholder} data-testid="ad-slot-placeholder">
      Ad slot (dev placeholder — non-personalized)
    </div>
  );
}

/** Connected component: one line, delegates to useAdSlot(). */
export function AdSlot() {
  return <AdSlotView {...useAdSlot()} />;
}
