import { Button } from '@/components/ui/button';
import { Loader2, Swords } from 'lucide-react';
import { styles } from './RejoinMatchPanel.styles';
import type { RejoinMatchPanelProps } from './RejoinMatchPanel.types';

/** Shown instead of the create/join lobby while the player's seat is still held in a match. */
export function RejoinMatchPanel({ game, isReclaiming, onReclaim }: RejoinMatchPanelProps) {
  return (
    <section className={styles.root} aria-labelledby="rejoin-match-heading">
      <h3 id="rejoin-match-heading" className={styles.matchName}>
        {game.name}
      </h3>
      <p className={styles.description}>Your seat is bot-controlled.</p>
      <Button onClick={onReclaim} disabled={isReclaiming} className={styles.reclaimButton}>
        {isReclaiming ? (
          <Loader2 className={styles.spinner} aria-hidden data-testid="reclaim-spinner" />
        ) : (
          <Swords className={styles.icon} aria-hidden />
        )}
        Resume Command
      </Button>
    </section>
  );
}
