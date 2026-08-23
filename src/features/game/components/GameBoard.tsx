'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, ChevronUp, Loader2, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { usePlayer } from '@/hooks/use-player';
import { useGameEngine } from '@/hooks/use-game-engine';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { MapGrid } from './MapGrid';
import { PlayerInfo } from '@/features/game/panels/PlayerInfo';
import { ActionsPanel } from '@/features/game/panels/ActionsPanel';
import { GameLog } from '@/features/game/panels/GameLog';
import { TutorialBeacon } from './TutorialBeacon';
import { GameBoardHeader } from './GameBoardHeader';
import { GameDialogManager } from './GameDialogManager';
import { useTurnTimer } from '../hooks/useTurnTimer';
import { useGameBoardInteractions } from '../hooks/useGameBoardInteractions';

type GameBoardProps = {
  gameId: string;
  onExit: () => void;
};

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

  const isMobile = useIsMobile();
  const [isPlayerInfoOpen, setIsPlayerInfoOpen] = useState(!isMobile);

  useEffect(() => {
    setIsPlayerInfoOpen(!isMobile);
  }, [isMobile]);

  const interactions = useGameBoardInteractions({
    gameId,
    playerId,
    serverGameState,
    localPlayerFromServer,
    isMyTurn,
    isHost,
    setGameState,
    onExit,
  });

  const { gameStateForDisplay, localPlayer, onAction } = interactions;

  const { timeLeft, turnDuration } = useTurnTimer({
    isMyTurn,
    gameStatus: serverGameState?.status || '',
    onAction,
  });

  const sortedPlayers = useMemo(() => {
    if (!gameStateForDisplay?.players) return [];
    return [...gameStateForDisplay.players].sort((a, b) => a.id - b.id);
  }, [gameStateForDisplay?.players]);

  if (isLoading || !serverGameState || !localPlayerFromServer || !gameStateForDisplay || !localPlayer) {
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

  const { status, maxPlayers, deathAnimations } = serverGameState;
  const { players, currentPlayerIndex, settings, map, debugMode, log } = gameStateForDisplay;
  const isTeleporting = interactions.pendingAction?.type === 'teleport';
  const isScouting = interactions.pendingAction?.type === 'scout';

  return (
    <div className="relative flex h-screen w-full flex-col gap-2 overflow-auto p-2 sm:gap-4 sm:p-4">
      {status !== 'finished' && (
        <>
          <GameBoardHeader
            gameState={gameStateForDisplay}
            isHost={isHost}
            isExiting={interactions.isExiting}
            onExitClick={interactions.handleExitClick}
            onStartGame={interactions.handleStartGame}
          />

          <Collapsible open={isPlayerInfoOpen} onOpenChange={setIsPlayerInfoOpen} className="w-full">
            <div className="flex items-center justify-between rounded-md bg-black/20 backdrop-blur-md border border-white/10 p-2 shadow-sm">
              <div className="flex items-center gap-4">
                <h2 className="text-base font-semibold sm:text-lg">Player Information</h2>
                {status === 'playing' && (
                  <div className="flex items-center gap-2 rounded-md bg-background/70 px-3 py-1 text-sm font-semibold">
                    <Trophy className="h-4 w-4 text-yellow-400" />
                    <span>VP Goal: {settings.victoryPointGoal}</span>
                  </div>
                )}
                <TutorialBeacon
                  id="player-info"
                  title="Player Information & Goal"
                  description="This section shows your current resources, VP, and the Victory Point goal to win the game. Gather resources by positioning armies and spend them in the Shop!"
                  side="bottom"
                />
              </div>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isPlayerInfoOpen ? <ChevronUp /> : <ChevronDown />}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
                {sortedPlayers.map(p => (
                  <PlayerInfo key={p.playerId} player={p} isCurrentPlayer={p.id === currentPlayerIndex} />
                ))}
                {status === 'waiting' &&
                  Array.from({ length: maxPlayers - players.length }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="flex h-full min-h-24 items-center justify-center rounded-lg border-2 border-dashed bg-card p-4 text-sm text-muted-foreground sm:min-h-28 sm:text-base"
                    >
                      Waiting for player...
                    </div>
                  ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="grid flex-1 grid-cols-1 justify-center gap-4 lg:grid-cols-[auto_320px]">
            <main className="relative flex items-center justify-center overflow-auto rounded-xl bg-background/20 backdrop-blur-sm border border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
              <MapGrid
                map={map}
                players={players}
                onTileClick={interactions.handleTileClick}
                possibleMoves={
                  isTeleporting && interactions.selectedArmyId !== null
                    ? map.map(t => ({ x: t.x, y: t.y }))
                    : interactions.possibleMoves
                }
                selectedTile={interactions.selectedArmy?.position || null}
                isTeleporting={isTeleporting}
                isScoutTarget={isScouting}
                deathAnimations={deathAnimations}
                fogOfWar={settings.fogOfWar}
                localPlayer={localPlayer}
                globallyRevealedTiles={serverGameState.players.reduce((acc, p) => {
                  p.revealedTiles.forEach(t => acc.add(t));
                  return acc;
                }, new Set<string>())}
                debugMode={debugMode}
              />
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
              <div className="pointer-events-none absolute bottom-4 right-4 z-20 rounded-lg bg-background/80 p-2 text-center shadow-md backdrop-blur-sm">
                {status === 'waiting' ? (
                  <p className="text-base font-semibold text-accent sm:text-lg">
                    Waiting for players... ({players.length}/{maxPlayers})
                  </p>
                ) : (
                  <p className="text-sm font-semibold text-accent sm:text-base">
                    {isMyTurn ? "Your Turn!" : `${players[currentPlayerIndex]?.name || 'Player'}'s Turn`}
                  </p>
                )}
              </div>
            </main>

            <aside className="flex flex-col gap-4">
              <ActionsPanel
                onAction={interactions.onAction}
                onLocalAction={interactions.handleLocalAction}
                localPlayer={localPlayer}
                gameState={gameStateForDisplay}
                isMyTurn={isMyTurn}
                timeLeft={timeLeft}
                turnDuration={turnDuration}
                selectedArmy={interactions.selectedArmy}
                pendingAction={interactions.pendingAction}
              />
              <GameLog logs={log} />
            </aside>
          </div>
        </>
      )}

      <GameDialogManager
        gameState={gameStateForDisplay}
        localPlayer={localPlayer}
        isMyTurn={isMyTurn}
        selectedArmyId={interactions.selectedArmyId}
        pendingAction={interactions.pendingAction}
        onAction={interactions.onAction}
        onLocalAction={interactions.handleLocalAction}
        setSelectedArmyId={interactions.setSelectedArmyId}
        setPendingAction={interactions.setPendingAction}
        cardsDialogPlayerId={interactions.cardsDialogPlayerId}
        setCardsDialogPlayerId={interactions.setCardsDialogPlayerId}
        abilitiesShopOpen={interactions.abilitiesShopOpen}
        setAbilitiesShopOpen={interactions.setAbilitiesShopOpen}
        armySelectionDialog={interactions.armySelectionDialog}
        setArmySelectionDialog={interactions.setArmySelectionDialog}
        attackSelectionDialog={interactions.attackSelectionDialog}
        setAttackSelectionDialog={interactions.setAttackSelectionDialog}
        monsterSelectionDialog={interactions.monsterSelectionDialog}
        setMonsterSelectionDialog={interactions.setMonsterSelectionDialog}
        positionDialog={interactions.positionDialog}
        setPositionDialog={interactions.setPositionDialog}
        sabotageDialog={interactions.sabotageDialog}
        setSabotageDialog={interactions.setSabotageDialog}
        wealthyDialog={interactions.wealthyDialog}
        setWealthyDialog={interactions.setWealthyDialog}
        stealResourceDialog={interactions.stealResourceDialog}
        setStealResourceDialog={interactions.setStealResourceDialog}
        specialIslandRollDialog={interactions.specialIslandRollDialog}
        setSpecialIslandRollDialog={interactions.setSpecialIslandRollDialog}
        showConfirmExitDialog={interactions.showConfirmExitDialog}
        setShowConfirmExitDialog={interactions.setShowConfirmExitDialog}
        showHostLeaveDialog={interactions.showHostLeaveDialog}
        setShowHostLeaveDialog={interactions.setShowHostLeaveDialog}
        onConfirmExit={interactions.handleConfirmExit}
        onConfirmHostLeave={interactions.handleConfirmHostLeave}
      />
    </div>
  );
}
