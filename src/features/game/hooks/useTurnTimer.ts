'use client';

import { useState, useEffect, useRef } from 'react';
import { GameAction } from '@/lib/types';

export const TURN_DURATION = 120; // 2 minutes in seconds

interface UseTurnTimerProps {
  isMyTurn: boolean;
  gameStatus: string;
  onAction: (action: GameAction, payload?: any) => void;
}

export function useTurnTimer({ isMyTurn, gameStatus, onAction }: UseTurnTimerProps) {
  const [timeLeft, setTimeLeft] = useState(TURN_DURATION);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isMyTurn && gameStatus === 'playing') {
      setTimeLeft(TURN_DURATION);

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            onAction(GameAction.EndTurn);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeLeft(TURN_DURATION);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isMyTurn, gameStatus, onAction]);

  return { timeLeft, turnDuration: TURN_DURATION };
}
