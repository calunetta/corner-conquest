'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { usePlayer } from '@/hooks/use-player';
import { useGameEngine } from '@/hooks/use-game-engine';
import { MapGrid } from './MapGrid';
import { ActionsPanel } from '@/features/game/panels/ActionsPanel';
import { GameLog } from '@/features/game/panels/GameLog';
import { TutorialBeacon } from './TutorialBeacon';
import { GameBoardHeader } from './GameBoardHeader';
import { PlayerInfoBar } from './PlayerInfoBar';
import { GameStatusBadge } from './GameStatusBadge';
import { GameDialogManager } from './GameDialogManager';
import { GameBoardProvider, useGameBoard } from '../context/GameBoardContext';

type GameBoardProps = {
  gameId: string;
  onExit: () => void;
};

function GameBoardContent() {
  const { gameState } = useGameBoard();

  return (
    <div className="relative flex h-screen w-full flex-col gap-2 overflow-auto p-2 sm:gap-4 sm:p-4">
      {gameState.status !== 'finished' && (
        <>
          <GameBoardHeader />
          <PlayerInfoBar />

          <div className="grid flex-1 grid-cols-1 justify-center gap-4 lg:grid-cols-[auto_320px]">
            <main className="relative flex items-center justify-center overflow-auto rounded-xl bg-background/20 backdrop-blur-sm border border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
              <MapGrid />
              <div className="absolute top-4 left-4 z-20">
                <TutorialBeacon
                  id="map-info"
                  title="The Map & Movement"
                  description={
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Click an army to select it, then click an adjacent island to move.</li>
                      <li>Move onto Resource Islands and click "Position" to gather resources automatically every turn.</li>
                      <li>Move onto occupied islands or monsters to initiate Combat!</li>
                    </ul>
                  }
                  side="right"
                />
              </div>
              <GameStatusBadge />
            </main>

            <aside className="flex flex-col gap-4">
              <ActionsPanel />
              <GameLog />
            </aside>
          </div>
        </>
      )}

      <GameDialogManager />
    </div>
  );
}

export function GameBoard({ gameId, onExit }: GameBoardProps) {
  const { playerId } = usePlayer();
  const {
    gameState: serverGameState,
    setGameState,
    isMyTurn,
    localPlayer: localPlayerFromServer,
    isHost,
    isLoading,
  } = useGameEngine(gameId, playerId);

  if (isLoading || !serverGameState || !localPlayerFromServer) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-4 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 text-lg">
          {!localPlayerFromServer && !isLoading
            ? 'You are not in this game. Returning to lobby...'
            : 'Joining game session...'}
        </p>
      </div>
    );
  }

  return (
    <GameBoardProvider
      gameId={gameId}
      playerId={playerId}
      serverGameState={serverGameState}
      localPlayerFromServer={localPlayerFromServer}
      isMyTurn={isMyTurn}
      isHost={isHost}
      setGameState={setGameState}
      onExit={onExit}
    >
      <GameBoardContent />
    </GameBoardProvider>
  );
}
