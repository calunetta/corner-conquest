
'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import type { GameAction, GameState, Island } from '@/lib/types';
import { MapGrid } from './MapGrid';
import { PlayerInfo } from './PlayerInfo';
import { ActionsPanel } from './ActionsPanel';
import { GameLog } from './GameLog';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, Loader2, ArrowLeft, Play, Trophy, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { GameDialogs } from './GameDialogs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { usePlayer } from '@/hooks/use-player';
import { useGameEngine } from '@/hooks/use-game-engine';
import * as GameActions from '@/lib/game-actions';
import { startGame } from '@/lib/game-initializer';
import { useIsMobile } from '@/hooks/use-mobile';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import Image from 'next/image';
import { TILE_GAP, TILE_SIZE } from '@/lib/game-logic';

const TURN_DURATION = 120; // 2 minutes in seconds

type GameBoardProps = {
    gameId: string;
    onExit: () => void;
};

const ROCK_SPRITES = [
    '/sprites/small_rock.gif',
    '/sprites/mini_rock.gif',
    '/sprites/medium_rock.gif',
    '/sprites/big_rock.gif',
];

const generateDecorations = (map: Island[][]) => {
    const decorations: { src: string; x: number; y: number; size: number, style: React.CSSProperties }[] = [];
    if (!map || map.length === 0) return [];
    const mapSize = map.length;

    map.flat().forEach(island => {
        const rockCount = 1 + Math.floor(Math.random() * 3); // 1 to 3 rocks per island
        
        let possibleSides = [0, 1, 2, 3]; // 0: top, 1: right, 2: bottom, 3: left
        if (island.y === 0) possibleSides = possibleSides.filter(s => s !== 0);
        if (island.x === mapSize - 1) possibleSides = possibleSides.filter(s => s !== 1);
        if (island.y === mapSize - 1) possibleSides = possibleSides.filter(s => s !== 2);
        if (island.x === 0) possibleSides = possibleSides.filter(s => s !== 3);


        for (let i = 0; i < rockCount; i++) {
            if (possibleSides.length === 0) break;

            const rockSrc = ROCK_SPRITES[Math.floor(Math.random() * ROCK_SPRITES.length)];
            
            // Allow rocks to cluster by not removing the side after selection
            const side = possibleSides[Math.floor(Math.random() * possibleSides.length)];

            const offset = (Math.random() - 0.5) * 50; // -25% to +25% offset along the side
            const size = Math.random() * 20 + 12; // Random size between 12px and 32px

            let style: React.CSSProperties = {
                position: 'absolute',
                zIndex: 5,
                pointerEvents: 'none',
                width: `${size}px`,
                height: `${size}px`,
            };

            switch(side) {
                case 0: // Top
                    style.top = '-25%';
                    style.left = `${50 + offset}%`;
                    style.transform = 'translateX(-50%)';
                    break;
                case 1: // Right
                    style.top = `${50 + offset}%`;
                    style.right = '-25%';
                    style.transform = 'translateY(-50%)';
                    break;
                case 2: // Bottom
                    style.bottom = '-25%';
                    style.left = `${50 + offset}%`;
                    style.transform = 'translateX(-50%)';
                    break;
                case 3: // Left
                    style.top = `${50 + offset}%`;
                    style.left = '-25%';
                    style.transform = 'translateY(-50%)';
                    break;
            }

            decorations.push({
                src: rockSrc,
                x: island.x,
                y: island.y,
                size: 24,
                style,
            });
        }
    });

    return decorations;
};


export function GameBoard({ gameId, onExit }: GameBoardProps) {
  const { playerId } = usePlayer();
  const { gameState, setGameState, isMyTurn, localPlayer, isHost, isLoading } = useGameEngine(gameId, playerId);
  const { toast, dismiss } = useToast();
  const isMobile = useIsMobile();
  
  const [isPlayerInfoOpen, setIsPlayerInfoOpen] = useState(!isMobile);
  const [isExiting, setIsExiting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TURN_DURATION);
  const [activeInstructionToastId, setActiveInstructionToastId] = useState<string | null>(null);
  
  const [zoom, setZoom] = useState(1);
  const [minZoom, setMinZoom] = useState(0.2);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const decorations = useMemo(() => {
    if (!gameState?.map) return [];
    return generateDecorations(gameState.map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);


  useEffect(() => {
    setIsPlayerInfoOpen(!isMobile);
  }, [isMobile]);
  
  useEffect(() => {
    if (mapContainerRef.current && gameState && !isLoading) {
      const { clientWidth, clientHeight } = mapContainerRef.current;
      const mapSize = gameState.settings.mapSize;
      const PADDING = 100;

      const totalMapWidth = (mapSize * TILE_SIZE) + ((mapSize - 1) * TILE_GAP) + PADDING * 2;
      const totalMapHeight = (mapSize * TILE_SIZE) + ((mapSize - 1) * TILE_GAP) + PADDING * 2;

      const widthRatio = clientWidth / totalMapWidth;
      const heightRatio = clientHeight / totalMapHeight;
      const initialZoom = Math.min(widthRatio, heightRatio);
      setMinZoom(initialZoom);

      const initialPanX = (clientWidth - (totalMapWidth * initialZoom)) / 2;
      const initialPanY = (clientHeight - (totalMapHeight * initialZoom)) / 2;

      setZoom(initialZoom);
      setPan({ x: initialPanX, y: initialPanY });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, gameId]);


  useEffect(() => {
    if (gameState?.status === 'playing' && isMyTurn) {
      setTimeLeft(TURN_DURATION); // Reset timer at the start of your turn

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        setTimeLeft(prevTime => {
            if (prevTime <= 1) {
                clearInterval(timerRef.current!);
                handleAction('end-turn');
                return 0;
            }
            return prevTime - 1;
        });
      }, 1000);

    } else {
        // Not my turn or game not playing, clear interval
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        setTimeLeft(TURN_DURATION);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn, gameState?.status, gameState?.turn, gameState?.currentPlayerIndex]);

  useEffect(() => {
    if (timeLeft === 0 && isMyTurn) {
        toast({ title: "Time's up!", description: "Your turn has ended automatically."});
    }
  // handleAction is not stable, so we disable the lint rule here.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isMyTurn]);

  // Effect to show teleport instructions via toast
  useEffect(() => {
    // Clean up previous toast if it exists
    if (activeInstructionToastId) {
        dismiss(activeInstructionToastId);
        setActiveInstructionToastId(null);
    }
    
    if (gameState?.teleportState && isMyTurn) {
      if (gameState.teleportState.armyId === null) {
        // This check prevents showing the toast again if it was just shown.
        if (gameState.currentAction !== 'teleport-initiated') {
            const { id } = toast({ title: 'Teleport: Step 1', description: 'Select an army on the map to teleport.' });
            setActiveInstructionToastId(id);
            setGameState({...gameState, currentAction: 'teleport-initiated'});
        }
      } else {
        const { id } = toast({ title: 'Teleport: Step 2', description: 'Now, select any destination tile on the map.' });
        setActiveInstructionToastId(id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState?.teleportState, isMyTurn]);

   useEffect(() => {
    if (gameState?.status === 'playing') {
        const winner = gameState.players.find(p => p.victoryPoints >= gameState.settings.victoryPointGoal);
        if (winner && !gameState.winner) {
            setGameState({ ...gameState, winner, status: 'finished' });
        }
    }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [gameState?.players, gameState?.status, gameState?.settings.victoryPointGoal]);
  
  const handleAction = async (action: GameAction) => {
    if (!gameState || !localPlayer) return;
    
    if (action === 'cancel-action') {
        const { newState, toastMessage } = GameActions.handleCancelAction(gameState);
        if (toastMessage) {
            toast({ title: "Action Cancelled", description: toastMessage });
        }
        setGameState(newState);
        return;
    }

    if (action === 'show-cards') {
        setGameState({ ...gameState, showCardsDialogForPlayer: localPlayer.id });
        return;
    }
    
    if (action === 'open-abilities-shop') {
        try {
            setGameState(GameActions.handleOpenAbilitiesShop(gameState));
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
        return;
    }

    if (!isMyTurn) {
      toast({ title: "Not your turn", description: "Please wait for your turn to perform an action.", variant: 'destructive' });
      return;
    }
    
    try {
        let newState = { ...gameState };
        
        const selectedArmy = GameActions.getSelectedArmy(newState);
        if (!selectedArmy && !['deploy', 'buy-card', 'upgrade', 'end-turn', 'use-card', 'show-cards', 'open-abilities-shop'].includes(action)) {
            toast({ title: 'No Army Selected', description: 'You must select an army before performing this action.', variant: 'destructive'});
            return;
        }

        switch(action) {
            case 'position':
                newState = GameActions.handlePositionAction(newState);
                break;
            case 'collect':
                newState = GameActions.handleCollectAction(newState);
                break;
            case 'deploy':
                newState = GameActions.handleDeployAction(newState);
                break;
            case 'buy-card':
                newState = GameActions.handleBuyCardAction(newState);
                break;
            case 'upgrade':
                newState = GameActions.handleUpgradeAction(newState);
                break;
            case 'attack':
                newState = GameActions.handleAttackAction(newState);
                break;
            case 'end-turn':
                newState = GameActions.handleEndTurn(newState);
                break;
            case 'use-card':
                // This case is handled inside the CardsDialog for now
                break;
            case 'teleport':
                 // This action is handled by the CardsDialog to initiate teleport mode
                 break;
            default:
                newState = { ...newState, currentAction: action };
        }
        setGameState(newState);
    } catch (error: any) {
        toast({ title: 'Action Error', description: error.message, variant: 'destructive' });
    }
  };
  
  const handleTileClick = (x: number, y: number) => {
    if (!gameState || !isMyTurn || gameState.status !== 'playing') return;
    try {
        const newState = GameActions.handleTileClick(gameState, x, y, localPlayer?.id ?? -1);
        if (activeInstructionToastId) {
            dismiss(activeInstructionToastId);
            setActiveInstructionToastId(null);
        }
        setGameState(newState);
    } catch (error: any) {
        toast({ title: 'Action Error', description: error.message, variant: 'destructive' });
    }
  };
  
  const handleStartGame = async () => {
    if (!gameState || !isHost) return;
    const newState = startGame(gameState, localPlayer?.name || 'The host');
    toast({ title: "Game Started!", description: "Let the conquest begin!" });
    setGameState(newState);
  };

  const handleExitGame = async () => {
    if (!gameState || !localPlayer) return;

    if (isHost && gameState.status === 'waiting') {
        setGameState({ ...gameState, showHostLeaveDialog: true });
        return;
    }

    if (gameState.status === 'playing') {
        toast({ title: "Cannot Leave", description: "You cannot leave a game that is in progress.", variant: "destructive" });
        return;
    }
    
    setIsExiting(true);
    await GameActions.handlePlayerExit({
      gameId,
      gameState,
      setGameState,
      localPlayer,
      isHost,
      onExit,
    });
    setIsExiting(false);
  };

  const handleConfirmHostLeaveGame = async () => {
      if (!gameState) return;
      setIsExiting(true);
      await GameActions.handleConfirmHostLeave(gameState, gameId, onExit);
      setIsExiting(false);
  }

  // --- Pan and Zoom Handlers ---
  const handleWheel = (e: React.WheelEvent) => {
    if (!mapContainerRef.current) return;
    e.preventDefault();

    const rect = mapContainerRef.current.getBoundingClientRect();
    const zoomFactor = 1.1;
    const newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
    const clampedZoom = Math.max(minZoom, Math.min(2, newZoom)); 

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Position of the mouse on the "un-zoomed" map
    const worldX = (mouseX - pan.x) / zoom;
    const worldY = (mouseY - pan.y) / zoom;

    // New pan position to keep the content under the mouse stationary
    const newPanX = mouseX - worldX * clampedZoom;
    const newPanY = mouseY - worldY * clampedZoom;

    setZoom(clampedZoom);
    setPan({ x: newPanX, y: newPanY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan with middle mouse button or if no action is in progress
    if (e.button !== 1 && (isMyTurn && gameState?.currentAction !== null)) return;
    e.preventDefault();
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || !mapContainerRef.current || !gameState) return;
    e.preventDefault();
    const newPanX = e.clientX - startPan.x;
    const newPanY = e.clientY - startPan.y;

    const { clientWidth, clientHeight } = mapContainerRef.current;
    const mapSize = gameState.settings.mapSize;
    const PADDING = 100;
    const totalMapWidth = (mapSize * TILE_SIZE) + ((mapSize - 1) * TILE_GAP) + PADDING * 2;
    const totalMapHeight = (mapSize * TILE_SIZE) + ((mapSize - 1) * TILE_GAP) + PADDING * 2;
    
    const mapWidthWithZoom = totalMapWidth * zoom;
    const mapHeightWithZoom = totalMapHeight * zoom;

    const rightBoundary = 0;
    const leftBoundary = clientWidth - mapWidthWithZoom;
    const bottomBoundary = 0;
    const topBoundary = clientHeight - mapHeightWithZoom;

    const clampedX = Math.min(
      rightBoundary, 
      Math.max(leftBoundary, newPanX)
    );
    const clampedY = Math.min(
      bottomBoundary, 
      Math.max(topBoundary, newPanY)
    );

    setPan({ x: clampedX, y: clampedY });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsPanning(false);
  };
  
  const handleMouseLeave = (e: React.MouseEvent) => {
    setIsPanning(false);
  };

  if (isLoading || !gameState || !localPlayer) {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-4 text-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="ml-4 text-lg">{!localPlayer && !isLoading ? 'You are not in this game. Returning to lobby...' : 'Joining game session...'}</p>
      </div>
    );
  }

  const { players, currentPlayerIndex, log, possibleMoves, selectedTile, selectedArmyId, status, maxPlayers, teleportState, scoutingState, armySelectionDialogState, winner, settings } = gameState;
  const currentPlayer = players[currentPlayerIndex];

  const canStartGame = status === 'waiting' && isHost && players.length > 1;

  const isTeleporting = !!teleportState;
  const isScouting = !!scoutingState && scoutingState.count > 0;


  return (
    <div className="relative flex h-screen w-full flex-col gap-2 overflow-auto p-2 sm:gap-4 sm:p-4">
      {status !== 'finished' && (
        <>
            {status === 'waiting' ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <Button variant="outline" size="icon" onClick={handleExitGame} disabled={isExiting}>
                        {isExiting ? <Loader2 className="animate-spin" /> : <ArrowLeft />}
                        </Button>
                        <h1 className="text-xl font-bold sm:text-2xl">Corner Conquest</h1>
                    </div>
                    {canStartGame && (
                        <Button onClick={handleStartGame}><Play /> Start Game</Button>
                    )}
                </div>
            ) : (
                 <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <Button variant="outline" size="icon" onClick={onExit} disabled={isExiting}>
                            {isExiting ? <Loader2 className="animate-spin" /> : <ArrowLeft />}
                        </Button>
                        <h1 className="text-xl font-bold sm:text-2xl">{gameState.name}</h1>
                    </div>
                    <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-1.5 text-sm font-semibold">
                       <Trophy className="h-4 w-4 text-yellow-400" />
                       <span>VP Goal: {settings.victoryPointGoal}</span>
                    </div>
                </div>
            )}


            <Collapsible open={isPlayerInfoOpen} onOpenChange={setIsPlayerInfoOpen} className="w-full">
                <div className="flex items-center justify-between rounded-md bg-muted/50 p-2">
                    <h2 className="text-base font-semibold sm:text-lg">Player Information</h2>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                            {isPlayerInfoOpen ? <ChevronUp /> : <ChevronDown />}
                        </Button>
                    </CollapsibleTrigger>
                </div>
                <CollapsibleContent>
                    <div
                    className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4"
                    >
                    {players.map(p => (
                        <PlayerInfo key={p.id} player={p} isCurrentPlayer={currentPlayerIndex === p.id} />
                    ))}
                    {status === 'waiting' && Array.from({ length: maxPlayers - players.length}).map((_, i) => (
                        <div key={`empty-${i}`} className="flex h-full min-h-24 items-center justify-center rounded-lg border-2 border-dashed bg-card p-4 text-sm text-muted-foreground sm:min-h-28 sm:text-base">Waiting for player...</div>
                    ))}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        
            <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
                <main 
                  ref={mapContainerRef}
                  className="relative overflow-hidden rounded-xl"
                  onWheel={handleWheel}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                >
                <MapGrid 
                    map={gameState.map} 
                    players={players} 
                    onTileClick={handleTileClick} 
                    possibleMoves={isTeleporting && teleportState.armyId !== null ? gameState.map.flat().map(t => ({x: t.x, y: t.y})) : possibleMoves} 
                    selectedTile={selectedTile} 
                    currentPlayerId={currentPlayer.id} 
                    selectedArmyId={selectedArmyId}
                    isTeleporting={isTeleporting}
                    isScouting={isScouting}
                    zoom={zoom}
                    pan={pan}
                    decorations={decorations}
                />
                <div className='pointer-events-none absolute bottom-4 right-4 z-20 rounded-lg bg-background/80 p-2 text-center shadow-md backdrop-blur-sm'>
                    {status === 'waiting' ? (
                    <p className='text-base font-semibold text-accent sm:text-lg'>Waiting for players... ({players.length}/{maxPlayers})</p>
                    ) : armySelectionDialogState?.isOpen ? (
                    <p className='text-base font-semibold text-accent sm:text-lg animate-pulse'>Select an army to command</p>
                    ) : (
                    <>
                        {isTeleporting && isMyTurn ? (
                            <div className="flex flex-col items-center gap-2">
                                <p className='text-base font-semibold text-accent sm:text-lg animate-pulse'>
                                    {teleportState.armyId === null ? 'Teleport: Select an army to move' : 'Teleport: Select a destination tile'}
                                </p>
                            </div>
                        ) : isScouting && isMyTurn ? (
                            <p className='text-base font-semibold text-accent sm:text-lg animate-pulse'>
                                Scout: Reveal a hidden tile ({scoutingState.count} remaining)
                            </p>
                        ) : (
                            <>
                                <p className='text-base font-semibold sm:text-lg'>Turn {gameState.turn}: <span style={{color: currentPlayer.color}}>{currentPlayer.name}'s turn</span></p>
                                {gameState.currentAction && <p className='text-sm text-muted-foreground sm:text-base'>Current Action: {gameState.currentAction}</p>}
                            </>
                        )}
                    </>
                    )}
                </div>
                </main>
                <aside className="flex flex-col justify-start gap-4">
                <ActionsPanel 
                    onAction={handleAction} 
                    gameState={gameState} 
                    isMyTurn={isMyTurn && status === 'playing'}
                    timeLeft={timeLeft}
                    turnDuration={TURN_DURATION}
                />
                <GameLog logs={log} />
                </aside>
            </div>
        </>
      )}

      {winner && (
        <AlertDialog open={true}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className='text-center text-2xl'>Game Over!</AlertDialogTitle>
                    <AlertDialogDescription className='text-center text-lg'>
                        <span style={{color: winner.color}} className="font-bold">{winner.name}</span> wins the game!
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className='py-4 text-center'>
                     <Trophy className="mx-auto h-24 w-24 text-yellow-400" />
                </div>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={onExit}>Return to Lobby</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}

      <GameDialogs 
        gameState={gameState} 
        setGameState={setGameState} 
        localPlayer={localPlayer}
        isMyTurn={isMyTurn}
        onConfirmHostLeave={handleConfirmHostLeaveGame}
      />
    </div>
  );
}
