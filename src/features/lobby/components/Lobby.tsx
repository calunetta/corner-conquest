

'use client';
import { useState, useEffect, useCallback } from 'react';
import { db, runTransaction, collection, doc, writeBatch, getDoc, arrayUnion, query, where, onSnapshot, updateDoc, setDoc, deleteDoc } from '@/lib/firebase';
import { usePlayer } from '@/hooks/use-player';
import { initializeGame, startGame, defaultGameSettings } from '@/lib/game-initializer';
import { addPlayerToGame } from '@/lib/game-logic';
import type { GameState, GameSettings, Player, Island, PlayerColor } from '@/lib/types';
import { GameStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreateGameDialog } from './CreateGameDialog';
import { Loader2, Users, Crown, Power, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PLAYER_COLORS, PLAYER_DATA } from '@/lib/player-data';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';


type LobbyProps = {
  onJoinGame: (gameId: string) => void;
};

const SettingsDisplay = ({ settings }: { settings: GameSettings }) => (
    <div className='space-y-3'>
        <div className='flex justify-between items-center text-sm'>
            <span className='text-muted-foreground'>Victory Point Goal</span>
            <span className='font-bold'>{settings.victoryPointGoal}</span>
        </div>
        <div className='flex justify-between items-center text-sm'>
            <span className='text-muted-foreground'>Fog of War</span>
            <span className='font-bold'>{settings.fogOfWar ? 'Enabled' : 'Disabled'}</span>
        </div>
        <div className='flex justify-between items-center text-sm'>
            <span className='text-muted-foreground'>Resource Density</span>
            <span className='font-bold'>{Math.round(settings.resourceDensity * 100)}%</span>
        </div>
        <div className='flex justify-between items-center text-sm'>
            <span className='text-muted-foreground'>VP per Discovery</span>
            <span className='font-bold'>{settings.vpPerIslandDiscovery}</span>
        </div>
        <Separator />
        <div className='flex justify-between items-center text-sm'>
            <span className='text-muted-foreground'>Initial Deploy Cost</span>
            <span className='font-bold'>{settings.initialDeployCost}</span>
        </div>
         <div className='flex justify-between items-center text-sm'>
            <span className='text-muted-foreground'>Upgrade Cost</span>
            <span className='font-bold'>{settings.upgradeCost}</span>
        </div>
         <div className='flex justify-between items-center text-sm'>
            <span className='text-muted-foreground'>Ability Cost</span>
            <span className='font-bold'>{settings.abilityCost}</span>
        </div>
        <Separator />
         <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">Available Cards</h4>
            <div className="flex flex-wrap gap-1">
                {settings.availableCards.map(card => <Badge key={card} variant="secondary">{card}</Badge>)}
            </div>
        </div>
        <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">Available Abilities</h4>
            <div className="flex flex-wrap gap-1">
                {settings.availableAbilities.map(ability => <Badge key={ability} variant="secondary" className='capitalize'>{ability}</Badge>)}
            </div>
        </div>
    </div>
)

export function Lobby({ onJoinGame }: LobbyProps) {
  const [games, setGames] = useState<GameState[]>([]);
  const [isGamesLoading, setIsGamesLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJoiningGame, setIsJoiningGame] = useState<string | null>(null);
  const { playerId, username, logout } = usePlayer();
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, 'games'), where('status', '==', GameStatus.Waiting));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const gamesList: GameState[] = [];
      querySnapshot.forEach((doc) => {
        const firestoreState = doc.data() as GameState;
        gamesList.push({
            ...firestoreState,
            id: doc.id,
            settings: firestoreState.settings || defaultGameSettings,
        });
      });
      setGames(gamesList);
      setIsGamesLoading(false);
    }, (error) => {
      console.error("Lobby snapshot error:", error);
      setIsGamesLoading(false);
      toast({title: "Lobby Error", description: "Could not fetch open games.", variant: "destructive"})
    });

    return () => unsubscribe();
  }, [toast]);

  const handleCreateGame = useCallback(async (
    gameName: string,
    maxPlayers: number,
    playerColor: PlayerColor,
    numBots: number,
    debugMode: boolean,
    settings: GameSettings,
  ): Promise<boolean> => {
    if (!playerId || !username) return false;

    const gameDocRef = doc(collection(db, 'games'));
    const newGameId = gameDocRef.id;

    const creator = { playerId, name: username, color: playerColor };
    let newGame = initializeGame(newGameId, gameName, maxPlayers, creator, numBots, debugMode, settings);
    
    try {
        await setDoc(gameDocRef, newGame);

        // If it's a bot game, start it immediately.
        if (maxPlayers === 1) {
            const startedGame = startGame(newGame, newGame.players[0].name);
            await setDoc(gameDocRef, startedGame);
        }

        onJoinGame(newGameId);
        return true;
    } catch (error) {
        console.error("Error creating game: ", error);
        toast({ title: 'Error', description: 'Could not create game. Please check your connection and try again.', variant: 'destructive'});
        return false;
    }
  }, [playerId, username, onJoinGame, toast]);
  
  const handleJoinGame = async (gameId: string) => {
      if (!playerId || !username) return;
      setIsJoiningGame(gameId);

      try {
        const gameDocRef = doc(db, 'games', gameId);
        
        await runTransaction(db, async (transaction) => {
            const gameDoc = await transaction.get(gameDocRef);
            
            if (!gameDoc.exists()) {
                throw new Error("Game not found.");
            }
            
            const gameState = gameDoc.data() as GameState;
            
            if (gameState.status !== GameStatus.Waiting) {
                 throw new Error("This game has already started or is no longer available.");
            }
            if (gameState.players.length >= gameState.maxPlayers) {
                throw new Error("This game is full.");
            }
            if (gameState.players.some(p => p.playerId === playerId)) {
                // Player is already in, just let them proceed
                return;
            }
            
            const { newGameState } = addPlayerToGame(gameState, { playerId, name: username });

            if (!newGameState) {
                 throw new Error("Could not add player to game. The room might be full or color unavailable.");
            }
            
            transaction.set(gameDocRef, newGameState);
        });
        
        onJoinGame(gameId);

      } catch (error: any) {
        console.error("Error joining game: ", error);
        toast({ title: 'Could Not Join', description: error.message || 'An unknown error occurred.', variant: 'destructive'});
      } finally {
        setIsJoiningGame(null);
      }
  };
  
    const handleLogout = async () => {
        if (username) {
            await deleteDoc(doc(db, 'usernames', username));
        }
        logout();
    };

  return (
    <div className="container mx-auto flex h-full flex-col items-center justify-center p-2 sm:p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <div className="flex w-full items-center justify-end gap-2 mb-4">
            <span className="text-sm">Welcome, {username}!</span>
            <Button variant="destructive" size="icon" onClick={handleLogout}>
              <Power className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Game Lobby</CardTitle>
              <CardDescription>
                Join a game or create one to begin your conquest.
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)} disabled={isJoiningGame !== null} className="w-full sm:w-auto">
              {isJoiningGame && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create New Game
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {isGamesLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : games.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p className="font-semibold">No open games found.</p>
                <p className="text-sm">Why not be the first to create one?</p>
              </div>
            ) : (
              <TooltipProvider>
                {games.map((game) => (
                  <div key={game.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border bg-card p-3 transition-all hover:bg-muted/50 sm:p-4">
                    <div className="flex flex-1 items-center gap-4 min-w-[200px]">
                      <div className="flex -space-x-2">
                        {game.players.map(p => (
                           <Tooltip key={p.playerId}>
                              <TooltipTrigger asChild>
                                  <Avatar className="h-8 w-8 border-2" style={{ borderColor: p.color }}>
                                    <AvatarFallback style={{ backgroundColor: p.color }} className="text-white font-bold">
                                        {p.name.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{p.name}</p>
                              </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                      <h3 className="font-bold truncate">{game.name}</h3>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <Crown className="h-4 w-4 text-yellow-500" />
                            <span>{game.players[0]?.name || '...'}</span>
                        </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="h-4 w-4" />
                            <span>{game.players.length} / {game.maxPlayers}</span>
                        </div>
                    </div>

                    <div className='flex items-center gap-2'>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon"><Info className='h-4 w-4' /></Button>
                            </PopoverTrigger>
                            <PopoverContent className='w-80'>
                                <ScrollArea className='h-96 pr-4'>
                                    <div className='space-y-2'>
                                        <h3 className='font-bold text-lg'>{game.name}</h3>
                                        <p className='text-sm text-muted-foreground'>Match Settings</p>
                                        <Separator />
                                        <SettingsDisplay settings={game.settings} />
                                    </div>
                                </ScrollArea>
                            </PopoverContent>
                        </Popover>
                        <Button 
                        onClick={() => handleJoinGame(game.id)} 
                        disabled={isJoiningGame !== null || game.players.length >= game.maxPlayers} 
                        className="min-w-[80px]"
                        variant={game.players.length >= game.maxPlayers ? 'secondary' : 'default'}
                        >
                        {isJoiningGame === game.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {game.players.length >= game.maxPlayers ? 'Full' : 'Join'}
                        </Button>
                    </div>
                  </div>
                ))}
              </TooltipProvider>
            )}
          </div>
        </CardContent>
      </Card>
      <CreateGameDialog 
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreateGame={handleCreateGame}
      />
    </div>
  );
}
