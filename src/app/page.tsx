'use client';
import { useState } from 'react';
import { GameBoard } from '@/components/game/GameBoard';
import { Lobby } from '@/components/lobby/Lobby';
import { Login } from '@/components/lobby/Login';
import { usePlayer } from '@/hooks/use-player';

export default function Home() {
  const { playerId, username } = usePlayer();
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  if (!username || !playerId) {
    return <Login />;
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-background text-foreground">
      {activeGameId ? (
        <GameBoard gameId={activeGameId} onExit={() => setActiveGameId(null)} />
      ) : (
        <Lobby onJoinGame={setActiveGameId} />
      )}
    </div>
  );
}
