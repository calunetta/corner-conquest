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
import { Loader2, Power, Swords, Compass, Shield, BookOpen, Sparkles, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { LobbyGameRow } from './LobbyGameRow';
import { LobbyBackground } from './LobbyBackground';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

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
    <div className="relative min-h-screen w-full flex items-center justify-center p-3 sm:p-6 lg:p-8 overflow-x-hidden">
      <LobbyBackground />

      <Card className="w-full max-w-6xl bg-background/55 backdrop-blur-2xl border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative z-10 overflow-hidden">
        {/* Top Header Row with Player Banner & Title */}
        <CardHeader className="p-4 sm:p-6 pb-4 border-b border-white/10">
          <div className="flex flex-col sm:flex-row w-full items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-primary/20 border border-amber-500/30 flex items-center justify-center text-primary shadow-inner">
                <Compass className="h-6 w-6 text-amber-400 animate-spin [animation-duration:25s]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-2xl sm:text-3xl font-black tracking-wide bg-gradient-to-r from-amber-300 via-yellow-400 to-primary bg-clip-text text-transparent">
                    Game Lobby
                  </CardTitle>
                  <Badge variant="outline" className="bg-black/40 border-amber-400/30 text-amber-300 text-xs hidden sm:inline-flex items-center gap-1 font-bold">
                    <Sparkles className="h-3 w-3" /> Corner Conquest
                  </Badge>
                </div>
                <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Conquer the archipelago, battle wild monsters, and out-maneuver rival commanders.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-center">
              <div className="text-right">
                <span className="text-xs text-muted-foreground block">Commander</span>
                <span className="text-sm font-bold text-foreground">Welcome, {username}!</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-white/5"
              >
                <Power className="h-4 w-4 mr-1.5" /> Logout
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* 2-Column Command Center Content */}
        <CardContent className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Commander Profile, Create Action, & Tactical Field Guide (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Create Game Hero CTA */}
            <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 via-primary/5 to-black/40 border border-amber-500/20 p-4 sm:p-5 flex flex-col gap-3 shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  New Campaign
                </span>
                <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs">
                  Host Match
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Create a customized match with bots, fog of war, custom victory point goals, and special ability cards.
              </p>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                disabled={isJoiningGame !== null}
                className="w-full font-bold bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black shadow-[0_0_24px_rgba(245,158,11,0.4)] transition-all duration-300 hover:scale-[1.02] py-5 text-sm"
              >
                {isJoiningGame ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Swords className="mr-2 h-4 w-4" />
                )}
                Create New Game
              </Button>
            </div>

            {/* Tactical Field Guide / Quick Rules Card */}
            <div className="rounded-2xl bg-black/30 border border-white/10 p-4 sm:p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                <BookOpen className="h-4 w-4 text-cyan-400" />
                <span>Tactical Field Guide</span>
              </div>
              <div className="space-y-2.5 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Trophy className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-foreground">Victory Point Goal:</strong> Earn VP by discovering islands, upgrading armies, and winning battles.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-foreground">Positioning:</strong> Position armies on resource islands to gather wheat, iron, and gems every turn.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-foreground">Special Cards:</strong> Teleport across the sea, scout unknown fog, or sabotage opponent armies.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Match Browser (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Active Conquest Rooms
                </h3>
                <Badge className="bg-primary/20 text-primary border border-primary/30 text-xs font-semibold">
                  {games.length} {games.length === 1 ? 'Open Room' : 'Open Rooms'}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Click any match to join
              </span>
            </div>

            {/* Scrollable Open Games List */}
            <div className="max-h-[52vh] overflow-y-auto pr-1 space-y-3 custom-scrollbar">
              {isGamesLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground bg-black/20 rounded-2xl border border-white/5">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm">Scanning tactical channels for open games...</span>
                </div>
              ) : games.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground bg-black/20 rounded-2xl border border-white/5 p-6 flex flex-col items-center justify-center gap-2">
                  <Compass className="h-10 w-10 text-muted-foreground/40 mb-1" />
                  <p className="font-bold text-foreground text-sm">No open matches currently waiting.</p>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Be the first commander to launch a match and challenge players or bots!
                  </p>
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
