'use client';

import { CardFace } from '../CardFace';
import { useCardPlayOverlay } from './CardPlayOverlay.hook';
import { toStatusText } from './CardPlayOverlay.map';
import { styles } from './CardPlayOverlay.styles';
import type { CardPlayOverlayProps, CardPlayOverlayViewProps } from './CardPlayOverlay.types';

export function CardPlayOverlayView({ play, isMobile, isReducedMotion }: CardPlayOverlayViewProps) {
  return (
    <div data-testid="card-play-overlay" className={styles.root}>
      <span role="status" aria-live="polite" className="sr-only">
        {toStatusText(play)}
      </span>
      {play && (
        <>
          <div aria-hidden className={styles.vignette({ isReducedMotion })} />
          <div
            key={play.playId}
            aria-hidden
            data-testid="card-play-stage"
            className={styles.stage({ isReducedMotion })}
          >
            <CardFace cardName={play.cardName} size={isMobile ? 'hero-compact' : 'hero'} />
            <p className={styles.name({ isMobile })}>{play.cardName}</p>
          </div>
        </>
      )}
    </div>
  );
}

export function CardPlayOverlay(props: CardPlayOverlayProps) {
  return <CardPlayOverlayView {...useCardPlayOverlay(props)} />;
}
