'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ComponentPreview } from '@/testbed';
import { Button } from '@/components/ui/button';
import { CardPlayOverlayView } from './CardPlayOverlay';
import { toPlayDurationMs } from './CardPlayOverlay.map';
import { warChiefPlay } from './CardPlayOverlay.fixtures';
import type { CardPlay } from './CardPlayOverlay.types';

interface OverlayDemoProps {
  isMobile: boolean;
  isReducedMotion: boolean;
}

/** Plays the overlay view with forced flags; Replay bumps playId and re-arms the end timer. */
function OverlayDemo({ isMobile, isReducedMotion }: OverlayDemoProps) {
  const [play, setPlay] = useState<CardPlay | null>(warChiefPlay);
  const playId = play?.playId;
  const endPlay = useCallback(() => setPlay(null), []);

  useEffect(() => {
    if (playId === undefined) return;
    const timer = setTimeout(endPlay, toPlayDurationMs(isReducedMotion));
    return () => clearTimeout(timer);
  }, [playId, isReducedMotion, endPlay]);

  const replay = () => setPlay((current) => ({ ...warChiefPlay, playId: (current?.playId ?? 0) + 1 }));

  return (
    <div className="relative min-h-[400px] p-4">
      <Button onClick={replay} className="relative z-50 mb-4">
        Replay
      </Button>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 12 }, (_, index) => (
          <Button key={index} variant="outline" onClick={() => undefined}>
            Underlay {index + 1}
          </Button>
        ))}
      </div>
      <CardPlayOverlayView play={play} isMobile={isMobile} isReducedMotion={isReducedMotion} />
    </div>
  );
}

export const cardPlayOverlayPreview: ComponentPreview = {
  slug: 'cards-card-play-overlay',
  title: 'Card play overlay',
  group: 'Cards',
  states: [
    { name: 'Full motion', render: () => <OverlayDemo isMobile={false} isReducedMotion={false} /> },
    { name: 'Reduced motion', render: () => <OverlayDemo isMobile={false} isReducedMotion /> },
    { name: 'Mobile size', render: () => <OverlayDemo isMobile isReducedMotion={false} /> },
  ],
};
