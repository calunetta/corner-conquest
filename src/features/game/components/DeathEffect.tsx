'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface DeathEffectProps {
  sprite: string;
  id: string;
  createdAt?: number;
}

export const DEATH_ANIMATION_DURATION = 1200; // ms for exactly 1 playthrough

export function DeathEffect({ sprite, id, createdAt }: DeathEffectProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setIsVisible(true);
    const elapsed = createdAt ? Date.now() - createdAt : 0;
    const remaining = Math.max(100, DEATH_ANIMATION_DURATION - elapsed);

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, remaining);

    return () => clearTimeout(timer);
  }, [id, createdAt]);

  if (!isVisible) return null;

  // Append anim id to URL so browser renders from frame 0 and does not share loop timer with combat dialog
  const freshSpriteSrc = `${sprite}?anim=${id}`;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none transition-opacity duration-200">
      <Image
        key={id}
        src={freshSpriteSrc}
        alt="Death animation"
        width={64}
        height={64}
        unoptimized
        priority
      />
    </div>
  );
}
