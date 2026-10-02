'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import type { Monster } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AnimatedMonsterProps {
  monster: Monster;
}

export const AnimatedMonster = React.memo(function AnimatedMonster({ monster }: AnimatedMonsterProps) {
  const [animState, setAnimState] = useState({
    isAttacking: false,
    isFlipped: false,
    horizontalOffset: 0,
  });
  const offsetRef = useRef(0);

  useEffect(() => {
    const animationInterval = setInterval(() => {
      const currentlyAttacking = Math.random() < 0.25;

      if (currentlyAttacking) {
        setAnimState(prev => ({
          ...prev,
          isAttacking: true,
        }));
      } else {
        const newOffset = Math.round((Math.random() - 0.5) * 30);
        const flipped = newOffset < offsetRef.current;
        offsetRef.current = newOffset;

        setAnimState({
          isAttacking: false,
          isFlipped: flipped,
          horizontalOffset: newOffset,
        });
      }
    }, Math.random() * 2500 + 3000);

    return () => clearInterval(animationInterval);
  }, []);

  const spriteSrc = animState.isAttacking ? monster.sprite.attack : monster.sprite.idle;
  const transform = `translateX(${animState.horizontalOffset}%) ${animState.isFlipped ? 'scaleX(-1)' : ''}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative h-full w-full flex items-center justify-center overflow-visible will-change-transform">
          <Image
            src={spriteSrc}
            alt={monster.name}
            width={64}
            height={64}
            className="drop-shadow-[0_8px_12px_rgba(0,0,0,0.5)] transition-transform duration-700 ease-in-out select-none"
            style={{ transform: animState.isAttacking ? (animState.isFlipped ? 'scaleX(-1)' : '') : transform }}
            unoptimized
          />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{monster.name} - Lvl: {monster.level}</p>
      </TooltipContent>
    </Tooltip>
  );
});
