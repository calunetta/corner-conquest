
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
import { PLAYER_COLORS } from '@/lib/player-data';

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
        const mapDocRef = doc(db, 'games', gameId, 'static', 'map');

        await runTransaction(db, async (transaction) => {
            const gameDoc = await transaction.get(gameDocRef);
            const mapDoc = await transaction.get(mapDocRef);
            
            if (!gameDoc.exists() || !mapDoc.exists()) {
                throw new Error("Game or its map data not found.");
            }

            const firestoreState = gameDoc.data() as FirestoreGameState;
            const mapData = mapDoc.data() as { map: Island[][] }; // This is now an array of arrays
            
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
            
            const { newGameState, updatedMap, newBaseTile } = addPlayerToGame(firestoreState, mapData.map.flat(), { playerId, name: username });

            if (!newGameState || !updatedMap || !newBaseTile) {
                 throw new Error("Could not add player to game. The room might be full or color unavailable.");
            }
            
            transaction.update(gameDocRef, {
                players: newGameState.players,
                log: newGameState.log,
                baseTiles: arrayUnion(newBaseTile),
                status: newGameState.status,
                turn: newGameState.turn,
            });
            transaction.update(mapDocRef, {
                map: updatedMap,
            });
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
        <CardHeader className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <CardTitle className='text-2xl'>Game Lobby</CardTitle>
              <div className="text-sm text-muted-foreground">
                Welcome, <span className="font-bold text-foreground">{username}</span>!
                <Button variant="link" size="sm" onClick={logout} className="ml-1 p-0 h-auto">Logout</Button>
              </div>
            </div>
            <CardDescription>Join an available game or create a new one to start playing.</CardDescription>
          </div>
          <Button onClick={() => setIsCreatingGame(true)}>Create New Game</Button>
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
              games.map((game) => (
                <div key={game.id} className="flex flex-col items-start gap-3 rounded-lg border bg-card p-3 transition-all hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                  <div className="flex-1">
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
              ))
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
