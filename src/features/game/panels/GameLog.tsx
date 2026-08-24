'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGameBoard } from '../context/GameBoardContext';

export function GameLog() {
  const { gameState } = useGameBoard();
  const logs = gameState?.log || [];

  return (
    <Card className="bg-background/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      <CardHeader className="p-3 pb-1">
        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Event Log
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <ScrollArea className="h-32 sm:h-36 w-full">
          <div className="space-y-1.5 pr-2">
            {logs.map((log, index) => (
              <p key={index} className="text-xs text-muted-foreground leading-relaxed">
                {log}
              </p>
            )).reverse()}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
