'use client';

import { useId } from 'react';
import { RegistryIcon } from '@/modules/shared';
import { useTacticalFieldGuide } from './TacticalFieldGuide.hook';
import { styles } from './TacticalFieldGuide.styles';

/**
 * Below the lg breakpoint the guide is a disclosure; at lg and up the lobby shows the
 * content in its left column and the toggle is inert, so desktop layout is unchanged.
 */
export function TacticalFieldGuide() {
  const { isExpanded, toggleExpanded } = useTacticalFieldGuide();
  const contentId = useId();

  return (
    <section className={styles.guide} aria-label="Tactical Field Guide">
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        onClick={toggleExpanded}
      >
        <span className={styles.header}>
          <RegistryIcon id="book-open" className={styles.headerIcon} />
          <span>Tactical Field Guide</span>
        </span>
        <RegistryIcon id={isExpanded ? 'chevron-up' : 'chevron-down'} className={styles.chevronIcon} aria-hidden />
      </button>
      <div id={contentId} className={isExpanded ? styles.content : `${styles.content} ${styles.contentCollapsed}`}>
        <div className={styles.item}>
          <RegistryIcon id="trophy" className={`${styles.itemIcon} text-yellow-400`} />
          <p><strong className="text-foreground">Victory Point Goal:</strong> Earn VP by discovering islands, upgrading armies, and winning battles.</p>
        </div>
        <div className={styles.item}>
          <RegistryIcon id="shield" className={`${styles.itemIcon} text-blue-400`} />
          <p><strong className="text-foreground">Positioning:</strong> Position armies on resource islands to gather food, wood, and gold — re-position each turn to keep collecting.</p>
        </div>
        <div className={styles.item}>
          <RegistryIcon id="sparkles" className={`${styles.itemIcon} text-purple-400`} />
          <p><strong className="text-foreground">Special Cards:</strong> Teleport across the sea, scout unknown fog, or sabotage opponent armies.</p>
        </div>
      </div>
    </section>
  );
}
