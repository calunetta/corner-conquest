'use client';

import { useState, useEffect, useCallback } from 'react';
import { db, collection, doc, query, where, onSnapshot, setDoc, runTransaction } from '@/lib/firebase';
import { usePlayer } from '@/hooks/use-player';
import { initializeGame, startGame, defaultGameSettings } from '@/lib/game-initializer';
import { addPlayerToGame } from '@/lib/game-logic';
import type { GameState, GameSettings, PlayerColor } from '@/lib/types';
import { GameStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreateGameDialog } from './CreateGameDialog';
import { Loader2, Power } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LobbyGameRow } from './LobbyGameRow';

type LobbyProps = {
  onJoinGame: (gameId: string) => void;
};

export function Lobby({ onJoinGame }: LobbyProps) {
  const [games, setGames] = useState<GameState[]>([]);
  const [isGamesLoading, setIsGamesLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJoiningGame, setIsJoiningGame] = useState<string | null>(null);
  const { playerId, username, logout } = usePlayer();
  const { toast } = useToast();

  useEffect(() => {
    const q = query(collection(db, 'games'), where('status', '==', GameStatus.Waiting));
    const unsubscribe = onSnapshot(
      q,
      querySnapshot => {
        const gamesList: GameState[] = [];
        querySnapshot.forEach(docSnap => {
          const firestoreState = docSnap.data() as GameState;
          gamesList.push({
            ...firestoreState,
            id: docSnap.id,
            settings: firestoreState.settings || defaultGameSettings,
          });
        });
        setGames(gamesList);
        setIsGamesLoading(false);
      },
      error => {
        console.error('Lobby snapshot error:', error);
        setIsGamesLoading(false);
        toast({ title: 'Lobby Error', description: 'Could not fetch open games.', variant: 'destructive' });
      }
    );

    return () => unsubscribe();
  }, [toast]);

  const handleCreateGame = useCallback(
    async (
      gameName: string,
      maxPlayers: number,
      playerColor: PlayerColor,
      numBots: number,
      debugMode: boolean,
      settings: GameSettings
    ): Promise<boolean> => {
      if (!playerId || !username) return false;

      const gameDocRef = doc(collection(db, 'games'));
      const newGameId = gameDocRef.id;

      const creator = { playerId, name: username, color: playerColor };
      let newGame = initializeGame(newGameId, gameName, maxPlayers, creator, numBots, debugMode, settings);

      try {
        await setDoc(gameDocRef, newGame);

        if (maxPlayers === 1) {
          const startedGame = startGame(newGame, newGame.players[0].name);
          await setDoc(gameDocRef, startedGame);
        }

        onJoinGame(newGameId);
        return true;
      } catch (error) {
        console.error('Error creating game: ', error);
        toast({
          title: 'Error',
          description: 'Could not create game. Please check your connection and try again.',
          variant: 'destructive',
        });
        return false;
      }
    },
    [playerId, username, onJoinGame, toast]
  );

  const handleJoinGame = async (gameId: string) => {
    if (!playerId || !username) return;
    setIsJoiningGame(gameId);

    try {
      const gameDocRef = doc(db, 'games', gameId);

      await runTransaction(db, async transaction => {
        const gameDoc = await transaction.get(gameDocRef);

        if (!gameDoc.exists()) {
          throw new Error('Game not found.');
        }

        const gameState = gameDoc.data() as GameState;

        if (gameState.status !== GameStatus.Waiting) {
          throw new Error('This game has already started or is no longer available.');
        }
        if (gameState.players.length >= gameState.maxPlayers) {
          throw new Error('This game is full.');
        }
        if (gameState.players.some(p => p.playerId === playerId)) {
          return;
        }

        const { newGameState } = addPlayerToGame(gameState, { playerId, name: username });

        if (!newGameState) {
          throw new Error('Could not add player to game. The room might be full or color unavailable.');
        }

        transaction.set(gameDocRef, newGameState);
      });

      onJoinGame(gameId);
    } catch (error: any) {
      console.error('Error joining game: ', error);
      toast({
        title: 'Could Not Join',
        description: error.message || 'An unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsJoiningGame(null);
    }
  };

  return (
    <div className="container mx-auto flex h-full flex-col items-center justify-center p-2 sm:p-4">
      <Card className="w-full max-w-3xl bg-background/40 backdrop-blur-xl border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <CardHeader>
          <div className="flex w-full items-center justify-end gap-2 mb-4">
            <span className="text-sm">Welcome, {username}!</span>
            <Button variant="destructive" size="icon" onClick={logout}>
              <Power className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Game Lobby</CardTitle>
              <CardDescription>Join a game or create one to begin your conquest.</CardDescription>
            </div>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              disabled={isJoiningGame !== null}
              className="w-full sm:w-auto hover:scale-105 transition-all duration-300 shadow-[0_0_15px_rgba(var(--primary),0.5)]"
            >
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
                {games.map(game => (
                  <LobbyGameRow
                    key={game.id}
                    game={game}
                    isJoining={isJoiningGame === game.id}
                    isAnyJoining={isJoiningGame !== null}
                    onJoin={handleJoinGame}
                  />
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
