import { useEffect, useState } from 'react';
import { DEATH_ANIMATION_DURATION } from './DeathEffect.types';
import type { DeathEffectProps, DeathEffectState } from './DeathEffect.types';

export function useDeathEffect(props: DeathEffectProps): DeathEffectState {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setIsVisible(true);
    const elapsed = props.createdAt ? Date.now() - props.createdAt : 0;
    const remaining = Math.max(100, DEATH_ANIMATION_DURATION - elapsed);

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, remaining);

    return () => clearTimeout(timer);
  }, [props.id, props.createdAt]);

  const freshSpriteSrc = `${props.sprite}?anim=${props.id}`;

  return {
    isVisible,
    freshSpriteSrc,
  };
}
