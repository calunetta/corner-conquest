'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import type { Monster } from '@/lib/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AnimatedMonsterProps {
  monster: Monster;
}

export function AnimatedMonster({ monster }: AnimatedMonsterProps) {
  const [isAttacking, setIsAttacking] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [horizontalOffset, setHorizontalOffset] = useState(0);
  const offsetRef = useRef(0);

  useEffect(() => {
    const animationInterval = setInterval(() => {
      const currentlyAttacking = Math.random() < 0.2;
      setIsAttacking(currentlyAttacking);

      if (!currentlyAttacking) {
        const newOffset = (Math.random() - 0.5) * 40;
        setIsFlipped(newOffset < offsetRef.current);
        offsetRef.current = newOffset;
        setHorizontalOffset(newOffset);
      }
    }, Math.random() * 1500 + 1000);

    return () => clearInterval(animationInterval);
  }, []);

  const spriteSrc = isAttacking ? monster.sprite.attack : monster.sprite.idle;
  const transform = `translateX(${horizontalOffset}%) ${isFlipped ? 'scaleX(-1)' : ''}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="relative h-full w-full flex items-center justify-center overflow-visible">
          <Image
            src={spriteSrc}
            alt={monster.name}
            width={64}
            height={64}
            className="drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] transition-transform duration-1000 ease-in-out"
            style={{ transform: isAttacking ? (isFlipped ? 'scaleX(-1)' : '') : transform }}
            unoptimized
          />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{monster.name} - Lvl: {monster.level}</p>
      </TooltipContent>
    </Tooltip>
  );
}
