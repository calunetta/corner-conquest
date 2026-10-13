import { useEffect, useState } from 'react';
import { REVEAL_ANIMATION_DURATION, REVEAL_SPRITE_PATH } from './CardRevealEffect.types';
import type { CardRevealEffectProps, CardRevealEffectState } from './CardRevealEffect.types';

export function useCardRevealEffect(props: CardRevealEffectProps): CardRevealEffectState {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    setIsVisible(true);
    const elapsed = props.createdAt ? Date.now() - props.createdAt : 0;
    const remaining = Math.max(100, REVEAL_ANIMATION_DURATION - elapsed);

    const timer = setTimeout(() => {
      setIsVisible(false);
      props.onHidden?.();
    }, remaining);

    return () => clearTimeout(timer);
    // props.onHidden is read at timer-fire time, not a dependency: re-adding the timer whenever the
    // caller passes a new onHidden identity would restart the reveal countdown on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.id, props.createdAt]);

  const freshSpriteSrc = `${REVEAL_SPRITE_PATH}?anim=${props.id}`;

  return {
    isVisible,
    freshSpriteSrc,
  };
}
