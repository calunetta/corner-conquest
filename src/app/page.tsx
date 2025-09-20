
'use client';
import { useState } from 'react';
import { GameBoard } from '@/features/game/components/GameBoard';
import { Lobby } from '@/features/lobby/components/Lobby';
import { Login } from '@/features/lobby/components/Login';
import { usePlayer } from '@/hooks/use-player';

export default function Home() {
  const { playerId, username } = usePlayer();
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  if (!username || !playerId) {
    return <Login />;
  }

  const handleExitGame = () => {
    setActiveGameId(null);
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      {activeGameId ? (
        <GameBoard gameId={activeGameId} onExit={handleExitGame} />
      ) : (
        <Lobby onJoinGame={setActiveGameId} />
      )}
    </div>
  );
}
