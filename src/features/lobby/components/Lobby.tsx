
'use client';
import { useState, useEffect, useCallback } from 'react';
import { db, runTransaction, collection, doc, writeBatch, getDoc, arrayUnion, query, where, onSnapshot, updateDoc } from '@/lib/firebase';
import { usePlayer } from '@/hooks/use-player';
import { initializeGame, startGame, defaultGameSettings } from '@/lib/game-initializer';
import { addPlayerToGame } from '@/lib/game-logic';
import type { GameState, FirestoreGameState, GameSettings, Player, Island, PlayerColor } from '@/lib/types';
import { GameStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreateGameDialog } from './CreateGameDialog';
import { Loader2, Users, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PLAYER_COLORS, PLAYER_DATA } from '@/lib/player-data';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


type LobbyProps = {
  onJoinGame: (gameId: string) => void;
};

export function Lobby({ onJoinGame }: LobbyProps) {
  const [games, setGames] = useState<GameState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const [isJoiningGame, setIsJoiningGame] = useState<string | null>(null);
  const { playerId, username, logout } = usePlayer();
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, 'games'), where('status', '==', GameStatus.Waiting));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const gamesList: GameState[] = [];
      querySnapshot.forEach((doc) => {
        const firestoreState = doc.data() as FirestoreGameState;
        gamesList.push({
            ...firestoreState,
            id: doc.id,
            map: [], // Don't need the full map data in the lobby
            settings: firestoreState.settings || defaultGameSettings,
        });
      });
      setGames(gamesList);
      setIsLoading(false);
    }, (error) => {
      console.error("Lobby snapshot error:", error);
      setIsLoading(false);
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
    let { dynamicState, staticState } = initializeGame(newGameId, gameName, maxPlayers, creator, numBots, debugMode, settings);
    
    const isBotGame = maxPlayers === 1;
    if (isBotGame) {
      dynamicState = startGame(dynamicState);
    }

    try {
        const batch = writeBatch(db);
        batch.set(gameDocRef, dynamicState);
        const staticDocRef = doc(db, 'games', newGameId, 'static', 'map');
        batch.set(staticDocRef, staticState);
        await batch.commit();

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
            
            const firestoreState = gameDoc.data() as FirestoreGameState;
            
            // We need the map data to add a player, so we fetch it here.
            // This is less efficient than having it in the lobby state, but safer for transactions.
            const mapDoc = await getDoc(doc(db, 'games', gameId, 'static', 'map'));
            if (!mapDoc.exists()) {
                throw new Error("Game map data not found.");
            }
            const mapData = mapDoc.data() as { map: Island[][] };
            
            if (firestoreState.status !== GameStatus.Waiting) {
                 throw new Error("This game has already started or is no longer available.");
            }
            if (firestoreState.players.length >= firestoreState.maxPlayers) {
                throw new Error("This game is full.");
            }
            if (firestoreState.players.some(p => p.playerId === playerId)) {
                // Player is already in, just let them proceed
                return;
            }
            
            const { newGameState, updatedMap, newBaseTile } = addPlayerToGame(firestoreState, mapData.map, { playerId, name: username });

            if (!newGameState || !updatedMap || !newBaseTile) {
                 throw new Error("Could not add player to game. The room might be full or color unavailable.");
            }
            
            // The properties to update in the transaction
            const updateData: Partial<FirestoreGameState> = {
                players: newGameState.players,
                log: newGameState.log,
                baseTiles: arrayUnion(newBaseTile)
            };

            // Conditionally update status and turn if the game is starting
            if (newGameState.players.length === newGameState.maxPlayers) {
                updateData.status = GameStatus.Playing;
                updateData.turn = 1;
                updateData.log = arrayUnion(`The game is full! Starting now.`);
            }

            transaction.update(gameDocRef, updateData);
            
            // Only update the map if it has changed
            transaction.update(doc(db, 'games', gameId, 'static', 'map'), { map: updatedMap });
        });
        
        onJoinGame(gameId);

      } catch (error: any) {
        console.error("Error joining game: ", error);
        toast({ title: 'Could Not Join', description: error.message || 'An unknown error occurred.', variant: 'destructive'});
      } finally {
        setIsJoiningGame(null);
      }
  };

  return (
    <div className="container mx-auto flex h-full flex-col items-center justify-center p-2 sm:p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle className='text-2xl'>Game Lobby</CardTitle>
            <CardDescription>Join a game or create one to begin your conquest.</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-sm text-muted-foreground">
                Welcome, <span className="font-bold text-foreground">{username}</span>!
                <Button variant="link" size="sm" onClick={logout} className="ml-1 p-0 h-auto">Logout</Button>
            </div>
            <Button onClick={() => setIsCreatingGame(true)}>Create New Game</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {isLoading ? (
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
                  <div key={game.id} className="flex flex-col items-start gap-3 rounded-lg border bg-card p-3 transition-all hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                    <div className="flex flex-1 items-center gap-4">
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
                      <div>
                        <h3 className="font-bold">{game.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <Crown className="h-4 w-4 text-yellow-500" />
                                <span>{game.players[0]?.name || '...'}</span>
                            </div>
                             <div className="flex items-center gap-1.5">
                                <Users className="h-4 w-4" />
                                <span>{game.players.length} / {game.maxPlayers} players</span>
                            </div>
                        </div>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleJoinGame(game.id)} 
                      disabled={isJoiningGame !== null || game.players.length >= game.maxPlayers} 
                      className="w-full sm:w-auto"
                      variant={game.players.length >= game.maxPlayers ? 'secondary' : 'default'}
                    >
                      {isJoiningGame === game.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {game.players.length >= game.maxPlayers ? 'Full' : 'Join'}
                    </Button>
                  </div>
                ))}
              </TooltipProvider>
            )}
          </div>
        </CardContent>
      </Card>
      <CreateGameDialog 
        open={isJoiningGame === null && isCreatingGame}
        onOpenChange={setIsCreatingGame}
        onCreateGame={handleCreateGame}
      />
    </div>
  );
}
