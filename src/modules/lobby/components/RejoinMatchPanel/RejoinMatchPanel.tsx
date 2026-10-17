import { Button } from '@/components/ui/button';
import { RegistryIcon } from '@/modules/shared';
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
          <RegistryIcon id="loader-2" className={styles.spinner} aria-hidden />
        ) : (
          <RegistryIcon id="swords" className={styles.icon} aria-hidden />
        )}
        Resume Command
      </Button>
    </section>
  );
}
