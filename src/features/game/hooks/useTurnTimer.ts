'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { GameAction } from '@/lib/types';

export const TURN_DURATION = 120; // 2 minutes in seconds

interface UseTurnTimerProps {
  isMyTurn: boolean;
  gameStatus: string;
  onAction?: (action: GameAction, payload?: any) => void;
}

export function useTurnTimer({ isMyTurn, gameStatus, onAction }: UseTurnTimerProps) {
  const [timeLeft, setTimeLeft] = useState(TURN_DURATION);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onActionRef = useRef(onAction);

  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

  useEffect(() => {
    if (isMyTurn && gameStatus === 'playing') {
      setTimeLeft(TURN_DURATION);

      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            if (onActionRef.current) {
              onActionRef.current(GameAction.EndTurn);
            }
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
  }, [isMyTurn, gameStatus]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [timeLeft]);

  const isExpiring = timeLeft <= 20 && isMyTurn && gameStatus === 'playing';
  const percentage = (timeLeft / TURN_DURATION) * 100;

  return {
    timeLeft,
    formattedTime,
    turnDuration: TURN_DURATION,
    isExpiring,
    percentage,
  };
}
