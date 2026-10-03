'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { usePlayer } from '@/hooks/use-player';
import { useGameEngine } from '@/hooks/use-game-engine';
import { MapGrid } from './MapGrid';
import { ActionsPanel, GameLog } from '@/modules/hud';
import { TutorialBeacon } from './TutorialBeacon';
import { GameBoardHeader, GameStatusBadge } from '@/modules/hud';
import { PlayerInfoBar } from './PlayerInfoBar';
import { GameDialogManager } from './GameDialogManager';
import { GameBoardProvider, useGameBoard } from '../context/GameBoardContext';

type GameBoardProps = {
  gameId: string;
  onExit: () => void;
};

function GameBoardContent() {
  const { gameState } = useGameBoard();

  return (
    <div className="relative flex min-h-screen lg:h-screen lg:max-h-screen w-full flex-col gap-2 overflow-y-auto lg:overflow-hidden p-2 sm:p-3 bg-gradient-to-b from-background via-background/95 to-black/90">
      {gameState.status !== 'finished' && (
        <>
          <GameBoardHeader />

          {/* 3-Column Viewport Constrained Board Layout */}
          <div className="flex flex-col lg:flex-row gap-2.5 sm:gap-3 flex-1 min-h-0 items-stretch">
            {/* Left: Colonist-style Players HUD */}
            <PlayerInfoBar />

            {/* Center: Scaled Arena Map Canvas with dedicated mobile height */}
            <main className="relative flex-1 min-h-[420px] sm:min-h-[500px] lg:min-h-0 flex items-center justify-center overflow-hidden rounded-2xl bg-background/20 backdrop-blur-sm border border-white/10 shadow-[inset_0_0_30px_rgba(0,0,0,0.6)] p-2">
              <MapGrid />
              <div className="absolute top-3 left-3 z-20">
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

            {/* Right: Actions & Match Event Log */}
            <aside className="w-full lg:w-[310px] xl:w-[340px] lg:shrink-0 flex flex-col gap-2.5 min-h-0 overflow-y-auto custom-scrollbar">
              <ActionsPanel
                infoBeacon={
                  <TutorialBeacon
                    id="actions-info"
                    title="The Actions Panel"
                    description="Use this panel to command your armies, deploy new ones, buy special cards, and upgrade your attack power. Hover over any button to see what it does!"
                    side="top"
                  />
                }
              />
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
