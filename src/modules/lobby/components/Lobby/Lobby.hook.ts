import { useCallback, useEffect, useState } from 'react';
import { usePlayer, useLinkGoogleAccountButton } from '@/modules/session';
import { useToast } from '@/modules/shared';
import { handleSeatReclaim, initializeGame, startGame } from '@/modules/game-rules';
import type { GameSettings, GameState, PlayerColor } from '@/lib/types';
import {
  createGameId,
  joinOpenGame,
  saveGame,
  subscribeToOpenGames,
  subscribeToVacantSeat,
} from '../../services/lobby.service';
import type { LobbyProps, LobbyViewModel } from './Lobby.types';

/** Subscribes to open matches and adapts the create/join flows into the view model. */
export function useLobby({ onJoinGame }: LobbyProps): LobbyViewModel {
  const [games, setGames] = useState<GameState[]>([]);
  const [isGamesLoading, setIsGamesLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isJoiningGame, setIsJoiningGame] = useState<string | null>(null);
  const [vacantMatch, setVacantMatch] = useState<GameState | null>(null);
  const [isReclaiming, setIsReclaiming] = useState(false);
  const { playerId, username, isGuest, logout } = usePlayer();
  const linkGoogleAccountButton = useLinkGoogleAccountButton();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = subscribeToOpenGames(
      (openGames) => {
        setGames(openGames);
        setIsGamesLoading(false);
      },
      (error) => {
        console.error('Lobby snapshot error:', error);
        setIsGamesLoading(false);
        toast({ title: 'Lobby Error', description: 'Could not fetch open games.', variant: 'destructive' });
      },
    );

    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    if (!playerId) return;

    const unsubscribe = subscribeToVacantSeat(
      playerId,
      (match) => setVacantMatch(match),
      (error) => {
        console.error('Vacant seat snapshot error:', error);
        toast({ title: 'Lobby Error', description: 'Could not check for a match to rejoin.', variant: 'destructive' });
      },
    );

    return () => unsubscribe();
  }, [playerId, toast]);

  useEffect(() => {
    if (vacantMatch) {
      setIsCreateDialogOpen(false);
    }
  }, [vacantMatch]);

  const handleCreateGame = useCallback(
    async (
      gameName: string,
      maxPlayers: number,
      playerColor: PlayerColor,
      numBots: number,
      debugMode: boolean,
      settings: GameSettings,
    ): Promise<boolean> => {
      if (!playerId || !username) return false;

      const newGameId = createGameId();
      const creator = { playerId, name: username, color: playerColor };
      const newGame = initializeGame(newGameId, gameName, maxPlayers, creator, numBots, debugMode, settings);

      try {
        await saveGame(newGame);

        if (maxPlayers === 1) {
          const startedGame = startGame(newGame, newGame.players[0].name);
          await saveGame(startedGame);
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
    [playerId, username, onJoinGame, toast],
  );

  const handleJoinGame = useCallback(
    async (gameId: string) => {
      if (!playerId || !username) return;
      setIsJoiningGame(gameId);

      try {
        await joinOpenGame(gameId, { playerId, name: username });
        onJoinGame(gameId);
      } catch (error) {
        console.error('Error joining game: ', error);
        toast({
          title: 'Could Not Join',
          description: error instanceof Error ? error.message : 'An unknown error occurred.',
          variant: 'destructive',
        });
      } finally {
        setIsJoiningGame(null);
      }
    },
    [playerId, username, onJoinGame, toast],
  );

  const handleReclaimSeat = useCallback(async () => {
    if (!playerId || !vacantMatch) return;
    setIsReclaiming(true);

    try {
      const didReclaim = await handleSeatReclaim(vacantMatch.id, playerId);
      if (didReclaim) {
        onJoinGame(vacantMatch.id);
      } else {
        toast({
          title: 'Could Not Rejoin',
          description: 'That seat is no longer yours to reclaim.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error reclaiming seat: ', error);
      toast({
        title: 'Could Not Rejoin',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsReclaiming(false);
    }
  }, [playerId, vacantMatch, onJoinGame, toast]);

  return {
    username,
    isGuest,
    linkGoogleAccountButton,
    games,
    isGamesLoading,
    isCreateDialogOpen,
    onOpenCreateDialog: () => setIsCreateDialogOpen(true),
    onCreateDialogChange: setIsCreateDialogOpen,
    isJoiningGame,
    onJoinGame: handleJoinGame,
    onCreateGame: handleCreateGame,
    onLogout: logout,
    vacantMatch,
    isReclaiming,
    onReclaimSeat: handleReclaimSeat,
  };
}
