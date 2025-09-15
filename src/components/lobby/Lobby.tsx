'use client';
import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { usePlayer } from '@/hooks/use-player';
import { initializeGame, addPlayerToGame, flattenMap, unflattenMap } from '@/lib/game-logic';
import type { GameState, Player, PlayerColor, FirestoreGameState } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreateGameDialog } from './CreateGameDialog';
import { Loader2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type LobbyProps = {
  onJoinGame: (gameId: string) => void;
};

export function Lobby({ onJoinGame }: LobbyProps) {
  const [games, setGames] = useState<GameState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingGame, setIsCreatingGame] = useState(false);
  const { playerId, username, logout } = usePlayer();
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, 'games'), where('status', '==', 'waiting'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const gamesList: GameState[] = [];
      querySnapshot.forEach((doc) => {
        const firestoreState = doc.data() as FirestoreGameState;
        gamesList.push({
            ...firestoreState,
            id: doc.id,
            map: [], // Don't need the full map data in the lobby
        });
      });
      setGames(gamesList);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateGame = useCallback(async (
    gameName: string,
    maxPlayers: number,
    playerColor: PlayerColor
  ) => {
    if (!playerId || !username) return;

    const newGameId = doc(collection(db, 'games')).id;
    const creator = { playerId, name: username, color: playerColor };
    const newGame = initializeGame(newGameId, gameName, maxPlayers, creator);
    
    const firestoreState: FirestoreGameState = {
        ...newGame,
        map: flattenMap(newGame.map),
        mapSize: newGame.map.length,
    };

    try {
        await setDoc(doc(db, 'games', newGameId), firestoreState);
        onJoinGame(newGameId);
    } catch (error) {
        console.error("Error creating game: ", error);
        toast({ title: 'Error', description: 'Could not create game.', variant: 'destructive'});
    }
  }, [playerId, username, onJoinGame, toast]);
  
  const handleJoinGame = async (gameId: string) => {
      if (!playerId || !username) return;

      const gameDocRef = doc(db, 'games', gameId);
      try {
        const gameDoc = await getDoc(gameDocRef);
        if (!gameDoc.exists()) {
            toast({ title: "Error", description: "Game not found.", variant: 'destructive' });
            return;
        }

        const firestoreState = gameDoc.data() as FirestoreGameState;
        const gameState = {
            ...firestoreState,
            map: unflattenMap(firestoreState.map, firestoreState.mapSize),
        };

        const updatedGameState = addPlayerToGame(gameState, { playerId, name: username });

        if (!updatedGameState) {
             toast({ title: "Cannot Join", description: "Game is full.", variant: 'destructive' });
             return;
        }
        
        const updatedFirestoreState: FirestoreGameState = {
            ...updatedGameState,
            map: flattenMap(updatedGameState.map),
            mapSize: updatedGameState.map.length,
        };

        await setDoc(gameDocRef, updatedFirestoreState);
        onJoinGame(gameId);

      } catch (error) {
        console.error("Error joining game: ", error);
        toast({ title: 'Error', description: 'Could not join game.', variant: 'destructive'});
      }
  };

  return (
    <div className="container mx-auto flex h-full flex-col items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
                <CardTitle>Game Lobby</CardTitle>
                <CardDescription>Join a game or create a new one to start playing.</CardDescription>
            </div>
            <div className='flex items-center gap-4'>
                <p className='text-sm text-muted-foreground'>Welcome, <span className='font-bold text-foreground'>{username}</span></p>
                <Button variant="outline" size="sm" onClick={logout}>Logout</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex justify-end">
            <Button onClick={() => setIsCreatingGame(true)}>Create New Game</Button>
          </div>
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : games.length === 0 ? (
              <p className="text-center text-muted-foreground">No open games found. Why not create one?</p>
            ) : (
              games.map((game) => (
                <div key={game.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <h3 className="font-bold">{game.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{game.players.length} / {game.maxPlayers} players</span>
                    </div>
                  </div>
                  <Button onClick={() => handleJoinGame(game.id)} disabled={game.players.length >= game.maxPlayers}>Join</Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      <CreateGameDialog 
        open={isCreatingGame}
        onOpenChange={setIsCreatingGame}
        onCreateGame={handleCreateGame}
      />
    </div>
  );
}
