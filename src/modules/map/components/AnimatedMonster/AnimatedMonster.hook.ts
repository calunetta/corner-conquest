import { useEffect, useState, useRef } from 'react';
import type { Monster } from '@/lib/types';
import type { AnimatedMonsterState } from './AnimatedMonster.types';

export function useAnimatedMonster(monster: Monster): AnimatedMonsterState {
  const [state, setState] = useState<{
    isAttacking: boolean;
    isFlipped: boolean;
    horizontalOffset: number;
  }>({
    isAttacking: false,
    isFlipped: false,
    horizontalOffset: 0,
  });

  const offsetRef = useRef(0);

  useEffect(() => {
    const animationInterval = setInterval(() => {
      const currentlyAttacking = Math.random() < 0.25;

      if (currentlyAttacking) {
        setState((prev) => ({
          ...prev,
          isAttacking: true,
        }));
      } else {
        const newOffset = Math.round((Math.random() - 0.5) * 30);
        const flipped = newOffset < offsetRef.current;
        offsetRef.current = newOffset;

        setState({
          isAttacking: false,
          isFlipped: flipped,
          horizontalOffset: newOffset,
        });
      }
    }, Math.random() * 2500 + 3000);

    return () => clearInterval(animationInterval);
  }, []);

  const spriteSrc = state.isAttacking ? monster.sprite.attack : monster.sprite.idle;

  // Pre-branched styleTransform: when attacking, only flip (no translateX);
  // when idle, include both translateX and flip
  const styleTransform = state.isAttacking
    ? state.isFlipped
      ? 'scaleX(-1)'
      : ''
    : `translateX(${state.horizontalOffset}%) ${state.isFlipped ? 'scaleX(-1)' : ''}`;

  return {
    spriteSrc,
    styleTransform,
  };
}
